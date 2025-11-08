import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { logger } from '../src/logger';

const prisma = new PrismaClient();

async function main() {
  logger.info('Seeding database...');

  // Hash default password
  const defaultPassword = await bcrypt.hash('password123', 10);

  // Create Alice
  const alice = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      name: 'Alice',
      email: 'alice@example.com',
      phoneNumber: '+12025551001',
      password: defaultPassword,
    },
  });

  // Create Bob
  const bob = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: {
      name: 'Bob',
      email: 'bob@example.com',
      phoneNumber: '+12025551002',
      password: defaultPassword,
    },
  });

  // Create Charlie
  const charlie = await prisma.user.upsert({
    where: { email: 'charlie@example.com' },
    update: {},
    create: {
      name: 'Charlie',
      email: 'charlie@example.com',
      phoneNumber: '+12025551003',
      password: defaultPassword,
    },
  });

  logger.info('Users created: ' + JSON.stringify({ 
    alice: { id: alice.id, email: alice.email, password: 'password123' },
    bob: { id: bob.id, email: bob.email, password: 'password123' },
    charlie: { id: charlie.id, email: charlie.email, password: 'password123' }
  }, null, 2));

  // Create some messages with denormalized user data
  const message1 = await prisma.message.create({
    data: {
      content: 'Hey Bob, how are you?',
      senderId: alice.id,
      receiverId: bob.id,
      senderName: alice.name,
      senderPhone: alice.phoneNumber,
      receiverName: bob.name,
      receiverPhone: bob.phoneNumber,
    },
  });

  const message2 = await prisma.message.create({
    data: {
      content: 'Hi Alice! I am doing great, thanks!',
      senderId: bob.id,
      receiverId: alice.id,
      replyToId: message1.id,
      senderName: bob.name,
      senderPhone: bob.phoneNumber,
      receiverName: alice.name,
      receiverPhone: alice.phoneNumber,
    },
  });

  await prisma.message.create({
    data: {
      content: 'That is awesome to hear!',
      senderId: alice.id,
      receiverId: bob.id,
      replyToId: message2.id,
      senderName: alice.name,
      senderPhone: alice.phoneNumber,
      receiverName: bob.name,
      receiverPhone: bob.phoneNumber,
    },
  });

  logger.info('Messages created with replies');

  // Create a group
  const projectGroup = await prisma.group.create({
    data: {
      name: 'Project Team',
      description: 'Discussion about the new project',
      createdById: alice.id,
      members: {
        create: [
          { userId: alice.id, role: 'admin' },
          { userId: bob.id, role: 'member' },
          { userId: charlie.id, role: 'member' },
        ],
      },
    },
  });

  // Create group messages
  await prisma.message.create({
    data: {
      content: 'Welcome to the project team chat!',
      senderId: alice.id,
      groupId: projectGroup.id,
      senderName: alice.name,
      senderPhone: alice.phoneNumber,
      receiverName: null,
      receiverPhone: null,
    },
  });

  await prisma.message.create({
    data: {
      content: 'Thanks Alice! Excited to be part of this team.',
      senderId: bob.id,
      groupId: projectGroup.id,
      senderName: bob.name,
      senderPhone: bob.phoneNumber,
      receiverName: null,
      receiverPhone: null,
    },
  });

  await prisma.message.create({
    data: {
      content: 'Looking forward to working with you all!',
      senderId: charlie.id,
      groupId: projectGroup.id,
      senderName: charlie.name,
      senderPhone: charlie.phoneNumber,
      receiverName: null,
      receiverPhone: null,
    },
  });

  logger.info('Group and group messages created');
  logger.info('Seeding completed!');
  logger.info('\nTest credentials:');
  logger.info('Alice: alice@example.com / password123');
  logger.info('Bob: bob@example.com / password123');
  logger.info('Charlie: charlie@example.com / password123');
}

main()
  .catch((e) => {
    logger.error('Seeding failed: ' + e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
