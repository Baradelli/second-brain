import type { User } from '../../domain/user.js';
import type { UserRepository } from '../ports/user-repository.js';

export class UserRepositoryFake implements UserRepository {
  private store = new Map<string, User>();

  async save(user: User): Promise<User> {
    this.store.set(user.id, { ...user });
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    const found = Array.from(this.store.values()).find(
      (u) => u.email === email,
    );
    return found ? { ...found } : null;
  }

  async byId(id: string): Promise<User | null> {
    const found = this.store.get(id);
    return found ? { ...found } : null;
  }
}
