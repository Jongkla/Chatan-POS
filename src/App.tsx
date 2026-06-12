import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useStore } from "./store";
import Login from "./pages/Login";
import POS from "./pages/POS";
import AdminDashboard from "./pages/AdminDashboard";

function ProtectedRoute({ children, reqRole }: { children: React.ReactNode, reqRole?: 'admin' }) {
  const user = useStore(state => state.user);
  if (!user) return <Navigate to="/login" replace />;
  if (reqRole && user.role !== reqRole) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function Layout({ children }: { children: React.ReactNode }) {
  const theme = useStore((state) => state.theme);
  
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  // Use tailwind arbitrary setup to apply colors based on dark mode class
  return (
    <div className={`min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-900 dark:text-slate-100`}>
      {children}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><POS /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute reqRole="admin"><AdminDashboard /></ProtectedRoute>} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

