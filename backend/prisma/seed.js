import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.activity.deleteMany();
  await prisma.task.deleteMany();
  await prisma.list.deleteMany();
  await prisma.boardMember.deleteMany();
  await prisma.board.deleteMany();
  await prisma.user.deleteMany();

  // Create demo users
  const hash = await bcrypt.hash('password123', 10);

  const alice = await prisma.user.create({
    data: { name: 'Alice Johnson', email: 'alice@example.com', passwordHash: hash },
  });
  const bob = await prisma.user.create({
    data: { name: 'Bob Smith', email: 'bob@example.com', passwordHash: hash },
  });
  const carol = await prisma.user.create({
    data: { name: 'Carol Williams', email: 'carol@example.com', passwordHash: hash },
  });

  // Create a board
  const board = await prisma.board.create({
    data: {
      title: 'Product Launch',
      description: 'Q1 product launch planning board',
      ownerId: alice.id,
      members: {
        create: [
          { userId: alice.id, role: 'owner' },
          { userId: bob.id, role: 'member' },
          { userId: carol.id, role: 'member' },
        ],
      },
    },
  });

  // Create lists
  const backlog = await prisma.list.create({
    data: { title: 'Backlog', position: 0, boardId: board.id },
  });
  const inProgress = await prisma.list.create({
    data: { title: 'In Progress', position: 1, boardId: board.id },
  });
  const review = await prisma.list.create({
    data: { title: 'In Review', position: 2, boardId: board.id },
  });
  const done = await prisma.list.create({
    data: { title: 'Done', position: 3, boardId: board.id },
  });

  // Create tasks
  const tasks = [
    { title: 'Design landing page', description: 'Create mockups for the new landing page', position: 0, priority: 'high', listId: backlog.id, assigneeId: bob.id },
    { title: 'Write API documentation', description: 'Document all REST endpoints', position: 1, priority: 'medium', listId: backlog.id, assigneeId: null },
    { title: 'Set up CI/CD pipeline', description: 'Configure GitHub Actions for auto-deploy', position: 2, priority: 'high', listId: backlog.id, assigneeId: carol.id },
    { title: 'Implement user auth', description: 'JWT-based authentication system', position: 0, priority: 'high', listId: inProgress.id, assigneeId: alice.id },
    { title: 'Database schema design', description: 'Design and implement the database schema', position: 1, priority: 'medium', listId: inProgress.id, assigneeId: bob.id },
    { title: 'Code review: auth module', description: 'Review PR #42 for auth module', position: 0, priority: 'medium', listId: review.id, assigneeId: carol.id },
    { title: 'Project setup', description: 'Initial project scaffolding and tooling', position: 0, priority: 'low', listId: done.id, assigneeId: alice.id },
  ];

  for (const task of tasks) {
    await prisma.task.create({ data: task });
  }

  // Create activity entries
  await prisma.activity.create({
    data: {
      action: 'created',
      entityType: 'board',
      entityId: board.id,
      details: `Created board "${board.title}"`,
      userId: alice.id,
      boardId: board.id,
    },
  });

  console.log('✅ Database seeded successfully!');
  console.log(`   Users: alice@example.com, bob@example.com, carol@example.com`);
  console.log(`   Password: password123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
