import { FastifyRequest, FastifyReply } from 'fastify';

export interface UserProfileResponse {
  user: {
    uid: string;
    email?: string;
    role: string;
    emailVerified: boolean;
    createdAt: string;
  };
  requestId: string;
}

export const getUserProfile = async (request: FastifyRequest, reply: FastifyReply): Promise<UserProfileResponse> => {
  // User is guaranteed to exist because of auth middleware
  const user = request.user!;
  const requestId = request.headers['x-request-id'] as string;

  return {
    user: {
      uid: user.uid,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
      createdAt: new Date().toISOString(), // In real app, this would come from database
    },
    requestId,
  };
};

export interface UpdateUserRoleRequest {
  uid: string;
  role: 'free' | 'premium' | 'admin';
}

export const updateUserRole = async (request: FastifyRequest<{ Body: UpdateUserRoleRequest }>, reply: FastifyReply) => {
  const { uid, role } = request.body;
  const requestId = request.headers['x-request-id'] as string;
  const adminUser = request.user!;

  // Validate request
  if (!uid || !role) {
    return reply.status(400).send({
      error: {
        message: 'Missing uid or role in request body',
        statusCode: 400,
        requestId,
      },
    });
  }

  if (!['free', 'premium', 'admin'].includes(role)) {
    return reply.status(400).send({
      error: {
        message: 'Invalid role. Must be: free, premium, or admin',
        statusCode: 400,
        requestId,
      },
    });
  }

  // In a real application, this would update the user role in the database
  // and set custom claims in Firebase Auth
  request.log.info({
    adminUid: adminUser.uid,
    targetUid: uid,
    newRole: role,
    requestId,
  }, 'User role update requested');

  return {
    message: `User role updated to ${role}`,
    uid,
    role,
    updatedBy: adminUser.uid,
    requestId,
  };
};
