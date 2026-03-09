"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { cn } from "@/lib/utils";

interface TagProps {
  id: string;
  text: string;
  onRemove: () => void;
}

const Tag = ({ id, text, onRemove }: TagProps) => {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8, y: -10, filter: "blur(10px)" }}
      animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, scale: 0.8, y: -10, filter: "blur(10px)" }}
      transition={{
        duration: 0.4,
        ease: "circInOut",
        type: "spring"
      }}
      className="flex items-center gap-1 rounded-xl bg-[#11111198] px-2 py-1 text-sm text-white shadow-[0_0_10px_rgba(0,0,0,0.2)] backdrop-blur-sm"
    >
      {text}
      <button
        type="button"
        onClick={onRemove}
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center self-center rounded-full border-0 bg-transparent p-0 text-white/65 transition-colors hover:bg-white/10 hover:text-white focus:outline-none"
        style={{ border: "0", boxShadow: "none" }}
        aria-label={`Remove ${text}`}
        data-tag-id={id}
      >
        <span aria-hidden="true" className="text-sm leading-none">
          &times;
        </span>
      </button>
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
}

const InputWithTags = ({
  placeholder,
  className,
  limit = 10,
  tags: controlledTags,
  onTagAdd,
  onTagRemove
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
    <div className={cn("flex w-full max-w-xl flex-col gap-2", className)}>
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
      <div className="flex flex-wrap gap-2">
        <AnimatePresence>
          {tags.map((tag, index) => (
            <Tag key={tag.id} id={tag.id} text={tag.text} onRemove={() => removeTag(index)} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export { InputWithTags };
