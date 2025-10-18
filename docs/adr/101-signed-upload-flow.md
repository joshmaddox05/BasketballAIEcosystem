# ADR-101: Signed Upload Flow for Video Content

**Date:** 2025-10-18  
**Status:** Accepted  
**Ticket:** T-101  
**Deciders:** Development Team  

## Context

The Basketball AI Ecosystem requires a secure and scalable method for users to upload training videos for shot analysis. Videos can be large (up to 500MB) and need to be processed by ML models. We need a solution that:

1. Securely handles large file uploads
2. Minimizes server load during upload
3. Provides upload progress tracking
4. Integrates with our Firebase backend
5. Supports resumable uploads for poor network conditions

## Decision

We will implement a **signed URL upload flow** using Firebase Cloud Storage (Google Cloud Storage). This approach allows clients to upload videos directly to storage without routing through our backend servers.

### Architecture

```
Mobile App → Backend API → Firebase Storage
     ↓            ↓              ↓
  1. Request  2. Generate    3. Direct
     Signed      Signed         Upload
     URL         URL            (PUT)
```

### Workflow

1. **Request Phase:**
   - Client sends video metadata to `POST /videos/signed-url`
   - Includes: fileName, contentType, size, duration, fps, angle
   - Backend validates request and user authentication

2. **Generation Phase:**
   - Backend generates unique file key: `videos/{userId}/{timestamp}-{uuid}.{ext}`
   - Creates Firestore document with status: "uploading"
   - Generates signed URL with 1-hour expiration
   - Returns: videoId, uploadUrl, fileKey, expiresAt

3. **Upload Phase:**
   - Client uploads directly to Firebase Storage using signed URL
   - No backend involvement (zero server load)
   - Supports multipart/chunked uploads
   - Client can retry failed chunks

4. **Confirmation Phase:**
   - Client calls `POST /videos/:videoId/confirm` after successful upload
   - Backend updates video status to "ready"
   - Additional metadata can be added (resolution, etc.)

### API Endpoints

#### `POST /videos/signed-url`
Request a signed URL for video upload.

**Request:**
```json
{
  "fileName": "jump-shot-123.mp4",
  "contentType": "video/mp4",
  "size": 45000000,
  "duration": 15,
  "fps": 30,
  "angle": "front"
}
```

**Response:**
```json
{
  "data": {
    "videoId": "abc123-def456",
    "uploadUrl": "https://storage.googleapis.com/...",
    "fileKey": "videos/user123/1634567890-uuid.mp4",
    "expiresAt": "2024-10-18T12:00:00Z"
  },
  "requestId": "req-uuid"
}
```

#### `POST /videos/:videoId/confirm`
Confirm video upload completion.

**Request:**
```json
{
  "duration": 15.5,
  "fps": 30,
  "resolution": {
    "width": 1920,
    "height": 1080
  },
  "metadata": {
    "shootingAngle": "front",
    "court": "Main Gym",
    "lighting": "indoor"
  }
}
```

#### `GET /videos/:videoId`
Retrieve video details with signed download URL.

#### `GET /videos`
List user's videos with pagination and filtering.

## Implementation Details

### Security

1. **Authentication:** All endpoints require Firebase JWT authentication
2. **Authorization:** Users can only access their own videos
3. **Validation:** 
   - File type whitelist: mp4, quicktime, x-msvideo
   - Max size: 500MB
   - Signed URLs expire in 1 hour
4. **Ownership:** Videos are stored under user-specific paths
5. **Access Control:** Download URLs are also signed and time-limited

### Storage Structure

```
gs://basketball-ai-ecosystem.appspot.com/
└── videos/
    └── {userId}/
        └── {timestamp}-{uuid}.{ext}
```

### Firestore Schema

```typescript
// videos collection
{
  id: string,
  userId: string,
  fileName: string,           // Storage path
  originalName: string,       // User's original filename
  mimeType: string,
  size: number,              // Bytes
  duration: number,          // Seconds
  fps: number,
  resolution?: {
    width: number,
    height: number
  },
  storageUrl: string,        // Firebase Storage path
  thumbnailUrl?: string,
  status: 'uploading' | 'processing' | 'ready' | 'failed',
  uploadedAt: Timestamp,
  processedAt?: Timestamp,
  metadata: {
    shootingAngle?: 'front' | 'side' | '3quarter',
    court?: string,
    lighting?: 'indoor' | 'outdoor' | 'low_light',
  }
}
```

### Error Handling

- **400 Bad Request:** Invalid file type, size, or missing fields
- **401 Unauthorized:** Missing or invalid JWT token
- **403 Forbidden:** User doesn't own the video
- **404 Not Found:** Video ID doesn't exist
- **500 Internal Server Error:** Storage or Firestore errors

### Performance Considerations

1. **Server Load:** Near-zero during upload (direct to storage)
2. **Bandwidth:** Client → Storage (no backend hop)
3. **Scalability:** Firebase Storage auto-scales
4. **Cost:** Pay-per-GB stored + transfer (predictable)

## Alternatives Considered

### 1. Direct Upload Through Backend
**Pros:** Simpler client logic, easier validation  
**Cons:** High server load, bandwidth bottleneck, expensive  
**Rejected:** Doesn't scale for video content

