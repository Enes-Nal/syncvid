"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CloseIconButtonProps = {
  onClick?: () => void;
  className?: string;
  label?: string;
};

const sparkAngles = [0, 72, 144, 216, 288];

export function CloseIconButton({
  onClick,
  className,
  label = "Remove item"
}: CloseIconButtonProps) {
  const [isAnimating, setIsAnimating] = React.useState(false);
  const timeoutRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleClick = () => {
    if (isAnimating) {
      return;
    }

    setIsAnimating(true);
    onClick?.();
    timeoutRef.current = window.setTimeout(() => {
      setIsAnimating(false);
      timeoutRef.current = null;
    }, 420);
  };

  return (
    <div className="relative flex items-center justify-center">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleClick}
        aria-label={label}
        className={cn(
          "relative h-7 w-7 rounded-full border border-white/12 bg-black/30 text-white/80 ring-offset-0 hover:bg-black/45 hover:text-white focus-visible:ring-white/25",
          className
        )}
      >
        <motion.div
          className="relative flex items-center justify-center"
          initial={false}
          animate={isAnimating ? { scale: [1, 0.82, 1], rotate: [0, 10, -8, 0] } : { scale: 1, rotate: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          <X className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
        </motion.div>

        <AnimatePresence>
          {isAnimating ? (
            <motion.div
              key="ring"
              className="pointer-events-none absolute inset-0 rounded-full"
              initial={{ scale: 0.6, opacity: 0.24 }}
              animate={{ scale: 1.6, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              style={{
                background: "radial-gradient(circle, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 72%)"
              }}
            />
          ) : null}
        </AnimatePresence>
      </Button>

      <AnimatePresence>
        {isAnimating ? (
          <div className="pointer-events-none absolute inset-0">
            {sparkAngles.map((angle, index) => {
              const radians = (angle * Math.PI) / 180;
              const distance = 12;
              return (
                <motion.span
                  key={index}
                  className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-white/80"
                  initial={{ x: 0, y: 0, opacity: 0.8, scale: 0.6 }}
                  animate={{
                    x: Math.cos(radians) * distance,
                    y: Math.sin(radians) * distance,
                    opacity: 0,
                    scale: 0
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut", delay: index * 0.015 }}
                  style={{ transform: "translate(-50%, -50%)" }}
                />
              );
            })}
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
