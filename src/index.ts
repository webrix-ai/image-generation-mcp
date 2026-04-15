#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

server.registerTool(
  "generate-image",
  {
    title: "Generate Image",
    description:
      "Generate an image from a text prompt using Google Gemini. Default: MCP image content for chat preview. Set inline to false to get a single text part containing JSON { mimeType, data (base64), sizeBytes } for upload APIs (no temp files).",
    inputSchema: {
      prompt: z.string().describe("The text prompt describing the image to generate"),
      inline: z
        .boolean()
        .optional()
        .describe(
          "If true (default), return only image content. If false, return only one text part with JSON including base64 data (easier to pipe into Drive/upload tools)."
        ),
    },
  },
  async ({ prompt, inline = true }: { prompt: string; inline?: boolean }) => {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-image-preview",
      contents: prompt,
      config: {
        responseModalities: ["Text", "Image"],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData) {
        const mimeType = part.inlineData.mimeType ?? "image/png";
        const data = part.inlineData.data!;
        const sizeBytes = Buffer.from(data, "base64").length;

        if (!inline) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ mimeType, data, sizeBytes }),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "image" as const,
              data,
              mimeType,
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
