import React from "react";
import { Button } from "./ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getBytesToSize } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { extensions } from "@/lib/constants";
import { ExtendedFile } from "@/lib/types";
import { Badge } from "./ui/badge";
import { Download, Loader2, OctagonAlert, RotateCcw } from "lucide-react";

/**
 * Props for the FileCard component
 */
type Props = {
  index: number; // Index of the file in the parent's files array
  file: ExtendedFile; // File data with conversion metadata
  files: ExtendedFile[]; // Array of all files
  setFiles: (files: ExtendedFile[]) => void; // Function to update files array
  onTypeChange: (index: number, value: string) => void; // Handler for format change
  downloadFile: (file: ExtendedFile) => void; // Handler for file download
  onRetry: (index: number) => void; // Handler for retrying failed conversion
};

/**
 * FileCard component that displays file information and conversion controls
 * Handles different states: converting, converted, error, and format selection
 */
const FileCard = ({
  index,
  file,
  files,
  setFiles,
  onTypeChange,
  downloadFile,
  onRetry,
}: Props) => {
  // TODO : Keep Preview on Click of name of the file in a Modal
  // const renderPreview = () => {
  //     if (file.type.startsWith("image/")) {
  //       return <img src={URL.createObjectURL(file)} alt={file.name} className="w-20 h-20 object-cover" />;
  //     } else if (file.type.startsWith("audio/")) {
  //       return <audio controls src={URL.createObjectURL(file)} className="w-full" />;
  //     } else if (file.type.startsWith("video/")) {
  //       return <video controls src={URL.createObjectURL(file)} className="w-20 h-20 object-cover" />;
  //     } else {
  //       return <p>Unsupported file type</p>;
  //     }
  //   };

  return (
    <Card
      key={index}
      className="flex flex-col sm:flex-row items-start sm:items-center w-full justify-between gap-4 p-4"
    >
      <CardHeader className="w-full sm:w-2/5 p-0 min-w-0">
        <div className="text-sm sm:text-base flex items-center gap-2 overflow-hidden">
          <span className="truncate">{file.name}</span>
          <span className="text-muted-foreground shrink-0">
            ({getBytesToSize(file.size)})
          </span>
          <Button
            variant="outline"
            onClick={() => setFiles(files.filter((_, i) => i !== index))}
            className="md:hidden w-auto ml-auto px-2 py-0"
          >
            X
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex justify-start items-center w-full sm:w-2/5 gap-4 p-0">
        <CardAction className="w-full sm:w-auto">
          {file.isConverting ? (
            <Badge variant="default" className="w-full sm:w-auto">
              <Loader2 className="animate-spin mr-2 h-4 w-4" />
              Converting
            </Badge>
          ) : file.isConverted && !file.isErrored ? (
            <Button
              onClick={() => downloadFile(file)}
              className="w-full sm:w-auto"
            >
              <Download className="mr-2 h-4 w-4" /> Download
            </Button>
          ) : file.isErrored ? (
            <div className="flex gap-2 items-center">
              <Badge variant="destructive" className="w-full sm:w-auto">
                <OctagonAlert className="mr-2 h-4 w-4" />
                Error in Converting File
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRetry(index)}
                className="shrink-0"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </div>
          ) : (
            <Select
              value={file.to}
              onValueChange={(value) => onTypeChange(index, value)}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Convert To" />
              </SelectTrigger>
              <SelectContent className="h-fit">
                {file.type.includes("image") && (
                  <div className="grid grid-cols-3 md:grid-cols-2 gap-2 w-fit">
                    {extensions.image
                      .filter((elt) => elt !== file.from) // Exclude the current file format
                      .map((elt, i) => (
                        <div key={i} className="col-span-1 text-center">
                          <SelectItem value={elt} className="mx-auto">
                            {elt}
                          </SelectItem>
                        </div>
                      ))}
                  </div>
                )}
                {file.type.includes("video") && (
                  <Tabs defaultValue={"video"} className="w-full">
                    <TabsList className="w-full">
                      <TabsTrigger value="video" className="w-full">
                        Video
                      </TabsTrigger>
                      <TabsTrigger value="audio" className="w-full">
                        Audio
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="video">
                      <div className="grid grid-cols-3 md:grid-cols-2 gap-2 w-fit">
                        {extensions.video
                          .filter((elt) => elt !== file.from) // Exclude the current file format
                          .map((elt, i) => (
                            <div key={i} className="col-span-1 text-center">
                              <SelectItem value={elt} className="mx-auto">
                                {elt}
                              </SelectItem>
                            </div>
                          ))}
                      </div>
                    </TabsContent>
                    <TabsContent value="audio">
                      <div className="grid grid-cols-3 md:grid-cols-2 gap-2 w-fit">
                        {extensions.audio
                          .filter((elt) => elt !== file.from) // Exclude the current file format
                          .map((elt, i) => (
                            <div key={i} className="col-span-1 text-center">
                              <SelectItem value={elt} className="mx-auto">
                                {elt}
                              </SelectItem>
                            </div>
                          ))}
                      </div>
                    </TabsContent>
                  </Tabs>
                )}
                {file.type.includes("audio") && (
                  <div className="grid grid-cols-2 gap-2 w-fit">
                    {extensions.audio.map((elt, i) => (
                      <div key={i} className="col-span-1 text-center">
                        <SelectItem value={elt} className="mx-auto">
                          {elt}
                        </SelectItem>
                      </div>
                    ))}
                  </div>
                )}
              </SelectContent>
            </Select>
          )}
        </CardAction>
      </CardContent>
      <CardFooter className="hidden md:block w-auto p-0">
        <Button
          variant="default"
          onClick={() => setFiles(files.filter((_, i) => i !== index))}
          className="w-full sm:w-auto"
        >
          Remove
        </Button>
      </CardFooter>
    </Card>
  );
};

export default FileCard;
