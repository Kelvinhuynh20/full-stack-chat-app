import { Request, Response } from 'express';
import { db } from '../services/firebase';
import * as admin from 'firebase-admin';

// Import types
import '../types';

type Timestamp = admin.firestore.Timestamp;

// Define types for Firestore documents
interface MessageDocument {
  text: string;
  files: any[];
  senderId: string;
  senderName: string;
  timestamp: Date | Timestamp;
  isEdited: boolean;
  isPinned: boolean;
  readBy: string[];
  [key: string]: any;
}

interface ChatDocument {
  members: string[];
  unreadCounts: Record<string, number>;
  lastMessageAt?: Date | Timestamp;
  lastMessageId?: string;
  [key: string]: any;
}

/**
 * Get messages for a specific chat
 */
export const getChatMessages = async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;
    const { uid } = req.user as { uid: string };
    const { limit = 50, before } = req.query;
    
    // Validate chat access
    const chatDoc = await db.collection('chats').doc(chatId).get();
    
    if (!chatDoc.exists) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    const chatData = chatDoc.data();
    
    // Check if user is a member of this chat
    if (!chatData?.members.includes(uid)) {
      return res.status(403).json({ error: 'You are not a member of this chat' });
    }
    
    // Build query for messages
    let messagesQuery = db.collection('chats')
      .doc(chatId)
      .collection('messages')
      .orderBy('timestamp', 'desc')
      .limit(Number(limit));
    
    // If before timestamp is provided, use it for pagination
    if (before) {
      const beforeTimestamp = new Date(before as string);
      messagesQuery = messagesQuery.where('timestamp', '<', beforeTimestamp);
    }
    
    const messagesSnapshot = await messagesQuery.get();
    
    const messages = messagesSnapshot.docs.map((doc) => {
      const data = doc.data() as MessageDocument;
      return {
        id: doc.id,
        ...data,
        timestamp: data.timestamp instanceof admin.firestore.Timestamp ? data.timestamp.toDate() : data.timestamp
      };
    });
    
    // Reset unread count for this user
    const updateData = {
      [`unreadCounts.${uid}`]: 0
    };
    
    await chatDoc.ref.update(updateData);
    
    return res.status(200).json({ messages });
  } catch (error: any) {
    console.error('Error getting chat messages:', error);
    return res.status(500).json({ 
      error: 'Server error', 
      message: error.message 
    });
  }
};

/**
 * Send a new message
 */
export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;
    const { uid } = req.user as { uid: string };
    const { text, files } = req.body;
    
    // Validate input
    if ((!text || text.trim() === '') && (!files || files.length === 0)) {
      return res.status(400).json({ error: 'Message must contain text or files' });
    }
    
    // Validate chat access
    const chatDoc = await db.collection('chats').doc(chatId).get();
    
    if (!chatDoc.exists) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    const chatData = chatDoc.data();
    
    // Check if user is a member of this chat
    if (!chatData?.members.includes(uid)) {
      return res.status(403).json({ error: 'You are not a member of this chat' });
    }
    
    // Get user info for sender name
    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.data();
    
    // Create message document
    const messageData = {
      text: text || '',
      files: files || [],
      senderId: uid,
      senderName: userData?.displayName || 'Unknown User',
      timestamp: new Date(),
      isEdited: false,
      isPinned: false,
      readBy: [uid]
    };
    
    // Add message to chat
    const messageRef = await db.collection('chats')
      .doc(chatId)
      .collection('messages')
      .add(messageData);
    
    // Update chat with last message info
    const updateData: any = {
      lastMessageAt: messageData.timestamp,
      lastMessageId: messageRef.id
    };
    
    // Increment unread count for all members except sender
    chatData.members.forEach((memberId: string) => {
      if (memberId !== uid) {
        updateData[`unreadCounts.${memberId}`] = (chatData.unreadCounts?.[memberId] || 0) + 1;
      }
    });
    
    await chatDoc.ref.update(updateData);
    
    // Clear typing indicator for sender
    await db.collection('chats')
      .doc(chatId)
      .collection('typing')
      .doc(uid)
      .delete();
    
    return res.status(201).json({
      messageId: messageRef.id,
      message: {
        id: messageRef.id,
        ...messageData,
        timestamp: messageData.timestamp.toDate()
      }
    });
  } catch (error: any) {
    console.error('Error sending message:', error);
    return res.status(500).json({ 
      error: 'Server error', 
      message: error.message 
    });
  }
};

/**
 * Update a message (edit text)
 */
