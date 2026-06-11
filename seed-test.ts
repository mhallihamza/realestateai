const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting local database seed initialization...')

  // 1. Create a primary testing workspace with required unique slug field
  const workspace = await prisma.workspace.create({
    data: {
      name: 'Casablanca Luxury Living',
      slug: 'casablanca-luxury-living',
    },
  })

  // 2. Create an agent configuration profile bound to that workspace
  await prisma.agentConfig.create({
    data: {
      workspaceId: workspace.id,
      agentName: 'Yassine',
      tone: 'professional',
      language: 'English',
      replyDelaySeconds: 0,
      maxDailyMessages: 100,
      qualifyingQuestions: 'Ask about timeline, budget, and exact location preferences.',
      autoHandoffScore: 50,
    },
  })

  // 3. Create a dummy system user account with required password
  const user = await prisma.user.create({
    data: {
      name: 'Hamza Dev',
      email: 'hamza.dev@example.com',
      password: 'dummy_password_hash_123',
    },
  })

  // 4. Link the user to the workspace as an Administrator member
  await prisma.workspaceMember.create({
    data: {
      workspaceId: workspace.id,
      userId: user.id,
      role: 'admin',
    },
  })

  console.log('\n✅ Local Database Seeded Successfully!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`📋 YOUR TESTING WORKSPACE ID: ${workspace.id}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })