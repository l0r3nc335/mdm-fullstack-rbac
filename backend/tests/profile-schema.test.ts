import { describe, expect, it } from 'vitest';
import { profileUpdateSchema, serializeContentItem } from '../src/services/profile-schema.js';

describe('profileUpdateSchema', () => {
  it('accepts a valid partial profile update', () => {
    const parsed = profileUpdateSchema.parse({
      title: 'Profile',
      phone: '555-0100',
      gender: 'female',
      employmentType: 'full_time',
      dateOfBirth: '1990-05-01',
      bio: '',
    });

    expect(parsed.title).toBe('Profile');
    expect(parsed.phone).toBe('555-0100');
    expect(parsed.gender).toBe('female');
    expect(parsed.employmentType).toBe('full_time');
    expect(parsed.dateOfBirth).toEqual(new Date('1990-05-01T00:00:00.000Z'));
    expect(parsed.bio).toBeNull();
  });

  it('rejects an invalid employment type', () => {
    expect(() =>
      profileUpdateSchema.parse({
        employmentType: 'freelancer',
      }),
    ).toThrow();
  });
});

describe('serializeContentItem', () => {
  it('formats dates and avatar URLs', () => {
    const serialized = serializeContentItem(
      {
        id: 7,
        avatarKey: 'avatars/7.png',
        dateOfBirth: new Date('1991-02-03T00:00:00.000Z'),
        startDate: null,
        title: 'Profile',
      },
      'org-uuid-1',
    );

    expect(serialized.dateOfBirth).toBe('1991-02-03');
    expect(serialized.startDate).toBeNull();
    expect(serialized.hasAvatar).toBe(true);
    expect(serialized.avatarUrl).toBe('/api/organizations/org-uuid-1/content/7/avatar');
    expect(serialized).not.toHaveProperty('avatarKey');
  });
});
