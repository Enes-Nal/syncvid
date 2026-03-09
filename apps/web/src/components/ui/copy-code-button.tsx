"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

interface CopyCodeProps {
  code?: string;
  copyValue?: string;
  label?: string;
  buttonLabel?: string;
  copiedLabel?: string;
  className?: string;
}

export function CopyCode({
  code = "21DEV-LEO",
  copyValue,
  label = "Share this link",
  buttonLabel = "Copy link",
  copiedLabel = "Link copied!",
  className
}: CopyCodeProps) {
  const [copied, setCopied] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [progress, setProgress] = useState(0);
  const duration = 4000;
  const valueToCopy = copyValue ?? code;

  useEffect(() => {
    if (!copied) {
      return;
    }

    const showTimer = window.setTimeout(() => {
      setShowConfirmation(true);
    }, 400);

    setProgress(0);
    const startTime = Date.now();

    const interval = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const nextProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(nextProgress);

      if (elapsed >= duration) {
        window.clearInterval(interval);
        setShowConfirmation(false);
        window.setTimeout(() => {
          setCopied(false);
          setProgress(0);
        }, 400);
      }
    }, 16);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(showTimer);
    };
  }, [copied]);

  async function handleCopy() {
    if (!valueToCopy) {
      return;
    }

    try {
      await navigator.clipboard.writeText(valueToCopy);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = valueToCopy;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "-9999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }

    setCopied(true);
  }

  return (
    <div className={cn("w-full", className)}>
      {label ? <div className="mb-3 text-[0.72rem] font-medium uppercase tracking-[0.22em] text-zinc-500">{label}</div> : null}
      <div className="relative overflow-hidden rounded-[9999px] bg-gray-100 px-6 py-2 dark:bg-[#1f1f1e]">
      <div
        aria-hidden="true"
        className="absolute top-0 bottom-0 left-0 bg-gray-200 dark:bg-[#2a2a29]"
        style={{
          width: `${progress}%`,
          opacity: copied ? 1 : 0,
          transition: "opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1)"
        }}
      />

      <div
        className="absolute inset-0 flex items-center justify-between pl-6 pr-1"
        style={{
          opacity: copied ? 0 : 1,
          filter: copied ? "blur(12px)" : "blur(0px)",
          transform: copied ? "scale(0.92)" : "scale(1)",
          transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
          pointerEvents: copied ? "none" : "auto",
          zIndex: copied ? 0 : 20
        }}
      >
        <span className="max-w-40 select-all truncate text-xl font-medium tracking-wide text-gray-500 dark:text-[#6b6b6a]">
          {code}
        </span>
        <button
          className="mr-[-0.125rem] cursor-pointer select-none rounded-[9999px] bg-white px-5 py-2 text-base font-medium text-gray-700 shadow-sm transition-all duration-300 hover:bg-gray-50 hover:shadow-md active:scale-95 dark:bg-[#2a2a29] dark:text-[#e5e5e4] dark:shadow-black/30 dark:hover:bg-[#353534] dark:hover:shadow-black/50"
          onClick={() => {
            void handleCopy();
          }}
          style={{ borderRadius: "9999px" }}
          type="button"
        >
          {buttonLabel}
        </button>
      </div>

      <div
        className="relative flex h-9 items-center justify-center gap-3"
        style={{
          opacity: showConfirmation ? 1 : 0,
          filter: showConfirmation ? "blur(0px)" : "blur(12px)",
          transform: showConfirmation ? "scale(1)" : "scale(1.08)",
          transition: "all 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
          pointerEvents: "none",
          zIndex: 10
        }}
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-[9999px] bg-gray-800 dark:bg-[#e5e5e4]">
          <Check className="h-4 w-4 text-white dark:text-[#141413]" strokeWidth={3} />
        </div>
        <span className="text-xl font-semibold text-gray-800 dark:text-[#e5e5e4]">{copiedLabel}</span>
      </div>
    </div>
    </div>
  );
}
