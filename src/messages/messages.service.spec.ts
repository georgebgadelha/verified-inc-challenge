import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { PrismaService } from '../prisma/prisma.service';
import { GroupsService } from '../groups/groups.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';

describe('MessagesService', () => {
  let service: MessagesService;
  let prismaService: PrismaService;
  let groupsService: GroupsService;

  // Mock data
  const mockUser = {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    phoneNumber: '1234567890',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMessage = {
    id: 'message-123',
    content: 'Test message',
    senderId: 'user-123',
    receiverId: 'user-456',
    replyToId: null,
    senderName: 'Test User',
    senderPhone: '1234567890',
    receiverName: 'Test User',
    receiverPhone: '1234567890',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMessages = [
    mockMessage,
    {
      id: 'message-456',
      content: 'Second message',
      senderId: 'user-456',
      receiverId: 'user-123',
      replyToId: null,
      senderName: 'Test User',
      senderPhone: '1234567890',
      receiverName: 'Test User',
      receiverPhone: '1234567890',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  // Mock PrismaService
  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    message: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  // Mock GroupsService
  const mockGroupsService = {
    isMember: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: GroupsService,
          useValue: mockGroupsService,
        },
      ],
    }).compile();

    service = module.get<MessagesService>(MessagesService);
    prismaService = module.get<PrismaService>(PrismaService);
    groupsService = module.get<GroupsService>(GroupsService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const senderId = 'user-123';
    const createMessageDto: CreateMessageDto = {
      content: 'Test message',
      receiverId: 'user-456',
    };

    it('should create a message successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.message.create.mockResolvedValue(mockMessage);

      const result = await service.create(senderId, createMessageDto);

      expect(result).toEqual(expect.objectContaining({
        id: mockMessage.id,
        content: mockMessage.content,
      }));
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledTimes(2); // sender and receiver
      expect(mockPrismaService.message.create).toHaveBeenCalledWith({
        data: {
          content: createMessageDto.content,
          senderId: senderId,
          receiverId: createMessageDto.receiverId,
          replyToId: undefined,
          senderName: mockUser.name,
          senderPhone: mockUser.phoneNumber,
          receiverName: mockUser.name,
          receiverPhone: mockUser.phoneNumber,
        },
      });
    });

    it('should throw BadRequestException if sender does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null); // sender not found

      await expect(service.create(senderId, createMessageDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(senderId, createMessageDto)).rejects.toThrow('Sender with ID user-123 not found');
    });

    it('should throw BadRequestException if receiver does not exist', async () => {
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(mockUser) // sender exists
        .mockResolvedValueOnce(null); // receiver not found

      await expect(service.create(senderId, createMessageDto)).rejects.toThrow(BadRequestException);
    });

    it('should validate replyToId if provided', async () => {
      const createWithReply: CreateMessageDto = {
        ...createMessageDto,
        replyToId: 'message-789',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.message.findUnique.mockResolvedValueOnce(mockMessage); // replyTo message exists
      mockPrismaService.message.create.mockResolvedValue({
        ...mockMessage,
        replyToId: 'message-789',
      });

      const result = await service.create(senderId, createWithReply);

      expect(result.replyToId).toBe('message-789');
      expect(mockPrismaService.message.findUnique).toHaveBeenCalledWith({
        where: { id: 'message-789' },
      });
    });

    it('should throw BadRequestException if replyToId message does not exist', async () => {
      const createWithReply: CreateMessageDto = {
        ...createMessageDto,
        replyToId: 'nonexistent-message',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.message.findUnique.mockResolvedValueOnce(null); // replyTo message not found

      await expect(service.create(senderId, createWithReply)).rejects.toThrow(BadRequestException);
      await expect(service.create(senderId, createWithReply)).rejects.toThrow(
        'Reply target message with ID nonexistent-message not found'
      );
    });
  });

  describe('findAll', () => {
    const testUserId = 'user-123';

    it('should return paginated messages for a user with default parameters', async () => {
      mockPrismaService.message.findMany.mockResolvedValue([mockMessage]);

      const result = await service.findAll(testUserId);

      expect(result.data).toHaveLength(1);
      expect(result.meta.count).toBe(1);
      expect(result.meta.limit).toBe(20);
      expect(result.meta.hasMore).toBe(false);
      expect(mockPrismaService.message.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { senderId: testUserId },
            { receiverId: testUserId }
          ]
        },
        take: 21, // limit + 1
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      });
    });

    it('should support custom limit', async () => {
      const mockMessages = [mockMessage];
      mockPrismaService.message.findMany.mockResolvedValue(mockMessages);

      const result = await service.findAll(testUserId, undefined, 10);

      expect(result.meta).toEqual({
        count: 1,
        limit: 10,
        nextCursor: null,
        prevCursor: `${mockMessage.createdAt.toISOString()}_${mockMessage.id}`,
        hasMore: false,
      });
      expect(mockPrismaService.message.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { senderId: testUserId },
            { receiverId: testUserId }
          ]
        },
        take: 11, // limit + 1 to check for more
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      });
    });

    it('should support ascending sort order', async () => {
      mockPrismaService.message.findMany.mockResolvedValue(mockMessages);

      await service.findAll(testUserId, undefined, 20, 'asc');

      expect(mockPrismaService.message.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { senderId: testUserId },
            { receiverId: testUserId }
          ]
        },
        take: 21,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      });
    });

    it('should return empty data array when no messages exist', async () => {
      mockPrismaService.message.findMany.mockResolvedValue([]);

      const result = await service.findAll(testUserId);

      expect(result.data).toEqual([]);
      expect(result.meta.count).toBe(0);
      expect(result.meta.hasMore).toBe(false);
    });

    it('should use cursor for pagination', async () => {
      const cursor = '2023-11-07T12:00:00.000Z_message-123';
      mockPrismaService.message.findMany.mockResolvedValue([mockMessage]);

      const result = await service.findAll(testUserId, cursor, 10);

      expect(mockPrismaService.message.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { senderId: testUserId },
            { receiverId: testUserId }
          ],
          AND: {
            OR: [
              { createdAt: { lt: new Date('2023-11-07T12:00:00.000Z') } },
              {
                createdAt: new Date('2023-11-07T12:00:00.000Z'),
                id: { lt: 'message-123' }
              }
            ]
          }
        },
        take: 11,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      });
    });
  });

  describe('findOne', () => {
    it('should return a message by id', async () => {
      mockPrismaService.message.findUnique.mockResolvedValue(mockMessage);

      const result = await service.findOne('message-123');

      expect(result).toEqual(expect.objectContaining({
        id: mockMessage.id,
        content: mockMessage.content,
      }));
      expect(mockPrismaService.message.findUnique).toHaveBeenCalledWith({
        where: { id: 'message-123' },
      });
    });

    it('should throw NotFoundException if message does not exist', async () => {
      mockPrismaService.message.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('nonexistent-id')).rejects.toThrow(
        'Message with ID nonexistent-id not found'
      );
    });
  });

  describe('update', () => {
    const updateMessageDto: UpdateMessageDto = {
      content: 'Updated content',
    };

    it('should update a message successfully', async () => {
      const updatedMessage = { ...mockMessage, content: 'Updated content' };
      mockPrismaService.message.findUnique.mockResolvedValue(mockMessage);
      mockPrismaService.message.update.mockResolvedValue(updatedMessage);

      const result = await service.update('message-123', updateMessageDto);

      expect(result.content).toBe('Updated content');
      expect(mockPrismaService.message.update).toHaveBeenCalledWith({
        where: { id: 'message-123' },
        data: updateMessageDto,
      });
    });

    it('should throw NotFoundException if message does not exist', async () => {
      mockPrismaService.message.findUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent-id', updateMessageDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a message successfully', async () => {
      mockPrismaService.message.findUnique.mockResolvedValue(mockMessage);
      mockPrismaService.message.delete.mockResolvedValue(mockMessage);

      await service.remove('message-123');

      expect(mockPrismaService.message.delete).toHaveBeenCalledWith({
        where: { id: 'message-123' },
      });
    });

    it('should throw NotFoundException if message does not exist', async () => {
      mockPrismaService.message.findUnique.mockResolvedValue(null);

      await expect(service.remove('nonexistent-id')).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.message.delete).not.toHaveBeenCalled();
    });
  });

  describe('findReplies', () => {
    const replyMessage = {
      id: 'reply-123',
      content: 'This is a reply',
      senderId: 'user-456',
      receiverId: 'user-123',
      replyToId: 'message-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should return all replies to a message', async () => {
      mockPrismaService.message.findUnique.mockResolvedValue(mockMessage); // parent exists
      mockPrismaService.message.findMany.mockResolvedValue([replyMessage]);

      const result = await service.findReplies('message-123');

      expect(result).toHaveLength(1);
      expect(result[0].replyToId).toBe('message-123');
      expect(mockPrismaService.message.findMany).toHaveBeenCalledWith({
        where: { replyToId: 'message-123' },
        orderBy: { createdAt: 'asc' },
      });
    });

    it('should return empty array if no replies exist', async () => {
      mockPrismaService.message.findUnique.mockResolvedValue(mockMessage);
      mockPrismaService.message.findMany.mockResolvedValue([]);

      const result = await service.findReplies('message-123');

      expect(result).toEqual([]);
    });

    it('should throw NotFoundException if parent message does not exist', async () => {
      mockPrismaService.message.findUnique.mockResolvedValue(null);

      await expect(service.findReplies('nonexistent-id')).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.message.findMany).not.toHaveBeenCalled();
    });
  });
});
