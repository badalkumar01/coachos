import { z } from 'zod';
import { sessionStatusEnum } from '@/lib/db/schema';

export const sessionStatusValues = sessionStatusEnum.enumValues;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null));

/**
 * `scheduledAt` stays a wall-clock string through validation; the action
 * resolves it against the workspace timezone (see lib/time.ts), because the
 * schema has no access to workspace config.
 */
export const sessionFormSchema = z.object({
  clientId: z.string().uuid('Choose who this is for.'),
  title: optionalText(160),
  type: optionalText(60),
  status: z.enum(sessionStatusValues),
  scheduledAt: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/, 'Pick a date and time.'),
  durationMin: z.coerce
    .number()
    .int('Duration must be a whole number of minutes.')
    .min(5, 'Minimum 5 minutes.')
    .max(480, 'Maximum 8 hours.'),
  videoUrl: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null))
    .refine((value) => value === null || /^https?:\/\//.test(value), {
      message: 'Enter a full URL starting with http:// or https://',
    }),
  agenda: optionalText(4000),
  privateNotes: optionalText(20000),
  sharedNotes: optionalText(20000),
});

export type SessionFormValues = z.output<typeof sessionFormSchema>;

export function sessionFormData(formData: FormData) {
  return {
    clientId: formData.get('clientId'),
    title: formData.get('title'),
    type: formData.get('type'),
    status: formData.get('status'),
    scheduledAt: formData.get('scheduledAt'),
    durationMin: formData.get('durationMin'),
    videoUrl: formData.get('videoUrl'),
    agenda: formData.get('agenda'),
    privateNotes: formData.get('privateNotes'),
    sharedNotes: formData.get('sharedNotes'),
  };
}

/** Notes are saved on their own, separately from the scheduling fields. */
export const notesFormSchema = z.object({
  privateNotes: optionalText(20000),
  sharedNotes: optionalText(20000),
});

export const actionItemSchema = z.object({
  title: z.string().trim().min(1, 'Describe the action item.').max(300),
  dueAt: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null))
    .refine((value) => value === null || /^\d{4}-\d{2}-\d{2}$/.test(value), {
      message: 'Use a valid date.',
    }),
});

export const SESSION_STATUS_ORDER = ['scheduled', 'completed', 'no_show', 'cancelled'] as const;
