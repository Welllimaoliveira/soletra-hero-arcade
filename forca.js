/* ===== Jogo da Forca =====
   O programa sorteia uma palavra do banco (respeitando categoria/nível
   escolhidos na Trilha) e mostra uma dica visual (ícone + categoria) - a
   criança clica letras num teclado na tela pra descobrir a palavra. Cada
   letra clicada é falada em voz alta (ensino) e mostrada na palavra quando
   acerta; letras já tentadas ficam desabilitadas e num quadro do lado, pra
   não repetir. Cada erro desenha mais uma parte do corpo (traço pontilhado)
   no boneco da forca; 6 erros = a forca se completa e a rodada da palavra
   é perdida (mas a palavra certa é sempre revelada e falada, pra ensinar
   mesmo quando erra). */
(() => {
  const MAX_MISSES = 6;
  const WORDS_PER_ROUND = 5;
  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const FACES = ['😀', '😐', '😕', '😟', '😖', '😣', '😵'];

  function normChar(c) {
    return c.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  }
  function isLetterChar(c) {
    return /[a-zA-ZÀ-ÖØ-öø-ÿ]/.test(c);
  }

  // Sorteia o banco de palavras respeitando categoria e nível já escolhidos
  // pela criança na Trilha - assim o tema (inclusive "Bíblia") também vale
  // aqui. Se o filtro ficar pequeno demais (categoria muito nova), relaxa
  // gradualmente até ter palavras suficientes pra montar a rodada.
  function wordPool() {
    let pool = typeof buildBasePool === 'function' ? buildBasePool() : [];
    if (pool.length < WORDS_PER_ROUND) pool = WORDS.filter((w) => state.category === 'Todos' || w.catPT === state.category);
    if (pool.length < WORDS_PER_ROUND) pool = WORDS.slice();
    return pool;
  }

  function buildWordEntry(item) {
    const display = activeText(item);
    const letters = [...display].map((ch) => (isLetterChar(ch) ? { char: ch, norm: normChar(ch), revealed: false } : { char: ch, literal: true, revealed: true }));
    return { item, letters };
  }

  let forcaState = { words: [], index: 0, current: null, misses: 0, guessed: new Set(), correct: 0, streak: 0, bestStreak: 0, stars: 0, locked: false, rewardStars: 0, rewardTickets: 0 };

  function startForcaRound() {
    const pool = shuffle(wordPool());
    const picks = [];
    const usedIds = new Set();
    for (const w of pool) {
      if (picks.length >= WORDS_PER_ROUND) break;
      if (usedIds.has(w.id)) continue;
      usedIds.add(w.id);
      picks.push(w);
    }
    // Se o banco filtrado tiver menos que WORDS_PER_ROUND palavras distintas
    // (categoria muito pequena), completa repetindo embaralhado - melhor
    // repetir uma palavra que travar a rodada.
    while (picks.length < WORDS_PER_ROUND && pool.length) picks.push(pool[picks.length % pool.length]);
    forcaState = {
      words: picks.map(buildWordEntry),
      index: 0, current: null, misses: 0, guessed: new Set(),
      correct: 0, streak: 0, bestStreak: 0, stars: 0, locked: false, rewardStars: 0, rewardTickets: 0,
    };
    showScreen('forcaScreen');
    loadForcaWord();
  }

  function renderKeyboard() {
    $('forcaKeyboard').innerHTML = ALPHABET.map((l) => `<button class="forca-key" data-forca-key="${l}">${l}</button>`).join('');
    document.querySelectorAll('[data-forca-key]').forEach((btn) => { btn.onclick = () => guessForcaLetter(btn.dataset.forcaKey, btn); });
  }

  function renderWord() {
    $('forcaWord').innerHTML = forcaState.current.letters.map((l) => {
      if (l.literal) return `<span class="forca-blank space"></span>`;
      return `<span class="forca-blank${l.revealed ? ' revealed' : ''}">${l.revealed ? l.char : ''}</span>`;
    }).join('');
  }

  function renderFigure() {
    for (let i = 1; i <= MAX_MISSES; i++) {
      const el = $('forcaPart' + i);
      if (el) el.classList.toggle('on', i <= forcaState.misses);
    }
    const face = $('forcaFace');
    if (face) { face.textContent = FACES[Math.min(forcaState.misses, FACES.length - 1)]; face.classList.toggle('on', forcaState.misses < MAX_MISSES); }
    $('forcaLivesLeft').textContent = String(MAX_MISSES - forcaState.misses);
  }

  function loadForcaWord() {
    if (forcaState.index >= forcaState.words.length) { finishForcaRound(); return; }
    forcaState.current = forcaState.words[forcaState.index];
    forcaState.misses = 0;
    forcaState.guessed = new Set();
    forcaState.locked = false;
    $('forcaProgressFill').style.width = Math.round((forcaState.index / forcaState.words.length) * 100) + '%';
    $('forcaCounter').textContent = `Palavra ${forcaState.index + 1} de ${forcaState.words.length}`;
    $('forcaStreak').textContent = '🔥 ' + forcaState.streak;
    $('forcaStars').textContent = '⭐ ' + forcaState.stars;
    $('forcaFeedback').textContent = '';
    $('forcaClueIcon').textContent = forcaState.current.item.icon || '❓';
    $('forcaClueCat').textContent = state.lang === 'pt' ? forcaState.current.item.catPT : forcaState.current.item.catEN;
    // Dica factual automática (hoje só curada pro tema Bíblia) - sem ela,
    // adivinhar nome próprio letra por letra fica quase impossível; com ela
    // a criança já sabe "quem"/"o quê" é antes de começar a chutar letras.
    const hintText = forcaState.current.item.hint;
    const hintEl = $('forcaHintText');
    if (hintEl) { hintEl.hidden = !hintText; hintEl.textContent = hintText ? `💬 ${hintText}` : ''; }
    renderKeyboard();
    renderWord();
    renderFigure();
    renderHintButton();
  }

  // Cada palavra permite até 2 dicas compradas (revela 1 letra aleatória por
  // vez), pagas com as mesmas fichas 🎟️ usadas pra jogar os minigames -
  // assim quem trava numa palavra difícil ainda consegue avançar.
  const MAX_BOUGHT_HINTS = 2;
  function renderHintButton() {
    const btn = $('forcaHintBtn');
    if (!btn) return;
    const used = forcaState.current.hintsUsed || 0;
    const tickets = blocksData().tickets || 0;
    const anyLeft = forcaState.current.letters.some((l) => !l.literal && !l.revealed);
    btn.disabled = forcaState.locked || used >= MAX_BOUGHT_HINTS || tickets < 1 || !anyLeft;
    btn.textContent = used >= MAX_BOUGHT_HINTS ? '💡 Dicas desta palavra esgotadas' : `💡 Usar dica (🎟️ 1) - revela 1 letra`;
  }

  function buyForcaHint() {
    if (forcaState.locked) return;
    const cur = forcaState.current;
    cur.hintsUsed = cur.hintsUsed || 0;
    if (cur.hintsUsed >= MAX_BOUGHT_HINTS) return;
    const b = blocksData();
    if ((b.tickets || 0) < 1) { $('forcaFeedback').textContent = '🎟️ Sem fichas suficientes pra comprar dica agora.'; return; }
    const candidates = cur.letters.filter((l) => !l.literal && !l.revealed);
    if (!candidates.length) return;
    b.tickets -= 1;
    cur.hintsUsed++;
    saveDB();
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    pick.revealed = true;
    renderWord();
    renderHintButton();
    sound('ok');
    speakLetter(pick.norm);
    if (allRevealed()) winForcaWord();
  }

  function allRevealed() {
    return forcaState.current.letters.every((l) => l.revealed);
  }

  function addGuessedChip(letter, hit) {
    const chip = document.createElement('span');
    chip.className = 'forca-chip ' + (hit ? 'hit' : 'miss');
    chip.textContent = letter;
    $('forcaGuessed').appendChild(chip);
  }

  function guessForcaLetter(letter, btn) {
    if (forcaState.locked || forcaState.guessed.has(letter)) return;
    forcaState.guessed.add(letter);
    if (btn) { btn.disabled = true; }
    const matches = forcaState.current.letters.filter((l) => !l.literal && l.norm === letter);
    if (matches.length) {
      matches.forEach((l) => { l.revealed = true; });
      if (btn) btn.classList.add('hit');
      addGuessedChip(letter, true);
      sound('ok');
      speakLetter(letter);
      renderWord();
      if (allRevealed()) winForcaWord();
    } else {
      if (btn) btn.classList.add('miss');
      addGuessedChip(letter, false);
      sound('bad');
      speakLetter(letter);
      forcaState.misses++;
      renderFigure();
      if (forcaState.misses >= MAX_MISSES) loseForcaWord();
    }
  }

  function nextForcaWordSoon(delay) {
    setTimeout(() => { forcaState.index++; loadForcaWord(); }, delay);
  }

  function winForcaWord() {
    if (forcaState.locked) return;
    forcaState.locked = true;
    forcaState.correct++;
    forcaState.streak++;
    forcaState.bestStreak = Math.max(forcaState.bestStreak, forcaState.streak);
    const stars = forcaState.misses === 0 ? 3 : forcaState.misses <= 2 ? 2 : 1;
    forcaState.stars += stars;
    $('forcaStars').textContent = '⭐ ' + forcaState.stars;
    $('forcaFeedback').textContent = `${pickPraise()} ${'⭐'.repeat(stars)}`;
    sound('win');
    if (typeof burstConfetti === 'function') burstConfetti();
    renderHintButton();
    // Configuração "falar a palavra depois de acertar" (padrão ligada) -
    // quando desligada, avança direto, sem esperar a fala terminar.
    const speakAfter = typeof AppSettings === 'undefined' || AppSettings.get('speakAfterCorrect') !== false;
    if (speakAfter) {
      // Só UM caminho agenda o avanço (via callback de fim da fala) - agendar
      // os dois ao mesmo tempo pulava uma palavra a cada acerto.
      speak(activeText(forcaState.current.item), state.lang, undefined, undefined, () => nextForcaWordSoon(700));
    } else {
      nextForcaWordSoon(900);
    }
  }

  function loseForcaWord() {
    if (forcaState.locked) return;
    forcaState.locked = true;
    forcaState.streak = 0;
    forcaState.current.letters.forEach((l) => { if (!l.literal) l.revealed = true; });
    renderWord();
    document.querySelectorAll('[data-forca-key]').forEach((b) => { b.disabled = true; });
    renderHintButton();
    const word = activeText(forcaState.current.item);
    $('forcaFeedback').textContent = state.lang === 'pt' ? `😢 Quase! A palavra era ${word}.` : `😢 So close! The word was ${word}.`;
    sound('bad');
    speak(word, state.lang);
    nextForcaWordSoon(2200);
  }

  function forcaRewardRating() {
    const max = Math.max(1, forcaState.words.length);
    const ratio = forcaState.correct / max;
    if (ratio >= 1 && forcaState.bestStreak >= forcaState.words.length) return 5;
    if (ratio >= 0.8) return 4;
    if (ratio >= 0.6) return 3;
    if (ratio >= 0.4) return 2;
    if (ratio > 0) return 1;
    return 0;
  }

  function finishForcaRound() {
    forcaState.rewardStars = forcaRewardRating();
    forcaState.rewardTickets = ticketsForRewardStars(forcaState.rewardStars);
    blocksData().tickets += forcaState.rewardTickets;
    $('forcaResultEmoji').textContent = forcaState.rewardStars >= 3 ? '🎉' : '💪';
    $('forcaResultTitle').textContent = forcaState.rewardStars >= 3 ? 'Muito bem!' : 'Continue treinando!';
    $('forcaResultCorrect').textContent = forcaState.correct;
    $('forcaResultStreak').textContent = forcaState.bestStreak;
    $('forcaResultRating').textContent = '⭐'.repeat(forcaState.rewardStars) + '☆'.repeat(5 - forcaState.rewardStars);
    $('forcaResultTickets').textContent = `+${forcaState.rewardTickets} fase${forcaState.rewardTickets === 1 ? '' : 's'} para os minigames`;
    $('forcaResultText').textContent = `Você acertou ${forcaState.correct} de ${forcaState.words.length} palavras.`;
    saveDB();
    showScreen('forcaResultScreen');
  }

  function bind() {
    $('roomForcaBtn').onclick = startForcaRound;
    $('forcaHintBtn').onclick = buyForcaHint;
    $('forcaExitBtn').onclick = () => { showScreen('gameRoomScreen'); renderGameRoom(); };
    $('forcaPlayAgainBtn').onclick = startForcaRound;
    $('forcaResultGamesBtn').onclick = () => { showScreen('gameRoomScreen'); renderGameRoom(); };
    $('forcaResultHomeBtn').onclick = () => { showScreen('homeScreen'); if (typeof renderHome === 'function') renderHome(); };
  }

  // Mesmo padrão das outras camadas: reatribui showScreen incluindo as duas
  // telas novas na lista de telas conhecidas.
  function extendShowScreen() {
    const base = showScreen;
    showScreen = function (id) {
      const known = ['forcaScreen', 'forcaResultScreen'];
      if (known.includes(id)) {
        document.querySelectorAll('.screen').forEach((el) => el.classList.toggle('hidden', el.id !== id));
        return;
      }
      base(id);
    };
  }

  function renderRoomStats() {
    const b = blocksData();
    if (!b.forca) b.forca = { wins: 0, bestStreak: 0 };
    if ($('forcaRoomWins')) $('forcaRoomWins').textContent = b.forca.wins || 0;
    if ($('forcaRoomBest')) $('forcaRoomBest').textContent = b.forca.bestStreak || 0;
  }
  const _finishForcaRoundBase = finishForcaRound;
  finishForcaRound = function () {
    _finishForcaRoundBase();
    const b = blocksData();
    if (!b.forca) b.forca = { wins: 0, bestStreak: 0 };
    if (forcaState.rewardStars >= 3) b.forca.wins = (b.forca.wins || 0) + 1;
    b.forca.bestStreak = Math.max(b.forca.bestStreak || 0, forcaState.bestStreak);
    saveDB();
  };
  const _renderGameRoomBase = renderGameRoom;
  renderGameRoom = function () { _renderGameRoomBase(); renderRoomStats(); };

  function init() {
    extendShowScreen();
    bind();
    renderRoomStats();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
