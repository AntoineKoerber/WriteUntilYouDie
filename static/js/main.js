/**
 * WriteUntilYouDie - Creative Writing Exercise Tool
 *
 * Features:
 * - Countdown starts immediately when user stops typing
 * - Heartbeat animation during countdown (1 beat/sec)
 * - Word count and elapsed time tracking
 * - Writing history with copy/continue support
 * - Dark mode support (dark by default)
 *
 * @module WriteUntilYouDie
 */
const WriteUntilYouDie = (() => {
  'use strict';

  const CONFIG = {
    STORAGE_KEY: 'write-until-you-die-draft',
    SETTINGS_KEY: 'write-until-you-die-settings',
    HISTORY_KEY: 'write-until-you-die-history',
    DEFAULT_TIMEOUT: 5,
    MAX_HISTORY: 20,
    COUNTDOWN_INTERVAL: 100, // ms — update countdown frequently for smooth display
  };

  const state = {
    isActive: false,
    countdownActive: false,
    startTime: null,
    countdownStart: null,
    timeoutSeconds: CONFIG.DEFAULT_TIMEOUT,
    graceTimerId: null,
    countdownTimerId: null,
    elapsedTimerId: null,
    heartbeatCount: 0,
  };

  const elements = {};

  const cacheElements = () => {
    elements.startButton = document.getElementById('start-button');
    elements.textArea = document.getElementById('text-area');
    elements.wordCount = document.getElementById('word-count');
    elements.elapsedTime = document.getElementById('elapsed-time');
    elements.pauseTimer = document.getElementById('pause-timer');
    elements.progressBar = document.getElementById('progress-bar');
    elements.progressContainer = document.getElementById('progress-container');
    elements.saveButton = document.getElementById('save-button');
    elements.loadButton = document.getElementById('load-button');
    elements.resetButton = document.getElementById('reset-button');
    elements.timeoutSetting = document.getElementById('timeout-setting');
    elements.timeoutDisplay = document.getElementById('timeout-display');
    elements.darkModeToggle = document.getElementById('dark-mode-toggle');
    elements.historyList = document.getElementById('history-list');
    elements.historyEmpty = document.getElementById('history-empty');
    elements.clearHistoryBtn = document.getElementById('clear-history');
    elements.editorWrapper = document.querySelector('.editor-wrapper');
  };

  // ============================================
  // Utility Functions
  // ============================================

  const formatTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const countWords = (text) => {
    const trimmed = text.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  };

  const formatDate = (isoString) => {
    const d = new Date(isoString);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // ============================================
  // Timer & Countdown
  // ============================================

  const clearAllTimers = () => {
    if (state.graceTimerId) {
      clearTimeout(state.graceTimerId);
      state.graceTimerId = null;
    }
    if (state.countdownTimerId) {
      clearInterval(state.countdownTimerId);
      state.countdownTimerId = null;
    }
    if (state.elapsedTimerId) {
      clearInterval(state.elapsedTimerId);
      state.elapsedTimerId = null;
    }
  };

  const startElapsedTimer = () => {
    state.elapsedTimerId = setInterval(() => {
      if (state.startTime && state.isActive) {
        const elapsed = (Date.now() - state.startTime) / 1000;
        elements.elapsedTime.textContent = formatTime(elapsed);
      }
    }, 1000);
  };

  /**
   * Schedules the countdown after a 1-second grace period.
   * No visual feedback during grace — just a brief pause.
   */
  const startCountdown = () => {
    // Clear any existing grace timer
    if (state.graceTimerId) {
      clearTimeout(state.graceTimerId);
      state.graceTimerId = null;
    }

    state.graceTimerId = setTimeout(() => {
      state.graceTimerId = null;
      beginActiveCountdown();
    }, 1000);
  };

  /**
   * The actual countdown with heartbeat, blur, and progress bar.
   * Only runs after the 1s grace period.
   */
  const beginActiveCountdown = () => {
    state.countdownActive = true;
    state.countdownStart = Date.now();
    state.heartbeatCount = 0;
    state.lastBeatTime = 0;
    elements.progressContainer.classList.add('active');
    elements.editorWrapper.classList.add('countdown-active');

    // First heartbeat at countdown start
    state.lastBeatTime = Date.now();
    triggerHeartbeat();

    state.countdownTimerId = setInterval(() => {
      const elapsed = (Date.now() - state.countdownStart) / 1000;
      const remaining = Math.max(0, state.timeoutSeconds - elapsed);
      const progress = remaining / state.timeoutSeconds;

      // Update UI
      elements.progressBar.style.width = `${progress * 100}%`;
      elements.pauseTimer.textContent = `${remaining.toFixed(1)}s`;

      // Pulsing blur: base level rises over time, beats cause spikes
      const baseBlur = (1 - progress) * 10;
      const timeSinceBeat = (Date.now() - state.lastBeatTime) / 1000;
      // Sharp spike that decays: peaks at ~0.15s, fades by ~0.6s
      const beatPulse = timeSinceBeat < 0.6
        ? Math.sin(timeSinceBeat / 0.6 * Math.PI) * (6 + baseBlur * 0.5)
        : 0;
      elements.textArea.style.filter = `blur(${baseBlur + beatPulse}px)`;

      // Heartbeat: 1 per second
      const currentBeat = Math.floor(elapsed);
      if (currentBeat > state.heartbeatCount) {
        state.heartbeatCount = currentBeat;
        state.lastBeatTime = Date.now();
        triggerHeartbeat();
      }

      // Time's up
      if (remaining <= 0) {
        handleTextDeletion();
      }
    }, CONFIG.COUNTDOWN_INTERVAL);
  };

  const triggerHeartbeat = () => {
    elements.editorWrapper.classList.remove('heartbeat');
    void elements.editorWrapper.offsetWidth;
    elements.editorWrapper.classList.add('heartbeat');
  };

  const stopCountdown = () => {
    if (state.graceTimerId) {
      clearTimeout(state.graceTimerId);
      state.graceTimerId = null;
    }
    if (state.countdownTimerId) {
      clearInterval(state.countdownTimerId);
      state.countdownTimerId = null;
    }

    state.countdownActive = false;
    state.countdownStart = null;
    state.heartbeatCount = 0;
    elements.textArea.style.filter = 'none';
    elements.progressBar.style.width = '100%';
    elements.progressContainer.classList.remove('active');
    elements.editorWrapper.classList.remove('countdown-active', 'heartbeat');
    elements.pauseTimer.textContent = `${state.timeoutSeconds.toFixed(1)}s`;
  };

  // ============================================
  // Core Logic
  // ============================================

  const handleTextDeletion = () => {
    const text = elements.textArea.value.trim();
    const words = countWords(text);

    // Auto-save to history if there was meaningful content
    if (text.length > 0 && words >= 3) {
      saveToHistory(text, words);
    }

    clearAllTimers();

    state.isActive = false;
    state.countdownActive = false;
    state.startTime = null;

    elements.textArea.value = '';
    elements.textArea.style.filter = 'none';
    elements.textArea.disabled = true;
    elements.startButton.style.display = 'flex';
    elements.wordCount.textContent = '0';
    elements.elapsedTime.textContent = '0:00';
    elements.pauseTimer.textContent = `${state.timeoutSeconds.toFixed(1)}s`;
    elements.progressBar.style.width = '100%';
    elements.progressContainer.classList.remove('active');
    elements.editorWrapper.classList.remove('countdown-active', 'heartbeat');
    elements.saveButton.disabled = true;
    elements.resetButton.disabled = true;

    elements.textArea.classList.add('deleted');
    setTimeout(() => {
      elements.textArea.classList.remove('deleted');
    }, 500);
  };

  const startSession = (initialText) => {
    state.isActive = true;
    state.startTime = Date.now();

    elements.textArea.disabled = false;
    elements.textArea.value = typeof initialText === 'string' ? initialText : '';
    elements.textArea.focus();
    // Place cursor at end if continuing
    if (typeof initialText === 'string') {
      elements.textArea.setSelectionRange(initialText.length, initialText.length);
      elements.wordCount.textContent = countWords(initialText).toString();
    }
    elements.startButton.style.display = 'none';
    elements.saveButton.disabled = false;
    elements.resetButton.disabled = false;

    startElapsedTimer();
    // Countdown starts immediately — user must begin typing right away
    startCountdown();
  };

  const handleInput = () => {
    stopCountdown();

    const words = countWords(elements.textArea.value);
    elements.wordCount.textContent = words.toString();

    // Restart countdown immediately
    startCountdown();
  };

  const resetSession = () => {
    clearAllTimers();
    stopCountdown();

    state.isActive = false;
    state.startTime = null;

    elements.textArea.value = '';
    elements.textArea.style.filter = 'none';
    elements.textArea.disabled = true;
    elements.startButton.style.display = 'flex';
    elements.wordCount.textContent = '0';
    elements.elapsedTime.textContent = '0:00';
    elements.pauseTimer.textContent = `${state.timeoutSeconds.toFixed(1)}s`;
    elements.progressBar.style.width = '100%';
    elements.progressContainer.classList.remove('active');
    elements.editorWrapper.classList.remove('countdown-active', 'heartbeat');
    elements.saveButton.disabled = true;
    elements.resetButton.disabled = true;
  };

  // ============================================
  // History Functions
  // ============================================

  const getHistory = () => {
    try {
      const saved = localStorage.getItem(CONFIG.HISTORY_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  };

  const saveToHistory = (text, wordCount) => {
    const history = getHistory();
    history.unshift({
      id: Date.now().toString(),
      text,
      wordCount,
      savedAt: new Date().toISOString(),
    });

    // Limit history size
    if (history.length > CONFIG.MAX_HISTORY) {
      history.length = CONFIG.MAX_HISTORY;
    }

    try {
      localStorage.setItem(CONFIG.HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Failed to save history:', error);
    }

    renderHistory();
  };

  const deleteFromHistory = (id) => {
    const history = getHistory().filter(h => h.id !== id);
    try {
      localStorage.setItem(CONFIG.HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Failed to update history:', error);
    }
    renderHistory();
  };

  const clearHistory = () => {
    try {
      localStorage.removeItem(CONFIG.HISTORY_KEY);
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
    renderHistory();
  };

  const continueFromHistory = (id) => {
    const history = getHistory();
    const entry = history.find(h => h.id === id);
    if (entry) {
      if (state.isActive) {
        resetSession();
      }
      startSession(entry.text);
    }
  };

  const copyFromHistory = (id) => {
    const history = getHistory();
    const entry = history.find(h => h.id === id);
    if (entry) {
      navigator.clipboard.writeText(entry.text).then(() => {
        const btn = document.querySelector(`[data-copy-id="${id}"]`);
        if (btn) {
          const original = btn.innerHTML;
          btn.innerHTML = '&#10003; Copied';
          setTimeout(() => { btn.innerHTML = original; }, 1500);
        }
      });
    }
  };

  const renderHistory = () => {
    const history = getHistory();

    if (history.length === 0) {
      elements.historyList.innerHTML = '';
      elements.historyEmpty.style.display = 'block';
      elements.clearHistoryBtn.style.display = 'none';
      return;
    }

    elements.historyEmpty.style.display = 'none';
    elements.clearHistoryBtn.style.display = 'inline-flex';

    elements.historyList.innerHTML = history.map(entry => {
      const preview = entry.text.length > 120
        ? entry.text.substring(0, 120) + '...'
        : entry.text;

      return `
        <div class="history-entry" data-id="${entry.id}">
          <div class="history-meta">
            <span class="history-words">${entry.wordCount} words</span>
            <span class="history-date">${formatDate(entry.savedAt)}</span>
          </div>
          <p class="history-preview">${preview.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
          <div class="history-actions">
            <button type="button" class="btn btn-sm btn-outline" data-continue-id="${entry.id}">
              &#9654; Continue
            </button>
            <button type="button" class="btn btn-sm btn-outline" data-copy-id="${entry.id}">
              &#128203; Copy
            </button>
            <button type="button" class="btn btn-sm btn-danger-outline" data-delete-id="${entry.id}">
              &#10006;
            </button>
          </div>
        </div>
      `;
    }).join('');
  };

  // ============================================
  // Storage Functions
  // ============================================

  const saveDraft = () => {
    const text = elements.textArea.value;
    const words = countWords(text);
    const draft = { text, wordCount: words, savedAt: new Date().toISOString() };

    try {
      localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(draft));
      // Also save to history
      if (text.trim().length > 0 && words >= 3) {
        saveToHistory(text, words);
      }
      elements.saveButton.innerHTML = '<span class="btn-icon">&#10003;</span> Saved!';
      setTimeout(() => {
        elements.saveButton.innerHTML = '<span class="btn-icon">&#128190;</span> Save Draft';
      }, 2000);
    } catch (error) {
      console.error('Failed to save draft:', error);
    }
  };

  const loadDraft = () => {
    try {
      const saved = localStorage.getItem(CONFIG.STORAGE_KEY);
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.text) {
          startSession(draft.text);
        }
      }
    } catch (error) {
      console.error('Failed to load draft:', error);
    }
  };

  const saveSettings = () => {
    const settings = {
      timeout: state.timeoutSeconds,
      lightMode: document.body.classList.contains('light-mode'),
    };
    try {
      localStorage.setItem(CONFIG.SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const loadSettings = () => {
    try {
      const saved = localStorage.getItem(CONFIG.SETTINGS_KEY);
      if (saved) {
        const settings = JSON.parse(saved);
        state.timeoutSeconds = settings.timeout || CONFIG.DEFAULT_TIMEOUT;
        elements.timeoutSetting.value = state.timeoutSeconds;
        elements.pauseTimer.textContent = `${state.timeoutSeconds.toFixed(1)}s`;

        if (elements.timeoutDisplay) {
          elements.timeoutDisplay.textContent = state.timeoutSeconds;
        }

        if (settings.lightMode) {
          document.body.classList.add('light-mode');
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  // ============================================
  // Event Handlers
  // ============================================

  const handleTimeoutChange = () => {
    const value = parseInt(elements.timeoutSetting.value, 10);
    if (value >= 1 && value <= 30) {
      state.timeoutSeconds = value;
      elements.pauseTimer.textContent = `${state.timeoutSeconds.toFixed(1)}s`;
      if (elements.timeoutDisplay) {
        elements.timeoutDisplay.textContent = state.timeoutSeconds;
      }
      saveSettings();
    }
  };

  const handleDarkModeToggle = () => {
    document.body.classList.toggle('light-mode');
    saveSettings();
  };

  const handleHistoryClick = (e) => {
    const continueBtn = e.target.closest('[data-continue-id]');
    const copyBtn = e.target.closest('[data-copy-id]');
    const deleteBtn = e.target.closest('[data-delete-id]');

    if (continueBtn) {
      continueFromHistory(continueBtn.dataset.continueId);
    } else if (copyBtn) {
      copyFromHistory(copyBtn.dataset.copyId);
    } else if (deleteBtn) {
      deleteFromHistory(deleteBtn.dataset.deleteId);
    }
  };

  const bindEvents = () => {
    elements.startButton.addEventListener('click', () => startSession());
    elements.textArea.addEventListener('input', handleInput);
    elements.saveButton.addEventListener('click', saveDraft);
    elements.loadButton.addEventListener('click', loadDraft);
    elements.resetButton.addEventListener('click', resetSession);
    elements.timeoutSetting.addEventListener('change', handleTimeoutChange);
    elements.darkModeToggle.addEventListener('click', handleDarkModeToggle);

    // History events (delegated)
    if (elements.historyList) {
      elements.historyList.addEventListener('click', handleHistoryClick);
    }
    if (elements.clearHistoryBtn) {
      elements.clearHistoryBtn.addEventListener('click', clearHistory);
    }

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && state.isActive) {
        resetSession();
      }
    });
  };

  // ============================================
  // Initialization
  // ============================================

  const init = () => {
    cacheElements();
    loadSettings();
    bindEvents();
    renderHistory();
    console.log('WriteUntilYouDie initialized');
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
    getState: () => ({ ...state }),
    reset: resetSession,
  };
})();
