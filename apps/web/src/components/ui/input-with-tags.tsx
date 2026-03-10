"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CloseIconButton } from "@/components/ui/close-icon-button";
import { cn } from "@/lib/utils";

interface TagProps {
  id: string;
  text: string;
  removable: boolean;
  onRemove: () => void;
}

const Tag = ({ id, text, removable, onRemove }: TagProps) => {
  const [isRemoving, setIsRemoving] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleRemove = () => {
    if (isRemoving) {
      return;
    }

    setIsRemoving(true);
    timeoutRef.current = window.setTimeout(() => {
      onRemove();
      timeoutRef.current = null;
    }, 220);
  };

  return (
    <motion.span
      layout
      data-tag-id={id}
      initial={{ opacity: 0, scale: 0.92, y: -8, filter: "blur(8px)" }}
      animate={
        isRemoving
          ? { opacity: 0, scale: 0.94, y: -4, filter: "blur(6px)" }
          : { opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }
      }
      exit={{ opacity: 0, scale: 0.94, y: -4, filter: "blur(6px)" }}
      transition={{
        duration: isRemoving ? 0.22 : 0.28,
        ease: "circInOut",
        type: "spring"
      }}
      className={cn(
        "group flex w-full min-w-0 max-w-full items-center gap-3 rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,24,0.92),rgba(12,12,12,0.88))] px-3 py-2 text-sm text-white shadow-[0_12px_30px_rgba(0,0,0,0.28)] backdrop-blur-md transition-colors",
        removable ? "hover:border-white/18" : "pr-3",
        isRemoving ? "pointer-events-none" : null
      )}
    >
      <span className="min-w-0 flex-1 truncate text-[0.95rem] font-medium text-white/92">{text}</span>
      {removable ? (
        <CloseIconButton
          className="h-7 w-7 shrink-0"
          label={`Remove ${text}`}
          onClick={handleRemove}
        />
      ) : null}
    </motion.span>
  );
};

interface InputWithTagsProps {
  placeholder?: string;
  className?: string;
  limit?: number;
  tags?: Array<string | { id: string; text: string }>;
  onTagAdd?: (tag: string) => boolean | void;
  onTagRemove?: (index: number, tag: string, id?: string) => void;
  canRemoveTag?: (index: number, tag: { id: string; text: string }) => boolean;
}

const InputWithTags = ({
  placeholder,
  className,
  limit = 10,
  tags: controlledTags,
  onTagAdd,
  onTagRemove,
  canRemoveTag
}: InputWithTagsProps) => {
  const [internalTags, setInternalTags] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const tags = (controlledTags ?? internalTags).map((tag, index) =>
    typeof tag === "string" ? { id: `tag-${index}-${tag}`, text: tag } : tag
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      if (!limit || tags.length < limit) {
        const nextTag = inputValue.trim();
        const shouldPersist = onTagAdd?.(nextTag);
        if (controlledTags === undefined && shouldPersist !== false) {
          setInternalTags([...internalTags, nextTag]);
        }
        setInputValue("");
      }
    }
  };

  const removeTag = (indexToRemove: number) => {
    const tag = tags[indexToRemove];
    onTagRemove?.(indexToRemove, tag.text, tag.id);
    if (controlledTags === undefined) {
      setInternalTags(internalTags.filter((_, index) => index !== indexToRemove));
    }
  };

  return (
    <div className={cn("flex w-full min-w-0 max-w-full flex-col gap-2 overflow-hidden", className)}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
      >
        <motion.input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Type something and press Enter..."}
          whileHover={{ scale: 1.01, backgroundColor: "#111111d1" }}
          whileTap={{ scale: 0.99, backgroundColor: "#11111198" }}
          className="w-full rounded-xl border-none bg-[#11111198] px-4 py-2 text-white shadow-[0_0_20px_rgba(0,0,0,0.2)] outline-none ring-0 backdrop-blur-sm disabled:cursor-not-allowed disabled:opacity-50"
          disabled={typeof limit === "number" ? tags.length >= limit : false}
        />
      </motion.div>
      <div className="flex min-w-0 max-w-full flex-col gap-2 overflow-hidden">
        <AnimatePresence>
          {tags.map((tag, index) => {
            const removable = canRemoveTag?.(index, tag) ?? true;
            return (
              <Tag
                key={tag.id}
                id={tag.id}
                text={tag.text}
                removable={removable}
                onRemove={() => removeTag(index)}
              />
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

export { InputWithTags };