export const updateMessage = async (req: Request, res: Response) => {
  try {
    const { chatId, messageId } = req.params;
    const { uid } = req.user as { uid: string };
    const { text } = req.body;
    
    // Validate input
    if (!text || text.trim() === '') {
      return res.status(400).json({ error: 'Message text is required' });
    }
    
    // Validate chat access
    const chatDoc = await db.collection('chats').doc(chatId).get();
    
    if (!chatDoc.exists) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    const chatData = chatDoc.data();
    
    // Check if user is a member of this chat
    if (!chatData?.members.includes(uid)) {
      return res.status(403).json({ error: 'You are not a member of this chat' });
    }
    
    // Get message document
    const messageDoc = await db.collection('chats')
      .doc(chatId)
      .collection('messages')
      .doc(messageId)
      .get();
    
    if (!messageDoc.exists) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    const messageData = messageDoc.data();
    
    // Check if user is the sender of this message
    if (messageData?.senderId !== uid) {
      return res.status(403).json({ error: 'You can only edit your own messages' });
    }
    
    // Update message document
    await messageDoc.ref.update({
      text,
      isEdited: true
    });
    
    return res.status(200).json({
      success: true,
      message: 'Message updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating message:', error);
    return res.status(500).json({ 
      error: 'Server error', 
      message: error.message 
    });
  }
};

/**
 * Delete a message
 */
export const deleteMessage = async (req: Request, res: Response) => {
  try {
    const { chatId, messageId } = req.params;
    const { uid } = req.user as { uid: string };
    
    // Validate chat access
    const chatDoc = await db.collection('chats').doc(chatId).get();
    
    if (!chatDoc.exists) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    const chatData = chatDoc.data();
    
    // Check if user is a member of this chat
    if (!chatData?.members.includes(uid)) {
      return res.status(403).json({ error: 'You are not a member of this chat' });
    }
    
    // Get message document
    const messageDoc = await db.collection('chats')
      .doc(chatId)
      .collection('messages')
      .doc(messageId)
      .get();
    
    if (!messageDoc.exists) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    const messageData = messageDoc.data();
    
    // Check if user is the sender of this message
    if (messageData?.senderId !== uid) {
      return res.status(403).json({ error: 'You can only delete your own messages' });
    }
    
    // Delete message document
    await messageDoc.ref.delete();
    
    // If this was the last message, update the chat's lastMessageId
    if (chatData.lastMessageId === messageId) {
      // Find the new last message
      const lastMessageSnapshot = await db.collection('chats')
        .doc(chatId)
        .collection('messages')
        .orderBy('timestamp', 'desc')
        .limit(1)
        .get();
      
      if (!lastMessageSnapshot.empty) {
        const newLastMessage = lastMessageSnapshot.docs[0];
        await chatDoc.ref.update({
          lastMessageId: newLastMessage.id,
          lastMessageAt: newLastMessage.data().timestamp
        });
      } else {
        // No messages left
        await chatDoc.ref.update({
          lastMessageId: null,
          lastMessageAt: chatData.createdAt
        });
      }
    }
    
    return res.status(200).json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting message:', error);
    return res.status(500).json({ 
      error: 'Server error', 
      message: error.message 
    });
  }
};

/**
 * Pin/unpin a message
 */
export const togglePinMessage = async (req: Request, res: Response) => {
  try {
    const { chatId, messageId } = req.params;
    const { uid } = req.user as { uid: string };
    const { isPinned } = req.body;
    
    if (isPinned === undefined) {
      return res.status(400).json({ error: 'isPinned status is required' });
    }
    
    // Validate chat access
    const chatDoc = await db.collection('chats').doc(chatId).get();
    
    if (!chatDoc.exists) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    const chatData = chatDoc.data();
    
    // Check if user is a member of this chat
    if (!chatData?.members.includes(uid)) {
      return res.status(403).json({ error: 'You are not a member of this chat' });
    }
    
    // Get message document
    const messageDoc = await db.collection('chats')
      .doc(chatId)
      .collection('messages')
      .doc(messageId)
      .get();
    
    if (!messageDoc.exists) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    // Update message document
    await messageDoc.ref.update({
      isPinned
    });
    
    return res.status(200).json({
      success: true,
      message: isPinned ? 'Message pinned successfully' : 'Message unpinned successfully'
    });
  } catch (error: any) {
    console.error('Error toggling pin message:', error);
    return res.status(500).json({ 
      error: 'Server error', 
      message: error.message 
    });
  }
};

/**
 * Get all pinned messages for a chat
 */
export const getPinnedMessages = async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;
    const { uid } = req.user as { uid: string };
    
    // Validate chat access
    const chatDoc = await db.collection('chats').doc(chatId).get();
    
    if (!chatDoc.exists) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    const chatData = chatDoc.data();
    
    // Check if user is a member of this chat
    if (!chatData?.members.includes(uid)) {
      return res.status(403).json({ error: 'You are not a member of this chat' });
    }
    
    // Get pinned messages
    const pinnedMessagesSnapshot = await db.collection('chats')
      .doc(chatId)
      .collection('messages')
      .where('isPinned', '==', true)
      .orderBy('timestamp', 'desc')
      .get();
    
    const pinnedMessages = pinnedMessagesSnapshot.docs.map((doc) => {
      const data = doc.data() as MessageDocument;
      return {
        id: doc.id,
        ...data,
        timestamp: data.timestamp instanceof admin.firestore.Timestamp ? data.timestamp.toDate() : data.timestamp
      };
    });
    
    return res.status(200).json({ pinnedMessages });
  } catch (error: any) {
    console.error('Error getting pinned messages:', error);
    return res.status(500).json({ 
      error: 'Server error', 
      message: error.message 
    });
  }
};

/**
 * Update typing indicator status
 */
export const updateTypingStatus = async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;
    const { uid } = req.user as { uid: string };
    const { isTyping } = req.body;
    
    if (isTyping === undefined) {
      return res.status(400).json({ error: 'isTyping status is required' });
    }
    
    // Validate chat access
    const chatDoc = await db.collection('chats').doc(chatId).get();
    
    if (!chatDoc.exists) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    const chatData = chatDoc.data();
    
    // Check if user is a member of this chat
    if (!chatData?.members.includes(uid)) {
      return res.status(403).json({ error: 'You are not a member of this chat' });
    }
    
    // Get user info
    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.data();
    
    if (isTyping) {
      // Add typing indicator
      await db.collection('chats')
        .doc(chatId)
        .collection('typing')
        .doc(uid)
        .set({
          userId: uid,
          userName: userData?.displayName || 'Unknown User',
          timestamp: new Date()
        });
    } else {
      // Remove typing indicator
      await db.collection('chats')
        .doc(chatId)
        .collection('typing')
        .doc(uid)
        .delete();
    }
    
    return res.status(200).json({
      success: true
    });
  } catch (error: any) {
    console.error('Error updating typing status:', error);
    return res.status(500).json({ 
      error: 'Server error', 
      message: error.message 
    });
  }
};
