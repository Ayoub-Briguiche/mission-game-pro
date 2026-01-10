# 🎯 MISSION GAME - Guide d'installation et de déploiement

## 📋 Vue d'ensemble

Cette application professionnelle est prête à être hébergée gratuitement en ligne. Les utilisateurs scanneront un QR code pour rejoindre la partie depuis leur téléphone.

## 🚀 DÉPLOIEMENT GRATUIT (Étape par étape)

### ÉTAPE 1 : Créer un projet Firebase (Gratuit)

1. Allez sur https://console.firebase.google.com/
2. Cliquez sur "Ajouter un projet"
3. Nommez votre projet (ex: "mission-game-pro")
4. Désactivez Google Analytics (optionnel)
5. Cliquez sur "Créer le projet"

### ÉTAPE 2 : Activer Realtime Database

1. Dans le menu de gauche, cliquez sur "Realtime Database"
2. Cliquez sur "Créer une base de données"
3. Choisissez une région (europe-west1 recommandé)
4. Sélectionnez "Démarrer en mode test"
5. Cliquez sur "Activer"

### ÉTAPE 3 : Configurer les règles de sécurité

1. Dans l'onglet "Règles" de Realtime Database
2. Remplacez les règles par :

```json
{
  "rules": {
    "games": {
      "$gameId": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

3. Cliquez sur "Publier"

### ÉTAPE 4 : Obtenir la configuration Firebase

1. Cliquez sur l'icône ⚙️ (Paramètres) à côté de "Vue d'ensemble du projet"
2. Cliquez sur "Paramètres du projet"
3. Faites défiler jusqu'à "Vos applications"
4. Cliquez sur l'icône Web </>
5. Nommez votre app (ex: "Mission Game")
6. **Copiez la configuration** (firebaseConfig)

### ÉTAPE 5 : Configurer votre projet

1. Ouvrez le fichier `lib/firebase.ts`
2. Remplacez les valeurs par votre configuration Firebase :

```typescript
const firebaseConfig = {
  apiKey: "VOTRE_API_KEY_ICI",
  authDomain: "votre-projet.firebaseapp.com",
  databaseURL: "https://votre-projet-default-rtdb.firebaseio.com",
  projectId: "votre-projet",
  storageBucket: "votre-projet.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

### ÉTAPE 6 : Déployer sur Vercel (Gratuit)

#### Option A : Déploiement avec GitHub (Recommandé)

1. Créez un compte sur https://github.com (gratuit)
2. Créez un nouveau repository
3. Uploadez tous les fichiers du dossier `mission-game-pro`
4. Allez sur https://vercel.com
5. Cliquez sur "Sign Up" et connectez-vous avec GitHub
6. Cliquez sur "Import Project"
7. Sélectionnez votre repository
8. Cliquez sur "Deploy"
9. ✅ Votre application est en ligne !

#### Option B : Déploiement direct

1. Allez sur https://vercel.com
2. Cliquez sur "Sign Up" (gratuit)
3. Téléchargez Vercel CLI : `npm install -g vercel`
4. Dans le dossier du projet, exécutez : `vercel`
5. Suivez les instructions
6. ✅ Votre application est en ligne !

### ÉTAPE 7 : Utiliser votre application

1. Vercel vous donnera une URL (ex: https://mission-game-pro.vercel.app)
2. L'organisateur ouvre cette URL
3. Clique sur "Créer une partie"
4. Un QR Code s'affiche automatiquement
5. Les joueurs scannent le QR code avec leur téléphone
6. Ils s'inscrivent avec nom + photo
7. L'organisateur démarre le jeu
8. ✨ C'est parti !

## 📱 ALTERNATIVE : Déploiement sur Netlify

1. Allez sur https://netlify.com
2. Cliquez sur "Sign Up" (gratuit)
3. Glissez-déposez le dossier `mission-game-pro`
4. ✅ Votre application est en ligne !

## 🔧 DÉVELOPPEMENT LOCAL (pour tester)

Si vous voulez tester en local avant de déployer :

```bash
# 1. Installer les dépendances
npm install

# 2. Lancer en mode développement
npm run dev

# 3. Ouvrir http://localhost:3000
```

## ✅ CHECKLIST

- [ ] Firebase créé
- [ ] Realtime Database activée
- [ ] Règles de sécurité configurées
- [ ] Configuration Firebase copiée dans `lib/firebase.ts`
- [ ] Projet déployé sur Vercel ou Netlify
- [ ] URL de l'application obtenue
- [ ] QR Code testé avec un téléphone

## 🎯 FONCTIONNALITÉS

✅ QR Code automatique pour rejoindre
✅ Synchronisation temps réel entre tous les téléphones
✅ Photos des joueurs
✅ Missions aléatoires
✅ Système de confirmation
✅ Classement en direct
✅ Design responsive (mobile + desktop)
✅ Hébergement gratuit à vie
✅ Pas de limite de joueurs

## 🆘 AIDE

### Problème : "Firebase not configured"
→ Vérifiez que vous avez bien remplacé la configuration dans `lib/firebase.ts`

### Problème : "Permission denied"
→ Vérifiez les règles de sécurité dans Firebase Console

### Problème : Le QR code ne fonctionne pas
→ Assurez-vous d'utiliser l'URL HTTPS de production (pas localhost)

### Problème : Les joueurs ne se synchronisent pas
→ Vérifiez votre connexion internet et les règles Firebase

## 💰 COÛTS

- Firebase Realtime Database : **GRATUIT** (jusqu'à 1GB et 100 connexions simultanées)
- Vercel/Netlify : **GRATUIT** (hébergement illimité)
- Total : **0€ / mois** 🎉

## 🔒 SÉCURITÉ

Pour la production, il est recommandé de :
1. Restreindre l'accès aux games actifs uniquement
2. Ajouter une expiration automatique des parties (ex: 24h)
3. Limiter le nombre de joueurs par partie

Règles Firebase améliorées (optionnel) :

```json
{
  "rules": {
    "games": {
      "$gameId": {
        ".read": true,
        ".write": "data.child('createdAt').val() > (now - 86400000)"
      }
    }
  }
}
```

## 🎉 C'EST TERMINÉ !

Votre application professionnelle est prête ! Partagez l'URL avec vos collègues pour votre prochain after-work !

---

**Besoin d'aide ?** 
- Documentation Firebase : https://firebase.google.com/docs
- Documentation Vercel : https://vercel.com/docs
- Documentation Next.js : https://nextjs.org/docs
