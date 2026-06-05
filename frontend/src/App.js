import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';

import LoginPage from './pages/auth/LoginPage';
import DealerDashboard from './pages/dealer/DealerDashboard';
import MsilDashboard from './pages/msil/MsilDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import AccessCredentialsPage from './pages/access-credentials/AccessCredentialsPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Dealer */}
          <Route element={<ProtectedRoute allowedRoles={['dealer']} />}>
            <Route path="/dealer/dashboard" element={<DealerDashboard />} />
          </Route>

          {/* MSIL */}
          <Route element={<ProtectedRoute allowedRoles={['msil']} />}>
            <Route path="/msil/dashboard" element={<MsilDashboard />} />
            <Route path="/msil/access-credentials" element={<AccessCredentialsPage dashboardPath="/msil/dashboard" />} />
          </Route>

          {/* Admin */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/access-credentials" element={<AccessCredentialsPage dashboardPath="/admin/dashboard" />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
      <ToastContainer
        position="top-right"
        autoClose={3200}
        newestOnTop
        closeOnClick
        pauseOnFocusLoss={false}
        pauseOnHover
        theme="colored"
        className="app-toast-container"
      />
    </AuthProvider>
  );
}

export default App;
