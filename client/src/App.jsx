import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/authStore';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ChatPage from './pages/ChatPage';
import DashboardPage from './pages/DashboardPage';
import VerifyOTPPage from './pages/VerifyOTPPage';

const ProtectedRoute = ({ children }) => {
  const { user } = useAuthStore();
  return user ? children : <Navigate to="/login" />;
};

const PublicRoute = ({ children }) => {
  const { user } = useAuthStore();
  return !user ? children : <Navigate to="/" />;
};

function App() {
  return (
    <div className="w-screen h-dvh flex flex-col overflow-hidden bg-[#0d0d0d]">
      <BrowserRouter>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={
            <PublicRoute><LoginPage /></PublicRoute>
          } />
          <Route path="/register" element={
            <PublicRoute><RegisterPage /></PublicRoute>
          } />
          <Route path="/" element={
            <ProtectedRoute><ChatPage /></ProtectedRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute><DashboardPage /></ProtectedRoute>
          } />
          <Route path="/verify-otp" element={<VerifyOTPPage />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;