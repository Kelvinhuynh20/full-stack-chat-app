import { FileUpload } from '../../../shared/models/types';

interface FileUploadPreviewProps {
  file: FileUpload;
  onRemove: () => void;
}

const FileUploadPreview: React.FC<FileUploadPreviewProps> = ({ file, onRemove }) => {
  const getFileIcon = () => {
    switch (file.type) {
      case 'image':
        return (
          <svg className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
        );
      case 'video':
        return (
          <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
          </svg>
        );
      case 'audio':
        return (
          <svg className="h-5 w-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path>
          </svg>
        );
      default:
        return (
          <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
          </svg>
        );
    }
  };

  // Create a preview for image files
  const getImagePreview = () => {
    if (file.type === 'image' && file.file) {
      const url = URL.createObjectURL(file.file);
      return (
        <div className="relative h-10 w-10 rounded overflow-hidden bg-gray-200 dark:bg-gray-700">
          <img
            src={url}
            alt={file.name}
            className="h-full w-full object-cover"
            onLoad={() => URL.revokeObjectURL(url)}
          />
        </div>
      );
    }
    
    return (
      <div className="flex items-center justify-center h-10 w-10 rounded bg-gray-200 dark:bg-gray-700">
        {getFileIcon()}
      </div>
    );
  };

  return (
    <div className="flex items-center p-2 bg-white dark:bg-gray-700 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600">
      {getImagePreview()}
      
      <div className="ml-3 flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {file.name}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {(file.size / 1024).toFixed(1)} KB
        </p>
      </div>
      
      {file.progress > 0 && file.progress < 100 ? (
        <div className="ml-3 w-16">
          <div className="bg-gray-200 dark:bg-gray-600 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full"
              style={{ width: `${file.progress}%` }}
            ></div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="ml-3 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          onClick={onRemove}
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      )}
    </div>
  );
};

export default FileUploadPreview;
