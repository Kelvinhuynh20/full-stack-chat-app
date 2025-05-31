import { Client, Storage, ID, Account } from "appwrite";

// Initialize Appwrite client with hardcoded values from context.md
const client = new Client()
  .setEndpoint("https://fra.cloud.appwrite.io/v1")
  .setProject("68354a45003c063d0155");

// Initialize Appwrite services
const storage = new Storage(client);
const account = new Account(client);

// Storage bucket ID from context.md
const STORAGE_BUCKET_ID = "68354cbe0020ef2fa14b";

// Helper function to upload files
export const uploadFile = async (file: File, chatId?: string, userId?: string) => {
  try {
    // Create a unique ID for the file
    const fileId = ID.unique();
    
    // Set metadata for the file
    const metadata = {
      chatId: chatId || '',
      userId: userId || '',
      fileName: file.name,
      fileType: file.type,
    };

    // Upload the file to Appwrite storage
    const result = await storage.createFile(
      STORAGE_BUCKET_ID,
      fileId,
      file,
      undefined, // permissions
      undefined, // function for upload progress
      undefined, // function for upload completion
      metadata
    );

    // Get file view URL
    const fileUrl = storage.getFileView(
      STORAGE_BUCKET_ID,
      result.$id
    );

    // Get file download URL for raw binary access
    const fileDownloadUrl = storage.getFileDownload(
      STORAGE_BUCKET_ID,
      result.$id
    );

    // Return file information
    return {
      id: result.$id,
      url: fileUrl.toString(), // Convert URL object to string for viewing
      downloadUrl: fileDownloadUrl.toString(), // Direct download URL for the raw file
      name: file.name,
      type: getFileType(file.type),
      size: file.size,
    };
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
};

// Helper function to determine file type
const getFileType = (mimeType: string): 'image' | 'audio' | 'video' | 'document' => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('video/')) return 'video';
  return 'document';
};

// Helper function to delete a file
export const deleteFile = async (fileId: string) => {
  try {
    await storage.deleteFile(
      STORAGE_BUCKET_ID,
      fileId
    );
    return true;
  } catch (error) {
    console.error("Error deleting file:", error);
    throw error;
  }
};

// Helper function to get file preview URL
export const getFilePreview = (fileId: string, width?: number, height?: number) => {
  return storage.getFilePreview(
    STORAGE_BUCKET_ID,
    fileId,
    width,
    height
  ).toString(); // Convert URL object to string
};

// Helper function to get file download URL
export const getFileDownload = (fileId: string) => {
  return storage.getFileDownload(
    STORAGE_BUCKET_ID,
    fileId
  ).toString(); // Convert URL object to string
};

export { client, storage, account, ID };
