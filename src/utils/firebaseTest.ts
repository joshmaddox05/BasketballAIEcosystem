// Simple Firebase connectivity test
import { db, auth } from '../services/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export const testFirebaseConnectivity = async () => {
  console.log('🧪 Testing Firebase connectivity...');
  
  try {
    // Test 1: Check if Firebase is initialized
    if (!db) {
      throw new Error('Firestore not initialized');
    }
    console.log('✅ Firebase initialized');

    // Test 2: Check auth state
    const currentUser = auth.currentUser;
    console.log('👤 Current user:', currentUser ? currentUser.uid : 'No user');

    // Test 3: Try to read a public document (this should work even without auth)
    const testDocRef = doc(db, 'test', 'connectivity');
    
    console.log('📖 Attempting to read test document...');
    const testDoc = await getDoc(testDocRef);
    console.log('📄 Test document exists:', testDoc.exists());
    
    // Test 4: If user is authenticated, try to write
    if (currentUser) {
      console.log('✍️ User authenticated, testing write...');
      const userTestRef = doc(db, 'test', `user_${currentUser.uid}`);
      
      await setDoc(userTestRef, {
        testTimestamp: serverTimestamp(),
        message: 'Connectivity test'
      });
      
      console.log('✅ Write test successful');
    } else {
      console.log('⚠️ No user authenticated, skipping write test');
    }
    
    return { success: true, message: 'Firebase connectivity test passed' };
    
  } catch (error) {
    console.error('❌ Firebase connectivity test failed:', error);
    return { 
      success: false, 
      message: `Firebase test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};
