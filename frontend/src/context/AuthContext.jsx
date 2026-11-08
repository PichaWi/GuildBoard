import React, { createContext, useState, useContext, useEffect } from 'react';
import { getMe, devLogin as apiDevLogin, logout as apiLogout } from '../api/auth';

const AuthContext = createContext();

const MOCK_USERS = {
  student: { role: 'student', name: 'Natthaphol Meekhun', email: 'student@ku.th', id: 'demo-student' },
  ta: { role: 'ta', name: 'Alex Chen (TA)', email: 'ta@ku.th', id: 'demo-ta' },
  lecturer: { role: 'lecturer', name: 'Dr. Ryan Gosling', email: 'lecturer@ku.th', id: 'demo-lecturer' },
  admin: { role: 'admin', name: 'Prof. Alex Kim (Admin)', email: 'admin@ku.th', id: 'demo-admin' },
};

export function AuthProvider({ children }) {
  const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('guildboard_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore JSON parse error
      }
    }
    // Default to student for development - avoids masking permission issues
    return MOCK_USERS.student;
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if there is an active session from backend (/api/auth/me)
    const checkSession = async () => {
      try {
        const sessionUser = await getMe();
        setUser(sessionUser);
        localStorage.setItem('guildboard_user', JSON.stringify(sessionUser));
      } catch {
        // Backend not available or not logged in, keep mock/default user
        if (!USE_MOCK) {
          // In real mode, if no session, clear user
          setUser(null);
          localStorage.removeItem('guildboard_user');
        }
      } finally {
        setIsLoading(false);
      }
    };
    checkSession();
  }, []);

  /**
   * Mock / dev login.
   * @param {'student' | 'ta' | 'lecturer' | 'admin'} role
   */
  const login = async (role, email, password) => {
    if (USE_MOCK) {
      const normalizedRole = String(role).toLowerCase();
      const userData = MOCK_USERS[normalizedRole] || MOCK_USERS.student;
      setUser(userData);
      localStorage.setItem('guildboard_user', JSON.stringify(userData));
      return userData;
    }

    // Real backend login
    const sessionUser = await apiDevLogin(email, password);
    setUser(sessionUser);
    localStorage.setItem('guildboard_user', JSON.stringify(sessionUser));
    return sessionUser;
  };

  const logout = async () => {
    try {
      await apiLogout();
    } catch {
      // ignore
    }
    setUser(null);
    localStorage.removeItem('guildboard_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}