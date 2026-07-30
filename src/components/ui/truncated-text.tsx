"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface TruncatedTextProps extends React.HTMLAttributes<HTMLElement> {
  text: string;
  className?: string;
  as?: React.ElementType;
}

export function TruncatedText({ text, className, as: Component = "span", children, ...props }: TruncatedTextProps) {
  const content = text || (typeof children === "string" ? children : undefined);
  return (
    <Component
      title={content}
      className={cn("truncate block", className)}
      {...props}
    >
      {children ?? text}
    </Component>
  );
}
