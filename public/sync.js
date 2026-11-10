// The Unwritten Map - Multi-Transport Realtime Synchronization Engine
// Supports Socket.IO (primary local/cloud server), PeerJS WebRTC (zero-server P2P), and Local Pass-and-Play

class RealtimeSyncManager {
  constructor() {
    this.mode = 'socketio'; // 'socketio', 'webrtc', 'local'
    this.socket = null;
    this.peer = null;
    this.peerConn = null;
    this.roomId = null;
    this.playerId = null;
    this.playerInfo = null;
    this.callbacks = {};
    this.isHost = false;
    this.localState = null;
    this.networkUrl = window.location.origin;

    this.initSocket();
    this.fetchNetworkInfo();
  }

  // Fetch network IP info from backend if available
  async fetchNetworkInfo() {
    try {
      const res = await fetch('/api/info');
      if (res.ok) {
        const data = await res.json();
        // If we are on localhost, networkUrl can be the LAN IP, but on public web, use origin
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          if (data.networkUrl) {
            this.networkUrl = data.networkUrl;
          }
        } else {
          this.networkUrl = window.location.origin;
        }
      }
    } catch (e) {
      console.log('Running in static / tunnel / standalone mode');
    }
  }

  on(event, cb) {
    if (!this.callbacks[event]) this.callbacks[event] = [];
    this.callbacks[event].push(cb);
  }

  trigger(event, data) {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach(cb => {
        try { cb(data); } catch (err) { console.error('Callback error:', err); }
      });
    }
  }

  initSocket() {
    if (typeof io !== 'undefined') {
      try {
        this.socket = io({
          transports: ['websocket', 'polling'],
          reconnectionAttempts: 10,
          timeout: 10000
        });

        this.socket.on('connect', () => {
          this.playerId = this.socket.id;
          console.log('⚡ Socket connected:', this.socket.id);
        });

        this.socket.on('room_updated', (state) => this.trigger('state_update', state));
        this.socket.on('journey_started', () => this.trigger('journey_started'));
        this.socket.on('card_drawn', (data) => this.trigger('card_drawn', data));
        this.socket.on('answer_received', (data) => this.trigger('answer_received', data));
        this.socket.on('pass_used', (data) => this.trigger('pass_used', data));
        this.socket.on('follow_up_asked', (data) => this.trigger('follow_up_asked', data));
        this.socket.on('follow_up_answered', (data) => this.trigger('follow_up_answered', data));
        this.socket.on('turn_changed', (data) => this.trigger('turn_changed', data));
        this.socket.on('round_changed', (data) => this.trigger('round_changed', data));
        this.socket.on('prediction_added', (data) => this.trigger('prediction_added', data));
        this.socket.on('prediction_rated', (data) => this.trigger('prediction_rated', data));
        this.socket.on('confession_sealed', (data) => this.trigger('confession_sealed', data));
        this.socket.on('reaction_burst', (data) => this.trigger('reaction_burst', data));
        this.socket.on('whisper_received', (data) => this.trigger('whisper_received', data));
        this.socket.on('partner_typing', (data) => this.trigger('partner_typing', data));
      } catch (e) {
        console.warn('Socket.IO connection failed, will use WebRTC / Local');
      }
    }
  }

  // Create room
  createRoom(playerName, avatar, archetype, callback) {
    if (this.socket) {
      const doEmit = () => {
        this.socket.emit('create_room', { playerName, avatar, archetype }, (res) => {
          if (res && res.success) {
            this.roomId = res.roomId;
            this.isHost = true;
            this.playerInfo = res.player;
          }
          if (callback) callback(res);
        });
      };

      if (this.socket.connected) {
        doEmit();
      } else {
        // Wait up to 1.5s for socket connect, otherwise fallback
        let done = false;
        this.socket.once('connect', () => {
          if (!done) {
            done = true;
            doEmit();
          }
        });
        setTimeout(() => {
          if (!done && !this.socket.connected) {
            done = true;
            this.initWebRTC(true, { playerName, avatar, archetype }, callback);
          }
        }, 1500);
      }
    } else {
      this.initWebRTC(true, { playerName, avatar, archetype }, callback);
    }
  }

  // Join room
  joinRoom(roomId, playerName, avatar, archetype, callback) {
    this.roomId = (roomId || '').trim().toUpperCase();

    if (this.socket) {
      const doEmit = () => {
        this.socket.emit('join_room', { roomId: this.roomId, playerName, avatar, archetype }, (res) => {
          if (res && res.success) {
            this.isHost = false;
            this.playerInfo = res.player;
          }
          if (callback) callback(res);
        });
      };

      if (this.socket.connected) {
        doEmit();
      } else {
        let done = false;
        this.socket.once('connect', () => {
          if (!done) {
            done = true;
            doEmit();
          }
        });
        setTimeout(() => {
          if (!done && !this.socket.connected) {
            done = true;
            this.initWebRTC(false, { playerName, avatar, archetype, roomId: this.roomId }, callback);
          }
        }, 1500);
      }
    } else {
      this.initWebRTC(false, { playerName, avatar, archetype, roomId: this.roomId }, callback);
    }
  }

  // WebRTC P2P fallback using PeerJS
  initWebRTC(isHost, playerInit, callback) {
    if (typeof Peer === 'undefined') {
      // Local simulated mode
      this.initLocalMode(isHost, playerInit, callback);
      return;
    }

    const cleanRoomId = isHost
      ? 'UNWRITTEN-' + Math.floor(1000 + Math.random() * 9000)
      : playerInit.roomId;

    this.roomId = cleanRoomId;
    this.isHost = isHost;

    try {
      const peerId = isHost ? `unwritten-map-${cleanRoomId}` : null;
      this.peer = new Peer(peerId);

      this.peer.on('open', (id) => {
        this.playerId = id;
        const player = {
          id,
          index: isHost ? 0 : 1,
          name: playerInit.playerName || (isHost ? 'Traveler 1' : 'Traveler 2'),
          avatar: playerInit.avatar || (isHost ? '🌙' : '✨'),
          archetype: playerInit.archetype || 'The Stargazer',
          passTokens: 2,
          ready: true,
          isHost
        };
        this.playerInfo = player;

        if (isHost) {
          this.localState = {
            roomId: cleanRoomId,
            started: false,
            currentRound: 1,
            currentTurnIndex: 0,
            activeCard: null,
            drawnCardIds: [],
            players: [player],
            responses: {},
            followUp: null,
            predictions: { player0: [], player1: [] },
            confessions: {},
            confessionRevealed: false,
            reactions: [],
            sparksScore: 25,
            history: []
          };

          this.peer.on('connection', (conn) => {
            this.peerConn = conn;
            this.setupPeerDataHandler(conn);
          });

          if (callback) callback({ success: true, roomId: cleanRoomId, player, state: this.localState });
        } else {
          const hostPeerId = `unwritten-map-${cleanRoomId}`;
          const conn = this.peer.connect(hostPeerId);
          this.peerConn = conn;
          this.setupPeerDataHandler(conn);

          conn.on('open', () => {
            conn.send({ type: 'join_peer', player });
            if (callback) callback({ success: true, roomId: cleanRoomId, player, state: null });
          });
        }
      });

      this.peer.on('error', (err) => {
        console.warn('PeerJS note:', err.type);
        this.initLocalMode(isHost, playerInit, callback);
      });
    } catch (e) {
      this.initLocalMode(isHost, playerInit, callback);
    }
  }

  initLocalMode(isHost, playerInit, callback) {
    const cleanRoomId = isHost ? 'SOLO-' + Math.floor(100 + Math.random() * 900) : (playerInit.roomId || 'SOLO-100');
    this.roomId = cleanRoomId;
    this.playerId = 'local-player-' + Date.now();
    const player = {
      id: this.playerId,
      index: 0,
      name: playerInit.playerName || 'Traveler',
      avatar: playerInit.avatar || '🌙',
      archetype: playerInit.archetype || 'The Moonlit Wanderer',
      passTokens: 2,
      ready: true,
      isHost: true
    };
    this.playerInfo = player;
    this.localState = {
      roomId: cleanRoomId,
      started: false,
      currentRound: 1,
      currentTurnIndex: 0,
      activeCard: null,
      drawnCardIds: [],
      players: [player],
      responses: {},
      followUp: null,
      predictions: { player0: [], player1: [] },
      confessions: {},
      confessionRevealed: false,
      reactions: [],
      sparksScore: 25,
      history: []
    };
    if (callback) callback({ success: true, roomId: cleanRoomId, player, state: this.localState });
  }

  setupPeerDataHandler(conn) {
    conn.on('data', (data) => {
      if (data.type === 'join_peer') {
        if (this.isHost && this.localState) {
          if (!this.localState.players.some(p => p.id === data.player.id)) {
            data.player.index = 1;
            this.localState.players.push(data.player);
          }
          this.broadcastPeer({ type: 'room_updated', state: this.localState });
          this.trigger('state_update', this.localState);
        }
      } else if (data.type === 'room_updated') {
        this.localState = data.state;
        this.trigger('state_update', data.state);
      } else if (data.type === 'reaction_burst') {
        this.trigger('reaction_burst', data.payload);
      } else if (data.type === 'whisper_received') {
        this.trigger('whisper_received', data.payload);
      } else if (data.type === 'partner_typing') {
        this.trigger('partner_typing', data.payload);
      } else if (data.type === 'journey_started') {
        this.trigger('journey_started');
      }
    });
  }

  broadcastPeer(data) {
    if (this.peerConn && this.peerConn.open) {
      this.peerConn.send(data);
    }
  }

  // High-level Actions
  startJourney() {
    if (this.socket && this.socket.connected) {
      this.socket.emit('start_journey', { roomId: this.roomId });
    } else if (this.localState) {
      this.localState.started = true;
      this.broadcastPeer({ type: 'journey_started' });
      this.trigger('journey_started');
      this.trigger('state_update', this.localState);
    }
  }

  drawCard(card, round) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('draw_card', { roomId: this.roomId, card, round });
    } else if (this.localState) {
      this.localState.activeCard = card;
      if (round) this.localState.currentRound = round;
      if (card && card.id && !this.localState.drawnCardIds.includes(card.id)) {
        this.localState.drawnCardIds.push(card.id);
      }
      this.localState.responses[card.id] = {};
      this.localState.followUp = null;
      this.localState.sparksScore = Math.min(100, this.localState.sparksScore + 4);
      this.broadcastPeer({ type: 'room_updated', state: this.localState });
      this.trigger('state_update', this.localState);
      this.trigger('card_drawn', { card });
    }
  }

  submitAnswer(cardId, text, isDareDone = false) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('submit_answer', { roomId: this.roomId, cardId, text, isDareDone });
    } else if (this.localState) {
      if (!this.localState.responses[cardId]) this.localState.responses[cardId] = {};
      this.localState.responses[cardId][this.playerId] = {
        playerId: this.playerId,
        text: text || (isDareDone ? '✨ Challenge completed with heart!' : 'Shared in spirit.'),
        timestamp: Date.now()
      };
      this.localState.sparksScore = Math.min(100, this.localState.sparksScore + 6);
      this.broadcastPeer({ type: 'room_updated', state: this.localState });
      this.trigger('state_update', this.localState);
      this.trigger('answer_received', { cardId, playerId: this.playerId, text });
    }
  }

  usePass(cardId) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('use_pass', { roomId: this.roomId, cardId });
    } else if (this.localState) {
      const p = this.localState.players.find(x => x.id === this.playerId);
      if (p && p.passTokens > 0) {
        p.passTokens -= 1;
        this.broadcastPeer({ type: 'room_updated', state: this.localState });
        this.trigger('state_update', this.localState);
        this.trigger('pass_used', { playerName: p.name, remaining: p.passTokens });
      }
    }
  }

  askFollowUp(question) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('ask_follow_up', { roomId: this.roomId, question });
    } else if (this.localState) {
      const askingPlayer = this.localState.players.find(p => p.id === this.playerId);
      this.localState.followUp = {
        askingPlayerId: this.playerId,
        askingPlayerName: askingPlayer ? askingPlayer.name : 'Partner',
        question: question,
        answer: null,
        timestamp: Date.now()
      };
      this.localState.sparksScore = Math.min(100, this.localState.sparksScore + 5);
      this.broadcastPeer({ type: 'room_updated', state: this.localState });
      this.trigger('state_update', this.localState);
      this.trigger('follow_up_asked', this.localState.followUp);
    }
  }

  answerFollowUp(answer) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('answer_follow_up', { roomId: this.roomId, answer });
    } else if (this.localState && this.localState.followUp) {
      this.localState.followUp.answer = answer;
      this.localState.followUp.answeredBy = this.playerId;
      this.localState.sparksScore = Math.min(100, this.localState.sparksScore + 8);
      this.broadcastPeer({ type: 'room_updated', state: this.localState });
      this.trigger('state_update', this.localState);
      this.trigger('follow_up_answered', this.localState.followUp);
    }
  }

  nextTurn() {
    if (this.socket && this.socket.connected) {
      this.socket.emit('next_turn', { roomId: this.roomId });
    } else if (this.localState) {
      if (this.localState.activeCard) {
        this.localState.history.push({
          card: this.localState.activeCard,
          responses: this.localState.responses[this.localState.activeCard.id] || {},
          followUp: this.localState.followUp
        });
      }
      this.localState.activeCard = null;
      this.localState.followUp = null;
      this.localState.currentTurnIndex = (this.localState.currentTurnIndex + 1) % (this.localState.players.length || 2);
      this.broadcastPeer({ type: 'room_updated', state: this.localState });
      this.trigger('state_update', this.localState);
      this.trigger('turn_changed', { currentTurnIndex: this.localState.currentTurnIndex });
    }
  }

  changeRound(roundNumber) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('change_round', { roomId: this.roomId, roundNumber });
    } else if (this.localState) {
      this.localState.currentRound = roundNumber;
      this.localState.activeCard = null;
      this.localState.followUp = null;
      this.broadcastPeer({ type: 'room_updated', state: this.localState });
      this.trigger('state_update', this.localState);
      this.trigger('round_changed', { round: roundNumber });
    }
  }

  submitPrediction(targetPlayerIndex, predictionText) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('submit_prediction', { roomId: this.roomId, targetPlayerIndex, predictionText });
    } else if (this.localState) {
      const author = this.localState.players.find(p => p.id === this.playerId);
      const k = `player${targetPlayerIndex}`;
      if (!this.localState.predictions[k]) this.localState.predictions[k] = [];
      const pred = {
        id: 'pred-' + Date.now(),
        authorId: this.playerId,
        authorName: author ? author.name : 'Partner',
        targetPlayerIndex,
        text: predictionText,
        verdict: null,
        verdictComment: '',
        timestamp: Date.now()
      };
      this.localState.predictions[k].push(pred);
      this.broadcastPeer({ type: 'room_updated', state: this.localState });
      this.trigger('state_update', this.localState);
      this.trigger('prediction_added', pred);
    }
  }

  ratePrediction(targetPlayerIndex, predictionId, verdict, comment) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('rate_prediction', { roomId: this.roomId, targetPlayerIndex, predictionId, verdict, comment });
    } else if (this.localState) {
      const k = `player${targetPlayerIndex}`;
      const item = (this.localState.predictions[k] || []).find(p => p.id === predictionId);
      if (item) {
        item.verdict = verdict;
        item.verdictComment = comment;
        this.broadcastPeer({ type: 'room_updated', state: this.localState });
        this.trigger('state_update', this.localState);
        this.trigger('prediction_rated', item);
      }
    }
  }

  submitConfession(text) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('submit_confession', { roomId: this.roomId, text });
    } else if (this.localState) {
      this.localState.confessions[this.playerId] = {
        playerId: this.playerId,
        text,
        sealed: true,
        timestamp: Date.now()
      };
      this.localState.confessionRevealed = true;
      this.localState.sparksScore = 100;
      this.broadcastPeer({ type: 'room_updated', state: this.localState });
      this.trigger('state_update', this.localState);
      this.trigger('confession_sealed', { playerId: this.playerId, bothSealed: true });
    }
  }

  sendReaction(type, x, y) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('send_reaction', { roomId: this.roomId, type, x, y });
    } else {
      this.broadcastPeer({ type: 'reaction_burst', payload: { type, x, y } });
    }
  }

  sendWhisper(message) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('send_whisper', { roomId: this.roomId, message });
    } else if (this.localState) {
      const sender = this.localState.players.find(p => p.id === this.playerId);
      const whisper = {
        id: Date.now(),
        senderId: this.playerId,
        senderName: sender ? sender.name : 'Traveler',
        senderAvatar: sender ? sender.avatar : '✨',
        message,
        timestamp: Date.now()
      };
      this.broadcastPeer({ type: 'whisper_received', payload: whisper });
      this.trigger('whisper_received', whisper);
    }
  }

  setTyping(isTyping) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('typing_status', { roomId: this.roomId, isTyping });
    } else {
      this.broadcastPeer({ type: 'partner_typing', payload: { isTyping } });
    }
  }

  // Share URL Generator
  getShareableUrl() {
    const base = window.location.origin;
    return `${base}/?room=${encodeURIComponent(this.roomId || '')}`;
  }
}

window.syncManager = new RealtimeSyncManager();
