import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfileAvatarGlyph, ProfileSetup } from "@/components/profile-setup";
import { cn } from "@/lib/utils";

interface ProfileMenuProps {
  username: string;
  avatarSeed: string;
  onSave: (data: { username: string; avatarSeed: string }) => void;
}

export function ProfileMenu({ username, avatarSeed, onSave }: ProfileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && !containerRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="profile-menu" ref={containerRef}>
      <Button
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="profile-trigger"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
        variant="outline"
      >
        <span className="profile-trigger-avatar" aria-hidden="true">
          <ProfileAvatarGlyph avatarSeed={avatarSeed} />
        </span>
        <span className="profile-trigger-copy">
          <strong>{username}</strong>
          <span>Edit profile</span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")}
        />
      </Button>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="profile-dropdown"
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.16, ease: "easeOut" }}
          >
            <ProfileSetup
              className="max-w-none border-white/10 bg-[#111111]"
              initialAvatarSeed={avatarSeed}
              initialUsername={username}
              onComplete={(data) => {
                onSave(data);
                setIsOpen(false);
              }}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
