import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, signOut } from 'firebase/auth';
import { GoogleAuthProvider } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { getOrCreateUser, isEmailInvited } from '../lib/db';
import { FULL_ADMIN_EMAIL } from '../lib/config';

const AuthContext = createContext(null);

function isMobile() {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

export function AuthProvider({ children }) {
  const [user, setUser]                 = useState(null);
  const [profile, setProfile]           = useState(null);
  const [accessToken, setAccessToken]   = useState(null);
  const [loading, setLoading]           = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  async function handleFirebaseUser(firebaseUser) {
    if (!firebaseUser) {
      setUser(null);
      setProfile(null);
      setAccessToken(null);
      setAccessDenied(false);
      setLoading(false);
      return;
    }

    if (firebaseUser.email.toLowerCase() === FULL_ADMIN_EMAIL.toLowerCase()) {
      setUser(firebaseUser);
      const p = await getOrCreateUser(firebaseUser);
      p.role = 'full_admin';
      setProfile(p);
      setAccessDenied(false);
      setLoading(false);
      return;
    }

    const invited = await isEmailInvited(firebaseUser.email);
    if (!invited) {
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
  }

  useEffect(() => {
    // Check for redirect result first (mobile login)
    getRedirectResult(auth).then(result => {
      if (result?.user) {
        handleFirebaseUser(result.user);
      }
    }).catch(e => {
      console.error('Redirect result error:', e);
    });

    const unsub = onAuthStateChanged(auth, handleFirebaseUser);
    return unsub;
  }, []);

  async function login() {
    if (isMobile()) {
      await signInWithRedirect(auth, googleProvider);
    } else {
      await signInWithPopup(auth, googleProvider);
    }
  }

  async function logout() {
    await signOut(auth);
  }

  return (
    <AuthContext.Provider value={{ user, profile, accessToken, loading, accessDenied, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
