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
 * @param {boolean}         [requireFaculty]     — if true, only lecturer role may access
 * @param {string[]}        [allowedRoles]       — explicit allow-list (e.g. ['ta','lecturer'])
 * @param {string}          [redirectTo='/login'] — where to send unauthorised users
 */
const ProtectedRoute = ({ children, requireFaculty, allowedRoles, redirectTo }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null; // Don't redirect until we're sure they are unauthenticated
  }

  // Not logged in at all → login page
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Legacy prop: only lecturers can access
  if (requireFaculty && user.role !== 'lecturer') {
    return <Navigate to="/calendar" replace />;
  }

  // Role allow-list: redirect disallowed roles
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={redirectTo || '/calendar'} replace />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />

      {/* /dashboard — TA and Lecturer only; students get kicked to /calendar */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={['ta', 'lecturer']} redirectTo="/calendar">
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
          <ProtectedRoute requireFaculty={true}>
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
