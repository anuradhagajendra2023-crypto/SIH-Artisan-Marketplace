import { createContext, useContext, useEffect, useState } from "react";
import client from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check existing login when app starts
  useEffect(() => {
    const token = localStorage.getItem("access");

    if (!token) {
      setLoading(false);
      return;
    }

    client
      .get("/auth/me/")
      .then(({ data }) => {
        setUser(data);
      })
      .catch(() => {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Login
  const login = async (username, password) => {
    const { data } = await client.post("/auth/login/", {
      username,
      password,
    });

    localStorage.setItem("access", data.access);

    if (data.refresh) {
      localStorage.setItem("refresh", data.refresh);
    }

    const { data: me } = await client.get("/auth/me/");

    setUser(me);

    return me;
  };

  // Register
  const register = async (payload) => {
    await client.post("/auth/register/", payload);

    // Automatically login after successful registration
    return login(payload.username, payload.password);
  };

  // Logout
  const logout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}