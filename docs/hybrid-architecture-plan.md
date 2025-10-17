# Basketball AI Ecosystem - Hybrid Architecture Plan

## Overview
Firebase-first architecture with specialized AI processing services for optimal performance and cost efficiency.

## Architecture Components

### 🔥 Firebase Services (Primary)
- **Authentication**: User management, roles, security
- **Firestore**: User profiles, shots, training plans, community posts
- **Storage**: Video files, profile images, training content
- **Cloud Functions**: Business logic, data processing, notifications
- **Hosting**: Web dashboard, admin panel
- **Analytics**: User behavior, app performance

### 🤖 AI Processing Services (Specialized)
- **Firebase ML Kit**: Basic pose detection, on-device processing
- **Google Cloud Run**: MediaPipe shot analysis, video processing
- **Vertex AI**: Model training, advanced ML operations
- **TensorFlow Lite**: On-device inference for real-time feedback

## Data Flow

### Shot Analysis Pipeline
```
📱 Mobile App
    ↓ (video recording)
🔥 Firebase Storage (video upload)
    ↓ (trigger function)
🤖 Cloud Run (MediaPipe analysis)
    ↓ (results)
🔥 Firestore (store metrics)
    ↓ (real-time sync)
📱 Mobile App (display results)
```

### Training Recommendation Flow
```
🔥 Firestore (user shot history)
    ↓ (Cloud Function trigger)
🤖 Vertex AI (analyze patterns)
    ↓ (recommendations)
🔥 Firestore (store training plan)
    ↓ (real-time sync)
📱 Mobile App (display plan)
```

## Implementation Phases

### Phase 1: Firebase Foundation ✅
- [x] Authentication system
- [x] Firestore database structure
- [x] Storage for media files
- [x] Basic Cloud Functions
- [x] Real-time data sync

### Phase 2: Basic AI Integration (T-104)
- [ ] Firebase ML Kit pose detection
- [ ] Simple shot metrics calculation
- [ ] On-device TensorFlow Lite model
- [ ] Basic feedback system

### Phase 3: Advanced AI Processing (T-201+)
- [ ] Cloud Run MediaPipe service
- [ ] Advanced shot analysis
- [ ] Training plan AI recommendations
- [ ] Performance analytics

### Phase 4: ML Platform (T-301+)
- [ ] Vertex AI model training
- [ ] SimCoach 2D analysis
- [ ] Advanced coaching algorithms
- [ ] Predictive analytics

## Benefits of Hybrid Approach

### Firebase Benefits
- ✅ Rapid development and deployment
- ✅ Real-time data synchronization
- ✅ Automatic scaling for user features
- ✅ Built-in security and authentication
- ✅ Cost-effective for standard operations

### Specialized AI Benefits
- ✅ Optimized for ML workloads
- ✅ GPU/TPU support for training
- ✅ Custom container environments
- ✅ Advanced model serving capabilities
- ✅ Integration with Google Cloud AI services

## Cost Considerations

### Firebase Costs (Estimated Monthly)
- Firestore: $0-25 (free tier covers development)
- Storage: $0-10 (video storage, optimize with compression)
- Functions: $0-15 (business logic, lightweight operations)
- Authentication: Free (unlimited users)

### AI Processing Costs (Estimated Monthly)
- Cloud Run: $10-50 (pay per analysis request)
- ML Kit: Free (on-device processing)
- Vertex AI: $20-100 (model training/serving)

### Total Estimated: $30-200/month (scales with usage)

## Technical Integration

### Firebase → Cloud Run Communication
```typescript
// Cloud Function triggers AI processing
export const analyzeShot = functions.storage.object().onFinalize(async (object) => {
  const videoUrl = `gs://${object.bucket}/${object.name}`;
  
  // Call Cloud Run service
  const response = await fetch('https://ai-processor-service.run.app/analyze', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${serviceAccountToken}` },
    body: JSON.stringify({ videoUrl, userId })
  });
  
  const results = await response.json();
  
  // Store results in Firestore
  await admin.firestore().collection('shots').doc(shotId).update({
    analysis: results,
    status: 'completed'
  });
});
```

### Mobile → Firebase Integration
```typescript
// Mobile app uploads and subscribes to results
const uploadAndAnalyze = async (videoBlob: Blob) => {
  // Upload to Firebase Storage
  const { url, path } = await storageService.uploadVideo(userId, videoBlob);
  
  // Create shot record in Firestore
  const shotId = await shotService.createShot({
    userId,
    videoUrl: url,
    status: 'processing'
  });
  
  // Subscribe to real-time updates
  const unsubscribe = onSnapshot(doc(db, 'shots', shotId), (doc) => {
    const shot = doc.data();
    if (shot.status === 'completed') {
      displayResults(shot.analysis);
      unsubscribe();
    }
  });
};
```

## Decision: Proceed with Firebase Foundation

**Recommendation**: Start with complete Firebase migration now, add AI processing services incrementally.

**Rationale**:
1. Firebase provides 90% of needed functionality immediately
2. AI processing can be added without disrupting core architecture
3. Faster time to market for MVP features
4. Lower initial complexity and costs
5. Easy to scale AI features as needed

**Next Steps**:
1. Complete Firebase migration (Phase 1)
2. Build core app features and user experience
3. Add basic AI processing when ready for T-104
4. Scale to advanced AI as user base grows
