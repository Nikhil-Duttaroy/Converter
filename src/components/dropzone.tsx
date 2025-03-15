"use client";
import ReactDropzone from "react-dropzone";
import { Button } from "./ui/button";
import { useState } from "react";
import FileCard from "./fileCard";
import { ExtendedFile } from "@/lib/types";

const Dropzone = ({}) => {
  //States
  const [files, setFiles] = useState<ExtendedFile[]>([]);
  const [isHovering, setIsHovering] = useState<boolean>(false);
  const accepted_files = {
    "audio/*": [],
    "video/*": [],
    "image/*": [],
  };

  //Functions
  const handleUpload = (files: ExtendedFile[]) => {
    const filesWithMetadata = files.map((file) => ({
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

    console.log("🚀 ~ files:", files);
    console.log("🚀 ~ filesWithMetadata:", filesWithMetadata);
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

  if (files.length > 0) {
    return (
      <div className="flex flex-col items-center space-y-4 w-full">
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
            />
          ))}
        </div>
        <Button
          variant="default"
          onClick={() => {
            // Handle conversion for all files with their selected types
          }}
        >
          Convert All
        </Button>
      </div>
    );
  }

  return (
    <ReactDropzone
      onDrop={handleUpload}
      onDragEnter={handleHover}
      onDragLeave={handleExitHover}
      accept={accepted_files}
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
