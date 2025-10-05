import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const TestDashboard: React.FC = () => {
  const { user, loading } = useAuth();
  
  return (
    <div className="p-8">
      <div className="bg-red-500 text-white p-4 rounded-lg mb-4">
        <h1 className="text-2xl font-bold">🚨 TEST DASHBOARD 🚨</h1>
        <p>If you can see this red box, the component is rendering!</p>
      </div>
      
      <div className="bg-yellow-500 text-white p-4 rounded-lg mb-4">
        <h2 className="text-xl font-bold">Authentication Status</h2>
        <p>Loading: {loading ? 'Yes' : 'No'}</p>
        <p>User: {user ? user.name : 'Not logged in'}</p>
        <p>User Email: {user ? user.email : 'No email'}</p>
      </div>
      
      <div className="bg-blue-500 text-white p-4 rounded-lg mb-4">
        <h2 className="text-xl font-bold">Component Status</h2>
        <p>✅ React component is working</p>
        <p>✅ JSX is rendering</p>
        <p>✅ CSS classes are working</p>
      </div>
      
      <div className="bg-green-500 text-white p-4 rounded-lg">
        <h2 className="text-xl font-bold">Next Steps</h2>
        <p>If you see this, the issue is with the main Dashboard component</p>
        <p>We can fix the main Dashboard now</p>
      </div>
    </div>
  );
};

export default TestDashboard;
