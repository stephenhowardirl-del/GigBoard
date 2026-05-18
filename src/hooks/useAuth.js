import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { getOrCreateUser, isEmailInvited } from '../lib/db';
import { FULL_ADMIN_EMAIL } from '../lib/config';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]                 = useState(null);
  const [profile, setProfile]           = useState(null);
  const [loading, setLoading]           = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  async function handleFirebaseUser(firebaseUser) {
    if (!firebaseUser) {
      setUser(null);
      setProfile(null);
      setAccessDenied(false);
      setLoading(false);
      return;
    }

    try {
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

    } catch (e) {
      console.error('handleFirebaseUser error:', e);
      setUser(null);
      setProfile(null);
      setAccessDenied(false);
      setLoading(false);
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, handleFirebaseUser);
    return () => unsubscribe();
  }, []);

  async function login() {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      console.error('Login error:', e);
    }
  }

  async function logout() {
    await signOut(auth);
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, accessDenied, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
