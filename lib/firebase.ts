import { initializeApp, getApps } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Configuration Firebase (Vos clés personnelles)
const firebaseConfig = {
  apiKey: "AIzaSyDB86DeluK8VpCCqqCX2zXUJZTZomEml8k",
  authDomain: "app-killer-game.firebaseapp.com",
  databaseURL: "https://app-killer-game-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "app-killer-game",
  storageBucket: "app-killer-game.firebasestorage.app",
  messagingSenderId: "1011226719118",
  appId: "1:1011226719118:web:689e692ff387915fa76adf"
};

// Initialisation de Firebase
// On vérifie si l'app est déjà initialisée pour éviter les erreurs au rechargement
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// IMPORTANT : Le nom doit être "db" pour correspondre au reste du code du jeu
export const db = getDatabase(app);
