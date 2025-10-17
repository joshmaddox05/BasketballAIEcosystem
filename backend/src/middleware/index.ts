import { FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';

export const requestIdMiddleware = async (request: FastifyRequest, reply: FastifyReply) => {
  const requestId = request.headers['x-request-id'] as string || uuidv4();
  request.headers['x-request-id'] = requestId;
  reply.header('x-request-id', requestId);
};

export const errorHandler = async (error: Error, request: FastifyRequest, reply: FastifyReply) => {
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
