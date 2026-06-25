import { prisma } from '../lib/prisma'

async function main() {
  const workspaces = await prisma.workspace.findMany()

  for (const workspace of workspaces) {
    const inboundEmail = workspace.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    await prisma.workspace.update({
      where: { id: workspace.id },
      data: { inboundEmail }
    })

    console.log(`✅ ${workspace.name} → ${inboundEmail}@mypron8n.site`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())