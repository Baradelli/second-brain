import { InvalidCredentialsError } from '../domain/errors.js';
import type { PasswordHasher } from './ports/password-hasher.js';
import type { UserRepository } from './ports/user-repository.js';

export interface AuthenticateUserInput {
  email: string;
  password: string;
}

export interface AuthenticatedUser {
  userId: string;
}

/**
 * Valida email+senha. Erro único (não revela se o email existe). A emissão do JWT é da borda
 * (rota), não do usecase — o domínio não conhece JWT.
 */
export class AuthenticateUser {
  constructor(
    private users: UserRepository,
    private hasher: PasswordHasher,
  ) {}

  async execute(input: AuthenticateUserInput): Promise<AuthenticatedUser> {
    const email = input.email.trim().toLowerCase();
    const user = await this.users.findByEmail(email);
    if (!user || !user.passwordHash) {
      throw new InvalidCredentialsError();
    }
    const ok = await this.hasher.compare(input.password, user.passwordHash);
    if (!ok) {
      throw new InvalidCredentialsError();
    }
    return { userId: user.id };
  }
}
