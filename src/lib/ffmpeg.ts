"use client";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL, fetchFile } from "@ffmpeg/util";
import { ExtendedFile } from "./types";

export async function loadFfmpeg(): Promise<FFmpeg> {
  const ffmpeg = new FFmpeg();
  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
  });
  return ffmpeg;
}

function getFileExtension(file_name: string) {
  const regex = /(?:\.([^.]+))?$/;
  const match = regex.exec(file_name);
  if (match && match[1]) {
    return match[1];
  }
  return ""; 
}

function removeFileExtension(file_name: string) {
  const lastDotIndex = file_name.lastIndexOf(".");
  if (lastDotIndex !== -1) {
    return file_name.slice(0, lastDotIndex);
  }
  return file_name;
}

const MAX_FILE_SIZE = 2000 * 1024 * 1024; // 2GB
const CHUNK_SIZE = 2; // Reduce chunk size for large files

// Memory optimization constants
const MEMORY_SPLIT = 0.8; // 80% of available memory for processing
const MIN_MEMORY = 64 * 1024 * 1024; // 64MB minimum
const DEFAULT_MEMORY = 512 * 1024 * 1024; // 512MB default

// FFmpeg command configurations
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

// commonly used values
const WEB_FRIENDLY_IMAGE_FORMATS = new Set(['jpg', 'jpeg', 'png', 'webp']);
const VECTOR_FORMATS = new Set(['svg', 'eps', 'ai']);

// performance monitoring
const PERFORMANCE_MARKS = {
  START_CONVERSION: 'startConversion',
  END_CONVERSION: 'endConversion',
  START_CLEANUP: 'startCleanup',
  END_CLEANUP: 'endCleanup',
} as const;

// memory management
function optimizeMemoryUsage() {
  if (typeof window !== 'undefined' && window.gc) {
    try {
      window.gc();
    } catch {}
  }
}

// resource cleanup function
async function cleanupResources(ffmpeg: FFmpeg, input: string, output: string) {
  performance.mark(PERFORMANCE_MARKS.START_CLEANUP);
  try {
    await Promise.all([
      ffmpeg.deleteFile(input),
      ffmpeg.deleteFile(output)
    ]);
  } catch {} // Ignore cleanup errors
  performance.mark(PERFORMANCE_MARKS.END_CLEANUP);
  performance.measure('Cleanup Time', 
    PERFORMANCE_MARKS.START_CLEANUP, 
    PERFORMANCE_MARKS.END_CLEANUP
  );
}

// Image conversion function with format support
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

// Helper function to calculate safe memory settings
function calculateMemorySettings(fileSize: number): { threads: number; bufsize: string } {
  // Safe memory detection
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
  
  // Thread calculation based on file size and available memory
  const threads = fileSize > 50 * 1024 * 1024 || availableMemory < 1024 * 1024 * 1024 ? 1 : 0;
  
  return { 
    threads, 
    bufsize: `${Math.floor(bufsize / 1024)}K` 
  };
}

// Helper function to handle image conversion
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

  // Add format-specific settings
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
        // Add memory optimization for gif processing
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

export async function convertFile(
  ffmpeg: FFmpeg,
  file: ExtendedFile
): Promise<{ url: string; output: string }> {
  performance.mark(PERFORMANCE_MARKS.START_CONVERSION);
  
  const { fileData, to, name, type } = file;
  if (!to) throw new Error("Output format 'to' is undefined");
  if (!fileData) throw new Error("File data is undefined");

  const input = getFileExtension(name);
  const output = removeFileExtension(name) + "." + to;
  const memSettings = calculateMemorySettings(fileData.size);

  try {
    // Handle image conversions
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

    // Handle other file types
    if (fileData.size > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }

    await cleanupResources(ffmpeg, input, output);
    await ffmpeg.writeFile(input, await fetchFile(fileData));

    const ffmpegCmd = buildFFmpegCommand(to.toLowerCase(), type, input, output, memSettings);
    await ffmpeg.exec(ffmpegCmd);

    const data = await ffmpeg.readFile(output) as Uint8Array;
    const blob = new Blob([data], { type: type.split("/")[0] });
    const url = URL.createObjectURL(blob);

    await cleanupResources(ffmpeg, input, output);
    
    performance.mark(PERFORMANCE_MARKS.END_CONVERSION);
    performance.measure('Conversion Time',
      PERFORMANCE_MARKS.START_CONVERSION,
      PERFORMANCE_MARKS.END_CONVERSION
    );

    optimizeMemoryUsage();
    return { url, output };
  } catch (error) {
    await cleanupResources(ffmpeg, input, output);
    throw error;
  }
}

// Helper function to build FFmpeg commands
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

// Helper function for video codec commands
function buildVideoCodecCommand(format: string, preset: typeof VIDEO_CODEC_PRESETS.h264 | typeof VIDEO_CODEC_PRESETS.vp8): string[] {
  const cmd = ['-c:v', preset.codec];
  
  if ('crf' in preset) {
    cmd.push('-crf', preset.crf, '-preset', preset.preset);
  } else {
    cmd.push('-cpu-used', preset.cpuUsed, '-deadline', preset.deadline, '-b:v', preset.bitrate);
  }

  // Add format-specific optimizations
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

// Helper function for audio codec commands
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

export async function convertFiles(
  ffmpeg: FFmpeg,
  files: ExtendedFile[]
): Promise<Array<{ file: ExtendedFile; result: { url: string; output: string; error?: string } }>> {
  const results: Array<{ file: ExtendedFile; result: { url: string; output: string; error?: string } }> = [];
  
  // Sort files by size for processing
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
