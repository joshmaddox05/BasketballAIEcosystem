# ADR-101: Signed Upload Flow (API)

**Date:** 2025-01-17  
**Status:** Accepted  
**Deciders:** Development Team  

## Context

T-101 requires implementing a signed upload flow for video files using AWS S3. This enables secure, direct-to-S3 uploads from the mobile app without exposing AWS credentials.

## Decision

Implement a pre-signed URL generation system with the following components:

### API Endpoints
- `POST /videos/signed-url` - Generate pre-signed URL for upload
- `GET /videos` - List user's videos
- `GET /videos/:key/download` - Generate download URL
- `GET /videos/:key/metadata` - Get video metadata
- `DELETE /videos/:key` - Delete video

### Security Model
- All endpoints require Firebase JWT authentication
- User ownership validation on all video operations
- Pre-signed URLs expire in 1 hour
- S3 objects stored with user-specific prefixes: `videos/{userId}/{videoId}/`

### Video Metadata
- Store metadata in S3 object metadata during upload
- Include: userId, videoId, originalName, duration, fps, angle
- Support video angles: front, side, 3quarter

## Implementation Details

### S3 Service (`/backend/src/services/s3.ts`)
- `generateSignedUploadUrl()` - Creates pre-signed PUT URLs
- `generateSignedDownloadUrl()` - Creates pre-signed GET URLs
- `deleteVideo()` - Removes videos from S3
- `getVideoMetadata()` - Retrieves object metadata
- `listUserVideos()` - Lists user's video objects

### Video Routes (`/backend/src/routes/video.ts`)
- Input validation for file types and metadata
- User authentication and authorization
- Error handling and logging
- OpenAPI schema definitions

### Supported Video Formats
- MP4 (video/mp4)
- QuickTime (video/quicktime)
- AVI (video/x-msvideo)
- 3GPP (video/3gpp)

## Consequences

### Positive
- Secure direct-to-S3 uploads
- No AWS credentials exposed to client
- Scalable video storage solution
- User-specific access control
- Comprehensive API for video management

### Negative
- Requires AWS S3 configuration
- Additional complexity for video management
- S3 costs scale with usage

### Risks
- S3 bucket misconfiguration could expose videos
- Pre-signed URL generation could be rate-limited
- Large video files may timeout during upload

### Mitigation
- Strict bucket policies and IAM roles
- Implement retry logic for URL generation
- Set appropriate upload timeouts
- Monitor S3 usage and costs

## Testing

### Unit Tests
- S3 service method testing with mocks
- Route validation and error handling
- Authentication and authorization checks

### Integration Tests
- End-to-end upload flow testing
- User ownership validation
- Error scenario testing

### Manual Testing
- Postman collection for API testing
- Mobile app integration testing
- Large file upload testing

## Monitoring

### Metrics
- Upload success/failure rates
- Upload duration and file sizes
- S3 API call frequency and errors
- User video storage usage

### Alerts
- High upload failure rates
- S3 service errors
- Unusual storage usage patterns

## Future Considerations

- Video transcoding pipeline integration
- Thumbnail generation
- Video compression optimization
- CDN integration for global delivery
- Video streaming capabilities

## Acceptance Criteria

✅ POST /videos/signed-url returns pre-signed URL with metadata  
✅ User ownership validation on all video operations  
✅ Comprehensive error handling and logging  
✅ OpenAPI documentation for all endpoints  
✅ Unit and integration tests passing  
✅ Support for multiple video formats  
✅ 1-hour URL expiration for security  
✅ Request ID tracking for debugging  

## How I Verified

1. **API Testing**: Used Postman to test all video endpoints
   ```bash
   # Test signed URL generation
   curl -X POST http://localhost:3000/videos/signed-url \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"fileName":"test.mp4","mimeType":"video/mp4"}'
   ```

2. **Unit Tests**: Ran test suite to verify functionality
   ```bash
   cd backend && npm test -- --testPathPattern=video.test.ts
   ```

3. **OpenAPI Docs**: Verified documentation at http://localhost:3000/docs

4. **Error Handling**: Tested various error scenarios (invalid mime types, missing auth, etc.)

5. **Security**: Verified user ownership validation prevents cross-user access
