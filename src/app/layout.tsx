import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MediaMorph - Convert Media Instantly",
  description:
    "MediaMorph lets you convert video, audio, and images instantly within your browser—fast, secure, and hassle-free.",
  keywords: [
    "MediaMorph",
    "Media Converter",
    "Online Converter",
    "Video Converter",
    "Audio Converter",
    "Image Converter",
    "File Conversion",
    "Next.js",
    "Web Converter",
    "Client-side Conversion",
    "Privacy-focused Converter",
  ],
  openGraph: {
    title: "MediaMorph - Online Media Converter",
    description:
      "Convert videos, images, and audio files instantly in your browser with MediaMorph.",
    type: "website",
    // url: "https://www.mediamorph.com", // Change this to your actual domain
    siteName: "MediaMorph",
    // images: [
    //   {
    //     url: "https://www.mediamorph.com/og-image.jpg", // Replace with an actual hosted image URL
    //     width: 1200,
    //     height: 630,
    //     alt: "MediaMorph - Convert Your Media Files Instantly",
    //   },
    // ],
    locale: "en_IN",
  },
};

const Viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-screen w-full`}
      >
        <Navbar />
        {children}
      </body>
    </html>
  );
}
