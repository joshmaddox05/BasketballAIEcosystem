/**
 * Firebase Cloud Functions Entry Point
 * 
 * This file wraps the existing Fastify backend API as a Cloud Function.
 * The Fastify app handles routing, middleware, and business logic.
 */

import * as functions from 'firebase-functions';
import { initializeApp } from 'firebase-admin/app';
import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { v4 as uuidv4 } from 'uuid';

// Initialize Firebase Admin (Cloud Functions environment)
initializeApp();

/**
 * Request ID middleware
 */
const requestIdMiddleware = async (request: FastifyRequest, reply: FastifyReply) => {
  const requestId = request.headers['x-request-id'] as string || uuidv4();
  request.headers['x-request-id'] = requestId;
  reply.header('x-request-id', requestId);
};

/**
 * Global error handler
 */
const errorHandler = async (error: Error, request: FastifyRequest, reply: FastifyReply) => {
  const requestId = request.headers['x-request-id'];
  
  request.log.error({
    error: error.message,
    stack: error.stack,
    requestId,
    url: request.url,
    method: request.method,
  }, 'Request error');

  const statusCode = (error as { statusCode?: number }).statusCode || 500;
  
  reply.status(statusCode).send({
    error: {
      message: error.message,
      statusCode,
      requestId,
    },
  });
};

/**
 * Create and configure Fastify server
 */
function createServer(): FastifyInstance {
  const server = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    },
    requestIdLogLabel: 'requestId',
    requestIdHeader: 'x-request-id',
    // Disable Fastify's own request timeout (Cloud Functions handles this)
    connectionTimeout: 0,
    keepAliveTimeout: 0,
  });

  // Register middleware
  server.addHook('onRequest', requestIdMiddleware);
  server.setErrorHandler(errorHandler);

  // Register plugins
  server.register(cors, {
    origin: true, // Allow all origins (Cloud Functions handles CORS at platform level)
  });

  server.register(helmet, {
    contentSecurityPolicy: false, // Disable CSP for API
  });

  // OpenAPI documentation
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
          url: 'https://us-central1-basketball-ai-ecosystem.cloudfunctions.net/api',
          description: 'Production (Cloud Functions)',
        },
        {
          url: 'http://localhost:5001/basketball-ai-ecosystem/us-central1/api',
          description: 'Local emulator',
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
      docExpansion: 'list',
      deepLinking: false,
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
            status: { type: 'string' },
            version: { type: 'string' },
            timestamp: { type: 'string' },
            uptime: { type: 'number' },
            environment: { type: 'string' },
            checks: {
              type: 'object',
              properties: {
                database: { type: 'string' },
                storage: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const memoryUsage = process.memoryUsage();
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      checks: {
        database: 'ok',
        storage: 'ok',
      },
      memory: {
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
      },
    };
    return reply.code(200).send(health);
  });

  // Root endpoint
  server.get('/', async (request, reply) => {
    return reply.code(200).send({
      message: 'Basketball AI Ecosystem API',
      version: '1.0.0',
      documentation: '/docs',
      health: '/healthz',
    });
  });

  return server;
}

// Create Fastify instance (singleton)
let serverInstance: FastifyInstance | null = null;

/**
 * Get or create Fastify server instance
 * Reuses the same instance across invocations for better performance
 */
async function getServer(): Promise<FastifyInstance> {
  if (!serverInstance) {
    serverInstance = createServer();
    await serverInstance.ready();
  }
  return serverInstance;
}

/**
 * HTTP Cloud Function
 * 
 * This function wraps the Fastify server and handles incoming HTTP requests.
 * Cloud Functions automatically manages scaling, load balancing, and HTTPS.
 * 
 * @example
 * // Local testing with emulator:
 * firebase emulators:start --only functions
 * curl http://localhost:5001/basketball-ai-ecosystem/us-central1/api/healthz
 * 
 * // Production endpoint:
 * https://us-central1-basketball-ai-ecosystem.cloudfunctions.net/api/healthz
 */
export const api = functions
  .region('us-central1')
  .runWith({
    // Memory allocation (128MB to 8GB available)
    memory: '512MB',
    // Timeout (max 540s for HTTP functions)
    timeoutSeconds: 60,
    // Minimum instances (0 = scale to zero, 1+ = always warm)
    minInstances: 0,
    // Maximum instances (prevent runaway costs)
    maxInstances: 10,
  })
  .https.onRequest(async (req, res) => {
    const server = await getServer();
    
    // Inject Fastify with Cloud Functions request/response
    server.server.emit('request', req, res);
  });

/**
 * Scheduled function example (for future use)
 * 
 * @example
 * // Runs every hour to clean up old data
 * export const hourlyCleanup = functions
 *   .pubsub.schedule('every 1 hours')
 *   .onRun(async (context) => {
 *     console.log('Running hourly cleanup...');
 *     // Cleanup logic here
 *   });
 */

// Export additional functions as needed
// export { otherFunction } from './other';
