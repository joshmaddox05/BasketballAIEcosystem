// Mock uuid module to avoid ES module issues
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-123'),
}));

// Mock Firebase Admin SDK for testing
jest.mock('firebase-admin/app', () => ({
  getApps: jest.fn(() => []),
  initializeApp: jest.fn(),
  cert: jest.fn(),
}));

jest.mock('firebase-admin/auth', () => ({
  getAuth: jest.fn(() => ({
    verifyIdToken: jest.fn(async (token: string) => {
      // Mock JWT verification - decode the test token
      if (token.startsWith('test-token-')) {
        return {
          uid: 'test-user-123',
          email: 'test@example.com',
          role: 'free',
          email_verified: true,
        };
      }
      throw new Error('Invalid token');
    }),
  })),
}));

jest.mock('firebase-admin/storage', () => ({
  getStorage: jest.fn(() => ({
    bucket: jest.fn(() => ({
      file: jest.fn((key: string) => ({
        getSignedUrl: jest.fn(async () => [
          `https://storage.googleapis.com/test-bucket/${key}?signed=true`,
        ]),
      })),
      getFiles: jest.fn(async () => [
        [
          {
            name: 'videos/test-user-123/test-video.mp4',
            getSignedUrl: jest.fn(async () => [
              'https://storage.googleapis.com/test-bucket/download-url',
            ]),
          },
        ],
      ]),
    })),
  })),
}));

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => ({
    collection: jest.fn((collectionName: string) => ({
      doc: jest.fn((docId: string) => ({
        set: jest.fn(async () => ({})),
        get: jest.fn(async () => ({
          exists: true,
          data: jest.fn(() => ({
            videoId: docId,
            userId: 'test-user-123',
            filename: 'test-video.mp4',
            contentType: 'video/mp4',
            fileSize: 10 * 1024 * 1024,
            status: 'uploading',
            uploadedAt: new Date().toISOString(),
          })),
        })),
        update: jest.fn(async () => ({})),
      })),
      where: jest.fn(() => ({
        orderBy: jest.fn(() => ({
          limit: jest.fn(() => ({
            offset: jest.fn(() => ({
              get: jest.fn(async () => ({
                docs: [
                  {
                    id: 'video-1',
                    data: jest.fn(() => ({
                      videoId: 'video-1',
                      filename: 'video1.mp4',
                      status: 'uploading',
                      uploadedAt: new Date().toISOString(),
                    })),
                  },
                ],
              })),
            })),
          })),
        })),
      })),
    })),
  })),
}));

// Mock the Firebase initialization
jest.mock('../services/firebase', () => ({
  initializeFirebase: jest.fn(),
  getFirebaseAuth: jest.fn(() => ({
    verifyIdToken: jest.fn(async (token: string) => {
      if (token === 'test-secret') {
        return {
          uid: 'test-user-123',
          email: 'test@example.com',
          role: 'free',
          email_verified: true,
        };
      }
      throw new Error('Invalid token');
    }),
  })),
}));