import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../contexts/AuthContextFirebase';
import { apiClient } from '../services/apiClient';

interface UserProfileData {
  user: {
    uid: string;
    email?: string;
    role: string;
    emailVerified: boolean;
    createdAt: string;
  };
  requestId: string;
}

export const HomeScreen: React.FC = () => {
  const { user, signOut, refreshToken } = useAuth();
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      // This will use the authenticated API client
      const data = await apiClient.get<UserProfileData>('/api/user/profile');
      setProfileData(data);
    } catch (error) {
      console.warn('Failed to fetch profile:', error);
      // Profile endpoint might not be implemented yet, so this is expected
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out');
            }
          }
        },
      ]
    );
  };

  const handleRefreshToken = async () => {
    try {
      const newToken = await refreshToken();
      if (newToken) {
        Alert.alert('Success', 'Token refreshed successfully');
      } else {
        Alert.alert('Info', 'No token to refresh');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to refresh token');
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  if (!user) {
    return null; // This should not happen as HomeScreen is only shown for authenticated users
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={fetchProfile} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Basketball AI</Text>
        <Text style={styles.subtitle}>Welcome back!</Text>
      </View>

      <View style={styles.userInfo}>
        <Text style={styles.sectionTitle}>Your Profile</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>Email:</Text>
          <Text style={styles.value}>{user.email}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Display Name:</Text>
          <Text style={styles.value}>{user.displayName || 'Not set'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Role:</Text>
          <Text style={[styles.value, styles.roleValue]}>{user.role}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Email Verified:</Text>
          <Text style={[styles.value, user.emailVerified ? styles.verified : styles.unverified]}>
            {user.emailVerified ? 'Yes' : 'No'}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>User ID:</Text>
          <Text style={[styles.value, styles.uid]} numberOfLines={1}>
            {user.uid}
          </Text>
        </View>
      </View>

      {profileData && (
        <View style={styles.apiData}>
          <Text style={styles.sectionTitle}>API Profile Data</Text>
          <Text style={styles.apiResponse}>
            {JSON.stringify(profileData, null, 2)}
          </Text>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={handleRefreshToken}>
          <Text style={styles.actionButtonText}>Refresh Token</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={fetchProfile}>
          <Text style={styles.actionButtonText}>Test API Call</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, styles.signOutButton]} 
          onPress={handleSignOut}
        >
          <Text style={[styles.actionButtonText, styles.signOutText]}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  userInfo: {
    backgroundColor: '#f8f9fa',
    margin: 16,
    padding: 20,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  label: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  value: {
    fontSize: 14,
    color: '#333',
    flex: 2,
    textAlign: 'right',
  },
  roleValue: {
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  verified: {
    color: '#22c55e',
    fontWeight: '600',
  },
  unverified: {
    color: '#ef4444',
    fontWeight: '600',
  },
  uid: {
    fontFamily: 'monospace',
    fontSize: 12,
  },
  apiData: {
    backgroundColor: '#f1f5f9',
    margin: 16,
    padding: 20,
    borderRadius: 12,
  },
  apiResponse: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#475569',
  },
  actions: {
    padding: 16,
    gap: 12,
  },
  actionButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  signOutButton: {
    backgroundColor: '#ef4444',
    marginTop: 8,
  },
  signOutText: {
    color: '#fff',
  },
});
