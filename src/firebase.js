import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA2-0SV6TbqJXuMpg73FVRaJMjzA3TGwz0",
  authDomain: "game-0226.firebaseapp.com",
  projectId: "game-0226",
  storageBucket: "game-0226.firebasestorage.app",
  messagingSenderId: "3161543718",
  appId: "1:3161543718:web:dd0f6b3d8278ab8d2402e7",
  measurementId: "G-JHKFDB3B8N"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Initialize Analytics (optional)
let analytics = null;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export { db, analytics };

