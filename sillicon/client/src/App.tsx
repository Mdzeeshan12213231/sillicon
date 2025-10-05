import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { useAuth } from './contexts/AuthContext';

// Import pages
import Dashboard from './pages/Dashboard';
import TestDashboard from './pages/TestDashboard';
import SimpleTest from './pages/SimpleTest';
import Login from './pages/Login';
import Register from './pages/Register';
import Tickets from './pages/Tickets';
import CreateTicket from './pages/CreateTicket';
import TicketDetail from './pages/TicketDetail';
import Profile from './pages/Profile';
import Users from './pages/Users';
import AnalyticsDashboard from './pages/AnalyticsDashboard';

const App: React.FC = () => {
  // Simple auth check without complex context
  const token = localStorage.getItem('token');
  const isAuthenticated = !!token;

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
      <Route path="/test" element={
        <div style={{ padding: '20px', backgroundColor: 'blue', color: 'white', fontSize: '24px', minHeight: '100vh' }}>
          <h1>🔵 BLUE TEST PAGE 🔵</h1>
          <p>This is a test route at /test</p>
          <p>If you can see this, routing is working!</p>
        </div>
      } />
      
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
      
      <Route path="/tickets/create" element={
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
