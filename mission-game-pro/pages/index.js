import { useState, useEffect } from 'react';
import { database } from '../lib/firebase';
import { ref, onValue, set, update, remove } from 'firebase/database';
import { QRCodeSVG } from 'qrcode.react';
import { Camera, Users, Target, Trophy, CheckCircle, XCircle, Play, QrCode, ArrowLeft, RefreshCw } from 'lucide-react';

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
    
    onValue(gameRef, (snapshot) => {
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
    });
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
      
      const newPlayer = {
        id: Date.now().toString(),
        name,
        photo: photoUrl,
        points: 0,
        trapped: 0,
        successful: 0
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

  const startGame = async () => {
    if (players.length < 3) {
      alert('Minimum 3 joueurs requis !');
      return;
    }

    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    const newMissions = {};
    
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
        validated: false
      };
    });
    
    await update(ref(database, `games/${gameCode}`), {
      gameState: 'playing',
      missions: newMissions
    });
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
      timestamp: Date.now()
    };

    await set(ref(database, `games/${gameCode}/confirmations/${confirmationId}`), confirmation);
  };

  const validateMission = async (confirmationId, approved) => {
    const confirmation = pendingConfirmations.find(c => c.id === confirmationId);
    if (!confirmation) return;

    if (approved) {
      // Mettre à jour les points
      const hunter = players.find(p => p.id === confirmation.hunterId);
      const target = players.find(p => p.id === confirmation.targetId);
      
      if (hunter) {
        await update(ref(database, `games/${gameCode}/players/${hunter.id}`), {
          points: hunter.points + 10,
          successful: hunter.successful + 1
        });
      }
      
      if (target) {
        await update(ref(database, `games/${gameCode}/players/${target.id}`), {
          points: Math.max(0, target.points - 5),
          trapped: target.trapped + 1
        });
      }

      // Nouvelle mission
      const availableTargets = players.filter(p => 
        p.id !== confirmation.hunterId && p.id !== confirmation.targetId
      );
      const newTarget = availableTargets[Math.floor(Math.random() * availableTargets.length)];
      
      if (newTarget) {
        const newMissionTemplate = missionTemplates[Math.floor(Math.random() * missionTemplates.length)];
        await update(ref(database, `games/${gameCode}/missions/${confirmation.missionId}`), {
          validated: true,
          targetId: newTarget.id,
          targetName: newTarget.name,
          targetPhoto: newTarget.photo,
          mission: newMissionTemplate.replace('{target}', newTarget.name),
          completed: false
        });
      }
    }

    // Supprimer la confirmation
    await remove(ref(database, `games/${gameCode}/confirmations/${confirmationId}`));
  };

  const resetGame = async () => {
    if (!confirm('Réinitialiser la partie ?')) return;
    
    if (gameCode) {
      await remove(ref(database, `games/${gameCode}`));
    }
    
    localStorage.clear();
    window.location.reload();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-16 h-16 text-white animate-spin mx-auto mb-4" />
          <div className="text-white text-2xl">Chargement...</div>
        </div>
      </div>
    );
  }

  // PAGE D'ACCUEIL
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
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 p-4">
        <div className="max-w-lg mx-auto pt-8">
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🎯</div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">Mission Game</h1>
              <p className="text-gray-600 text-lg">Piégez vos collègues avec des missions !</p>
            </div>

            <div className="space-y-6">
              <button
                onClick={createGame}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-5 rounded-2xl font-bold text-xl hover:from-purple-700 hover:to-pink-700 transition shadow-lg flex items-center justify-center gap-3"
              >
                <Play className="w-6 h-6" />
                Créer une partie (Organisateur)
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t-2 border-gray-300"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="px-4 py-1 bg-white text-gray-500 font-semibold">OU</span>
                </div>
              </div>

              <div className="bg-blue-50 rounded-2xl p-6 space-y-4">
                <h3 className="font-bold text-blue-900 text-center text-xl">Rejoindre une partie</h3>
                
                <input
                  type="text"
                  placeholder="CODE (ex: ABC123)"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-4 border-2 border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-600 text-center text-2xl font-mono font-bold"
                  maxLength={6}
                />
                
                <input
                  type="text"
                  placeholder="Votre nom"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-600"
                />

                <div className="border-2 border-dashed border-blue-300 rounded-xl p-4 text-center bg-white">
                  {photo ? (
                    <img src={photo} alt="Photo" className="w-32 h-32 rounded-full mx-auto object-cover border-4 border-blue-300" />
                  ) : (
                    <div className="py-4">
                      <Camera className="w-16 h-16 text-blue-400 mx-auto mb-2" />
                      <p className="text-blue-700 font-semibold">Photo requise</p>
                    </div>
                  )}
                  <input type="file" accept="image/*" capture="user" onChange={handlePhotoUpload} className="hidden" id="photo" />
                  <label htmlFor="photo" className="mt-3 inline-block bg-blue-600 text-white px-6 py-3 rounded-lg cursor-pointer hover:bg-blue-700 font-bold">
                    {photo ? '✓ Changer' : '📷 Prendre une photo'}
                  </label>
                </div>

                <button
                  onClick={() => code && name && photo && joinGame(code, name, photo)}
                  disabled={!code || !name || !photo}
                  className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition disabled:bg-gray-300"
                >
                  ✅ Rejoindre la partie !
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // QR CODE MODAL
  const QRCodeModal = () => {
    if (!showQRCode) return null;

    const gameUrl = typeof window !== 'undefined' ? window.location.origin : '';

    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Scannez pour rejoindre !</h2>
          
          <div className="bg-white p-6 rounded-2xl border-4 border-purple-600 mb-6">
            <QRCodeSVG value={gameUrl} size={256} className="mx-auto" level="H" />
          </div>

          <div className="text-center mb-6">
            <p className="text-gray-600 mb-2">Ou entrez le code :</p>
            <p className="text-5xl font-bold font-mono text-purple-600 bg-purple-100 py-4 rounded-xl">{gameCode}</p>
          </div>

          <button
            onClick={() => setShowQRCode(false)}
            className="w-full bg-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-purple-700 transition"
          >
            Fermer
          </button>
        </div>
      </div>
    );
  };

  // DASHBOARD ADMIN
  const AdminView = () => {
    if (showLeaderboard) {
      const sortedPlayers = [...players].sort((a, b) => b.points - a.points);

      return (
        <div className="min-h-screen bg-gradient-to-br from-yellow-400 to-orange-500 p-4">
          <div className="max-w-4xl mx-auto pt-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-4xl font-bold text-gray-800 flex items-center gap-3">
                  <Trophy className="w-10 h-10 text-yellow-500" />
                  Classement
                </h1>
                <button onClick={() => setShowLeaderboard(false)} className="bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-bold">
                  Retour
                </button>
              </div>

              <div className="space-y-4">
                {sortedPlayers.map((player, index) => (
                  <div
                    key={player.id}
                    className={`flex items-center gap-6 p-6 rounded-xl ${
                      index === 0 ? 'bg-gradient-to-r from-yellow-100 to-yellow-50 border-4 border-yellow-400 scale-105' :
                      index === 1 ? 'bg-gradient-to-r from-gray-100 to-gray-50 border-4 border-gray-400' :
                      index === 2 ? 'bg-gradient-to-r from-orange-100 to-orange-50 border-4 border-orange-400' :
                      'bg-gray-50 border-2 border-gray-200'
                    }`}
                  >
                    <div className="text-4xl font-bold w-16 text-center">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                    </div>
                    <img src={player.photo} alt={player.name} className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg" />
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-gray-800">{player.name}</h3>
                      <div className="flex gap-4 mt-2">
                        <span className="bg-white px-3 py-1 rounded-full text-sm">
                          🏆 <span className="font-bold text-purple-600">{player.points}</span> pts
                        </span>
                        <span className="bg-white px-3 py-1 rounded-full text-sm">
                          ✅ <span className="font-bold text-green-600">{player.successful}</span>
                        </span>
                        <span className="bg-white px-3 py-1 rounded-full text-sm">
                          ❌ <span className="font-bold text-red-600">{player.trapped}</span>
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-5xl font-bold text-purple-600">{player.points}</div>
                      <div className="text-sm text-gray-500">points</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Dashboard Organisateur</h1>
                <p className="text-gray-600 mt-2">Code: <span className="font-mono font-bold text-3xl text-purple-600 bg-purple-100 px-4 py-1 rounded-lg">{gameCode}</span></p>
                <p className="text-xs text-gray-400 mt-2">⚡ Synchronisation en temps réel</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowQRCode(true)} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 flex items-center gap-2">
                  <QrCode className="w-5 h-5" />
                  QR Code
                </button>
                <button onClick={() => setShowLeaderboard(true)} className="bg-yellow-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-yellow-600 flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  Scores
                </button>
                {gameState === 'lobby' && players.length >= 3 && (
                  <button onClick={startGame} className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 animate-pulse flex items-center gap-2">
                    <Play className="w-5 h-5" />
                    Démarrer
                  </button>
                )}
                <button onClick={resetGame} className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700">Reset</button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-purple-50 p-4 rounded-xl">
                <Users className="w-8 h-8 text-purple-600 mb-2" />
                <p className="text-2xl font-bold">{players.length}</p>
                <p className="text-gray-600">Joueurs</p>
              </div>
              <div className="bg-green-50 p-4 rounded-xl">
                <CheckCircle className="w-8 h-8 text-green-600 mb-2" />
                <p className="text-2xl font-bold">{missions.filter(m => m.validated).length}</p>
                <p className="text-gray-600">Validées</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-xl">
                <Target className="w-8 h-8 text-orange-600 mb-2" />
                <p className="text-2xl font-bold">{pendingConfirmations.length}</p>
                <p className="text-gray-600">En attente</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Joueurs inscrits</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {players.map(player => (
                <div key={player.id} className="border-2 border-gray-200 rounded-xl p-4 flex items-center gap-4 hover:border-purple-400 transition">
                  <img src={player.photo} alt={player.name} className="w-16 h-16 rounded-full object-cover" />
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800">{player.name}</h3>
                    <p className="text-sm text-gray-600">{player.points} pts</p>
                    <p className="text-xs text-gray-500">✅ {player.successful} | ❌ {player.trapped}</p>
                  </div>
                </div>
              ))}
            </div>
            {players.length === 0 && (
              <p className="text-center text-gray-500 py-8">En attente des joueurs... Partagez le QR code !</p>
            )}
            {players.length > 0 && players.length < 3 && (
              <p className="text-center text-blue-600 mt-4 font-semibold">Encore {3 - players.length} joueur(s) minimum</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // VUE JOUEUR
  const PlayerView = () => {
    if (showLeaderboard) {
      const sortedPlayers = [...players].sort((a, b) => b.points - a.points);

      return (
        <div className="min-h-screen bg-gradient-to-br from-yellow-400 to-orange-500 p-4">
          <div className="max-w-4xl mx-auto pt-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-4xl font-bold text-gray-800 flex items-center gap-3">
                  <Trophy className="w-10 h-10 text-yellow-500" />
                  Classement
                </h1>
                <button onClick={() => setShowLeaderboard(false)} className="bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-bold">
                  Retour
                </button>
              </div>

              <div className="space-y-4">
                {sortedPlayers.map((player, index) => (
                  <div
                    key={player.id}
                    className={`flex items-center gap-6 p-6 rounded-xl ${
                      index === 0 ? 'bg-gradient-to-r from-yellow-100 to-yellow-50 border-4 border-yellow-400 scale-105' :
                      index === 1 ? 'bg-gradient-to-r from-gray-100 to-gray-50 border-4 border-gray-400' :
                      index === 2 ? 'bg-gradient-to-r from-orange-100 to-orange-50 border-4 border-orange-400' :
                      'bg-gray-50 border-2 border-gray-200'
                    }`}
                  >
                    <div className="text-4xl font-bold w-16 text-center">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                    </div>
                    <img src={player.photo} alt={player.name} className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg" />
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-gray-800">{player.name}</h3>
                      <div className="flex gap-4 mt-2 flex-wrap">
                        <span className="bg-white px-3 py-1 rounded-full text-sm">
                          🏆 <span className="font-bold text-purple-600">{player.points}</span> pts
                        </span>
                        <span className="bg-white px-3 py-1 rounded-full text-sm">
                          ✅ <span className="font-bold text-green-600">{player.successful}</span>
                        </span>
                        <span className="bg-white px-3 py-1 rounded-full text-sm">
                          ❌ <span className="font-bold text-red-600">{player.trapped}</span>
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-5xl font-bold text-purple-600">{player.points}</div>
                      <div className="text-sm text-gray-500">points</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    const myMission = missions.find(m => m.playerId === currentPlayer?.id && !m.completed);
    const myConfirmations = pendingConfirmations.filter(c => c.targetId === currentPlayer?.id);
    const player = players.find(p => p.id === currentPlayer?.id);

    if (!player) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 text-center">
            <p className="text-gray-800 mb-4">Erreur: Joueur non trouvé</p>
            <button onClick={resetGame} className="bg-red-600 text-white px-6 py-2 rounded-lg">Réinitialiser</button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 p-4">
        <div className="max-w-2xl mx-auto pt-4">
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
            <div className="flex items-center gap-4">
              <img src={player.photo} alt={player.name} className="w-20 h-20 rounded-full object-cover border-4 border-purple-600" />
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-800">{player.name}</h2>
                <div className="flex gap-4 text-sm text-gray-600">
                  <span>🏆 {player.points} pts</span>
                  <span>✅ {player.successful}</span>
                  <span>❌ {player.trapped}</span>
                </div>
              </div>
              <button onClick={() => setShowLeaderboard(true)} className="bg-purple-100 text-purple-600 px-4 py-2 rounded-lg font-semibold">
                Scores
              </button>
            </div>
          </div>

          {gameState === 'playing' && myMission && (
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                🎯 Votre mission
              </h3>
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border-2 border-purple-200">
                <div className="flex items-center gap-4 mb-4">
                  <img src={myMission.targetPhoto} alt={myMission.targetName} className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg" />
                  <div>
                    <p className="text-sm text-gray-600">Cible:</p>
                    <p className="text-2xl font-bold text-gray-800">{myMission.targetName}</p>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4 mb-4 shadow">
                  <p className="text-sm text-gray-600 mb-1">Mission:</p>
                  <p className="text-lg font-semibold text-gray-800">{myMission.mission}</p>
                </div>
                <button
                  onClick={() => completeMission(myMission.id)}
                  className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700"
                >
                  ✅ J'ai piégé ma cible !
                </button>
              </div>
            </div>
          )}

          {myConfirmations.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">⚠️ Confirmations</h3>
              {myConfirmations.map(conf => {
                const hunter = players.find(p => p.id === conf.hunterId);
                return (
                  <div key={conf.id} className="border-2 border-orange-400 rounded-xl p-4 bg-orange-50 mb-4 animate-pulse">
                    <div className="flex items-center gap-3 mb-3">
                      <img src={hunter?.photo} className="w-12 h-12 rounded-full object-cover border-2 border-orange-400" />
                      <div className="flex-1">
                        <p className="font-bold">{hunter?.name}</p>
                        <p className="text-sm text-gray-600">dit vous avoir piégé</p>
                      </div>
                    </div>
                    <p className="text-sm mb-4 bg-white p-3 rounded-lg border border-orange-200">{conf.mission}</p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => validateMission(conf.id, true)}
                        className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-5 h-5" />
                        OUI
                      </button>
                      <button
                        onClick={() => validateMission(conf.id, false)}
                        className="flex-1 bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 flex items-center justify-center gap-2"
                      >
                        <XCircle className="w-5 h-5" />
                        NON
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {gameState === 'lobby' && (
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <Target className="w-16 h-16 text-purple-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-800 mb-2">⏳ En attente</h3>
              <p className="text-gray-600">L'organisateur va lancer le jeu...</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ROUTER
  return (
    <>
      {showQRCode && <QRCodeModal />}
      {myRole === null && <JoinView />}
      {myRole === 'admin' && <AdminView />}
      {myRole === 'player' && <PlayerView />}
    </>
  );
}
