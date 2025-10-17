import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import 'dotenv/config';
import { requestIdMiddleware, errorHandler } from './middleware';
import { getHealthStatus } from './routes/health';
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
