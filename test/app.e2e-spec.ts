import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('App E2E Tests', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let authToken: string;
  let userId: string;
  let secondUserId: string;
  let createdMessageId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    // Get Prisma service for cleanup
    prismaService = app.get(PrismaService);

    // Register and authenticate a test user
    const timestamp = Date.now();
    const registerResponse = await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({
        name: 'E2E Test User',
        email: `e2e-test-${timestamp}@example.com`,
        phoneNumber: `+1555${timestamp.toString().slice(-7)}`,
        password: 'testpass123',
      })
      .expect(201);

    authToken = registerResponse.body.access_token;
    userId = registerResponse.body.user.id;

    // Create a second user for message testing
    const secondUserResponse = await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({
        name: 'E2E Second User',
        email: `e2e-test-second-${timestamp}@example.com`,
        phoneNumber: `+1555${(timestamp + 1).toString().slice(-7)}`,
        password: 'testpass123',
      })
      .expect(201);

    secondUserId = secondUserResponse.body.user.id;
  });

  afterAll(async () => {
    // Close Prisma connection
    await prismaService.$disconnect();
    
    // Close app (this will close Redis and other connections)
    await app.close();
  });

  describe('Health Check', () => {
    it('/v1/health (GET) - should return health status', () => {
      return request(app.getHttpServer())
        .get('/v1/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 'ok');
          expect(res.body).toHaveProperty('database');
          expect(res.body).toHaveProperty('memory');
          expect(res.body).toHaveProperty('uptime');
        });
    });
  });

  describe('Authentication', () => {
    const timestamp = Date.now() + 1000;

    it('/v1/auth/register (POST) - should register a new user', () => {
      return request(app.getHttpServer())
        .post('/v1/auth/register')
        .send({
          name: 'New User',
          email: `new-user-${timestamp}@example.com`,
          phoneNumber: `+1555${timestamp.toString().slice(-7)}`,
          password: 'password123',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
          expect(res.body).toHaveProperty('refresh_token');
          expect(res.body).toHaveProperty('user');
          expect(res.body.user).toHaveProperty('email');
        });
    });

    it('/v1/auth/register (POST) - should reject duplicate email', async () => {
      const email = `duplicate-${timestamp}@example.com`;
      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send({
          name: 'Duplicate Test',
          email,
          phoneNumber: `+1555${(timestamp + 2).toString().slice(-7)}`,
          password: 'password123',
        })
        .expect(201);

      return request(app.getHttpServer())
        .post('/v1/auth/register')
        .send({
          name: 'Duplicate Test 2',
          email, // Same email
          phoneNumber: `+1555${(timestamp + 3).toString().slice(-7)}`,
          password: 'password123',
        })
        .expect(409);
    });

    it('/v1/auth/login (POST) - should login with valid credentials', async () => {
      const email = `login-test-${timestamp}@example.com`;
      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send({
          name: 'Login Test',
          email,
          phoneNumber: `+1555${(timestamp + 4).toString().slice(-7)}`,
          password: 'password123',
        })
        .expect(201);

      return request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({
          email,
          password: 'password123',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
          expect(res.body).toHaveProperty('refresh_token');
        });
    });

    it('/v1/auth/login (POST) - should reject invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('/v1/auth/refresh (POST) - should refresh access token', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({
          email: `e2e-test-${Date.now() - 1000}@example.com`,
          password: 'testpass123',
        });

      if (loginResponse.body.refresh_token) {
        return request(app.getHttpServer())
          .post('/v1/auth/refresh')
          .send({
            refresh_token: loginResponse.body.refresh_token,
          })
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('access_token');
          });
      }
    });
  });

  describe('Users', () => {
    it('/v1/users/me (GET) - should get current user profile', () => {
      return request(app.getHttpServer())
        .get('/v1/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', userId);
          expect(res.body).toHaveProperty('email');
          expect(res.body).toHaveProperty('name');
        });
    });

    it('/v1/users/me (GET) - should reject without auth', () => {
      return request(app.getHttpServer())
        .get('/v1/users/me')
        .expect(401);
    });
  });

  describe('Messages', () => {
    it('/v1/messages (POST) - should create a direct message', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'E2E test message',
          receiverId: secondUserId,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.content).toBe('E2E test message');
      expect(response.body.senderId).toBe(userId);
      expect(response.body.receiverId).toBe(secondUserId);
      
      createdMessageId = response.body.id;
    });

    it('/v1/messages (POST) - should reject without receiverId or groupId', () => {
      return request(app.getHttpServer())
        .post('/v1/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Invalid message',
        })
        .expect(400);
    });

    it('/v1/messages (POST) - should reject without auth', () => {
      return request(app.getHttpServer())
        .post('/v1/messages')
        .send({
          content: 'Unauthorized message',
          receiverId: secondUserId,
        })
        .expect(401);
    });

    it('/v1/messages (GET) - should get paginated messages with cursor', () => {
      return request(app.getHttpServer())
        .get('/v1/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('meta');
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.meta).toHaveProperty('count');
          expect(res.body.meta).toHaveProperty('hasMore');
        });
    });

    it('/v1/messages (GET) - should handle limit parameter', () => {
      return request(app.getHttpServer())
        .get('/v1/messages?limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.meta.limit).toBe(5);
        });
    });

    it('/v1/messages (GET) - should handle sort parameter', () => {
      return request(app.getHttpServer())
        .get('/v1/messages?sort=asc')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });

    it('/v1/messages/:id (GET) - should get a specific message', () => {
      return request(app.getHttpServer())
        .get(`/v1/messages/${createdMessageId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(createdMessageId);
          expect(res.body.content).toBe('E2E test message');
        });
    });

    it('/v1/messages/:id (PATCH) - should update own message', () => {
      return request(app.getHttpServer())
        .patch(`/v1/messages/${createdMessageId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Updated E2E message' })
        .expect(200)
        .expect((res) => {
          expect(res.body.content).toBe('Updated E2E message');
        });
    });

    it('/v1/messages/:id/replies (GET) - should get message replies', () => {
      return request(app.getHttpServer())
        .get(`/v1/messages/${createdMessageId}/replies`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('/v1/messages/:id (DELETE) - should delete own message', () => {
      return request(app.getHttpServer())
        .delete(`/v1/messages/${createdMessageId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);
    });

    it('/v1/messages/:id (GET) - should return 404 for deleted message', () => {
      return request(app.getHttpServer())
        .get(`/v1/messages/${createdMessageId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
});
