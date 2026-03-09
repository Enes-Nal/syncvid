import { getUsernameValidationError } from "@syncweb/shared";
import { z } from "zod";

const roomIdSchema = z.string().trim().min(3).max(64).regex(/^[a-zA-Z0-9_-]+$/);
const usernameSchema = z
  .string()
  .trim()
  .min(3)
  .max(20)
  .superRefine((value, ctx) => {
    const error = getUsernameValidationError(value);
    if (error) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: error });
    }
  });

export const joinRoomSchema = z.object({
  roomId: roomIdSchema,
  username: usernameSchema,
  avatarSeed: z.string().trim().min(1).max(128)
});

export const playbackSchema = z.object({
  roomId: roomIdSchema,
  issuedAt: z.number().int().positive()
});

export const playSchema = playbackSchema.extend({
  positionSeconds: z.number().min(0),
  playbackRate: z.number().min(0.25).max(4).optional()
});

export const pauseSchema = playbackSchema.extend({
  positionSeconds: z.number().min(0)
});

export const seekSchema = playbackSchema.extend({
  positionSeconds: z.number().min(0)
});

export const driftSchema = z.object({
  roomId: roomIdSchema,
  positionSeconds: z.number().min(0),
  reportedAt: z.number().int().positive()
});

export const playlistAddSchema = z.object({
  roomId: roomIdSchema,
  url: z.string().url().max(2000)
});

export const playlistRemoveSchema = z.object({
  roomId: roomIdSchema,
  playlistItemId: z.string().min(1)
});

export const chatSchema = z.object({
  roomId: roomIdSchema,
  message: z.string().trim().min(1).max(500)
});

export const kickSchema = z.object({
  roomId: roomIdSchema,
  userId: z.string().min(1)
});
