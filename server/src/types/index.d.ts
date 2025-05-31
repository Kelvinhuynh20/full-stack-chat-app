// Type declarations for Express Request with user property
import { UserRecord } from 'firebase-admin/auth';

declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email?: string;
        [key: string]: any;
      };
    }
  }
}

// Firebase Admin types
declare module 'firebase-admin' {
  interface ServiceAccount {
    projectId?: string;
    clientEmail?: string;
    privateKey?: string;
  }
}

export {};
