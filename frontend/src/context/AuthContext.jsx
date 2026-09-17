import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  // Check local storage for existing session, default to null
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('guildboard_user');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    // Check if there is an active session from Google OAuth (/api/auth/me)
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
        if (res.ok) {
          const data = await res.json();
          const role = String(data.role || '').toLowerCase() === 'student' ? 'student' : 'faculty';
          const sessionUser = { role, name: 'Ryan Gosling', email: data.email };
          setUser(sessionUser);
          localStorage.setItem('guildboard_user', JSON.stringify(sessionUser));
        }
      } catch (e) {
        // Backend not available or not logged in, ignore
      }
    };
    checkSession();
  }, []);

  const login = (role) => {
    const userData = { role: String(role).toLowerCase(), name: 'Ryan Gosling' };
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
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
