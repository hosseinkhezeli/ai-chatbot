import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCurrentUser, getRequiredCurrentUser } from '@/lib/auth/current-user';
import { db } from '@/db/client';
import { users } from '@/db/schema';

// Mock the auth module
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

// Mock the database
vi.mock('@/db/client', () => ({
  db: {
    select: vi.fn(),
  },
}));

// Mock drizzle-orm
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col, val) => ({ col, val })),
}));

import { auth } from '@/lib/auth';
import { eq } from 'drizzle-orm';

describe('getCurrentUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when no session', async () => {
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({ user: null });

    const user = await getCurrentUser();
    expect(user).toBeNull();
  });

  it('returns null when session has no user id', async () => {
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({ user: {} });

    const user = await getCurrentUser();
    expect(user).toBeNull();
  });

  it('returns null when user not found in database', async () => {
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'user-123' } });
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    const user = await getCurrentUser();
    expect(user).toBeNull();
  });

  it('returns user data when found', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      image: 'https://example.com/avatar.png',
      emailVerified: new Date('2024-01-01'),
      createdAt: new Date('2024-01-01'),
    };

    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'user-123' } });
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockUser]),
        }),
      }),
    });

    const user = await getCurrentUser();
    expect(user).toEqual({
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      image: 'https://example.com/avatar.png',
      emailVerified: new Date('2024-01-01'),
      createdAt: new Date('2024-01-01'),
    });
  });

  it('calls db.select with correct parameters', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      image: null,
      emailVerified: null,
      createdAt: new Date('2024-01-01'),
    };

    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'user-123' } });
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockUser]),
        }),
      }),
    });

    await getCurrentUser();

    expect(db.select).toHaveBeenCalled();
    expect(eq).toHaveBeenCalledWith(users.id, 'user-123');
  });
});

describe('getRequiredCurrentUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws when getCurrentUser returns null', async () => {
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({ user: null });

    await expect(getRequiredCurrentUser()).rejects.toThrow('UNAUTHENTICATED');
  });

  it('returns user when authenticated', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      image: null,
      emailVerified: null,
      createdAt: new Date('2024-01-01'),
    };

    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'user-123' } });
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockUser]),
        }),
      }),
    });

    const user = await getRequiredCurrentUser();
    expect(user).toEqual({
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      image: null,
      emailVerified: null,
      createdAt: new Date('2024-01-01'),
    });
  });
});