# 💬 Full-Stack Chat App

A full-stack, real-time chat application built with **React**, **Node.js**, and **TypeScript**. Firebase handles **real-time data & authentication**, while Appwrite handles **file and folder storage**. Designed to be scalable, modular, and production-ready.

## ⚙️ Tech Stack

### Frontend
- React (TypeScript)
- Tailwind CSS
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

## 🚀 Core Features

- Real-time 1-on-1 and group messaging
- File uploads (image, audio, video, docs)
- User profiles with avatars
- Online status & last seen tracking
- Firebase-authenticated users
- File preview for uploaded media
- Editable & deletable messages
- Typing indicators via Firestore flags

## 🌟 Unique Features

- 📝 Message editing & deletion
- 📌 Pin important messages
- 📁 Chat folder organization (e.g., Personal, Work)
- 🔍 Smart search across messages and users
- 🎙️ Voice message recording (stored in Appwrite)
- 📽️ In-chat media previewer
- 🔒 Firebase rules + Appwrite access control

## 🔜 Planned Features

- ✅ Read receipts (delivered/read)
- 💡 AI reply suggestions (OpenAI API)
- 🌑 Dark/light mode
- 🧑‍🤝‍🧑 Group admin/moderation roles
- 🧼 Auto-delete expired media via Appwrite Functions
- 📊 Chat insights (activity stats per day)
- 🌐 PWA support for offline access

## 🚀 Getting Started

### Prerequisites
- Node.js (v14+)
- npm or yarn
- Firebase account
- Appwrite account

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/chat-app.git
cd chat-app
```

2. Install dependencies for client and server
```bash
# Install client dependencies
cd client
npm install

# Install server dependencies
cd ../server
npm install
```

3. Set up environment variables
   - Create a `.env` file in the root directory
   - Add your Firebase and Appwrite credentials (see .env.example)

4. Install root dependencies and all project dependencies
```bash
# From the root directory
npm run install:all
```

5. Start the development servers
```bash
# Start both client and server concurrently
npm run dev

# Or start them individually
npm run client  # Start only the client
npm run server  # Start only the server
```

## 📂 Project Structure

```
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
└── README.md
```
