const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const os = require('os');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper to get local network IP for cross-device play (e.g. phones on same Wi-Fi)
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Look for IPv4 and non-internal (not 127.0.0.1)
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Network info endpoint
app.get('/api/info', (req, res) => {
  const port = process.env.PORT || 3000;
  const localIp = getLocalIpAddress();
  res.json({
    localIp,
    port,
    localUrl: `http://localhost:${port}`,
    networkUrl: `http://${localIp}:${port}`,
  });
});

// Rooms storage in-memory
const rooms = new Map();

function createInitialState(roomId, hostPlayer) {
  return {
    roomId,
    createdAt: Date.now(),
    started: false,
    currentRound: 1, // 1: Whispering Grove, 2: Romantic Dare, 3: Predict Our Future, 4: The Almost Confession, 5: The Horizon (Epilogue)
    currentTurnIndex: 0, // 0 for player 1, 1 for player 2
    activeCard: null,
    drawnCardIds: [],
    players: [hostPlayer], // array of player objects
    responses: {}, // { [cardId]: { [playerId]: text } }
    followUp: null, // { askingPlayerId, question, answer }
    predictions: {
      player0: [], // predictions about player 0
      player1: []  // predictions about player 1
    },
    confessions: {
      // [playerId]: { text, submitted: true }
    },
    confessionRevealed: false,
    reactions: [], // recent float reactions
    sparksScore: 20, // starts with initial curiosity sparks
    history: [] // log of memorable completed cards
  };
}

