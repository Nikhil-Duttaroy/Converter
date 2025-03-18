"use client";
import ReactDropzone from "react-dropzone";
import { Button } from "./ui/button";
import { useEffect, useRef, useState } from "react";
import FileCard from "./fileCard";
import { ExtendedFile } from "@/lib/types";
import { convertFiles, loadFfmpeg } from "@/lib/ffmpeg";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import {
  accepted_files,
  MAX_FILE_SIZE,
  MAX_FILE_SIZE_MB,
} from "@/lib/constants";
import { Download, Loader2 } from "lucide-react";
import { Badge } from "./ui/badge";

/**
 * Dropzone component that handles file uploads and conversions
 * Uses FFmpeg.wasm for client-side file conversion
 */
const Dropzone = ({}) => {
  // State management for files and UI status
  const [files, setFiles] = useState<ExtendedFile[]>([]);
  const [isHovering, setIsHovering] = useState<boolean>(false);
  const [isFFMPEGLoaded, setIsFFMPEGLoaded] = useState<boolean>(false);
  const [isConversionCompleted, setIsConversionCompleted] = useState<boolean>(false);
  const [conversionError, setConversionError] = useState<string>("");
  // Keep FFmpeg instance in a ref to persist between renders
  const ffmpegRef = useRef(new FFmpeg());

  /**
   * Reset all state to initial values
   * Used when user wants to convert more files
   */
  const reset = () => {
    setFiles([]);
    setIsHovering(false);
    setIsFFMPEGLoaded(false);
    setIsConversionCompleted(false);
  };

  /**
   * Process uploaded files and add metadata
   * @param files - Array of files uploaded by user
   */
  const handleUpload = (files: ExtendedFile[]) => {
    const filesWithMetadata = files.map((file) => ({
      fileData: file,
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      path: file.path,
      relativePath: file.relativePath,
      from: file.name.split(".").pop(), // Extract original file extension
      to: "", // Target format (to be selected by user)
      isConverted: false,
      isConverting: false,
      isErrored: false,
      url: "", // URL for converted file
      output: null, // Output filename
    })) as ExtendedFile[];

    setFiles(filesWithMetadata);
  };

  // Drag and drop UI handlers
  const handleHover = () => setIsHovering(true);
  const handleExitHover = () => setIsHovering(false);

  /**
   * Update target format for a specific file
   * @param index - Index of file in files array
   * @param value - Selected target format
   */
  const handleTypeChange = (index: number, value: string) => {
    const newFiles = [...files];
    newFiles[index] = { ...newFiles[index], to: value };
    setFiles(newFiles);
  };

  /**
   * Initialize FFmpeg instance
   * Loads required WASM files and core functionality
   */
  const load = async () => {
    const ffmpeg_response: FFmpeg = await loadFfmpeg();
    ffmpegRef.current = ffmpeg_response;
    setIsFFMPEGLoaded(true);
  };

  // Load FFmpeg on component mount
  useEffect(() => {
    load();
  }, []);

  /**
   * Handle conversion of all files
   * Updates UI state during conversion and handles errors
   */
  const handleFileConversion = async () => {
    setConversionError("");
    // Reset error state and mark all files as converting
    let tmpFiles = files.map((elt) => ({
      ...elt,
      isConverting: true,
      isErrored: false,
    }));
    setFiles(tmpFiles);

    try {
      // Convert all files and handle progress updates
      await convertFiles(
        ffmpegRef.current, 
        tmpFiles,
        (file, result) => {
          // Update file status in real-time
          const fileIndex = tmpFiles.findIndex(f => f === file);
          if (fileIndex !== -1) {
            if (result.error) {
              // Handle conversion error
              tmpFiles[fileIndex] = {
                ...tmpFiles[fileIndex],
                isConverted: false,
                isConverting: false,
                isErrored: true,
                error: result.error,
              };
            } else {
              // Handle successful conversion
              tmpFiles[fileIndex] = {
                ...tmpFiles[fileIndex],
                isConverted: true,
                isConverting: false,
                url: result.url,
                output: result.output,
              };
            }
            setFiles([...tmpFiles]);
          }
        }
      );

      // Check overall conversion status
      const hasSuccessfulConversions = tmpFiles.some(
        (file) => file.isConverted
      );
      setIsConversionCompleted(hasSuccessfulConversions);

      // Show error if all files failed
      if (!hasSuccessfulConversions) {
        setConversionError(
          "Failed to convert all files. Please try with smaller files or a different format."
        );
      }
    } catch (err) {
      // Handle global conversion error
      const error = err as Error;
      console.error("Conversion error:", error);
      setConversionError(
        error.message || "An error occurred during conversion"
      );
      tmpFiles = tmpFiles.map((file) => ({
        ...file,
        isConverted: false,
        isConverting: false,
        isErrored: true,
      }));
      setFiles(tmpFiles);
    }
  };

  /**
   * Download all successfully converted files
   */
  const handleDownloadAll = () => {
    for (const file of files) {
      if (!file.isErrored) {
        handleSingleFiledownload(file);
      }
    }
  };

  /**
   * Download a single converted file
   * Creates a temporary link element to trigger download
   * @param file - File to download
   */
  const handleSingleFiledownload = (file: ExtendedFile) => {
    const a = document.createElement("a");
    a.style.display = "none";
    if (file.url && file.output) {
      a.href = file.url;
      a.download = file.output as string;
    }
    document.body.appendChild(a);
    a.click();
    if (file.url) {
      URL.revokeObjectURL(file.url); // Clean up object URL
    }
    document.body.removeChild(a);
  };

  /**
   * Retry conversion for a single failed file
   * @param index - Index of file to retry
   */
  const handleRetry = async (index: number) => {
    const fileToRetry = files[index];
    if (!fileToRetry || !fileToRetry.to) return;

    // Reset file state for retry
    const newFiles = [...files];
    newFiles[index] = {
      ...fileToRetry,
      isConverting: true,
      isErrored: false,
      isConverted: false,
      url: "",
      output: null,
    };
    setFiles(newFiles);

    try {
      // Convert only the retry file
      await convertFiles(
        ffmpegRef.current,
        [newFiles[index]],
        (file, result) => {
          const fileIndex = newFiles.findIndex(f => f === file);
          if (fileIndex !== -1) {
            if (result.error) {
              // Handle retry error
              newFiles[fileIndex] = {
                ...newFiles[fileIndex],
                isConverted: false,
                isConverting: false,
                isErrored: true,
                error: result.error,
              };
            } else {
              // Handle successful retry
              newFiles[fileIndex] = {
                ...newFiles[fileIndex],
                isConverted: true,
                isConverting: false,
                url: result.url,
                output: result.output,
              };
            }
            setFiles([...newFiles]);
          }
        }
      );
    } catch (err) {
      // Handle retry error
      const error = err as Error;
      console.error("Retry conversion error:", error);
      newFiles[index] = {
        ...newFiles[index],
        isConverted: false,
        isConverting: false,
        isErrored: true,
        error: error.message,
      };
      setFiles([...newFiles]);
    }
  };

  // Check if all files have a target format selected
  const allFilesHaveToValue = files.every((file) => file.to !== "");

  // Render file list and conversion controls
  if (files.length > 0) {
    return (
      <div className="flex flex-col items-center space-y-4 w-full pb-4">
        {/* Global error message */}
        {conversionError && (
          <div
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
            role="alert"
          >
            <span className="block sm:inline">{conversionError}</span>
          </div>
        )}
        <h1 className="text-3xl font-bold text-center">Uploaded Files</h1>
        {/* File cards list */}
        <div className="flex flex-col items-center space-y-4 w-[80%]">
          {files.map((file, index) => (
            <FileCard
              key={index}
              index={index}
              file={file}
              files={files}
              setFiles={setFiles}
              onTypeChange={handleTypeChange}
              downloadFile={handleSingleFiledownload}
              onRetry={handleRetry}
            />
          ))}
        </div>
        {/* Conversion controls */}
        {!isConversionCompleted &&
          (isFFMPEGLoaded ? (
            <Button
              disabled={!isFFMPEGLoaded || !allFilesHaveToValue}
              variant="default"
              onClick={() => handleFileConversion()}
            >
              Convert Files
            </Button>
          ) : (
            <Badge>
              <Loader2 className="animate-spin" />
              Accessing Conversion Powers
            </Badge>
          ))}

        {/* Post-conversion controls */}
        {isConversionCompleted && (
          <div className="flex gap-4">
            {files.length > 1 && (
              <Button variant="default" onClick={() => handleDownloadAll()}>
                <Download /> Download All
              </Button>
            )}
            <Button variant="secondary" onClick={() => reset()}>
              Convert More Files
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Render dropzone when no files are uploaded
  return (
    <ReactDropzone
      onDrop={handleUpload}
      onDragEnter={handleHover}
      onDragLeave={handleExitHover}
      accept={accepted_files}
      maxSize={MAX_FILE_SIZE}
    >
      {({ getRootProps, getInputProps }) => (
        <div
          {...getRootProps()}
          className="flex items-center justify-center border-2 border-dashed shadow-sm cursor-pointer bg-background h-72 lg:h-80 xl:h-96 w-4/5 md:w-3/5 rounded-3xl border-secondary"
        >
          <input {...getInputProps()} />
          <div className="space-y-4 text-foreground flex flex-col justify-center items-center">
            {!isHovering ? (
              <>
                <p className="text-lg font-bold">Drag & Drop your files here</p>
                <p className="text-base">or</p>
                <Button variant="default" size="lg">
                  Browse Files
                </Button>
                <p className="text-sm text-muted-foreground">
                  Maximum file size: {MAX_FILE_SIZE_MB}MB
                </p>
              </>
            ) : (
              <p className="text-lg font-bold">Yes, go on, drop them here.</p>
            )}
          </div>
        </div>
      )}
    </ReactDropzone>
  );
};

export default Dropzone;
