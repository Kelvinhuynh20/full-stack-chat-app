import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  Auth,
  User
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp, Firestore } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  register: (email: string, password: string, displayName: string) => Promise<User>;
  login: (email: string, password: string) => Promise<User>;
  loginWithGoogle: () => Promise<User>;
  logout: () => Promise<void>;
  updateUserProfile: (data: { displayName?: string, photoURL?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Type assertions for Firebase services
const typedAuth = auth as Auth;
const typedDb = db as Firestore;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Register a new user
  const register = async (email: string, password: string, displayName: string) => {
    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(typedAuth, email, password);
      const user = userCredential.user;
      
      // Update profile with display name
      await updateProfile(user, { displayName });
      
      // Create user document in Firestore
      await setDoc(doc(typedDb, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName,
        avatarUrl: user.photoURL || '',
        lastSeen: serverTimestamp(),
        isOnline: true,
        createdAt: serverTimestamp()
      });
      
      return user;
    } catch (error) {
      console.error('Error registering user:', error);
      throw error;
    }
  };

  // Login with email and password
  const login = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(typedAuth, email, password);
      const user = userCredential.user;
      
      // Update user's online status and last seen
      const userRef = doc(typedDb, 'users', user.uid);
      await updateDoc(userRef, {
        isOnline: true,
        lastSeen: serverTimestamp()
      });
      
      return user;
    } catch (error) {
      console.error('Error logging in:', error);
      throw error;
    }
  };

  // Login with Google
  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(typedAuth, provider);
      const user = userCredential.user;
      
      // Check if user document exists
      const userRef = doc(typedDb, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        // Create user document if it doesn't exist
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.photoURL || '',
          lastSeen: serverTimestamp(),
          isOnline: true,
          createdAt: serverTimestamp()
        });
      } else {
        // Update user's online status and last seen
        await updateDoc(userRef, {
          isOnline: true,
          lastSeen: serverTimestamp()
        });
      }
      
      return user;
    } catch (error) {
      console.error('Error logging in with Google:', error);
      throw error;
    }
  };

  // Logout
  const logout = async () => {
    try {
      // Update user's online status before logging out
      if (currentUser) {
        const userRef = doc(typedDb, 'users', currentUser.uid);
        await updateDoc(userRef, {
          isOnline: false,
          lastSeen: serverTimestamp()
        });
      }
      
      await signOut(typedAuth);
    } catch (error) {
      console.error('Error logging out:', error);
      throw error;
    }
  };

  // Update user profile
  const updateUserProfile = async (data: { displayName?: string, photoURL?: string }) => {
    try {
      if (!currentUser) {
        throw new Error('No user is logged in');
      }
      
      // Update profile in Firebase Auth
      await updateProfile(currentUser, data);
      
      // Update profile in Firestore
      const userRef = doc(typedDb, 'users', currentUser.uid);
      const updateData: any = {};
      
      if (data.displayName) updateData.displayName = data.displayName;
      if (data.photoURL) updateData.avatarUrl = data.photoURL.toString(); // Convert URL object to string
      
      await updateDoc(userRef, updateData);
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(typedAuth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    loading,
    register,
    login,
    loginWithGoogle,
    logout,
    updateUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
