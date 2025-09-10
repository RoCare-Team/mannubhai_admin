import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAr8_-XgFHCuqAovbp5NvKnbvBuUdutwJA",
  authDomain: "mannubhai-5f407.firebaseapp.com",
  projectId: "mannubhai-5f407",
  storageBucket: "mannubhai-5f407.firebasestorage.app",
  messagingSenderId: "1055374831802",
  appId: "1:1055374831802:web:9dc796b3db069c0c0d1283",
  measurementId: "G-29XPJ7LQHL"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app); 

export default app;