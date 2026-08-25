import { Routes, Route, Navigate } from "react-router-dom";
import "./App.css";

import { useAuth } from "./context/AuthContext.jsx";

import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import VoicePanel from "./components/VoicePanel.jsx";

function App() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <Login />}
      />

      <Route
        path="/register"
        element={user ? <Navigate to="/" replace /> : <Register />}
      />

      {/* Protected home */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <VoicePanel />
          </ProtectedRoute>
        }
      />

      {/* Protected voice listing */}
      <Route
        path="/voice"
        element={
          <ProtectedRoute>
            <VoicePanel />
          </ProtectedRoute>
        }
      />

      {/* Unknown route */}
      <Route
        path="*"
        element={<Navigate to={user ? "/" : "/login"} replace />}
      />
    </Routes>
  );
}

export default App;