import { build } from './helper';

describe('Health endpoint', () => {
  it('should return health status with 200', async () => {
    const app = await build();

    const response = await app.inject({
      method: 'GET',
      url: '/healthz',
    });

    expect(response.statusCode).toBe(200);
    
    const body = JSON.parse(response.body);
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeDefined();
    expect(body.version).toBeDefined();
    expect(body.uptime).toBeGreaterThanOrEqual(0);
    expect(body.environment).toBeDefined();
    expect(body.memory).toBeDefined();
    expect(body.memory.used).toBeGreaterThan(0);
    expect(body.memory.total).toBeGreaterThan(0);
    expect(body.memory.percentage).toBeGreaterThan(0);
    expect(body.requestId).toBeDefined();
    
    // Verify request ID is included in response header
    expect(response.headers['x-request-id']).toBeDefined();
  });

  it('should include request ID in response', async () => {
    const app = await build();
    const customRequestId = 'test-request-id-123';

    const response = await app.inject({
      method: 'GET',
      url: '/healthz',
      headers: {
        'x-request-id': customRequestId,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['x-request-id']).toBe(customRequestId);
    
    const body = JSON.parse(response.body);
    expect(body.requestId).toBe(customRequestId);
  });
});
