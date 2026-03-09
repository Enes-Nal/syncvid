import { generateAvatarUrl } from "@syncweb/shared";

export interface ProfileAvatarOption {
  seed: string;
  label: string;
  accent: string;
}

export const PROFILE_AVATAR_OPTIONS: ProfileAvatarOption[] = [
  { seed: "NovaRogue79", label: "Nova Rogue", accent: "255, 99, 132" },
  { seed: "PixelVoyager24", label: "Pixel Voyager", accent: "95, 223, 255" },
  { seed: "ChromeMaverick88", label: "Chrome Maverick", accent: "255, 196, 87" },
  { seed: "VelvetCircuit52", label: "Velvet Circuit", accent: "173, 127, 255" },
  { seed: "SolarFalcon16", label: "Solar Falcon", accent: "255, 142, 61" },
  { seed: "GhostDrifter67", label: "Ghost Drifter", accent: "132, 227, 190" },
  { seed: "EchoBlaze43", label: "Echo Blaze", accent: "255, 87, 153" },
  { seed: "MidnightGlider31", label: "Midnight Glider", accent: "148, 163, 184" }
];

export const DEFAULT_PROFILE_AVATAR_SEED = PROFILE_AVATAR_OPTIONS[0].seed;

export function getProfileAvatarOption(seed: string) {
  return PROFILE_AVATAR_OPTIONS.find((avatar) => avatar.seed === seed) ?? PROFILE_AVATAR_OPTIONS[0];
}

export function getProfileAvatarUrl(seed: string) {
  return generateAvatarUrl(getProfileAvatarOption(seed).seed);
}
