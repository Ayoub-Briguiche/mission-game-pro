import { useState, useEffect } from 'react';
import { database } from '../lib/firebase';
import { ref, onValue, set, update, remove, get } from 'firebase/database';
import { QRCodeSVG } from 'qrcode.react';
import { Camera, Users, Target, Trophy, CheckCircle, XCircle, Play, QrCode, ArrowLeft, RefreshCw, LogOut, Clock, Maximize, Minimize } from 'lucide-react';

// Fonction pour générer une mission unique avec l'IA
const generateMissionWithAI = async (targetName, usedMissions = []) => {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: `Tu es un générateur de missions amusantes pour un jeu de bureau entre collègues.

CONTEXTE :
- La cible s'appelle : ${targetName}
- Le but est de "piéger" cette personne avec une mission subtile et amusante
- Les missions doivent être réalisables dans un environnement de bureau/travail
- Elles doivent être légères, fun et appropriées pour le travail

MISSIONS DÉJÀ UTILISÉES (À ÉVITER) :
${usedMissions.length > 0 ? usedMissions.join('\n') : 'Aucune mission utilisée encore'}

INSTRUCTIONS :
Génère UNE SEULE mission créative et unique qui :
1. Est différente des missions déjà utilisées
2. Est réalisable en quelques minutes
3. N'est pas embarrassante ou inappropriée
4. Utilise le nom "${targetName}" dans la mission
5. Est formulée de manière claire et concise (maximum 15 mots)

Réponds UNIQUEMENT avec le texte de la mission, sans préambule ni explication.`
          }
        ],
      })
    });

    const data = await response.json();
    
    if (data.content && data.content[0] && data.content[0].text) {
      return data.content[0].text.trim();
    } else {
      // Fallback sur les missions prédéfinies
      const templates = [
        `Demander à ${targetName} de vous recommander 3 films`,
        `Faire rire ${targetName} avec une blague`,
        `Obtenir de ${targetName} son plat préféré`,
      ];
      return templates[Math.floor(Math.random() * templates.length)];
    }
  } catch (error) {
    console.error('Erreur lors de la génération de mission:', error);
    // Fallback sur les missions prédéfinies
    const templates = [
      `Demander à ${targetName} de vous recommander 3 films`,
      `Faire rire ${targetName} avec une blague`,
      `Obtenir de ${targetName} son plat préféré`,
      `Demander à ${targetName} de partager un souvenir d'enfance`,
      `Convaincre ${targetName} de faire un selfie avec vous`,
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }
};

