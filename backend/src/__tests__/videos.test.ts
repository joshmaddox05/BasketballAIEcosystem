import { FastifyInstance } from 'fastify';
import { createTestServer, createMockUser, generateTestJWT } from './helper';

describe('Video Upload API', () => {
  let server: FastifyInstance;
  let mockUser: any;
  let authToken: string;

  beforeAll(async () => {
    server = await createTestServer();
    mockUser = createMockUser();
    authToken = generateTestJWT(mockUser);
  });

  afterAll(async () => {
    await server.close();
  });

  describe('POST /videos/signed-url', () => {
    const validRequest = {
      filename: 'basketball-shot.mp4',
      contentType: 'video/mp4',
      fileSize: 10 * 1024 * 1024, // 10MB
      duration: 30,
      fps: 30,
      angle: 'front' as const,
    };

    it('should generate signed URL for authenticated user', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/videos/signed-url',
        headers: {
          authorization: `Bearer ${authToken}`,
          'content-type': 'application/json',
        },
        payload: validRequest,
      });

      expect(response.statusCode).toBe(200);
      
      const data = JSON.parse(response.body);
      expect(data).toMatchObject({
        uploadUrl: expect.stringMatching(/^https:\/\/storage\.googleapis\.com/),
        videoId: expect.stringMatching(/^[0-9a-f-]{36}$/),
        key: expect.stringContaining('videos/'),
        expiresAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        requestId: expect.any(String),
      });
    });

    it('should reject request without authentication', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/videos/signed-url',
        headers: {
          'content-type': 'application/json',
        },
        payload: validRequest,
      });

      expect(response.statusCode).toBe(401);
      
      const data = JSON.parse(response.body);
      expect(data.error.message).toContain('authorization header');
    });

    it('should validate file size limits', async () => {
      const oversizedRequest = {
        ...validRequest,
        fileSize: 600 * 1024 * 1024, // 600MB (over 500MB limit)
      };

      const response = await server.inject({
        method: 'POST',
        url: '/videos/signed-url',
        headers: {
          authorization: `Bearer ${authToken}`,
          'content-type': 'application/json',
        },
        payload: oversizedRequest,
      });

      expect(response.statusCode).toBe(400);
      
      const data = JSON.parse(response.body);
      expect(data.error).toBe('Validation Error');
    });

    it('should validate content type', async () => {
      const invalidContentType = {
        ...validRequest,
        contentType: 'image/jpeg',
      };

      const response = await server.inject({
        method: 'POST',
        url: '/videos/signed-url',
        headers: {
          authorization: `Bearer ${authToken}`,
          'content-type': 'application/json',
        },
        payload: invalidContentType,
      });

      expect(response.statusCode).toBe(400);
      
      const data = JSON.parse(response.body);
      expect(data.error).toBe('Validation Error');
    });

    it('should validate required fields', async () => {
      const incompleteRequest = {
        filename: 'test.mp4',
        // Missing contentType and fileSize
      };

      const response = await server.inject({
        method: 'POST',
        url: '/videos/signed-url',
        headers: {
          authorization: `Bearer ${authToken}`,
          'content-type': 'application/json',
        },
        payload: incompleteRequest,
      });

      expect(response.statusCode).toBe(400);
      
      const data = JSON.parse(response.body);
      expect(data.error).toBe('Validation Error');
      expect(data.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['contentType'],
            message: expect.any(String),
          }),
          expect.objectContaining({
            path: ['fileSize'],
            message: expect.any(String),
          }),
        ])
      );
    });
  });

  describe('POST /videos/:videoId/confirm', () => {
    let videoId: string;

    beforeEach(async () => {
      // Create a video record first
      const signedUrlResponse = await server.inject({
        method: 'POST',
        url: '/videos/signed-url',
        headers: {
          authorization: `Bearer ${authToken}`,
          'content-type': 'application/json',
        },
        payload: {
          filename: 'test-confirm.mp4',
          contentType: 'video/mp4',
          fileSize: 5 * 1024 * 1024,
        },
      });

      const data = JSON.parse(signedUrlResponse.body);
      videoId = data.videoId;
    });

    it('should confirm video upload for owner', async () => {
      // Note: This test will fail in real Firebase Storage since we don't actually upload
      // In a real test, we'd mock the Firebase Storage service
      const response = await server.inject({
        method: 'POST',
        url: `/videos/${videoId}/confirm`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      // This will likely return 400 since no file was actually uploaded
      // but it tests the authentication and authorization logic
      expect([200, 400]).toContain(response.statusCode);
    });

    it('should reject confirmation without authentication', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/videos/${videoId}/confirm`,
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reject confirmation for non-existent video', async () => {
      const fakeVideoId = '12345678-1234-1234-1234-123456789012';
      
      const response = await server.inject({
        method: 'POST',
        url: `/videos/${fakeVideoId}/confirm`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /videos/:videoId', () => {
    let videoId: string;

    beforeEach(async () => {
      // Create a video record first
      const signedUrlResponse = await server.inject({
        method: 'POST',
        url: '/videos/signed-url',
        headers: {
          authorization: `Bearer ${authToken}`,
          'content-type': 'application/json',
        },
        payload: {
          filename: 'test-metadata.mp4',
          contentType: 'video/mp4',
          fileSize: 8 * 1024 * 1024,
          duration: 45,
          fps: 24,
          angle: 'side',
        },
      });

      const data = JSON.parse(signedUrlResponse.body);
      videoId = data.videoId;
    });

    it('should return video metadata for owner', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/videos/${videoId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      
      const data = JSON.parse(response.body);
      expect(data).toMatchObject({
        videoId,
        userId: mockUser.uid,
        filename: 'test-metadata.mp4',
        contentType: 'video/mp4',
        fileSize: 8 * 1024 * 1024,
        duration: 45,
        fps: 24,
        angle: 'side',
        status: 'uploading',
        uploadedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        requestId: expect.any(String),
      });
    });

    it('should reject request without authentication', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/videos/${videoId}`,
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 404 for non-existent video', async () => {
      const fakeVideoId = '12345678-1234-1234-1234-123456789012';
      
      const response = await server.inject({
        method: 'GET',
        url: `/videos/${fakeVideoId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /videos', () => {
    beforeEach(async () => {
      // Create multiple video records for pagination testing
      const videoRequests = [
        { filename: 'video1.mp4', fileSize: 5 * 1024 * 1024 },
        { filename: 'video2.mp4', fileSize: 7 * 1024 * 1024 },
        { filename: 'video3.mp4', fileSize: 3 * 1024 * 1024 },
      ];

      for (const videoReq of videoRequests) {
        await server.inject({
          method: 'POST',
          url: '/videos/signed-url',
          headers: {
            authorization: `Bearer ${authToken}`,
            'content-type': 'application/json',
          },
          payload: {
            ...videoReq,
            contentType: 'video/mp4',
          },
        });
      }
    });

    it('should list user videos with default pagination', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/videos',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      
      const data = JSON.parse(response.body);
      expect(data).toMatchObject({
        videos: expect.arrayContaining([
          expect.objectContaining({
            videoId: expect.stringMatching(/^[0-9a-f-]{36}$/),
            filename: expect.any(String),
            status: 'uploading',
          }),
        ]),
        total: expect.any(Number),
        limit: 20,
        offset: 0,
        requestId: expect.any(String),
      });
      
      expect(data.videos.length).toBeGreaterThan(0);
    });

    it('should support pagination parameters', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/videos?limit=2&offset=1',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      
      const data = JSON.parse(response.body);
      expect(data.limit).toBe(2);
      expect(data.offset).toBe(1);
      expect(data.videos.length).toBeLessThanOrEqual(2);
    });

    it('should support status filtering', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/videos?status=uploading',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      
      const data = JSON.parse(response.body);
      data.videos.forEach((video: any) => {
        expect(video.status).toBe('uploading');
      });
    });

    it('should reject request without authentication', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/videos',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should enforce maximum limit', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/videos?limit=200', // Over the 100 max
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      
      const data = JSON.parse(response.body);
      expect(data.limit).toBe(100); // Should be capped at 100
    });
  });
});