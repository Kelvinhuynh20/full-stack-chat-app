import express from 'express';
import { db } from '../services/firebase';
import authenticate from '../middlewares/auth';

// Define Chat document type
interface ChatDocument {
  members: string[];
  isGroup: boolean;
  createdBy: string;
  lastMessageTime: Date;
  createdAt: Date;
  title?: string;
  folderName?: string;
  lastMessage?: string;
}

const router = express.Router();

/**
 * @route GET /api/chats
 * @desc Get all chats for the authenticated user
 * @access Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user?.uid;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Get all chats where the user is a member
    const chatsSnapshot = await db.collection('chats')
      .where('members', 'array-contains', userId)
      .orderBy('lastMessageTime', 'desc')
      .get();
    
    const chats = chatsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return res.status(200).json(chats);
  } catch (error: any) {
    console.error('Error fetching chats:', error);
    return res.status(500).json({ 
      error: 'Error fetching chats',
      message: error.message 
    });
  }
});

/**
 * @route POST /api/chats
 * @desc Create a new chat
 * @access Private
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const userId = req.user?.uid;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { members, isGroup, title, folderName } = req.body;
    
    // Validate members array
    if (!members || !Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ error: 'Members array is required and cannot be empty' });
    }
    
    // For group chats, title is required
    if (isGroup && !title) {
      return res.status(400).json({ error: 'Title is required for group chats' });
    }
    
    // Make sure the creator is included in members
    if (!members.includes(userId)) {
      members.push(userId);
    }
    
    const chatData: ChatDocument = {
      members,
      isGroup: isGroup === true,
      createdBy: userId,
      lastMessageTime: new Date(),
      createdAt: new Date()
    };
    
    // Add optional fields if provided
    if (title) chatData.title = title;
    if (folderName) chatData.folderName = folderName;
    
    // Create the chat document
    const chatRef = await db.collection('chats').add(chatData);
    
    return res.status(201).json({
      message: 'Chat created successfully',
      chatId: chatRef.id,
      ...chatData
    });
  } catch (error: any) {
    console.error('Error creating chat:', error);
    return res.status(500).json({ 
      error: 'Error creating chat',
      message: error.message 
    });
  }
});

/**
 * @route GET /api/chats/:id
 * @desc Get a specific chat by ID
 * @access Private
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user?.uid;
    const chatId = req.params.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Get the chat document
    const chatDoc = await db.collection('chats').doc(chatId).get();
    
    if (!chatDoc.exists) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    const chatData = chatDoc.data() as ChatDocument;
    
    // Check if the user is a member of the chat
    if (!chatData.members.includes(userId)) {
      return res.status(403).json({ error: 'Forbidden: You are not a member of this chat' });
    }
    
    return res.status(200).json({
      id: chatDoc.id,
      ...chatData
    });
  } catch (error: any) {
    console.error('Error fetching chat:', error);
    return res.status(500).json({ 
      error: 'Error fetching chat',
      message: error.message 
    });
  }
});

/**
 * @route PUT /api/chats/:id
 * @desc Update a chat (title, folder, etc.)
 * @access Private
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user?.uid;
    const chatId = req.params.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { title, folderName } = req.body;
    
    // Get the chat document
    const chatDoc = await db.collection('chats').doc(chatId).get();
    
    if (!chatDoc.exists) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    const chatData = chatDoc.data() as ChatDocument;
    
    // Check if the user is a member of the chat
    if (!chatData.members.includes(userId)) {
      return res.status(403).json({ error: 'Forbidden: You are not a member of this chat' });
    }
    
    // For group chats, only the creator can update title
    if (title && chatData.isGroup && chatData.createdBy !== userId) {
      return res.status(403).json({ error: 'Forbidden: Only the creator can update the group title' });
    }
    
    const updateData: any = {};
    
    if (title) updateData.title = title;
    if (folderName !== undefined) updateData.folderName = folderName;
    
    // Update the chat document
    await db.collection('chats').doc(chatId).update(updateData);
    
    return res.status(200).json({
      message: 'Chat updated successfully',
      chatId
    });
  } catch (error: any) {
    console.error('Error updating chat:', error);
    return res.status(500).json({ 
      error: 'Error updating chat',
      message: error.message 
    });
  }
});

/**
 * @route POST /api/chats/:id/members
 * @desc Add members to a chat
 * @access Private
 */
router.post('/:id/members', authenticate, async (req, res) => {
  try {
    const userId = req.user?.uid;
    const chatId = req.params.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { members } = req.body;
    
    // Validate members array
    if (!members || !Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ error: 'Members array is required and cannot be empty' });
    }
    
    // Get the chat document
    const chatDoc = await db.collection('chats').doc(chatId).get();
    
    if (!chatDoc.exists) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    const chatData = chatDoc.data() as ChatDocument;
    
    // Check if the user is a member of the chat
    if (!chatData.members.includes(userId)) {
      return res.status(403).json({ error: 'Forbidden: You are not a member of this chat' });
    }
    
    // For group chats, only the creator can add members
    if (chatData.isGroup && chatData.createdBy !== userId) {
      return res.status(403).json({ error: 'Forbidden: Only the creator can add members to the group' });
    }
    
    // Add new members to the chat
    const updatedMembers = [...new Set([...chatData.members, ...members])];
    
    await db.collection('chats').doc(chatId).update({
      members: updatedMembers
    });
    
    return res.status(200).json({
      message: 'Members added successfully',
      chatId,
      members: updatedMembers
    });
  } catch (error: any) {
    console.error('Error adding members to chat:', error);
    return res.status(500).json({ 
      error: 'Error adding members to chat',
      message: error.message 
    });
  }
});

export default router;
