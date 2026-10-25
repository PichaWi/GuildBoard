import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Calendar from './pages/Calendar';
import CreateEvent from './pages/CreateEvent';
import OperationsDashboard from './pages/OperationsDashboard';

/**
 * ProtectedRoute — gates access based on authentication + optional role checks.
 *
 * @param {React.ReactNode} children
 * @param {boolean}         [requireStaff]       — if true, only ta, lecturer, and admin may access
 * @param {string[]}        [allowedRoles]       — explicit allow-list (e.g. ['ta','lecturer','admin'])
 * @param {string}          [redirectTo='/login'] — where to send unauthorised users
 */
const ProtectedRoute = ({ children, requireStaff, allowedRoles, redirectTo }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null; // Don't redirect until we're sure they are unauthenticated
  }

  // Not logged in at all → login page
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const userRole = String(user.role || '').toLowerCase();

  // requireStaff: ta, lecturer, and admin can access; students redirected to /calendar
  if (requireStaff && !['ta', 'lecturer', 'admin'].includes(userRole)) {
    return <Navigate to="/calendar" replace />;
  }

  // Role allow-list: redirect disallowed roles (compare case-insensitively)
  if (allowedRoles) {
    const normalizedAllowed = allowedRoles.map((r) => String(r).toLowerCase());
    if (!normalizedAllowed.includes(userRole)) {
      return <Navigate to={redirectTo || '/calendar'} replace />;
    }
  }

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />

      {/* /dashboard — TA, Lecturer, and Admin; students get kicked to /calendar */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={['ta', 'lecturer', 'admin']} redirectTo="/calendar">
            <OperationsDashboard />
          </ProtectedRoute>
        }
      />

      {/* All authenticated roles can see these pages */}
      <Route
        path="/calendar"
        element={
          <ProtectedRoute>
            <Calendar />
          </ProtectedRoute>
        }
      />
      <Route
        path="/create-event"
        element={
          <ProtectedRoute requireStaff={true}>
            <CreateEvent />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
