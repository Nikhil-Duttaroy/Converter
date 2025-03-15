"use client";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL, fetchFile } from "@ffmpeg/util";
import { ExtendedFile } from "./types";

export async function loadFfmpeg(): Promise<FFmpeg> {
  const ffmpeg = new FFmpeg();
  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
  });
  return ffmpeg;
}

function getFileExtension(file_name: string) {
  const regex = /(?:\.([^.]+))?$/;
  const match = regex.exec(file_name);
  if (match && match[1]) {
    return match[1];
  }
  return ""; 
}

function removeFileExtension(file_name: string) {
  const lastDotIndex = file_name.lastIndexOf(".");
  if (lastDotIndex !== -1) {
    return file_name.slice(0, lastDotIndex);
  }
  return file_name;
}

export async function convertFile(
  ffmpeg: FFmpeg,
  file: ExtendedFile
): Promise<{ url: string; output: string }> {
  const { fileData, to, name, type } = file as ExtendedFile;
  const input = getFileExtension(name);
  const output = removeFileExtension(name) + "." + to;

  ffmpeg.writeFile(input, await fetchFile(fileData));

  // FFMEG COMMANDS
  let ffmpeg_cmd: string[] = [];
  // 3gp video
  if (to === "3gp")
    ffmpeg_cmd = [
      "-i",
      input,
      "-r",
      "20",
      "-s",
      "352x288",
      "-vb",
      "400k",
      "-acodec",
      "aac",
      "-strict",
      "experimental",
      "-ac",
      "1",
      "-ar",
      "8000",
      "-ab",
      "24k",
      output,
    ];
  else ffmpeg_cmd = ["-i", input, output];

  // execute cmd
  await ffmpeg.exec(ffmpeg_cmd);
  const data = (await ffmpeg.readFile(output)) as Uint8Array;
  const blob = new Blob([data], { type: type.split("/")[0] });
  const url = URL.createObjectURL(blob);
  return { url, output };
}
