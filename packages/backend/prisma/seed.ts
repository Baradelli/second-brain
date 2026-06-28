import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Cria/atualiza um usuário (com senha bcrypt) e garante suas Settings. Idempotente.
 * IMPORTANTE: os ids/emails aqui NÃO são usados por nenhum teste de integração — os testes só
 * apagam dados de usuários de teste (test-user-repo, owner-de-rota, settings-test-user, etc.),
 * então estes usuários reais nunca têm dados excluídos ao rodar a suíte.
 */
async function seedUser(opts: {
  id: string;
  email: string;
  name: string;
  password: string;
}) {
  const passwordHash = await bcrypt.hash(opts.password, 10);
  const user = await prisma.user.upsert({
    where: { email: opts.email },
    update: { passwordHash, name: opts.name },
    create: {
      id: opts.id,
      email: opts.email,
      name: opts.name,
      passwordHash,
    },
  });
  await prisma.settings.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      reviewWeekday: 0,
      recapWeekday: 0,
      timezone: 'America/Sao_Paulo',
      devotionalTime: '07:00',
      reflectionTime: '21:00',
    },
  });
  return user;
}

async function main() {
  // Dono de desenvolvimento (usado também como `owner` nos testes de integração).
  const owner = await seedUser({
    id: 'owner',
    email: 'owner@cerebro.local',
    name: 'Owner',
    password: process.env.SEED_OWNER_PASSWORD ?? 'cerebro123',
  });

  // Usuário REAL do dono — para uso de verdade. Senha via SEED_VITOR_PASSWORD.
  const vitor = await seedUser({
    id: 'vitor',
    email: 'vitorbaradelli@gmail.com',
    name: 'Vitor Baradelli',
    password: process.env.SEED_VITOR_PASSWORD ?? 'ghostbrain',
  });

  console.log('Seed concluído. Usuários:', owner.id, vitor.id);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
