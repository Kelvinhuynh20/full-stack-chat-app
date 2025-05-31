import { Client, Storage, ID } from 'node-appwrite';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT || '')
  .setProject(process.env.VITE_APPWRITE_PROJECT_ID || '')
  .setKey(process.env.APPWRITE_API_KEY || ''); // Server API key

// Initialize Appwrite services
const storage = new Storage(client);

// Helper function to upload a file from a buffer
export const uploadFileFromBuffer = async (
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  metadata: Record<string, any> = {}
) => {
  try {
    const fileId = ID.unique();
    
    const result = await storage.createFile(
      process.env.VITE_APPWRITE_STORAGE_ID || '',
      fileId,
      buffer,
      fileName,
      mimeType,
      metadata
    );

    // Get file view URL
    const fileUrl = storage.getFileView(
      process.env.VITE_APPWRITE_STORAGE_ID || '',
      result.$id
    );

    return {
      id: result.$id,
      url: fileUrl,
      name: fileName,
      type: mimeType,
      size: buffer.length,
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

// Helper function to delete a file
export const deleteFile = async (fileId: string) => {
  try {
    await storage.deleteFile(
      process.env.VITE_APPWRITE_STORAGE_ID || '',
      fileId
    );
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
};

// Helper function to get file info
export const getFileInfo = async (fileId: string) => {
  try {
    const file = await storage.getFile(
      process.env.VITE_APPWRITE_STORAGE_ID || '',
      fileId
    );
    return file;
  } catch (error) {
    console.error('Error getting file info:', error);
    throw error;
  }
};

export { client, storage, ID };
