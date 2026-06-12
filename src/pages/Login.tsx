import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Store, Moon, Sun } from "lucide-react";
import { useStore } from "../store";
import { loginWithGoogle } from "../lib/firebase";

export default function Login() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const setUser = useStore((state) => state.setUser);
  const theme = useStore((state) => state.theme);
  const toggleTheme = useStore((state) => state.toggleTheme);

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await loginWithGoogle();
      const email = result.user.email || "user";
      
      const res = await fetch('/api/users'); // We don't have API anymore, we have `getUsers`. 
      // Replace with direct call. 
      // But wait, the file already imports `loginWithGoogle` etc.
      // Let's import getUsers from api.ts.
      const { getUsers, createUser } = await import("../lib/api");
      
      let allUsers = await getUsers();
      let matchedUser = allUsers.find(u => u.username === email);
      
      if (!matchedUser) {
        // If there are no users at all, let's make this person the admin.
        if (allUsers.length === 0) {
          matchedUser = await createUser({
            username: email,
            name: result.user.displayName || email,
            role: "admin"
          }) as any;
        } else {
          throw new Error("Your email is not registered as an employee here.");
        }
      }
      
      setUser({
        id: result.user.uid,
        username: matchedUser.username,
        name: matchedUser.name,
        role: matchedUser.role 
      });
      
      if (matchedUser.role === 'admin') {
        navigate("/admin");
      } else {
        navigate("/");
      }
      
    } catch (err: any) {
      setError(err.message || "Google Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <button 
        onClick={toggleTheme} 
        className="absolute top-4 right-4 p-2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors"
      >
        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-8 text-center pt-10 pb-8 border-b border-slate-100 dark:border-slate-700">
          <div className="mx-auto w-16 h-16 bg-indigo-500 rounded-2xl flex items-center justify-center mb-4 text-white shadow-xl shadow-indigo-500/20">
            <Store size={32} />
          </div>
          <h1 className="text-2xl font-bold font-sans">Chatan Store</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Sign in to your account</p>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm text-center">
              {error}
            </div>
          )}

          <div className="space-y-5 flex flex-col items-center">
            <button 
              onClick={handleGoogleLogin} 
              disabled={loading}
              className="w-full py-4 px-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-slate-800 dark:text-white rounded-xl font-bold transition flex justify-center items-center gap-3 disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {loading ? "Signing in..." : "Sign in with Google"}
            </button>
            
            <p className="text-xs text-slate-400 mt-4 text-center max-w-[250px]">
              Use your Google account to access the POS system and start scanning items.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

