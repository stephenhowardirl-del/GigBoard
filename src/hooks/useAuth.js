import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { getOrCreateUser } from '../lib/db';
import { FULL_ADMIN_EMAIL } from '../lib/config';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]               = useState(null);  // firebase user
  const [profile, setProfile]         = useState(null);  // firestore profile
  const [accessToken, setAccessToken] = useState(null);  // google oauth token
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const p = await getOrCreateUser(firebaseUser);
        // Override role for full admin
        if (firebaseUser.email === FULL_ADMIN_EMAIL) {
          p.role = 'full_admin';
        }
        setProfile(p);
      } else {
        setUser(null);
        setProfile(null);
        setAccessToken(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  async function login() {
    const result = await signInWithPopup(auth, googleProvider);
    // Capture the OAuth access token for Calendar API calls
    const credential = result._tokenResponse;
    if (credential?.oauthAccessToken) {
      setAccessToken(credential.oauthAccessToken);
    }
  }

  async function logout() {
    await signOut(auth);
  }

  return (
    <AuthContext.Provider value={{ user, profile, accessToken, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
