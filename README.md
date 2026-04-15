# Image Generation MCP Server

A Model Context Protocol (MCP) server that provides AI-powered image generation capabilities using Google Gemini models.

## Overview

This MCP server enables AI assistants to generate images from text prompts. It leverages Google's Gemini models to create images and returns them as base64-encoded data, making it easy to integrate image generation capabilities into your AI workflows.

## Features

- **Image Generation**: Generate images from text prompts and receive base64-encoded output
- **Google Gemini Integration**: Uses Google's latest Gemini models for high-quality image generation
- **MCP Protocol**: Fully compatible with the Model Context Protocol standard
- **TypeScript**: Built with TypeScript for type safety and better development experience
- **Simple API**: Easy-to-use interface for image generation requests

## Installation

### Prerequisites

- Node.js 18+
- npm or yarn
- Google Gemini API key

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

## Usage

### Available Tools

#### `generate-image`

Generates an image from a text prompt and returns the base64-encoded image data.

**Parameters:**

- `prompt` (string): The text prompt describing the image to generate

**Example:**

```json
{
  "tool": "generate-image",
  "arguments": {
    "prompt": "A nano banana dish in a fancy restaurant with a Gemini theme"
  }
}
```

**Response:**

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

### Error Handling

The server includes error handling for:

- Missing or invalid Gemini API key
- Network connectivity issues
- Gemini API errors
- Invalid input parameters
- Cases where no image is generated

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
