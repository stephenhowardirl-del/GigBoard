import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { GoogleAuthProvider } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { getOrCreateUser, isEmailInvited } from '../lib/db';
import { FULL_ADMIN_EMAIL } from '../lib/config';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]                 = useState(null);
  const [profile, setProfile]           = useState(null);
  const [accessToken, setAccessToken]   = useState(null);
  const [loading, setLoading]           = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
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
      } else {
        setUser(null);
        setProfile(null);
        setAccessToken(null);
        setAccessDenied(false);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  async function login() {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      // Use the official Firebase method to get the OAuth credential
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setAccessToken(credential.accessToken);
        console.log('Calendar access token captured successfully');
      } else {
        console.warn('No access token returned from Google login');
      }
    } catch (error) {
      console.error('Login error:', error);
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
