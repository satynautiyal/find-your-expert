'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Lock,
  ShieldCheck,
  User,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  LogOut,
} from 'lucide-react';

const ADMIN_USERNAME = 'admin1234';
const ADMIN_PASSWORD = '12345678';
const STORAGE_KEY = 'fye_admin_auth_token';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check auth state on mount
  useEffect(() => {
    try {
      const savedAuth = localStorage.getItem(STORAGE_KEY);
      if (savedAuth === 'authenticated_v1') {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    } catch {
      setIsAuthenticated(false);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    setTimeout(() => {
      if (username.trim() === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        try {
          localStorage.setItem(STORAGE_KEY, 'authenticated_v1');
        } catch {
          // ignore
        }
        setIsAuthenticated(true);
      } else {
        setError('Invalid username or password. Please try again.');
      }
      setIsSubmitting(false);
    }, 200);
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setIsAuthenticated(false);
    setUsername('');
    setPassword('');
    setError('');
  };

  // Prevent flash of content during hydration
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex items-center gap-3 text-white text-sm font-semibold">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span>Verifying Admin Credentials...</span>
        </div>
      </div>
    );
  }

  // If not authenticated, display login form
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-gray-900 to-slate-950 flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md relative z-10">
          {/* Brand Header */}
          <div className="text-center mb-8 space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-primary-light text-xs font-bold uppercase tracking-wider backdrop-blur-md">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Admin Access Control</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              FindYourExperts CMS
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm">
              Sign in with your administrator credentials to manage blogs, SEO, and content.
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-5 sm:p-8">
            <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold p-3.5 rounded-xl flex items-start gap-2.5 animate-in fade-in duration-200">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Username field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-gray-400" />
                  <span>Username</span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter admin username"
                  autoComplete="username"
                  required
                  className="w-full px-3.5 py-3 sm:py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-base sm:text-xs font-medium text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                />
              </div>

              {/* Password field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-gray-400" />
                  <span>Password</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    autoComplete="current-password"
                    required
                    className="w-full px-3.5 py-3 sm:py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-base sm:text-xs font-medium text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1.5"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 sm:py-3 px-4 bg-primary hover:bg-primary-dark active:scale-[0.99] text-white font-bold text-sm sm:text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Sign In to Admin Panel</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer Back Link */}
          <div className="text-center mt-6">
            <Link
              href="/"
              className="text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              &larr; Return to FindYourExperts Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated: Render children with floating logout / session indicator
  return (
    <div className="min-h-screen relative">
      {/* Top Floating Admin Status Bar for Quick Logout */}
      <div className="bg-slate-900 text-slate-300 text-[11px] font-semibold py-1.5 px-3 sm:px-4 border-b border-slate-800 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="text-white font-bold">Admin Active</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400 truncate">{ADMIN_USERNAME}</span>
        </div>
        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-1 text-slate-400 hover:text-rose-400 font-bold transition-colors cursor-pointer px-2 py-0.5 rounded hover:bg-white/5"
          title="Sign out of CMS"
        >
          <LogOut className="w-3 h-3" />
          <span>Log Out</span>
        </button>
      </div>

      {children}
    </div>
  );
}
