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

const Dropzone = ({}) => {
  //States
  const [files, setFiles] = useState<ExtendedFile[]>([]);
  const [isHovering, setIsHovering] = useState<boolean>(false);
  const [isFFMPEGLoaded, setIsFFMPEGLoaded] = useState<boolean>(false);
  const [isConversionCompleted, setIsConversionCompleted] =
    useState<boolean>(false);
  const [conversionError, setConversionError] = useState<string>("");
  const ffmpegRef = useRef(new FFmpeg());

  //Functions
  const reset = () => {
    setFiles([]);
    setIsHovering(false);
    setIsFFMPEGLoaded(false);
    setIsConversionCompleted(false);
  };

  const handleUpload = (files: ExtendedFile[]) => {
    const filesWithMetadata = files.map((file) => ({
      fileData: file,
      name: file.name, // Manually assign properties
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      path: file.path,
      relativePath: file.relativePath,
      from: file.name.split(".").pop(),
      to: "",
      isConverted: false,
      isConverting: false,
      isErrored: false,
      url: "",
      output: null,
    })) as ExtendedFile[];

    setFiles(filesWithMetadata);
  };

  const handleHover = () => {
    setIsHovering(true);
  };

  const handleExitHover = () => {
    setIsHovering(false);
  };

  const handleTypeChange = (index: number, value: string) => {
    const newFiles = [...files];
    newFiles[index] = { ...newFiles[index], to: value };
    setFiles(newFiles);
  };

  const load = async () => {
    const ffmpeg_response: FFmpeg = await loadFfmpeg();
    ffmpegRef.current = ffmpeg_response;
    setIsFFMPEGLoaded(true);
  };
  useEffect(() => {
    load();
  }, []);

  const handleFileConversion = async () => {
    setConversionError("");
    let tmpFiles = files.map((elt) => ({
      ...elt,
      isConverting: true,
      isErrored: false, // Reset error state
    }));
    setFiles(tmpFiles);

    try {
      const results = await convertFiles(ffmpegRef.current, tmpFiles);

      tmpFiles = tmpFiles.map((file) => {
        const result = results.find((r) => r.file === file);
        if (result) {
          if (result.result.error) {
            return {
              ...file,
              isConverted: false,
              isConverting: false,
              isErrored: true,
              error: result.result.error,
            };
          }
          return {
            ...file,
            isConverted: true,
            isConverting: false,
            url: result.result.url,
            output: result.result.output,
          };
        }
        return file;
      });

      // Check if any files were converted successfully
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
    } finally {
      setFiles(tmpFiles);
    }
  };

  const handleDownloadAll = () => {
    for (const file of files) {
      if (!file.isErrored) {
        handleSingleFiledownload(file);
      }
    }
  };

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
      URL.revokeObjectURL(file.url);
    }
    document.body.removeChild(a);
  };

  const allFilesHaveToValue = files.every((file) => file.to !== "");

  if (files.length > 0) {
    return (
      <div className="flex flex-col items-center space-y-4 w-full">
        {conversionError && (
          <div
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
            role="alert"
          >
            <span className="block sm:inline">{conversionError}</span>
          </div>
        )}
        <h1 className="text-3xl font-bold">Uploaded Files</h1>
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
            />
          ))}
        </div>
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
          className="flex items-center justify-center border-2 border-dashed shadow-sm cursor-pointer bg-background h-72 lg:h-80 xl:h-96  w-3/5 rounded-3xl border-secondary"
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
