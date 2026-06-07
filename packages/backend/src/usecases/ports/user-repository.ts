import type { User } from '../../domain/user.js';

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  byId(id: string): Promise<User | null>;
}
