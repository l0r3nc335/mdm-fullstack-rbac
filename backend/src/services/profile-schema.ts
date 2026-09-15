import { z } from 'zod';

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => (value === '' ? null : value));

const optionalDate = z
  .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal(''), z.null()])
  .optional()
  .transform((value) => {
    if (!value) return null;
    return new Date(`${value}T00:00:00.000Z`);
  });

export const profileUpdateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  phone: optionalText(40),
  dateOfBirth: optionalDate,
  gender: z
    .enum(['female', 'male', 'non_binary', 'prefer_not_to_say', ''])
    .optional()
    .nullable()
    .transform((value) => (value === '' || value == null ? null : value)),
  bio: optionalText(2000),
  street: optionalText(200),
  city: optionalText(100),
  state: optionalText(100),
  postalCode: optionalText(30),
  country: optionalText(100),
  jobTitle: optionalText(120),
  department: optionalText(120),
  employeeNumber: optionalText(60),
  employmentType: z
    .enum(['full_time', 'part_time', 'contract', 'intern', ''])
    .optional()
    .nullable()
    .transform((value) => (value === '' || value == null ? null : value)),
  startDate: optionalDate,
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

export function serializeContentItem<T extends {
  dateOfBirth: Date | null;
  startDate: Date | null;
  avatarKey: string | null;
  id: number;
}>(item: T, orgUuid: string) {
  const { avatarKey, dateOfBirth, startDate, ...rest } = item;
  return {
    ...rest,
    dateOfBirth: dateOfBirth ? dateOfBirth.toISOString().slice(0, 10) : null,
    startDate: startDate ? startDate.toISOString().slice(0, 10) : null,
    hasAvatar: Boolean(avatarKey),
    avatarUrl: avatarKey
      ? `/api/organizations/${orgUuid}/content/${item.id}/avatar`
      : null,
  };
}
