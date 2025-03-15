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
import { Download, Loader2, OctagonAlert } from "lucide-react";

type Props = {
  index: number;
  file: ExtendedFile;
  files: ExtendedFile[];
  setFiles: (files: ExtendedFile[]) => void;
  onTypeChange: (index: number, value: string) => void;
  downloadFile: (file: ExtendedFile) => void;
};

const FileCard = ({
  index,
  file,
  files,
  setFiles,
  onTypeChange,
  downloadFile,
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
      className="flex flex-row items-center w-full justify-between"
    >
      <CardHeader className="w-2/5 truncate">
        {/* {renderPreview()} */}
        {file.name}({getBytesToSize(file.size)})
      </CardHeader>
      <CardContent className="flex justify-start items-center w-2/5 gap-4">
        <CardAction>
          {file.isConverting ? (
            <Badge variant="default">
              <Loader2 className="animate-spin" />
              Converting
            </Badge>
          ) : file.isConverted ? (
            <Button onClick={() => downloadFile(file)}>
              <Download /> Download
            </Button>
          ) : file.isErrored ? (
            <Badge variant="destructive">
              <OctagonAlert />
              Error in Converting File
            </Badge>
          ) : (
            <Select
              value={file.to}
              onValueChange={(value) => onTypeChange(index, value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Convert To" />
              </SelectTrigger>
              <SelectContent className="h-fit">
                {file.type.includes("image") && (
                  <div className="grid grid-cols-2 gap-2 w-fit">
                    {extensions.image.map((elt, i) => (
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
                      <div className="grid grid-cols-3 gap-2 w-fit">
                        {extensions.video.map((elt, i) => (
                          <div key={i} className="col-span-1 text-center">
                            <SelectItem value={elt} className="mx-auto">
                              {elt}
                            </SelectItem>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                    <TabsContent value="audio">
                      <div className="grid grid-cols-3 gap-2 w-fit">
                        {extensions.audio.map((elt, i) => (
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
      <CardFooter>
        <Button
          variant="default"
          onClick={() => setFiles(files.filter((_, i) => i !== index))}
        >
          Remove
        </Button>
      </CardFooter>
    </Card>
  );
};

export default FileCard;
