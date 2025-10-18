import { FastifyInstance } from 'fastify';
import { server } from '../index';
import { validateShotDNAMetrics, generateSampleShotDNA } from '../middleware/shotdnaValidation';

describe('ShotDNA Metrics Validation', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = server;
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /shots/:videoId/metrics', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/shots/video123/metrics',
        payload: generateSampleShotDNA(),
      });

      expect(response.statusCode).toBe(401);
    });

    it('should validate required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/shots/video123/metrics',
        headers: {
          authorization: 'Bearer mock-token',
        },
        payload: {
          // Missing required fields
          release_ms: 540,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain('Invalid ShotDNA metrics format');
    });

    it('should validate numeric ranges', async () => {
      const invalidMetrics = {
        ...generateSampleShotDNA(),
        release_ms: 50, // Too low
        elbow_angle_deg: 200, // Too high
        consistency_score: 1.5, // Too high
      };

      const response = await app.inject({
        method: 'POST',
        url: '/shots/video123/metrics',
        headers: {
          authorization: 'Bearer mock-token',
        },
        payload: invalidMetrics,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.details).toBeDefined();
    });

    it('should validate tips array', async () => {
      const invalidMetrics = {
        ...generateSampleShotDNA(),
        tips: ['Short', 'This tip is way too long and exceeds the maximum character limit of 200 characters which should cause validation to fail because it is too long and should be rejected by the validation middleware'], // Too short and too long
      };

      const response = await app.inject({
        method: 'POST',
        url: '/shots/video123/metrics',
        headers: {
          authorization: 'Bearer mock-token',
        },
        payload: invalidMetrics,
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate model version format', async () => {
      const invalidMetrics = {
        ...generateSampleShotDNA(),
        model_version: 'Invalid Model Version!', // Invalid format
      };

      const response = await app.inject({
        method: 'POST',
        url: '/shots/video123/metrics',
        headers: {
          authorization: 'Bearer mock-token',
        },
        payload: invalidMetrics,
      });

      expect(response.statusCode).toBe(400);
    });

    it('should accept valid metrics', async () => {
      const validMetrics = generateSampleShotDNA();

      const response = await app.inject({
        method: 'POST',
        url: '/shots/video123/metrics',
        headers: {
          authorization: 'Bearer mock-token',
        },
        payload: validMetrics,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('shotId');
      expect(body).toHaveProperty('videoId', 'video123');
      expect(body).toHaveProperty('metrics');
      expect(body).toHaveProperty('processedAt');
      expect(body).toHaveProperty('requestId');
    });

    it('should validate optional fields when provided', async () => {
      const metricsWithOptional = {
        ...generateSampleShotDNA(),
        form_score: 0.85,
        timing_score: 0.72,
        overall_score: 0.78,
        improvements: ['elbow_angle', 'release_timing'],
        analysis_metadata: {
          processing_time_ms: 1250,
          video_fps: 30,
          detection_confidence: 0.92,
          shot_type: 'three_pointer',
          result: 'make',
        },
      };

      const response = await app.inject({
        method: 'POST',
        url: '/shots/video123/metrics',
        headers: {
          authorization: 'Bearer mock-token',
        },
        payload: metricsWithOptional,
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('GET /shots', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/shots',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should list user shots', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/shots',
        headers: {
          authorization: 'Bearer mock-token',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('shots');
      expect(body).toHaveProperty('requestId');
      expect(Array.isArray(body.shots)).toBe(true);
    });

    it('should filter by status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/shots?status=completed',
        headers: {
          authorization: 'Bearer mock-token',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.shots.every((shot: any) => shot.status === 'completed')).toBe(true);
    });
  });

  describe('GET /shots/:shotId', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/shots/shot123',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should get specific shot analysis', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/shots/shot123',
        headers: {
          authorization: 'Bearer mock-token',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('shotId', 'shot123');
      expect(body).toHaveProperty('metrics');
      expect(body).toHaveProperty('requestId');
    });
  });

  describe('ShotDNA Validation Helper Functions', () => {
    it('should generate valid sample metrics', () => {
      const sample = generateSampleShotDNA();
      
      expect(sample).toHaveProperty('release_ms');
      expect(sample).toHaveProperty('elbow_angle_deg');
      expect(sample).toHaveProperty('wrist_flick_deg_s');
      expect(sample).toHaveProperty('arc_proxy_deg');
      expect(sample).toHaveProperty('consistency_score');
      expect(sample).toHaveProperty('tips');
      expect(sample).toHaveProperty('model_version');
      
      expect(Array.isArray(sample.tips)).toBe(true);
      expect(sample.tips.length).toBeGreaterThan(0);
      expect(sample.tips.length).toBeLessThanOrEqual(5);
    });
  });
});
