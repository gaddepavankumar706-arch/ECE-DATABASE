// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB2f_fRyEzj3EunZgqIkNkkNBJvLAJ-3w8",
  authDomain: "ece-status-profile.firebaseapp.com",
  databaseURL: "https://ece-status-profile-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ece-status-profile",
  storageBucket: "ece-status-profile.firebasestorage.app",
  messagingSenderId: "104915519062",
  appId: "1:104915519062:web:c1bd758b8d1332af235df7",
  measurementId: "G-R3F6X0L41S"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
