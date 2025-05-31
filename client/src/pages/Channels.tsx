import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';
import { Chat } from '../../../shared/models/types';
import { formatDistanceToNow } from 'date-fns';
import { FiHash, FiPlus } from 'react-icons/fi';
import CreateChatModal from '../components/CreateChatModal';

const Channels = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFolder, setActiveFolder] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    // Subscribe to group chats (channels) where the current user is a member
    const chatsQuery = query(
      collection(db, 'chats'),
      where('members', 'array-contains', currentUser.uid),
      where('isGroup', '==', true),
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
    }, (error) => {
      console.error('Error fetching channels:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Get unique folders
  const folders = [...new Set(chats.map(chat => chat.folderName).filter(Boolean))];

  // Filter chats by active folder and search term
  const filteredChats = chats.filter(chat => {
    // Filter by folder if active
    const folderMatch = activeFolder 
      ? chat.folderName === activeFolder
      : true;
    
    // Filter by search term if present
    const searchMatch = searchTerm 
      ? chat.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        chat.lastMessage?.toLowerCase().includes(searchTerm.toLowerCase())
      : true;
    
    return folderMatch && searchMatch;
  });

  return (
    <div className="flex flex-col h-full bg-gray-800 text-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <FiHash size={20} />
          <h1 className="text-xl font-semibold">Channels</h1>
        </div>
        <button 
          className="p-2 rounded-full bg-indigo-600 hover:bg-indigo-700 transition-colors"
          onClick={() => setIsModalOpen(true)}
        >
          <FiPlus size={18} />
        </button>
      </div>

      {/* Folder tabs */}
      {folders.length > 0 && (
        <div className="px-4 pt-2 flex space-x-2 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-600">
          <button
            className={`px-3 py-1 rounded-full text-sm ${!activeFolder ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            onClick={() => setActiveFolder(null)}
          >
            All
          </button>
          {folders.map(folder => (
            <button
              key={folder}
              className={`px-3 py-1 rounded-full text-sm ${activeFolder === folder ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
              onClick={() => setActiveFolder(folder || null)}
            >
              {folder}
            </button>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="p-4">
        <input
          type="text"
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Search channels..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Channels list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredChats.length > 0 ? (
          <div className="divide-y divide-gray-700">
            {filteredChats.map((chat) => (
              <div 
                key={chat.id}
                className="p-3 hover:bg-gray-700 cursor-pointer transition-colors"
                onClick={() => navigate(`/channels/${chat.id}`)}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center">
                    <FiHash size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium truncate">
                        {chat.title || 'Channel'}
                      </p>
                      {chat.lastMessageTime && (
                        <span className="text-xs text-gray-400">
                          {formatDistanceToNow(chat.lastMessageTime, { addSuffix: true })}
                        </span>
                      )}
                    </div>
                    {chat.lastMessage && (
                      <p className="text-sm text-gray-400 truncate">
                        {chat.lastMessage}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 px-4 text-center">
            <div className="text-gray-600 mb-4"><FiHash size={48} /></div>
            <p className="text-gray-400 mb-2">
              {searchTerm 
                ? 'No matching channels' 
                : activeFolder 
                  ? `No channels in "${activeFolder}"` 
                  : 'No channels yet'}
            </p>
            <button
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
              onClick={() => setIsModalOpen(true)}
            >
              Create a new channel
            </button>
          </div>
        )}
      </div>

      {/* Create chat modal */}
      {isModalOpen && (
        <CreateChatModal 
          onClose={() => setIsModalOpen(false)} 
          defaultIsGroup={true}
          defaultFolder={activeFolder}
        />
      )}
    </div>
  );
};

export default Channels;
