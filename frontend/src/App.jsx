import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './stores/authStore';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import WhatsApp from './pages/WhatsApp';
import Campaigns from './pages/Campaigns';
import Contacts from './pages/Contacts';
import Automation from './pages/Automation';
import Messages from './pages/Messages';
import APISettings from './pages/APISettings';
import Billing from './pages/Billing';
import Settings from './pages/Settings';

function ProtectedRoute({ children }) {
  const { token } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/whatsapp" element={<WhatsApp />} />
                  <Route path="/campaigns" element={<Campaigns />} />
                  <Route path="/contacts" element={<Contacts />} />
                  <Route path="/automation" element={<Automation />} />
                  <Route path="/messages" element={<Messages />} />
                  <Route path="/api-settings" element={<APISettings />} />
                  <Route path="/billing" element={<Billing />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
