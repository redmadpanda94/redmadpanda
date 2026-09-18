import { z } from "zod";

export const gameSettingsSchema = z.object({
  defaultCountdownSeconds: z.number().int().min(0).max(600).nullable().default(null),
  soundEffectsEnabled: z.boolean().default(true),
  subtractOnIncorrect: z.boolean().default(true),
  mediaAutoplay: z.boolean().default(true),
});

export const gameCreateSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  description: z.string().trim().max(500).optional(),
  gameType: z.enum(["classic", "custom"]).default("classic"),
});

export const gameUpdateSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  settings: gameSettingsSchema.partial().optional(),
});

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(1, "Category name is required").max(80),
  description: z.string().trim().max(300).optional(),
});

export const categoryUpdateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(300).nullable().optional(),
  position: z.number().int().min(0).optional(),
});

export const mediaPlacementEnum = z.enum(["before_question", "after_question", "instead_of_question"]);
export const mediaTypeEnum = z.enum(["image", "gif", "youtube", "video", "audio"]);

export const questionCreateSchema = z.object({
  points: z.number().int().positive().max(1_000_000),
  questionText: z.string().trim().max(2000).default(""),
  answerText: z.string().trim().max(2000).default(""),
  notes: z.string().trim().max(2000).optional(),
  mediaPlacement: mediaPlacementEnum.default("after_question"),
  isFinal: z.boolean().default(false),
});

export const questionUpdateSchema = questionCreateSchema.partial().extend({
  status: z.enum(["available", "selected", "completed"]).optional(),
  position: z.number().int().min(0).optional(),
});

export const mediaCreateSchema = z.object({
  type: mediaTypeEnum,
  url: z.string().trim().url().optional(),
  storagePath: z.string().trim().optional(),
  originalStoragePath: z.string().trim().optional(),
  youtubeId: z.string().trim().max(20).optional(),
  youtubeStart: z.number().int().min(0).optional(),
  trimStart: z.number().min(0).optional(),
  trimEnd: z.number().min(0).optional(),
  duration: z.number().min(0).optional(),
});

export const sessionCreateSchema = z.object({
  gameId: z.string().uuid(),
  title: z.string().trim().min(1).max(120).optional(),
});

export const teamJoinSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Team name is required")
    .max(40, "Team name is too long"),
});

export const teamRenameSchema = z.object({
  name: z.string().trim().min(1).max(40),
});

export const buzzSchema = z.object({
  teamId: z.string().uuid(),
  token: z.string().min(10),
  clientLatencyMs: z.number().int().min(0).max(10_000).optional(),
});

export const selectTeamSchema = z.object({
  teamId: z.string().uuid().nullable(),
});

export const answerOutcomeSchema = z.object({
  teamId: z.string().uuid(),
  outcome: z.enum(["correct", "incorrect"]),
});

export const manualScoreSchema = z.object({
  teamId: z.string().uuid(),
  delta: z.number().int().refine((v) => v !== 0, "Amount must not be zero"),
  note: z.string().trim().max(200).optional(),
});

export const setScoreSchema = z.object({
  teamId: z.string().uuid(),
  score: z.number().int(),
});

export const finalWagerSchema = z.object({
  teamId: z.string().uuid(),
  token: z.string().min(10),
  amount: z.number().int().min(0),
});

export const finalOutcomeSchema = z.object({
  teamId: z.string().uuid(),
  correct: z.boolean(),
});

export const timerSchema = z.object({
  seconds: z.number().int().min(0).max(600).nullable(),
});

export const importCommitSchema = z.object({
  rows: z.array(
    z.object({
      category: z.string().min(1),
      points: z.number().int().positive(),
      question: z.string().min(1),
      answer: z.string().min(1),
      mediaUrl: z.string().optional(),
      mediaType: mediaTypeEnum.optional(),
      mediaPlacement: mediaPlacementEnum,
      notes: z.string().optional(),
    })
  ).min(1),
});
