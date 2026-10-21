import { z } from 'zod';
import { clientStatusEnum } from '@/lib/db/schema';

/** Input boundary for every client mutation (spec rule 4). */

export const clientStatusValues = clientStatusEnum.enumValues;

/** Tags arrive from a text input as "vip, q4, referral". */
const tagsField = z
  .string()
  .optional()
  .transform((value) =>
    (value ?? '')
      .split(',')
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean)
      .filter((tag, index, all) => all.indexOf(tag) === index)
      .slice(0, 12),
  );

/** Empty strings from unfilled inputs become null, not "". */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null));

export const clientFormSchema = z.object({
  fullName: z.string().trim().min(1, 'A name is required.').max(120),
  email: z
    .string()
    .trim()
    .max(254)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null))
    .refine((value) => value === null || z.string().email().safeParse(value).success, {
      message: 'Enter a valid email address.',
    }),
  phone: optionalText(40),
  timezone: optionalText(64),
  status: z.enum(clientStatusValues),
  tags: tagsField,
  notesSummary: optionalText(2000),
});

export type ClientFormInput = z.input<typeof clientFormSchema>;
export type ClientFormValues = z.output<typeof clientFormSchema>;

/** Reads a submitted form into the shape the schema expects. */
export function clientFormData(formData: FormData) {
  return {
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    timezone: formData.get('timezone'),
    status: formData.get('status'),
    tags: formData.get('tags'),
    notesSummary: formData.get('notesSummary'),
  };
}

export const STATUS_LABELS: Record<(typeof clientStatusValues)[number], string> = {
  lead: 'Lead',
  active: 'Active',
  paused: 'Paused',
  completed: 'Completed',
  churned: 'Churned',
};

/** Lifecycle order, for the status picker and filter chips. */
export const STATUS_ORDER = ['lead', 'active', 'paused', 'completed', 'churned'] as const;
