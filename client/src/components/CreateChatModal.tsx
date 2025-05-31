import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, FieldValue } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { FiX, FiSearch, FiUsers, FiFolder, FiUserPlus, FiMessageCircle, FiPlusCircle } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  lastSeen?: Date;
  online?: boolean;
}

interface CreateChatModalProps {
  onClose: () => void;
  defaultIsGroup?: boolean;
  defaultFolder?: string | null;
  folders?: string[];
}

const CreateChatModal: React.FC<CreateChatModalProps> = ({ 
  onClose, 
  defaultIsGroup = false, 
  defaultFolder = null,
  folders = []
}) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isGroup, setIsGroup] = useState(defaultIsGroup);
  const [title, setTitle] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [folderName, setFolderName] = useState(defaultFolder || '');
  const [isNewFolder, setIsNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [isCreatingEmptyFolder, setIsCreatingEmptyFolder] = useState(false);

  // Fetch users when search term changes
  useEffect(() => {
    const fetchUsers = async () => {
      if (!searchTerm || searchTerm.length < 2) {
        setUsers([]);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);
      
      try {
        // Search for users by displayName and email
        // Use a simpler query approach that works better with Firestore
        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);
        
        // Filter results client-side for more flexible matching
        const searchTermLower = searchTerm.toLowerCase();
        // Filter results client-side for more flexible matching
        const usersList = snapshot.docs
          .filter(doc => {
            const data = doc.data();
            const displayName = (data.displayName || '').toLowerCase();
            const email = (data.email || '').toLowerCase();
            return (displayName.includes(searchTermLower) || email.includes(searchTermLower)) && 
                   doc.id !== currentUser?.uid; // Exclude current user
          })
          .slice(0, 10) // Limit to 10 results
          .map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
        
        setUsers(usersList);
        
        if (usersList.length === 0 && searchTerm.length >= 2) {
          setError(`No users found matching "${searchTerm}"`); 
        }
      } catch (error) {
        console.error('Error fetching users:', error);
        setError('Failed to search for users. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    // Add a small delay to avoid too many Firestore queries while typing
    const timer = setTimeout(() => {
      fetchUsers();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, currentUser]);

  const handleSelectUser = (user: UserProfile) => {
    if (!selectedUsers.some(u => u.id === user.id)) {
      setSelectedUsers([...selectedUsers, user]);
      setSearchTerm('');
      setUsers([]);
    }
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter(user => user.id !== userId));
  };

  const handleCreateEmptyFolder = async () => {
    if (!newFolderName.trim()) {
      alert('Please enter a folder name');
      return;
    }

    try {
      // Create a placeholder chat document that represents the folder
      const folderData = {
        members: [currentUser?.uid],
        isGroup: true,
        createdBy: currentUser?.uid,
        lastMessageTime: serverTimestamp(),
        createdAt: serverTimestamp(),
        title: `${newFolderName} (Empty)`,
        folderName: newFolderName.trim(),
        isEmptyFolder: true // Special flag to identify empty folders
      };

      await addDoc(collection(db, 'chats'), folderData);
      
      // Navigate to folders view
      navigate('/folders');
      onClose();
    } catch (error) {
      console.error('Error creating folder:', error);
      alert('Failed to create folder. Please try again.');
    }
  };

  const handleCreateChat = async () => {
    if (selectedUsers.length === 0) {
      alert('Please select at least one user');
      return;
    }

    if (isGroup && !title) {
      alert('Please enter a group title');
      return;
    }

    try {
      const members = [
        currentUser?.uid,
        ...selectedUsers.map(user => user.id)
      ];

      // For 1-on-1 chats, check if a chat already exists
      if (!isGroup && selectedUsers.length === 1) {
        const chatsQuery = query(
          collection(db, 'chats'),
          where('members', 'array-contains', currentUser?.uid)
        );
        
        const snapshot = await getDocs(chatsQuery);
        const existingChat = snapshot.docs.find(doc => {
          const data = doc.data();
          return (
            data.members.includes(selectedUsers[0].id) &&
            data.members.length === 2 &&
            !data.isGroup
          );
        });
        
        if (existingChat) {
          navigate(`/direct-messages/${existingChat.id}`);
          onClose();
          return;
        }
      }

      // Create a new chat
      interface ChatData {
        members: (string | undefined)[];
        isGroup: boolean;
        createdBy: string | undefined;
        lastMessageTime: FieldValue;
        createdAt: FieldValue;
        title?: string;
        folderName?: string;
      }
      
      const chatData: ChatData = {
        members,
        isGroup,
        createdBy: currentUser?.uid,
        lastMessageTime: serverTimestamp(),
        createdAt: serverTimestamp()
      };

      if (isGroup) {
        chatData.title = title;
      } else {
        chatData.title = selectedUsers[0].displayName;
      }

      // Set folder name only for group chats
      if (isGroup) {
        const finalFolderName = isNewFolder ? newFolderName : folderName;
        if (finalFolderName) {
          chatData.folderName = finalFolderName;
        }
      }

      const chatRef = await addDoc(collection(db, 'chats'), chatData);
      const chatId = chatRef.id;

      // Navigate to the new chat based on type
      if (isGroup) {
        navigate(`/folders/${chatId}`);
      } else {
        navigate(`/direct-messages/${chatId}`);
      }

      onClose();
    } catch (error) {
      console.error('Error creating chat:', error);
      alert('Failed to create chat. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-dark-900 opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-dark-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-dark-700">
          {/* Modal Header */}
          <div className="bg-dark-700 px-6 py-4 border-b border-dark-600">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white flex items-center">
                {isCreatingEmptyFolder ? (
                  <>
                    <FiFolder className="mr-2" />
                    Create New Folder
                  </>
                ) : isGroup ? (
                  <>
                    <FiUsers className="mr-2" />
                    Create Group Chat
                  </>
                ) : (
                  <>
                    <FiMessageCircle className="mr-2" />
                    Start a New Chat
                  </>
                )}
              </h3>
              <button
                onClick={onClose}
                className="text-dark-300 hover:text-white focus:outline-none"
              >
                <FiX size={20} />
              </button>
            </div>
          </div>
          
          <div className="bg-dark-800 px-6 py-5">
            {/* Create Empty Folder / Chat Type Selection */}
            <div className="mb-5">
              <div className="flex items-center p-3 bg-dark-700 rounded-lg">
                <div className="flex flex-col space-y-3 w-full">
                  <div className="flex items-center">
                    <input
                      id="empty-folder-toggle"
                      type="radio"
                      name="chat-type"
                      className="h-5 w-5 text-primary-600 focus:ring-primary-500 border-dark-600 rounded-full"
                      checked={isCreatingEmptyFolder}
                      onChange={() => {
                        setIsCreatingEmptyFolder(true);
                        setIsGroup(false);
                      }}
                    />
                    <label htmlFor="empty-folder-toggle" className="ml-3 block text-sm font-medium text-white">
                      Create an empty folder
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      id="group-toggle"
                      type="radio"
                      name="chat-type"
                      className="h-5 w-5 text-primary-600 focus:ring-primary-500 border-dark-600 rounded-full"
                      checked={!isCreatingEmptyFolder && isGroup}
                      onChange={() => {
                        setIsCreatingEmptyFolder(false);
                        setIsGroup(true);
                      }}
                    />
                    <label htmlFor="group-toggle" className="ml-3 block text-sm font-medium text-white">
                      Create a group chat
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      id="direct-toggle"
                      type="radio"
                      name="chat-type"
                      className="h-5 w-5 text-primary-600 focus:ring-primary-500 border-dark-600 rounded-full"
                      checked={!isCreatingEmptyFolder && !isGroup}
                      onChange={() => {
                        setIsCreatingEmptyFolder(false);
                        setIsGroup(false);
                        // Clear folder selection for direct messages
                        setFolderName('');
                        setIsNewFolder(false);
                        setNewFolderName('');
                      }}
                    />
                    <label htmlFor="direct-toggle" className="ml-3 block text-sm font-medium text-white">
                      Start a direct message
                    </label>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Empty Folder Name */}
            {isCreatingEmptyFolder && (
              <div className="mb-5">
                <label htmlFor="folder-name" className="block text-sm font-medium text-dark-200 mb-1">
                  Folder Name
                </label>
                <div className="relative rounded-md shadow-sm">
                  <input
                    type="text"
                    id="folder-name"
                    className="block w-full pl-10 pr-3 py-2 rounded-md border border-dark-600 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-dark-700 text-white placeholder-dark-400"
                    placeholder="Enter folder name"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiFolder className="text-dark-400" />
                  </div>
                </div>
              </div>
            )}
            
            {/* Group title */}
            {!isCreatingEmptyFolder && isGroup && (
              <div className="mb-5">
                <label htmlFor="group-title" className="block text-sm font-medium text-dark-200 mb-1">
                  Group Name
                </label>
                <div className="relative rounded-md shadow-sm">
                  <input
                    type="text"
                    id="group-title"
                    className="block w-full pl-10 pr-3 py-2 rounded-md border border-dark-600 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-dark-700 text-white placeholder-dark-400"
                    placeholder="Enter group name"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiUsers className="text-dark-400" />
                  </div>
                </div>
              </div>
            )}
            
            {/* Folder selection - only for group chats */}
            {!isCreatingEmptyFolder && isGroup && (
              <div className="mb-5">
                <label className="block text-sm font-medium text-dark-200 mb-1">
                  Add to Folder
                </label>
                
                <div className="space-y-3">
                  {/* Existing folders */}
                  {folders.length > 0 && !isNewFolder && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        className={`px-3 py-1 rounded-md text-sm flex items-center ${!folderName ? 'bg-dark-600 text-white' : 'bg-dark-700 text-dark-300 hover:bg-dark-600'}`}
                        onClick={() => setFolderName('')}
                      >
                        None
                      </button>
                      
                      {folders.map(folder => (
                        <button
                          key={folder}
                          className={`px-3 py-1 rounded-md text-sm flex items-center ${folderName === folder ? 'bg-primary-600 text-white' : 'bg-dark-700 text-dark-300 hover:bg-dark-600'}`}
                          onClick={() => setFolderName(folder)}
                        >
                          <FiFolder size={14} className="mr-1" />
                          {folder}
                        </button>
                      ))}
                      
                      <button
                        className="px-3 py-1 rounded-md text-sm bg-dark-700 text-dark-300 hover:bg-dark-600 flex items-center"
                        onClick={() => setIsNewFolder(true)}
                      >
                        <FiPlusCircle size={14} className="mr-1" />
                        New Folder
                      </button>
                    </div>
                  )}
                  
                  {/* New folder input */}
                  {isGroup && (isNewFolder || folders.length === 0) && (
                    <div className="relative rounded-md shadow-sm">
                      <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-2 rounded-md border border-dark-600 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-dark-700 text-white placeholder-dark-400"
                        placeholder="Enter folder name"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                      />
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiFolder className="text-dark-400" />
                      </div>
                      
                      {folders.length > 0 && (
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                          <button
                            type="button"
                            className="text-dark-400 hover:text-dark-200"
                            onClick={() => setIsNewFolder(false)}
                          >
                            <FiX size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* User search - only if not creating empty folder */}
            {!isCreatingEmptyFolder && (
              <div className="mb-5">
                <label htmlFor="user-search" className="block text-sm font-medium text-dark-200 mb-1">
                  Add Users
                </label>
                <div className="relative rounded-md shadow-sm">
                  <input
                    ref={searchInputRef}
                    type="text"
                    id="user-search"
                    className="block w-full pl-10 pr-3 py-2 rounded-md border border-dark-600 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-dark-700 text-white placeholder-dark-400"
                    placeholder="Search users by name or email"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiSearch className="text-dark-400" />
                  </div>
                </div>
                
                {/* Search results */}
                {searchFocused && searchTerm.length >= 2 && (
                  <div className="mt-1 bg-dark-700 rounded-md border border-dark-600 shadow-lg max-h-60 overflow-y-auto">
                    {loading ? (
                      <div className="p-3 text-center text-dark-300">
                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-primary-500 mx-auto"></div>
                      </div>
                    ) : users.length > 0 ? (
                      <ul className="divide-y divide-dark-600">
                        {users.map(user => (
                          <li 
                            key={user.id}
                            className="p-3 hover:bg-dark-600 cursor-pointer"
                            onClick={() => handleSelectUser(user)}
                          >
                            <div className="flex items-center">
                              <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center mr-3">
                                {user.avatarUrl ? (
                                  <img src={user.avatarUrl} alt={user.displayName} className="w-8 h-8 rounded-full" />
                                ) : (
                                  <span className="text-white">{user.displayName.charAt(0)}</span>
                                )}
                              </div>
                              <div>
                                <p className="text-white">{user.displayName}</p>
                                <p className="text-dark-300 text-xs">{user.email}</p>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : error ? (
                      <p className="p-3 text-dark-300">{error}</p>
                    ) : (
                      <p className="p-3 text-dark-300">Type at least 2 characters to search</p>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {/* Selected users */}
            {!isCreatingEmptyFolder && selectedUsers.length > 0 && (
              <div className="mb-5">
                <label className="block text-sm font-medium text-dark-200 mb-2">
                  Selected Users
                </label>
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map(user => (
                    <div 
                      key={user.id}
                      className="flex items-center bg-dark-700 text-white px-3 py-1 rounded-full"
                    >
                      <span className="mr-2">{user.displayName}</span>
                      <button
                        type="button"
                        className="text-dark-300 hover:text-white"
                        onClick={() => handleRemoveUser(user.id)}
                      >
                        <FiX size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Action buttons */}
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                className="px-4 py-2 bg-dark-700 text-white rounded-md hover:bg-dark-600 transition-colors"
                onClick={onClose}
              >
                Cancel
              </button>
              
              {isCreatingEmptyFolder ? (
                <button
                  type="button"
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors flex items-center"
                  onClick={handleCreateEmptyFolder}
                  disabled={!newFolderName.trim()}
                >
                  <FiFolder className="mr-2" />
                  Create Folder
                </button>
              ) : (
                <button
                  type="button"
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors flex items-center"
                  onClick={handleCreateChat}
                  disabled={selectedUsers.length === 0 || (isGroup && !title)}
                >
                  <FiUserPlus className="mr-2" />
                  {isGroup ? 'Create Group' : 'Start Chat'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateChatModal;
