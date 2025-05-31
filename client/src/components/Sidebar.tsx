import { useState, useEffect } from 'react';
import { Link, useParams, useLocation, useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';
import { Chat } from '../../../shared/models/types';
import { formatDistanceToNow } from 'date-fns';
import CreateChatModal from './CreateChatModal';
import { FiPlus, FiSearch, FiMessageCircle, FiUsers, FiFolder, FiUser } from 'react-icons/fi';

const Sidebar = () => {
  const { currentUser } = useAuth();
  const { chatId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Determine active section based on current route
  const isDirectMessagesActive = location.pathname.startsWith('/direct-messages');
  const isFoldersActive = location.pathname.startsWith('/folders');

  // Extract folder name from URL if present in the path
  useEffect(() => {
    // Get the current folder from chats if we're in a specific folder chat
    if (isFoldersActive && chatId) {
      const currentChat = chats.find(chat => chat.id === chatId);
      if (currentChat?.folderName) {
        setActiveFolder(currentChat.folderName);
      }
    }
  }, [chatId, chats, isFoldersActive]);

  useEffect(() => {
    if (!currentUser) return;

    // Add a timeout to ensure loading state doesn't get stuck
    const loadingTimeout = setTimeout(() => {
      setLoading(false);
    }, 10000); // 10 seconds timeout

    // Subscribe to chats where the current user is a member
    const chatsQuery = query(
      collection(db, 'chats'),
      where('members', 'array-contains', currentUser.uid),
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
      clearTimeout(loadingTimeout); // Clear the timeout since we got data
    }, (error) => {
      console.error('Error fetching chats:', error);
      setLoading(false);
      clearTimeout(loadingTimeout);
    });

    return () => {
      unsubscribe();
      clearTimeout(loadingTimeout);
    };
  }, [currentUser]);

  // Get unique folders
  const folders = [...new Set(chats.map(chat => chat.folderName).filter(Boolean))];

  // Handle folder click
  const handleFolderClick = (folder: string) => {
    setActiveFolder(folder);
    
    // Find the first chat in this folder to navigate to
    const firstChatInFolder = chats.find(chat => chat.isGroup && chat.folderName === folder);
    
    if (firstChatInFolder) {
      navigate(`/folders/${firstChatInFolder.id}`);
    } else {
      // If no chats in this folder yet, navigate to folders view with the active folder set
      navigate('/folders');
    }
  };

  // Filter chats by type (direct or group) and search term
  const filteredChats = chats
    .filter(chat => {
      // Filter by chat type based on current route
      const typeMatch = isDirectMessagesActive 
        ? !chat.isGroup 
        : isFoldersActive && chat.isGroup;
      
      // Filter by folder if active and in folders view
      const folderMatch = isFoldersActive && activeFolder 
        ? chat.folderName === activeFolder
        : true;
      
      // Filter by search term if present
      const searchMatch = searchTerm 
        ? chat.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          chat.lastMessage?.toLowerCase().includes(searchTerm.toLowerCase())
        : true;
      
      return typeMatch && folderMatch && searchMatch;
    });

  return (
    <div className="flex h-screen">
      {/* Navigation sidebar */}
      <div className="w-20 bg-dark-800 flex flex-col items-center py-4 space-y-4 border-r border-dark-700">
        {/* Direct Messages button */}
        <Link 
          to="/direct-messages" 
          className={`w-12 h-12 rounded-lg flex items-center justify-center hover:bg-primary-700 transition-all duration-200 ${isDirectMessagesActive ? 'bg-primary-600' : 'bg-dark-700'}`}
          title="Direct Messages"
          onClick={() => setActiveFolder(null)}
        >
          <FiMessageCircle size={24} />
        </Link>
        
        {/* Folders button */}
        <Link 
          to="/folders" 
          className={`w-12 h-12 rounded-lg flex items-center justify-center hover:bg-primary-700 transition-all duration-200 ${isFoldersActive && !activeFolder ? 'bg-primary-600' : 'bg-dark-700'}`}
          title="All Folders"
          onClick={() => setActiveFolder(null)}
        >
          <FiFolder size={24} />
        </Link>
        
        {/* Divider */}
        <div className="w-8 h-0.5 bg-dark-600 rounded-full"></div>
        
        {/* Folder buttons */}
        {folders.map((folder) => (
          <button
            key={folder}
            className={`w-12 h-12 rounded-lg flex items-center justify-center hover:bg-primary-700 transition-all duration-200 ${isFoldersActive && activeFolder === folder ? 'bg-primary-600' : 'bg-dark-700'}`}
            onClick={() => handleFolderClick(folder)}
            title={folder}
          >
            <FiFolder size={20} />
            <span className="sr-only">{folder}</span>
          </button>
        ))}
        
        {/* Add new chat button */}
        <button
          className="w-12 h-12 rounded-lg flex items-center justify-center bg-dark-700 hover:bg-accent-600 transition-all duration-200"
          onClick={() => setIsModalOpen(true)}
          title="Create new chat"
        >
          <FiPlus size={24} />
        </button>
        
        {/* Profile button at bottom */}
        <div className="mt-auto">
          <Link 
            to="/profile" 
            className={`w-12 h-12 rounded-lg flex items-center justify-center hover:bg-primary-700 transition-all duration-200 ${location.pathname === '/profile' ? 'bg-primary-600' : 'bg-dark-700'}`}
            title="Profile"
          >
            <FiUser size={24} />
          </Link>
        </div>
      </div>
      
      {/* Chat list sidebar - only show if we're in a specific chat */}
      {(location.pathname.includes('/direct-messages/') || location.pathname.includes('/folders/') || location.pathname.includes('/chat/')) && (
        <div className="w-64 bg-dark-800 flex flex-col border-r border-dark-700">
          {/* Header */}
          <div className="p-4 border-b border-dark-700">
            <h2 className="text-lg font-semibold text-white">
              {isFoldersActive ? (activeFolder || 'Group Chats') : 'Direct Messages'}
            </h2>
          </div>
        
          {/* Search input */}
          <div className="px-3 py-2">
            <div className="relative">
              <input
                type="text"
                className="w-full pl-8 pr-3 py-2 rounded-md bg-dark-700 text-white placeholder-dark-300 focus:outline-none focus:ring-1 focus:ring-primary-500 text-sm"
                placeholder={`Search ${isFoldersActive ? 'group chats' : 'direct messages'}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                <FiSearch size={16} className="text-dark-300" />
              </div>
            </div>
          </div>
          
          {/* Chat categories */}
          <div className="p-3">
            <div className="flex items-center justify-between text-xs font-semibold text-dark-300 uppercase tracking-wider py-2">
              <span>{isFoldersActive ? (activeFolder ? `FOLDER: ${activeFolder}` : 'GROUP CHATS') : 'CONVERSATIONS'}</span>
              <button 
                className="hover:text-white"
                onClick={() => setIsModalOpen(true)}
                title="Create new chat"
              >
                <FiPlus size={16} />
              </button>
            </div>
          </div>
        
          {/* Chats list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500"></div>
              </div>
            ) : filteredChats.length > 0 ? (
              <ul>
                {filteredChats.map((chat) => (
                  <li key={chat.id}>
                    <Link
                      to={chat.isGroup ? `/folders/${chat.id}` : `/direct-messages/${chat.id}`}
                      className={`flex items-center px-3 py-2 mx-2 my-1 rounded-md hover:bg-dark-700 transition-colors duration-100 ${chatId === chat.id ? 'bg-dark-700' : ''}`}
                    >
                      {/* Chat icon */}
                      <div className={`w-8 h-8 rounded-md flex items-center justify-center mr-2 ${chat.isGroup ? 'bg-primary-700' : 'bg-accent-700'}`}>
                        {chat.isGroup ? (
                          <FiUsers size={16} className="text-white" />
                        ) : (
                          <FiMessageCircle size={16} className="text-white" />
                        )}
                      </div>
                      
                      {/* Chat name and last message */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium truncate text-white">
                            {chat.title || (chat.isGroup ? 'Group Chat' : 'Chat')}
                          </p>
                          {chat.lastMessageTime && (
                            <span className="text-xs text-dark-300 ml-2">
                              {formatDistanceToNow(chat.lastMessageTime, { addSuffix: false })}
                            </span>
                          )}
                        </div>
                        {chat.lastMessage && (
                          <p className="text-xs text-dark-300 truncate">
                            {chat.lastMessage.length > 30 ? chat.lastMessage.substring(0, 30) + '...' : chat.lastMessage}
                          </p>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 px-4 text-center">
                <p className="text-dark-300 text-sm">
                  {searchTerm 
                    ? 'No matching chats' 
                    : isFoldersActive 
                      ? activeFolder 
                        ? `No group chats in "${activeFolder}"` 
                        : 'No group chats yet' 
                      : 'No direct messages yet'}
                </p>
                <button
                  className="mt-2 text-primary-400 text-sm hover:underline"
                  onClick={() => setIsModalOpen(true)}
                >
                  {isFoldersActive ? 'Create a group chat' : 'Start a conversation'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Create chat modal */}
      {isModalOpen && (
        <CreateChatModal 
          onClose={() => setIsModalOpen(false)}
          folders={folders}
          defaultIsGroup={isFoldersActive}
          defaultFolder={activeFolder}
        />
      )}
    </div>
  );
};

export default Sidebar;
