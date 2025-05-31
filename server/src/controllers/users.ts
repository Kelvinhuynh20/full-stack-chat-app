import { Request, Response } from 'express';
import { getFirestore } from '../services/firebase';
import { getAppwrite } from '../services/appwrite';

const db = getFirestore();

/**
 * Get a user profile by ID
 */
export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    // Get user document from Firestore
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = userDoc.data();
    
    return res.status(200).json({
      user: {
        uid: userId,
        ...userData
      }
    });
  } catch (error: any) {
    console.error('Error getting user profile:', error);
    return res.status(500).json({ 
      error: 'Server error', 
      message: error.message 
    });
  }
};

/**
 * Update a user profile
 */
export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const { uid } = req.user as { uid: string };
    const { displayName, avatarUrl } = req.body;
    
    // Validate input
    if (!displayName && !avatarUrl) {
      return res.status(400).json({ error: 'No update data provided' });
    }
    
    // Prepare update data
    const updateData: any = {};
    
    if (displayName) updateData.displayName = displayName;
    if (avatarUrl) updateData.avatarUrl = avatarUrl;
    
    // Update last modified timestamp
    updateData.updatedAt = new Date();
    
    // Update user document in Firestore
    await db.collection('users').doc(uid).update(updateData);
    
    return res.status(200).json({
      success: true,
      message: 'User profile updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating user profile:', error);
    return res.status(500).json({ 
      error: 'Server error', 
      message: error.message 
    });
  }
};

/**
 * Update user's online status
 */
export const updateOnlineStatus = async (req: Request, res: Response) => {
  try {
    const { uid } = req.user as { uid: string };
    const { isOnline } = req.body;
    
    if (isOnline === undefined) {
      return res.status(400).json({ error: 'isOnline status is required' });
    }
    
    // Update user document in Firestore
    await db.collection('users').doc(uid).update({
      isOnline: isOnline,
      lastSeen: new Date()
    });
    
    return res.status(200).json({
      success: true,
      message: 'Online status updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating online status:', error);
    return res.status(500).json({ 
      error: 'Server error', 
      message: error.message 
    });
  }
};

/**
 * Search for users by display name
 */
export const searchUsers = async (req: Request, res: Response) => {
  try {
    const { query } = req.query;
    const { uid } = req.user as { uid: string };
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    // Convert query to lowercase for case-insensitive search
    const searchQuery = query.toLowerCase();
    
    // Get users from Firestore where displayName contains the query
    const usersSnapshot = await db.collection('users')
      .orderBy('displayName')
      .startAt(searchQuery)
      .endAt(searchQuery + '\uf8ff')
      .limit(10)
      .get();
    
    const users = [];
    
    for (const doc of usersSnapshot.docs) {
      // Don't include the current user in search results
      if (doc.id !== uid) {
        const userData = doc.data();
        users.push({
          uid: doc.id,
          displayName: userData.displayName,
          avatarUrl: userData.avatarUrl,
          isOnline: userData.isOnline,
          lastSeen: userData.lastSeen?.toDate()
        });
      }
    }
    
    return res.status(200).json({ users });
  } catch (error: any) {
    console.error('Error searching users:', error);
    return res.status(500).json({ 
      error: 'Server error', 
      message: error.message 
    });
  }
};
