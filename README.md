# Image Generation MCP Server

A Model Context Protocol (MCP) server that provides AI-powered image generation capabilities using Google Gemini models.

## Overview

This MCP server enables AI assistants to generate images from text prompts. It leverages Google's Gemini models to create images and returns them as base64-encoded data, making it easy to integrate image generation capabilities into your AI workflows.

## Features

- **Image Generation**: Generate images from text prompts and receive base64-encoded output
- **Google Gemini Integration**: Uses Google's latest Gemini models for high-quality image generation
- **Cloud Hosting (Optional)**: Automatically upload generated images to **Cloudinary** or **Azure Blob Storage** and get back a hosted URL
- **MCP Protocol**: Fully compatible with the Model Context Protocol standard
- **TypeScript**: Built with TypeScript for type safety and better development experience
- **Simple API**: Easy-to-use interface for image generation requests

## Installation

### Prerequisites

- Node.js 18+
- npm or yarn
- Google Gemini API key
- (Optional) Cloudinary account **or** Azure Storage account for hosted image URLs

### MCP Client Configuration

To use this server with an MCP client, add the following configuration:

```json
{
  "mcpServers": {
    "image-generation": {
      "command": "npx",
      "args": ["-y", "@mcp-s/image-generation-mcp"],
      "env": {
        "GEMINI_API_KEY": "your-actual-gemini-api-key-here"
      }
    }
  }
}
```

**⚠️ IMPORTANT:** The `env` section with your Gemini API key is required - this is the only way the MCP server can function.

#### With Cloudinary (optional)

To have generated images automatically uploaded to Cloudinary and returned as hosted URLs, add your Cloudinary credentials:

```json
{
  "mcpServers": {
    "image-generation": {
      "command": "npx",
      "args": ["-y", "@mcp-s/image-generation-mcp"],
      "env": {
        "GEMINI_API_KEY": "your-actual-gemini-api-key-here",
        "CLOUDINARY_CLOUD_NAME": "your-cloud-name",
        "CLOUDINARY_API_KEY": "your-cloudinary-api-key",
        "CLOUDINARY_API_SECRET": "your-cloudinary-api-secret"
      }
    }
  }
}
```

When all three Cloudinary env vars are set, the tool uploads images and returns a URL by default. You can still use the `inline` parameter to get raw image data instead.

#### With Azure Blob Storage (optional)

To upload generated images to Azure Blob Storage instead, provide your connection string and container name:

```json
{
  "mcpServers": {
    "image-generation": {
      "command": "npx",
      "args": ["-y", "@mcp-s/image-generation-mcp"],
      "env": {
        "GEMINI_API_KEY": "your-actual-gemini-api-key-here",
        "AZURE_STORAGE_CONNECTION_STRING": "DefaultEndpointsProtocol=https;AccountName=...",
        "AZURE_STORAGE_CONTAINER_NAME": "generated-images"
      }
    }
  }
}
```

The container must already exist. Each image is uploaded with a unique UUID filename and the correct content type.

> **Note:** If both Cloudinary and Azure env vars are set, Cloudinary takes priority.

## Usage

### Available Tools

#### `generate-image`

Generates an image from a text prompt.

**Parameters:**

- `prompt` (string, required): The text prompt describing the image to generate
- `inline` (boolean, optional): Controls the response format (see below)

**Response behavior:**

| Storage configured? | `inline` value | Response |
|---|---|---|
| None | omitted / `true` | MCP image content (base64) |
| None | `false` | JSON with `{ mimeType, data, sizeBytes }` |
| Cloudinary or Azure | omitted | Hosted URL (text) |
| Cloudinary or Azure | `true` | MCP image content (base64) |
| Cloudinary or Azure | `false` | JSON with `{ mimeType, data, sizeBytes }` |

**Example:**

```json
{
  "tool": "generate-image",
  "arguments": {
    "prompt": "A nano banana dish in a fancy restaurant with a Gemini theme"
  }
}
```

**Response (no storage configured):**

```json
{
  "content": [
    {
      "type": "image",
      "data": "<base64-encoded-image-data>",
      "mimeType": "image/png"
    }
  ]
}
```

**Response (with Cloudinary or Azure Blob):**

```json
{
  "content": [
    {
      "type": "text",
      "text": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/abc123.png"
    }
  ]
}
```

### Integration with AI Assistants

This MCP server can be integrated with various AI assistants that support the MCP protocol, such as:

- Claude Desktop
- Cursor
- Other MCP-compatible AI systems

## Development

### Project Structure

```
image-generation-mcp/
├── src/
│   └── index.ts          # Main server implementation
├── dist/                 # Compiled JavaScript output
├── package.json          # Project dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── README.md             # This file
```

### Building

```bash
npm install
npm run build
```

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Google Gemini API key |
| `CLOUDINARY_CLOUD_NAME` | No | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | No | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | No | Cloudinary API secret |
| `AZURE_STORAGE_CONNECTION_STRING` | No | Azure Storage account connection string |
| `AZURE_STORAGE_CONTAINER_NAME` | No | Azure Blob container name |

All three Cloudinary variables must be set to enable Cloudinary uploads. Both Azure variables must be set to enable Azure Blob uploads. If both providers are configured, Cloudinary takes priority. If neither is configured, the server returns raw image data.

### Error Handling

The server includes error handling for:

- Missing or invalid Gemini API key
- Network connectivity issues
- Gemini API errors
- Invalid input parameters
- Cases where no image is generated
- Cloudinary upload failures (when configured)
- Azure Blob upload failures (when configured)

## Troubleshooting

### Common Issues

**Server fails to start or doesn't work:**

- ✅ **Check if Gemini API key is set**: This is the #1 cause of issues
  ```bash
  echo $GEMINI_API_KEY  # Should show your API key
  ```
- ✅ **Verify API key is valid**: Test with Google's API directly
- ✅ **Check API key has sufficient quota**: Ensure your Google Cloud account has available quota

**"Authentication failed" errors:**

- The Gemini API key is missing or invalid
- Set the environment variable: `export GEMINI_API_KEY="your-key"`

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License. See the `LICENSE` file for details.

## Support

For support, please open an issue in the GitHub repository or contact the maintainer.
