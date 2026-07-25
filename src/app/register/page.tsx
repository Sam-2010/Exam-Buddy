'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { hashPassword, isDbConfigured } from '@/lib/auth-utils';
import { Brain, User, Lock, Briefcase, ChevronRight, AlertCircle, Sparkles } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();

  // Form State
  const [fullName, setFullName] = useState('');
  const [targetRole, setTargetRole] = useState('Software Engineer');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

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

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !username.trim() || !password.trim()) {
      setErrorMsg('Please fill in all fields.');
      return;
    }

    if (username.length < 3) {
      setErrorMsg('Username must be at least 3 characters long.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const cleanUsername = username.trim().toLowerCase();
      const hashedPassword = await hashPassword(password);
      const newId = crypto.randomUUID();

      if (dbActive) {
        // 1. Check for Username Uniqueness in Supabase
        const { data: existingUser, error: checkError } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', cleanUsername)
          .maybeSingle();

        if (checkError) {
          console.error('Supabase uniqueness check error:', checkError);
          throw new Error(`Database check failed: ${checkError.message} (${checkError.code || ''})`);
        }

        if (existingUser) {
          setErrorMsg('Username is already taken. Please choose another.');
          setIsLoading(false);
          return;
        }

        // 2. Insert new profile into Supabase
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: newId,
            full_name: fullName.trim(),
            target_role: targetRole,
            username: cleanUsername,
            password: hashedPassword,
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('Supabase insert profile error:', insertError);
          throw new Error(`Database insert failed: ${insertError.message} (${insertError.code || ''})`);
        }

        // 3. Save profile session locally and redirect
        const activeProfile = {
          id: newId,
          full_name: fullName.trim(),
          target_role: targetRole
        };
        localStorage.setItem('exam_buddy_profile', JSON.stringify(activeProfile));
        router.push('/');
      } else {
        // Local simulation path
        const localUsersRaw = localStorage.getItem('exam_buddy_local_users');
        const localUsers = localUsersRaw ? JSON.parse(localUsersRaw) : [];

        // 1. Check for local username uniqueness
        const userExists = localUsers.some(
          (u: any) => u.username.toLowerCase() === cleanUsername
        );

        if (userExists) {
          setErrorMsg('Username is already taken. Please choose another.');
          setIsLoading(false);
          return;
        }

        // 2. Add user to local credentials list
        const newUser = {
          id: newId,
          username: cleanUsername,
          password: hashedPassword,
          full_name: fullName.trim(),
          target_role: targetRole
        };
        localUsers.push(newUser);
        localStorage.setItem('exam_buddy_local_users', JSON.stringify(localUsers));

        // 3. Save profile session and redirect
        const activeProfile = {
          id: newId,
          full_name: fullName.trim(),
          target_role: targetRole
        };
        localStorage.setItem('exam_buddy_profile', JSON.stringify(activeProfile));
        router.push('/');
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      setErrorMsg(err.message || 'An unexpected error occurred during registration.');
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

      {/* Registration Card */}
      <div className="card" style={{ maxWidth: '450px', width: '100%', padding: '2.5rem 2rem' }}>
        <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>Create Account</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Set up your profile to start tracking skill ratings and adaptive topics.
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
            <span>Simulating registration on local storage.</span>
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

        <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Full Name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Full Name
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <User size={18} />
              </span>
              <input
                type="text"
                placeholder="e.g. John Doe"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
                style={{ width: '100%', paddingLeft: '2.75rem' }}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Target Role / Path */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Target Role / Path
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <Briefcase size={18} />
              </span>
              <select
                value={targetRole}
                onChange={e => setTargetRole(e.target.value)}
                style={{ width: '100%', paddingLeft: '2.75rem', appearance: 'none', cursor: 'pointer' }}
                disabled={isLoading}
              >
                <optgroup label="─── Engineering Pathway ───">
                  <option value="Engineering Admission">Engineering Admission (JEE / CET Aspirant)</option>
                  <option value="Engineering Student">Engineering Student (Sem / Viva / Internals)</option>
                </optgroup>
                <optgroup label="─── Software Roles ───">
                  <option value="Software Engineer">Software Engineer</option>
                  <option value="Web Developer">Web Developer</option>
                  <option value="Android Developer">Android Developer</option>
                  <option value="Full Stack Developer">Full Stack Developer</option>
                </optgroup>
                <optgroup label="─── Data & AI Roles ───">
                  <option value="Data Analyst">Data Analyst</option>
                  <option value="Data Scientist">Data Scientist</option>
                  <option value="AI/ML Engineer">AI/ML Engineer</option>
                </optgroup>
                <optgroup label="─── Infrastructure Roles ───">
                  <option value="Cloud Engineer">Cloud Engineer</option>
                  <option value="DevOps Engineer">DevOps Engineer</option>
                  <option value="Cybersecurity Engineer">Cybersecurity Engineer</option>
                </optgroup>
              </select>
            </div>
          </div>

          {/* Username */}
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
                placeholder="Choose a username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                style={{ width: '100%', paddingLeft: '2.75rem' }}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <Lock size={18} />
              </span>
              <input
                type="password"
                placeholder="Must be at least 6 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{ width: '100%', paddingLeft: '2.75rem' }}
                disabled={isLoading}
              />
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
                Registering...
              </span>
            ) : (
              <span className="flex-center" style={{ gap: '0.5rem' }}>
                Register & Start <ChevronRight size={16} />
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
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none', transition: 'color var(--transition-fast)' }}>
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  );
}
