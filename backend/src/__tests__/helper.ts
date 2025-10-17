import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import swagger from '@fastify/swagger';
import { requestIdMiddleware, errorHandler } from '../middleware';
import { getHealthStatus } from '../routes/health';

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
