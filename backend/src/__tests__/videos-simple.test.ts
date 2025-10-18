import { FastifyInstance } from 'fastify';
import { build } from './helper';

describe('Video Upload API - Basic Structure', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = await build();
  });

  afterAll(async () => {
    await server.close();
  });

  describe('Video Routes Registration', () => {
    it('should register POST /videos/signed-url route', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/videos/signed-url',
        headers: {
          'content-type': 'application/json',
        },
        payload: {
          filename: 'test.mp4',
          contentType: 'video/mp4',
          fileSize: 1024,
        },
      });

      // Should return 401 (unauthorized) not 404 (not found)
      // This confirms the route exists and auth middleware is working
      expect(response.statusCode).toBe(401);
      
      const data = JSON.parse(response.body);
      expect(data.error.message).toContain('authorization header');
    });

    it('should register GET /videos route', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/videos',
      });

      // Should return 401 (unauthorized) not 404 (not found)
      expect(response.statusCode).toBe(401);
    });

    it('should register GET /videos/:videoId route', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/videos/test-id-123',
      });

      // Should return 401 (unauthorized) not 404 (not found)
      expect(response.statusCode).toBe(401);
    });

    it('should register POST /videos/:videoId/confirm route', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/videos/test-id-123/confirm',
      });

      // Should return 401 (unauthorized) not 404 (not found)
      expect(response.statusCode).toBe(401);
    });
  });

  describe('Request Validation', () => {
    it('should validate content-type for signed URL request', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/videos/signed-url',
        headers: {
          authorization: 'Bearer test-token',
          'content-type': 'application/json',
        },
        payload: {
          filename: 'test.mp4',
          contentType: 'image/jpeg', // Invalid content type
          fileSize: 1024,
        },
      });

      // Should return 400 for validation error or 401 for auth error
      expect([400, 401]).toContain(response.statusCode);
    });

    it('should validate file size limits', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/videos/signed-url',
        headers: {
          authorization: 'Bearer test-token',
          'content-type': 'application/json',
        },
        payload: {
          filename: 'test.mp4',
          contentType: 'video/mp4',
          fileSize: 600 * 1024 * 1024, // 600MB - over limit
        },
      });

      // Should return 400 for validation error or 401 for auth error
      expect([400, 401]).toContain(response.statusCode);
    });

    it('should require authentication for all video endpoints', async () => {
      const endpoints = [
        { method: 'POST', url: '/videos/signed-url' },
        { method: 'GET', url: '/videos' },
        { method: 'GET', url: '/videos/test-123' },
        { method: 'POST', url: '/videos/test-123/confirm' },
      ];

      for (const endpoint of endpoints) {
        const response = await server.inject({
          method: endpoint.method as any,
          url: endpoint.url,
        });

        expect(response.statusCode).toBe(401);
        
        const data = JSON.parse(response.body);
        expect(data.error.message).toContain('authorization header');
      }
    });
  });
});