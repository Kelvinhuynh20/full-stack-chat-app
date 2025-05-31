import express, { Request } from 'express';
import multer from 'multer';
import { storage, uploadFileFromBuffer, deleteFile } from '../services/appwrite';
import authenticate from '../middlewares/auth';

// Extend Express Request type to include file from multer
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

/**
 * @route POST /api/files/upload
 * @desc Upload a file to Appwrite storage
 * @access Private
 */
router.post('/upload', authenticate, upload.single('file'), async (req: MulterRequest, res) => {
  try {
    const userId = req.user?.uid;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const { chatId } = req.body;
    
    // Prepare metadata
    const metadata = {
      userId,
      chatId: chatId || '',
      uploadedAt: new Date().toISOString(),
    };
    
    // Upload file to Appwrite
    const result = await uploadFileFromBuffer(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      metadata
    );
    
    return res.status(201).json({
      message: 'File uploaded successfully',
      file: result
    });
  } catch (error: any) {
    console.error('Error uploading file:', error);
    return res.status(500).json({ 
      error: 'Error uploading file',
      message: error.message 
    });
  }
});

/**
 * @route DELETE /api/files/:id
 * @desc Delete a file from Appwrite storage
 * @access Private
 */
router.delete('/:id', authenticate, async (req: Request, res) => {
  try {
    const userId = req.user?.uid;
    const fileId = req.params.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Delete file from Appwrite
    await deleteFile(fileId);
    
    return res.status(200).json({
      message: 'File deleted successfully',
      fileId
    });
  } catch (error: any) {
    console.error('Error deleting file:', error);
    return res.status(500).json({ 
      error: 'Error deleting file',
      message: error.message 
    });
  }
});

export default router;
