// firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAu2FNK_IoeCtk4ZVZAp6XahZnfrVSRC9E",
  authDomain: "pureflow-system.firebaseapp.com",
  projectId: "pureflow-system",
  storageBucket: "pureflow-system.firebasestorage.app",
  messagingSenderId: "817474825207",
  appId: "1:817474825207:web:cfb188a35d073158575cf2",
  measurementId: "G-T7X7JB8428"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
