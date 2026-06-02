import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seed single-user: cria o usuário fixo e suas Settings.
 * Enquanto não há tela de login, este é "o dono". O `id` fixo facilita referenciar.
 */
async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'owner@cerebro.local' },
    update: {},
    create: {
      id: 'owner',
      email: 'owner@cerebro.local',
      name: 'Owner',
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
