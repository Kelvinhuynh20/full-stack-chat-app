import { Request, Response } from 'express';
import { db } from '../services/firebase';


/**
 * Get all chats for the current user
 */
export const getUserChats = async (req: Request, res: Response) => {
  try {
    const { uid } = req.user as { uid: string };
    
    // Get all chats where the user is a member
    const chatsSnapshot = await db.collection('chats')
      .where('members', 'array-contains', uid)
      .orderBy('lastMessageAt', 'desc')
      .get();
    
    const chats = [];
    
    for (const doc of chatsSnapshot.docs) {
      const chatData = doc.data();
      
      // Get the last message if it exists
      let lastMessage = null;
      if (chatData.lastMessageId) {
        const messageDoc = await db.collection('chats')
          .doc(doc.id)
          .collection('messages')
          .doc(chatData.lastMessageId)
          .get();
          
        if (messageDoc.exists) {
          lastMessage = {
            id: messageDoc.id,
            ...messageDoc.data()
          };
        }
      }
      
      // Get unread message count for this user
      const unreadCount = chatData.unreadCounts?.[uid] || 0;
      
      chats.push({
        id: doc.id,
        name: chatData.name,
        isGroup: chatData.isGroup,
        members: chatData.members,
        createdAt: chatData.createdAt?.toDate(),
        lastMessageAt: chatData.lastMessageAt?.toDate(),
        lastMessage,
        unreadCount,
        folder: chatData.folder || 'default'
      });
    }
    
    return res.status(200).json({ chats });
  } catch (error: any) {
    console.error('Error getting user chats:', error);
    return res.status(500).json({ 
      error: 'Server error', 
      message: error.message 
    });
  }
};

/**
 * Get a specific chat by ID
 */
export const getChatById = async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;
    const { uid } = req.user as { uid: string };
    
    // Get chat document
    const chatDoc = await db.collection('chats').doc(chatId).get();
    
    if (!chatDoc.exists) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    const chatData = chatDoc.data();
    
    // Check if user is a member of this chat
    if (!chatData?.members.includes(uid)) {
      return res.status(403).json({ error: 'You are not a member of this chat' });
    }
    
    // Get all members' profiles
    const memberProfiles = [];
    for (const memberId of chatData.members) {
      const memberDoc = await db.collection('users').doc(memberId).get();
      if (memberDoc.exists) {
        const memberData = memberDoc.data();
        memberProfiles.push({
          uid: memberId,
          displayName: memberData.displayName,
          avatarUrl: memberData.avatarUrl,
          isOnline: memberData.isOnline,
          lastSeen: memberData.lastSeen?.toDate()
        });
      }
    }
    
    // Reset unread count for this user
    const updateData = {
      [`unreadCounts.${uid}`]: 0
    };
    
    await chatDoc.ref.update(updateData);
    
    return res.status(200).json({
      chat: {
        id: chatDoc.id,
        name: chatData.name,
        isGroup: chatData.isGroup,
        members: chatData.members,
        memberProfiles,
        createdAt: chatData.createdAt?.toDate(),
        lastMessageAt: chatData.lastMessageAt?.toDate(),
        folder: chatData.folder || 'default'
      }
    });
  } catch (error: any) {
    console.error('Error getting chat by ID:', error);
    return res.status(500).json({ 
      error: 'Server error', 
      message: error.message 
    });
  }
};

/**
 * Create a new chat
 */
