import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Configuration Firebase - À REMPLACER avec vos propres valeurs
// Voir les instructions dans INSTRUCTIONS.md pour obtenir ces valeurs
const firebaseConfig = {
  apiKey: "AIzaSyBPds5b5kXAFAjJejapxedpBsB1gnufN8g",
  authDomain: "keller-game.firebaseapp.com",
  databaseURL: "https://keller-game-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "keller-game",
  storageBucket: "keller-game.firebasestorage.app",
  messagingSenderId: "1081947654640",
  appId: "1:1081947654640:web:a37ff90ede81879d38f535"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
