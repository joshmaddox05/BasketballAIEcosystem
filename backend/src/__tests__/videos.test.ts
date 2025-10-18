import Fastify from 'fastify';
import { requestSignedUrl, confirmVideoUpload, getVideoDetails, listUserVideos } from '../routes/videos';

// Mock Firebase Admin
jest.mock('../services/firebase', () => {
  const mockFirestoreFunc = jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        set: jest.fn(),
        get: jest.fn(() => ({
          exists: true,
          data: () => ({
            id: 'test-video-id',
            userId: 'test-user-123',
            fileName: 'test-video.mp4',
            status: 'ready',
            storageUrl: 'videos/test-user-123/test-video.mp4',
          }),
        })),
        update: jest.fn(),
      })),
      where: jest.fn(() => {
        const queryObj: any = {
          get: jest.fn(() => ({
            docs: [
              {
                id: 'video-1',
                data: () => ({
                  id: 'video-1',
                  userId: 'test-user-123',
                  status: 'ready',
                }),
              },
            ],
          })),
        };
        queryObj.where = jest.fn(() => queryObj);
        queryObj.orderBy = jest.fn(() => queryObj);
        queryObj.limit = jest.fn(() => queryObj);
        queryObj.offset = jest.fn(() => queryObj);
        return queryObj;
      }),
    })),
  }));

  // Add Timestamp as a property
  (mockFirestoreFunc as any).Timestamp = {
    now: jest.fn(() => ({ seconds: 1234567890, nanoseconds: 0 })),
  };

  return {
    admin: {
      firestore: mockFirestoreFunc,
      storage: jest.fn(() => ({
        bucket: jest.fn(() => ({
          file: jest.fn(() => ({
            getSignedUrl: jest.fn(async () => ['https://storage.googleapis.com/signed-url']),
            exists: jest.fn(async () => [true]),
            getMetadata: jest.fn(async () => [{
              size: '1000000',
              contentType: 'video/mp4',
              timeCreated: '2024-01-01T00:00:00Z',
              updated: '2024-01-01T00:00:00Z',
            }]),
            delete: jest.fn(),
          })),
        })),
      })),
    },
    initializeFirebase: jest.fn(),
    getFirebaseAuth: jest.fn(),
  };
});

jest.mock('../services/storage', () => ({
  generateSignedUploadUrl: jest.fn(async () => ({
    uploadUrl: 'https://storage.googleapis.com/test-bucket/signed-upload-url',
    fileKey: 'videos/test-user-123/1234567890-test-uuid.mp4',
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
  })),
  generateSignedDownloadUrl: jest.fn(async () => 'https://storage.googleapis.com/test-bucket/signed-download-url'),
  initializeStorage: jest.fn(),
}));

describe('Video Upload Routes', () => {
  let server: any;

  beforeEach(async () => {
    server = Fastify();
    
    // Add mock request ID middleware
    server.addHook('onRequest', async (request: any) => {
      request.headers['x-request-id'] = 'test-request-id';
    });

    // Register routes
    server.post('/videos/signed-url', {
      preHandler: async (request: any) => {
        request.user = {
          uid: 'test-user-123',
          email: 'test@example.com',
          role: 'free',
          emailVerified: true,
        };
      },
    }, requestSignedUrl);

    server.post('/videos/:videoId/confirm', {
      preHandler: async (request: any) => {
        request.user = {
          uid: 'test-user-123',
          email: 'test@example.com',
          role: 'free',
          emailVerified: true,
        };
      },
    }, confirmVideoUpload);

    server.get('/videos/:videoId', {
      preHandler: async (request: any) => {
        request.user = {
          uid: 'test-user-123',
          email: 'test@example.com',
          role: 'free',
          emailVerified: true,
        };
      },
    }, getVideoDetails);

    server.get('/videos', {
      preHandler: async (request: any) => {
        request.user = {
          uid: 'test-user-123',
          email: 'test@example.com',
          role: 'free',
          emailVerified: true,
        };
      },
    }, listUserVideos);

    await server.ready();
  });

  describe('POST /videos/signed-url', () => {
    test('should generate signed URL for valid request', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/videos/signed-url',
        payload: {
          fileName: 'test-video.mp4',
          contentType: 'video/mp4',
          size: 10000000,
          duration: 30,
          fps: 30,
          angle: 'front',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveProperty('videoId');
      expect(body.data).toHaveProperty('uploadUrl');
      expect(body.data).toHaveProperty('fileKey');
      expect(body.data).toHaveProperty('expiresAt');
    });

    test('should reject invalid content type', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/videos/signed-url',
        payload: {
          fileName: 'test-video.txt',
          contentType: 'text/plain',
          size: 10000000,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toHaveProperty('message');
    });

    test('should reject oversized file', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/videos/signed-url',
        payload: {
          fileName: 'test-video.mp4',
          contentType: 'video/mp4',
          size: 600 * 1024 * 1024, // 600MB (over limit)
        },
      });

      expect(response.statusCode).toBe(400);
    });

    test('should reject missing required fields', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/videos/signed-url',
        payload: {
          fileName: 'test-video.mp4',
          // Missing contentType and size
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /videos/:videoId/confirm', () => {
    test('should confirm video upload', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/videos/test-video-id/confirm',
        payload: {
          duration: 30,
          fps: 30,
          resolution: {
            width: 1920,
            height: 1080,
          },
          metadata: {
            shootingAngle: 'front',
            court: 'Main Gym',
            lighting: 'indoor',
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.videoId).toBe('test-video-id');
      expect(body.data.status).toBe('ready');
    });
  });

  describe('GET /videos/:videoId', () => {
    test('should return video details with download URL', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/videos/test-video-id',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveProperty('id');
      expect(body.data).toHaveProperty('downloadUrl');
    });
  });

  describe('GET /videos', () => {
    test('should list user videos', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/videos?limit=10&offset=0',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveProperty('videos');
      expect(body.data).toHaveProperty('total');
      expect(Array.isArray(body.data.videos)).toBe(true);
    });

    test('should filter by status', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/videos?status=ready',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveProperty('videos');
    });
  });
});
