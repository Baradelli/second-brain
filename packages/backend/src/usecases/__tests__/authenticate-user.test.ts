import { beforeEach, describe, expect, it } from 'vitest';

import { InvalidCredentialsError } from '../../domain/errors.js';
import { PasswordHasherFake } from '../_fakes/password-hasher-fake.js';
import { UserRepositoryFake } from '../_fakes/user-repository-fake.js';
import { AuthenticateUser } from '../authenticate-user.js';

describe('AuthenticateUser', () => {
  let users: UserRepositoryFake;
  let hasher: PasswordHasherFake;
  let useCase: AuthenticateUser;

  beforeEach(async () => {
    users = new UserRepositoryFake();
    hasher = new PasswordHasherFake();
    useCase = new AuthenticateUser(users, hasher);
    await users.save({
      id: 'owner',
      email: 'owner@cerebro.local',
      name: 'Owner',
      passwordHash: await hasher.hash('s3nha'),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });
  });

  it('returns the userId for valid credentials', async () => {
    const r = await useCase.execute({
      email: 'owner@cerebro.local',
      password: 's3nha',
    });
    expect(r.userId).toBe('owner');
  });

  it('normalizes email (trim + lowercase)', async () => {
    const r = await useCase.execute({
      email: '  Owner@Cerebro.Local  ',
      password: 's3nha',
    });
    expect(r.userId).toBe('owner');
  });

  it('rejects a wrong password', async () => {
    await expect(
      useCase.execute({ email: 'owner@cerebro.local', password: 'errada' }),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it('rejects an unknown email (same error, no leak)', async () => {
    await expect(
      useCase.execute({ email: 'ghost@cerebro.local', password: 's3nha' }),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it('rejects a user without a password set', async () => {
    await users.save({
      id: 'nopass',
      email: 'nopass@cerebro.local',
      name: null,
      passwordHash: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    await expect(
      useCase.execute({ email: 'nopass@cerebro.local', password: 'x' }),
    ).rejects.toThrow(InvalidCredentialsError);
  });
});
