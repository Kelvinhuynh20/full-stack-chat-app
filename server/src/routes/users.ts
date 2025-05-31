import express from 'express';
import { db } from '../services/firebase';
import authenticate from '../middlewares/auth';

const router = express.Router();

/**
 * @route GET /api/users
 * @desc Get all users
 * @access Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const usersSnapshot = await db.collection('users').get();
    const users = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return res.status(200).json(users);
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ 
      error: 'Error fetching users',
      message: error.message 
    });
  }
});

/**
 * @route GET /api/users/:id
 * @desc Get user by ID
 * @access Private
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const userId = req.params.id;
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    return res.status(200).json({
      id: userDoc.id,
      ...userDoc.data()
    });
  } catch (error: any) {
    console.error('Error fetching user:', error);
    return res.status(500).json({ 
      error: 'Error fetching user',
      message: error.message 
    });
  }
});

/**
 * @route PUT /api/users/:id
 * @desc Update user profile
 * @access Private
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const userId = req.params.id;
    const { displayName, avatarUrl, bio } = req.body;
    
    // Check if the authenticated user is updating their own profile
    if (req.user?.uid !== userId) {
      return res.status(403).json({ error: 'Forbidden: Cannot update another user\'s profile' });
    }
    
    const updateData: any = {};
    
    if (displayName) updateData.displayName = displayName;
    if (avatarUrl) updateData.avatarUrl = avatarUrl;
    if (bio !== undefined) updateData.bio = bio;
    
    // Update lastSeen timestamp
    updateData.lastSeen = new Date();
    
    await db.collection('users').doc(userId).update(updateData);
    
    return res.status(200).json({ 
      message: 'User profile updated successfully',
      userId
    });
  } catch (error: any) {
    console.error('Error updating user:', error);
    return res.status(500).json({ 
      error: 'Error updating user',
      message: error.message 
    });
  }
});

/**
 * @route PUT /api/users/:id/status
 * @desc Update user online status
 * @access Private
 */
router.put('/:id/status', authenticate, async (req, res) => {
  try {
    const userId = req.params.id;
    const { isOnline } = req.body;
    
    // Check if the authenticated user is updating their own status
    if (req.user?.uid !== userId) {
      return res.status(403).json({ error: 'Forbidden: Cannot update another user\'s status' });
    }
    
    const updateData: any = {
      isOnline: isOnline === true,
      lastSeen: new Date()
    };
    
    await db.collection('users').doc(userId).update(updateData);
    
    return res.status(200).json({ 
      message: 'User status updated successfully',
      userId,
      isOnline
    });
  } catch (error: any) {
    console.error('Error updating user status:', error);
    return res.status(500).json({ 
      error: 'Error updating user status',
      message: error.message 
    });
  }
});

export default router;
