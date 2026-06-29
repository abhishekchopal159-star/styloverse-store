// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAcDOm0YQ0f5xKDqcPDJdILwj9LiOWFHC8",
  authDomain: "styloverse-6ab14.firebaseapp.com",
  projectId: "styloverse-6ab14",
  storageBucket: "styloverse-6ab14.firebasestorage.app",
  messagingSenderId: "47059187384",
  appId: "1:47059187384:web:303802d24d238dd581264d",
  measurementId: "G-EF5SXDQRGJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
