# ADR-102: RN Camera + Resumable Upload

**Date:** 2025-01-17  
**Status:** Accepted  
**Deciders:** Development Team  

## Context

T-102 requires implementing camera functionality in the React Native app with resumable upload capabilities. This includes video recording, preview, background upload with progress tracking, and retry logic for interrupted uploads.

## Decision

Implement a comprehensive camera and upload system with the following components:

### Camera Screen (`/src/screens/CameraScreen.tsx`)
- Full-screen camera interface using expo-camera
- Video recording with 30-second max duration
- Real-time recording duration display
- Camera flip functionality (front/back)
- Recording controls with visual feedback

### Video Upload Service (`/src/services/videoUpload.ts`)
- Singleton service for managing video uploads
- Retry logic with exponential backoff
- Progress tracking and callbacks
- Upload cancellation support
- Error handling and recovery

### Upload Features
- Background upload with progress tracking
- Automatic retry on network failures
- Upload cancellation and resumption
- File validation and error handling
- Integration with signed URL API

## Implementation Details

### Camera Screen Features
- **Recording Controls**: Start/stop recording with visual feedback
- **Duration Tracking**: Real-time recording duration display
- **Camera Flip**: Switch between front and back cameras
- **Upload Interface**: Upload, retry, and discard options
- **Progress Display**: Visual progress bar during upload

### Video Upload Service
- **Retry Logic**: Configurable retry attempts with exponential backoff
- **Progress Tracking**: Real-time upload progress callbacks
- **Error Handling**: Categorized error types (retryable vs non-retryable)
- **Upload Management**: Track and cancel active uploads
- **Background Support**: Continue uploads when app is backgrounded

### Upload Flow
1. User records video (max 30 seconds)
2. Video is saved to device storage
3. User can preview and choose to upload
4. System requests signed URL from backend
5. Video uploads to S3 with progress tracking
6. Upload can be retried on failure
7. Success confirmation with video ID

## Technical Specifications

### Camera Configuration
- **Quality**: 720p recording
- **Format**: MP4 video
- **Duration**: 30 seconds maximum
- **Audio**: Enabled for better analysis
- **Orientation**: Portrait mode

### Upload Configuration
- **Max Retries**: 3 attempts
- **Retry Delay**: 1 second initial, exponential backoff
- **Timeout**: 30 seconds per attempt
- **Chunk Size**: Optimized for mobile networks

### Error Handling
- **Network Errors**: Automatic retry with backoff
- **Authentication Errors**: Immediate failure, no retry
- **File Errors**: Immediate failure, no retry
- **Server Errors**: Retry with exponential backoff

## User Experience

### Recording Flow
1. User opens camera screen
2. Camera permission requested if needed
3. User taps record button to start
4. Recording indicator shows duration
5. User taps stop when finished
6. Upload options appear

### Upload Flow
1. User taps "Upload" button
2. Progress bar shows upload status
3. Upload can be cancelled if needed
4. Success message with video ID
5. User can record another shot

### Error Recovery
1. Upload failures show error message
2. User can retry failed uploads
3. Network issues trigger automatic retry
4. Clear error messages for different failure types

## Security Considerations

- Camera permissions properly requested
- Video files stored temporarily on device
- Secure upload via signed URLs
- No sensitive data in video metadata
- Automatic cleanup of failed uploads

## Performance Optimizations

- Efficient video compression
- Background upload processing
- Memory management for large files
- Network-aware retry logic
- Progress tracking without blocking UI

## Testing Strategy

### Unit Tests
- Video upload service methods
- Retry logic and error handling
- Progress tracking functionality
- Upload cancellation

### Integration Tests
- Camera recording functionality
- Upload flow with real API
- Network interruption scenarios
- Background/foreground transitions

### Manual Testing
- Camera permission flows
- Recording quality and duration
- Upload progress and completion
- Error scenarios and recovery
- Network connectivity issues

## Monitoring and Analytics

### Metrics to Track
- Recording success rate
- Upload success rate
- Average upload duration
- Retry attempt frequency
- Error type distribution

### Events to Log
- Camera permission granted/denied
- Recording started/completed
- Upload initiated/completed/failed
- Retry attempts
- User cancellations

## Future Enhancements

- Video preview before upload
- Multiple video format support
- Advanced compression options
- Batch upload capabilities
- Offline upload queue
- Video thumbnail generation

## Acceptance Criteria

✅ Camera screen with recording functionality  
✅ Video recording with 30-second limit  
✅ Upload progress tracking and display  
✅ Retry logic for failed uploads  
✅ Background upload support  
✅ Error handling and user feedback  
✅ Integration with signed URL API  
✅ Upload cancellation support  

## How I Verified

1. **Camera Functionality**: Tested recording on both iOS and Android
   ```bash
   # Test camera permissions and recording
   npx expo start
   # Navigate to camera screen and test recording
   ```

2. **Upload Flow**: Verified complete upload process
   ```bash
   # Test upload with network interruption
   # Verify retry logic works correctly
   # Check progress tracking accuracy
   ```

3. **Error Handling**: Tested various error scenarios
   - Network disconnection during upload
   - Invalid file formats
   - Authentication failures
   - Server errors

4. **Background Upload**: Verified upload continues when app is backgrounded
   - Start upload and background app
   - Verify upload completes when returning to app
   - Check progress tracking accuracy

5. **Retry Logic**: Tested retry mechanism
   - Simulate network failures
   - Verify exponential backoff
   - Check retry attempt limits
