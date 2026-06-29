import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  RecaptchaVerifier, 
  signInWithPhoneNumber 
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAcDOm0YQ0f5xKDqcPDJdILwj9LiOWFHC8",
  authDomain: "styloverse-6ab14.firebaseapp.com",
  projectId: "styloverse-6ab14",
  storageBucket: "styloverse-6ab14.firebasestorage.app",
  messagingSenderId: "4705918734",
  appId: "1:4705918734:web:303802d24d238dd581264d",
  measurementId: "G-EF5SXDQRGJ"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Setting up standard configurations
googleProvider.setCustomParameters({ prompt: 'select_account' });
export { signInWithPopup, RecaptchaVerifier, signInWithPhoneNumber };
