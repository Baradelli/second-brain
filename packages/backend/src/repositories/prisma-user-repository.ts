import type { PrismaClient,User as PrismaUser } from '@prisma/client';

import type { User } from '../domain/user.js';
import type { UserRepository } from '../usecases/ports/user-repository.js';

function toDomain(record: PrismaUser): User {
  return {
    id: record.id,
    email: record.email,
    name: record.name ?? null,
    passwordHash: record.passwordHash ?? null,
    createdAt: record.createdAt,
  };
}

export class PrismaUserRepository implements UserRepository {
  constructor(private prisma: PrismaClient) {}

  async findByEmail(email: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { email } });
    return record ? toDomain(record) : null;
  }

  async byId(id: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { id } });
    return record ? toDomain(record) : null;
  }
}
