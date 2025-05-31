import express from 'express';
import { db } from '../services/firebase';
import authenticate from '../middlewares/auth';

const router = express.Router();

/**
 * @route GET /api/messages/:chatId
 * @desc Get messages for a specific chat
 * @access Private
 */
router.get('/:chatId', authenticate, async (req, res) => {
  try {
    const userId = req.user?.uid;
    const chatId = req.params.chatId;
    const limit = parseInt(req.query.limit as string) || 50;
    const before = req.query.before as string;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Check if the user is a member of the chat
    const chatDoc = await db.collection('chats').doc(chatId).get();
    
    if (!chatDoc.exists) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    const chatData = chatDoc.data();
    
    if (!chatData.members.includes(userId)) {
      return res.status(403).json({ error: 'Forbidden: You are not a member of this chat' });
    }
    
    // Query messages for the chat
    let messagesQuery = db.collection('messages')
      .where('chatId', '==', chatId)
      .orderBy('timestamp', 'desc')
      .limit(limit);
    
    // If 'before' timestamp is provided, use it for pagination
    if (before) {
      const beforeDate = new Date(before);
      messagesQuery = messagesQuery.where('timestamp', '<', beforeDate);
    }
    
    const messagesSnapshot = await messagesQuery.get();
    
    const messages = messagesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return res.status(200).json(messages);
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    return res.status(500).json({ 
      error: 'Error fetching messages',
      message: error.message 
    });
  }
});

/**
 * @route POST /api/messages
 * @desc Create a new message
 * @access Private
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const userId = req.user?.uid;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { chatId, content, fileUrl, fileType } = req.body;
    
    // Validate required fields
    if (!chatId) {
      return res.status(400).json({ error: 'Chat ID is required' });
    }
    
    if (!content && !fileUrl) {
      return res.status(400).json({ error: 'Either content or fileUrl is required' });
    }
    
    // Check if the user is a member of the chat
    const chatDoc = await db.collection('chats').doc(chatId).get();
    
    if (!chatDoc.exists) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    const chatData = chatDoc.data();
    
    if (!chatData.members.includes(userId)) {
      return res.status(403).json({ error: 'Forbidden: You are not a member of this chat' });
    }
    
    // Create message object
    const timestamp = new Date();
    const messageData: any = {
      chatId,
      senderId: userId,
      timestamp,
      readBy: [userId]
    };
    
    // Add optional fields if provided
    if (content) messageData.content = content;
    if (fileUrl) messageData.fileUrl = fileUrl;
    if (fileType) messageData.fileType = fileType;
    
    // Create the message document
    const messageRef = await db.collection('messages').add(messageData);
    
    // Update the last message time in the chat
    await db.collection('chats').doc(chatId).update({
      lastMessageTime: timestamp,
      lastMessage: content || `Shared a ${fileType || 'file'}`
    });
    
    return res.status(201).json({
      message: 'Message sent successfully',
      messageId: messageRef.id,
      ...messageData
    });
  } catch (error: any) {
    console.error('Error sending message:', error);
    return res.status(500).json({ 
      error: 'Error sending message',
      message: error.message 
    });
  }
});

/**
 * @route PUT /api/messages/:id
 * @desc Update a message (edit content)
 * @access Private
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user?.uid;
    const messageId = req.params.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    // Get the message document
    const messageDoc = await db.collection('messages').doc(messageId).get();
    
    if (!messageDoc.exists) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    const messageData = messageDoc.data();
    
    // Check if the user is the sender of the message
    if (messageData.senderId !== userId) {
      return res.status(403).json({ error: 'Forbidden: You can only edit your own messages' });
    }
    
    // Update the message
    await db.collection('messages').doc(messageId).update({
      content,
      edited: true
    });
    
    return res.status(200).json({
      message: 'Message updated successfully',
      messageId
    });
  } catch (error: any) {
    console.error('Error updating message:', error);
    return res.status(500).json({ 
      error: 'Error updating message',
      message: error.message 
    });
  }
});

/**
 * @route DELETE /api/messages/:id
 * @desc Delete a message
 * @access Private
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user?.uid;
    const messageId = req.params.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Get the message document
    const messageDoc = await db.collection('messages').doc(messageId).get();
    
    if (!messageDoc.exists) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    const messageData = messageDoc.data();
    
    // Check if the user is the sender of the message
    if (messageData.senderId !== userId) {
      return res.status(403).json({ error: 'Forbidden: You can only delete your own messages' });
    }
    
    // Delete the message
    await db.collection('messages').doc(messageId).delete();
    
    return res.status(200).json({
      message: 'Message deleted successfully',
      messageId
    });
  } catch (error: any) {
    console.error('Error deleting message:', error);
    return res.status(500).json({ 
      error: 'Error deleting message',
      message: error.message 
    });
  }
});

/**
 * @route PUT /api/messages/:id/pin
 * @desc Pin or unpin a message
 * @access Private
 */
router.put('/:id/pin', authenticate, async (req, res) => {
  try {
    const userId = req.user?.uid;
    const messageId = req.params.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { pinned } = req.body;
    
    if (pinned === undefined) {
      return res.status(400).json({ error: 'Pinned status is required' });
    }
    
    // Get the message document
    const messageDoc = await db.collection('messages').doc(messageId).get();
    
    if (!messageDoc.exists) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    const messageData = messageDoc.data();
    
    // Check if the user is a member of the chat
    const chatDoc = await db.collection('chats').doc(messageData.chatId).get();
    
    if (!chatDoc.exists) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    const chatData = chatDoc.data();
    
    if (!chatData.members.includes(userId)) {
      return res.status(403).json({ error: 'Forbidden: You are not a member of this chat' });
    }
    
    // Update the message
    await db.collection('messages').doc(messageId).update({
      pinned: pinned === true
    });
    
    return res.status(200).json({
      message: `Message ${pinned ? 'pinned' : 'unpinned'} successfully`,
      messageId
    });
  } catch (error: any) {
    console.error('Error updating message pin status:', error);
    return res.status(500).json({ 
      error: 'Error updating message pin status',
      message: error.message 
    });
  }
});

/**
 * @route PUT /api/messages/:id/read
 * @desc Mark a message as read
 * @access Private
 */
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const userId = req.user?.uid;
    const messageId = req.params.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Get the message document
    const messageDoc = await db.collection('messages').doc(messageId).get();
    
    if (!messageDoc.exists) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    const messageData = messageDoc.data();
    
    // Check if the user is a member of the chat
    const chatDoc = await db.collection('chats').doc(messageData.chatId).get();
    
    if (!chatDoc.exists) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    const chatData = chatDoc.data();
    
    if (!chatData.members.includes(userId)) {
      return res.status(403).json({ error: 'Forbidden: You are not a member of this chat' });
    }
    
    // Add the user to the readBy array if not already included
    const readBy = messageData.readBy || [];
    
    if (!readBy.includes(userId)) {
      readBy.push(userId);
      
      // Update the message
      await db.collection('messages').doc(messageId).update({
        readBy
      });
    }
    
    return res.status(200).json({
      message: 'Message marked as read',
      messageId
    });
  } catch (error: any) {
    console.error('Error marking message as read:', error);
    return res.status(500).json({ 
      error: 'Error marking message as read',
      message: error.message 
    });
  }
});

export default router;
