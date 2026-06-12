import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as fbSignOut, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json'; // Adjust path if needed

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Ensure local persistence is set so the user stays logged in across mobile app exits
setPersistence(auth, browserLocalPersistence).catch(console.error);

export const loginWithGoogle = async () => {
  return await signInWithPopup(auth, googleProvider);
};

export const signOut = async () => {
  return await fbSignOut(auth);
};
