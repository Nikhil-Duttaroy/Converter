import { useEffect, useState, memo } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { ExtendedFile } from "@/lib/types";
import { Loader2 } from "lucide-react";

interface FilePreviewDialogProps {
  file: ExtendedFile;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FilePreviewDialog = memo(function FilePreviewDialog({ 
  file, 
  isOpen, 
  onOpenChange 
}: FilePreviewDialogProps) {
  const [objectURL, setObjectURL] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let url = "";
    if (isOpen && file.fileData instanceof Blob) {
      try {
        url = URL.createObjectURL(file.fileData);
        setObjectURL(url);
      } catch (err) {
        setError("Failed to load preview");
        console.error(err);
      }
    }
    return () => {
      if (url) {
        URL.revokeObjectURL(url);
        setObjectURL("");
      }
    };
  }, [file.fileData, isOpen]);

  const handleMediaLoaded = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setError("Failed to load preview");
  };

  const renderPreview = () => {
    if (error) {
      return <div className="text-center text-red-500 p-4">{error}</div>;
    }

    if (!objectURL) return null;

    const commonLoadingOverlay = isLoading && (
      <div className="absolute inset-0 flex items-center justify-center bg-background/50">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );

    if (file.type.startsWith('audio/')) {
      return (
        <div className="relative">
          <audio 
            controls 
            className="w-full"
            onLoadedData={handleMediaLoaded}
            onError={handleError}
          >
            <source src={objectURL} type={file.type} />
            Your browser does not support the audio element.
          </audio>
          {commonLoadingOverlay}
        </div>
      );
    }

    if (file.type.startsWith('video/')) {
      return (
        <div className="relative">
          <video 
            controls 
            className="w-full"
            onLoadedData={handleMediaLoaded}
            onError={handleError}
          >
            <source src={objectURL} type={file.type} />
            Your browser does not support the video element.
          </video>
          {commonLoadingOverlay}
        </div>
      );
    }

    if (file.type.startsWith('image/')) {
      return (
        <div className="flex justify-center relative h-[70vh]">
          {commonLoadingOverlay}
          <Image
            src={objectURL}
            alt={file.name}
            fill
            className="object-contain rounded-lg"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
            priority
            onLoad={handleMediaLoaded}
            onError={handleError}
          />
        </div>
      );
    }

    return (
      <div className="text-center p-4">
        File preview not available for this format
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{file.name}</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          {renderPreview()}
        </div>
      </DialogContent>
    </Dialog>
  );
});