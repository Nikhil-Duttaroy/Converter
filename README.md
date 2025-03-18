# Media File Converter

A modern web application for converting media files directly in your browser. Built with Next.js and FFmpeg, this application allows you to convert various audio, video, and image formats without uploading your files to any server.

## Features

- 🚀 Client-side file conversion using FFmpeg
- 📁 Support for multiple file formats:
  - Images: JPG, JPEG, PNG, GIF, BMP, WebP, ICO, TIFF, SVG, RAW, TGA
  - Videos: MP4, M4V, AVI, MOV, WMV, MKV, FLV, WebM, H.264, HEVC
  - Audio: MP3, WAV, OGG, AAC, WMA, FLAC, M4A
- 💾 Maximum file size: 2GB
- 🔒 Privacy-focused: All conversion happens locally in your browser
- 🎨 Modern UI with drag-and-drop support
- 📱 Responsive design for all devices
- ⚡ Fast conversion with optimized FFmpeg settings

## Tech Stack

- Next.js 15.2.1
- React 19
- TypeScript
- FFmpeg.wasm
- TailwindCSS
- Radix UI Components

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- pnpm (recommended) or npm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/converter.git
cd converter
```

2. Install dependencies:
```bash
pnpm install
```

3. Start the development server:
```bash
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
pnpm build
pnpm start
```

## Usage

1. Drag and drop your files into the upload area or click to browse
2. Select the desired output format for each file
3. Click "Convert Files" to start the conversion
4. Download your converted files individually or all at once

## Supported Conversions

### Video Conversions
- H.264 encoding with optimized settings
- VP8 encoding for WebM format
- Various container formats (MP4, WebM, etc.)

### Audio Conversions
- AAC encoding with 128k bitrate
- MP3 encoding with 192k bitrate
- Vorbis encoding for OGG format

### Image Conversions
- Web-friendly formats (JPG, PNG, WebP)
- Vector graphics support (SVG)
- High-quality image processing

## Browser Support

This application uses FFmpeg.wasm, which requires a modern browser with WebAssembly support. The following browsers are supported:

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [FFmpeg.wasm](https://github.com/ffmpeg/ffmpeg.js) for client-side media processing
- [Next.js](https://nextjs.org/) for the React framework
- [TailwindCSS](https://tailwindcss.com/) for styling
- [Radix UI](https://www.radix-ui.com/) for accessible components
