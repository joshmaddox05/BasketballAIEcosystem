import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import 'dotenv/config';
import { requestIdMiddleware, errorHandler } from './middleware';
import { createAuthMiddleware } from './middleware/auth';
import { getHealthStatus } from './routes/health';
import { generateSignedUrl, confirmVideoUpload, getVideoMetadata, listUserVideos } from './routes/videos';
import { initializeFirebase } from './services/firebase';

const server = Fastify({
  logger: true,
  requestIdLogLabel: 'requestId',
  requestIdHeader: 'x-request-id',
});

// Initialize Firebase Admin SDK
try {
  initializeFirebase();
  server.log.info('Firebase Admin SDK initialized');
} catch (error) {
  server.log.warn('Firebase Admin SDK initialization failed (may be in test mode)');
}

// Register middleware
server.addHook('onRequest', requestIdMiddleware);
server.setErrorHandler(errorHandler);

// Register plugins
server.register(cors, {
  origin: true,
});

server.register(helmet);

server.register(swagger, {
  openapi: {
    openapi: '3.0.0',
    info: {
      title: 'Basketball AI Ecosystem API',
      description: 'API for basketball training app with AI jump-shot analysis, training blueprints, and community features',
      version: '1.0.0',
      contact: {
        name: 'Basketball AI Team',
        email: 'support@basketballai.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://api-staging.basketballai.com',
        description: 'Staging server',
      },
      {
        url: 'https://api.basketballai.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Firebase JWT token',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
});

server.register(swaggerUi, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'full',
    deepLinking: false,
  },
  uiHooks: {
    onRequest: function (request, reply, next) {
      next();
    },
    preHandler: function (request, reply, next) {
      next();
    },
  },
});

// Health check endpoint
server.get('/healthz', {
  schema: {
    description: 'Health check endpoint for monitoring and load balancers',
    tags: ['Health'],
    response: {
      200: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['ok'] },
          timestamp: { type: 'string', format: 'date-time' },
          version: { type: 'string' },
          uptime: { type: 'number' },
          environment: { type: 'string' },
          memory: {
            type: 'object',
            properties: {
              used: { type: 'number' },
              total: { type: 'number' },
              percentage: { type: 'number' },
            },
          },
          requestId: { type: 'string', format: 'uuid' },
        },
      },
      503: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['error'] },
          timestamp: { type: 'string', format: 'date-time' },
          version: { type: 'string' },
          uptime: { type: 'number' },
          environment: { type: 'string' },
          memory: {
            type: 'object',
            properties: {
              used: { type: 'number' },
              total: { type: 'number' },
              percentage: { type: 'number' },
            },
          },
          requestId: { type: 'string', format: 'uuid' },
        },
      },
    },
  },
}, getHealthStatus);

// Video upload routes (protected)
server.post('/videos/signed-url', {
  preHandler: createAuthMiddleware({ required: true }),
  schema: {
    description: 'Generate signed URL for video upload to Firebase Storage',
    tags: ['Videos'],
    security: [{ bearerAuth: [] }],
    body: {
      type: 'object',
      required: ['filename', 'contentType', 'fileSize'],
      properties: {
        filename: { type: 'string', minLength: 1, maxLength: 255 },
        contentType: { 
          type: 'string', 
          pattern: '^video/(mp4|mov|avi|quicktime)$',
          description: 'Video MIME type'
        },
        fileSize: { 
          type: 'number', 
          minimum: 1, 
          maximum: 500 * 1024 * 1024,
          description: 'File size in bytes (max 500MB)'
        },
        duration: { type: 'number', description: 'Video duration in seconds' },
        fps: { type: 'number', description: 'Frames per second' },
        angle: { 
          type: 'string', 
          enum: ['front', 'side', 'overhead'],
          description: 'Camera angle for shot analysis'
        },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          uploadUrl: { type: 'string', format: 'uri' },
          videoId: { type: 'string', format: 'uuid' },
          key: { type: 'string' },
          expiresAt: { type: 'string', format: 'date-time' },
          requestId: { type: 'string', format: 'uuid' },
        },
      },
    },
  },
}, generateSignedUrl);

server.post('/videos/:videoId/confirm', {
  preHandler: createAuthMiddleware({ required: true }),
  schema: {
    description: 'Confirm video upload completion',
    tags: ['Videos'],
    security: [{ bearerAuth: [] }],
    params: {
      type: 'object',
      properties: {
        videoId: { type: 'string', format: 'uuid' },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          videoId: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: ['uploaded'] },
          downloadUrl: { type: 'string', format: 'uri' },
          requestId: { type: 'string', format: 'uuid' },
        },
      },
    },
  },
}, confirmVideoUpload);

server.get('/videos/:videoId', {
  preHandler: createAuthMiddleware({ required: true }),
  schema: {
    description: 'Get video metadata',
    tags: ['Videos'],
    security: [{ bearerAuth: [] }],
    params: {
      type: 'object',
      properties: {
        videoId: { type: 'string', format: 'uuid' },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          videoId: { type: 'string', format: 'uuid' },
          userId: { type: 'string' },
          filename: { type: 'string' },
          contentType: { type: 'string' },
          fileSize: { type: 'number' },
          duration: { type: 'number' },
          fps: { type: 'number' },
          angle: { type: 'string', enum: ['front', 'side', 'overhead'] },
          uploadedAt: { type: 'string', format: 'date-time' },
          status: { 
            type: 'string', 
            enum: ['uploading', 'uploaded', 'processing', 'processed', 'failed'] 
          },
          downloadUrl: { type: 'string', format: 'uri' },
          requestId: { type: 'string', format: 'uuid' },
        },
      },
    },
  },
}, getVideoMetadata);

server.get('/videos', {
  preHandler: createAuthMiddleware({ required: true }),
  schema: {
    description: 'List user videos with pagination',
    tags: ['Videos'],
    security: [{ bearerAuth: [] }],
    querystring: {
      type: 'object',
      properties: {
        limit: { type: 'string', pattern: '^[0-9]+$', description: 'Max 100' },
        offset: { type: 'string', pattern: '^[0-9]+$' },
        status: { 
          type: 'string', 
          enum: ['uploading', 'uploaded', 'processing', 'processed', 'failed'] 
        },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          videos: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                videoId: { type: 'string', format: 'uuid' },
                filename: { type: 'string' },
                contentType: { type: 'string' },
                fileSize: { type: 'number' },
                status: { type: 'string' },
                uploadedAt: { type: 'string', format: 'date-time' },
                downloadUrl: { type: 'string', format: 'uri' },
              },
            },
          },
          total: { type: 'number' },
          limit: { type: 'number' },
          offset: { type: 'number' },
          requestId: { type: 'string', format: 'uuid' },
        },
      },
    },
  },
}, listUserVideos);

// Root endpoint
server.get('/', {
  schema: {
    description: 'API information and available endpoints',
    tags: ['Info'],
    response: {
      200: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          version: { type: 'string' },
          docs: { type: 'string' },
          requestId: { type: 'string', format: 'uuid' },
        },
      },
    },
  },
}, async (request) => {
  const requestId = request.headers['x-request-id'] as string;
  return { 
    message: 'Basketball AI Ecosystem API',
    version: '1.0.0',
    docs: '/docs',
    requestId,
  };
});

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3000;
    const host = process.env.HOST || '0.0.0.0';
    
    await server.listen({ port, host });
    server.log.info(`🚀 Server ready at http://${host}:${port}`);
    server.log.info(`📚 API docs available at http://${host}:${port}/docs`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
