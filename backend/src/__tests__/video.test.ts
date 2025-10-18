import { FastifyInstance } from 'fastify';
import { server } from '../index';

describe('Video Upload API', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = server;
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /videos/signed-url', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/videos/signed-url',
        payload: {
          fileName: 'test.mp4',
          mimeType: 'video/mp4',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should validate required fields', async () => {
      // Mock authentication
      const mockUser = {
        uid: 'test-user-123',
        email: 'test@example.com',
        role: 'free',
        emailVerified: true,
      };

      const response = await app.inject({
        method: 'POST',
        url: '/videos/signed-url',
        headers: {
          authorization: 'Bearer mock-token',
        },
        payload: {
          // Missing fileName and mimeType
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain('fileName and mimeType are required');
    });

    it('should validate mime type', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/videos/signed-url',
        headers: {
          authorization: 'Bearer mock-token',
        },
        payload: {
          fileName: 'test.txt',
          mimeType: 'text/plain', // Invalid mime type
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain('Unsupported mime type');
    });

    it('should generate signed URL for valid request', async () => {
      // Mock the S3 service
      const mockSignedUrl = 'https://s3.amazonaws.com/bucket/test-key?signature=...';
      const mockKey = 'videos/test-user-123/video-id/timestamp-test.mp4';
      const mockVideoId = 'video-id-123';

      // Mock the S3 service methods
      jest.mock('../services/s3', () => ({
        generateSignedUploadUrl: jest.fn().mockResolvedValue({
          putUrl: mockSignedUrl,
          key: mockKey,
          videoId: mockVideoId,
          expiresIn: 3600,
        }),
      }));

      const response = await app.inject({
        method: 'POST',
        url: '/videos/signed-url',
        headers: {
          authorization: 'Bearer mock-token',
        },
        payload: {
          fileName: 'test.mp4',
          mimeType: 'video/mp4',
          duration: 30,
          fps: 30,
          angle: 'front',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('putUrl');
      expect(body).toHaveProperty('key');
      expect(body).toHaveProperty('videoId');
      expect(body).toHaveProperty('expiresIn');
      expect(body).toHaveProperty('requestId');
    });
  });

  describe('GET /videos', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/videos',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should list user videos', async () => {
      // Mock the S3 service
      const mockVideos = [
        {
          key: 'videos/test-user-123/video-1/timestamp-video1.mp4',
          size: 1024000,
          lastModified: new Date('2023-01-01'),
        },
        {
          key: 'videos/test-user-123/video-2/timestamp-video2.mp4',
          size: 2048000,
          lastModified: new Date('2023-01-02'),
        },
      ];

      jest.mock('../services/s3', () => ({
        listUserVideos: jest.fn().mockResolvedValue(mockVideos),
      }));

      const response = await app.inject({
        method: 'GET',
        url: '/videos',
        headers: {
          authorization: 'Bearer mock-token',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('videos');
      expect(body).toHaveProperty('requestId');
      expect(Array.isArray(body.videos)).toBe(true);
    });
  });

  describe('GET /videos/:key/download', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/videos/test-key/download',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should validate user ownership', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/videos/videos/other-user/video-id/file.mp4/download',
        headers: {
          authorization: 'Bearer mock-token',
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain('Access denied');
    });

    it('should generate download URL for valid request', async () => {
      const mockDownloadUrl = 'https://s3.amazonaws.com/bucket/test-key?signature=...';
      
      jest.mock('../services/s3', () => ({
        generateSignedDownloadUrl: jest.fn().mockResolvedValue(mockDownloadUrl),
      }));

      const response = await app.inject({
        method: 'GET',
        url: '/videos/videos/test-user-123/video-id/file.mp4/download',
        headers: {
          authorization: 'Bearer mock-token',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('downloadUrl');
      expect(body).toHaveProperty('expiresIn');
      expect(body).toHaveProperty('requestId');
    });
  });

  describe('DELETE /videos/:key', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/videos/test-key',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should validate user ownership', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/videos/videos/other-user/video-id/file.mp4',
        headers: {
          authorization: 'Bearer mock-token',
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain('Access denied');
    });

    it('should delete video for valid request', async () => {
      jest.mock('../services/s3', () => ({
        deleteVideo: jest.fn().mockResolvedValue(undefined),
      }));

      const response = await app.inject({
        method: 'DELETE',
        url: '/videos/videos/test-user-123/video-id/file.mp4',
        headers: {
          authorization: 'Bearer mock-token',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('message');
      expect(body).toHaveProperty('key');
      expect(body).toHaveProperty('requestId');
    });
  });
});
