// The Unwritten Map - Core Game Logic & UI State Controller

(function () {
  const sync = window.syncManager;
  const audio = window.mysticAudio;
  const getDecks = () => window.GAME_DECKS || (typeof GAME_DECKS !== 'undefined' ? GAME_DECKS : { round1: [], round2: [], round3: [], archetypes: [] });

  // Local State
  let gameState = null;
  let myPlayer = null;
  let activeRoundIndex = 1;
  let unreadWhispers = 0;
  let whisperDrawerOpen = false;

  // DOM Elements
  const screenLobby = document.getElementById('screenLobby');
  const screenGame = document.getElementById('screenGame');
  const screenSummary = document.getElementById('screenSummary');

  // Initialize URL parameters
  function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace('#', '?'));
    const roomParam = urlParams.get('room') || hashParams.get('room');

    if (roomParam) {
      document.getElementById('inputJoinRoom').value = roomParam.toUpperCase();
      switchLobbyTab('join');
    }
  }

  // Switch Lobby Tabs (Create vs Join)
  window.switchLobbyTab = function (tab) {
    const btnCreate = document.getElementById('tabBtnCreate');
    const btnJoin = document.getElementById('tabBtnJoin');
    const formCreate = document.getElementById('formCreate');
    const formJoin = document.getElementById('formJoin');

    if (tab === 'create') {
      btnCreate.classList.add('border-b-2', 'border-amber-400', 'text-amber-300');
      btnCreate.classList.remove('text-slate-400');
      btnJoin.classList.remove('border-b-2', 'border-amber-400', 'text-amber-300');
      btnJoin.classList.add('text-slate-400');
      formCreate.classList.remove('hidden');
      formJoin.classList.add('hidden');
    } else {
      btnJoin.classList.add('border-b-2', 'border-amber-400', 'text-amber-300');
      btnJoin.classList.remove('text-slate-400');
      btnCreate.classList.remove('border-b-2', 'border-amber-400', 'text-amber-300');
      btnCreate.classList.add('text-slate-400');
      formJoin.classList.remove('hidden');
      formCreate.classList.add('hidden');
    }
  };

  // Avatar Selection
  let selectedAvatar = '🌙';
  let selectedArchetype = 'The Moonlit Wanderer';

  window.selectAvatar = function (element, avatar, archetype) {
    document.querySelectorAll('.avatar-option').forEach(el => el.classList.remove('ring-2', 'ring-amber-400', 'scale-110'));
    element.classList.add('ring-2', 'ring-amber-400', 'scale-110');
    selectedAvatar = avatar;
    selectedArchetype = archetype;
    const badge = document.getElementById('selectedArchetypeBadge');
    if (badge) badge.textContent = archetype;
  };

  // Create Room Click
  window.handleCreateRoom = function () {
    audio.init();
    const name = document.getElementById('inputCreateName').value.trim() || 'Wanderer 1';
    sync.createRoom(name, selectedAvatar, selectedArchetype, (res) => {
      if (res.success) {
        myPlayer = res.player;
        gameState = res.state;
        showWaitingRoom(res.roomId);
      } else {
        showToast(res.message || 'Could not create room', 'error');
      }
    });
  };

  // Join Room Click
  window.handleJoinRoom = function () {
    audio.init();
    const name = document.getElementById('inputJoinName').value.trim() || 'Wanderer 2';
    const code = document.getElementById('inputJoinRoom').value.trim();
    if (!code) {
      showToast('Please enter a room code', 'error');
      return;
    }

    sync.joinRoom(code, name, selectedAvatar, selectedArchetype, (res) => {
      if (res.success) {
        myPlayer = res.player;
        gameState = res.state;
        if (gameState && gameState.started) {
          enterGameScreen();
        } else {
          showWaitingRoom(res.roomId);
        }
      } else {
        showToast(res.message || 'Could not join room', 'error');
      }
    });
  };

  // Waiting Room Display & QR code
  function showWaitingRoom(roomId) {
    document.getElementById('lobbyFormSection').classList.add('hidden');
    document.getElementById('waitingRoomSection').classList.remove('hidden');

    document.getElementById('displayRoomCode').textContent = roomId;

    const shareUrl = sync.getShareableUrl();
    document.getElementById('displayShareUrl').textContent = shareUrl;

    // Generate QR Code if library available
    const qrCanvas = document.getElementById('qrCanvas');
    if (qrCanvas && typeof QRCode !== 'undefined') {
      try {
        qrCanvas.innerHTML = '';
        new QRCode(qrCanvas, {
          text: shareUrl,
          width: 140,
          height: 140,
          colorDark: '#0d122b',
          colorLight: '#fef3c7'
        });
      } catch (err) {
        console.warn('QR Code generation notice:', err);
      }
    }

    renderWaitingPlayers();
  }

  function renderWaitingPlayers() {
    if (!gameState) return;
    const pContainer = document.getElementById('waitingPlayersList');
    if (!pContainer) return;
    pContainer.innerHTML = '';

    gameState.players.forEach((p, idx) => {
      const card = document.createElement('div');
      card.className = 'flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-amber-500/30';
      card.innerHTML = `
        <span class="text-3xl">${p.avatar}</span>
        <div class="text-left flex-1">
          <div class="font-semibold text-amber-200 text-sm">${escapeHtml(p.name)} ${p.id === sync.playerId ? '<span class="text-xs text-slate-400 font-normal">(You)</span>' : ''}</div>
          <div class="text-xs text-amber-400/80">${escapeHtml(p.archetype || 'Traveler')}</div>
        </div>
        <span class="text-emerald-400 text-xs px-2 py-1 rounded bg-emerald-950/60 border border-emerald-500/30">Ready</span>
      `;
      pContainer.appendChild(card);
    });

    const startBtn = document.getElementById('btnStartJourney');
    const waitingText = document.getElementById('waitingNoticeText');

    if (gameState.players.length >= 2) {
      if (waitingText) waitingText.textContent = '✨ Both travelers are present. The map is ready to unfold!';
      if (startBtn) {
        startBtn.classList.remove('opacity-50', 'pointer-events-none');
        startBtn.classList.add('pulse-ring');
      }
    } else {
      if (waitingText) waitingText.textContent = 'Waiting for second traveler to join with link or code...';
      if (startBtn) {
        startBtn.classList.add('opacity-50', 'pointer-events-none');
        startBtn.classList.remove('pulse-ring');
      }
    }
  }

  // Copy Share Link
  window.copyShareLink = function () {
    const url = sync.getShareableUrl();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        showToast('🌙 Link copied to clipboard! Send it to your partner.', 'success');
      }).catch(() => fallbackCopy(url));
    } else {
      fallbackCopy(url);
    }
  };

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('🌙 Link copied to clipboard!', 'success');
  }

  // Start Journey Button Click
  window.handleStartJourney = function () {
    audio.playGong();
    sync.startJourney();
  };

  function enterGameScreen() {
    screenLobby.classList.add('hidden');
    screenSummary.classList.add('hidden');
    screenGame.classList.remove('hidden');
    renderGameView();
  }

  // Update State from Sync
  sync.on('state_update', (newState) => {
    gameState = newState;
    if (gameState.started && screenGame.classList.contains('hidden')) {
      enterGameScreen();
    }
    if (!screenLobby.classList.contains('hidden')) {
      renderWaitingPlayers();
    }
    if (!screenGame.classList.contains('hidden')) {
      renderGameView();
    }
    if (gameState.currentRound === 5 && !screenSummary.classList.contains('hidden')) {
      renderEpilogueSummary();
    }
  });

  sync.on('journey_started', () => {
    enterGameScreen();
  });

  sync.on('card_drawn', ({ card }) => {
    audio.playCardDraw();
    renderCardContent(card);
  });

  sync.on('pass_used', ({ playerName, remaining }) => {
    audio.playTokenPass();
    showToast(`🕊️ ${escapeHtml(playerName)} used a PASS token (${remaining} left)`, 'info');
  });

  sync.on('follow_up_asked', (followUp) => {
    audio.playSoftBell(523.25, 0.05);
    showToast(`✨ ${escapeHtml(followUp.askingPlayerName)} asked a follow-up question!`, 'info');
    renderFollowUpSection(followUp);
  });

  sync.on('follow_up_answered', (followUp) => {
    audio.playSoftBell(659.25, 0.05);
    renderFollowUpSection(followUp);
  });

  sync.on('confession_sealed', ({ playerId, bothSealed }) => {
    if (bothSealed) {
      audio.playGong();
      showToast('🌑 Both confessions are sealed in the moonlight! The seals are breaking...', 'success');
      setTimeout(() => {
        renderConfessionView();
      }, 1200);
    } else {
      audio.playSoftBell(440, 0.05);
      showToast('💌 An envelope has been sealed...', 'info');
      renderConfessionView();
    }
  });

  sync.on('reaction_burst', (reaction) => {
    audio.playReaction(reaction.type);
    spawnFloatingReaction(reaction.type, reaction.x, reaction.y);
  });

  sync.on('whisper_received', (whisper) => {
    appendWhisper(whisper);
    if (!whisperDrawerOpen) {
      unreadWhispers++;
      updateWhisperBadge();
      showToast(`💬 Whisper from ${escapeHtml(whisper.senderName)}: "${escapeHtml(whisper.message)}"`, 'info');
    }
  });

  sync.on('partner_typing', ({ isTyping }) => {
    const el = document.getElementById('partnerTypingIndicator');
    if (el) {
      el.classList.toggle('hidden', !isTyping);
    }
  });

  // Render Core Game View
  function renderGameView() {
    if (!gameState) return;

    // Header info
    document.getElementById('headerRoomCode').textContent = gameState.roomId;
    updateSparksMeter(gameState.sparksScore || 20);

    // Pass tokens render
    renderPassTokens();

    // Round Indicator Map Nodes
    renderMapNodes();

    // Render active round content
    const round = gameState.currentRound || 1;
    activeRoundIndex = round;

    const roundTitleEl = document.getElementById('currentRoundTitle');
    const roundSubtitleEl = document.getElementById('currentRoundSubtitle');

    if (round === 1) {
      roundTitleEl.textContent = '🌙 THE WHISPERING GROVE';
      roundSubtitleEl.textContent = 'Round 1: Mystery & Chemistry Cards · Take turns drawing & asking follow-ups';
      document.getElementById('cardGameSection').classList.remove('hidden');
      document.getElementById('predictionsSection').classList.add('hidden');
      document.getElementById('confessionSection').classList.add('hidden');
      renderCardSection();
    } else if (round === 2) {
      roundTitleEl.textContent = '🔥 THE ROMANTIC DARE';
      roundSubtitleEl.textContent = 'Round 2: Elevating the Tension · Romantic challenges, surprises & truths';
      document.getElementById('cardGameSection').classList.remove('hidden');
      document.getElementById('predictionsSection').classList.add('hidden');
      document.getElementById('confessionSection').classList.add('hidden');
      renderCardSection();
    } else if (round === 3) {
      roundTitleEl.textContent = '🔮 PREDICT OUR FUTURE';
      roundSubtitleEl.textContent = 'Round 3: Predict 3 things about each other · Confirm or playfully deny';
      document.getElementById('cardGameSection').classList.add('hidden');
      document.getElementById('predictionsSection').classList.remove('hidden');
      document.getElementById('confessionSection').classList.add('hidden');
      renderPredictionsView();
    } else if (round === 4) {
      roundTitleEl.textContent = '🌑 THE ALMOST CONFESSION';
      roundSubtitleEl.textContent = 'Round 4: "Something about you that I’ve been wanting to tell you is..."';
      document.getElementById('cardGameSection').classList.add('hidden');
      document.getElementById('predictionsSection').classList.add('hidden');
      document.getElementById('confessionSection').classList.remove('hidden');
      renderConfessionView();
    } else if (round === 5) {
      showSummaryScreen();
    }
  }

  // Sparks meter
  function updateSparksMeter(val) {
    const fill = document.getElementById('sparksMeterFill');
    const text = document.getElementById('sparksMeterVal');
    if (fill) fill.style.width = `${Math.min(100, Math.max(0, val))}%`;
    if (text) text.textContent = `${Math.min(100, Math.round(val))}%`;
  }

  // Pass Tokens
  function renderPassTokens() {
    const container = document.getElementById('passTokensContainer');
    if (!container || !gameState) return;
    container.innerHTML = '';

    const currentPlayer = gameState.players.find(p => p.id === sync.playerId) || gameState.players[0];
    const passCount = currentPlayer ? (currentPlayer.passTokens || 0) : 2;

    for (let i = 0; i < 2; i++) {
      const span = document.createElement('span');
      span.className = `pass-token ${i < passCount ? '' : 'spent'}`;
      span.title = i < passCount ? 'Pass Token (Active)' : 'Pass Token (Used)';
      span.textContent = '🕊️';
      container.appendChild(span);
    }
  }

  // Map Nodes Navigation
  function renderMapNodes() {
    const nodes = [
      { id: 1, name: 'Whispering Grove', icon: '🌿' },
      { id: 2, name: 'Romantic Dare', icon: '🔥' },
      { id: 3, name: 'Predict Future', icon: '🔮' },
      { id: 4, name: 'Confession', icon: '🌑' },
      { id: 5, name: 'Destiny', icon: '✨' }
    ];

    const container = document.getElementById('mapNodesTrail');
    if (!container) return;
    container.innerHTML = '';

    nodes.forEach(node => {
      const isCurrent = gameState.currentRound === node.id;
      const isPassed = gameState.currentRound > node.id;
      const btn = document.createElement('button');
      btn.className = `map-node flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
        isCurrent
          ? 'active bg-amber-500/20 text-amber-200 border-amber-400'
          : isPassed
          ? 'completed text-emerald-300 border-emerald-500/40 bg-emerald-950/30'
          : 'text-slate-400 border-slate-700/60 bg-slate-900/40 hover:border-slate-500'
      }`;
      btn.innerHTML = `<span>${node.icon}</span><span class="hidden sm:inline">${node.name}</span>`;
      btn.onclick = () => {
        // Can switch round
        sync.changeRound(node.id);
      };
      container.appendChild(btn);
    });
  }

  // Card Section Render
  function renderCardSection() {
    const activeCard = gameState.activeCard;
    const isRound2 = gameState.currentRound === 2;
    const turnIndex = gameState.currentTurnIndex || 0;
    const turnPlayer = gameState.players[turnIndex] || gameState.players[0];
    const isMyTurn = turnPlayer && (turnPlayer.id === sync.playerId || gameState.players.length === 1);

    const turnNotice = document.getElementById('turnNotice');
    if (turnNotice) {
      if (isMyTurn) {
        turnNotice.innerHTML = `✨ <strong>Your Turn</strong> to ${activeCard ? 'lead the response or ask follow-up' : 'draw a mystery card'}!`;
        turnNotice.className = 'p-2 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs text-center';
      } else {
        turnNotice.innerHTML = `🌙 Waiting for <strong>${escapeHtml(turnPlayer ? turnPlayer.name : 'Partner')}</strong> to draw or answer...`;
        turnNotice.className = 'p-2 rounded-lg bg-slate-900/60 border border-slate-700/50 text-slate-300 text-xs text-center';
      }
    }

    const cardScene = document.getElementById('cardScene');
    const cardEmptyPrompt = document.getElementById('cardEmptyPrompt');

    if (!activeCard) {
      cardScene.classList.add('hidden');
      cardEmptyPrompt.classList.remove('hidden');

      const drawBtn = document.getElementById('btnDrawCard');
      if (drawBtn) {
        drawBtn.textContent = isRound2 ? '🔥 Draw a Romantic Dare' : '🌙 Draw a Mystery Card';
        drawBtn.onclick = () => drawRandomCard();
      }
    } else {
      cardEmptyPrompt.classList.add('hidden');
      cardScene.classList.remove('hidden');
      renderCardContent(activeCard);
    }
  }

  function drawRandomCard() {
    const isRound2 = gameState.currentRound === 2;
    const currentDecks = getDecks();
    const pool = isRound2 ? (currentDecks.round2 || []) : (currentDecks.round1 || []);
    const drawnIds = gameState.drawnCardIds || [];
    const available = pool.filter(c => !drawnIds.includes(c.id));
    const card = available.length > 0
      ? available[Math.floor(Math.random() * available.length)]
      : pool[Math.floor(Math.random() * pool.length)];

    sync.drawCard(card, gameState.currentRound);
  }

  function renderCardContent(card) {
    document.getElementById('cardTitle').textContent = card.title;
    document.getElementById('cardCategory').textContent = card.category || (card.type === 'dare' ? 'Romantic Dare' : 'Mystery Card');
    document.getElementById('cardIcon').textContent = card.icon || '🌙';
    document.getElementById('cardQuestion').textContent = card.question || card.prompt;
    document.getElementById('cardHint').textContent = card.hint || card.requirement || 'Honesty above all.';

    // 3D Card Reveal animation trigger (forward-facing, non-mirrored)
    const inner = document.getElementById('cardFlipInner');
    if (inner) {
      inner.classList.remove('card-flip-enter');
      void inner.offsetWidth; // Force CSS reflow
      inner.classList.add('card-flip-enter');
    }

    renderAnswersAndControls(card);
    renderFollowUpSection(gameState.followUp);
  }

  function renderAnswersAndControls(card) {
    const answersContainer = document.getElementById('cardAnswersContainer');
    if (!answersContainer) return;
    answersContainer.innerHTML = '';

    const cardResponses = (gameState.responses && gameState.responses[card.id]) || {};

    // List answers submitted so far
    gameState.players.forEach(player => {
      const resp = cardResponses[player.id];
      const div = document.createElement('div');
      div.className = 'p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-sm';

      if (resp) {
        div.innerHTML = `
          <div class="flex items-center justify-between text-xs text-amber-300 font-semibold mb-1">
            <span>${player.avatar} ${escapeHtml(player.name)}</span>
            <span class="text-slate-500">Shared</span>
          </div>
          <p class="text-slate-200 font-cormorant text-lg italic leading-snug">"${escapeHtml(resp.text)}"</p>
        `;
      } else {
        div.innerHTML = `
          <div class="flex items-center justify-between text-xs text-slate-400">
            <span>${player.avatar} ${escapeHtml(player.name)}</span>
            <span class="italic">Thinking...</span>
          </div>
        `;
      }
      answersContainer.appendChild(div);
    });

    // Check if I already answered
    const myResp = cardResponses[sync.playerId];
    const inputArea = document.getElementById('answerInputArea');

    if (myResp) {
      inputArea.innerHTML = `
        <div class="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center justify-between">
          <span>✓ You shared your answer. Listen or read your partner's response!</span>
        </div>
      `;
    } else {
      inputArea.innerHTML = `
        <div class="space-y-2">
          <textarea id="myAnswerText" rows="2" placeholder="Speak your truth or type your answer here..."
            class="w-full px-3 py-2 text-sm rounded-xl bg-slate-900/90 border border-amber-500/30 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-cormorant text-base"></textarea>
          <div class="flex items-center gap-2">
            <button onclick="submitMyAnswer('${card.id}')"
              class="flex-1 py-2 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg transition-all">
              ✨ Submit Answer
            </button>
            <button onclick="handleUsePass('${card.id}')"
              class="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-medium transition-all"
              title="Use 1 Pass Token">
              🕊️ Pass
            </button>
          </div>
        </div>
      `;

      // Typing feedback
      const ta = document.getElementById('myAnswerText');
      if (ta) {
        let timer = null;
        ta.addEventListener('input', () => {
          sync.setTyping(true);
          clearTimeout(timer);
          timer = setTimeout(() => sync.setTyping(false), 2000);
        });
      }
    }
  }

  window.submitMyAnswer = function (cardId) {
    const textEl = document.getElementById('myAnswerText');
    const text = textEl ? textEl.value.trim() : '';
    if (!text) {
      showToast('Type an answer or describe what you shared aloud!', 'error');
      return;
    }
    audio.playReaction('heart');
    sync.submitAnswer(cardId, text);
    showToast('✨ Answer shared honestly.', 'success');
  };

  window.handleUsePass = function (cardId) {
    const currentPlayer = gameState.players.find(p => p.id === sync.playerId);
    if (!currentPlayer || currentPlayer.passTokens <= 0) {
      showToast('No PASS tokens remaining! You must answer honestly.', 'error');
      return;
    }
    sync.usePass(cardId);
  };

  // Follow-up Section
  function renderFollowUpSection(followUp) {
    const container = document.getElementById('followUpSection');
    if (!container) return;

    if (!followUp) {
      container.innerHTML = `
        <div class="p-3 rounded-xl bg-slate-900/40 border border-dashed border-amber-500/20 text-center">
          <p class="text-xs text-amber-300/80 mb-2 font-medium">💬 One Follow-Up Question Allowed per Card</p>
          <button onclick="promptFollowUpModal()" class="py-1.5 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/30 text-xs">
            + Ask Partner a Follow-up Question
          </button>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="p-3.5 rounded-xl bg-gradient-to-r from-violet-950/60 to-indigo-950/60 border border-amber-400/30 text-left space-y-2">
          <div class="flex items-center justify-between text-xs text-amber-300 font-semibold">
            <span>🔍 Follow-up from ${escapeHtml(followUp.askingPlayerName)}:</span>
          </div>
          <p class="text-sm font-medium text-slate-100 font-cormorant text-base">"${escapeHtml(followUp.question)}"</p>
          ${
            followUp.answer
              ? `<div class="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-300">
                  <span class="text-amber-400 font-semibold">Answer:</span> "${escapeHtml(followUp.answer)}"
                </div>`
              : followUp.askingPlayerId !== sync.playerId
              ? `<div class="space-y-1.5 pt-1">
                  <input type="text" id="followUpAnswerInput" placeholder="Answer the follow-up..."
                    class="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-900 border border-amber-500/30 text-white focus:outline-none">
                  <button onclick="submitFollowUpAnswer()" class="w-full py-1.5 bg-amber-500 text-slate-950 font-bold text-xs rounded-lg">
                    Submit Follow-up Answer
                  </button>
                </div>`
              : `<p class="text-xs text-slate-400 italic">Waiting for partner's follow-up answer...</p>`
          }
        </div>
      `;
    }
  }

  window.promptFollowUpModal = function () {
    const q = prompt("What follow-up question would you like to ask your talking partner?");
    if (q && q.trim()) {
      sync.askFollowUp(q.trim());
    }
  };

  window.submitFollowUpAnswer = function () {
    const inp = document.getElementById('followUpAnswerInput');
    if (inp && inp.value.trim()) {
      sync.answerFollowUp(inp.value.trim());
    }
  };

  // Next Turn Button
  window.handleNextTurn = function () {
    audio.playSoftBell(440, 0.05);
    sync.nextTurn();
  };

  // Round 3: Predict Our Future
  function renderPredictionsView() {
    const container = document.getElementById('predictionsContainer');
    if (!container || !gameState) return;
    container.innerHTML = '';

    const p0 = gameState.players[0] || { name: 'Player 1', avatar: '🌙' };
    const p1 = gameState.players[1] || { name: 'Player 2', avatar: '✨' };

    // My index
    const myIndex = myPlayer ? myPlayer.index : 0;
    const partnerIndex = myIndex === 0 ? 1 : 0;
    const partner = gameState.players[partnerIndex] || (myIndex === 0 ? p1 : p0);

    const div = document.createElement('div');
    div.className = 'space-y-4';

    div.innerHTML = `
      <div class="p-4 rounded-2xl glass-card border border-amber-500/30 text-left space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-amber-200 font-semibold text-sm">🔮 Predictions About ${escapeHtml(partner.name)} (${partner.avatar})</h3>
          <span class="text-xs text-slate-400">You predict · They confirm/deny</span>
        </div>
        <p class="text-xs text-slate-300">Choose a mystic intuitive guess or write your own observation:</p>

        <div class="flex gap-2">
          <input type="text" id="customPredictionInput" placeholder="I predict that you..."
            class="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-900 border border-amber-500/30 text-white placeholder-slate-500 focus:outline-none">
          <button onclick="handleSendCustomPrediction(${partnerIndex})"
            class="py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs">
            Predict
          </button>
        </div>

        <div class="space-y-1.5 pt-2">
          <p class="text-[11px] uppercase tracking-wider text-amber-400 font-semibold">Or pick a premade prediction:</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2" id="premadePredictionButtons"></div>
        </div>
      </div>

      <div class="p-4 rounded-2xl glass-panel text-left space-y-3">
        <h3 class="text-amber-200 font-semibold text-sm">📜 Unfolded Predictions & Verdicts</h3>
        <div id="unfoldedPredictionsList" class="space-y-2"></div>
      </div>
    `;

    container.appendChild(div);

    // Populate premade predictions
    const premadeContainer = div.querySelector('#premadePredictionButtons');
    const round3Deck = (getDecks().round3 || []);
    round3Deck.slice(0, 4).forEach(p => {
      const btn = document.createElement('button');
      btn.className = 'p-2 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-left text-xs text-slate-300 transition-all';
      btn.innerHTML = `<span class="text-amber-400 mr-1">✦</span> "${escapeHtml(p.text)}"`;
      btn.onclick = () => {
        sync.submitPrediction(partnerIndex, p.text);
      };
      premadeContainer.appendChild(btn);
    });

    renderUnfoldedPredictions(div.querySelector('#unfoldedPredictionsList'));
  }

  function renderUnfoldedPredictions(listContainer) {
    if (!listContainer || !gameState) return;
    listContainer.innerHTML = '';

    const allPredictions = [];
    ['player0', 'player1'].forEach(k => {
      const preds = gameState.predictions[k] || [];
      preds.forEach(p => allPredictions.push(p));
    });

    if (allPredictions.length === 0) {
      listContainer.innerHTML = '<p class="text-xs text-slate-500 italic">No predictions made yet. Take a guess above!</p>';
      return;
    }

    allPredictions.forEach(pred => {
      const isTargetMe = myPlayer && pred.targetPlayerIndex === myPlayer.index;
      const card = document.createElement('div');
      card.className = 'p-3 rounded-xl bg-slate-900/70 border border-amber-500/20 text-xs space-y-2';

      card.innerHTML = `
        <div class="flex items-center justify-between text-amber-400 font-medium">
          <span>By ${escapeHtml(pred.authorName)}</span>
          <span class="text-[10px] text-slate-500">${new Date(pred.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <p class="text-sm font-cormorant text-slate-100 italic">"${escapeHtml(pred.text)}"</p>
        ${
          pred.verdict
            ? `<div class="p-2 rounded bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs font-semibold">
                Verdict: ${getVerdictLabel(pred.verdict)} ${pred.verdictComment ? `· "${escapeHtml(pred.verdictComment)}"` : ''}
              </div>`
            : isTargetMe
            ? `<div class="space-y-1 pt-1">
                <span class="text-[11px] text-amber-300 block">Is this prediction true about you?</span>
                <div class="flex flex-wrap gap-1">
                  <button onclick="ratePrediction('${pred.id}', ${pred.targetPlayerIndex}, 'dangerously_accurate')" class="px-2 py-1 bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-200 rounded text-[11px]">😳 Dangerously Accurate</button>
                  <button onclick="ratePrediction('${pred.id}', ${pred.targetPlayerIndex}, 'true')" class="px-2 py-1 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-200 rounded text-[11px]">✨ Surprisingly True</button>
                  <button onclick="ratePrediction('${pred.id}', ${pred.targetPlayerIndex}, 'denial')" class="px-2 py-1 bg-amber-950/80 hover:bg-amber-900 border border-amber-500/40 text-amber-200 rounded text-[11px]">😂 Playful Denial</button>
                </div>
              </div>`
            : `<span class="text-slate-500 italic text-[11px]">Waiting for partner's verdict...</span>`
        }
      `;
      listContainer.appendChild(card);
    });
  }

  function getVerdictLabel(key) {
    if (key === 'dangerously_accurate') return '😳 Dangerously Accurate!';
    if (key === 'true') return '✨ Surprisingly True!';
    if (key === 'denial') return '😂 Playfully Denied';
    return key;
  }

  window.handleSendCustomPrediction = function (targetIndex) {
    const input = document.getElementById('customPredictionInput');
    if (input && input.value.trim()) {
      sync.submitPrediction(targetIndex, input.value.trim());
      input.value = '';
    }
  };

  window.ratePrediction = function (predId, targetIndex, verdict) {
    const comment = prompt("Add a short comment to your verdict (optional):") || '';
    audio.playReaction('heart');
    sync.ratePrediction(targetIndex, predId, verdict, comment);
  };

  // Round 4: The Almost Confession
  function renderConfessionView() {
    const container = document.getElementById('confessionContainer');
    if (!container || !gameState) return;
    container.innerHTML = '';

    const myConfession = gameState.confessions && gameState.confessions[sync.playerId];
    const isRevealed = gameState.confessionRevealed;

    const div = document.createElement('div');
    div.className = 'max-w-xl mx-auto space-y-4 text-left';

    div.innerHTML = `
      <div class="p-6 rounded-3xl glass-card border border-rose-500/30 text-center space-y-3 relative overflow-hidden">
        <span class="text-5xl">💌</span>
        <h2 class="text-xl font-bold font-cinzel text-amber-200">The Almost Confession</h2>
        <p class="text-sm font-cormorant text-slate-300 italic">
          "Something about you that I’ve been wanting to tell you is..."
        </p>
        <p class="text-xs text-slate-400 max-w-sm mx-auto">
          Both envelopes must be sealed before the moonlight reveals either truth. Speak from the heart.
        </p>
      </div>

      <div class="space-y-4">
        ${
          !myConfession || !myConfession.sealed
            ? `
            <div class="p-5 rounded-2xl bg-slate-900/80 border border-amber-500/30 space-y-3">
              <label class="block text-xs font-semibold text-amber-300">Your Sealed Envelope:</label>
              <textarea id="myConfessionText" rows="3" placeholder="Something about you that I’ve been wanting to tell you is..."
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:border-rose-400 font-cormorant text-lg"></textarea>
              <button onclick="handleSealConfession()" class="w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-slate-950 font-bold text-sm shadow-xl transition-all">
                🔒 Seal Envelope with Moonlight
              </button>
            </div>
            `
            : `
            <div class="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-center space-y-2">
              <span class="text-2xl">🗝️</span>
              <p class="text-sm font-semibold text-rose-200">Your confession is sealed!</p>
              <p class="text-xs text-slate-400">
                ${isRevealed ? 'The seals have broken! Read both confessions below:' : 'Waiting for your partner to seal their envelope...'}
              </p>
            </div>
            `
        }

        <div id="confessionsRevealArea" class="space-y-3 ${isRevealed ? '' : 'hidden'}"></div>
      </div>
    `;

    container.appendChild(div);

    if (isRevealed) {
      renderRevealedConfessions(div.querySelector('#confessionsRevealArea'));
    }
  }

  window.handleSealConfession = function () {
    const textEl = document.getElementById('myConfessionText');
    const text = textEl ? textEl.value.trim() : '';
    if (!text) {
      showToast('Write your confession before sealing!', 'error');
      return;
    }
    audio.playGong();
    sync.submitConfession(text);
  };

  function renderRevealedConfessions(area) {
    if (!area || !gameState) return;
    area.innerHTML = '';

    gameState.players.forEach(p => {
      const conf = gameState.confessions && gameState.confessions[p.id];
      const card = document.createElement('div');
      card.className = 'p-5 rounded-2xl glass-card border border-amber-400/50 space-y-2';
      card.innerHTML = `
        <div class="flex items-center justify-between text-xs text-amber-300 font-semibold">
          <span>${p.avatar} ${escapeHtml(p.name)}'s Confession</span>
          <span class="text-rose-400">Revealed</span>
        </div>
        <p class="text-lg font-cormorant text-amber-100 italic leading-relaxed">
          "${escapeHtml(conf ? conf.text : 'Spoken in silent reverence.')}"
        </p>
      `;
      area.appendChild(card);
    });

    const nextBtn = document.createElement('button');
    nextBtn.className = 'w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-bold text-sm shadow-xl pulse-ring mt-4';
    nextBtn.innerHTML = '✨ Enter the Unwritten Horizon (Destiny Chamber)';
    nextBtn.onclick = () => {
      sync.changeRound(5);
    };
    area.appendChild(nextBtn);
  }

  // Round 5: The Unwritten Horizon (Epilogue Summary)
  function showSummaryScreen() {
    screenLobby.classList.add('hidden');
    screenGame.classList.add('hidden');
    screenSummary.classList.remove('hidden');
    renderEpilogueSummary();
  }

  function renderEpilogueSummary() {
    const container = document.getElementById('summaryContainer');
    if (!container || !gameState) return;

    // Pick an archetype based on sparksScore
    const sparks = gameState.sparksScore || 85;
    const archList = getDecks().archetypes || [
      {
        title: 'The Celestial Alchemists',
        tagline: 'Deep Magnetic Resonance & Electric Tension',
        description: 'Your connection is effortless. You share a rare mix of quiet depth and magnetic attraction.',
        verdict: 'Chemistry: Dangerous · 98% Sparks',
        nextStep: 'Plan a quiet midnight walk under the stars together.'
      }
    ];
    let arch = archList[0];
    if (sparks > 90) arch = archList[0];
    else if (sparks > 65) arch = archList[1] || archList[0];
    else arch = archList[2] || archList[0];

    const p0 = gameState.players[0] || { name: 'Player 1', avatar: '🌙' };
    const p1 = gameState.players[1] || { name: 'Player 2', avatar: '✨' };

    container.innerHTML = `
      <div class="max-w-2xl mx-auto space-y-6 text-center">
        <!-- Header badge -->
        <div class="space-y-2">
          <div class="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-semibold">
            <span>✨</span> THE UNWRITTEN DESTINY UNLOCKED
          </div>
          <h1 class="text-3xl sm:text-4xl font-cinzel text-amber-100 font-black tracking-wide">
            ${arch.title}
          </h1>
          <p class="text-sm font-cormorant text-amber-300 italic text-lg">
            "${arch.tagline}"
          </p>
        </div>

        <!-- Sparks Score Card -->
        <div class="p-6 rounded-3xl glass-card border border-amber-400/30 space-y-4">
          <div class="flex items-center justify-around">
            <div class="text-center">
              <span class="text-4xl">${p0.avatar}</span>
              <p class="text-xs text-amber-200 mt-1 font-semibold">${escapeHtml(p0.name)}</p>
            </div>
            <div class="text-center px-4">
              <span class="text-3xl text-rose-400">⚡</span>
              <p class="text-2xl font-black text-amber-300 font-cinzel">${sparks}%</p>
              <p class="text-[10px] text-slate-400 uppercase tracking-widest">Sparks Generated</p>
            </div>
            <div class="text-center">
              <span class="text-4xl">${p1.avatar}</span>
              <p class="text-xs text-amber-200 mt-1 font-semibold">${escapeHtml(p1.name)}</p>
            </div>
          </div>

          <div class="text-left p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
            <h4 class="text-xs font-bold text-amber-400 uppercase tracking-wider">The Oracle's Verdict:</h4>
            <p class="text-sm text-slate-200 font-cormorant text-base leading-relaxed">
              ${arch.description}
            </p>
            <p class="text-xs text-rose-300 font-semibold pt-1">
              ${arch.verdict}
            </p>
          </div>
        </div>

        <!-- Real-Life Date Proposal Generator -->
        <div class="p-5 rounded-2xl glass-panel border border-rose-500/30 text-left space-y-3">
          <div class="flex items-center justify-between">
            <h4 class="text-xs font-bold text-rose-300 uppercase tracking-wider">✨ Suggested Real-World Next Step:</h4>
            <span class="text-xs text-slate-400">Talking Stage Graduate</span>
          </div>
          <p class="text-sm text-slate-200 font-cormorant text-base">
            ${arch.nextStep}
          </p>
          <button onclick="copyDateInvite()" class="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-slate-950 font-bold text-xs shadow-lg hover:brightness-110 transition-all">
            💌 Copy Official Date Invitation Text
          </button>
        </div>

        <!-- Rule reminder playful banner -->
        <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 italic">
          "And remember the one rule: whoever develops feelings first doesn’t automatically lose. 😂"
        </div>

        <!-- Action buttons -->
        <div class="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button onclick="returnToMap()" class="py-2.5 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-200 border border-amber-500/30 text-xs font-bold">
            🗺️ Back to Map
          </button>
          <button onclick="window.location.reload()" class="py-2.5 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs">
            🔄 New Journey
          </button>
        </div>
      </div>
    `;
  }

  window.copyDateInvite = function () {
    const text = `🌙 We survived all 5 chambers of The Unwritten Map, and the Oracle confirmed our sparks. According to the ancient rules, whoever developed feelings first doesn't lose... so let's make our next chapter real. When are you free for that date?`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showToast('💌 Date invitation copied to clipboard! Send it to them.', 'success');
    }
  };

  window.returnToMap = function () {
    screenSummary.classList.add('hidden');
    screenGame.classList.remove('hidden');
  };

  // Reactions
  window.triggerReaction = function (type) {
    audio.playReaction(type);
    const x = Math.random() * (window.innerWidth - 60) + 30;
    const y = window.innerHeight - 80;
    spawnFloatingReaction(type, x, y);
    sync.sendReaction(type, x, y);
  };

  function spawnFloatingReaction(type, x, y) {
    const iconMap = {
      heart: '❤️',
      blush: '😳',
      spark: '✨',
      firefly: '🌙',
      laugh: '😂'
    };
    const span = document.createElement('div');
    span.className = 'floating-reaction';
    span.textContent = iconMap[type] || '✨';
    span.style.left = `${x}px`;
    span.style.top = `${y}px`;
    document.body.appendChild(span);
    setTimeout(() => {
      if (span.parentNode) span.parentNode.removeChild(span);
    }, 2300);
  }

  // Whispers Chat
  window.toggleWhisperDrawer = function () {
    const drawer = document.getElementById('whisperDrawer');
    whisperDrawerOpen = !whisperDrawerOpen;
    drawer.classList.toggle('translate-x-full', !whisperDrawerOpen);
    if (whisperDrawerOpen) {
      unreadWhispers = 0;
      updateWhisperBadge();
      const input = document.getElementById('whisperInput');
      if (input) input.focus();
    }
  };

  function updateWhisperBadge() {
    const badge = document.getElementById('whisperUnreadBadge');
    if (!badge) return;
    if (unreadWhispers > 0) {
      badge.textContent = unreadWhispers;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  window.handleSendWhisper = function () {
    const input = document.getElementById('whisperInput');
    const msg = input ? input.value.trim() : '';
    if (!msg) return;
    sync.sendWhisper(msg);
    input.value = '';
  };

  function appendWhisper(whisper) {
    const feed = document.getElementById('whisperMessagesList');
    if (!feed) return;
    const isMe = whisper.senderId === sync.playerId;
    const div = document.createElement('div');
    div.className = `flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`;
    div.innerHTML = `
      <span class="text-[10px] text-slate-400">${whisper.senderAvatar} ${escapeHtml(whisper.senderName)}</span>
      <div class="px-3 py-2 rounded-2xl text-xs max-w-[80%] ${
        isMe
          ? 'bg-amber-500 text-slate-950 font-medium rounded-br-none'
          : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'
      }">
        ${escapeHtml(whisper.message)}
      </div>
    `;
    feed.appendChild(div);
    feed.scrollTop = feed.scrollHeight;
  }

  // Audio Toggle
  window.toggleAmbientAudio = function () {
    const isPlaying = audio.toggleAmbient();
    const icon = document.getElementById('audioBtnIcon');
    if (icon) {
      icon.textContent = isPlaying ? '🔊' : '🔇';
    }
    showToast(isPlaying ? '🎶 Ambient night soundscape enabled' : '🔇 Audio muted', 'info');
  };

  // Toast Notification System
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl text-xs font-semibold shadow-2xl backdrop-blur-md transition-all duration-300 ${
      type === 'error'
        ? 'bg-rose-950/90 text-rose-200 border border-rose-500/50'
        : type === 'success'
        ? 'bg-emerald-950/90 text-emerald-200 border border-emerald-500/50'
        : 'bg-slate-900/90 text-amber-200 border border-amber-500/40'
    }`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translate(-50%, -10px)';
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 2800);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Pass and Play / Simulate partner locally for testing
  window.simulateSecondPlayer = function () {
    if (!gameState) return;
    if (gameState.players.length >= 2) {
      showToast('Second traveler is already in the game!', 'info');
      return;
    }
    const mockPartner = {
      id: 'mock-traveler-' + Date.now(),
      index: 1,
      name: 'Elena',
      avatar: '✨',
      archetype: 'The Stargazer',
      passTokens: 2,
      ready: true,
      isHost: false
    };
    gameState.players.push(mockPartner);
    showToast('✨ Partner Elena has joined the journey (Solo Testing Mode)!', 'success');
    renderWaitingPlayers();
  };

  // Init
  window.addEventListener('DOMContentLoaded', () => {
    checkUrlParams();
  });
})();
