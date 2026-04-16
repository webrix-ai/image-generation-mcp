#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { GoogleGenAI } from "@google/genai";
import { v2 as cloudinary } from "cloudinary";
import { BlobServiceClient } from "@azure/storage-blob";
import { randomUUID } from "crypto";
import { z } from "zod";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// --- Storage provider setup ---

const cloudinaryEnabled = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

const azureBlobEnabled = !!(
  process.env.AZURE_STORAGE_CONNECTION_STRING &&
  process.env.AZURE_STORAGE_CONTAINER_NAME
);

if (cloudinaryEnabled) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

const uploadEnabled = cloudinaryEnabled || azureBlobEnabled;

async function uploadImage(
  base64Data: string,
  mimeType: string
): Promise<string> {
  if (cloudinaryEnabled) {
    const dataUri = `data:${mimeType};base64,${base64Data}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      resource_type: "image",
    });
    return result.secure_url;
  }

  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING!;
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME!;
  const ext = mimeType.split("/")[1] ?? "png";
  const blobName = `${randomUUID()}.${ext}`;

  const blobService = BlobServiceClient.fromConnectionString(connectionString);
  const container = blobService.getContainerClient(containerName);
  const blockBlob = container.getBlockBlobClient(blobName);

  const buffer = Buffer.from(base64Data, "base64");
  await blockBlob.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: mimeType },
  });

  return blockBlob.url;
}

const server = new McpServer(
  {
    name: "Image Generation",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const storageLabel = cloudinaryEnabled
  ? "Cloudinary"
  : azureBlobEnabled
    ? "Azure Blob Storage"
    : null;

const IMAGE_SIZES = ["512", "1K", "2K", "4K"] as const;
const ASPECT_RATIOS = [
  "1:1", "1:4", "1:8", "2:3", "3:2", "3:4",
  "4:1", "4:3", "4:5", "5:4", "8:1", "9:16", "16:9", "21:9",
] as const;
const OUTPUT_TYPES = ["both", "only-url", "only-image"] as const;
const MIME_TYPE = "image/png" as const;

type ToolInput = {
  prompt: string;
  imageSize?: (typeof IMAGE_SIZES)[number];
  aspectRatio?: (typeof ASPECT_RATIOS)[number];
  temperature?: number;
  outputType?: (typeof OUTPUT_TYPES)[number];
};

const toolDescription = [
  "Generate an image from a text prompt using Google Gemini.",
  uploadEnabled
    ? `Storage provider: ${storageLabel}.`
    : "No storage provider configured — only 'only-image' output is available.",
  "The response contains a URL and base64 image data.",
  "Always decode the base64 from disk and use present_files to show the image in chat.",
  "Never load the raw base64 into context.",
  "Use the URL for any subsequent image generation calls as file_data input.",
].join(" ");

server.registerTool(
  "generate-image",
  {
    title: "Generate Image",
    description: toolDescription,
    inputSchema: {
      prompt: z.string().describe("The text prompt describing the image to generate"),
      imageSize: z
        .enum(IMAGE_SIZES)
        .optional()
        .describe(
          "Resolution of the output image. '512' is only supported on gemini-3.1-flash-image-preview; '4K' requires gemini-3-pro-image-preview. Default: '1K'"
        ),
      aspectRatio: z
        .enum(ASPECT_RATIOS)
        .optional()
        .describe("Aspect ratio of the output image. Default: '1:1'"),
      temperature: z
        .number()
        .min(0)
        .max(2)
        .optional()
        .describe("Controls creative variation (0.0–2.0)"),
      outputType: z
        .enum(OUTPUT_TYPES)
        .optional()
        .describe(
          "'both' (default): return JSON with { url, mimeType, data }. " +
            "'only-url': return JSON with { url, mimeType } (requires storage provider). " +
            "'only-image': return JSON with { mimeType, data }."
        ),
    },
  },
  async ({ prompt, imageSize, aspectRatio, temperature, outputType }: ToolInput) => {
    const effectiveOutput = outputType ?? "both";

    if (effectiveOutput === "only-url" && !uploadEnabled) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: outputType 'only-url' requires a storage provider (Cloudinary or Azure Blob Storage) to be configured.",
          },
        ],
        isError: true,
      };
    }

    const imageConfig: Record<string, string> = {};
    if (imageSize) imageConfig.imageSize = imageSize;
    if (aspectRatio) imageConfig.aspectRatio = aspectRatio;

    const config: Record<string, unknown> = {
      responseModalities: ["IMAGE"],
    };
    if (Object.keys(imageConfig).length > 0) config.imageConfig = imageConfig;
    if (temperature !== undefined) config.temperature = temperature;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-image-preview",
      contents: prompt,
      config,
    });

    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData) {
        const data = part.inlineData.data!;

        if (effectiveOutput === "only-image" || !uploadEnabled) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ mimeType: MIME_TYPE, data }),
              },
            ],
          };
        }

        const url = await uploadImage(data, MIME_TYPE);

        if (effectiveOutput === "only-url") {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ url, mimeType: MIME_TYPE }),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ url, mimeType: MIME_TYPE, data }),
            },
          ],
        };
      }
    }

    const textParts = (response.candidates?.[0]?.content?.parts ?? [])
      .filter((p) => p.text)
      .map((p) => p.text)
      .join("\n");

    return {
      content: [
        {
          type: "text" as const,
          text: textParts || "No image was generated. Try a different prompt.",
        },
      ],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