export const createChat = async (req: Request, res: Response) => {
  try {
    const { uid } = req.user as { uid: string };
    const { name, members, isGroup, folder } = req.body;
    
    // Validate input
    if (!members || !Array.isArray(members)) {
      return res.status(400).json({ error: 'Members array is required' });
    }
    
    if (isGroup && !name) {
      return res.status(400).json({ error: 'Name is required for group chats' });
    }
    
    // Ensure current user is included in members
    const allMembers = [...new Set([...members, uid])];
    
    // For direct chats (non-group), check if a chat already exists with these two members
    if (!isGroup && allMembers.length === 2) {
      const existingChatsSnapshot = await db.collection('chats')
        .where('members', '==', allMembers.sort())
        .where('isGroup', '==', false)
        .limit(1)
        .get();
      
      if (!existingChatsSnapshot.empty) {
        const existingChat = existingChatsSnapshot.docs[0];
        return res.status(200).json({
          chatId: existingChat.id,
          message: 'Chat already exists',
          exists: true
        });
      }
    }
    
    // Create the chat document
    const chatData = {
      name: isGroup ? name : '',
      isGroup: isGroup || false,
      members: allMembers,
      createdBy: uid,
      createdAt: new Date(),
      lastMessageAt: new Date(),
      unreadCounts: {},
      folder: folder || 'default'
    };
    
    const chatRef = await db.collection('chats').add(chatData);
    
    return res.status(201).json({
      chatId: chatRef.id,
      message: 'Chat created successfully',
      exists: false
    });
  } catch (error: any) {
    console.error('Error creating chat:', error);
    return res.status(500).json({ 
      error: 'Server error', 
      message: error.message 
    });
  }
};

/**
 * Update a chat (name, folder, etc.)
 */
export const updateChat = async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;
    const { uid } = req.user as { uid: string };
    const { name, folder } = req.body;
    
    // Get chat document
    const chatDoc = await db.collection('chats').doc(chatId).get();
    
    if (!chatDoc.exists) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    const chatData = chatDoc.data();
    
    // Check if user is a member of this chat
    if (!chatData?.members.includes(uid)) {
      return res.status(403).json({ error: 'You are not a member of this chat' });
    }
    
    // Prepare update data
    const updateData: any = {};
    
    if (name !== undefined) updateData.name = name;
    if (folder !== undefined) updateData.folder = folder;
    
    // Update chat document
    await chatDoc.ref.update(updateData);
    
    return res.status(200).json({
      success: true,
      message: 'Chat updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating chat:', error);
    return res.status(500).json({ 
      error: 'Server error', 
      message: error.message 
    });
  }
};

/**
 * Add members to a group chat
 */
export const addChatMembers = async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;
    const { uid } = req.user as { uid: string };
    const { members } = req.body;
    
    if (!members || !Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ error: 'Members array is required' });
    }
    
    // Get chat document
    const chatDoc = await db.collection('chats').doc(chatId).get();
    
    if (!chatDoc.exists) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    const chatData = chatDoc.data();
    
    // Check if user is a member of this chat
    if (!chatData?.members.includes(uid)) {
      return res.status(403).json({ error: 'You are not a member of this chat' });
    }
    
    // Check if this is a group chat
    if (!chatData.isGroup) {
      return res.status(400).json({ error: 'Cannot add members to a direct chat' });
    }
    
    // Combine existing and new members, removing duplicates
    const updatedMembers = [...new Set([...chatData.members, ...members])];
    
    // Update chat document
    await chatDoc.ref.update({
      members: updatedMembers
    });
    
    return res.status(200).json({
      success: true,
      message: 'Members added successfully'
    });
  } catch (error: any) {
    console.error('Error adding chat members:', error);
    return res.status(500).json({ 
      error: 'Server error', 
      message: error.message 
    });
  }
};

/**
 * Leave a chat (remove self from members)
 */
export const leaveChat = async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;
    const { uid } = req.user as { uid: string };
    
    // Get chat document
    const chatDoc = await db.collection('chats').doc(chatId).get();
    
    if (!chatDoc.exists) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    const chatData = chatDoc.data();
    
    // Check if user is a member of this chat
    if (!chatData?.members.includes(uid)) {
      return res.status(403).json({ error: 'You are not a member of this chat' });
    }
    
    // Remove user from members array
    const updatedMembers = chatData.members.filter((memberId: string) => memberId !== uid);
    
    // If no members left, delete the chat
    if (updatedMembers.length === 0) {
      await chatDoc.ref.delete();
      return res.status(200).json({
        success: true,
        message: 'Chat deleted successfully'
      });
    }
    
    // Update chat document
    await chatDoc.ref.update({
      members: updatedMembers
    });
    
    return res.status(200).json({
      success: true,
      message: 'Left chat successfully'
    });
  } catch (error: any) {
    console.error('Error leaving chat:', error);
    return res.status(500).json({ 
      error: 'Server error', 
      message: error.message 
    });
  }
};
