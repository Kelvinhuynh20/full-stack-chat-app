import { Request, Response } from 'express';
import { verifyIdToken, auth } from '../services/firebase';

/**
 * Verify a Firebase ID token and return user information
 */
export const verifyUser = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'No token provided' });
    }

    // Verify the token using Firebase Admin SDK
    const decodedToken = await verifyIdToken(token);
    
    // Get additional user information
    const userRecord = await auth.getUser(decodedToken.uid);
    
    return res.status(200).json({
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        photoURL: userRecord.photoURL,
        emailVerified: userRecord.emailVerified,
        createdAt: userRecord.metadata.creationTime
      }
    });
  } catch (error: any) {
    console.error('Error verifying user token:', error);
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: error.message 
    });
  }
};

/**
 * Get current user information from Firebase token
 */
export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    // User is already authenticated via middleware
    const { uid } = req.user as { uid: string };
    
    // Get user information from Firebase
    const userRecord = await auth.getUser(uid);
    
    return res.status(200).json({
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        photoURL: userRecord.photoURL,
        emailVerified: userRecord.emailVerified,
        createdAt: userRecord.metadata.creationTime
      }
    });
  } catch (error: any) {
    console.error('Error getting current user:', error);
    return res.status(500).json({ 
      error: 'Server error', 
      message: error.message 
    });
  }
};
