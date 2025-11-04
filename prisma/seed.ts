import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create users
  const alice = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      name: 'Alice',
      email: 'alice@example.com',
      phoneNumber: '+12025551001',
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: {
      name: 'Bob',
      email: 'bob@example.com',
      phoneNumber: '+12025551002',
    },
  });

  console.log('Users created:', { alice, bob });

  // Create some messages
  const message1 = await prisma.message.create({
    data: {
      content: 'Hey Bob, how are you?',
      senderId: alice.id,
      receiverId: bob.id,
    },
  });

  const message2 = await prisma.message.create({
    data: {
      content: 'Hi Alice! I am doing great, thanks!',
      senderId: bob.id,
      receiverId: alice.id,
      replyToId: message1.id,
    },
  });

  await prisma.message.create({
    data: {
      content: 'That is awesome to hear!',
      senderId: alice.id,
      receiverId: bob.id,
      replyToId: message2.id,
    },
  });

  console.log('Messages created with replies');
  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
