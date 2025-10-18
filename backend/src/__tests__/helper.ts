import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import swagger from '@fastify/swagger';
import { requestIdMiddleware, errorHandler } from '../middleware';
import { createAuthMiddleware } from '../middleware/auth';
import { getHealthStatus } from '../routes/health';
import { generateSignedUrl, confirmVideoUpload, getVideoMetadata, listUserVideos } from '../routes/videos';
import * as jwt from 'jsonwebtoken';

export async function build(opts = {}) {
  const app = Fastify({
    logger: false,
    ...opts
  });

  // Register middleware
  app.addHook('onRequest', requestIdMiddleware);
  app.setErrorHandler(errorHandler);

  // Register plugins
  app.register(cors, { origin: true });
  app.register(helmet);
  app.register(swagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'Basketball AI Test API',
        version: '1.0.0',
      },
    },
  });

  // Register routes
  app.get('/healthz', getHealthStatus);
  
  // Video routes (protected)
  app.post('/videos/signed-url', {
    preHandler: createAuthMiddleware({ required: true }),
  }, generateSignedUrl);
  
  app.post('/videos/:videoId/confirm', {
    preHandler: createAuthMiddleware({ required: true }),
  }, confirmVideoUpload);
  
  app.get('/videos/:videoId', {
    preHandler: createAuthMiddleware({ required: true }),
  }, getVideoMetadata);
  
  app.get('/videos', {
    preHandler: createAuthMiddleware({ required: true }),
  }, listUserVideos);

  app.get('/', async (request) => {
    const requestId = request.headers['x-request-id'] as string;
    return { 
      message: 'Basketball AI Ecosystem API',
      version: '1.0.0',
      docs: '/docs',
      requestId,
    };
  });

  return app;
}

// Test helper functions
export function createTestServer() {
  return build();
}

export function createMockUser() {
  return {
    uid: 'test-user-123',
    email: 'test@example.com',
    role: 'free',
    emailVerified: true,
  };
}

export function generateTestJWT(user: any) {
  // Return a simple test token that our mocked Firebase Auth will recognize
  return 'test-secret';
}
