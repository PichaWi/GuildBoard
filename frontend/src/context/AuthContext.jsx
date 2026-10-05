import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  // Check local storage for existing session, default to null
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('guildboard_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if there is an active session from Google OAuth (/api/auth/me)
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
        if (res.ok) {
          const data = await res.json();
          // Map backend role to our 3-way role: student | ta | lecturer
          const rawRole = String(data.role || '').toLowerCase();
          let role = 'student';
          if (rawRole === 'ta' || rawRole === 'teaching_assistant') role = 'ta';
          else if (rawRole === 'lecturer' || rawRole === 'faculty' || rawRole === 'admin') role = 'lecturer';
          const sessionUser = { role, name: data.name || 'Dr. Ryan Gosling', email: data.email };
          setUser(sessionUser);
          localStorage.setItem('guildboard_user', JSON.stringify(sessionUser));
        }
      } catch (e) {
        // Backend not available or not logged in, ignore
      } finally {
        setIsLoading(false);
      }
    };
    checkSession();
  }, []);

  /**
   * Mock / dev login.
   * @param {'student' | 'ta' | 'lecturer'} role
   */
  const login = (role) => {
    const normalizedRole = String(role).toLowerCase();
    const userData = { role: normalizedRole, name: 'Dr. Ryan Gosling' };
    setUser(userData);
    localStorage.setItem('guildboard_user', JSON.stringify(userData));
  };

  const logout = async () => {
    try {
      await fetch('/auth/logout', { method: 'POST', credentials: 'same-origin' });
    } catch (e) {
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
