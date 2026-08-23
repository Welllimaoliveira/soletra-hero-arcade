/* ===== Enigma dos Símbolos: jogo de matemática/lógica =====
   Mostra pistas (equações com símbolos repetidos) e pede pra criança
   descobrir o valor de cada símbolo somando/combinando as pistas, uma de
   cada vez - cada pista nova só usa UM símbolo desconhecido a mais (junto
   com símbolos que a pista anterior já revelou), então dá pra resolver só
   com soma, subtração e divisão simples, sem precisar de álgebra de verdade.
   O enigma final combina os símbolos já descobertos de um jeito novo. */
(() => {
  const SYMBOL_POOL = ['💎', '🪨', '❤️', '⭐', '🔮', '🌙', '🍀', '🔥'];
  // symbols: quantos símbolos diferentes por enigma. puzzles: quantos
  // enigmas por rodada. maxVal: maior valor possível pra um símbolo.
  const DIFF_CONFIG = {
    easy: { symbols: 2, puzzles: 6, maxVal: 9, label: '🌱 Fácil' },
    medium: { symbols: 3, puzzles: 6, maxVal: 9, label: '🚀 Médio' },
    hard: { symbols: 4, puzzles: 5, maxVal: 12, label: '🔥 Difícil' },
  };

  function randInt(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }

  // Sorteia N valores DISTINTOS entre 2 e maxVal, pra cada símbolo ter uma
  // identidade clara (evita dois símbolos com o mesmo valor, o que deixaria
  // o enigma confuso de menos).
  function distinctValues(n, maxVal) {
    const pool = [];
    for (let v = 2; v <= maxVal; v++) pool.push(v);
    return shuffle(pool).slice(0, n);
  }

  function clueText(terms, value) {
    const parts = terms.map((t) => Array(t.coef).fill(t.sym).join(' + '));
    return `${parts.join(' + ')} = <span class="val">${value}</span>`;
  }

  // Constrói um enigma: N-1 pistas em cadeia (a primeira revela um símbolo
  // sozinho, cada pista seguinte soma um símbolo já conhecido com um novo) e
  // uma pergunta final combinando símbolos já conhecidos de um jeito inédito.
  function buildPuzzle(n, maxVal) {
    const symbols = shuffle(SYMBOL_POOL).slice(0, n);
    const values = distinctValues(n, maxVal);
    const valueOf = {};
    symbols.forEach((s, i) => { valueOf[s] = values[i]; });

    const clues = [];
    const c0 = randInt(2, 3);
    clues.push({ terms: [{ sym: symbols[0], coef: c0 }], value: c0 * valueOf[symbols[0]] });
    for (let i = 1; i < n; i++) {
      const cA = randInt(1, 2), cB = randInt(1, 3);
      clues.push({
        terms: [{ sym: symbols[i - 1], coef: cA }, { sym: symbols[i], coef: cB }],
        value: cA * valueOf[symbols[i - 1]] + cB * valueOf[symbols[i]],
      });
    }

    // Pergunta final: combina o último símbolo com outro símbolo já
    // conhecido (não necessariamente o anterior), com coeficientes novos -
    // pra não ser só repetir uma pista já mostrada.
    let askSymA = symbols[n - 1];
    let otherOptions = symbols.filter((s) => s !== askSymA);
    let askSymB = otherOptions[randInt(0, otherOptions.length - 1)];
    let askCoefA = randInt(1, 3), askCoefB = randInt(1, 3);
    // Garante que a pergunta não seja idêntica a nenhuma pista já dada.
    let attempts = 0;
    while (attempts < 12 && clues.some((c) => sameEquation(c.terms, [{ sym: askSymA, coef: askCoefA }, { sym: askSymB, coef: askCoefB }]))) {
      askCoefA = randInt(1, 3); askCoefB = randInt(1, 3); attempts++;
    }
    const askTerms = [{ sym: askSymA, coef: askCoefA }, { sym: askSymB, coef: askCoefB }];
    const answer = askCoefA * valueOf[askSymA] + askCoefB * valueOf[askSymB];

    return { clues, askTerms, answer, symbols, valueOf };
  }

  function sameEquation(a, b) {
    if (a.length !== b.length) return false;
    const norm = (arr) => arr.map((t) => `${t.sym}:${t.coef}`).sort().join('|');
    return norm(a) === norm(b);
  }

  function answerOptions(correct) {
    const opts = new Set([correct]);
    while (opts.size < 4) {
      const delta = randInt(1, 5) * (Math.random() < 0.5 ? -1 : 1);
      const candidate = correct + delta;
      if (candidate > 0) opts.add(candidate);
    }
    return shuffle([...opts]);
  }

  // ---------- Estado da rodada ----------
  let symbolsState = { difficulty: 'easy', puzzles: [], index: 0, current: null, correct: 0, streak: 0, bestStreak: 0, stars: 0, locked: false, rewardStars: 0, rewardTickets: 0 };

  function startSymbolsRound() {
    const b = blocksData();
    const diff = ['easy', 'medium', 'hard'].includes(b.difficulty) ? b.difficulty : 'easy';
    const cfg = DIFF_CONFIG[diff];
    symbolsState = {
      difficulty: diff,
      puzzles: Array.from({ length: cfg.puzzles }, () => buildPuzzle(cfg.symbols, cfg.maxVal)),
      index: 0, current: null, correct: 0, streak: 0, bestStreak: 0, stars: 0, locked: false, rewardStars: 0, rewardTickets: 0,
    };
    showScreen('symbolsScreen');
    loadSymbolsPuzzle();
  }

  function loadSymbolsPuzzle() {
    if (symbolsState.index >= symbolsState.puzzles.length) { finishSymbolsRound(); return; }
    const puzzle = symbolsState.puzzles[symbolsState.index];
    symbolsState.current = puzzle;
    symbolsState.locked = false;
    const cfg = DIFF_CONFIG[symbolsState.difficulty];
    $('symbolsProgressFill').style.width = Math.round((symbolsState.index / symbolsState.puzzles.length) * 100) + '%';
    $('symbolsCounter').textContent = `Enigma ${symbolsState.index + 1} de ${symbolsState.puzzles.length}`;
    $('symbolsDifficultyPill').textContent = cfg.label;
    $('symbolsStreak').textContent = '🔥 ' + symbolsState.streak;
    $('symbolsStars').textContent = '⭐ ' + symbolsState.stars;
    $('symbolsFeedback').textContent = '';
    $('symbolsMascotText').textContent = 'Some as pistas com calma e descubra o valor de cada símbolo!';
    $('symbolsClues').innerHTML = puzzle.clues.map((c) => `<div class="symbols-clue">${clueText(c.terms, c.value)}</div>`).join('');
    $('symbolsQuestion').innerHTML = `${clueText(puzzle.askTerms, '')}<span class="qmark">?</span>`.replace('= <span class="val"></span>', '=');
    const opts = answerOptions(puzzle.answer);
    $('symbolsAnswers').innerHTML = opts.map((v) => `<button class="math-answer" data-symbols-answer="${v}">${v}</button>`).join('');
    document.querySelectorAll('[data-symbols-answer]').forEach((btn) => btn.onclick = () => answerSymbols(Number(btn.dataset.symbolsAnswer), btn));
  }

  function answerSymbols(value, btn) {
    if (symbolsState.locked) return;
    const correct = symbolsState.current.answer;
    if (value === correct) {
      symbolsState.locked = true;
      btn.classList.add('correct');
      symbolsState.correct++;
      symbolsState.streak++;
      symbolsState.bestStreak = Math.max(symbolsState.bestStreak, symbolsState.streak);
      symbolsState.stars += symbolsState.streak >= 3 ? 3 : symbolsState.streak === 2 ? 2 : 1;
      $('symbolsFeedback').textContent = symbolsState.streak >= 3 ? '🔥 Sequência incrível!' : '✅ Isso mesmo!';
      $('symbolsMascotText').textContent = '🎉 Você decifrou o enigma!';
      setTimeout(() => { symbolsState.index++; loadSymbolsPuzzle(); }, 900);
    } else {
      btn.classList.add('wrong');
      btn.disabled = true;
      symbolsState.streak = 0;
      $('symbolsMascotText').textContent = '🤔 Confira as pistas de novo com calma.';
      setTimeout(() => btn.classList.remove('wrong'), 450);
    }
  }

  function symbolsRewardRating() {
    const max = Math.max(1, symbolsState.puzzles.length * 3);
    const ratio = Math.min(1, symbolsState.stars / max);
    if (ratio >= 0.9) return 5;
    if (ratio >= 0.76) return 4;
    if (ratio >= 0.6) return 3;
    if (ratio >= 0.45) return 2;
    if (ratio >= 0.3) return 1;
    return 0;
  }

  function finishSymbolsRound() {
    symbolsState.rewardStars = symbolsRewardRating();
    symbolsState.rewardTickets = ticketsForRewardStars(symbolsState.rewardStars);
    blocksData().tickets += symbolsState.rewardTickets;
    $('symbolsResultCorrect').textContent = symbolsState.correct;
    $('symbolsResultStreak').textContent = symbolsState.bestStreak;
    $('symbolsResultRating').textContent = '⭐'.repeat(symbolsState.rewardStars) + '☆'.repeat(5 - symbolsState.rewardStars);
    $('symbolsResultTickets').textContent = `+${symbolsState.rewardTickets} fase${symbolsState.rewardTickets === 1 ? '' : 's'} para os minigames`;
    $('symbolsResultText').textContent = `Você decifrou ${symbolsState.correct} de ${symbolsState.puzzles.length} enigmas.`;
    saveDB();
    showScreen('symbolsResultScreen');
  }

  function bind() {
    $('roomSymbolsBtn').onclick = startSymbolsRound;
    $('symbolsExitBtn').onclick = () => { showScreen('gameRoomScreen'); renderGameRoom(); };
    $('symbolsPlayAgainBtn').onclick = startSymbolsRound;
    $('symbolsResultGamesBtn').onclick = () => { showScreen('gameRoomScreen'); renderGameRoom(); };
    $('symbolsResultHomeBtn').onclick = () => { showScreen('homeScreen'); if (typeof renderHome === 'function') renderHome(); };
  }

  // Reaproveita a mesma lista de telas já registrada, só acrescentando as
  // duas novas - segue o mesmo padrão de "última reatribuição vale" já
  // usado nas outras camadas de melhorias deste arquivo.
  function extendShowScreen() {
    showScreen = function (id) {
      ['homeScreen', 'gameScreen', 'resultScreen', 'gameRoomScreen', 'blastPlayScreen', 'blocksPlayScreen', 'charactersScreen', 'storyScreen', 'adventureScreen', 'academyScreen', 'leagueScreen', 'shopScreen', 'mathHomeScreen', 'mathPlayScreen', 'mathResultScreen', 'heroLabScreen', 'nexusScreen', 'snakeScreen', 'raceScreen', 'symbolsScreen', 'symbolsResultScreen'].forEach((x) => { const el = $(x); if (el) el.classList.toggle('hidden', x !== id); });
    };
  }

  function renderRoomStats() {
    // Mostra as melhores marcas guardadas no perfil (se ainda não existirem,
    // cria zeradas) - segue o mesmo padrão de estatísticas dos outros
    // minigames da Hero Arcade.
    const b = blocksData();
    if (!b.symbols) b.symbols = { wins: 0, bestStreak: 0 };
    if ($('symbolsRoomWins')) $('symbolsRoomWins').textContent = b.symbols.wins || 0;
    if ($('symbolsRoomBest')) $('symbolsRoomBest').textContent = b.symbols.bestStreak || 0;
  }
  const _finishSymbolsRoundBase = finishSymbolsRound;
  finishSymbolsRound = function () {
    // Precisa chamar a versão base PRIMEIRO: é ela quem calcula
    // symbolsState.rewardStars. Checar antes disso sempre lia o valor
    // inicial (0) e nunca contava a vitória.
    _finishSymbolsRoundBase();
    const b = blocksData();
    if (!b.symbols) b.symbols = { wins: 0, bestStreak: 0 };
    if (symbolsState.rewardStars >= 3) b.symbols.wins = (b.symbols.wins || 0) + 1;
    b.symbols.bestStreak = Math.max(b.symbols.bestStreak || 0, symbolsState.bestStreak);
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
