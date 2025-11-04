import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health Check', () => {
    it('/v1/health (GET)', () => {
      return request(app.getHttpServer())
        .get('/v1/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status');
          expect(res.body).toHaveProperty('database');
          expect(res.body).toHaveProperty('memory');
          expect(res.body).toHaveProperty('uptime');
        });
    });
  });

  describe('Messages API', () => {
    const createdMessageIds: string[] = [];

    afterAll(async () => {
      // Clean up all created messages
      for (const messageId of createdMessageIds) {
        try {
          await request(app.getHttpServer())
            .delete(`/v1/messages/${messageId}`);
        } catch (error) {
          // Message might already be deleted in tests, ignore errors
        }
      }
    });

    it('/v1/messages (GET) - should return paginated messages', () => {
      return request(app.getHttpServer())
        .get('/v1/messages')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('meta');
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.meta).toHaveProperty('currentPage');
          expect(res.body.meta).toHaveProperty('totalItems');
        });
    });

    it('/v1/messages (POST) - should create a message with seeded users', async () => {
      // Get existing messages to extract valid user IDs
      const response = await request(app.getHttpServer())
        .get('/v1/messages')
        .expect(200);

      // If there are existing messages, we can extract user IDs from them
      if (response.body.data.length > 0) {
        const existingMessage = response.body.data[0];
        const createDto = {
          content: 'E2E test message',
          senderId: existingMessage.senderId,
          receiverId: existingMessage.receiverId,
        };

        const createResponse = await request(app.getHttpServer())
          .post('/v1/messages')
          .send(createDto)
          .expect(201);

        expect(createResponse.body).toHaveProperty('id');
        expect(createResponse.body.content).toBe('E2E test message');
        
        // Track created message for cleanup
        createdMessageIds.push(createResponse.body.id);
      }
    });

    it('/v1/messages/:id (GET) - should get a specific message', async () => {
      if (createdMessageIds.length > 0) {
        const messageId = createdMessageIds[0];
        return request(app.getHttpServer())
          .get(`/v1/messages/${messageId}`)
          .expect(200)
          .expect((res) => {
            expect(res.body.id).toBe(messageId);
          });
      }
    });

    it('/v1/messages/:id (PATCH) - should update a message', async () => {
      if (createdMessageIds.length > 0) {
        const messageId = createdMessageIds[0];
        return request(app.getHttpServer())
          .patch(`/v1/messages/${messageId}`)
          .send({ content: 'Updated E2E test message' })
          .expect(200)
          .expect((res) => {
            expect(res.body.content).toBe('Updated E2E test message');
          });
      }
    });

    it('/v1/messages/:id/replies (GET) - should get message replies', async () => {
      if (createdMessageIds.length > 0) {
        const messageId = createdMessageIds[0];
        return request(app.getHttpServer())
          .get(`/v1/messages/${messageId}/replies`)
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
          });
      }
    });

    it('/v1/messages/:id (DELETE) - should delete a message', async () => {
      if (createdMessageIds.length > 0) {
        const messageId = createdMessageIds[0];
        await request(app.getHttpServer())
          .delete(`/v1/messages/${messageId}`)
          .expect(204);
        
        // Remove from tracking since it's already deleted
        createdMessageIds.splice(0, 1);
      }
    });

    it('/v1/messages?page=2&limit=5&sort=asc (GET) - should handle pagination parameters', () => {
      return request(app.getHttpServer())
        .get('/v1/messages?page=2&limit=5&sort=asc')
        .expect(200)
        .expect((res) => {
          expect(res.body.meta.currentPage).toBe(2);
          expect(res.body.meta.pageSize).toBe(5);
        });
    });
  });
});
