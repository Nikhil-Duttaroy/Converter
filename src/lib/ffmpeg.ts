/**
 * FFmpeg utility functions for file conversion
 * @module ffmpeg
 */

"use client";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL, fetchFile } from "@ffmpeg/util";
import { ExtendedFile } from "./types";
import {
  MAX_FILE_SIZE,
  CHUNK_SIZE,
  MEMORY_SPLIT,
  MIN_MEMORY,
  DEFAULT_MEMORY,
  WEB_FRIENDLY_IMAGE_FORMATS,
  VECTOR_FORMATS,
  VIDEO_CODEC_PRESETS,
  AUDIO_CODEC_PRESETS
} from "./constants";

// Constants

/**
 * Loads and initializes FFmpeg with core and WASM files
 * @returns {Promise<FFmpeg>} Initialized FFmpeg instance
 */
export async function loadFfmpeg(): Promise<FFmpeg> {
  const ffmpeg = new FFmpeg();
  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
  });
  return ffmpeg;
}

/**
 * Extracts file extension from filename
 * @param {string} file_name - Name of the file
 * @returns {string} File extension without dot
 */
function getFileExtension(file_name: string): string {
  const regex = /(?:\.([^.]+))?$/;
  const match = regex.exec(file_name);
  return match && match[1] ? match[1] : "";
}

/**
 * Removes file extension from filename
 * @param {string} file_name - Name of the file
 * @returns {string} Filename without extension
 */
function removeFileExtension(file_name: string): string {
  const lastDotIndex = file_name.lastIndexOf(".");
  return lastDotIndex !== -1 ? file_name.slice(0, lastDotIndex) : file_name;
}

/**
 * Optimizes memory usage by triggering garbage collection if available
 */
function optimizeMemoryUsage(): void {
  if (typeof window !== 'undefined' && window.gc) {
    try {
      window.gc();
    } catch {}
  }
}

/**
 * Cleans up temporary files in FFmpeg instance
 * @param {FFmpeg} ffmpeg - FFmpeg instance
 * @param {string} input - Input filename
 * @param {string} output - Output filename
 */
async function cleanupResources(ffmpeg: FFmpeg, input: string, output: string): Promise<void> {
  try {
    await Promise.all([
      ffmpeg.deleteFile(input),
      ffmpeg.deleteFile(output)
    ]);
  } catch {} // Ignore cleanup errors
}

/**
 * Calculates safe memory settings based on file size
 * @param {number} fileSize - Size of the file in bytes
 * @returns {{ threads: number; bufsize: string }} Memory settings
 */
function calculateMemorySettings(fileSize: number): { threads: number; bufsize: string } {
  let availableMemory = MIN_MEMORY;
  try {
    // @ts-expect-error - performance.memory is Chrome-specific
    const jsMemory = window.performance?.memory?.jsHeapSizeLimit;
    if (jsMemory && typeof jsMemory === 'number') {
      availableMemory = Math.max(MIN_MEMORY, jsMemory);
    } else {
      availableMemory = DEFAULT_MEMORY;
    }
  } catch {
    availableMemory = DEFAULT_MEMORY;
  }

  const safeMemory = Math.floor(availableMemory * MEMORY_SPLIT);
  const bufsize = Math.min(Math.max(fileSize * 2, 1024 * 1024), safeMemory);
  const threads = fileSize > 50 * 1024 * 1024 || availableMemory < 1024 * 1024 * 1024 ? 1 : 0;
  
  return { 
    threads, 
    bufsize: `${Math.floor(bufsize / 1024)}K` 
  };
}

/**
 * Converts image using canvas API for web-friendly formats
 * @param {File} file - Input image file
 * @param {string} format - Target format
 * @returns {Promise<Blob>} Converted image blob
 */