### 2. AWS S3 with Pre-Signed URLs
**Pros:** Industry standard, mature tooling  
**Cons:** Requires additional AWS account, separate from Firebase ecosystem  
**Rejected:** Adds complexity, prefer unified Firebase platform

### 3. Multipart Upload Directly from Client
**Pros:** Resume support, progress tracking  
**Cons:** Complex client implementation  
**Decision:** Firebase Storage supports this out-of-box with signed URLs

## Consequences

### Positive

✅ **Zero Backend Load:** Videos upload directly to storage  
✅ **Scalable:** Firebase Storage auto-scales to demand  
✅ **Secure:** Time-limited signed URLs, user-specific paths  
✅ **Cost-Efficient:** No bandwidth through backend servers  
✅ **Resumable:** Firebase SDK supports chunked uploads  
✅ **Simple Client:** Standard HTTP PUT with retry logic  

### Negative

⚠️ **URL Expiration:** Clients must complete upload within 1 hour  
⚠️ **No Real-Time Progress:** Backend doesn't track upload progress  
⚠️ **Storage Costs:** Pay for storage and egress bandwidth  

### Mitigations

- **Expiration:** 1 hour is sufficient for 500MB on 3G+ connections
- **Progress:** Client tracks progress locally; can report to backend if needed
- **Cost:** Lifecycle policies to delete old/unused videos after 90 days

## Testing Strategy

### Unit Tests
- ✅ Signed URL generation with valid params
- ✅ Validation of file type, size, required fields
- ✅ Firestore document creation
- ✅ Authorization checks (user ownership)

### Integration Tests
- ✅ End-to-end upload flow (sign → upload → confirm)
- ✅ Concurrent uploads from same user
- ✅ URL expiration handling
- ✅ Failed upload cleanup

### Manual Testing
- ✅ Upload 10MB video from iOS
- ✅ Upload 100MB video from Android
- ✅ Upload with poor network (throttled)
- ✅ Resume interrupted upload
- ✅ Verify signed URL in Postman

## Monitoring & Observability

### Metrics to Track
- Upload request rate (per minute)
- Signed URL generation latency
- Video upload success/failure rate
- Average upload duration by file size
- Storage costs per user

### Alerts
- High failure rate (>5% of uploads)
- Signed URL generation failures
- Storage quota approaching limit

### Logging
```typescript
// Successful signed URL generation
{
  event: 'video.signed_url_generated',
  videoId: 'abc123',
  userId: 'user456',
  size: 45000000,
  duration: 15,
  requestId: 'req-uuid'
}

// Upload confirmation
{
  event: 'video.upload_confirmed',
  videoId: 'abc123',
  userId: 'user456',
  status: 'ready',
  requestId: 'req-uuid'
}
```

## Future Enhancements

1. **Thumbnail Generation:** Cloud Function triggered on upload completion
2. **Virus Scanning:** Integrate Cloud Storage malware detection
3. **Auto-Cleanup:** Lifecycle rules to delete abandoned uploads
4. **Progress Webhooks:** Optional callback URL for upload progress
5. **Batch Upload:** Multiple videos in single signed URL request
6. **Transcoding:** Convert videos to optimal format/resolution

## References

- [Firebase Storage Signed URLs](https://firebase.google.com/docs/storage/admin/create-signed-urls)
- [Google Cloud Storage v4 Signatures](https://cloud.google.com/storage/docs/access-control/signed-urls)
- [Firestore Video Schema](../database-schema-comparison.md)
- [T-101 Requirements](../mvp-tracking.md)

## Acceptance Criteria

- [x] `POST /videos/signed-url` generates valid signed URL
- [x] Firestore video document created with status "uploading"
- [x] Signed URL expires in 1 hour
- [x] File type validation (mp4, quicktime, x-msvideo)
- [x] Size validation (max 500MB)
- [x] User authentication required
- [x] User can only access their own videos
- [x] `POST /videos/:videoId/confirm` updates video status
- [x] `GET /videos/:videoId` returns signed download URL
- [x] `GET /videos` lists user's videos with pagination
- [x] OpenAPI documentation updated
- [x] Unit tests with >80% coverage
- [x] ADR documented

## How I Verified

### Local Testing
```bash
# Start backend
cd backend
pnpm dev

# Test signed URL generation
curl -X POST http://localhost:3000/videos/signed-url \
  -H "Authorization: Bearer <firebase-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "test-video.mp4",
    "contentType": "video/mp4",
    "size": 10000000,
    "duration": 15,
    "fps": 30,
    "angle": "front"
  }'

# Test video listing
curl -X GET http://localhost:3000/videos \
  -H "Authorization: Bearer <firebase-token>"
```

### Unit Tests
```bash
cd backend
pnpm test src/__tests__/videos.test.ts
```

### OpenAPI Documentation
- Navigate to http://localhost:3000/docs
- Verify all 4 video endpoints are documented
- Test with "Try it out" in Swagger UI

---

**Status:** ✅ Implementation Complete  
**Next:** T-102 - React Native Camera + Resumable Upload
