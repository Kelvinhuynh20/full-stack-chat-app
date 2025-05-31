import { TypingIndicator as TypingIndicatorType } from '../../../shared/models/types';

interface TypingIndicatorProps {
  users: TypingIndicatorType[];
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ users }) => {
  if (users.length === 0) return null;

  // Format the typing message based on number of users
  const getTypingMessage = () => {
    if (users.length === 1) {
      return `${users[0].userName} is typing...`;
    } else if (users.length === 2) {
      return `${users[0].userName} and ${users[1].userName} are typing...`;
    } else if (users.length === 3) {
      return `${users[0].userName}, ${users[1].userName}, and ${users[2].userName} are typing...`;
    } else {
      return `${users.length} people are typing...`;
    }
  };

  return (
    <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
      <div className="flex space-x-1 mr-2">
        <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce" style={{ animationDelay: '200ms' }}></div>
        <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce" style={{ animationDelay: '400ms' }}></div>
      </div>
      <span>{getTypingMessage()}</span>
    </div>
  );
};

export default TypingIndicator;
