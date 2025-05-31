import { Request, Response } from 'express';
import { client, storage, ID, uploadFileFromBuffer, deleteFile } from '../services/appwrite';

/**
 * Upload a file to Appwrite storage
 */
export const uploadFile = async (req: Request, res: Response) => {
  try {
    // Get storage ID from environment variables
    const storageId = process.env.VITE_APPWRITE_STORAGE_ID as string;
    
    // Check if file exists in request
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Get file data
    const fileBuffer = req.file.buffer;
    const fileName = req.file.originalname;
    const mimeType = req.file.mimetype;
    
    // Get user ID from authenticated request
    const userId = req.user?.uid;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Determine file type for categorization
    const fileType = getFileType(fileName);
    
    // Upload file to Appwrite storage using helper function
    const fileResult = await uploadFileFromBuffer(
      fileBuffer,
      fileName,
      mimeType,
      {
        userId,
        fileType,
        chatId: req.body.chatId || null,
      }
    );
    
    // Return file information
    return res.status(201).json({
      ...fileResult,
      type: fileType,
      mimeType,
      userId,
      chatId: req.body.chatId || null,
    });
  } catch (error: any) {
    console.error('Error uploading file:', error);
    return res.status(500).json({ 
      error: 'Server error', 
      message: error.message 
    });
  }
};

/**
 * Delete a file from Appwrite storage
 */
export const deleteFileById = async (req: Request, res: Response) => {
  try {
    // Get storage ID from environment variables
    const storageId = process.env.VITE_APPWRITE_STORAGE_ID as string;
    
    const { fileId } = req.params;
    const userId = req.user?.uid;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Get file to check permissions
    const file = await storage.getFile(storageId, fileId);
    
    // Check if user has permission to delete this file
    if (file.$permissions.includes(`user:${userId}`) || file.userId === userId) {
      // Delete file using helper function
      await deleteFile(fileId);
      return res.status(200).json({ message: 'File deleted successfully' });
    } else {
      return res.status(403).json({ error: 'Permission denied' });
    }
  } catch (error: any) {
    console.error('Error deleting file:', error);
    return res.status(500).json({ 
      error: 'Server error', 
      message: error.message 
    });
  }
};

/**
 * Helper function to determine file type from filename
 */
const getFileType = (filename: string): string => {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
  const videoExtensions = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'];
  const audioExtensions = ['mp3', 'wav', 'ogg', 'aac', 'm4a'];
  
  if (imageExtensions.includes(extension)) return 'image';
  if (videoExtensions.includes(extension)) return 'video';
  if (audioExtensions.includes(extension)) return 'audio';
  
  return 'document';
};
