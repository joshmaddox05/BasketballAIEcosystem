# ADR-101: Signed Upload Flow (API)

**Date:** 2025-10-18  
**Status:** Accepted  
**Deciders:** Development Team  
**Ticket:** T-101

## Context

We need to implement a secure video upload flow that allows users to upload basketball shot videos for AI analysis. The system must:

1. Generate secure, time-limited upload URLs
2. Store video metadata in Firestore
3. Support large video files (up to 500MB)
4. Provide proper authentication and authorization
5. Track upload status and provide download URLs

## Decision

### Architecture

We've implemented a signed URL-based upload flow using Firebase Storage with the following endpoints:

#### POST /videos/signed-url
- Generates signed URLs for direct upload to Firebase Storage
- Validates file type (video/mp4, video/mov, video/avi, video/quicktime)
- Enforces file size limits (max 500MB)
- Creates video metadata record in Firestore
- Returns upload URL, video ID, and expiration time

#### POST /videos/:videoId/confirm
- Confirms successful upload completion
- Generates signed download URL (7-day expiration)
- Updates video status to 'uploaded'
- Verifies file exists in storage

#### GET /videos/:videoId
- Retrieves video metadata for authenticated user
- Enforces ownership validation
- Returns complete video information

#### GET /videos
- Lists user's videos with pagination
- Supports filtering by status
- Limits results (max 100 per request)
- Orders by upload date (newest first)

### Security Measures

1. **Authentication**: All endpoints require valid Firebase JWT tokens
2. **Authorization**: Users can only access their own videos
3. **Validation**: Strict input validation using Zod schemas
4. **Time Limits**: Upload URLs expire in 1 hour, download URLs in 7 days
5. **File Restrictions**: Content-type and size validation

### Data Model

```typescript
interface VideoMetadata {
  videoId: string;           // UUID
  userId: string;            // Firebase user ID
  filename: string;          // Original filename
  contentType: string;       // MIME type
  fileSize: number;          // Size in bytes
  duration?: number;         // Video duration in seconds
  fps?: number;              // Frames per second
  angle?: 'front' | 'side' | 'overhead'; // Camera angle
  uploadedAt: string;        // ISO timestamp
  status: 'uploading' | 'uploaded' | 'processing' | 'processed' | 'failed';
  downloadUrl?: string;      // Signed download URL
}
```

### Storage Structure

Videos are stored in Firebase Storage with the following key pattern:
```
videos/{userId}/{timestamp}-{videoId}.{extension}
```

This ensures:
- User isolation
- Unique file names
- Easy cleanup and organization
- Chronological ordering

## Consequences

### Positive
- **Scalable**: Direct uploads to Firebase Storage reduce server load
- **Secure**: Time-limited signed URLs prevent unauthorized access
- **Efficient**: Large files don't pass through our API servers
- **Trackable**: Complete audit trail of upload lifecycle
- **Flexible**: Supports various video formats and metadata

### Negative
- **Complexity**: Two-step upload process (get URL, then upload)
- **Storage Costs**: Firebase Storage pricing for large video files
- **Client Logic**: Mobile app must handle upload progress and retry logic

### Risks & Mitigations
- **Incomplete Uploads**: Orphaned metadata records → Cleanup job needed
- **Storage Abuse**: File size limits and user quotas → Rate limiting
- **Failed Confirmations**: Manual recovery process → Admin tools needed

## Implementation Details

### Request/Response Examples

**Generate Signed URL:**
```bash
POST /videos/signed-url
Authorization: Bearer <firebase-jwt>
Content-Type: application/json

{
  "filename": "basketball-shot.mp4",
  "contentType": "video/mp4",
  "fileSize": 10485760,
  "duration": 30,
  "fps": 30,
  "angle": "front"
}
```

**Response:**
```json
{
  "uploadUrl": "https://storage.googleapis.com/bucket/videos/user123/2025-10-18T10-30-00-uuid.mp4?signed=true",
  "videoId": "550e8400-e29b-41d4-a716-446655440000",
  "key": "videos/user123/2025-10-18T10-30-00-uuid.mp4",
  "expiresAt": "2025-10-18T11:30:00.000Z",
  "requestId": "req-123"
}
```

### Error Handling

- **400 Bad Request**: Invalid file type, size, or missing fields
- **401 Unauthorized**: Missing or invalid JWT token
- **403 Forbidden**: Access denied (wrong user)
- **404 Not Found**: Video not found
- **500 Internal Server Error**: Firebase or server errors

### Testing Strategy

1. **Unit Tests**: Input validation, auth middleware, error handling
2. **Integration Tests**: Firebase Storage and Firestore operations
3. **Load Tests**: Large file uploads and concurrent requests
4. **Security Tests**: Authorization bypass attempts

## Next Steps

1. **T-102**: Implement React Native camera integration and upload UI
2. **T-103**: Define ShotDNA metrics JSON contract for AI analysis
3. **Monitoring**: Add upload success/failure metrics
4. **Cleanup**: Implement orphaned file cleanup job
5. **Quotas**: Add user storage limits and usage tracking

## References

- [Firebase Storage Signed URLs](https://firebase.google.com/docs/storage/web/download-files#download_data_via_url)
- [Video Upload Best Practices](https://web.dev/fast-video-uploads/)
- [T-102: RN Camera + Resumable Upload](./102-rn-camera-upload.md) (Next)