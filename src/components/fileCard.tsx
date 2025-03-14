import React from "react";
import { Button } from "./ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
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

type Props = {
  index: number;
  file: File;
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
};

const FileCard = ({ index, file, files, setFiles }: Props) => {
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
        <CardDescription>Convert To</CardDescription>
        <CardAction>
          <Select>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Audio</SelectItem>
              <SelectItem value="dark">Video</SelectItem>
              <SelectItem value="system">Image</SelectItem>
            </SelectContent>
          </Select>
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
