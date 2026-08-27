import { Routes, Route, Navigate } from "react-router-dom";
import "./App.css";

import { useAuth } from "./context/AuthContext.jsx";

import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import ArtisanDashboard from "./pages/ArtisanDashboard.jsx";
import BuyerDashboard from "./pages/BuyerDashboard.jsx";

function Home() {
  const { user } = useAuth();

  if (user?.role === "artisan") return <ArtisanDashboard />;
  if (user?.role === "buyer") return <BuyerDashboard />;

  return <p>Unknown role.</p>;
}

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

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

      {/* Protected home — role-based */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Home />
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