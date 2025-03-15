import React from "react";

interface LoaderProps {
  size: "sm" | "md" | "lg";
}

const Loader: React.FC<LoaderProps> = ({ size }) => {
  const sizeClass =
    size === "sm" ? "size-6" : size === "md" ? "size-12" : "size-14";

  return (
    <div className="flex items-center justify-center h-full">
      <div
        className={`loader ease-linear rounded-full border-4 border-t-4 border-gray-200 ${sizeClass}`}
      ></div>
    </div>
  );
};

export default Loader;