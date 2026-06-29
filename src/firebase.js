import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// Auth aur Provider ke liye ye imports add karo
import { getAuth, GoogleAuthProvider } from "firebase/auth"; 

const firebaseConfig = {
  apiKey: "AIzaSyAcDOm0YQ0f5xKDqcPDJdILwj9LiOWFHC8",
  authDomain: "styloverse-6ab14.firebaseapp.com",
  projectId: "styloverse-6ab14",
  storageBucket: "styloverse-6ab14.firebasestorage.app",
  messagingSenderId: "47059187384",
  appId: "1:47059187384:web:303802d24d238dd581264d",
  measurementId: "G-EF5SXDQRGJ"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Yahan se export karo taaki App.jsx inhe use kar sake
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export { app, analytics };
