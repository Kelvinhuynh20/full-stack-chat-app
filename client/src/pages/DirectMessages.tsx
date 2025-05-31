import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';
import { Chat } from '../../../shared/models/types';
import { formatDistanceToNow } from 'date-fns';
import { FiUser, FiMessageCircle, FiPlus } from 'react-icons/fi';
import CreateChatModal from '../components/CreateChatModal';

const DirectMessages = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    // Subscribe to direct message chats where the current user is a member
    const chatsQuery = query(
      collection(db, 'chats'),
      where('members', 'array-contains', currentUser.uid),
      where('isGroup', '==', false),
      orderBy('lastMessageTime', 'desc')
    );

    const unsubscribe = onSnapshot(chatsQuery, (snapshot) => {
      const chatsList: Chat[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        chatsList.push({
          id: doc.id,
          members: data.members,
          isGroup: data.isGroup,
          title: data.title,
          lastMessageTime: data.lastMessageTime?.toDate(),
          lastMessage: data.lastMessage,
          folderName: data.folderName
        });
      });
      setChats(chatsList);
      setLoading(false);
      setInitialized(true);
    }, (error) => {
      console.error('Error fetching direct messages:', error);
      setLoading(false);
      setInitialized(true);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Filter chats by search term
  const filteredChats = chats.filter(chat => {
    return searchTerm 
      ? chat.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        chat.lastMessage?.toLowerCase().includes(searchTerm.toLowerCase())
      : true;
  });

  return (
    <div className="flex flex-col h-full bg-dark-900 text-white">
      {/* Header */}
      <div className="p-4 border-b border-dark-700 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <FiMessageCircle size={20} />
          <h1 className="text-xl font-semibold">Direct Messages</h1>
        </div>
        <button 
          className="p-2 rounded-full bg-primary-600 hover:bg-primary-700 transition-colors"
          onClick={() => setIsModalOpen(true)}
        >
          <FiPlus size={18} />
        </button>
      </div>

      {/* Search input */}
      <div className="p-4">
        <input
          type="text"
          className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-md text-white placeholder-dark-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="Search direct messages..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Direct messages list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        ) : filteredChats.length > 0 ? (
          <div className="divide-y divide-dark-700">
            {filteredChats.map((chat) => {
              // Find the other user in the direct message
              const otherMemberId = chat.members.find(id => id !== currentUser?.uid);
              
              return (
                <div 
                  key={chat.id}
                  className="p-3 hover:bg-dark-700 cursor-pointer transition-colors"
                  onClick={() => navigate(`/direct-messages/${chat.id}`)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-md bg-accent-700 flex items-center justify-center">
                      <FiUser size={18} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium truncate text-white">
                          {chat.title || 'Direct Message'}
                        </p>
                        {chat.lastMessageTime && (
                          <span className="text-xs text-dark-300">
                            {formatDistanceToNow(chat.lastMessageTime, { addSuffix: true })}
                          </span>
                        )}
                      </div>
                      {chat.lastMessage && (
                        <p className="text-sm text-dark-300 truncate">
                          {chat.lastMessage}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 px-4 text-center">
            <div className="text-dark-500 mb-4"><FiMessageCircle size={48} /></div>
            <p className="text-dark-300 mb-2">
              {searchTerm 
                ? 'No matching direct messages' 
                : initialized ? 'No direct messages yet' : 'Loading your messages...'}
            </p>
            <button
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
              onClick={() => setIsModalOpen(true)}
            >
              Start a new conversation
            </button>
          </div>
        )}
      </div>

      {/* Create chat modal */}
      {isModalOpen && (
        <CreateChatModal 
          onClose={() => setIsModalOpen(false)} 
          defaultIsGroup={false}
        />
      )}
    </div>
  );
};

export default DirectMessages;
