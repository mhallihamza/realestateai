const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const workspaces = await prisma.workspace.findMany();
  for (const w of workspaces) {
    const slug = w.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    await prisma.workspace.update({ 
      where: { id: w.id }, 
      data: { inboundEmail: slug } 
    });
    console.log(w.name, '->', slug);
  }
  await prisma.$disconnect();
}

main().catch(console.error);