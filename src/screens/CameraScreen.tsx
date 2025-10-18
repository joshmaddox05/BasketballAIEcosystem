import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Camera, CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import { useAuth } from '../contexts/AuthContextFirebase';
import { videoUploadService, VideoUploadOptions } from '../services/videoUpload';

const { width, height } = Dimensions.get('window');

// Remove the interface as it's now imported from videoUpload service

export const CameraScreen: React.FC = () => {
  const { user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    if (!cameraRef.current) return;

    try {
      setIsRecording(true);
      setRecordingDuration(0);
      setRecordingUri(null);

      // Start recording
      const video = await cameraRef.current.recordAsync({
        quality: '720p',
        maxDuration: 30, // 30 seconds max
        mute: false,
      });

      if (video) {
        setRecordingUri(video.uri);
        console.log('Recording completed:', video.uri);
      }
    } catch (error) {
      console.error('Error recording video:', error);
      Alert.alert('Error', 'Failed to record video');
    } finally {
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const stopRecording = () => {
    if (cameraRef.current && isRecording) {
      cameraRef.current.stopRecording();
    }
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const uploadVideo = async (uri: string) => {
    if (!user) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);

      // Generate filename
      const timestamp = Date.now();
      const fileName = `shot_${timestamp}.mp4`;

      const uploadOptions: VideoUploadOptions = {
        fileName,
        mimeType: 'video/mp4',
        duration: recordingDuration,
        fps: 30,
        angle: 'front', // Default to front view
        onProgress: (progress) => {
          setUploadProgress(progress);
        },
        onSuccess: (response) => {
          Alert.alert(
            'Success',
            `Video uploaded successfully!\nVideo ID: ${response.videoId}`,
            [
              {
                text: 'OK',
                onPress: () => {
                  setRecordingUri(null);
                  setUploadProgress(0);
                },
              },
            ]
          );
        },
        onError: (error) => {
          console.error('Upload error:', error);
          Alert.alert('Upload Error', error.message);
        },
      };

      await videoUploadService.uploadVideo(uri, uploadOptions);
    } catch (error) {
      console.error('Error uploading video:', error);
      Alert.alert('Error', `Failed to upload video: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const retryUpload = () => {
    if (recordingUri) {
      uploadVideo(recordingUri);
    }
  };

  const discardRecording = () => {
    setRecordingUri(null);
    setUploadProgress(0);
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        onRecordingStart={() => {
          // Start duration counter
          recordingIntervalRef.current = setInterval(() => {
            setRecordingDuration(prev => prev + 1);
          }, 1000);
        }}
        onRecordingEnd={() => {
          if (recordingIntervalRef.current) {
            clearInterval(recordingIntervalRef.current);
          }
        }}
      >
        <View style={styles.overlay}>
          {/* Top controls */}
          <View style={styles.topControls}>
            <TouchableOpacity style={styles.flipButton} onPress={toggleCameraFacing}>
              <Text style={styles.flipButtonText}>Flip</Text>
            </TouchableOpacity>
          </View>

          {/* Center recording indicator */}
          <View style={styles.centerArea}>
            {isRecording && (
              <View style={styles.recordingIndicator}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingText}>
                  {recordingDuration}s
                </Text>
              </View>
            )}
          </View>

          {/* Bottom controls */}
          <View style={styles.bottomControls}>
            {!recordingUri ? (
              <TouchableOpacity
                style={[styles.recordButton, isRecording && styles.recordingButton]}
                onPress={isRecording ? stopRecording : startRecording}
                disabled={isUploading}
              >
                <Text style={styles.recordButtonText}>
                  {isRecording ? 'Stop' : 'Record'}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.uploadControls}>
                <TouchableOpacity
                  style={[styles.uploadButton, isUploading && styles.uploadingButton]}
                  onPress={() => uploadVideo(recordingUri)}
                  disabled={isUploading}
                >
                  <Text style={styles.uploadButtonText}>
                    {isUploading ? 'Uploading...' : 'Upload'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={retryUpload}
                  disabled={isUploading}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.discardButton}
                  onPress={discardRecording}
                  disabled={isUploading}
                >
                  <Text style={styles.discardButtonText}>Discard</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Upload progress */}
          {isUploading && (
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>
                Uploading... {Math.round(uploadProgress * 100)}%
              </Text>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${uploadProgress * 100}%` }
                  ]} 
                />
              </View>
            </View>
          )}
        </View>
      </CameraView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  topControls: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 1,
  },
  flipButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  flipButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  centerArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ef4444',
    marginRight: 8,
  },
  recordingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  recordButton: {
    backgroundColor: '#ef4444',
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  recordingButton: {
    backgroundColor: '#22c55e',
  },
  recordButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  uploadControls: {
    flexDirection: 'row',
    gap: 12,
  },
  uploadButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  uploadingButton: {
    backgroundColor: '#6b7280',
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  retryButton: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  discardButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  discardButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 16,
    borderRadius: 8,
  },
  progressText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563eb',
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
    color: '#fff',
  },
  button: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
