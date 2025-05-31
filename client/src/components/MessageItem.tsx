import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ChatMessage } from '../../../shared/models/types';

interface MessageItemProps {
  message: ChatMessage;
  isCurrentUser: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onPin: () => void;
}

const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isCurrentUser,
  onEdit,
  onDelete,
  onPin
}) => {
  const [showActions, setShowActions] = useState(false);
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [fileToDownload, setFileToDownload] = useState<any>(null);
  
  const handleFileClick = (file: any, event: React.MouseEvent) => {
    // Only show dialog for non-image files
    if (file.type !== 'image') {
      event.preventDefault();
      setFileToDownload(file);
      setShowDownloadDialog(true);
    }
  };
  
  const handleDownload = () => {
    if (fileToDownload) {
      // Create a temporary anchor element to trigger the download
      const a = document.createElement('a');
      // Use downloadUrl if available, otherwise fall back to url
      const downloadUrl = fileToDownload.downloadUrl || fileToDownload.url;
      
      // Use fetch to get the binary data as a blob
      fetch(downloadUrl)
        .then(response => response.blob())
        .then(blob => {
          // Create a blob URL for the file
          const blobUrl = URL.createObjectURL(blob);
          
          // Set up the download link
          a.href = blobUrl;
          a.download = fileToDownload.name;
          document.body.appendChild(a);
          a.click();
          
          // Clean up
          document.body.removeChild(a);
          URL.revokeObjectURL(blobUrl);
          setShowDownloadDialog(false);
        })
        .catch(error => {
          console.error('Error downloading file:', error);
          alert('Failed to download file. Please try again.');
        });
    }
  };
  
  const getFilePreview = (file: any) => {
    switch (file.type) {
      case 'image':
        return (
          <div className="relative rounded-lg overflow-hidden max-w-xs">
            <img
              src={file.url}
              alt={file.name}
              className="max-w-full h-auto"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 truncate">
              {file.name}
            </div>
          </div>
        );
      case 'video':
        return (
          <div className="rounded-lg overflow-hidden max-w-xs">
            <video
              src={file.url}
              controls
              className="max-w-full h-auto"
            />
            <div className="bg-dark-700 text-dark-100 text-xs p-1 truncate">
              {file.name}
            </div>
          </div>
        );
      case 'audio':
        return (
          <div className="rounded-lg overflow-hidden max-w-xs">
            <audio
              src={file.url}
              controls
              className="max-w-full"
            />
            <div className="bg-dark-700 text-dark-100 text-xs p-1 truncate">
              {file.name}
            </div>
          </div>
        );
      default:
        return (
          <div
            onClick={(e) => handleFileClick(file, e)}
            className="flex items-center p-2 bg-dark-700 rounded-lg hover:bg-dark-600 cursor-pointer"
          >
            <svg className="h-5 w-5 text-dark-300 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
            </svg>
            <div className="overflow-hidden">
              <div className="text-sm font-medium truncate text-dark-100">{file.name}</div>
              <div className="text-xs text-dark-300">
                {(file.size / 1024).toFixed(1)} KB
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div
      className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-4`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={`max-w-[70%] ${message.isPinned ? 'border-l-4 border-accent-500 pl-2' : ''}`}>
        {/* Message header */}
        <div className="flex items-center mb-1">
          {!isCurrentUser && (
            <span className="text-sm font-medium text-white mr-2">
              {message.senderName}
            </span>
          )}
          <span className="text-xs text-dark-300">
            {message.timestamp ? formatDistanceToNow(message.timestamp, { addSuffix: true }) : 'Just now'}
          </span>
          {message.isEdited && (
            <span className="text-xs text-dark-300 ml-1">
              (edited)
            </span>
          )}
          {message.isPinned && (
            <span className="text-xs text-accent-400 ml-1 flex items-center">
              <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V5z"></path>
              </svg>
              Pinned
            </span>
          )}
        </div>
        
        {/* Message content */}
        <div
          className={`rounded-lg p-3 shadow-sm ${
            isCurrentUser
              ? 'bg-primary-800 text-white'
              : 'bg-dark-700 text-white'
          }`}
        >
          {/* Text content */}
          {message.text && (
            <p className="whitespace-pre-wrap break-words">{message.text}</p>
          )}
          
          {/* File attachments */}
          {message.files && message.files.length > 0 && (
            <div className={`${message.text ? 'mt-2' : ''} space-y-2`}>
              {message.files.map((file, index) => (
                <div key={index}>
                  {getFilePreview(file)}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Message actions */}
        {showActions && (
          <div className={`flex mt-1 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
            <div className="flex space-x-2 bg-dark-800 rounded-md px-2 py-1 shadow-sm">
              <button
                type="button"
                className="text-xs text-dark-200 hover:text-white transition-colors"
                onClick={onPin}
              >
                {message.isPinned ? 'Unpin' : 'Pin'}
              </button>
              {isCurrentUser && (
                <>
                  <button
                    type="button"
                    className="text-xs text-dark-200 hover:text-white transition-colors"
                    onClick={onEdit}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="text-xs text-accent-400 hover:text-accent-300 transition-colors"
                    onClick={onDelete}
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Download confirmation dialog */}
      {showDownloadDialog && fileToDownload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-dark-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center justify-center text-accent-500 mb-4">
              <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white text-center mb-2">Warning</h3>
            <p className="text-dark-200 text-center mb-6">
              The file "{fileToDownload.name}" may be dangerous. Are you sure you want to download it?
            </p>
            <div className="flex justify-center space-x-4">
              <button
                className="px-4 py-2 bg-dark-700 text-dark-200 rounded-md hover:bg-dark-600 transition-colors"
                onClick={() => setShowDownloadDialog(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                onClick={handleDownload}
              >
                Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageItem;
