import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './services/firebase';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import DirectMessages from './pages/DirectMessages';
import Folders from './pages/Folders';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Auth context
import { AuthProvider } from './hooks/useAuth';

function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />
        
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            {/* Home route redirects to direct messages */}
            <Route path="/" element={<Navigate to="/direct-messages" />} />
            
            {/* Direct messages routes */}
            <Route path="/direct-messages" element={<DirectMessages />} />
            <Route path="/direct-messages/:chatId" element={<Chat type="direct" />} />
            
            {/* Folders routes (previously Channels) */}
            <Route path="/folders" element={<Folders />} />
            <Route path="/folders/:chatId" element={<Chat type="folder" />} />
            
            {/* Legacy routes for backward compatibility */}
            <Route path="/chat/:chatId" element={<Chat />} />
            <Route path="/channels" element={<Navigate to="/folders" />} />
            <Route path="/channels/:chatId" element={<Navigate to="/folders/:chatId" replace />} />
            
            {/* Profile route */}
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
