export const accepted_files = {
  "audio/*": [],
  "video/*": [],
  "image/*": [],
};

export const extensions = {
  image: [
    "jpg",
    "jpeg",
    "png",
    "gif",
    "bmp",
    "webp",
    "ico",
    "tif",
    "tiff",
    "svg",
    "raw",
    "tga",
  ],
  video: [
    "mp4",
    "m4v",
    "mp4v",
    "3gp",
    "3g2",
    "avi",
    "mov",
    "wmv",
    "mkv",
    "flv",
    "ogv",
    "webm",
    "h264",
    "264",
    "hevc",
    "265",
  ],
  audio: ["mp3", "wav", "ogg", "aac", "wma", "flac", "m4a"],
};

export const MAX_FILE_SIZE = 2000 * 1024 * 1024; // 2GB
export const MAX_FILE_SIZE_MB = MAX_FILE_SIZE / (1024 * 1024);
export const CHUNK_SIZE = 2; // Reduce chunk size for large files
export const MEMORY_SPLIT = 0.8; // 80% of available memory for processing
export const MIN_MEMORY = 64 * 1024 * 1024; // 64MB minimum
export const DEFAULT_MEMORY = 512 * 1024 * 1024; // 512MB default

// File format sets
export const WEB_FRIENDLY_IMAGE_FORMATS = new Set(['jpg', 'jpeg', 'png', 'webp']);
export const VECTOR_FORMATS = new Set(['svg', 'eps', 'ai']);

// FFmpeg codec presets
export const VIDEO_CODEC_PRESETS = {
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

export const AUDIO_CODEC_PRESETS = {
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