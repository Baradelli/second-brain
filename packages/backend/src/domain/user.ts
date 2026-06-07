export interface User {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string | null; // bcrypt; null = conta sem senha definida
  createdAt: Date;
}
