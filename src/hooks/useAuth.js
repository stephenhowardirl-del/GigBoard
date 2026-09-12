import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { getOrCreateUser, isEmailInvited } from '../lib/db';
import { FULL_ADMIN_EMAIL } from '../lib/config';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]                 = useState(null);
  const [profile, setProfile]           = useState(null);
  const [loading, setLoading]           = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [loginError, setLoginError]     = useState('');

  async function handleFirebaseUser(firebaseUser) {
    if (!firebaseUser) {
      setUser(null);
      setProfile(null);
      setAccessDenied(false);
      setLoading(false);
      return;
    }
    try {
      const email = (firebaseUser.email || '').trim().toLowerCase();

      if (email === FULL_ADMIN_EMAIL.toLowerCase()) {
        setUser(firebaseUser);
        const p = await getOrCreateUser(firebaseUser);
        p.role = 'full_admin';
        setProfile(p);
        setAccessDenied(false);
        setLoading(false);
        return;
      }

      const invited = await isEmailInvited(email);
      if (!invited) {
        console.warn('Access denied — email not in invite list:', email);
        setUser(firebaseUser);
        setProfile(null);
        setAccessDenied(true);
        setLoading(false);
        return;
      }

      setUser(firebaseUser);
      const p = await getOrCreateUser(firebaseUser);
      setProfile(p);
      setAccessDenied(false);
      setLoading(false);
    } catch (e) {
      console.error('handleFirebaseUser error:', e);
      setLoginError(e.message || 'Something went wrong signing in.');
      setUser(null);
      setProfile(null);
      setAccessDenied(false);
      setLoading(false);
    }
  }

  useEffect(() => {
    let unsubscribe = null;

    async function init() {
      // Pick up a redirect result if one exists (only used as a fallback)
      try {
        await getRedirectResult(auth);
      } catch (e) {
        // Ignore "missing initial state" — onAuthStateChanged will still fire if signed in
        console.warn('Redirect result:', e.code || e.message);
      }
      unsubscribe = onAuthStateChanged(auth, handleFirebaseUser);
    }

    init();
    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  async function login() {
    setLoginError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      // Popup blocked or unsupported in this browser — fall back to redirect
      if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') {
        try {
          await signInWithRedirect(auth, googleProvider);
        } catch (e2) {
          console.error('Redirect login error:', e2);
          setLoginError('Sign-in failed. Please open gig-board.vercel.app in Safari or Chrome (not inside another app) and try again.');
        }
        return;
      }
      if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') return;
      console.error('Login error:', e);
      setLoginError(e.message || 'Sign-in failed.');
    }
  }

  async function logout() {
    await signOut(auth);
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, accessDenied, loginError, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
