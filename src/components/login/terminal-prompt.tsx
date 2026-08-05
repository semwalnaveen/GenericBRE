"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "./use-reduced-motion";

const LINES = [
  "> Initializing BRE engine...",
  "> Loading JSON mappings...",
  "> Compiling decision matrix...",
  "> Optimizing rule paths...",
  "> Awaiting evaluation request..."
];

export function TerminalPrompt() {
  const reduceMotion = useReducedMotion();
  const [lineIndex, setLineIndex] = useState(0);
  const [text, setText] = useState("");
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    if (reduceMotion) {
      setLineIndex(LINES.length - 1);
      setText(LINES[LINES.length - 1]);
      setIsTyping(false);
      return;
    }

    let currentText = "";
    let i = 0;
    const targetLine = LINES[lineIndex];
    let isCancelled = false;

    const typeChar = () => {
      if (isCancelled) return;
      if (i < targetLine.length) {
        currentText += targetLine.charAt(i);
        setText(currentText);
        i++;
        setTimeout(typeChar, 30 + Math.random() * 40);
      } else {
        setIsTyping(false);
        setTimeout(() => {
          if (isCancelled) return;
          setText("");
          setLineIndex((prev) => (prev + 1) % LINES.length);
          setIsTyping(true);
        }, 2000);
      }
    };

    typeChar();

    return () => {
      isCancelled = true;
    };
  }, [lineIndex, reduceMotion]);

  return (
    <div className="mt-3 rounded-lg border border-sidebar-border/50 bg-[#081121] p-3 font-mono text-[11px] text-emerald-400 shadow-inner">
      <div className="flex h-4 items-center">
        <span>
          {text}
          <span
            className={`ml-1 inline-block h-3 w-1.5 align-middle bg-emerald-400 ${
              !isTyping ? "animate-pulse" : ""
            }`}
          />
        </span>
      </div>
    </div>
  );
}
