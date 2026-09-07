import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Your app.js expects this export.
const isConfigPlaceholder =
  !firebaseConfig.apiKey ||
  firebaseConfig.apiKey === "YOUR_API_KEY";

export {
  app,
  auth,
  db,
  googleProvider,
  isConfigPlaceholder
};
