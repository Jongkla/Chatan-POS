import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Store, Moon, Sun, Mail, Lock, User as UserIcon } from "lucide-react";
import { useStore } from "../store";
import { loginWithGoogle, auth } from "../lib/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { getUsers, createUser } from "../lib/api";

export default function Login() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState(""); // used for signup
  
  const navigate = useNavigate();
  const setUser = useStore((state) => state.setUser);
  const theme = useStore((state) => state.theme);
  const toggleTheme = useStore((state) => state.toggleTheme);

  const processUserLogin = async (userResult: any) => {
    const userEmail = userResult.email || "user";
    
    let allUsers = await getUsers();
    let matchedUser = allUsers.find(u => u.username === userEmail);
    
    if (!matchedUser) {
      if (allUsers.length === 0) {
        matchedUser = await createUser({
          username: userEmail,
          name: userResult.displayName || name || userEmail,
          role: "admin"
        }) as any;
      } else if (mode === "signup") {
        // Automatically make them an employee if signed up via email/pass form
        // (You may want a different rule, but for prototyping this keeps them unblocked)
        matchedUser = await createUser({
          username: userEmail,
          name: userResult.displayName || name || userEmail,
          role: "employee"
        }) as any;
      } else {
        throw new Error("Your email is not registered as an employee here.");
      }
    }
    
    setUser({
      id: userResult.uid,
      username: matchedUser.username,
      name: matchedUser.name,
      role: matchedUser.role 
    });
    
    if (matchedUser.role === 'admin') {
      navigate("/admin");
    } else {
      navigate("/");
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }
    if (mode === "signup" && !name) {
      setError("Please provide your name");
      return;
    }

    setError("");
    setLoading(true);
    try {
      let result;
      if (mode === "signup") {
        result = await createUserWithEmailAndPassword(auth, email, password);
      } else {
        result = await signInWithEmailAndPassword(auth, email, password);
      }
      await processUserLogin(result.user);
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError("This email is already in use.");
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setError("Invalid email or password.");
      } else {
        setError(err.message || "Authentication failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await loginWithGoogle();
      await processUserLogin(result.user);
    } catch (err: any) {
      if (err.code === 'auth/unauthorized-domain') {
        setError(`Unauthorized Domain: Please add "${window.location.hostname}" to Firebase Authorized Domains`);
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError("Sign in was cancelled.");
      } else {
        setError(err.message || "Google Login failed");
      }
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
        <div className="p-8 text-center pt-10 pb-6 border-b border-slate-100 dark:border-slate-700">
          <div className="mx-auto w-16 h-16 bg-indigo-500 rounded-2xl flex items-center justify-center mb-4 text-white shadow-xl shadow-indigo-500/20">
            <Store size={32} />
          </div>
          <h1 className="text-2xl font-bold font-sans">Chatan Store</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {mode === "login" ? "Sign in to your account" : "Create a new account"}
          </p>
        </div>

        <div className="p-8 pt-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
            {mode === "signup" && (
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:border-indigo-500 outline-none transition"
                />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:border-indigo-500 outline-none transition"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:border-indigo-500 outline-none transition"
              />
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
            >
              {loading ? "Please wait..." : (mode === "login" ? "Sign In" : "Sign Up")}
            </button>
          </form>

          <div className="relative flex items-center justify-center mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
            </div>
            <div className="relative px-4 bg-white dark:bg-slate-800 text-sm text-slate-400">
              OR
            </div>
          </div>

          <div className="space-y-4 flex flex-col items-center">
            <button 
              type="button"
              onClick={handleGoogleLogin} 
              disabled={loading}
              className="w-full py-3 px-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-slate-800 dark:text-white rounded-xl font-bold transition flex justify-center items-center gap-3 disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign in with Google
            </button>
            
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-4 text-center">
              {mode === "login" ? "Don't have an account? " : "Already have an account? "}
              <button 
                type="button"
                onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
                className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
              >
                {mode === "login" ? "Sign Up" : "Sign In"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

