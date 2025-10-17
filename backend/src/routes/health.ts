import { FastifyRequest, FastifyReply } from 'fastify';

export interface HealthResponse {
  status: 'ok' | 'error';
  timestamp: string;
  version: string;
  uptime: number;
  environment: string;
  database?: {
    status: 'connected' | 'disconnected';
    latency?: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  requestId: string;
}

export const getHealthStatus = async (request: FastifyRequest, reply: FastifyReply) => {
  const requestId = request.headers['x-request-id'] as string;
  const memoryUsage = process.memoryUsage();
  
  try {
    // TODO: Add database connectivity check when Prisma is configured
    const health: HealthResponse = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      memory: {
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
      },
      requestId,
    };

    reply.status(200).send(health);
  } catch (error) {
    const errorHealth: HealthResponse = {
      status: 'error',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      memory: {
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
      },
      requestId,
    };

    reply.status(503).send(errorHealth);
  }
};
