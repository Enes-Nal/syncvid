import React from "react";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

interface InteractiveHoverButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  text?: string;
}

const InteractiveHoverButton = React.forwardRef<HTMLButtonElement, InteractiveHoverButtonProps>(
  ({ text = "Button", className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "group relative inline-flex h-10 w-32 items-center justify-center overflow-hidden !rounded-full border border-border bg-background px-2 text-center font-semibold leading-none text-foreground",
          className
        )}
        {...props}
      >
        <div className="absolute inset-0 !rounded-full bg-background" />
        <div className="absolute inset-0 z-0 !rounded-full bg-primary transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] -translate-x-full group-hover:translate-x-0" />
        <span className="relative z-10 inline-flex items-center justify-center text-center text-foreground transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-x-3 group-hover:opacity-0">
          {text}
        </span>
        <div className="absolute inset-0 z-20 flex translate-x-3 items-center justify-center gap-2 text-primary-foreground opacity-0 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0 group-hover:opacity-100">
          <span>{text}</span>
          <ArrowRight />
        </div>
      </button>
    );
  }
);

InteractiveHoverButton.displayName = "InteractiveHoverButton";

export { InteractiveHoverButton };
