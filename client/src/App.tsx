import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { useAuth } from './contexts/AuthContext';

// Import pages
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import Tickets from './pages/Tickets';
import CreateTicket from './pages/CreateTicket';
import TicketDetail from './pages/TicketDetail';
import Profile from './pages/Profile';
import Users from './pages/Users';
import AnalyticsDashboard from './pages/AnalyticsDashboard';

const App: React.FC = () => {
  const { user } = useAuth();
  const isAuthenticated = !!user;

  // Protected route wrapper
  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" />;
    }
    return <>{children}</>;
  };

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      {/* Protected routes */}
      <Route path="/" element={
        <ProtectedRoute>
          <Layout>
            <Dashboard />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/tickets" element={
        <ProtectedRoute>
          <Layout>
            <Tickets />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/tickets/new" element={
        <ProtectedRoute>
          <Layout>
            <CreateTicket />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/tickets/:id" element={
        <ProtectedRoute>
          <Layout>
            <TicketDetail />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/profile" element={
        <ProtectedRoute>
          <Layout>
            <Profile />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/users" element={
        <ProtectedRoute>
          <Layout>
            <Users />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/analytics" element={
        <ProtectedRoute>
          <Layout>
            <AnalyticsDashboard />
          </Layout>
        </ProtectedRoute>
      } />
      
      {/* Fallback route */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

export default App;
