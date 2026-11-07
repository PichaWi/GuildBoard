import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Calendar from './pages/Calendar';
import CreateEvent from './pages/CreateEvent';
import OperationsDashboard from './pages/OperationsDashboard';
import CourseMaterials from './pages/CourseMaterials';
import RoleManagement from './pages/RoleManagement';
import SearchResults from './pages/SearchResults';
import TicketDetail from './pages/TicketDetail';

/**
 * ProtectedRoute — gates access based on authentication + optional role checks.
 *
 * @param {React.ReactNode} children
 * @param {boolean}         [requireFaculty]     — if true, only lecturer/admin role may access
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

  const role = user.role ? user.role.toLowerCase() : '';

  // Faculty prop: lecturers and admins can access
  if (requireFaculty && role !== 'lecturer' && role !== 'admin') {
    return <Navigate to="/calendar" replace />;
  }

  // Role allow-list: redirect disallowed roles
  if (allowedRoles) {
    const normalizedAllowed = allowedRoles.map((r) => r.toLowerCase());
    if (!normalizedAllowed.includes(role)) {
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

      {/* /dashboard — TA, Lecturer, and Admin access */}
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

      {/* /materials — Course materials list (accessible to all authenticated roles) */}
      <Route
        path="/materials"
        element={
          <ProtectedRoute>
            <CourseMaterials />
          </ProtectedRoute>
        }
      />
      <Route path="/course-materials" element={<Navigate to="/materials" replace />} />

      {/* /tasks/:id — Ticket / Task Detail view */}
      <Route
        path="/tasks/:id"
        element={
          <ProtectedRoute>
            <TicketDetail />
          </ProtectedRoute>
        }
      />

      {/* /search — Search results view */}
      <Route
        path="/search"
        element={
          <ProtectedRoute>
            <SearchResults />
          </ProtectedRoute>
        }
      />

      {/* /admin/roles — Role Management (Strictly Admin only) */}
      <Route
        path="/admin/roles"
        element={
          <ProtectedRoute allowedRoles={['admin']} redirectTo="/dashboard">
            <RoleManagement />
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

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
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
