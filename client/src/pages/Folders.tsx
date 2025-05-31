import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';
import { Chat } from '../../../shared/models/types';
import { formatDistanceToNow } from 'date-fns';
import { FiFolder, FiPlus, FiUsers } from 'react-icons/fi';
import CreateChatModal from '../components/CreateChatModal';

const Folders = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    // Subscribe to group chats where the current user is a member
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
          folderName: data.folderName,
          isEmptyFolder: data.isEmptyFolder || false
        });
      });
      setChats(chatsList);
      setLoading(false);
      setInitialized(true);
    }, (error) => {
      console.error('Error fetching group chats:', error);
      setLoading(false);
      setInitialized(true);
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
        (chat.lastMessage && chat.lastMessage.toLowerCase().includes(searchTerm.toLowerCase()))
      : true;
    
    // Hide empty folder placeholder chats from the list unless specifically searching for them
    const hideEmptyFolders = !searchTerm || !chat.isEmptyFolder;
    
    return folderMatch && searchMatch && hideEmptyFolders;
  });

  // Handle folder creation
  const handleCreateFolder = () => {
    setIsModalOpen(true);
  };

  return (
    <div className="flex flex-col h-full bg-dark-900 text-white">
      {/* Header */}
      <div className="p-4 border-b border-dark-700 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <FiFolder size={20} />
          <h1 className="text-xl font-semibold">Folders</h1>
        </div>
        <div className="flex space-x-2">
          <button 
            className="p-2 rounded-full bg-accent-600 hover:bg-accent-700 transition-colors flex items-center"
            onClick={handleCreateFolder}
            title="Create new folder"
          >
            <FiFolder size={16} className="mr-1" />
            <FiPlus size={14} />
          </button>
          <button 
            className="p-2 rounded-full bg-primary-600 hover:bg-primary-700 transition-colors"
            onClick={() => setIsModalOpen(true)}
            title="Create new group chat"
          >
            <FiPlus size={18} />
          </button>
        </div>
      </div>

      {/* Folder tabs */}
      {folders.length > 0 && (
        <div className="px-4 pt-2 flex space-x-2 overflow-x-auto">
          <button
            className={`px-3 py-1 rounded-md text-sm ${!activeFolder ? 'bg-primary-600 text-white' : 'bg-dark-700 text-dark-100 hover:bg-dark-600'}`}
            onClick={() => setActiveFolder(null)}
          >
            All
          </button>
          {folders.map(folder => (
            <button
              key={folder}
              className={`px-3 py-1 rounded-md text-sm ${activeFolder === folder ? 'bg-primary-600 text-white' : 'bg-dark-700 text-dark-100 hover:bg-dark-600'}`}
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
          className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-md text-white placeholder-dark-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="Search group chats..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Group chats list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        ) : filteredChats.length > 0 ? (
          <div className="divide-y divide-dark-700">
            {filteredChats.map((chat) => (
              <div 
                key={chat.id}
                className="p-3 hover:bg-dark-700 cursor-pointer transition-colors"
                onClick={() => navigate(`/folders/${chat.id}`)}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-md bg-primary-600 flex items-center justify-center">
                    <FiUsers size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium truncate text-white">
                        {chat.title || 'Group Chat'}
                      </p>
                      {chat.folderName && (
                        <span className="text-xs bg-dark-700 text-dark-200 px-2 py-1 rounded-md flex items-center">
                          <FiFolder size={12} className="mr-1" />
                          {chat.folderName}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      {chat.lastMessage && (
                        <p className="text-sm text-dark-300 truncate">
                          {chat.lastMessage}
                        </p>
                      )}
                      {chat.lastMessageTime && (
                        <span className="text-xs text-dark-400 ml-2">
                          {formatDistanceToNow(chat.lastMessageTime, { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 px-4 text-center">
            <div className="text-dark-500 mb-4"><FiFolder size={48} /></div>
            <p className="text-dark-300 mb-2">
              {searchTerm 
                ? 'No matching group chats' 
                : activeFolder 
                  ? `No group chats in "${activeFolder}"` 
                  : initialized ? 'No group chats yet' : 'Loading your chats...'}
            </p>
            <div className="flex flex-col space-y-2">
              <button
                className="px-4 py-2 bg-accent-600 text-white rounded-md hover:bg-accent-700 transition-colors flex items-center justify-center"
                onClick={handleCreateFolder}
              >
                <FiFolder size={16} className="mr-2" />
                Create a new folder
              </button>
              <button
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors flex items-center justify-center"
                onClick={() => setIsModalOpen(true)}
              >
                <FiPlus size={16} className="mr-2" />
                Create a new group chat
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create chat modal */}
      {isModalOpen && (
        <CreateChatModal 
          onClose={() => setIsModalOpen(false)} 
          defaultIsGroup={true}
          folders={folders}
        />
      )}
    </div>
  );
};

export default Folders; 