export default function Home() {
  const [gameState, setGameState] = useState('setup');
  const [myRole, setMyRole] = useState(null);
  const [players, setPlayers] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [missions, setMissions] = useState([]);
  const [pendingConfirmations, setPendingConfirmations] = useState([]);
  const [gameCode, setGameCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [missionVisible, setMissionVisible] = useState(false);
  const [waitingForValidation, setWaitingForValidation] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activityFeed, setActivityFeed] = useState([]);
  const [useAI, setUseAI] = useState(true);
  const [isGeneratingMissions, setIsGeneratingMissions] = useState(false);

  const missionTemplates = [
    "Demander à {target} de vous recommander 3 films",
    "Faire rire {target} avec une blague",
    "Obtenir de {target} son plat préféré",
    "Demander à {target} de partager un souvenir d'enfance",
    "Convaincre {target} de faire un selfie avec vous",
    "Obtenir de {target} sa destination de voyage de rêve",
    "Demander à {target} de vous apprendre quelque chose",
    "Faire complimenter vos vêtements par {target}",
    "Obtenir de {target} le titre de son livre préféré",
    "Demander à {target} de chanter 10 secondes",
    "Faire raconter à {target} une anecdote embarrassante",
    "Obtenir de {target} son animal préféré"
  ];

  useEffect(() => {
    loadLocalData();
  }, []);

  useEffect(() => {
    if (myRole === 'player' && missions.length > 0) {
      const myMission = missions.find(m => m.playerId === currentPlayer?.id && !m.completed);
      if (myMission) {
        setMissionVisible(false);
        setWaitingForValidation(false);
      }
    }
  }, [missions.length, myRole]);

  useEffect(() => {
    if (myRole === 'player' && currentPlayer && waitingForValidation) {
      const myPendingConfirmation = pendingConfirmations.find(
        c => c.hunterId === currentPlayer.id
      );
      
      if (!myPendingConfirmation) {
        setWaitingForValidation(false);
      }
    }
  }, [pendingConfirmations, myRole, currentPlayer, waitingForValidation]);

  useEffect(() => {
    if (!gameCode) return;
    const feedRef = ref(database, `games/${gameCode}/activityFeed`);
    const unsubscribe = onValue(feedRef, (snapshot) => {
      if (snapshot.exists()) {
        const feedData = snapshot.val();
        const feedArray = Object.values(feedData).sort((a, b) => b.timestamp - a.timestamp);
        setActivityFeed(feedArray);
      } else {
        setActivityFeed([]);
      }
    });
    return () => unsubscribe();
  }, [gameCode]);

  const loadLocalData = () => {
    const savedRole = localStorage.getItem('my-role');
    const savedCode = localStorage.getItem('game-code');
    const savedPlayerId = localStorage.getItem('my-player-id');
    
    if (savedRole) setMyRole(savedRole);
    if (savedCode) {
      setGameCode(savedCode);
      listenToGame(savedCode);
    }
    
    setIsLoading(false);
  };

  const listenToGame = (code) => {
    const gameRef = ref(database, `games/${code}`);
    
    const unsubscribe = onValue(gameRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setPlayers(Object.values(data.players || {}));
        setGameState(data.gameState || 'lobby');
        setMissions(Object.values(data.missions || {}));
        setPendingConfirmations(Object.values(data.confirmations || {}));
        
        const savedPlayerId = localStorage.getItem('my-player-id');
        if (savedPlayerId && data.players) {
          const player = Object.values(data.players).find(p => p.id === savedPlayerId);
          if (player) setCurrentPlayer(player);
        }
      }
    }, (error) => {
      console.error('Erreur Firebase:', error);
    });

    return () => unsubscribe();
  };

  const createGame = async () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setGameCode(code);
    setMyRole('admin');
    setGameState('lobby');
    
    localStorage.setItem('my-role', 'admin');
    localStorage.setItem('game-code', code);
    
    await set(ref(database, `games/${code}`), {
      gameCode: code,
      gameState: 'lobby',
      players: {},
      missions: {},
      confirmations: {},
      createdAt: Date.now()
    });

    listenToGame(code);
    setShowQRCode(true);
  };

  const joinGame = async (code, name, photoUrl) => {
    try {
      const gameRef = ref(database, `games/${code}`);
      
      const gameSnapshot = await get(gameRef);
      if (!gameSnapshot.exists()) {
        alert('❌ Ce code de partie n\'existe pas !');
        return;
      }

      const gameData = gameSnapshot.val();
      
      if (gameData.players) {
        const existingNames = Object.values(gameData.players).map(p => p.name.toLowerCase().trim());
        if (existingNames.includes(name.toLowerCase().trim())) {
          alert('❌ Ce nom est déjà utilisé dans cette partie !\n\nVeuillez choisir un autre nom.');
          return;
        }
      }

      const newPlayer = {
        id: Date.now().toString(),
        name: name.trim(),
        photo: photoUrl,
        points: 0,
        trapped: 0,
        successful: 0,
        joinedAt: Date.now()
      };
      
      await set(ref(database, `games/${code}/players/${newPlayer.id}`), newPlayer);
      
      setCurrentPlayer(newPlayer);
      setMyRole('player');
      setGameCode(code);
      
      localStorage.setItem('my-role', 'player');
      localStorage.setItem('my-player-id', newPlayer.id);
      localStorage.setItem('game-code', code);
      
      listenToGame(code);
    } catch (e) {
      alert('Erreur : ' + e.message);
    }
  };

  const leaveGame = async () => {
    if (confirm('Voulez-vous vraiment quitter cette partie ?')) {
      if (myRole === 'player' && currentPlayer && gameCode) {
        try {
          await remove(ref(database, `games/${gameCode}/players/${currentPlayer.id}`));
        } catch (e) {
          console.error('Erreur lors de la suppression du joueur:', e);
        }
      }
      
      localStorage.clear();
      window.location.reload();
    }
  };

  const removePlayer = async (playerId) => {
    if (confirm('Supprimer ce joueur de la partie ?')) {
      try {
        await remove(ref(database, `games/${gameCode}/players/${playerId}`));
      } catch (e) {
        alert('Erreur lors de la suppression : ' + e.message);
      }
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error('Erreur plein écran:', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const calculateTimeBonus = (missionStartTime) => {
    const timeElapsed = Date.now() - missionStartTime;
    const minutes = timeElapsed / 60000;
    
    if (minutes < 1) return 1000;
    if (minutes < 2) return 900;
    if (minutes < 3) return 800;
    if (minutes < 5) return 600;
    if (minutes < 10) return 300;
    if (minutes < 15) return 150;
    if (minutes < 20) return 75;
    if (minutes < 30) return 25;
    return 1;
  };

  const calculateTrapPenalty = (missionStartTime) => {
    const timeElapsed = Date.now() - missionStartTime;
    const minutes = timeElapsed / 60000;
    
    if (minutes < 1) return 20;
    if (minutes < 3) return 15;
    if (minutes < 5) return 12;
    if (minutes < 10) return 8;
    return 5;
  };

  const startGame = async () => {
    if (players.length < 3) {
      alert('❌ Minimum 3 joueurs requis pour démarrer !');
      return;
    }

    setIsGeneratingMissions(true);
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    const newMissions = {};
    
    if (useAI) {
      for (let index = 0; index < shuffledPlayers.length; index++) {
        const player = shuffledPlayers[index];
        const targetIndex = (index + 1) % shuffledPlayers.length;
        const target = shuffledPlayers[targetIndex];
        
        const missionText = await generateMissionWithAI(target.name, []);
        
        const missionId = Date.now().toString() + index;
        newMissions[missionId] = {
          id: missionId,
          playerId: player.id,
          targetId: target.id,
          mission: missionText,
          targetName: target.name,
          targetPhoto: target.photo,
          completed: false,
          validated: false,
          startedAt: Date.now(),
          generatedByAI: true
        };
        
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    } else {
      shuffledPlayers.forEach((player, index) => {
        const targetIndex = (index + 1) % shuffledPlayers.length;
        const target = shuffledPlayers[targetIndex];
        const missionTemplate = missionTemplates[Math.floor(Math.random() * missionTemplates.length)];
        
        const missionId = Date.now().toString() + index;
        newMissions[missionId] = {
          id: missionId,
          playerId: player.id,
          targetId: target.id,
          mission: missionTemplate.replace('{target}', target.name),
          targetName: target.name,
          targetPhoto: target.photo,
          completed: false,
          validated: false,
          startedAt: Date.now(),
          generatedByAI: false
        };
      });
    }
    
    await update(ref(database, `games/${gameCode}`), {
      gameState: 'playing',
      missions: newMissions,
      startedAt: Date.now()
    });
    
    setIsGeneratingMissions(false);
    
    const startActivityId = Date.now().toString();
    const startMessage = {
      id: startActivityId,
      icon: '🚀',
      message: `Le jeu a commencé ! ${players.length} joueurs en compétition. Que le meilleur gagne ! 🏆`,
      timestamp: Date.now()
    };
    await set(ref(database, `games/${gameCode}/activityFeed/${startActivityId}`), startMessage);
  };

  const completeMission = async (missionId) => {
    const mission = missions.find(m => m.id === missionId);
    if (!mission) return;

    const confirmationId = Date.now().toString();
    const confirmation = {
      id: confirmationId,
      missionId,
      hunterId: mission.playerId,
      targetId: mission.targetId,
      mission: mission.mission,
      targetName: mission.targetName,
      timestamp: Date.now()
    };

    await set(ref(database, `games/${gameCode}/confirmations/${confirmationId}`), confirmation);
    
    setWaitingForValidation(true);
    setMissionVisible(false);
  };

  const validateMission = async (confirmationId, approved) => {
    const confirmation = pendingConfirmations.find(c => c.id === confirmationId);
    if (!confirmation) return;

    if (approved) {
      const hunter = players.find(p => p.id === confirmation.hunterId);
      const target = players.find(p => p.id === confirmation.targetId);
      const mission = missions.find(m => m.id === confirmation.missionId);
      
      const timeBonus = mission ? calculateTimeBonus(mission.startedAt) : 0;
      const totalHunterPoints = 10 + timeBonus;
      
      const trapPenalty = mission ? calculateTrapPenalty(mission.startedAt) : 5;
      
      if (hunter) {
        await update(ref(database, `games/${gameCode}/players/${hunter.id}`), {
          points: hunter.points + totalHunterPoints,
          successful: hunter.successful + 1,
          lastBonus: timeBonus
        });
      }
      
      if (target) {
        await update(ref(database, `games/${gameCode}/players/${target.id}`), {
          points: Math.max(0, target.points - trapPenalty),
          trapped: target.trapped + 1,
          lastPenalty: trapPenalty
        });
      }

      if (hunter && target && mission) {
        const activityId = Date.now().toString();
        const activityMessage = {
          id: activityId,
          icon: '🎯',
          message: `${hunter.name} a piégé ${target.name} ! Mission : ${mission.mission}`,
          timestamp: Date.now(),
          hunterName: hunter.name,
          targetName: target.name,
          mission: mission.mission,
          points: totalHunterPoints
        };
        await set(ref(database, `games/${gameCode}/activityFeed/${activityId}`), activityMessage);
      }

      const availableTargets = players.filter(p => 
        p.id !== confirmation.hunterId && p.id !== confirmation.targetId
      );
      const newTarget = availableTargets[Math.floor(Math.random() * availableTargets.length)];
      
      if (newTarget) {
        let newMissionText;
        
        if (useAI) {
          const hunterMissions = missions
            .filter(m => m.playerId === confirmation.hunterId)
            .map(m => m.mission);
          
          newMissionText = await generateMissionWithAI(newTarget.name, hunterMissions);
        } else {
          const newMissionTemplate = missionTemplates[Math.floor(Math.random() * missionTemplates.length)];
          newMissionText = newMissionTemplate.replace('{target}', newTarget.name);
        }
        
        await update(ref(database, `games/${gameCode}/missions/${confirmation.missionId}`), {
          validated: true,
          targetId: newTarget.id,
          targetName: newTarget.name,
          targetPhoto: newTarget.photo,
          mission: newMissionText,
          completed: false,
          startedAt: Date.now(),
          generatedByAI: useAI
        });
      }
    }

    await remove(ref(database, `games/${gameCode}/confirmations/${confirmationId}`));
  };

  const resetGame = async () => {
    if (!confirm('Réinitialiser la partie ? Tous les joueurs seront déconnectés.')) return;
    
    if (gameCode) {
      await remove(ref(database, `games/${gameCode}`));
    }
    
    localStorage.clear();
    window.location.reload();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <RefreshCw className="w-20 h-20 text-white animate-spin mx-auto mb-6" />
            <div className="absolute inset-0 w-20 h-20 bg-white/20 rounded-full blur-xl mx-auto animate-pulse"></div>
          </div>
          <div className="text-white text-3xl font-bold animate-pulse">Chargement...</div>
        </div>
      </div>
    );
  }

  const JoinView = () => {
    const [name, setName] = useState('');
    const [photo, setPhoto] = useState('');
    const [code, setCode] = useState('');

    const handlePhotoUpload = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => setPhoto(reader.result);
        reader.readAsDataURL(file);
      }
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `
            linear-gradient(rgba(139, 92, 246, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139, 92, 246, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}></div>

        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-pink-400/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-cyan-400/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>

        <div className="max-w-lg mx-auto pt-8 relative z-10">
          <div className="bg-black/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border-2 border-purple-500/50 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/5 via-pink-600/5 to-cyan-600/5"></div>
            
            <div className="text-center mb-8 relative z-10">
              <div className="inline-block p-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl mb-4 shadow-lg shadow-purple-500/50 border border-purple-400/50">
                <Target className="w-16 h-16 text-white" />
              </div>
              <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 mb-2 animate-pulse">
                Mission Game
              </h1>
              <p className="text-purple-300 text-lg font-medium">Piégez vos collègues avec style !</p>
            </div>

            <div className="space-y-6 relative z-10">
              <button
                onClick={createGame}
                className="group w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-5 rounded-2xl font-bold text-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-lg shadow-purple-500/50 hover:shadow-xl hover:shadow-purple-500/70 hover:scale-105 flex items-center justify-center gap-3 border border-purple-400/50"
              >
                <div className="p-2 bg-white/20 rounded-lg group-hover:rotate-12 transition-transform">
                  <Play className="w-6 h-6" />
                </div>
                Créer une partie
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t-2 border-purple-500/30"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="px-4 py-1 bg-black text-purple-400 font-bold text-sm rounded-full border border-purple-500/50">OU</span>
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-2xl p-6 space-y-4 border-2 border-purple-500/50 backdrop-blur-sm shadow-lg shadow-purple-500/20">
                <h3 className="font-bold text-purple-300 text-center text-xl flex items-center justify-center gap-2">
                  <Users className="w-5 h-5" />
                  Rejoindre une partie
                </h3>
                
                <input
                  type="text"
                  placeholder="CODE (ex: ABC123)"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-4 border-3 border-purple-500/50 bg-black/50 text-white rounded-xl focus:ring-4 focus:ring-purple-500/50 focus:border-purple-400 text-center text-2xl font-mono font-bold transition-all placeholder-purple-500/50"
                  maxLength={6}
                />
                
                <input
                  type="text"
                  placeholder="Votre nom (unique)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-4 border-2 border-purple-500/50 bg-black/50 text-white rounded-xl focus:ring-4 focus:ring-purple-500/50 focus:border-purple-400 transition-all placeholder-purple-500/50"
                />

                <div className="border-3 border-dashed border-purple-500/50 rounded-xl p-6 text-center bg-black/30 hover:bg-purple-900/20 transition-colors">
                  {photo ? (
                    <div className="relative inline-block">
                      <img src={photo} alt="Photo" className="w-32 h-32 rounded-full mx-auto object-cover border-4 border-purple-500/50 shadow-lg shadow-purple-500/50" />
                      <div className="absolute -bottom-2 -right-2 p-2 bg-green-500 rounded-full border-4 border-black shadow-lg shadow-green-500/50">
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="py-4">
                      <div className="inline-block p-4 bg-purple-500/20 rounded-full mb-3 border border-purple-400/50">
                        <Camera className="w-12 h-12 text-purple-400" />
                      </div>
                      <p className="text-purple-300 font-bold">Photo obligatoire</p>
                      <p className="text-sm text-purple-500 mt-1">Caméra ou Galerie</p>
                    </div>
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handlePhotoUpload} 
                    className="hidden" 
                    id="photo" 
                  />
                  <label htmlFor="photo" className="mt-4 inline-block bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 rounded-xl cursor-pointer hover:from-purple-700 hover:to-pink-700 font-bold transition-all hover:scale-105 shadow-md shadow-purple-500/50 border border-purple-400/50">
                    {photo ? '✓ Changer la photo' : '📷 Ajouter une photo'}
                  </label>
                </div>

                <button
                  onClick={() => code && name && photo && joinGame(code, name, photo)}
                  disabled={!code || !name || !photo}
                  className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white py-5 rounded-xl font-bold text-lg hover:from-cyan-700 hover:to-blue-700 transition-all duration-300 disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/50 hover:shadow-xl disabled:hover:shadow-lg hover:scale-105 disabled:hover:scale-100 disabled:opacity-50 border border-cyan-400/50"
                >
                  ✅ Rejoindre la partie !
                </button>
              </div>
            </div>

            <div className="mt-8 text-center relative z-10">
              <p className="text-xs text-purple-500">
                🔒 Sécurisé • ⚡ Temps réel • 🎯 100% Gratuit
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const QRCodeModal = () => {
    if (!showQRCode) return null;

    const gameUrl = typeof window !== 'undefined' ? window.location.origin : '';

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full transform animate-scaleIn">
          <div className="text-center mb-6">
            <div className="inline-block p-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl mb-4">
              <QrCode className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Scannez pour rejoindre !</h2>
            <p className="text-gray-600">Partagez ce QR code avec vos collègues</p>
          </div>
          
          <div className="bg-white p-6 rounded-2xl border-4 border-indigo-600 mb-6 shadow-lg">
            <QRCodeSVG value={gameUrl} size={256} className="mx-auto" level="H" />
          </div>

          <div className="text-center mb-6">
            <p className="text-gray-600 mb-2 font-semibold">Ou entrez le code :</p>
            <p className="text-5xl font-black font-mono text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text py-4">{gameCode}</p>
          </div>

          <button
            onClick={() => setShowQRCode(false)}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
          >
            Fermer
          </button>
        </div>
      </div>
    );
  };

  const AdminView = () => {
    if (showLeaderboard) {
      return <LeaderboardView />;
    }

    const playersNeeded = Math.max(0, 3 - players.length);

    return (
      <div className="min-h-screen h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4 relative overflow-hidden flex flex-col">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `
            linear-gradient(rgba(139, 92, 246, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139, 92, 246, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}></div>
        
        <div className="absolute top-20 left-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>

        <div className="w-full h-full relative z-10 flex flex-col">
          <div className="bg-black/80 backdrop-blur-xl rounded-3xl shadow-2xl p-6 mb-4 border border-purple-500/30 relative overflow-hidden flex-shrink-0">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-pink-600/10 to-cyan-600/10 animate-pulse"></div>
            
            <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
              <div className="flex-1 min-w-[300px]">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg shadow-lg shadow-purple-500/50">
                    <Trophy className="w-7 h-7 text-white" />
                  </div>
                  <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 animate-pulse">
                    Dashboard Organisateur
                  </h1>
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 backdrop-blur-sm rounded-xl px-5 py-2 border border-purple-500/50 shadow-lg shadow-purple-500/30">
                    <p className="text-xs text-purple-300 mb-1 font-bold">Code de la partie</p>
                    <p className="font-mono font-black text-3xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                      {gameCode}
                    </p>
                  </div>
                  <div className="text-xs text-cyan-400 flex items-center gap-2 bg-cyan-900/30 px-3 py-2 rounded-lg border border-cyan-500/30">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse shadow-lg shadow-cyan-400/50"></div>
                    Synchro temps réel
                  </div>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={toggleFullscreen} className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-2.5 rounded-xl font-bold hover:from-indigo-700 hover:to-purple-700 transition flex items-center gap-2 shadow-lg shadow-indigo-500/50 border border-indigo-400/50 text-sm">
                  {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                  {isFullscreen ? 'Quitter' : 'Plein écran'}
                </button>
                <button onClick={() => setShowQRCode(true)} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-5 py-2.5 rounded-xl font-bold hover:from-purple-700 hover:to-pink-700 transition flex items-center gap-2 shadow-lg shadow-purple-500/50 border border-purple-400/50 text-sm">
                  <QrCode className="w-4 h-4" />
                  QR Code
                </button>
                <button onClick={() => setShowLeaderboard(true)} className="bg-gradient-to-r from-yellow-600 to-orange-600 text-white px-5 py-2.5 rounded-xl font-bold hover:from-yellow-700 hover:to-orange-700 transition flex items-center gap-2 shadow-lg shadow-yellow-500/50 border border-yellow-400/50 text-sm">
                  <Trophy className="w-4 h-4" />
                  Scores
                </button>
                {gameState === 'lobby' && players.length >= 3 && (
                  <button 
                    onClick={startGame} 
                    disabled={isGeneratingMissions}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 animate-pulse flex items-center gap-2 shadow-lg shadow-green-500/50 text-base border border-green-400/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:animate-none"
                  >
                    {isGeneratingMissions ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        {useAI ? 'Génération IA...' : 'Démarrage...'}
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5" />
                        🚀 DÉMARRER
                      </>
                    )}
                  </button>
                )}
                <button onClick={leaveGame} className="bg-gray-800/80 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-gray-700 transition flex items-center gap-2 border border-gray-600/50 text-sm">
                  <LogOut className="w-4 h-4" />
                  Quitter
                </button>
                <button onClick={resetGame} className="bg-gradient-to-r from-red-600 to-pink-600 text-white px-5 py-2.5 rounded-xl font-bold hover:from-red-700 hover:to-pink-700 transition shadow-lg shadow-red-500/50 border border-red-400/50 text-sm">
                  Reset
                </button>
              </div>
            </div>
          </div>

          {gameState === 'lobby' && (
            <div className="bg-gradient-to-r from-cyan-900/60 to-blue-900/60 backdrop-blur-sm rounded-2xl shadow-lg p-5 mb-4 border border-cyan-500/50 shadow-cyan-500/30 flex-shrink-0">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-cyan-500/20 rounded-xl border border-cyan-400/50 shadow-lg shadow-cyan-500/50">
                    <span className="text-3xl">🤖</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-cyan-200 flex items-center gap-2">
                      Génération IA des missions
                      {useAI && <span className="text-xs bg-green-500/80 text-white px-2 py-1 rounded-full">Activé</span>}
                    </h3>
                    <p className="text-sm text-cyan-300">
                      {useAI 
                        ? "✨ L'IA créera des missions uniques et variées pour chaque joueur" 
                        : "📋 Utilisation des missions prédéfinies (peut avoir des répétitions)"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setUseAI(!useAI)}
                  className={`px-6 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2 border-2 ${
                    useAI 
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-green-400/50 shadow-green-500/50' 
                      : 'bg-gray-700/80 hover:bg-gray-600 text-gray-300 border-gray-600/50 shadow-gray-500/50'
                  }`}
                >
                  {useAI ? '✓ IA Activée' : '○ IA Désactivée'}
                </button>
              </div>
            </div>
          )}

          {gameState === 'lobby' && players.length < 3 && (
            <div className="bg-gradient-to-r from-orange-900/80 to-red-900/80 backdrop-blur-sm rounded-2xl shadow-lg p-5 mb-4 border border-orange-500/50 shadow-orange-500/30 animate-pulse flex-shrink-0">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-500/20 rounded-xl border border-orange-400/50 shadow-lg shadow-orange-500/50">
                  <Clock className="w-10 h-10 text-orange-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-orange-200">⏳ En attente de joueurs...</h3>
                  <p className="text-lg text-orange-300">
                    {playersNeeded === 3 && "Attendez que 3 joueurs rejoignent la partie"}
                    {playersNeeded === 2 && "Encore 2 joueurs nécessaires pour démarrer"}
                    {playersNeeded === 1 && "Plus qu'1 joueur ! On y est presque ! 🎉"}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 flex-shrink-0">
            <div className="bg-black/60 backdrop-blur-sm rounded-2xl shadow-lg p-5 border-2 border-pink-500/50 hover:border-pink-400 transition-all hover:shadow-2xl hover:shadow-pink-500/50 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-pink-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative z-10 flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-xl border border-pink-400/50 shadow-lg shadow-pink-500/30">
                  <Users className="w-7 h-7 text-pink-400" />
                </div>
                <div>
                  <p className="text-4xl font-black text-pink-400">{players.length}</p>
                  <p className="text-pink-300 font-semibold text-sm">Joueurs inscrits</p>
                  {players.length < 3 && (
                    <p className="text-xs text-orange-400 font-bold mt-1">Min: 3 joueurs</p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-black/60 backdrop-blur-sm rounded-2xl shadow-lg p-5 border-2 border-cyan-500/50 hover:border-cyan-400 transition-all hover:shadow-2xl hover:shadow-cyan-500/50 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative z-10 flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl border border-cyan-400/50 shadow-lg shadow-cyan-500/30">
                  <CheckCircle className="w-7 h-7 text-cyan-400" />
                </div>
                <div>
                  <p className="text-4xl font-black text-cyan-400">{missions.filter(m => m.validated).length}</p>
                  <p className="text-cyan-300 font-semibold text-sm">Missions validées</p>
                </div>
              </div>
            </div>

            <div className="bg-black/60 backdrop-blur-sm rounded-2xl shadow-lg p-5 border-2 border-orange-500/50 hover:border-orange-400 transition-all hover:shadow-2xl hover:shadow-orange-500/50 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative z-10 flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-xl border border-orange-400/50 shadow-lg shadow-orange-500/30">
                  <Target className="w-7 h-7 text-orange-400" />
                </div>
                <div>
                  <p className="text-4xl font-black text-orange-400">{pendingConfirmations.length}</p>
                  <p className="text-orange-300 font-semibold text-sm">En attente</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-black/60 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-purple-500/30 flex-1 flex flex-col min-h-0">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-3 text-purple-300 flex-shrink-0">
              <Users className="w-6 h-6 text-purple-400" />
              Joueurs inscrits ({players.length})
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 overflow-y-auto flex-1">
              {players.map(player => (
                <div key={player.id} className="group relative bg-gray-900/60 border-2 border-gray-700/50 hover:border-purple-500/50 rounded-2xl p-3 flex flex-col items-center gap-2 hover:shadow-lg hover:shadow-purple-500/30 transition-all duration-300 h-fit">
                  <button
                    onClick={() => removePlayer(player.id)}
                    className="absolute top-2 right-2 bg-red-500/80 text-white p-1 rounded-full hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100 shadow-lg border border-red-400/50"
                    title="Supprimer ce joueur"
                  >
                    <XCircle className="w-3 h-3" />
                  </button>
                  
                  <div className="relative flex-shrink-0">
                    <img src={player.photo} alt={player.name} className="w-16 h-16 rounded-full object-cover ring-4 ring-purple-500/50 group-hover:ring-pink-500/50 transition-all shadow-lg" />
                    <div className="absolute -bottom-1 -right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-gray-900 shadow-lg shadow-green-500/50"></div>
                  </div>
                  <div className="flex-1 text-center w-full">
                    <h3 className="font-bold text-gray-100 text-sm truncate">{player.name}</h3>
                    <p className="text-purple-400 font-semibold text-xs">🏆 {player.points} pts</p>
                    <p className="text-xs text-gray-400">✅ {player.successful} • ❌ {player.trapped}</p>
                  </div>
                </div>
              ))}
            </div>
            {players.length === 0 && (
              <div className="text-center py-12 bg-gradient-to-r from-purple-900/20 to-pink-900/20 rounded-2xl border border-purple-500/30 flex-1 flex flex-col items-center justify-center">
                <Users className="w-16 h-16 text-purple-500/30 mb-4" />
                <p className="text-purple-400 text-lg font-semibold">En attente des joueurs...</p>
                <p className="text-purple-500 mt-2 text-sm">Partagez le QR code pour commencer !</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const PlayerView = () => {
    if (showLeaderboard) {
      return <LeaderboardView />;
    }

    const myMission = missions.find(m => m.playerId === currentPlayer?.id && !m.completed);
    const myConfirmations = pendingConfirmations.filter(c => c.targetId === currentPlayer?.id);
    const player = players.find(p => p.id === currentPlayer?.id);

    if (!player) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 text-center shadow-2xl">
            <XCircle className="w-20 h-20 text-red-500 mx-auto mb-4" />
            <p className="text-gray-800 text-xl font-bold mb-4">Erreur: Joueur non trouvé</p>
            <button onClick={leaveGame} className="bg-red-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-red-700 transition">
              Retour à l'accueil
            </button>
          </div>
        </div>
      );
    }

    const playersNeeded = Math.max(0, 3 - players.length);

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-4">
        <div className="max-w-2xl mx-auto pt-4">
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-6 mb-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <img src={player.photo} alt={player.name} className="w-24 h-24 rounded-full object-cover ring-4 ring-indigo-600 shadow-lg" />
                <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-indigo-600 to-purple-600 px-3 py-1 rounded-full text-white font-bold text-sm">
                  #{players.sort((a, b) => b.points - a.points).findIndex(p => p.id === player.id) + 1}
                </div>
                <div className="absolute -top-2 -left-2 bg-green-500 w-4 h-4 rounded-full border-2 border-white animate-pulse"></div>
              </div>
              <div className="flex-1">
                <h2 className="text-3xl font-black text-gray-800 mb-1">{player.name}</h2>
                <div className="flex gap-4 text-sm flex-wrap">
                  <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-bold">
                    🏆 {player.points} pts
                    {player.lastBonus > 0 && (
                      <span className="text-green-600 ml-1">+{player.lastBonus}</span>
                    )}
                  </span>
                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold">✅ {player.successful}</span>
                  <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full font-bold">
                    ❌ {player.trapped}
                    {player.lastPenalty > 0 && (
                      <span className="text-red-600 ml-1">-{player.lastPenalty}</span>
                    )}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={() => setShowLeaderboard(true)} className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white p-3 rounded-xl font-semibold hover:from-yellow-500 hover:to-orange-600 transition shadow-lg">
                  <Trophy className="w-5 h-5" />
                </button>
                <button onClick={leaveGame} className="bg-red-500 text-white p-3 rounded-xl font-semibold hover:bg-red-600 transition shadow-lg">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {gameState === 'lobby' && (
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 mb-4 text-center">
              <div className="inline-block p-4 bg-gradient-to-r from-orange-400 to-red-500 rounded-2xl mb-4 animate-pulse">
                <Clock className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">⏳ En attente...</h3>
              {playersNeeded > 0 ? (
                <>
                  <p className="text-gray-600 text-lg mb-2">
                    L'organisateur attend encore <span className="font-bold text-orange-600">{playersNeeded}</span> joueur{playersNeeded > 1 ? 's' : ''}
                  </p>
                  <p className="text-sm text-gray-500">Minimum 3 joueurs pour démarrer</p>
                </>
              ) : (
                <>
                  <p className="text-green-600 text-lg font-bold mb-2">
                    ✅ Tous les joueurs sont là !
                  </p>
                  <p className="text-gray-600">L'organisateur va lancer le jeu...</p>
                </>
              )}
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                Connexion temps réel
              </div>
            </div>
          )}

          {gameState === 'playing' && myMission && (
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-6 mb-4">
              <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg">
                  <Target className="w-6 h-6 text-white" />
                </div>
                Votre mission
              </h3>
              
              {waitingForValidation ? (
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl p-8 border-3 border-yellow-400 text-center animate-pulse">
                  <div className="mb-6">
                    <div className="inline-block p-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full mb-4">
                      <Clock className="w-16 h-16 text-white animate-spin" style={{animationDuration: '3s'}} />
                    </div>
                    <h4 className="text-3xl font-black text-gray-800 mb-3">⏳ En attente de validation</h4>
                    <p className="text-xl text-gray-700 mb-2">
                      <span className="font-bold text-orange-600">{myMission.targetName}</span> doit confirmer que vous l'avez piégé(e)
                    </p>
                    <p className="text-gray-600">Patience... 😊</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-lg border-2 border-yellow-300">
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                      <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                      Synchronisation en temps réel
                    </div>
                  </div>
                </div>
              ) : !missionVisible ? (
                <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-12 border-3 border-indigo-300 text-center">
                  <div className="mb-6">
                    <div className="inline-block p-6 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full mb-4">
                      <Target className="w-16 h-16 text-white" />
                    </div>
                    <h4 className="text-3xl font-black text-gray-800 mb-2">Mission secrète 🤫</h4>
                    <p className="text-gray-600 text-lg">Votre mission vous attend...</p>
                  </div>
                  <button
                    onClick={() => setMissionVisible(true)}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-12 py-5 rounded-xl font-bold text-xl hover:from-indigo-700 hover:to-purple-700 transition shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center gap-3 mx-auto"
                  >
                    👁️ Voir ma mission
                  </button>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-6 border-3 border-indigo-300">
                  <div className="flex items-center gap-4 mb-4">
                    <img src={myMission.targetPhoto} alt={myMission.targetName} className="w-28 h-28 rounded-full object-cover ring-4 ring-white shadow-xl" />
                    <div>
                      <p className="text-sm text-gray-600 font-semibold mb-1">🎯 Votre cible:</p>
                      <p className="text-3xl font-black text-gray-800">{myMission.targetName}</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-5 mb-4 shadow-lg border-2 border-indigo-200">
                    <p className="text-sm text-gray-600 font-semibold mb-2">📝 Votre mission:</p>
                    <p className="text-xl font-bold text-gray-800">{myMission.mission}</p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setMissionVisible(false)}
                      className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition"
                    >
                      🙈 Cacher
                    </button>
                    <button
                      onClick={() => completeMission(myMission.id)}
                      className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 rounded-xl font-bold text-lg hover:from-green-600 hover:to-emerald-700 transition shadow-lg hover:shadow-xl hover:scale-105"
                    >
                      ✅ J'ai piégé ma cible !
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {myConfirmations.length > 0 && (
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-6 mb-4">
              <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                ⚠️ Confirmations requises
                <span className="bg-orange-500 text-white text-sm px-3 py-1 rounded-full animate-pulse">{myConfirmations.length}</span>
              </h3>
              {myConfirmations.map(conf => {
                const hunter = players.find(p => p.id === conf.hunterId);
                return (
                  <div key={conf.id} className="bg-gradient-to-r from-orange-50 to-red-50 border-3 border-orange-400 rounded-2xl p-5 mb-4 animate-pulse shadow-lg">
                    <div className="flex items-center gap-3 mb-4">
                      <img src={hunter?.photo} className="w-16 h-16 rounded-full object-cover ring-4 ring-orange-400" />
                      <div className="flex-1">
                        <p className="text-xl font-bold text-gray-800">{hunter?.name}</p>
                        <p className="text-gray-600 font-semibold">prétend vous avoir piégé</p>
                      </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 mb-4 border-2 border-orange-300">
                      <p className="text-sm text-gray-600 font-semibold mb-1">Mission:</p>
                      <p className="text-gray-800 font-bold">{conf.mission}</p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => validateMission(conf.id, true)}
                        className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 transition flex items-center justify-center gap-2 shadow-lg"
                      >
                        <CheckCircle className="w-6 h-6" />
                        OUI, c'est vrai
                      </button>
                      <button
                        onClick={() => validateMission(conf.id, false)}
                        className="flex-1 bg-gradient-to-r from-red-500 to-pink-600 text-white py-4 rounded-xl font-bold hover:from-red-600 hover:to-pink-700 transition flex items-center justify-center gap-2 shadow-lg"
                      >
                        <XCircle className="w-6 h-6" />
                        NON, c'est faux
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const LeaderboardView = () => {
    const sortedPlayers = [...players].sort((a, b) => b.points - a.points);

    return (
      <div className="min-h-screen h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4 relative overflow-hidden flex flex-col">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `
            linear-gradient(rgba(139, 92, 246, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139, 92, 246, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}></div>

        <div className="absolute top-20 left-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>

        <div className="w-full h-full relative z-10 flex flex-col">
          <div className="bg-black/80 backdrop-blur-xl rounded-3xl shadow-2xl p-6 mb-4 border border-purple-500/30 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg shadow-lg shadow-yellow-500/50">
                  <Trophy className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 animate-pulse">
                    🏆 Tableau de Bord Live
                  </h1>
                  <p className="text-cyan-400 text-sm flex items-center gap-2">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse shadow-lg shadow-cyan-400/50"></div>
                    Mise à jour en temps réel
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowLeaderboard(false)}
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl font-bold hover:from-purple-700 hover:to-pink-700 transition flex items-center gap-2 shadow-lg shadow-purple-500/50 border border-purple-400/50"
              >
                <ArrowLeft className="w-5 h-5" />
                Retour
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
            <div className="bg-black/60 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-purple-500/30 flex flex-col min-h-0">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-3 text-purple-300 flex-shrink-0">
                <Trophy className="w-7 h-7 text-yellow-400" />
                Classement des Joueurs
              </h2>
              <div className="space-y-3 overflow-y-auto flex-1">
                {sortedPlayers.map((player, index) => {
                  const isTop3 = index < 3;
                  const medals = ['🥇', '🥈', '🥉'];
                  const borderColors = [
                    'border-yellow-500/70 shadow-yellow-500/50',
                    'border-gray-400/70 shadow-gray-400/50',
                    'border-orange-600/70 shadow-orange-600/50'
                  ];
                  const bgColors = [
                    'from-yellow-900/40 to-orange-900/40',
                    'from-gray-800/40 to-gray-700/40',
                    'from-orange-900/40 to-red-900/40'
                  ];

                  return (
                    <div
                      key={player.id}
                      className={`bg-gradient-to-r ${isTop3 ? bgColors[index] : 'from-gray-900/60 to-gray-800/60'} backdrop-blur-sm rounded-2xl p-4 border-2 ${isTop3 ? borderColors[index] : 'border-gray-700/50'} hover:border-purple-500/50 transition-all shadow-lg hover:shadow-xl`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-4xl font-black flex-shrink-0 w-12 text-center">
                          {isTop3 ? medals[index] : `${index + 1}`}
                        </div>
                        <div className="relative flex-shrink-0">
                          <img
                            src={player.photo}
                            alt={player.name}
                            className={`w-16 h-16 rounded-full object-cover ring-4 ${isTop3 ? 'ring-yellow-500/70' : 'ring-purple-500/50'} shadow-lg`}
                          />
                          <div className="absolute -bottom-1 -right-1 bg-green-500 w-5 h-5 rounded-full border-2 border-gray-900 shadow-lg shadow-green-500/50"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-100 text-xl truncate">{player.name}</h3>
                          <div className="flex items-center gap-3 mt-1">
                            <span className={`font-black text-2xl ${isTop3 ? 'text-yellow-400' : 'text-purple-400'}`}>
                              🏆 {player.points} pts
                            </span>
                            {player.lastBonus > 0 && (
                              <span className="text-green-400 font-bold text-sm">+{player.lastBonus}</span>
                            )}
                          </div>
                          <div className="flex gap-3 text-sm mt-1">
                            <span className="text-green-400">✅ {player.successful} réussies</span>
                            <span className="text-red-400">❌ {player.trapped} piégé(e)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-black/60 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-cyan-500/30 flex flex-col min-h-0">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-3 text-cyan-300 flex-shrink-0">
                <div className="relative">
                  <div className="w-7 h-7 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/50">
                    <span className="text-white text-lg">💬</span>
                  </div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50"></div>
                </div>
                Feed d'Activité
              </h2>
              <div className="space-y-2 overflow-y-auto flex-1">
                {activityFeed.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <div className="text-6xl mb-4">🎮</div>
                    <p className="text-lg">Aucune activité pour le moment...</p>
                    <p className="text-sm mt-2">Les actions apparaîtront ici en temps réel !</p>
                  </div>
                ) : (
                  activityFeed.map((activity, index) => {
                    const isRecent = index === 0;
                    return (
                      <div
                        key={activity.id || index}
                        className={`bg-gradient-to-r from-cyan-900/30 to-blue-900/30 backdrop-blur-sm rounded-xl p-4 border ${isRecent ? 'border-cyan-400/70 shadow-lg shadow-cyan-500/30 animate-pulse' : 'border-cyan-700/50'} transition-all`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="text-2xl flex-shrink-0">{activity.icon || '🎯'}</div>
                          <div className="flex-1">
                            <p className="text-gray-200 leading-relaxed">{activity.message}</p>
                            <p className="text-xs text-cyan-400 mt-1">
                              {new Date(activity.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }
      `}</style>
      {showQRCode && <QRCodeModal />}
      {myRole === null && <JoinView />}
      {myRole === 'admin' && <AdminView />}
      {myRole === 'player' && <PlayerView />}
    </>
  );
}
