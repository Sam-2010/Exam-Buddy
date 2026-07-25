'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { hashPassword, isDbConfigured } from '@/lib/auth-utils';
import { Brain, Lock, User, LogIn, AlertCircle, Eye, EyeOff, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  
  // Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Status State
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dbActive, setDbActive] = useState(false);

  useEffect(() => {
    // Check if database is configured
    setDbActive(isDbConfigured());
    
    // If user is already logged in, redirect to home page
    const existing = localStorage.getItem('exam_buddy_profile');
    if (existing) {
      router.push('/');
    }
  }, [router]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Please fill in all fields.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const hashedInputPassword = await hashPassword(password);
      const cleanUsername = username.trim().toLowerCase();

      if (dbActive) {
        // Cloud-connected Supabase Authentication
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, target_role, username, password')
          .eq('username', cleanUsername)
          .maybeSingle();

        if (error) {
          console.error('Supabase query error:', error);
          throw new Error(`Database query failed: ${error.message} (${error.code || ''})`);
        }

        if (!data || data.password !== hashedInputPassword) {
          setErrorMsg('Invalid username or password.');
          setIsLoading(false);
          return;
        }

        // Store active profile session
        const activeProfile = {
          id: data.id,
          full_name: data.full_name || cleanUsername,
          target_role: data.target_role || 'Software Engineer'
        };
        localStorage.setItem('exam_buddy_profile', JSON.stringify(activeProfile));
        router.push('/');
      } else {
        // Local simulation Authentication
        const localUsersRaw = localStorage.getItem('exam_buddy_local_users');
        const localUsers = localUsersRaw ? JSON.parse(localUsersRaw) : [];
        
        const matchedUser = localUsers.find(
          (u: any) => u.username.toLowerCase() === cleanUsername && u.password === hashedInputPassword
        );

        if (!matchedUser) {
          setErrorMsg('Invalid username or password.');
          setIsLoading(false);
          return;
        }

        // Store active profile session
        const activeProfile = {
          id: matchedUser.id,
          full_name: matchedUser.full_name,
          target_role: matchedUser.target_role
        };
        localStorage.setItem('exam_buddy_profile', JSON.stringify(activeProfile));
        router.push('/');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      padding: '1.5rem',
      animation: 'fadeIn var(--transition-slow)'
    }}>
      {/* Brand Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem', textAlign: 'center' }}>
        <div style={{
          background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
          width: '44px',
          height: '44px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)'
        }}>
          <Brain size={24} color="white" />
        </div>
        <div style={{ textAlign: 'left' }}>
          <h1 style={{
            fontSize: '1.6rem',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            background: 'linear-gradient(to right, #ffffff, #a5b4fc)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Exam Buddy
          </h1>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            AI Study & Interview Coach
          </span>
        </div>
      </div>

      {/* Login Card */}
      <div className="card" style={{ maxWidth: '420px', width: '100%', padding: '2.5rem 2rem' }}>
        <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>Sign In</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Enter your username and password to access your dashboard.
          </p>
        </div>

        {/* Database connectivity status hint */}
        {!dbActive && (
          <div style={{
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.15)',
            padding: '0.65rem 0.85rem',
            borderRadius: '10px',
            color: '#a5b4fc',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.8rem',
            marginBottom: '1.5rem'
          }}>
            <Sparkles size={14} />
            <span>Running in local simulated demo mode.</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div style={{
            background: 'var(--danger-glow)',
            border: '1px solid rgba(244, 63, 94, 0.25)',
            padding: '0.75rem 1rem',
            borderRadius: '10px',
            color: '#fda4af',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.6rem',
            fontSize: '0.85rem',
            marginBottom: '1.5rem'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Username Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Username
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <User size={18} />
              </span>
              <input
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                style={{ width: '100%', paddingLeft: '2.75rem' }}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Password Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <Lock size={18} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{ width: '100%', paddingLeft: '2.75rem', paddingRight: '2.75rem' }}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'none'
                }}
                disabled={isLoading}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button type="submit" style={{ marginTop: '0.5rem', width: '100%', padding: '0.85rem' }} disabled={isLoading}>
            {isLoading ? (
              <span className="flex-center" style={{ gap: '0.5rem' }}>
                <span style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderTopColor: 'white',
                  borderRadius: '50%',
                  animation: 'rotate 0.8s linear infinite'
                }} />
                Signing In...
              </span>
            ) : (
              <span className="flex-center" style={{ gap: '0.5rem' }}>
                Sign In <LogIn size={16} />
              </span>
            )}
          </button>
        </form>

        <div style={{
          marginTop: '2rem',
          textAlign: 'center',
          fontSize: '0.85rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          paddingTop: '1.25rem',
          color: 'var(--text-muted)'
        }}>
          Don't have an account?{' '}
          <Link href="/register" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none', transition: 'color var(--transition-fast)' }}>
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
}
