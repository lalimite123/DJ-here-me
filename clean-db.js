const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Suppression des anciens thèmes mal formattés...');
  await prisma.theme.deleteMany();
  await prisma.themeVideo.deleteMany();
  console.log('Fait.');
}
main().catch(console.error).finally(() => prisma.$disconnect());