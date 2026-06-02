import { defineConfig } from 'vitest/config';

/**
 * Projetos definidos em vitest.workspace.ts:
 * - unit: UseCases com Repository fake, sem banco. Rápidos. (pnpm test)
 * - integration: Repository contra o Prisma/Postgres real. (pnpm test:integration)
 */
export default defineConfig({});
