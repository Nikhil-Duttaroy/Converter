import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export function getBytesToSize(bytes: number) {
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
  if (bytes === 0) return "0 Byte"
  const i = parseInt(String(Math.floor(Math.log(bytes) / Math.log(1024))))
  return Math.round(bytes / Math.pow(1024, i)) + " " + sizes[i]
}