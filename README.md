# 🎯 Mission Game - Application Professionnelle

Application web professionnelle pour organiser des jeux de missions sociales type "Killer Game" lors de vos after-works et événements d'entreprise.

## ✨ Fonctionnalités

- 📱 **QR Code** : Les joueurs scannent pour rejoindre instantanément
- 🔄 **Synchronisation temps réel** : Tous les téléphones se mettent à jour automatiquement
- 📸 **Photos des joueurs** : Prise de photo directement depuis l'application
- 🎯 **Missions aléatoires** : 12 missions différentes et amusantes
- ✅ **Système de confirmation** : La cible valide si elle a été piégée
- 🏆 **Classement en direct** : Podium avec médailles
- 💯 **Points** : +10 si vous piégez, -5 si vous êtes piégé
- 📊 **Dashboard organisateur** : Vue complète de la partie
- 🎨 **Design professionnel** : Interface moderne et intuitive
- 📱 **100% Responsive** : Fonctionne sur mobile, tablette et desktop

## 🚀 Démarrage Rapide

1. Lisez le fichier **INSTRUCTIONS.md** pour le déploiement complet
2. Configurez Firebase (gratuit, 5 minutes)
3. Déployez sur Vercel (gratuit, 2 minutes)
4. Partagez l'URL à vos collègues !

## 💰 Coût

**0€ / mois** - Tout est gratuit !
- Firebase (base de données)
- Vercel ou Netlify (hébergement)

## 🎮 Comment jouer

### Pour l'organisateur :
1. Ouvrez l'application
2. Cliquez sur "Créer une partie"
3. Montrez le QR Code aux joueurs
4. Attendez que tout le monde s'inscrive (min 3 joueurs)
5. Cliquez sur "Démarrer"
6. Suivez le jeu sur le dashboard

### Pour les joueurs :
1. Scannez le QR Code avec votre téléphone
2. Entrez votre nom et prenez une photo
3. Rejoignez la partie
4. Voyez votre mission et votre cible
5. Piégez votre cible !
6. Validez les confirmations

## 📋 Prérequis

- Node.js 18+ (pour le développement local)
- Compte Firebase (gratuit)
- Compte Vercel ou Netlify (gratuit)

## 🛠️ Technologies

- **Frontend** : Next.js 14, React 18, Tailwind CSS
- **Backend** : Firebase Realtime Database
- **Hébergement** : Vercel / Netlify
- **QR Code** : qrcode.react
- **Icônes** : lucide-react

## 📦 Structure du projet

```
mission-game-pro/
├── pages/
│   ├── _app.js          # Configuration de l'app
│   └── index.js         # Page principale du jeu
├── lib/
│   └── firebase.ts      # Configuration Firebase
├── styles/
│   └── globals.css      # Styles globaux
├── public/              # Fichiers statiques
├── package.json         # Dépendances
├── next.config.js       # Configuration Next.js
├── tailwind.config.js   # Configuration Tailwind
├── INSTRUCTIONS.md      # Guide de déploiement
└── README.md           # Ce fichier
```

## 🎯 Missions disponibles

1. Demander à la cible de recommander 3 films
2. Faire rire la cible avec une blague
3. Obtenir le plat préféré de la cible
4. Demander un souvenir d'enfance
5. Faire un selfie avec la cible
6. Obtenir sa destination de voyage de rêve
7. Demander d'apprendre quelque chose
8. Faire complimenter vos vêtements
9. Obtenir le titre de son livre préféré
10. Faire chanter 10 secondes
11. Obtenir une anecdote embarrassante
12. Découvrir son animal préféré

## 🔐 Sécurité

L'application utilise Firebase Realtime Database avec des règles de sécurité configurables. Pour la production, consultez la section Sécurité dans INSTRUCTIONS.md.

## 📱 Compatibilité

- ✅ iOS Safari
- ✅ Android Chrome
- ✅ Desktop Chrome, Firefox, Safari, Edge
- ✅ Tous les navigateurs modernes

## 🆘 Support

Consultez INSTRUCTIONS.md pour :
- Guide de déploiement pas à pas
- Résolution des problèmes courants
- Configuration Firebase
- Configuration Vercel/Netlify

## 📝 Licence

Ce projet est fourni à des fins éducatives et professionnelles.

## 🎉 Bon jeu !

Organisez des after-works mémorables avec vos collègues !

---

**Créé avec ❤️ pour rendre vos événements d'entreprise plus fun !**
