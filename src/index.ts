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
      "Generate an image from a text prompt using Google Gemini and return the base64-encoded image data",
    inputSchema: {
      prompt: z.string().describe("The text prompt describing the image to generate"),
    },
  },
  async ({ prompt }: { prompt: string }) => {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-image-preview",
      contents: prompt,
      config: {
        responseModalities: ["Text", "Image"],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData) {
        return {
          content: [
            {
              type: "image" as const,
              data: part.inlineData.data!,
              mimeType: part.inlineData.mimeType ?? "image/png",
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
