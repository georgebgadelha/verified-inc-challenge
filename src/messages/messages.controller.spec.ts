import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { MessageEntity } from './entities/message.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('MessagesController (Integration)', () => {
  let app: INestApplication;
  let messagesService: MessagesService;

  const mockUser = {
    id: 'b1c2d3e4-f5a6-4890-b123-fa1234567890',
    phoneNumber: '+1234567890',
    name: 'Test User',
  };

  const mockMessage = {
    id: 'a1b2c3d4-e5f6-4890-a123-ef1234567890',
    content: 'Test message',
    senderId: 'b1c2d3e4-f5a6-4890-b123-fa1234567890',
    receiverId: 'c1d2e3f4-a5b6-4890-8123-ab1234567890',
    replyToId: null,
    createdAt: '2025-11-04T05:47:47.775Z',
    updatedAt: '2025-11-04T05:47:47.775Z',
  };

  const mockPaginatedResponse = {
    data: [mockMessage],
    meta: {
      currentPage: 1,
      pageSize: 20,
      totalItems: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
      nextPage: null,
      previousPage: null,
    },
  };

  const mockMessagesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    findReplies: jest.fn(),
  };

  const mockJwtAuthGuard = {
    canActivate: (context: ExecutionContext) => {
      const req = context.switchToHttp().getRequest();
      req.user = mockUser;
      return true;
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MessagesController],
      providers: [
        {
          provide: MessagesService,
          useValue: mockMessagesService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    messagesService = module.get<MessagesService>(MessagesService);

    jest.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /messages', () => {
    const createDto: CreateMessageDto = {
      content: 'Test message',
      receiverId: 'c1d2e3f4-a5b6-4890-8123-ab1234567890',
    };

    it('should create a message', async () => {
      mockMessagesService.create.mockResolvedValue(mockMessage);

      const response = await request(app.getHttpServer())
        .post('/messages')
        .send(createDto);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        id: mockMessage.id,
        content: mockMessage.content,
      });
      expect(mockMessagesService.create).toHaveBeenCalledWith(
        mockUser.id,
        createDto,
      );
    });

    it('should return 400 for invalid payload', () => {
      return request(app.getHttpServer())
        .post('/messages')
        .send({ content: 'Missing required fields' })
        .expect(400);
    });

    it('should validate receiverId is UUID', () => {
      return request(app.getHttpServer())
        .post('/messages')
        .send({
          content: 'Test',
          receiverId: 'invalid-uuid',
        })
        .expect(400);
    });

    it('should reject extra fields', () => {
      return request(app.getHttpServer())
        .post('/messages')
        .send({
          ...createDto,
          extraField: 'should be rejected',
        })
        .expect(400);
    });
  });

  describe('GET /messages', () => {
    it('should return paginated messages with default parameters', () => {
      mockMessagesService.findAll.mockResolvedValue(mockPaginatedResponse);

      return request(app.getHttpServer())
        .get('/messages')
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual(mockPaginatedResponse);
          expect(mockMessagesService.findAll).toHaveBeenCalledWith(
            mockUser.id,
            undefined,
            20,
            'desc',
          );
        });
    });

    it('should accept custom page and limit', () => {
      mockMessagesService.findAll.mockResolvedValue(mockPaginatedResponse);

      return request(app.getHttpServer())
        .get('/messages?limit=10')
        .expect(200)
        .expect(() => {
          expect(mockMessagesService.findAll).toHaveBeenCalledWith(
            mockUser.id,
            undefined,
            10,
            'desc',
          );
        });
    });

    it('should accept sort parameter', () => {
      mockMessagesService.findAll.mockResolvedValue(mockPaginatedResponse);

      return request(app.getHttpServer())
        .get('/messages?sort=asc')
        .expect(200)
        .expect(() => {
          expect(mockMessagesService.findAll).toHaveBeenCalledWith(
            mockUser.id,
            undefined,
            20,
            'asc',
          );
        });
    });

    it('should accept cursor parameter', () => {
      mockMessagesService.findAll.mockResolvedValue(mockPaginatedResponse);

      return request(app.getHttpServer())
        .get('/messages?cursor=2025-11-04T05:47:47.775Z_a1b2c3d4')
        .expect(200)
        .expect(() => {
          expect(mockMessagesService.findAll).toHaveBeenCalledWith(
            mockUser.id,
            '2025-11-04T05:47:47.775Z_a1b2c3d4',
            20,
            'desc',
          );
        });
    });

    it('should enforce maximum limit of 100', () => {
      mockMessagesService.findAll.mockResolvedValue(mockPaginatedResponse);

      return request(app.getHttpServer())
        .get('/messages?limit=200')
        .expect(200)
        .expect(() => {
          expect(mockMessagesService.findAll).toHaveBeenCalledWith(
            mockUser.id,
            undefined,
            100,
            'desc',
          );
        });
    });
  });

  describe('GET /messages/:id', () => {
    it('should return a message by id', () => {
      mockMessagesService.findOne.mockResolvedValue(mockMessage);

      return request(app.getHttpServer())
        .get('/messages/a1b2c3d4-e5f6-4890-a123-ef1234567890')
        .expect(200)
        .expect((res) => {
          expect(res.body).toMatchObject({
            id: mockMessage.id,
          });
          expect(mockMessagesService.findOne).toHaveBeenCalledWith('a1b2c3d4-e5f6-4890-a123-ef1234567890');
        });
    });
  });

  describe('PATCH /messages/:id', () => {
    const updateDto: UpdateMessageDto = {
      content: 'Updated content',
    };

    it('should update a message', () => {
      const updatedMessage = { ...mockMessage, content: 'Updated content' };
      mockMessagesService.update.mockResolvedValue(updatedMessage);

      return request(app.getHttpServer())
        .patch('/messages/a1b2c3d4-e5f6-4890-a123-ef1234567890')
        .send(updateDto)
        .expect(200)
        .expect((res) => {
          expect(res.body.content).toBe('Updated content');
          expect(mockMessagesService.update).toHaveBeenCalledWith('a1b2c3d4-e5f6-4890-a123-ef1234567890', updateDto);
        });
    });

    it('should validate content length', () => {
      return request(app.getHttpServer())
        .patch('/messages/a1b2c3d4-e5f6-4890-a123-ef1234567890')
        .send({ content: 'a'.repeat(5001) })
        .expect(400);
    });

    it('should reject extra fields', () => {
      return request(app.getHttpServer())
        .patch('/messages/a1b2c3d4-e5f6-4890-a123-ef1234567890')
        .send({
          content: 'Updated',
          extraField: 'not allowed',
        })
        .expect(400);
    });
  });

  describe('DELETE /messages/:id', () => {
    it('should delete a message', () => {
      mockMessagesService.remove.mockResolvedValue(undefined);

      return request(app.getHttpServer())
        .delete('/messages/a1b2c3d4-e5f6-4890-a123-ef1234567890')
        .expect(204)
        .expect(() => {
          expect(mockMessagesService.remove).toHaveBeenCalledWith('a1b2c3d4-e5f6-4890-a123-ef1234567890');
        });
    });
  });

  describe('GET /messages/:id/replies', () => {
    const replyMessage = {
      id: 'd1e2f3a4-b5c6-4890-9123-bc1234567890',
      content: 'This is a reply',
      senderId: 'c1d2e3f4-a5b6-4890-8123-ab1234567890',
      receiverId: 'b1c2d3e4-f5a6-4890-b123-fa1234567890',
      replyToId: 'a1b2c3d4-e5f6-4890-a123-ef1234567890',
      createdAt: '2025-11-04T05:47:47.775Z',
      updatedAt: '2025-11-04T05:47:47.775Z',
    };

    it('should return replies to a message', () => {
      mockMessagesService.findReplies.mockResolvedValue([replyMessage]);

      return request(app.getHttpServer())
        .get('/messages/a1b2c3d4-e5f6-4890-a123-ef1234567890/replies')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveLength(1);
          expect(res.body[0].replyToId).toBe('a1b2c3d4-e5f6-4890-a123-ef1234567890');
          expect(mockMessagesService.findReplies).toHaveBeenCalledWith('a1b2c3d4-e5f6-4890-a123-ef1234567890');
        });
    });

    it('should return empty array if no replies', () => {
      mockMessagesService.findReplies.mockResolvedValue([]);

      return request(app.getHttpServer())
        .get('/messages/a1b2c3d4-e5f6-4890-a123-ef1234567890/replies')
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual([]);
        });
    });
  });
});
