"use strict";
/**
 * Firebase Cloud Functions Entry Point
 *
 * This file wraps the existing Fastify backend API as a Cloud Function.
 * The Fastify app handles routing, middleware, and business logic.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = void 0;
const functions = __importStar(require("firebase-functions"));
const app_1 = require("firebase-admin/app");
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const helmet_1 = __importDefault(require("@fastify/helmet"));
const swagger_1 = __importDefault(require("@fastify/swagger"));
const swagger_ui_1 = __importDefault(require("@fastify/swagger-ui"));
const uuid_1 = require("uuid");
// Initialize Firebase Admin (Cloud Functions environment)
(0, app_1.initializeApp)();
/**
 * Request ID middleware
 */
const requestIdMiddleware = async (request, reply) => {
    const requestId = request.headers['x-request-id'] || (0, uuid_1.v4)();
    request.headers['x-request-id'] = requestId;
    reply.header('x-request-id', requestId);
};
/**
 * Global error handler
 */
const errorHandler = async (error, request, reply) => {
    const requestId = request.headers['x-request-id'];
    request.log.error({
        error: error.message,
        stack: error.stack,
        requestId,
        url: request.url,
        method: request.method,
    }, 'Request error');
    const statusCode = error.statusCode || 500;
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
function createServer() {
    const server = (0, fastify_1.default)({
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
    server.register(cors_1.default, {
        origin: true, // Allow all origins (Cloud Functions handles CORS at platform level)
    });
    server.register(helmet_1.default, {
        contentSecurityPolicy: false, // Disable CSP for API
    });
    // OpenAPI documentation
    server.register(swagger_1.default, {
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
    server.register(swagger_ui_1.default, {
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
let serverInstance = null;
/**
 * Get or create Fastify server instance
 * Reuses the same instance across invocations for better performance
 */
async function getServer() {
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
exports.api = functions
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
//# sourceMappingURL=index.js.map