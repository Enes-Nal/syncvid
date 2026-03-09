import { getUsernameValidationError, normalizeUsername } from "@syncweb/shared";
import type { Variants } from "framer-motion";
import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ChevronRight, User2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DEFAULT_PROFILE_AVATAR_SEED, getProfileAvatarOption, getProfileAvatarUrl, PROFILE_AVATAR_OPTIONS } from "@/lib/profile-avatars";
import { cn } from "@/lib/utils";

interface ProfileSetupProps {
  initialUsername?: string;
  initialAvatarSeed?: string;
  onComplete?: (data: { username: string; avatarSeed: string }) => void;
  className?: string;
}

const containerVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 }
  }
};

const thumbnailVariants: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: "easeOut" }
  }
};

export function ProfileAvatarGlyph({ avatarSeed, className }: { avatarSeed: string; className?: string }) {
  const avatar = getProfileAvatarOption(avatarSeed);

  return <img alt={avatar.label} className={cn("h-full w-full object-cover", className)} src={getProfileAvatarUrl(avatar.seed)} />;
}

export function ProfileSetup({
  initialUsername = "",
  initialAvatarSeed = DEFAULT_PROFILE_AVATAR_SEED,
  onComplete,
  className
}: ProfileSetupProps) {
  const [selectedAvatar, setSelectedAvatar] = useState(() => getProfileAvatarOption(initialAvatarSeed));
  const [username, setUsername] = useState(initialUsername);
  const [isFocused, setIsFocused] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const normalizedUsername = useMemo(() => normalizeUsername(username), [username]);

  const handleAvatarSelect = (avatarSeed: string) => {
    const avatar = getProfileAvatarOption(avatarSeed);
    if (avatar.seed !== selectedAvatar.seed) {
      setSelectedAvatar(avatar);
    }
  };

  const handleSubmit = () => {
    if (!validationError && normalizedUsername && onComplete) {
      onComplete({
        username: normalizedUsername,
        avatarSeed: selectedAvatar.seed
      });
    }
  };

  const validationError = useMemo(() => getUsernameValidationError(username), [username]);
  const isValid = validationError === null;
  const showError = normalizedUsername.length > 0 && validationError !== null;
  const rgb = selectedAvatar.accent;

  return (
    <Card className={cn("relative mx-auto w-full max-w-[400px] border-border bg-card", className)}>
      <CardContent className="p-8">
        <div className="space-y-8">
          <div className="space-y-1 text-center">
            <h2 className="text-xl font-semibold tracking-tight">Pick Your Avatar</h2>
            <p className="text-sm text-muted-foreground">Choose one to get started</p>
          </div>

          <div className="flex flex-col items-center gap-4">
            <div className="relative h-40 w-40">
              <motion.div
                animate={{
                  boxShadow: `0 0 0 2px rgba(${rgb}, 0.55), 0 6px 24px rgba(${rgb}, 0.18)`
                }}
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-full"
                transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.45, ease: "easeOut" }}
              />

              <div className="relative h-full w-full overflow-hidden rounded-full">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedAvatar.seed}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 flex items-center justify-center"
                    exit={{ opacity: 0 }}
                    initial={{ opacity: 0 }}
                    transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.2, ease: "easeOut" }}
                  >
                    <img
                      alt={selectedAvatar.label}
                      className="h-full w-full rounded-full object-cover"
                      src={getProfileAvatarUrl(selectedAvatar.seed)}
                    />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.span
                key={selectedAvatar.seed}
                animate={{ opacity: 1 }}
                className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.16, ease: "easeOut" }}
              >
                {selectedAvatar.label}
              </motion.span>
            </AnimatePresence>

            <motion.div
              animate="animate"
              className="grid grid-cols-4 gap-3"
              initial="initial"
              variants={containerVariants}
            >
              {PROFILE_AVATAR_OPTIONS.map((avatar) => {
                const isSelected = selectedAvatar.seed === avatar.seed;

                return (
                  <motion.button
                    key={avatar.seed}
                    aria-label={`Select ${avatar.label}`}
                    aria-pressed={isSelected}
                    className={cn(
                      "relative h-14 w-14 overflow-hidden rounded-xl border bg-muted transition-[opacity,box-shadow] duration-200 ease-out",
                      isSelected
                        ? "border-foreground/20 opacity-100 ring-2 ring-foreground/70 ring-offset-2 ring-offset-background"
                        : "border-border opacity-50 hover:opacity-100"
                    )}
                    onClick={() => handleAvatarSelect(avatar.seed)}
                    type="button"
                    variants={thumbnailVariants}
                    whileHover={shouldReduceMotion ? undefined : { scale: 1.06 }}
                    whileTap={shouldReduceMotion ? undefined : { scale: 0.94 }}
                  >
                    <img alt={avatar.label} className="absolute inset-0 h-full w-full object-cover" src={getProfileAvatarUrl(avatar.seed)} />
                    {isSelected ? (
                      <div className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-foreground">
                        <Check aria-hidden="true" className="h-3 w-3 text-background" />
                      </div>
                    ) : null}
                  </motion.button>
                );
              })}
            </motion.div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium" htmlFor="username">
                  Username
                </label>
                <span
                  className={cn(
                    "text-xs tabular-nums transition-colors duration-200 ease-out",
                    username.length >= 18 ? "text-amber-500" : "text-muted-foreground/50"
                  )}
                >
                  {username.length}/20
                </span>
              </div>

              <div className="relative">
                <Input
                  autoComplete="username"
                  className={cn(
                    "h-11 appearance-none text-sm",
                    showError && "border-destructive/50 focus-visible:ring-destructive"
                  )}
                  id="username"
                  maxLength={20}
                  name="username"
                  onBlur={() => setIsFocused(false)}
                  onChange={(event) => setUsername(event.target.value)}
                  onFocus={() => setIsFocused(true)}
                  placeholder="your_username..."
                  spellCheck={false}
                  style={{ paddingLeft: "3rem" }}
                  type="text"
                  value={username}
                />
                <User2
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors duration-200 ease-out",
                    isFocused ? "text-foreground" : "text-muted-foreground"
                  )}
                />
              </div>

              <AnimatePresence>
                {showError ? (
                  <motion.p
                    animate={{ opacity: 1, y: 0 }}
                    className="ml-0.5 text-xs text-destructive"
                    exit={{ opacity: 0, y: -4 }}
                    initial={{ opacity: 0, y: -4 }}
                    role="alert"
                    transition={{ duration: 0.15, ease: "easeOut" }}
                  >
                    {validationError}
                  </motion.p>
                ) : null}
              </AnimatePresence>
            </div>

            <Button className="group h-10 w-full text-sm" disabled={!isValid} onClick={handleSubmit} type="button">
              Save
              <ChevronRight
                aria-hidden="true"
                className="ml-1 h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5"
              />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
