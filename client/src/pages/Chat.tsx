import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { db } from '../services/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  query, 
  orderBy, 
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  where
} from 'firebase/firestore';
import { format } from 'date-fns';
import { uploadFile } from '../services/appwrite';
import { ChatMessage, FileUpload, TypingIndicator as TypingIndicatorType } from '../../../shared/models/types';
import { FiSend, FiPaperclip, FiCheck, FiX, FiMessageCircle, FiUsers, FiFolder, FiPlusCircle, FiEdit, FiTrash2, FiStar, FiLoader, FiArrowLeft } from 'react-icons/fi';
import MessageItem from '../components/MessageItem';

interface ChatProps {
  type?: 'direct' | 'folder';
}

const Chat: React.FC<ChatProps> = ({ type = 'direct' }) => {
  const { chatId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [chat, setChat] = useState<any>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fileUploads, setFileUploads] = useState<FileUpload[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingIndicatorType[]>([]);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch chat data
  useEffect(() => {
    if (!chatId || !currentUser) return;

    const fetchChat = async () => {
      try {
        const chatDoc = await getDoc(doc(db, 'chats', chatId));
        
        if (!chatDoc.exists()) {
          setError('Chat not found');
          setLoading(false);
          return;
        }
        
        const chatData = chatDoc.data();
        
        // Check if current user is a member of this chat
        if (!chatData.members.includes(currentUser.uid)) {
          setError('You are not a member of this chat');
          setLoading(false);
          return;
        }
        
        setChat(chatData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching chat:', err);
        setError('Failed to load chat');
        setLoading(false);
      }
    };

    fetchChat();
  }, [chatId, currentUser]);

  // Subscribe to messages
  useEffect(() => {
    if (!chatId || !currentUser) return;

    const messagesQuery = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesList: ChatMessage[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        messagesList.push({
          id: doc.id,
          text: data.text,
          senderId: data.senderId,
          senderName: data.senderName,
          timestamp: data.timestamp?.toDate(),
          files: data.files || [],
          isEdited: data.isEdited || false,
          isPinned: data.isPinned || false
        });
      });
      setMessages(messagesList);
    });

    return () => unsubscribe();
  }, [chatId, currentUser]);

  // Subscribe to typing indicators
  useEffect(() => {
    if (!chatId || !currentUser) return;

    const typingQuery = query(
      collection(db, 'chats', chatId, 'typing'),
      where('userId', '!=', currentUser.uid)
    );

    const unsubscribe = onSnapshot(typingQuery, (snapshot) => {
      const typingList: TypingIndicatorType[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Only show typing indicators that are recent (within the last 10 seconds)
        const timestamp = data.timestamp?.toDate();
        if (timestamp && (new Date().getTime() - timestamp.getTime()) < 10000) {
          typingList.push({
            id: doc.id,
            userId: data.userId,
            userName: data.userName,
            timestamp: timestamp
          });
        }
      });
      setTypingUsers(typingList);
    });

    return () => unsubscribe();
  }, [chatId, currentUser]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Update typing indicator
  const updateTypingStatus = async (isTyping: boolean) => {
    if (!chatId || !currentUser) return;

    try {
      const typingRef = doc(db, 'chats', chatId, 'typing', currentUser.uid);
      
      if (isTyping) {
        await updateDoc(typingRef, {
          userId: currentUser.uid,
          userName: currentUser.displayName,
          timestamp: serverTimestamp()
        }).catch(() => {
          // If document doesn't exist, create it
          addDoc(collection(db, 'chats', chatId, 'typing'), {
            userId: currentUser.uid,
            userName: currentUser.displayName,
            timestamp: serverTimestamp()
          });
        });
      } else {
        // Remove typing indicator when not typing
        await deleteDoc(typingRef).catch(() => {
          // Ignore errors if document doesn't exist
        });
      }
    } catch (err) {
      console.error('Error updating typing status:', err);
    }
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageText(e.target.value);
    
    // Update typing indicator
    if (!isTyping && e.target.value.trim()) {
      setIsTyping(true);
      updateTypingStatus(true);
    } else if (isTyping && !e.target.value.trim()) {
      setIsTyping(false);
      updateTypingStatus(false);
    }
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set timeout to clear typing indicator after 5 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        updateTypingStatus(false);
      }
    }, 5000);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // Convert FileList to array and add to uploads
    const newUploads: FileUpload[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Determine file type
      let fileType = 'document';
      if (file.type.startsWith('image/')) fileType = 'image';
      else if (file.type.startsWith('video/')) fileType = 'video';
      else if (file.type.startsWith('audio/')) fileType = 'audio';
      
      newUploads.push({
        file,
        name: file.name,
        type: fileType as any,
        size: file.size,
        progress: 0,
        url: '',
        downloadUrl: '',
        id: ''
      });
    }
    
    setFileUploads([...fileUploads, ...newUploads]);
    
    // Clear the input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Immediately start uploading the files
    try {
      setUploadLoading(true);
      const updatedUploads = [...fileUploads, ...newUploads];
      const uploadPromises = newUploads.map(async (upload, index) => {
        const totalIndex = fileUploads.length + index;
        try {
          const result = await uploadFile(upload.file, chatId, currentUser?.uid);
          updatedUploads[totalIndex] = {
            ...updatedUploads[totalIndex],
            url: result.url,
            downloadUrl: result.downloadUrl,
            id: result.id,
            progress: 100
          };
          setFileUploads([...updatedUploads]);
          return result;
        } catch (error) {
          console.error('Error uploading file:', error);
          // Mark as failed
          updatedUploads[totalIndex] = {
            ...updatedUploads[totalIndex],
            progress: -1
          };
          setFileUploads([...updatedUploads]);
          return null;
        }
      });
      
      await Promise.all(uploadPromises);
    } catch (error) {
      console.error('Error handling file uploads:', error);
    } finally {
      setUploadLoading(false);
    }
  };

  const removeFileUpload = (index: number) => {
    const newUploads = [...fileUploads];
    newUploads.splice(index, 1);
    setFileUploads(newUploads);
  };

  const handleSendMessage = async () => {
    if ((!messageText.trim() && fileUploads.length === 0) || !chatId || !currentUser) return;
    
    try {
      // Reset typing status
      setIsTyping(false);
      updateTypingStatus(false);
      
      // Prepare file attachments
      const files = fileUploads
        .filter(upload => upload.url && upload.id) // Only include successfully uploaded files
        .map(upload => ({
          id: upload.id,
          url: upload.url,
          downloadUrl: upload.downloadUrl,
          name: upload.name,
          type: upload.type,
          size: upload.size
        }));
      
      // Add message to Firestore
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        text: messageText.trim(),
        senderId: currentUser.uid,
        senderName: currentUser.displayName,
        timestamp: serverTimestamp(),
        files,
        isEdited: false,
        isPinned: false
      });
      
      // Update last message in chat document
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: messageText.trim() || `${files.length} file${files.length > 1 ? 's' : ''}`,
        lastMessageTime: serverTimestamp()
      });
      
      // Reset state
      setMessageText('');
      setFileUploads([]);
      
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Failed to send message. Please try again.');
    }
  };

  const handleEditMessage = async () => {
    if (!editingMessageId || !chatId || !currentUser) return;
    
    try {
      await updateDoc(doc(db, 'chats', chatId, 'messages', editingMessageId), {
        text: editingText.trim(),
        isEdited: true,
        editedAt: serverTimestamp()
      });
      
      setEditingMessageId(null);
      setEditingText('');
    } catch (err) {
      console.error('Error editing message:', err);
      alert('Failed to edit message. Please try again.');
    }
  };

  const startEditingMessage = (message: ChatMessage) => {
    setEditingMessageId(message.id);
    setEditingText(message.text || '');
  };

  const cancelEditingMessage = () => {
    setEditingMessageId(null);
    setEditingText('');
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!chatId || !currentUser) return;
    
    try {
      await deleteDoc(doc(db, 'chats', chatId, 'messages', messageId));
    } catch (err) {
      console.error('Error deleting message:', err);
      alert('Failed to delete message. Please try again.');
    }
  };

  const handlePinMessage = async (messageId: string, isPinned: boolean) => {
    if (!chatId || !currentUser) return;
    
    try {
      await updateDoc(doc(db, 'chats', chatId, 'messages', messageId), {
        isPinned: !isPinned
      });
    } catch (err) {
      console.error('Error pinning message:', err);
      alert('Failed to pin message. Please try again.');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (editingMessageId) {
        handleEditMessage();
      } else {
        handleSendMessage();
      }
    }
  };

  const handleBackNavigation = () => {
    if (type === 'folder') {
      navigate('/folders');
    } else {
      navigate('/direct-messages');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <div className="text-dark-300 mb-4 text-5xl">⚠️</div>
        <h2 className="text-xl font-semibold mb-2 text-white">{error}</h2>
        <p className="text-dark-300 mb-4">You might not have permission to view this chat or it might have been deleted.</p>
        <button
          onClick={handleBackNavigation}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors flex items-center"
        >
          <FiArrowLeft className="mr-2" />
          Go Back
        </button>
      </div>
    );
  }

  const pinnedMessages = messages.filter(msg => msg.isPinned);
  const regularMessages = messages.filter(msg => !msg.isPinned);

  return (
    <div className="flex flex-col h-full bg-dark-900">
      {/* Chat header */}
      <div className="p-4 border-b border-dark-700 flex items-center">
        <button
          onClick={handleBackNavigation}
          className="mr-3 text-dark-300 hover:text-white"
        >
          <FiArrowLeft size={20} />
        </button>
        <div className={`w-10 h-10 rounded-md flex items-center justify-center mr-3 ${chat?.isGroup ? 'bg-primary-700' : 'bg-accent-700'}`}>
          {chat?.isGroup ? (
            <FiUsers size={20} className="text-white" />
          ) : (
            <FiMessageCircle size={20} className="text-white" />
          )}
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-white">{chat?.title || 'Chat'}</h2>
          {chat?.folderName && (
            <div className="flex items-center text-dark-300 text-sm">
              <FiFolder size={14} className="mr-1" />
              {chat.folderName}
            </div>
          )}
        </div>
      </div>

      {/* Messages container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Pinned messages */}
        {pinnedMessages.length > 0 && (
          <div className="mb-4 border-b border-dark-700 pb-4">
            <h3 className="text-dark-300 text-xs uppercase font-semibold mb-3 flex items-center">
              <FiStar className="mr-1" /> Pinned Messages
            </h3>
            <div className="space-y-3">
              {pinnedMessages.map(message => (
                <MessageItem
                  key={message.id}
                  message={message}
                  isCurrentUser={message.senderId === currentUser?.uid}
                  onEdit={() => startEditingMessage(message)}
                  onDelete={() => handleDeleteMessage(message.id)}
                  onPin={() => handlePinMessage(message.id, message.isPinned)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Regular messages */}
        <div className="space-y-4">
          {regularMessages.map(message => (
            <MessageItem
              key={message.id}
              message={message}
              isCurrentUser={message.senderId === currentUser?.uid}
              onEdit={() => startEditingMessage(message)}
              onDelete={() => handleDeleteMessage(message.id)}
              onPin={() => handlePinMessage(message.id, message.isPinned)}
            />
          ))}
        </div>

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-center text-dark-300 text-sm animate-pulse">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
              <div className="w-2 h-2 bg-primary-500 rounded-full animation-delay-200"></div>
              <div className="w-2 h-2 bg-primary-500 rounded-full animation-delay-400"></div>
            </div>
            <span className="ml-2">
              {typingUsers.length === 1
                ? `${typingUsers[0].userName} is typing...`
                : `${typingUsers.length} people are typing...`}
            </span>
          </div>
        )}

        {/* Invisible element for auto-scrolling */}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <div className="p-4 border-t border-dark-700">
        {/* File uploads preview */}
        {fileUploads.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {fileUploads.map((upload, index) => (
              <div key={index} className="relative bg-dark-700 rounded-md p-2 flex items-center">
                <span className="text-sm text-white truncate max-w-[150px]">{upload.name}</span>
                {upload.progress < 100 && upload.progress >= 0 && (
                  <div className="ml-2 text-dark-300">
                    <FiLoader className="animate-spin" />
                  </div>
                )}
                {upload.progress === 100 && (
                  <div className="ml-2 text-green-500">
                    <FiCheck />
                  </div>
                )}
                {upload.progress === -1 && (
                  <div className="ml-2 text-red-500">
                    <FiX />
                  </div>
                )}
                <button
                  className="ml-2 text-dark-300 hover:text-white"
                  onClick={() => removeFileUpload(index)}
                >
                  <FiX />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Edit message indicator */}
        {editingMessageId && (
          <div className="mb-3 bg-dark-700 p-2 rounded-md flex items-center justify-between">
            <span className="text-sm text-dark-300">Editing message</span>
            <button
              className="text-dark-300 hover:text-white"
              onClick={cancelEditingMessage}
            >
              <FiX />
            </button>
          </div>
        )}

        {/* Message input form */}
        <div className="flex items-end">
          <div className="relative flex-1">
            <textarea
              className="w-full p-3 pr-12 bg-dark-700 border border-dark-600 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 text-white placeholder-dark-300 min-h-[80px] max-h-[160px]"
              placeholder="Type a message..."
              value={editingMessageId ? editingText : messageText}
              onChange={editingMessageId ? (e) => setEditingText(e.target.value) : handleMessageChange}
              onKeyDown={handleKeyDown}
              disabled={uploadLoading}
            />
            <label
              htmlFor="file-upload"
              className="absolute bottom-3 right-12 text-dark-300 hover:text-white cursor-pointer"
            >
              <FiPaperclip size={20} />
            </label>
            <input
              id="file-upload"
              type="file"
              multiple
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              disabled={uploadLoading}
            />
          </div>
          <button
            className="ml-3 p-3 bg-primary-600 rounded-md text-white hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={editingMessageId ? handleEditMessage : handleSendMessage}
            disabled={
              (editingMessageId ? !editingText.trim() : !messageText.trim() && fileUploads.length === 0) ||
              uploadLoading
            }
          >
            <FiSend size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
