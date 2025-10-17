import { FastifyRequest, FastifyReply } from 'fastify';
import { getFirebaseAuth } from '../services/firebase';

// Define user roles
export type UserRole = 'free' | 'premium' | 'admin';

// Extend Fastify request to include user info
declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      uid: string;
      email?: string;
      role: UserRole;
      emailVerified: boolean;
    };
  }
}

export interface AuthOptions {
  required?: boolean;
  roles?: UserRole[];
}

export const createAuthMiddleware = (options: AuthOptions = {}) => {
  const { required = true, roles = [] } = options;

  return async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      if (required) {
        return reply.status(401).send({
          error: {
            message: 'Missing or invalid authorization header',
            statusCode: 401,
            requestId: request.headers['x-request-id'],
          },
        });
      }
      // If auth is optional and no token provided, continue without user
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      const auth = getFirebaseAuth();
      const decodedToken = await auth.verifyIdToken(token);
      
      // Extract user information
      const user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        role: (decodedToken.role as UserRole) || 'free', // Default to 'free' role
        emailVerified: decodedToken.email_verified || false,
      };

      // Check role-based access
      if (roles.length > 0 && !roles.includes(user.role)) {
        return reply.status(403).send({
          error: {
            message: `Access denied. Required roles: ${roles.join(', ')}`,
            statusCode: 403,
            requestId: request.headers['x-request-id'],
          },
        });
      }

      // Attach user to request
      request.user = user;
      
      request.log.info({
        userId: user.uid,
        userEmail: user.email,
        userRole: user.role,
        requestId: request.headers['x-request-id'],
      }, 'User authenticated');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      
      request.log.error({
        error: errorMessage,
        requestId: request.headers['x-request-id'],
      }, 'JWT verification failed');

      if (required) {
        return reply.status(401).send({
          error: {
            message: 'Invalid or expired token',
            statusCode: 401,
            requestId: request.headers['x-request-id'],
          },
        });
      }
    }
  };
};

// Convenience middleware for different auth scenarios
export const requireAuth = createAuthMiddleware({ required: true });
export const optionalAuth = createAuthMiddleware({ required: false });
export const requirePremium = createAuthMiddleware({ required: true, roles: ['premium', 'admin'] });
export const requireAdmin = createAuthMiddleware({ required: true, roles: ['admin'] });
