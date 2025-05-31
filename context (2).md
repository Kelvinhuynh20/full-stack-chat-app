
# 💬 Full-Stack Chat App – Project Context & Documentation

A full-stack, real-time chat application built with **React**, **Node.js**, and **TypeScript**. Firebase handles **real-time data & authentication**, while Appwrite handles **file and folder storage**. Designed to be scalable, modular, and production-ready.

---

## ⚙️ Tech Stack Overview

### Frontend
- React (TypeScript)
- Tailwind CSS or Chakra UI
- Firebase JS SDK
- Appwrite JS SDK

### Backend
- Node.js (TypeScript)
- Express server (API gateway)
- Firebase Admin SDK
- Appwrite Server SDK

### Services
- **Firebase**
  - Auth (Email/Password, Google)
  - Firestore (real-time chat database)
- **Appwrite**
  - File Storage (images, audio, documents)
  - Access control & public URLs

---

## 🚀 Core Features

- Real-time 1-on-1 and group messaging
- File uploads (image, audio, video, docs)
- User profiles with avatars
- Online status & last seen tracking
- Firebase-authenticated users
- File preview for uploaded media
- Editable & deletable messages
- Typing indicators via Firestore flags (not WebSocket)

---

## 🌟 Unique Features

- 📝 Message editing & deletion
- 📌 Pin important messages
- 📁 Chat folder organization (e.g., Personal, Work)
- 🔍 Smart search across messages and users
- 🎙️ Voice message recording (stored in Appwrite)
- 📽️ In-chat media previewer
- 🔒 Firebase rules + Appwrite access control

---

## 🔜 Planned Features

- ✅ Read receipts (delivered/read)
- 💡 AI reply suggestions (OpenAI API)
- 🌑 Dark/light mode
- 🧑‍🤝‍🧑 Group admin/moderation roles
- 🧼 Auto-delete expired media via Appwrite Functions
- 📊 Chat insights (activity stats per day)
- 🌐 PWA support for offline access

---

## 🧾 Folder Structure

```txt
/chat-app
├── client/                  # React + TS Frontend
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── hooks/
│   │   ├── services/        # firebase.ts, appwrite.ts
│   │   ├── types/
│   │   └── main.tsx
│   └── package.json
│
├── server/                  # Node.js + TS Backend
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── middlewares/
│   │   └── index.ts
│   └── package.json
│
├── shared/                  # Shared constants & types
│   ├── models/
│   └── utils/
│
├── .env
├── README.md
└── context.md               # ← This file
```

---

## 🧠 Data Models

### User Profile

```ts
interface UserProfile {
  uid: string;
  displayName: string;
  avatarUrl: string;
  bio?: string;
  lastSeen: Date;
}
```

### Chat Message

```ts
interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  content?: string;
  fileUrl?: string;
  fileType?: 'image' | 'audio' | 'video' | 'document';
  timestamp: Date;
  edited?: boolean;
  pinned?: boolean;
}
```

### Chat Metadata

```ts
interface Chat {
  id: string;
  members: string[];
  isGroup: boolean;
  title?: string;
  lastMessageTime: Date;
}
```

---

## 🧰 Firebase Configuration (Frontend)

```ts
// firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDvP8nxz-mkmJaihWXU9je3mTfit93fTF4",
  authDomain: "servate-b45e4.firebaseapp.com",
  databaseURL: "https://servate-b45e4-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "servate-b45e4",
  storageBucket: "servate-b45e4.firebasestorage.app",
  messagingSenderId: "288940483230",
  appId: "1:288940483230:web:79157da34827124083518f"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

---

## 🧰 Appwrite Configuration (Frontend)

```ts
// appwrite.ts
import { Client, Storage, ID } from "appwrite";

const client = new Client()
  .setEndpoint("https://fra.cloud.appwrite.io/v1")
  .setProject("68354a45003c063d0155");

const storage = new Storage(client);
export { client, storage, ID };
```

---

## 📂 Appwrite Storage Permissions

**Storage ID:** `68354cbe0020ef2fa14b`

### Bucket Permissions (Recommended Setup)

- **Read:** `role:all` (for public chat media)
- **Create:** `role:users`
- **Update/Delete:** `user:{userId}` (owner only)

For files:

- **Files are assigned user or chat ID in metadata**
- Optional: Enable file-level access tokens for private files

---

## 🧱 Architecture Diagrams

### 1. Basic System Flow

```txt
[Client] 
   ├──> Firebase (auth, messages)
   └──> Appwrite (files)
```

### 2. Message Send Flow

```txt
User Input
   ↓
[React Client] 
   ├── Upload File → Appwrite
   └── Save Message → Firestore (includes Appwrite URL)
```

### 3. Message Receive Flow

```txt
[Firestore]
   → Real-time update to client
      → If fileUrl exists:
          → Render media from Appwrite URL
```

### 4. File Upload & Access

```txt
[Client] 
   └──> Appwrite Storage
            ├── Save File
            └── Return Public/Protected URL
```

### 5. Profile Update Architecture

```txt
[User Avatar Change]
   ↓
Upload to Appwrite
   ↓
Get URL
   ↓
Update Firestore user document with new avatar URL
```

---

## 🔐 Security Rules Summary

### Firebase Firestore
- Only authenticated users can read/write
- Chat write access: members only
- Profile access: self-edit, public-read

### Appwrite Storage
- Public preview for chat media (role:all)
- Optional: token-based access for private files
- Files organized by user or chat ID

---

## ✅ Conclusion

This chat app uses:

- **Firebase** for user authentication and real-time chat
- **Appwrite** for secure and scalable file storage
- **React + Node.js + TypeScript** for development flexibility

You avoid WebSockets by leveraging **Firestore listeners** and **Firestore flags** (e.g., `isTyping`) to replicate live interactivity.

The system is modular, scalable, and AI-ready.
