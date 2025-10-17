import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContextFirebase';
import { useUserProfile, useUserShots, useCommunityFeed } from '../hooks/useFirebaseData';
import { shotService, userService, communityService } from '../services/firestore';
import { testFirebaseConnectivity } from '../utils/firebaseTest';

export default function FirebaseDemo() {
  const { user, profile } = useAuth();
  const { shots, createShot } = useUserShots(user);
  const { posts, createPost } = useCommunityFeed();
  const [postContent, setPostContent] = useState('');
  const [loading, setLoading] = useState(false);

  // Demo functions
  const handleCreateDemoShot = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const shotId = await createShot({
        videoUrl: 'https://example.com/demo-shot.mp4',
        thumbnailUrl: 'https://example.com/demo-thumb.jpg',
        location: { lat: 40.7128, lng: -74.0060, court: 'Demo Court' }
      });
      
      // Simulate AI analysis completion
      setTimeout(async () => {
        await shotService.updateShotAnalysis(shotId, {
          release_ms: 450,
          elbow_angle_deg: 85,
          wrist_flick_deg_s: 180,
          arc_proxy_deg: 45,
          consistency_score: 8.5,
          overall_score: 8.2,
          tips: [
            'Great follow-through!',
            'Try to increase your arc slightly',
            'Consistent release timing'
          ]
        });
        
        // Update user stats
        await userService.updateStats(user.uid, {
          totalShots: 1,
          totalPoints: 10
        });
        
        Alert.alert('Success', 'Demo shot analysis completed!');
      }, 2000);
      
    } catch (error) {
      console.error('Error creating demo shot:', error);
      Alert.alert('Error', 'Failed to create demo shot');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!user || !postContent.trim()) return;
    
    setLoading(true);
    try {
      await createPost(user.uid, {
        content: postContent,
        type: 'general',
        tags: ['demo', 'firebase']
      });
      setPostContent('');
      Alert.alert('Success', 'Post created successfully!');
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Firebase Demo</Text>
        <Text style={styles.subtitle}>Please sign in to test Firebase features</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🔥 Firebase Demo</Text>
      
      {/* User Profile Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User Profile</Text>
        <Text style={styles.text}>Name: {profile?.displayName}</Text>
        <Text style={styles.text}>Email: {profile?.email}</Text>
        <Text style={styles.text}>Role: {profile?.role}</Text>
        <Text style={styles.text}>Total Shots: {profile?.stats.totalShots}</Text>
        <Text style={styles.text}>Points: {profile?.stats.totalPoints}</Text>
      </View>

      {/* Firebase Connectivity Test */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔧 Connectivity Test</Text>
        <TouchableOpacity 
          style={[styles.button, styles.testButton]} 
          onPress={async () => {
            const result = await testFirebaseConnectivity();
            Alert.alert(
              result.success ? 'Test Passed' : 'Test Failed', 
              result.message
            );
          }}
        >
          <Text style={styles.buttonText}>Test Firebase Connection</Text>
        </TouchableOpacity>
      </View>

      {/* Shot Analysis Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Shot Analysis ({shots.length})</Text>
        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleCreateDemoShot}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Creating Demo Shot...' : 'Create Demo Shot'}
          </Text>
        </TouchableOpacity>
        
        {shots.slice(0, 3).map((shot, index) => (
          <View key={shot.id} style={styles.shotItem}>
            <Text style={styles.text}>Shot {index + 1}: {shot.status}</Text>
            {shot.metrics && (
              <Text style={styles.text}>Score: {shot.metrics.overall_score}/10</Text>
            )}
          </View>
        ))}
      </View>

      {/* Community Feed Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Community Feed ({posts.length})</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Share your basketball progress..."
          value={postContent}
          onChangeText={setPostContent}
          multiline
        />
        
        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleCreatePost}
          disabled={loading || !postContent.trim()}
        >
          <Text style={styles.buttonText}>Post Update</Text>
        </TouchableOpacity>
        
        {posts.slice(0, 5).map((post, index) => (
          <View key={post.id} style={styles.postItem}>
            <Text style={styles.postAuthor}>{post.userName}</Text>
            <Text style={styles.text}>{post.content}</Text>
            <Text style={styles.postMeta}>❤️ {post.likes} likes</Text>
          </View>
        ))}
      </View>

      {/* Firebase Features Checklist */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>✅ Firebase Features Working</Text>
        <Text style={styles.checklistItem}>🔐 Authentication</Text>
        <Text style={styles.checklistItem}>👤 User Profiles (Firestore)</Text>
        <Text style={styles.checklistItem}>🏀 Shot Analysis Storage</Text>
        <Text style={styles.checklistItem}>📊 Real-time Data Sync</Text>
        <Text style={styles.checklistItem}>💬 Community Posts</Text>
        <Text style={styles.checklistItem}>📈 User Statistics</Text>
        <Text style={styles.checklistItem}>🎯 No Backend Server Needed!</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  section: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  text: {
    fontSize: 14,
    marginBottom: 5,
    color: '#555',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginVertical: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  testButton: {
    backgroundColor: '#28a745',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  shotItem: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 5,
    marginBottom: 5,
  },
  postItem: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  postAuthor: {
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#007AFF',
  },
  postMeta: {
    fontSize: 12,
    color: '#888',
    marginTop: 5,
  },
  checklistItem: {
    fontSize: 14,
    marginBottom: 5,
    color: '#28a745',
  },
});
