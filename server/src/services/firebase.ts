import * as admin from 'firebase-admin';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    // Load service account file with correct path
    const serviceAccountPath = path.resolve(__dirname, '../../firebase-service-account.json');
    console.log('Loading service account from:', serviceAccountPath);
    
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = require(serviceAccountPath);
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.VITE_FIREBASE_DATABASE_URL || 'https://servate-b45e4-default-rtdb.firebaseio.com'
      });
      
      console.log('Firebase Admin SDK initialized successfully with service account');
    } else {
      console.error('Service account file not found at:', serviceAccountPath);
      throw new Error('Firebase service account file not found');
    }
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    throw error;
  }
}

// Export Firestore and Auth instances
export const db = admin.firestore();
export const auth = admin.auth();

// Helper function to verify Firebase ID token
export const verifyIdToken = async (idToken: string) => {
  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying ID token:', error);
    throw error;
  }
};

// Helper function to get user by ID
export const getUserById = async (uid: string) => {
  try {
    const userRecord = await auth.getUser(uid);
    return userRecord;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
};

// Helper function to create a new user
export const createUser = async (email: string, password: string, displayName: string) => {
  try {
    const userRecord = await auth.createUser({
      email,
      password,
      displayName
    });
    return userRecord;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

export default { db, auth, verifyIdToken, getUserById, createUser };
