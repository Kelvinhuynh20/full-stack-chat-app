import express from 'express';
import { auth, createUser } from '../services/firebase';
import authenticate from '../middlewares/auth';

const router = express.Router();

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    
    if (!email || !password || !displayName) {
      return res.status(400).json({ error: 'Email, password, and display name are required' });
    }
    
    const userRecord = await createUser(email, password, displayName);
    
    return res.status(201).json({
      message: 'User created successfully',
      uid: userRecord.uid
    });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return res.status(500).json({ 
      error: 'Error creating user',
      message: error.message 
    });
  }
});

/**
 * @route GET /api/auth/me
 * @desc Get current user info
 * @access Private
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const uid = req.user?.uid;
    
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const userRecord = await auth.getUser(uid);
    
    return res.status(200).json({
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
      photoURL: userRecord.photoURL
    });
  } catch (error: any) {
    console.error('Error fetching user:', error);
    return res.status(500).json({ 
      error: 'Error fetching user',
      message: error.message 
    });
  }
});

export default router;
