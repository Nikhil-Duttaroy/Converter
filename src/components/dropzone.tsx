"use client";
import ReactDropzone from "react-dropzone";
import { Button } from "./ui/button";
import { useState } from "react";
import FileCard from "./fileCard";

const Dropzone = ({}) => {
  //States
  const [files, setFiles] = useState<File[]>([]);
  const [isHovering, setIsHovering] = useState<boolean>(false);

  const accepted_files = {
    "audio/*": [],
    "video/*": [],
    "image/*": [],
  };

  //Functions
  const handleUpload = (files: File[]) => {
    console.log(files);
    setFiles(files);
  };

  const handleHover = () => {
    setIsHovering(true);
  };

  const handleExitHover = () => {
    setIsHovering(false);
  };


  if(files.length > 0){
    return (
      <div className="flex flex-col items-center space-y-4 w-full">
        <h1 className="text-3xl font-bold">Uploaded Files</h1>
        <div className="flex flex-col items-center space-y-4 w-[80%]">
          {files.map((file, index) => (
           <FileCard key={index} index={index} file={file} files={files} setFiles={setFiles}/>
          ))}
        </div>
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