async function convertImage(file: File, format: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        
        if (format === 'svg') {
          // Create SVG string
          const svgString = `
            <svg xmlns="http://www.w3.org/2000/svg" width="${img.width}" height="${img.height}">
              <image href="${canvas.toDataURL('image/png')}" width="${img.width}" height="${img.height}"/>
            </svg>
          `;
          const blob = new Blob([svgString], { type: 'image/svg+xml' });
          resolve(blob);
          return;
        }

        const mimeType = format === 'jpg' || format === 'jpeg' ? 'image/jpeg' :
                        format === 'webp' ? 'image/webp' :
                        format === 'png' ? 'image/png' : 'image/jpeg';
        
        const quality = format === 'webp' ? 0.8 : 0.92;
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to convert image'));
            }
          },
          mimeType,
          quality
        );
      } else {
        reject(new Error('Failed to get canvas context'));
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * Builds FFmpeg command for video codec
 * @param {string} format - Target format
 * @param {typeof VIDEO_CODEC_PRESETS.h264 | typeof VIDEO_CODEC_PRESETS.vp8} preset - Codec preset
 * @returns {string[]} FFmpeg command array
 */
function buildVideoCodecCommand(format: string, preset: typeof VIDEO_CODEC_PRESETS.h264 | typeof VIDEO_CODEC_PRESETS.vp8): string[] {   
  const cmd = ['-c:v', preset.codec];
  
  if ('crf' in preset) {
    cmd.push('-crf', preset.crf, '-preset', preset.preset);
  } else {
    cmd.push('-cpu-used', preset.cpuUsed, '-deadline', preset.deadline, '-b:v', preset.bitrate);
  }

  if (format === '3gp') {
    cmd.push(
      '-r', '20',
      '-s', '352x288',
      '-profile:v', 'baseline',
      '-level', '3.0',
      '-pix_fmt', 'yuv420p',
      '-maxrate', '400k'
    );
  }

  return [...cmd, ...buildAudioCodecCommand(format)];
}

/**
 * Builds FFmpeg command for audio codec
 * @param {string} format - Target format
 * @returns {string[]} FFmpeg command array
 */
function buildAudioCodecCommand(format: string): string[] {
  const preset = AUDIO_CODEC_PRESETS[format as keyof typeof AUDIO_CODEC_PRESETS] || AUDIO_CODEC_PRESETS.aac;
  const cmd = ['-c:a', preset.codec];

  if ('bitrate' in preset) {
    cmd.push('-b:a', preset.bitrate);
  } else if ('quality' in preset) {
    cmd.push('-q:a', preset.quality);
  }

  return cmd;
}

/**
 * Builds complete FFmpeg command based on format and type
 * @param {string} format - Target format
 * @param {string} type - File type
 * @param {string} input - Input filename
 * @param {string} output - Output filename
 * @param {{ threads: number; bufsize: string }} memSettings - Memory settings
 * @returns {string[]} Complete FFmpeg command array
 */
function buildFFmpegCommand(
  format: string,
  type: string,
  input: string,
  output: string,
  memSettings: { threads: number; bufsize: string }
): string[] {
  const baseCmd = [
    '-nostdin',
    '-threads', memSettings.threads.toString(),
    '-i', input
  ];

  let codecCmd: string[] = [];

  if (type.startsWith('video/')) {
    // Handle specific video formats
    switch (format.toLowerCase()) {
      case 'mp4v':
        codecCmd = [
          '-c:v', 'libx264',
          '-preset', 'fast',
          '-crf', '28',
          '-profile:v', 'baseline',
          '-level', '3.0',
          '-pix_fmt', 'yuv420p',
          '-movflags', '+faststart',
          '-max_muxing_queue_size', '1024'
        ];
        break;
      case 'm4v':
        codecCmd = [
          '-c:v', 'libx264',
          '-preset', 'medium',
          '-crf', '23',
          '-profile:v', 'high',
          '-level', '4.1'
        ];
        break;
      case '3gp':
      case '3g2':
        codecCmd = [
          '-c:v', 'libx264',
          '-preset', 'medium',
          '-crf', '28',
          '-profile:v', 'baseline',
          '-level', '3.0',
          '-r', '20',
          '-s', '352x288',
          '-pix_fmt', 'yuv420p',
          '-maxrate', '400k'
        ];
        break;
      case 'avi':
        codecCmd = [
          '-c:v', 'libx264',
          '-preset', 'medium',
          '-crf', '23',
          '-pix_fmt', 'yuv420p'
        ];
        break;
      case 'mov':
        codecCmd = [
          '-c:v', 'libx264',
          '-preset', 'medium',
          '-crf', '23',
          '-profile:v', 'high',
          '-level', '4.1',
          '-pix_fmt', 'yuv420p'
        ];
        break;
      case 'wmv':
        codecCmd = [
          '-c:v', 'wmv2',
          '-b:v', '2M',
          '-maxrate', '2M',
          '-bufsize', '4M'
        ];
        break;
      case 'mkv':
        codecCmd = [
          '-c:v', 'libx264',
          '-preset', 'medium',
          '-crf', '23',
          '-pix_fmt', 'yuv420p'
        ];
        break;
      case 'flv':
        codecCmd = [
          '-c:v', 'libx264',
          '-preset', 'medium',
          '-crf', '23',
          '-pix_fmt', 'yuv420p'
        ];
        break;
      case 'ogv':
        codecCmd = [
          '-c:v', 'libtheora',
          '-q:v', '7'
        ];
        break;
      case 'h264':
      case '264':
        codecCmd = [
          '-c:v', 'libx264',
          '-preset', 'medium',
          '-crf', '23',
          '-pix_fmt', 'yuv420p'
        ];
        break;
      case 'hevc':
      case '265':
        codecCmd = [
          '-c:v', 'libx265',
          '-preset', 'medium',
          '-crf', '28',
          '-pix_fmt', 'yuv420p'
        ];
        break;
      default:
        // Default to h264 for other formats
        const preset = format === 'webm' ? VIDEO_CODEC_PRESETS.vp8 : VIDEO_CODEC_PRESETS.h264;
        codecCmd = buildVideoCodecCommand(format, preset);
    }
  } else if (type.startsWith('audio/')) {
    // Handle specific audio formats
    switch (format.toLowerCase()) {
      case 'wma':
        codecCmd = [
          '-c:a', 'wmav2',
          '-b:a', '192k'
        ];
        break;
      case 'flac':
        codecCmd = [
          '-c:a', 'flac',
          '-compression_level', '8'
        ];
        break;
      case 'm4a':
        codecCmd = [
          '-c:a', 'aac',
          '-b:a', '192k',
          '-profile:a', 'aac_low'
        ];
        break;
      default:
        codecCmd = buildAudioCodecCommand(format);
    }
  }

  return [...baseCmd, ...codecCmd, '-y', output];
}

/**
 * Handles image conversion using FFmpeg
 * @param {FFmpeg} ffmpeg - FFmpeg instance
 * @param {File} fileData - Input file
 * @param {string} input - Input filename
 * @param {string} output - Output filename
 * @param {string} format - Target format
 * @param {{ threads: number; bufsize: string }} memSettings - Memory settings
 * @returns {Promise<{ url: string; output: string }>} Conversion result
 */
async function handleImageConversion(
  ffmpeg: FFmpeg,
  fileData: File,
  input: string,
  output: string,
  format: string,
  memSettings: { threads: number; bufsize: string }
): Promise<{ url: string; output: string }> {
  await ffmpeg.writeFile(input, await fetchFile(fileData));
  const ffmpeg_cmd = [
    '-nostdin',
    '-threads', memSettings.threads.toString(),
    '-i', input,
    '-compression_level', '7',
  ];

  if (memSettings.bufsize) {
    ffmpeg_cmd.push('-bufsize', memSettings.bufsize);
  }

  switch (format.toLowerCase()) {
    case 'tiff':
    case 'tif':
      ffmpeg_cmd.push('-compression_algo', 'lzw');
      break;
    case 'bmp':
      ffmpeg_cmd.push('-pix_fmt', 'rgb24');
      break;
    case 'gif':
      ffmpeg_cmd.push(
        '-filter_complex', '[0:v] split [a][b];[a] palettegen [p];[b][p] paletteuse',
        '-max_muxing_queue_size', '1024'
      );
      break;
    case 'raw':
      // Get image dimensions for raw format
      let width = 1920;
      let height = 1080;
      try {
        const probeCmd = ['-i', input];
        await ffmpeg.exec(probeCmd);
        const probeOutput = await ffmpeg.readFile('ffmpeg-output.txt') as Uint8Array;
        const probeText = new TextDecoder().decode(probeOutput);
        const dimensionsMatch = probeText.match(/Stream.*Video.* (\d+)x(\d+)/);
        if (dimensionsMatch) {
          width = parseInt(dimensionsMatch[1]);
          height = parseInt(dimensionsMatch[2]);
        }
      } catch (error) {
        console.warn('Could not get image dimensions, using default size',error);
      }
      
      // For raw format, we need to specify the pixel format and image dimensions
      ffmpeg_cmd.push(
        '-f', 'rawvideo',
        '-pix_fmt', 'rgb24',
        '-s', `${width}x${height}`
      );
      break;
  }

  ffmpeg_cmd.push(output);
  await ffmpeg.exec(ffmpeg_cmd);
  const data = await ffmpeg.readFile(output) as Uint8Array;
  const blob = new Blob([data], { type: `image/${format}` });
  const url = URL.createObjectURL(blob);
  return { url, output };
}

/**
 * Converts a single file using FFmpeg
 * @param {FFmpeg} ffmpeg - FFmpeg instance
 * @param {ExtendedFile} file - File to convert
 * @returns {Promise<{ url: string; output: string }>} Conversion result
 */
export async function convertFile(
  ffmpeg: FFmpeg,
  file: ExtendedFile
): Promise<{ url: string; output: string }> {
  const { fileData, to, name, type } = file;
  if (!to) throw new Error("Output format 'to' is undefined");
  if (!fileData) throw new Error("File data is undefined");

  // Check file size first
  if (fileData.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
  }

  const input = getFileExtension(name);
  const output = removeFileExtension(name) + "." + to;
  const memSettings = calculateMemorySettings(fileData.size);

  try {
    if (type.startsWith('image/')) {
      if (VECTOR_FORMATS.has(to.toLowerCase()) || WEB_FRIENDLY_IMAGE_FORMATS.has(to.toLowerCase())) {
        const blob = await convertImage(fileData, to);
        const url = URL.createObjectURL(blob);
        return { url, output };
      }

      return await handleImageConversion(ffmpeg, fileData, input, output, to, memSettings);
    }

    await cleanupResources(ffmpeg, input, output);
    await ffmpeg.writeFile(input, await fetchFile(fileData));

    const ffmpegCmd = buildFFmpegCommand(to.toLowerCase(), type, input, output, memSettings);
    await ffmpeg.exec(ffmpegCmd);

    const data = await ffmpeg.readFile(output) as Uint8Array;
    const blob = new Blob([data], { type: type.split("/")[0] });
    const url = URL.createObjectURL(blob);

    await cleanupResources(ffmpeg, input, output);
    optimizeMemoryUsage();
    
    return { url, output };
  } catch (error) {
    await cleanupResources(ffmpeg, input, output);
    throw error;
  }
}

/**
 * Converts multiple files using FFmpeg
 * @param {FFmpeg} ffmpeg - FFmpeg instance
 * @param {ExtendedFile[]} files - Array of files to convert
 * @param {Function} onProgress - Callback function to handle progress updates
 * @returns {Promise<Array<{ file: ExtendedFile; result: { url: string; output: string; error?: string } }>>} Conversion results
 */
export async function convertFiles(
  ffmpeg: FFmpeg,
  files: ExtendedFile[],
  onProgress?: (file: ExtendedFile, result: { url: string; output: string; error?: string }) => void
): Promise<Array<{ file: ExtendedFile; result: { url: string; output: string; error?: string } }>> {
  const results: Array<{ file: ExtendedFile; result: { url: string; output: string; error?: string } }> = [];
  
  const sortedFiles = [...files].sort((a, b) => 
    ((a.fileData?.size || 0) - (b.fileData?.size || 0))
  );
  
  for (let i = 0; i < sortedFiles.length; i += CHUNK_SIZE) {
    try {
      await ffmpeg.exec(['-nostdin']); // Clear memory
      optimizeMemoryUsage(); 
      
      const chunk = sortedFiles.slice(i, i + CHUNK_SIZE);
      
      // Process files one by one in the chunk
      for (const file of chunk) {
        try {
          const result = await convertFile(ffmpeg, file);
          const fileResult = { file, result };
          results.push(fileResult);
          
          // Emit progress update if callback is provided
          if (onProgress) {
            onProgress(file, result);
          }
        } catch (err) {
          const error = err as Error;
          console.error(`Error converting file ${file.name}:`, error);
          const fileResult = { 
            file, 
            result: { url: '', output: '', error: error.message } 
          };
          results.push(fileResult);
          
          // Ensure error state is properly set
          file.isErrored = true;
          file.isConverted = false;
          file.isConverting = false;
          
          // Emit progress update for error if callback is provided
          if (onProgress) {
            onProgress(file, fileResult.result);
          }
        }
      }
    } catch (error) {
      console.error('Chunk processing error:', error);
    }
  }
  
  return results;
}
