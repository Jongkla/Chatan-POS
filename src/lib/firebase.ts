import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as fbSignOut } from 'firebase/auth';
import { getFirestore, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json'; // Adjust path if needed

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Optional: Enable offline persistence for multi-tab support
// enableMultiTabIndexedDbPersistence(db).catch((err) => {
//   if (err.code == 'failed-precondition') {
//     console.warn('Multiple tabs open, persistence can only be enabled in one tab at a a time.');
//   } else if (err.code == 'unimplemented') {
//     console.warn('The current browser does not support all of the features required to enable persistence');
//   }
// });

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
  return await signInWithPopup(auth, googleProvider);
};

export const signOut = async () => {
  return await fbSignOut(auth);
};