io.on('connection', (socket) => {
  let userRoomId = null;
  let userPlayerId = null;

  // Create Room
  socket.on('create_room', ({ playerName, avatar, archetype }, callback) => {
    const celestialWords = ['MOON', 'STAR', 'NOVA', 'ECHO', 'MIST', 'DAWN', 'ROSE', 'FERN', 'IRIS', 'DUSK'];
    const randomWord = celestialWords[Math.floor(Math.random() * celestialWords.length)];
    const randomNum = Math.floor(100 + Math.random() * 900);
    const roomId = `${randomWord}-${randomNum}`;

    const hostPlayer = {
      id: socket.id,
      index: 0,
      name: playerName || 'Player 1',
      avatar: avatar || '🌙',
      archetype: archetype || 'The Moonlit Wanderer',
      passTokens: 2,
      ready: true,
      isHost: true
    };

    const roomState = createInitialState(roomId, hostPlayer);
    rooms.set(roomId, roomState);

    userRoomId = roomId;
    userPlayerId = socket.id;
    socket.join(roomId);

    if (callback) {
      callback({
        success: true,
        roomId,
        player: hostPlayer,
        state: roomState
      });
    }
  });

  // Join Room
  socket.on('join_room', ({ roomId, playerName, avatar, archetype }, callback) => {
    const cleanRoomId = (roomId || '').trim().toUpperCase();
    const roomState = rooms.get(cleanRoomId);

    if (!roomState) {
      if (callback) callback({ success: false, message: 'Room not found. Check the code and try again.' });
      return;
    }

    if (roomState.players.length >= 2 && !roomState.players.some(p => p.id === socket.id)) {
      if (callback) callback({ success: false, message: 'This room already has two travelers.' });
      return;
    }

    // Check if player is rejoining or joining as second player
    let player = roomState.players.find(p => p.id === socket.id);
    if (!player) {
      player = {
        id: socket.id,
        index: roomState.players.length,
        name: playerName || 'Player 2',
        avatar: avatar || '✨',
        archetype: archetype || 'The Stargazer',
        passTokens: 2,
        ready: true,
        isHost: false
      };
      roomState.players.push(player);
    } else {
      player.name = playerName || player.name;
      player.avatar = avatar || player.avatar;
      player.archetype = archetype || player.archetype;
    }

    userRoomId = cleanRoomId;
    userPlayerId = socket.id;
    socket.join(cleanRoomId);

    // Notify room of updated state
    io.to(cleanRoomId).emit('room_updated', roomState);

    if (callback) {
      callback({
        success: true,
        roomId: cleanRoomId,
        player,
        state: roomState
      });
    }
  });

  // Start Journey
  socket.on('start_journey', ({ roomId }) => {
    const roomState = rooms.get(roomId);
    if (roomState) {
      roomState.started = true;
      roomState.sparksScore += 10;
      io.to(roomId).emit('room_updated', roomState);
      io.to(roomId).emit('journey_started');
    }
  });

  // Draw Card
  socket.on('draw_card', ({ roomId, card, round }) => {
    const roomState = rooms.get(roomId);
    if (roomState) {
      roomState.activeCard = card;
      if (round) roomState.currentRound = round;
      if (card && card.id && !roomState.drawnCardIds.includes(card.id)) {
        roomState.drawnCardIds.push(card.id);
      }
      // Reset responses & follow-up for this card
      roomState.responses[card.id] = {};
      roomState.followUp = null;
      roomState.sparksScore = Math.min(100, roomState.sparksScore + 4);

      io.to(roomId).emit('room_updated', roomState);
      io.to(roomId).emit('card_drawn', { card, drawnBy: socket.id });
    }
  });

  // Submit Answer / Response
  socket.on('submit_answer', ({ roomId, cardId, text, isDareDone }) => {
    const roomState = rooms.get(roomId);
    if (roomState) {
      if (!roomState.responses[cardId]) {
        roomState.responses[cardId] = {};
      }
      roomState.responses[cardId][socket.id] = {
        playerId: socket.id,
        text: text || (isDareDone ? '✨ Challenge completed with heart!' : 'Shared in spirit.'),
        timestamp: Date.now()
      };

      roomState.sparksScore = Math.min(100, roomState.sparksScore + 6);
      io.to(roomId).emit('room_updated', roomState);
      io.to(roomId).emit('answer_received', { cardId, playerId: socket.id, text });
    }
  });

  // Use PASS token
  socket.on('use_pass', ({ roomId, cardId }) => {
    const roomState = rooms.get(roomId);
    if (roomState) {
      const player = roomState.players.find(p => p.id === socket.id);
      if (player && player.passTokens > 0) {
        player.passTokens -= 1;
        io.to(roomId).emit('room_updated', roomState);
        io.to(roomId).emit('pass_used', { playerName: player.name, remaining: player.passTokens });
      }
    }
  });

  // Ask Follow-up Question
  socket.on('ask_follow_up', ({ roomId, question }) => {
    const roomState = rooms.get(roomId);
    if (roomState) {
      const askingPlayer = roomState.players.find(p => p.id === socket.id);
      roomState.followUp = {
        askingPlayerId: socket.id,
        askingPlayerName: askingPlayer ? askingPlayer.name : 'Partner',
        question: question,
        answer: null,
        timestamp: Date.now()
      };
      roomState.sparksScore = Math.min(100, roomState.sparksScore + 5);
      io.to(roomId).emit('room_updated', roomState);
      io.to(roomId).emit('follow_up_asked', roomState.followUp);
    }
  });

  // Answer Follow-up Question
  socket.on('answer_follow_up', ({ roomId, answer }) => {
    const roomState = rooms.get(roomId);
    if (roomState && roomState.followUp) {
      roomState.followUp.answer = answer;
      roomState.followUp.answeredBy = socket.id;
      roomState.sparksScore = Math.min(100, roomState.sparksScore + 8);
      io.to(roomId).emit('room_updated', roomState);
      io.to(roomId).emit('follow_up_answered', roomState.followUp);
    }
  });

  // Next Turn
  socket.on('next_turn', ({ roomId }) => {
    const roomState = rooms.get(roomId);
    if (roomState) {
      // Archive completed card into history if it has answers
      if (roomState.activeCard) {
        roomState.history.push({
          card: roomState.activeCard,
          responses: roomState.responses[roomState.activeCard.id] || {},
          followUp: roomState.followUp
        });
      }
      roomState.activeCard = null;
      roomState.followUp = null;
      roomState.currentTurnIndex = (roomState.currentTurnIndex + 1) % (roomState.players.length || 2);

      io.to(roomId).emit('room_updated', roomState);
      io.to(roomId).emit('turn_changed', { currentTurnIndex: roomState.currentTurnIndex });
    }
  });

  // Change Round
  socket.on('change_round', ({ roomId, roundNumber }) => {
    const roomState = rooms.get(roomId);
    if (roomState) {
      roomState.currentRound = roundNumber;
      roomState.activeCard = null;
      roomState.followUp = null;
      roomState.sparksScore = Math.min(100, roomState.sparksScore + 7);
      io.to(roomId).emit('room_updated', roomState);
      io.to(roomId).emit('round_changed', { round: roundNumber });
    }
  });

  // Submit Future Prediction
  socket.on('submit_prediction', ({ roomId, targetPlayerIndex, predictionText }) => {
    const roomState = rooms.get(roomId);
    if (roomState) {
      const author = roomState.players.find(p => p.id === socket.id);
      const predictionKey = `player${targetPlayerIndex}`;
      if (!roomState.predictions[predictionKey]) {
        roomState.predictions[predictionKey] = [];
      }

      const prediction = {
        id: 'pred-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        authorId: socket.id,
        authorName: author ? author.name : 'Partner',
        targetPlayerIndex,
        text: predictionText,
        verdict: null, // 'accurate', 'true', 'playful_denial', 'curious'
        verdictComment: '',
        timestamp: Date.now()
      };

      roomState.predictions[predictionKey].push(prediction);
      roomState.sparksScore = Math.min(100, roomState.sparksScore + 6);
      io.to(roomId).emit('room_updated', roomState);
      io.to(roomId).emit('prediction_added', prediction);
    }
  });

  // Rate/Confirm Future Prediction
  socket.on('rate_prediction', ({ roomId, targetPlayerIndex, predictionId, verdict, comment }) => {
    const roomState = rooms.get(roomId);
    if (roomState) {
      const predictionKey = `player${targetPlayerIndex}`;
      const list = roomState.predictions[predictionKey] || [];
      const item = list.find(p => p.id === predictionId);
      if (item) {
        item.verdict = verdict;
        item.verdictComment = comment || '';
        roomState.sparksScore = Math.min(100, roomState.sparksScore + 7);
        io.to(roomId).emit('room_updated', roomState);
        io.to(roomId).emit('prediction_rated', item);
      }
    }
  });

  // Submit Almost Confession (Sealed)
  socket.on('submit_confession', ({ roomId, text }) => {
    const roomState = rooms.get(roomId);
    if (roomState) {
      roomState.confessions[socket.id] = {
        playerId: socket.id,
        text: text,
        sealed: true,
        timestamp: Date.now()
      };

      const allPlayersConfessed = roomState.players.length >= 2 &&
        roomState.players.every(p => roomState.confessions[p.id] && roomState.confessions[p.id].sealed);

      if (allPlayersConfessed) {
        roomState.confessionRevealed = true;
        roomState.sparksScore = 100;
      }

      io.to(roomId).emit('room_updated', roomState);
      io.to(roomId).emit('confession_sealed', {
        playerId: socket.id,
        bothSealed: allPlayersConfessed
      });
    }
  });

  // Real-time Reaction (fireflies, blush, hearts, giggle, starlight)
  socket.on('send_reaction', ({ roomId, type, x, y }) => {
    const reaction = {
      type, // 'heart', 'spark', 'blush', 'firefly', 'laugh'
      x: x || 50,
      y: y || 50,
      id: Date.now() + Math.random()
    };
    io.to(roomId).emit('reaction_burst', reaction);
  });

  // Live Whisper (Chat message)
  socket.on('send_whisper', ({ roomId, message }) => {
    const roomState = rooms.get(roomId);
    if (roomState) {
      const sender = roomState.players.find(p => p.id === socket.id);
      const whisper = {
        id: Date.now() + Math.random(),
        senderId: socket.id,
        senderName: sender ? sender.name : 'Unknown',
        senderAvatar: sender ? sender.avatar : '✨',
        message: message,
        timestamp: Date.now()
      };
      io.to(roomId).emit('whisper_received', whisper);
    }
  });

  // Typing indicator
  socket.on('typing_status', ({ roomId, isTyping }) => {
    socket.to(roomId).emit('partner_typing', { playerId: socket.id, isTyping });
  });

  // Disconnect
  socket.on('disconnect', () => {
    if (userRoomId && rooms.has(userRoomId)) {
      const roomState = rooms.get(userRoomId);
      // We keep room state alive so player can reconnect seamlessly on phone browser reload
      io.to(userRoomId).emit('player_disconnected', { playerId: socket.id });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIpAddress();
  console.log(`\n======================================================`);
  console.log(`🌙 THE UNWRITTEN MAP - Server Running!`);
  console.log(`======================================================`);
  console.log(`🖥️  Host / Browser URL:   http://localhost:${PORT}`);
  console.log(`📱 Phone / Network URL:  http://${localIp}:${PORT}`);
  console.log(`======================================================\n`);
});
