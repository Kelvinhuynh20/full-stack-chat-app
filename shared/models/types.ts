export interface UserProfile {
  uid: string;
  displayName: string;
  avatarUrl: string;
  bio?: string;
  lastSeen: Date;
  isOnline?: boolean;
}

export interface ChatMessage {
  id: string;
  text?: string;
  senderId: string;
  senderName?: string;
  timestamp?: Date;
  files?: {
    id: string;
    url: string;
    downloadUrl?: string;
    name: string;
    type: 'image' | 'audio' | 'video' | 'document';
    size: number;
  }[];
  isEdited?: boolean;
  isPinned?: boolean;
}

export interface Chat {
  id: string;
  members: string[];
  isGroup: boolean;
  title?: string;
  lastMessageTime?: Date;
  lastMessage?: string;
  folderName?: string;
  isEmptyFolder?: boolean;
}

export interface TypingIndicator {
  id: string;
  userId: string;
  userName?: string;
  timestamp: Date;
}

export interface FileUpload {
  file: File;
  name: string;
  type: 'image' | 'audio' | 'video' | 'document';
  size: number;
  progress: number; // 0-100 for progress, -1 for error
  url: string;
  downloadUrl: string;
  id: string;
}

export type FileType = 'image' | 'audio' | 'video' | 'document';

export interface ChatFolder {
  id: string;
  name: string;
  userId: string;
  chatIds: string[];
  createdAt: Date;
}

export interface User {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
}

export interface Notification {
  id: string;
  userId: string;
  chatId: string;
  messageId?: string;
  type: 'message' | 'mention' | 'reaction';
  read: boolean;
  timestamp: Date;
}
