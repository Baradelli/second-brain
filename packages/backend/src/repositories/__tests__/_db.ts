import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export const TEST_USER_ID = 'test-user-repo';

export async function setupTestUser() {
  await prisma.user.upsert({
    where: { id: TEST_USER_ID },
    update: {},
    create: { id: TEST_USER_ID, email: 'repo-test@cerebro.local', name: 'Repo Test' },
  });
}

export async function clearNotes() {
  await prisma.note.deleteMany({ where: { userId: TEST_USER_ID } });
}
