import type { PasswordHasher } from '../ports/password-hasher.js';

/** Fake determinístico: o "hash" é só o texto prefixado. Sem bcrypt nos testes (rápido). */
export class PasswordHasherFake implements PasswordHasher {
  async hash(plain: string): Promise<string> {
    return `hashed:${plain}`;
  }

  async compare(plain: string, hash: string): Promise<boolean> {
    return hash === `hashed:${plain}`;
  }
}
