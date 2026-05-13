const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

async function shutdownPrisma() {
  await prisma.$disconnect();
}

process.once('SIGINT', shutdownPrisma);
process.once('SIGTERM', shutdownPrisma);

module.exports = prisma;
