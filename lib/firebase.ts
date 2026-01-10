import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDB86DeluK8VpCCqqCX2zXUJZTZomEml8k",
  authDomain: "app-killer-game.firebaseapp.com",
  databaseURL: "https://app-killer-game-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "app-killer-game",
  storageBucket: "app-killer-game.firebasestorage.app",
  messagingSenderId: "1011226719118",
  appId: "1:1011226719118:web:689e692ff387915fa76adf"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);

// IMPORTANT : On utilise "export const db" pour que le reste du jeu fonctionne
export const db = getDatabase(app);