import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Header = () => {
  const { currentUser, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <header className="bg-dark-800 border-b border-dark-700 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold text-primary-400 hover:text-primary-300 transition-colors">
              Chat App
            </Link>
          </div>
          
          <div className="flex items-center">
            {/* User dropdown */}
            <div className="ml-3 relative">
              <div>
                <button
                  type="button"
                  className="flex items-center max-w-xs rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 focus:ring-offset-dark-800"
                  id="user-menu"
                  aria-expanded="false"
                  aria-haspopup="true"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  <span className="sr-only">Open user menu</span>
                  <div className="h-8 w-8 rounded-full overflow-hidden bg-dark-600">
                    {currentUser?.photoURL ? (
                      <img
                        className="h-full w-full object-cover"
                        src={currentUser.photoURL}
                        alt={currentUser.displayName || 'User'}
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-primary-600 text-white">
                        {currentUser?.displayName?.charAt(0) || 'U'}
                      </div>
                    )}
                  </div>
                  <span className="ml-2 hidden md:block text-white">{currentUser?.displayName}</span>
                </button>
              </div>
              
              {/* Dropdown menu */}
              {dropdownOpen && (
                <div
                  className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-dark-700 ring-1 ring-dark-600 ring-opacity-50 focus:outline-none z-10"
                  role="menu"
                  aria-orientation="vertical"
                  aria-labelledby="user-menu"
                >
                  <Link
                    to="/profile"
                    className="block px-4 py-2 text-sm text-dark-100 hover:bg-dark-600"
                    role="menuitem"
                    onClick={() => setDropdownOpen(false)}
                  >
                    Your Profile
                  </Link>
                  <button
                    className="block w-full text-left px-4 py-2 text-sm text-dark-100 hover:bg-dark-600"
                    role="menuitem"
                    onClick={handleLogout}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
