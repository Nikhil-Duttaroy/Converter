"use client"
import dynamic from 'next/dynamic'
import React, { ReactNode } from "react";

interface NoSSRWrapperProps {
  children: ReactNode;
}

const NoSSRWrapper: React.FC<NoSSRWrapperProps> = (props) => (
  <React.Fragment>{props.children}</React.Fragment>
);

export default dynamic(() => Promise.resolve(NoSSRWrapper), {
  ssr: false,
});