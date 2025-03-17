import Dropzone from "@/components/dropzone";
import NoSSRWrapper from "./NoSSRWrapper";

export default function Home() {
  return (
    <NoSSRWrapper>
      <main className="w-full h-full flex flex-col items-center pt-[10vh] gap-8 px-4 md:px-0 pb-4">
        <div className="flex flex-col items-center space-y-4 mt-12 text-center">
          <h1 className="text-3xl font-bold">
            Transform Your Media Files Instantly.{" "}
          </h1>
          <p className="text-center text-base">
            Experience seamless media conversion directly on your device,
            ensuring your media never leaves your device.
          </p>
        </div>
        <Dropzone />
      </main>
    </NoSSRWrapper>
  );
}
