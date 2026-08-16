/**
 * SQUAREWORD ID - Main Game Controller & State Machine
 */

(function () {
    'use strict';

    // Game Configuration
    const MAX_GUESSES = 15;
    const WORD_LENGTH = 5;
    const STORAGE_KEY_DAILY = 'squareword_id_daily_state';
    const STORAGE_KEY_STATS = 'squareword_id_stats';
    const STORAGE_KEY_SETTINGS = 'squareword_id_settings';
    const STORAGE_KEY_SEEN_HELP = 'squareword_id_seen_help';

    // Game State
    let state = {
        mode: 'daily', // 'daily', 'practice', 'archive'
        puzzle: null,
        revealed: Array(5).fill(null).map(() => Array(5).fill(false)),
        guesses: [],
        wordCompletion: {}, // maps 'H_0'..'H_4', 'V_0'..'V_4' to { word, guessNumber }
        currentInput: '',
        isGameOver: false,
        isWon: false,
        isScanning: false,
        helpSlideIndex: 0
    };

    // User Settings
    let settings = {
        darkMode: true,
        sound: true,
        reducedMotion: false,
        practiceDifficulty: 'unlimited' // 'unlimited', '15', '12', '9'
    };

    // User Statistics
    let stats = {
        played: 0,
        won: 0,
        currentStreak: 0,
        maxStreak: 0,
        totalGuesses: 0,
        distribution: Array(MAX_GUESSES + 1).fill(0), // 1..15+
        completedDailyIds: {}
    };

    // DOM Elements
    const elements = {
        boardContainer: document.getElementById('board-container'),
        inputRow: document.getElementById('input-row'),
        inputTiles: document.querySelectorAll('.input-tile'),
        guessCounterTile: document.getElementById('guess-counter-tile'),
        guessNumber: document.getElementById('guess-number'),
        guessLabel: document.getElementById('guess-label'),
        gameModeLabel: document.getElementById('game-mode-label'),
        keyboard: document.getElementById('keyboard'),
        toastContainer: document.getElementById('toast-container'),
        confettiCanvas: document.getElementById('confetti-canvas'),

        // Modals
        modalHelp: document.getElementById('modal-help'),
        modalStats: document.getElementById('modal-stats'),
        modalHistory: document.getElementById('modal-history'),
        modalSettings: document.getElementById('modal-settings'),
        modalArchives: document.getElementById('modal-archives'),

        // Menu Drawer
        menuDrawer: document.getElementById('menu-drawer'),
        menuDrawerBackdrop: document.getElementById('menu-drawer-backdrop'),

        // Header Buttons
        btnMenu: document.getElementById('btn-menu'),
        btnHelp: document.getElementById('btn-help'),
        btnStats: document.getElementById('btn-stats'),
        btnSettings: document.getElementById('btn-settings'),
        btnCloseDrawer: document.getElementById('btn-close-drawer'),

        // Carousel
        carouselSlides: document.querySelectorAll('.carousel-slide'),
        carouselDots: document.querySelectorAll('.carousel-dots .dot'),
        btnCarouselNext: document.getElementById('btn-carousel-next'),

        // Stats Elements
        statPlayed: document.getElementById('stat-played'),
        statWinPct: document.getElementById('stat-win-pct'),
        statCurStreak: document.getElementById('stat-cur-streak'),
        statMaxStreak: document.getElementById('stat-max-streak'),
        statAvgGuesses: document.getElementById('stat-avg-guesses'),
        distChart: document.getElementById('dist-chart'),
        statsFooterSolved: document.getElementById('stats-footer-solved'),
        dailyCountdown: document.getElementById('daily-countdown'),
        btnShare: document.getElementById('btn-share'),
        btnModePracticeFromStats: document.getElementById('btn-mode-practice-from-stats'),

        // History
        historyList: document.getElementById('history-list'),

        // Archives
        archiveGrid: document.getElementById('archive-grid'),

        // Settings Toggles & Actions
        toggleDarkMode: document.getElementById('toggle-dark-mode'),
        toggleSound: document.getElementById('toggle-sound'),
        toggleReducedMotion: document.getElementById('toggle-reduced-motion'),
        toggleFullscreen: document.getElementById('toggle-fullscreen'),
        selectDifficulty: document.getElementById('select-difficulty'),
        settingDifficultyDesc: document.getElementById('setting-difficulty-desc'),
        settingFullscreenDesc: document.getElementById('setting-fullscreen-desc'),

        // Navigation in Drawer
        navDaily: document.getElementById('nav-daily'),
        navPractice: document.getElementById('nav-practice'),
        navArchives: document.getElementById('nav-archives'),
        navStats: document.getElementById('nav-stats'),
        navHelp: document.getElementById('nav-help'),
        navSettings: document.getElementById('nav-settings')
    };

    /* ==========================================================================
       INITIALIZATION
       ========================================================================== */

    function init() {
        loadSettings();
        loadStats();
        setupEventListeners();
        startDailyCountdown();

        // Start Daily Game
        startDailyGame();

        // Check if first-time user
        if (!localStorage.getItem(STORAGE_KEY_SEEN_HELP)) {
            openModal(elements.modalHelp);
            localStorage.setItem(STORAGE_KEY_SEEN_HELP, 'true');
        }
    }

    /* ==========================================================================
       GAME ENGINE & STATE MANAGEMENT
       ========================================================================== */

    function startDailyGame() {
        state.mode = 'daily';
        state.puzzle = getDailyPuzzle();
        state.currentInput = '';
        state.isGameOver = false;
        state.isWon = false;
        state.revealed = Array(5).fill(null).map(() => Array(5).fill(false));
        state.guesses = [];
        state.wordCompletion = {};

        elements.gameModeLabel.textContent = `Teka-Teki Harian #${state.puzzle.id}`;
        updateNavActiveState('daily');

        // Restore saved daily progress if available
        const saved = loadSavedDailyState();
        if (saved && saved.puzzleId === state.puzzle.id) {
            state.guesses = saved.guesses || [];
            // Replay guesses
            replayGuesses();
        }

        renderBoard();
        updateKeyboard();
        updateGuessCounter();
    }

    function startPracticeGame() {
        state.mode = 'practice';
        state.puzzle = getRandomPuzzle();
        state.currentInput = '';
        state.isGameOver = false;
        state.isWon = false;
        state.revealed = Array(5).fill(null).map(() => Array(5).fill(false));
        state.guesses = [];
        state.wordCompletion = {};

        elements.gameModeLabel.textContent = `Mode Bebas (Latihan)`;
        updateNavActiveState('practice');
        closeAllModals();
        closeDrawer();

        renderBoard();
        updateKeyboard();
        updateGuessCounter();
        showToast('Mode Latihan dimulai!');
    }

    function startArchiveGame(puzzleId, dateStr) {
        const index = (puzzleId - 1) % DAILY_PUZZLES.length;
        state.mode = 'archive';
        state.puzzle = {
            id: puzzleId,
            date: dateStr,
            grid: DAILY_PUZZLES[index]
        };
        state.currentInput = '';
        state.isGameOver = false;
        state.isWon = false;
        state.revealed = Array(5).fill(null).map(() => Array(5).fill(false));
        state.guesses = [];
        state.wordCompletion = {};

        elements.gameModeLabel.textContent = `Arsip Teka-Teki #${state.puzzle.id}`;
        updateNavActiveState('archives');
        closeAllModals();
        closeDrawer();

        renderBoard();
        updateKeyboard();
        updateGuessCounter();
        showToast(`Memuat Teka-Teki #${puzzleId}`);
    }

    function replayGuesses() {
        const savedGuesses = [...state.guesses];
        state.guesses = [];
        for (const guess of savedGuesses) {
            evaluateGuess(guess, false);
        }
    }

    /* ==========================================================================
       INPUT & GUESS PROCESSING
       ========================================================================== */

    function handleKeyPress(key) {
        if (state.isGameOver || state.isScanning) return;

        key = key.toUpperCase();

        if (key === 'ENTER') {
            submitGuess();
        } else if (key === 'BACKSPACE' || key === 'DELETE') {
            if (state.currentInput.length > 0) {
                state.currentInput = state.currentInput.slice(0, -1);
                sounds.playDelete();
                renderBoardInputPreview();
            }
        } else if (/^[A-Z]$/.test(key)) {
            if (state.currentInput.length < WORD_LENGTH) {
                state.currentInput += key;
                sounds.playKey();
                renderBoardInputPreview();
            }
        }
    }

    async function submitGuess() {
        if (state.isScanning) return;

        const guess = state.currentInput.trim().toLowerCase();

        // 1. Length Check
        if (guess.length < WORD_LENGTH) {
            sounds.playInvalid();
            shakeInputRow();
            showToast('Kata kurang dari 5 huruf');
            return;
        }

        // 2. Dictionary Check
        if (!VALID_WORDS_SET.has(guess)) {
            sounds.playInvalid();
            shakeInputRow();
            showToast('Kata tidak ditemukan dalam kamus');
            return;
        }

        // Track rows and columns that were already fully solved before this guess
        const prevSolvedRows = Array(5).fill(false);
        const prevSolvedCols = Array(5).fill(false);
        for (let r = 0; r < 5; r++) {
            prevSolvedRows[r] = state.revealed[r].every(v => v);
        }
        for (let c = 0; c < 5; c++) {
            let colSolved = true;
            for (let r = 0; r < 5; r++) {
                if (!state.revealed[r][c]) {
                    colSolved = false;
                    break;
                }
            }
            prevSolvedCols[c] = colSolved;
        }

        // 3. Lock input and start Downwards Scan Wave
        state.isScanning = true;
        state.guesses.push(guess);

        const isReducedMotion = settings.reducedMotion;
        const stepDelay = isReducedMotion ? 0 : 180;

        // Perform scan row by row from top to bottom (row 0 to 4)
        for (let r = 0; r < 5; r++) {
            const rowElem = document.getElementById(`puzzle-row-${r}`);
            if (rowElem) {
                rowElem.classList.add('row-scanning');
            }

            sounds.playScanRow(r);

            const targetRow = state.puzzle.grid[r];
            let rowRevealedNew = false;
            const newlyRevealedCols = [];

            // Check matching letters in row r
            for (let c = 0; c < 5; c++) {
                if (guess[c] === targetRow[c]) {
                    if (!state.revealed[r][c]) {
                        state.revealed[r][c] = true;
                        rowRevealedNew = true;
                        newlyRevealedCols.push(c);
                    }
                }
            }

            // Update and render ALL revealed tiles in row r (ensures existing green letters stay visible)
            if (rowElem) {
                const tiles = rowElem.querySelectorAll('.tile.puzzle-tile');
                for (let c = 0; c < 5; c++) {
                    const tile = tiles[c];
                    if (!tile) continue;
                    const letterSpan = tile.querySelector('.letter');
                    if (state.revealed[r][c]) {
                        tile.classList.add('correct');
                        if (letterSpan) {
                            letterSpan.textContent = targetRow[c].toUpperCase();
                        } else {
                            tile.innerHTML = `<span class="letter">${targetRow[c].toUpperCase()}</span>`;
                        }
                    }
                }
                // Trigger flip animation specifically on newly revealed tiles in this step
                newlyRevealedCols.forEach(c => {
                    const tile = tiles[c];
                    if (tile) {
                        tile.classList.remove('tile-flip');
                        void tile.offsetWidth;
                        tile.classList.add('tile-flip');
                    }
                });
            }

            if (rowRevealedNew) {
                sounds.playGreenChime();
            }

            // Check if this entire HORIZONTAL row is now 100% solved (5 green letters)
            const isRowNowSolved = state.revealed[r].every(v => v);
            if (isRowNowSolved && !prevSolvedRows[r]) {
                sounds.playRowSolved();
                if (!state.wordCompletion['H_' + r]) {
                    state.wordCompletion['H_' + r] = {
                        word: targetRow,
                        guessNumber: state.guesses.length,
                        type: 'H'
                    };
                }
                if (rowElem) {
                    rowElem.classList.add('row-complete');
                    const tiles = rowElem.querySelectorAll('.tile.puzzle-tile');
                    tiles.forEach((tile, c) => {
                        tile.classList.remove('tile-wave');
                        void tile.offsetWidth; // force reflow
                        tile.style.animationDelay = `${c * 110}ms`;
                        tile.classList.add('tile-wave');
                    });
                }
            }

            // Update Yellow Clue Box for row r with bounce animation
            renderRowClues(r, true);

            if (stepDelay > 0) {
                await new Promise(resolve => setTimeout(resolve, stepDelay + (newlyRevealedCols.length > 0 ? 100 : 0)));
            }

            if (rowElem) {
                rowElem.classList.remove('row-scanning');
            }
        }

        // Check if any VERTICAL column is newly 100% solved by this guess
        for (let c = 0; c < 5; c++) {
            let isColNowSolved = true;
            for (let r = 0; r < 5; r++) {
                if (!state.revealed[r][c]) {
                    isColNowSolved = false;
                    break;
                }
            }
            if (isColNowSolved && !prevSolvedCols[c]) {
                sounds.playRowSolved();
                if (!state.wordCompletion['V_' + c]) {
                    const colWord = state.puzzle.grid.map(row => row[c]).join('');
                    state.wordCompletion['V_' + c] = {
                        word: colWord,
                        guessNumber: state.guesses.length,
                        type: 'V'
                    };
                }
                // Trigger vertical bounce wave down this column
                for (let r = 0; r < 5; r++) {
                    const tile = document.querySelector(`.puzzle-tile[data-row="${r}"][data-col="${c}"]`);
                    if (tile) {
                        tile.classList.remove('tile-wave');
                        void tile.offsetWidth;
                        tile.style.animationDelay = `${r * 110}ms`;
                        tile.classList.add('tile-wave');
                    }
                }
                await new Promise(resolve => setTimeout(resolve, 380));
            }
        }

        // 4. Finalize Guess processing
        state.currentInput = '';
        state.isScanning = false;

        renderBoardInputPreview();
        renderBoard();
        updateKeyboard();
        updateGuessCounter();

        // 5. Save state if daily mode
        if (state.mode === 'daily') {
            saveDailyState();
        }

        // 6. Check End Conditions
        checkGameStatus();
    }

    function evaluateGuess(guess, isLive = true) {
        state.guesses.push(guess);

        let newRevealedCount = 0;

        // Evaluate matches against all 5 rows
        for (let r = 0; r < 5; r++) {
            const targetRow = state.puzzle.grid[r];
            for (let c = 0; c < 5; c++) {
                if (guess[c] === targetRow[c]) {
                    if (!state.revealed[r][c]) {
                        state.revealed[r][c] = true;
                        newRevealedCount++;
                    }
                }
            }
        }

        // Track completed horizontal rows
        for (let r = 0; r < 5; r++) {
            if (state.revealed[r].every(v => v) && !state.wordCompletion['H_' + r]) {
                state.wordCompletion['H_' + r] = {
                    word: state.puzzle.grid[r],
                    guessNumber: state.guesses.length,
                    type: 'H'
                };
            }
        }

        // Track completed vertical columns
        for (let c = 0; c < 5; c++) {
            let colSolved = true;
            for (let r = 0; r < 5; r++) {
                if (!state.revealed[r][c]) {
                    colSolved = false;
                    break;
                }
            }
            if (colSolved && !state.wordCompletion['V_' + c]) {
                const colWord = state.puzzle.grid.map(row => row[c]).join('');
                state.wordCompletion['V_' + c] = {
                    word: colWord,
                    guessNumber: state.guesses.length,
                    type: 'V'
                };
            }
        }

        if (isLive) {
            if (newRevealedCount > 0) {
                sounds.playGreenChime();
            } else {
                sounds.playFlip(0);
            }
        }
    }

    function getMaxGuessesForCurrentMode() {
        if (state.mode === 'daily' || state.mode === 'archive') {
            return Infinity; // Mode Daily & Archive tanpa batas kesempatan menebak
        }
        // Mode Latihan
        const diff = settings.practiceDifficulty || 'unlimited';
        if (diff === 'unlimited') return Infinity;
        return parseInt(diff, 10) || Infinity;
    }

    function checkGameStatus() {
        // Check if all 25 cells are revealed
        let allSolved = true;
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
                if (!state.revealed[r][c]) {
                    allSolved = false;
                    break;
                }
            }
        }

        const maxGuesses = getMaxGuessesForCurrentMode();

        if (allSolved) {
            state.isWon = true;
            state.isGameOver = true;
            onGameWon();
        } else if (state.guesses.length >= maxGuesses) {
            state.isWon = false;
            state.isGameOver = true;
            onGameLost();
        }
    }

    async function onGameWon() {
        triggerConfetti();

        // 1. Perayaan Gelombang Kata Mendatar (Baris 0 s/d 4 satu per satu)
        for (let r = 0; r < 5; r++) {
            const rowElem = document.getElementById(`puzzle-row-${r}`);
            if (rowElem) {
                const tiles = rowElem.querySelectorAll('.tile.puzzle-tile');
                tiles.forEach((tile, c) => {
                    tile.classList.remove('tile-wave');
                    void tile.offsetWidth;
                    tile.style.animationDelay = `${c * 110}ms`;
                    tile.classList.add('tile-wave');
                });
                sounds.playRowSolved();
            }
            await new Promise(res => setTimeout(res, 460));
        }

        await new Promise(res => setTimeout(res, 200));

        // 2. Perayaan Gelombang Kata Menurun (Kolom 0 s/d 4 satu per satu)
        for (let c = 0; c < 5; c++) {
            for (let r = 0; r < 5; r++) {
                const tile = document.querySelector(`.puzzle-tile[data-row="${r}"][data-col="${c}"]`);
                if (tile) {
                    tile.classList.remove('tile-wave');
                    void tile.offsetWidth;
                    tile.style.animationDelay = `${r * 110}ms`;
                    tile.classList.add('tile-wave');
                }
            }
            sounds.playRowSolved();
            await new Promise(res => setTimeout(res, 460));
        }

        sounds.playWin();

        // Record Stats
        if (state.mode === 'daily') {
            recordGameStats(true, state.guesses.length, state.puzzle.id);
            saveDailyState();
        }

        setTimeout(() => {
            showToast(`Luar biasa! Berhasil diselesaikan dalam ${state.guesses.length} tebakan! 🎉`);
            renderStatsModal(true);
            openModal(elements.modalStats);
        }, 700);
    }

    function onGameLost() {
        if (state.mode === 'daily') {
            recordGameStats(false, state.guesses.length, state.puzzle.id);
            saveDailyState();
        }

        // Reveal full board on loss
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
                state.revealed[r][c] = true;
            }
        }
        renderBoard();

        const maxGuesses = getMaxGuessesForCurrentMode();
        setTimeout(() => {
            showToast(`Kesempatan tebakan (${maxGuesses}) habis! Coba lagi.`);
            renderStatsModal(true);
            openModal(elements.modalStats);
        }, 1200);
    }

    /* ==========================================================================
       RENDERING & UI UPDATES
       ========================================================================== */

    function renderBoard() {
        for (let r = 0; r < 5; r++) {
            const targetRow = state.puzzle.grid[r];
            const rowElem = document.getElementById(`puzzle-row-${r}`);
            if (!rowElem) continue;

            const tiles = rowElem.querySelectorAll('.tile.puzzle-tile');
            let isRowComplete = true;

            for (let c = 0; c < 5; c++) {
                const tile = tiles[c];
                if (!tile) continue;
                const letterSpan = tile.querySelector('.letter');

                if (state.revealed[r][c]) {
                    tile.classList.add('correct');
                    if (letterSpan) {
                        letterSpan.textContent = targetRow[c].toUpperCase();
                    } else {
                        tile.innerHTML = `<span class="letter">${targetRow[c].toUpperCase()}</span>`;
                    }
                } else {
                    isRowComplete = false;
                    tile.classList.remove('correct');
                    if (letterSpan) {
                        letterSpan.textContent = '';
                    } else {
                        tile.innerHTML = `<span class="letter"></span>`;
                    }
                }
            }

            if (isRowComplete) {
                rowElem.classList.add('row-complete');
            } else {
                rowElem.classList.remove('row-complete');
            }

            // Render Row Clue Box
            renderRowClues(r);
        }

        // Render top real-time input preview
        renderBoardInputPreview();
    }

    function renderBoardInputPreview() {
        const tiles = elements.boardContainer.querySelectorAll('.input-tile');
        for (let c = 0; c < 5; c++) {
            const tile = tiles[c];
            if (!tile) continue;
            const letterSpan = tile.querySelector('.letter');

            if (c < state.currentInput.length) {
                tile.className = 'tile input-tile typed';
                if (letterSpan) {
                    letterSpan.textContent = state.currentInput[c].toUpperCase();
                }
            } else {
                tile.className = 'tile input-tile';
                if (letterSpan) {
                    letterSpan.textContent = '';
                }
            }
        }
    }

    function renderRowClues(r, animate = false) {
        const clueContainer = document.getElementById(`clue-row-${r}`);
        if (!clueContainer) return;
        const lettersBox = clueContainer.querySelector('.clue-letters');
        const targetRow = state.puzzle.grid[r];

        // 1. Calculate unplaced target letters in row r
        const unplacedCounts = {};
        for (let c = 0; c < 5; c++) {
            if (!state.revealed[r][c]) {
                const char = targetRow[c];
                unplacedCounts[char] = (unplacedCounts[char] || 0) + 1;
            }
        }

        // 2. Count maximum occurrences of each letter guessed across all guesses
        const maxGuessedCounts = {};
        for (const guess of state.guesses) {
            const guessFreq = {};
            for (const char of guess) {
                guessFreq[char] = (guessFreq[char] || 0) + 1;
            }
            for (const char in guessFreq) {
                maxGuessedCounts[char] = Math.max(maxGuessedCounts[char] || 0, guessFreq[char]);
            }
        }

        // 3. For row r, the gold clue letters are the unplaced letters that were guessed
        const clueLetters = [];
        for (const char in unplacedCounts) {
            const availableToClue = Math.min(unplacedCounts[char], maxGuessedCounts[char] || 0);
            for (let i = 0; i < availableToClue; i++) {
                clueLetters.push(char.toUpperCase());
            }
        }

        // Sort alphabetically
        clueLetters.sort();

        // Render to DOM
        if (clueLetters.length > 0) {
            clueContainer.classList.add('has-clues');
            if (animate) {
                clueContainer.classList.remove('clue-pop');
                void clueContainer.offsetWidth; // Force reflow
                clueContainer.classList.add('clue-pop');
            }
            lettersBox.className = `clue-letters count-${Math.min(clueLetters.length, 5)}`;
            lettersBox.innerHTML = clueLetters
                .map(char => `<span class="clue-letter-char">${char}</span>`)
                .join('');
        } else {
            clueContainer.classList.remove('has-clues', 'clue-pop');
            lettersBox.className = 'clue-letters';
            lettersBox.innerHTML = '';
        }
    }

    function updateKeyboard() {
        // Collect occurrences of all letters across the 5x5 target grid
        const totalCharCount = {};
        const revealedCharCount = {};
        const guessedLetters = new Set();

        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
                const char = state.puzzle.grid[r][c].toUpperCase();
                totalCharCount[char] = (totalCharCount[char] || 0) + 1;
                if (state.revealed[r][c]) {
                    revealedCharCount[char] = (revealedCharCount[char] || 0) + 1;
                }
            }
        }

        for (const guess of state.guesses) {
            for (const char of guess) {
                guessedLetters.add(char.toUpperCase());
            }
        }

        const keys = elements.keyboard.querySelectorAll('.key[data-key]');
        keys.forEach(key => {
            const letter = key.getAttribute('data-key');
            if (letter === 'ENTER' || letter === 'BACKSPACE') return;

            key.classList.remove('green', 'yellow', 'grey');

            if (guessedLetters.has(letter)) {
                if (!totalCharCount[letter]) {
                    // Not in the 5x5 square at all
                    key.classList.add('grey');
                } else if ((revealedCharCount[letter] || 0) >= totalCharCount[letter]) {
                    // All occurrences are correctly placed
                    key.classList.add('green');
                } else {
                    // In square, but unplaced occurrences remain
                    key.classList.add('yellow');
                }
            }
        });
    }

    function updateGuessCounter() {
        const maxGuesses = getMaxGuessesForCurrentMode();
        if (elements.guessNumber) {
            if (maxGuesses === Infinity) {
                // Mode Tanpa Batas (Bebas / Daily): Tampilkan total tebakan yang sudah dilakukan
                elements.guessNumber.textContent = state.guesses.length;
                if (elements.guessLabel) {
                    elements.guessLabel.textContent = '(LIHAT)';
                }
                if (elements.guessCounterTile) {
                    elements.guessCounterTile.title = `Tebakan ke-${state.guesses.length} (Klik untuk lihat riwayat)`;
                }
            } else {
                // Mode Berbatas (Sedang 15, Sulit 12, Ekstrem 9): Tampilkan sisa kesempatan menebak
                const remaining = Math.max(0, maxGuesses - state.guesses.length);
                elements.guessNumber.textContent = remaining;
                if (elements.guessLabel) {
                    elements.guessLabel.textContent = 'SISA';
                }
                if (elements.guessCounterTile) {
                    elements.guessCounterTile.title = `Sisa ${remaining} dari ${maxGuesses} kesempatan (Klik untuk lihat riwayat)`;
                }
            }
        }
    }

    function shakeInputRow() {
        if (elements.inputRow) {
            elements.inputRow.classList.remove('shake');
            void elements.inputRow.offsetWidth; // Force reflow
            elements.inputRow.classList.add('shake');
        }
    }

    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        elements.toastContainer.appendChild(toast);

        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 2600);
    }

    /* ==========================================================================
       MODALS & CAROUSEL CONTROLLERS
       ========================================================================== */

    function openModal(modal) {
        closeAllModals();
        modal.classList.remove('hidden');
    }

    function closeModal(modal) {
        modal.classList.add('hidden');
    }

    function closeAllModals() {
        [elements.modalHelp, elements.modalStats, elements.modalHistory, elements.modalSettings, elements.modalArchives].forEach(m => {
            if (m) m.classList.add('hidden');
        });
    }

    function updateCarouselSlide(index) {
        state.helpSlideIndex = Math.max(0, Math.min(index, elements.carouselSlides.length - 1));

        elements.carouselSlides.forEach((slide, i) => {
            slide.classList.toggle('active', i === state.helpSlideIndex);
        });

        elements.carouselDots.forEach((dot, i) => {
            dot.classList.toggle('active', i === state.helpSlideIndex);
        });

        if (state.helpSlideIndex === elements.carouselSlides.length - 1) {
            elements.btnCarouselNext.textContent = 'MENGERTI!';
        } else {
            elements.btnCarouselNext.textContent = 'LANJUT';
        }
    }

    let activeHighlightedLetter = null;

    function renderHistoryModal() {
        elements.historyList.innerHTML = '';
        activeHighlightedLetter = null;

        if (state.guesses.length === 0) {
            elements.historyList.innerHTML = '<p class="empty-history-text">Belum ada tebakan yang dimasukkan.</p>';
            return;
        }

        state.guesses.forEach((guess) => {
            const row = document.createElement('div');
            row.className = 'history-guess-row';

            for (let i = 0; i < guess.length; i++) {
                const char = guess[i].toUpperCase();
                const tile = document.createElement('div');
                tile.className = 'history-letter-tile';
                tile.setAttribute('data-char', char);
                tile.textContent = char;

                tile.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const clickedChar = tile.getAttribute('data-char');
                    if (activeHighlightedLetter === clickedChar) {
                        activeHighlightedLetter = null; // Toggle off
                    } else {
                        activeHighlightedLetter = clickedChar; // Highlight new letter
                    }
                    updateHistoryHighlights();
                });

                row.appendChild(tile);
            }

            elements.historyList.appendChild(row);
        });
    }

    function updateHistoryHighlights() {
        const allTiles = elements.historyList.querySelectorAll('.history-letter-tile');
        allTiles.forEach(tile => {
            if (activeHighlightedLetter && tile.getAttribute('data-char') === activeHighlightedLetter) {
                tile.classList.add('highlighted');
            } else {
                tile.classList.remove('highlighted');
            }
        });
    }

    function renderStatsModal(forceResultTab = false) {
        // 1. Top Metrics
        if (elements.statPlayed) elements.statPlayed.textContent = stats.played;
        if (elements.statCurStreak) elements.statCurStreak.textContent = stats.currentStreak;
        if (elements.statMaxStreak) elements.statMaxStreak.textContent = stats.maxStreak;

        const avg = stats.won > 0 ? (stats.totalGuesses / stats.won).toFixed(1) : '-';
        const intAvg = stats.won > 0 ? Math.round(stats.totalGuesses / stats.won) : '-';
        if (elements.statAvgGuesses) elements.statAvgGuesses.textContent = intAvg;
        const statMonthlyAvg = document.getElementById('stat-monthly-avg');
        if (statMonthlyAvg) statMonthlyAvg.textContent = intAvg;

        // Determine default active tab: if game is ongoing, default to 'bars' (career stats) without spoiling target words
        const isGameEnded = state.isGameOver;
        const defaultTab = (isGameEnded || forceResultTab) ? 'result' : 'bars';
        
        document.querySelectorAll('.stats-tab-btn').forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-stats-tab') === defaultTab);
        });
        document.querySelectorAll('.stats-tab-panel').forEach(p => {
            p.classList.toggle('active', p.id === `panel-${defaultTab}`);
        });

        // 2. Tab 1: RESULT Panel
        const resultHeadline = document.getElementById('result-headline');
        const resultQuoteContainer = document.getElementById('result-quote-container');
        const badgesContainer = document.getElementById('word-badges-container');
        const resultSubheading = document.querySelector('.result-subheading');

        if (!isGameEnded) {
            // Game is still ONGOING: DO NOT SPOIL / LEAK TARGET WORDS!
            if (resultHeadline) {
                const puzzleId = state.puzzle ? state.puzzle.id : 1;
                resultHeadline.textContent = `SquareWord ${puzzleId} (Sedang Berjalan)`;
            }
            if (resultSubheading) {
                resultSubheading.style.display = 'none';
            }
            if (badgesContainer) {
                badgesContainer.innerHTML = `
                    <div class="result-locked-state">
                        <div class="locked-icon">🔒</div>
                        <div class="locked-title">Teka-Teki Masih Berlangsung</div>
                        <div class="locked-desc">Selesaikan teka-teki saat ini untuk membuka rincian kata dan perolehan tebakan Anda!</div>
                    </div>
                `;
            }
            if (resultQuoteContainer) {
                resultQuoteContainer.style.display = 'none';
            }
        } else {
            // Game is FINISHED: Show all 10 solved words with their guess counts!
            if (resultHeadline) {
                const puzzleId = state.puzzle ? state.puzzle.id : 1;
                resultHeadline.textContent = `SquareWord ${puzzleId} : ${state.guesses.length} guesses!`;
            }
            if (resultSubheading) {
                resultSubheading.style.display = 'block';
            }
            if (resultQuoteContainer) {
                resultQuoteContainer.style.display = 'block';
            }

            if (badgesContainer && state.puzzle && state.puzzle.grid) {
                const wordsList = [];
                // 5 Horizontal rows
                for (let r = 0; r < 5; r++) {
                    const hWord = state.puzzle.grid[r];
                    const hComp = state.wordCompletion && state.wordCompletion['H_' + r];
                    wordsList.push({
                        word: hWord,
                        guessNumber: hComp ? hComp.guessNumber : state.guesses.length
                    });
                }
                // 5 Vertical columns
                for (let c = 0; c < 5; c++) {
                    const vWord = state.puzzle.grid.map(row => row[c]).join('');
                    const vComp = state.wordCompletion && state.wordCompletion['V_' + c];
                    wordsList.push({
                        word: vWord,
                        guessNumber: vComp ? vComp.guessNumber : state.guesses.length
                    });
                }

                // Sort by guessNumber ascending (lowest to highest)
                wordsList.sort((a, b) => a.guessNumber - b.guessNumber);

                badgesContainer.innerHTML = wordsList.map(item => {
                    let numClass = 'num-green';
                    if (item.guessNumber > 17) numClass = 'num-red';
                    else if (item.guessNumber > 12) numClass = 'num-orange';
                    else if (item.guessNumber > 7) numClass = 'num-yellow';

                    return `<div class="word-pill-badge">
                        <span class="badge-number ${numClass}">${item.guessNumber}</span>
                        <span class="badge-text">${item.word.toLowerCase()}</span>
                    </div>`;
                }).join('');
            }
        }

        // 3. Tab 2: BARS Panel (Distribution)
        if (elements.distChart) {
            elements.distChart.innerHTML = '';
            const nonZeroGuesses = Object.keys(stats.distribution).map(Number).filter(k => stats.distribution[k] > 0);
            const maxDisplayedGuess = Math.max(15, ...nonZeroGuesses, state.isWon ? state.guesses.length : 0);
            const maxVal = Math.max(1, ...Object.values(stats.distribution));

            for (let i = 1; i <= maxDisplayedGuess; i++) {
                const count = stats.distribution[i] || 0;
                const pct = Math.max(7, Math.round((count / maxVal) * 100));

                const isWinningGuess = state.isWon && state.guesses.length === i;

                const row = document.createElement('div');
                row.className = 'dist-row';
                row.innerHTML = `
                    <div class="dist-num">${i}</div>
                    <div class="dist-bar-container">
                        <div class="dist-bar ${isWinningGuess ? 'highlight' : ''}" style="width: ${pct}%">${count}</div>
                    </div>
                `;
                elements.distChart.appendChild(row);
            }
        }

        // 4. Tab 3: PERIODS Panel
        const periodPlayed = document.getElementById('period-played');
        if (periodPlayed) periodPlayed.textContent = stats.played;

        const periodWinPct = document.getElementById('period-win-pct');
        const winPct = stats.played > 0 ? Math.round((stats.won / stats.played) * 100) : 0;
        if (periodWinPct) periodWinPct.textContent = `${winPct}%`;

        const periodMonthlyAvg = document.getElementById('period-monthly-avg');
        if (periodMonthlyAvg) periodMonthlyAvg.textContent = intAvg;

        const periodTotalAvg = document.getElementById('period-total-avg');
        if (periodTotalAvg) periodTotalAvg.textContent = avg;

        // 5. Tab 4: DAYS Panel
        const daysHistoryList = document.getElementById('days-history-list');
        if (daysHistoryList) {
            daysHistoryList.innerHTML = '';
            const completedIds = Object.keys(stats.completedDailyIds).map(Number).sort((a, b) => b - a);
            if (completedIds.length === 0) {
                daysHistoryList.innerHTML = '<p class="empty-history-text">Belum ada teka-teki harian yang selesai.</p>';
            } else {
                completedIds.forEach(id => {
                    const date = new Date(2026, 0, 1 + (id - 1));
                    const dateFormatted = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                    const card = document.createElement('div');
                    card.className = 'day-history-card';
                    card.innerHTML = `
                        <div>
                            <span class="day-history-id">SquareWord #${id}</span>
                            <div class="day-history-date">${dateFormatted}</div>
                        </div>
                        <div class="day-history-guesses">✓ Selesai</div>
                    `;
                    daysHistoryList.appendChild(card);
                });
            }
        }

        // 6. Next Puzzle Timer visibility: Only display on daily mode
        const nextTimerElem = document.getElementById('stats-next-timer');
        if (nextTimerElem) {
            if (state.mode === 'daily') {
                nextTimerElem.style.display = 'block';
            } else {
                nextTimerElem.style.display = 'none';
            }
        }

        // 7. Practice / Action button text in modal footer
        if (elements.btnModePracticeFromStats) {
            if (state.mode === 'practice') {
                elements.btnModePracticeFromStats.textContent = 'Mainkan Teka-Teki Baru (Acak)';
            } else {
                elements.btnModePracticeFromStats.textContent = 'Mainkan Mode Latihan Bebas';
            }
        }
    }

    function renderArchivesModal() {
        elements.archiveGrid.innerHTML = '';
        const currentDaily = getDailyPuzzle();
        const totalPuzzles = currentDaily.id;

        for (let i = totalPuzzles; i >= 1; i--) {
            const date = new Date(2026, 0, 1 + (i - 1));
            const dateFormatted = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
            const isSolved = !!stats.completedDailyIds[i];

            const card = document.createElement('button');
            card.className = `archive-card-btn ${isSolved ? 'solved' : ''}`;
            card.innerHTML = `
                <span class="archive-card-num">#${i}</span>
                <span class="archive-card-date">${dateFormatted}</span>
                ${isSolved ? '<span class="archive-card-status">✓ Selesai</span>' : ''}
            `;

            card.addEventListener('click', () => {
                startArchiveGame(i, date.toISOString().split('T')[0]);
            });

            elements.archiveGrid.appendChild(card);
        }
    }

    function shareResult() {
        const guessCount = state.guesses.length;
        const puzzleId = state.puzzle ? state.puzzle.id : 1;

        let emojiGrid = '';
        for (let r = 0; r < 5; r++) {
            let rowEmoji = '';
            for (let c = 0; c < 5; c++) {
                rowEmoji += '🟩';
            }
            emojiGrid += rowEmoji + '\n';
        }

        const shareText = `SquareWord ${puzzleId} : ${guessCount} guesses!\n\n${emojiGrid}\nhttps://squareword.org/`;

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(shareText).then(() => {
                showToast('Hasil disalin ke papan klip! 📋');
            }).catch(() => {
                showToast('Gagal menyalin hasil');
            });
        } else {
            showToast('Hasil siap dibagikan!');
        }
    }

    /* ==========================================================================
       STORAGE & PERSISTENCE
       ========================================================================== */

    function saveDailyState() {
        const data = {
            puzzleId: state.puzzle.id,
            date: state.puzzle.date,
            guesses: state.guesses,
            isWon: state.isWon,
            isGameOver: state.isGameOver
        };
        localStorage.setItem(STORAGE_KEY_DAILY, JSON.stringify(data));
    }

    function loadSavedDailyState() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_DAILY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    function recordGameStats(won, guessCount, dailyId) {
        stats.played++;
        if (won) {
            stats.won++;
            stats.currentStreak++;
            stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak);
            stats.totalGuesses += guessCount;
            stats.distribution[guessCount] = (stats.distribution[guessCount] || 0) + 1;
            if (dailyId) {
                stats.completedDailyIds[dailyId] = true;
            }
        } else {
            stats.currentStreak = 0;
        }
        localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(stats));
    }

    function loadStats() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_STATS);
            if (raw) {
                const parsed = JSON.parse(raw);
                stats = { ...stats, ...parsed };
            }
        } catch (e) {}
    }

    function loadSettings() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
            if (raw) {
                settings = { ...settings, ...JSON.parse(raw) };
            }
        } catch (e) {}

        applySettings();
    }

    function saveSettings() {
        localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
        applySettings();
    }

    function applySettings() {
        // Dark Mode
        if (settings.darkMode) {
            document.body.classList.remove('light-theme');
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
            document.body.classList.add('light-theme');
        }
        if (elements.toggleDarkMode) elements.toggleDarkMode.checked = settings.darkMode;

        // Sound
        sounds.setEnabled(settings.sound);
        if (elements.toggleSound) elements.toggleSound.checked = settings.sound;

        // Reduced Motion
        if (settings.reducedMotion) {
            document.body.classList.add('reduced-motion');
        } else {
            document.body.classList.remove('reduced-motion');
        }
        if (elements.toggleReducedMotion) elements.toggleReducedMotion.checked = settings.reducedMotion;

        // Practice Difficulty
        if (elements.selectDifficulty) {
            elements.selectDifficulty.value = settings.practiceDifficulty || 'unlimited';
        }
        if (elements.settingDifficultyDesc) {
            const diffMap = {
                'unlimited': 'Mudah (Bebas / Tanpa batas tebakan)',
                '15': 'Sedang (Maksimal 15 tebakan)',
                '12': 'Sulit (Maksimal 12 tebakan)',
                '9': 'Ekstrem (Maksimal 9 tebakan)'
            };
            elements.settingDifficultyDesc.textContent = diffMap[settings.practiceDifficulty || 'unlimited'] || 'Mudah (Tanpa batas tebakan)';
        }

        updateGuessCounter();
    }

    /* ==========================================================================
       MENU DRAWER & NAVIGATION
       ========================================================================== */

    function openDrawer() {
        elements.menuDrawer.classList.add('open');
        elements.menuDrawerBackdrop.classList.remove('hidden');
    }

    function closeDrawer() {
        elements.menuDrawer.classList.remove('open');
        elements.menuDrawerBackdrop.classList.add('hidden');
    }

    function updateNavActiveState(activeId) {
        [elements.navDaily, elements.navPractice, elements.navArchives].forEach(item => {
            if (item) item.classList.remove('active');
        });
        if (activeId === 'daily' && elements.navDaily) elements.navDaily.classList.add('active');
        if (activeId === 'practice' && elements.navPractice) elements.navPractice.classList.add('active');
        if (activeId === 'archives' && elements.navArchives) elements.navArchives.classList.add('active');
    }

    /* ==========================================================================
       CONFETTI CELEBRATION
       ========================================================================== */

    function triggerConfetti() {
        const canvas = elements.confettiCanvas;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const confettiCount = 120;
        const particles = [];
        const colors = ['#538d4e', '#b59f3b', '#3b82f6', '#ef4444', '#ec4899', '#ffd54f'];

        for (let i = 0; i < confettiCount; i++) {
            particles.push({
                x: canvas.width / 2,
                y: canvas.height / 2,
                r: Math.random() * 6 + 4,
                d: Math.random() * confettiCount,
                color: colors[Math.floor(Math.random() * colors.length)],
                tilt: Math.floor(Math.random() * 10) - 10,
                tiltAngleIncremental: Math.random() * 0.07 + 0.05,
                tiltAngle: 0,
                vx: (Math.random() - 0.5) * 14,
                vy: (Math.random() - 0.5) * 14 - 3,
                gravity: 0.18
            });
        }

        let animationFrame;
        let frameCount = 0;

        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            frameCount++;

            particles.forEach(p => {
                p.tiltAngle += p.tiltAngleIncremental;
                p.y += p.vy;
                p.x += p.vx;
                p.vy += p.gravity;
                p.vx *= 0.99;

                ctx.beginPath();
                ctx.lineWidth = p.r;
                ctx.strokeStyle = p.color;
                ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
                ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
                ctx.stroke();
            });

            if (frameCount < 160) {
                animationFrame = requestAnimationFrame(draw);
            } else {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                cancelAnimationFrame(animationFrame);
            }
        }

        draw();
    }

    /* ==========================================================================
       DAILY COUNTDOWN TIMER
       ========================================================================== */

    function startDailyCountdown() {
        function updateTimer() {
            const now = new Date();
            const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            const diff = tomorrow - now;

            const hours = String(Math.floor((diff / (1000 * 60 * 60)) % 24)).padStart(2, '0');
            const minutes = String(Math.floor((diff / (1000 * 60)) % 60)).padStart(2, '0');
            const seconds = String(Math.floor((diff / 1000) % 60)).padStart(2, '0');

            if (elements.dailyCountdown) {
                elements.dailyCountdown.textContent = `${hours}:${minutes}:${seconds}`;
            }
        }
        updateTimer();
        setInterval(updateTimer, 1000);
    }

    /* ==========================================================================
       EVENT LISTENERS
       ========================================================================== */

    function setupEventListeners() {
        // Physical Keyboard
        window.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.altKey || e.metaKey) return;
            handleKeyPress(e.key);
        });

        // Virtual On-Screen Keyboard
        elements.keyboard.addEventListener('click', (e) => {
            const keyBtn = e.target.closest('.key');
            if (!keyBtn) return;
            const key = keyBtn.getAttribute('data-key');
            if (key) handleKeyPress(key);
        });

        // Header Buttons
        elements.btnMenu.addEventListener('click', openDrawer);
        elements.btnCloseDrawer.addEventListener('click', closeDrawer);
        elements.menuDrawerBackdrop.addEventListener('click', closeDrawer);

        elements.btnHelp.addEventListener('click', () => {
            updateCarouselSlide(0);
            openModal(elements.modalHelp);
        });

        elements.btnStats.addEventListener('click', () => {
            renderStatsModal();
            openModal(elements.modalStats);
        });

        elements.btnSettings.addEventListener('click', () => {
            updateFullscreenUI();
            openModal(elements.modalSettings);
        });

        // View Guesses Tile Button (Integrated in top-right grid)
        if (elements.guessCounterTile) {
            elements.guessCounterTile.addEventListener('click', (e) => {
                e.stopPropagation();
                renderHistoryModal();
                openModal(elements.modalHistory);
            });
        }

        // Modal Close Buttons
        document.querySelectorAll('.modal-close-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetModalId = e.currentTarget.getAttribute('data-close');
                const modal = document.getElementById(targetModalId);
                if (modal) closeModal(modal);
            });
        });

        // Close on clicking backdrop
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    closeModal(overlay);
                }
            });
        });

        // Tutorial Carousel Next & Dots
        elements.btnCarouselNext.addEventListener('click', () => {
            if (state.helpSlideIndex < elements.carouselSlides.length - 1) {
                updateCarouselSlide(state.helpSlideIndex + 1);
            } else {
                closeModal(elements.modalHelp);
            }
        });

        elements.carouselDots.forEach((dot, idx) => {
            dot.addEventListener('click', () => {
                updateCarouselSlide(idx);
            });
        });

        // Drawer Navigation Items
        elements.navDaily.addEventListener('click', () => {
            startDailyGame();
            closeDrawer();
        });

        elements.navPractice.addEventListener('click', () => {
            startPracticeGame();
        });

        elements.navArchives.addEventListener('click', () => {
            renderArchivesModal();
            openModal(elements.modalArchives);
            closeDrawer();
        });

        elements.navStats.addEventListener('click', () => {
            renderStatsModal();
            openModal(elements.modalStats);
            closeDrawer();
        });

        elements.navHelp.addEventListener('click', () => {
            updateCarouselSlide(0);
            openModal(elements.modalHelp);
            closeDrawer();
        });

        elements.navSettings.addEventListener('click', () => {
            updateFullscreenUI();
            openModal(elements.modalSettings);
            closeDrawer();
        });

        // Stats Modal Tab Switchers
        document.querySelectorAll('.stats-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tabKey = btn.getAttribute('data-stats-tab');
                document.querySelectorAll('.stats-tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.stats-tab-panel').forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                const targetPanel = document.getElementById(`panel-${tabKey}`);
                if (targetPanel) targetPanel.classList.add('active');
            });
        });

        // Stats Footer Action Buttons
        const btnStatsInfo = document.getElementById('btn-stats-info');
        if (btnStatsInfo) {
            btnStatsInfo.addEventListener('click', () => {
                updateCarouselSlide(0);
                openModal(elements.modalHelp);
            });
        }

        const btnStatsArchive = document.getElementById('btn-stats-archive');
        if (btnStatsArchive) {
            btnStatsArchive.addEventListener('click', () => {
                renderArchivesModal();
                openModal(elements.modalArchives);
            });
        }

        // Stats Buttons
        if (elements.btnShare) {
            elements.btnShare.addEventListener('click', shareResult);
        }
        if (elements.btnModePracticeFromStats) {
            elements.btnModePracticeFromStats.addEventListener('click', () => {
                startPracticeGame();
            });
        }

        // Settings Toggle Handlers
        elements.toggleDarkMode.addEventListener('change', (e) => {
            settings.darkMode = e.target.checked;
            saveSettings();
        });

        elements.toggleSound.addEventListener('change', (e) => {
            settings.sound = e.target.checked;
            saveSettings();
        });

        elements.toggleReducedMotion.addEventListener('change', (e) => {
            settings.reducedMotion = e.target.checked;
            saveSettings();
        });

        if (elements.selectDifficulty) {
            elements.selectDifficulty.addEventListener('change', (e) => {
                settings.practiceDifficulty = e.target.value;
                saveSettings();
            });
        }

        // Full Screen Toggle Action
        if (elements.toggleFullscreen) {
            elements.toggleFullscreen.addEventListener('change', (e) => {
                toggleFullScreen(e.target.checked);
            });
        }

        // Full Screen Change Listeners
        document.addEventListener('fullscreenchange', updateFullscreenUI);
        document.addEventListener('webkitfullscreenchange', updateFullscreenUI);
        document.addEventListener('mozfullscreenchange', updateFullscreenUI);
        document.addEventListener('MSFullscreenChange', updateFullscreenUI);

        // Window resize handler for confetti canvas
        window.addEventListener('resize', () => {
            if (elements.confettiCanvas) {
                elements.confettiCanvas.width = window.innerWidth;
                elements.confettiCanvas.height = window.innerHeight;
            }
        });
    }

    /* ==========================================================================
       FULLSCREEN CONTROLLER
       ========================================================================== */

    function toggleFullScreen(requestedState) {
        if (sounds && sounds.playKey) sounds.playKey();

        const doc = window.document;
        const docEl = doc.documentElement;
        const isCurrentlyFullscreen = !!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement);

        const shouldEnter = requestedState !== undefined ? requestedState : !isCurrentlyFullscreen;

        if (shouldEnter) {
            if (!isCurrentlyFullscreen) {
                const requestFullscreen = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.mozRequestFullScreen || docEl.msRequestFullscreen;
                if (requestFullscreen) {
                    try {
                        const promise = requestFullscreen.call(docEl);
                        if (promise && typeof promise.catch === 'function') {
                            promise.catch(() => {
                                if (elements.toggleFullscreen) elements.toggleFullscreen.checked = false;
                                showToast('Izin layar penuh tidak diaktifkan peramban');
                            });
                        }
                    } catch (err) {
                        if (elements.toggleFullscreen) elements.toggleFullscreen.checked = false;
                        showToast('Mode layar penuh tidak didukung');
                    }
                } else {
                    if (elements.toggleFullscreen) elements.toggleFullscreen.checked = false;
                    showToast('Mode layar penuh tidak didukung di perangkat ini');
                }
            }
        } else {
            if (isCurrentlyFullscreen) {
                const exitFullscreen = doc.exitFullscreen || doc.webkitExitFullscreen || doc.mozCancelFullScreen || doc.msExitFullscreen;
                if (exitFullscreen) {
                    try {
                        const promise = exitFullscreen.call(doc);
                        if (promise && typeof promise.catch === 'function') {
                            promise.catch(() => {});
                        }
                    } catch (err) {}
                }
            }
        }
    }

    function updateFullscreenUI() {
        const doc = window.document;
        const isFullscreen = !!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement);

        if (elements.toggleFullscreen) {
            elements.toggleFullscreen.checked = isFullscreen;
        }

        if (elements.settingFullscreenDesc) {
            elements.settingFullscreenDesc.textContent = isFullscreen 
                ? 'Layar penuh sedang aktif' 
                : 'Tampilan layar penuh tanpa bilah peramban';
        }
    }

    // Start on DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
