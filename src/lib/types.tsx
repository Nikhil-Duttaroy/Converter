export type ExtendedFile = File & {
  path?: string; // Add these properties
  relativePath?: string;
  from?: string;
  to?: string;
  isConverted?: boolean;
  isConverting?: boolean;
  isErrored?: boolean;
  url?: string;
  output?: unknown;
  fileData?: File;
  error?: Error | string;
};