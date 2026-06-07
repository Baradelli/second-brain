import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Seed single-user: cria o usuário fixo (com senha) e suas Settings.
 * Senha vem de SEED_OWNER_PASSWORD (default 'cerebro123' em dev). É "o dono".
 */
async function main() {
  const password = process.env.SEED_OWNER_PASSWORD ?? 'cerebro123';
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email: 'owner@cerebro.local' },
    update: { passwordHash },
    create: {
      id: 'owner',
      email: 'owner@cerebro.local',
      name: 'Owner',
      passwordHash,
      settings: {
        create: {
          reviewWeekday: 0,
          recapWeekday: 0,
          timezone: 'America/Sao_Paulo',
          devotionalTime: '07:00',
          reflectionTime: '21:00',
        },
      },
    },
  });

  console.log('Seed concluído. Usuário:', user.id);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
