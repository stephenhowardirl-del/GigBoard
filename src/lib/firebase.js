import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBBsfvbhpMOLQhQt-5CgazqLCqbkpYZBFY",
  authDomain: "gigboard-fde2d.firebaseapp.com",
  projectId: "gigboard-fde2d",
  storageBucket: "gigboard-fde2d.firebasestorage.app",
  messagingSenderId: "177652436110",
  appId: "1:177652436110:web:a98ada1f3e247673f04ddf"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

googleProvider.addScope('https://www.googleapis.com/auth/calendar.events');
googleProvider.setCustomParameters({ prompt: 'select_account' });
