/**
 * FFmpeg utility functions for file conversion
 * @module ffmpeg
 */

"use client";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL, fetchFile } from "@ffmpeg/util";
import { ExtendedFile } from "./types";

// Constants
const MAX_FILE_SIZE = 2000 * 1024 * 1024; // 2GB
const CHUNK_SIZE = 2; // Reduce chunk size for large files
const MEMORY_SPLIT = 0.8; // 80% of available memory for processing
const MIN_MEMORY = 64 * 1024 * 1024; // 64MB minimum
const DEFAULT_MEMORY = 512 * 1024 * 1024; // 512MB default

// File format sets
const WEB_FRIENDLY_IMAGE_FORMATS = new Set(['jpg', 'jpeg', 'png', 'webp']);
const VECTOR_FORMATS = new Set(['svg', 'eps', 'ai']);

// FFmpeg codec presets
const VIDEO_CODEC_PRESETS = {
  h264: {
    codec: 'libx264',
    crf: '28',
    preset: 'faster',
    profile: 'main',
  },
  vp8: {
    codec: 'libvpx',
    cpuUsed: '4',
    deadline: 'realtime',
    bitrate: '1M',
  }
} as const;

const AUDIO_CODEC_PRESETS = {
  aac: {
    codec: 'aac',
    bitrate: '128k',
  },
  mp3: {
    codec: 'libmp3lame',
    bitrate: '192k',
    compressionLevel: '2',
  },
  vorbis: {
    codec: 'libvorbis',
    quality: '4',
  }
} as const;

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
    const preset = format === 'webm' ? VIDEO_CODEC_PRESETS.vp8 : VIDEO_CODEC_PRESETS.h264;
    codecCmd = buildVideoCodecCommand(format, preset);
  } else if (type.startsWith('audio/')) {
    codecCmd = buildAudioCodecCommand(format);
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
      if (VECTOR_FORMATS.has(to.toLowerCase())) {
        throw new Error(`Direct conversion to ${to.toUpperCase()} is not supported yet. Please use a vector graphics editor.`);
      }

      if (WEB_FRIENDLY_IMAGE_FORMATS.has(to.toLowerCase())) {
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
 * @returns {Promise<Array<{ file: ExtendedFile; result: { url: string; output: string; error?: string } }>>} Conversion results
 */
export async function convertFiles(
  ffmpeg: FFmpeg,
  files: ExtendedFile[]
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
      const chunkResults = await Promise.allSettled(
        chunk.map(async (file) => {
          try {
            const result = await convertFile(ffmpeg, file);
            return { file, result };
          } catch (err) {
            const error = err as Error;
            console.error(`Error converting file ${file.name}:`, error);
            return { 
              file, 
              result: { url: '', output: '', error } 
            };
          }
        })
      );
      
      results.push(...chunkResults.map(result => {
        if (result.status === 'fulfilled') {
          return result.value;
        }
        return {
          file: result.reason.file,
          result: { url: '', output: '', error: result.reason }
        };
      }));
    } catch (error) {
      console.error('Chunk processing error:', error);
    }
  }
  
  return results;
}
