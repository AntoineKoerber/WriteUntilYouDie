/**
 * WriteUntilYouDie - Creative Writing Exercise Tool
 *
 * Features:
 * - Continuous writing enforcement with configurable timeout
 * - Visual countdown and blur effect when pausing
 * - Word count and elapsed time tracking
 * - Draft save/load with localStorage
 * - Dark mode support
 * - Accessibility considerations
 *
 * @module WriteUntilYouDie
 */
const WriteUntilYouDie = (() => {
  'use strict';

  // ============================================
  // Configuration
  // ============================================
  const CONFIG = {
    STORAGE_KEY: 'write-until-you-die-draft',
    SETTINGS_KEY: 'write-until-you-die-settings',
    DEFAULT_TIMEOUT: 5, // seconds
    BLUR_INCREMENT: 1, // pixels per tick
    BLUR_MAX: 20, // maximum blur before deletion
    TICK_INTERVAL: 250, // milliseconds
  };

  // ============================================
  // State
  // ============================================
  const state = {
    isActive: false,
    isPaused: false,
    startTime: null,
    pauseTime: null,
    blurAmount: 0,
    timeoutSeconds: CONFIG.DEFAULT_TIMEOUT,
    pauseTimerId: null,
    blurTimerId: null,
    elapsedTimerId: null,
  };

  // ============================================
  // DOM Elements (cached)
  // ============================================
  const elements = {};

  /**
   * Cache DOM element references for performance
   */
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
  };

  // ============================================
  // Utility Functions
  // ============================================

  /**
   * Formats seconds as M:SS
   * @param {number} totalSeconds - Total seconds elapsed
   * @returns {string} Formatted time string
   */
  const formatTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  /**
   * Counts words in text
   * @param {string} text - Text to count words in
   * @returns {number} Word count
   */
  const countWords = (text) => {
    const trimmed = text.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  };

  // ============================================
  // Timer Functions
  // ============================================

  /**
   * Clears all active timers
   */
  const clearAllTimers = () => {
    if (state.pauseTimerId) {
      clearTimeout(state.pauseTimerId);
      state.pauseTimerId = null;
    }
    if (state.blurTimerId) {
      clearInterval(state.blurTimerId);
      state.blurTimerId = null;
    }
    if (state.elapsedTimerId) {
      clearInterval(state.elapsedTimerId);
      state.elapsedTimerId = null;
    }
  };

  /**
   * Starts the elapsed time counter
   */
  const startElapsedTimer = () => {
    state.elapsedTimerId = setInterval(() => {
      if (state.startTime && state.isActive) {
        const elapsed = (Date.now() - state.startTime) / 1000;
        elements.elapsedTime.textContent = formatTime(elapsed);
      }
    }, 1000);
  };

  /**
   * Starts the blur effect animation
   */
  const startBlurEffect = () => {
    state.isPaused = true;
    state.pauseTime = Date.now();
    elements.progressContainer.classList.add('active');

    state.blurTimerId = setInterval(() => {
      state.blurAmount += CONFIG.BLUR_INCREMENT;
      elements.textArea.style.filter = `blur(${state.blurAmount}px)`;

      // Update progress bar
      const progress = (state.blurAmount / CONFIG.BLUR_MAX) * 100;
      elements.progressBar.style.width = `${100 - progress}%`;

      // Update pause timer display
      const timeLeft = Math.max(0, state.timeoutSeconds - (state.blurAmount / CONFIG.BLUR_MAX) * state.timeoutSeconds);
      elements.pauseTimer.textContent = `${timeLeft.toFixed(1)}s`;

      // Check if text should be deleted
      if (state.blurAmount >= CONFIG.BLUR_MAX) {
        handleTextDeletion();
      }
    }, CONFIG.TICK_INTERVAL);
  };

  /**
   * Stops the blur effect and resets visual state
   */
  const stopBlurEffect = () => {
    if (state.blurTimerId) {
      clearInterval(state.blurTimerId);
      state.blurTimerId = null;
    }

    state.isPaused = false;
    state.blurAmount = 0;
    elements.textArea.style.filter = 'none';
    elements.progressBar.style.width = '100%';
    elements.progressContainer.classList.remove('active');
    elements.pauseTimer.textContent = `${state.timeoutSeconds.toFixed(1)}s`;
  };

  /**
   * Starts the pause timeout
   */
  const startPauseTimeout = () => {
    // Clear any existing pause timer
    if (state.pauseTimerId) {
      clearTimeout(state.pauseTimerId);
    }

    state.pauseTimerId = setTimeout(() => {
      startBlurEffect();
    }, state.timeoutSeconds * 1000);
  };

  // ============================================
  // Core Logic
  // ============================================

  /**
   * Handles text deletion when blur completes
   */
  const handleTextDeletion = () => {
    clearAllTimers();

    // Reset state
    state.isActive = false;
    state.isPaused = false;
    state.blurAmount = 0;
    state.startTime = null;

    // Reset UI
    elements.textArea.value = '';
    elements.textArea.style.filter = 'none';
    elements.textArea.disabled = true;
    elements.startButton.style.display = 'flex';
    elements.wordCount.textContent = '0';
    elements.elapsedTime.textContent = '0:00';
    elements.pauseTimer.textContent = `${state.timeoutSeconds.toFixed(1)}s`;
    elements.progressBar.style.width = '100%';
    elements.progressContainer.classList.remove('active');
    elements.saveButton.disabled = true;
    elements.resetButton.disabled = true;

    // Visual feedback for deletion
    elements.textArea.classList.add('deleted');
    setTimeout(() => {
      elements.textArea.classList.remove('deleted');
    }, 500);
  };

  /**
   * Starts the writing session
   */
  const startSession = () => {
    state.isActive = true;
    state.startTime = Date.now();

    elements.textArea.disabled = false;
    elements.textArea.value = '';
    elements.textArea.focus();
    elements.startButton.style.display = 'none';
    elements.saveButton.disabled = false;
    elements.resetButton.disabled = false;

    startElapsedTimer();
    startPauseTimeout();
  };

  /**
   * Handles user input in the text area
   */
  const handleInput = () => {
    // Reset blur effect on any input
    stopBlurEffect();

    // Update word count
    const words = countWords(elements.textArea.value);
    elements.wordCount.textContent = words.toString();

    // Restart pause timeout
    startPauseTimeout();
  };

  /**
   * Resets the session
   */
  const resetSession = () => {
    clearAllTimers();

    state.isActive = false;
    state.isPaused = false;
    state.blurAmount = 0;
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
    elements.saveButton.disabled = true;
    elements.resetButton.disabled = true;
  };

  // ============================================
  // Storage Functions
  // ============================================

  /**
   * Saves the current draft to localStorage
   */
  const saveDraft = () => {
    const draft = {
      text: elements.textArea.value,
      wordCount: countWords(elements.textArea.value),
      savedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(draft));
      elements.saveButton.innerHTML = '<span class="btn-icon">&#10003;</span> Saved!';
      setTimeout(() => {
        elements.saveButton.innerHTML = '<span class="btn-icon">&#128190;</span> Save Draft';
      }, 2000);
    } catch (error) {
      console.error('Failed to save draft:', error);
    }
  };

  /**
   * Loads a saved draft from localStorage
   */
  const loadDraft = () => {
    try {
      const saved = localStorage.getItem(CONFIG.STORAGE_KEY);
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.text) {
          // Start session with loaded text
          state.isActive = true;
          state.startTime = Date.now();

          elements.textArea.disabled = false;
          elements.textArea.value = draft.text;
          elements.textArea.focus();
          elements.startButton.style.display = 'none';
          elements.wordCount.textContent = draft.wordCount.toString();
          elements.saveButton.disabled = false;
          elements.resetButton.disabled = false;

          startElapsedTimer();
          startPauseTimeout();
        }
      }
    } catch (error) {
      console.error('Failed to load draft:', error);
    }
  };

  /**
   * Saves settings to localStorage
   */
  const saveSettings = () => {
    const settings = {
      timeout: state.timeoutSeconds,
      darkMode: document.body.classList.contains('dark-mode'),
    };

    try {
      localStorage.setItem(CONFIG.SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  /**
   * Loads settings from localStorage
   */
  const loadSettings = () => {
    try {
      const saved = localStorage.getItem(CONFIG.SETTINGS_KEY);
      if (saved) {
        const settings = JSON.parse(saved);
        state.timeoutSeconds = settings.timeout || CONFIG.DEFAULT_TIMEOUT;
        elements.timeoutSetting.value = state.timeoutSeconds;
        elements.pauseTimer.textContent = `${state.timeoutSeconds.toFixed(1)}s`;

        // Update timeout display in rules section
        if (elements.timeoutDisplay) {
          elements.timeoutDisplay.textContent = state.timeoutSeconds;
        }

        if (settings.darkMode) {
          document.body.classList.add('dark-mode');
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  // ============================================
  // Event Handlers
  // ============================================

  /**
   * Handles timeout setting change
   */
  const handleTimeoutChange = () => {
    const value = parseInt(elements.timeoutSetting.value, 10);
    if (value >= 1 && value <= 30) {
      state.timeoutSeconds = value;
      elements.pauseTimer.textContent = `${state.timeoutSeconds.toFixed(1)}s`;

      // Update timeout display in rules section
      if (elements.timeoutDisplay) {
        elements.timeoutDisplay.textContent = state.timeoutSeconds;
      }

      saveSettings();
    }
  };

  /**
   * Handles dark mode toggle
   */
  const handleDarkModeToggle = () => {
    document.body.classList.toggle('dark-mode');
    saveSettings();
  };

  /**
   * Binds all event listeners
   */
  const bindEvents = () => {
    elements.startButton.addEventListener('click', startSession);
    elements.textArea.addEventListener('input', handleInput);
    elements.saveButton.addEventListener('click', saveDraft);
    elements.loadButton.addEventListener('click', loadDraft);
    elements.resetButton.addEventListener('click', resetSession);
    elements.timeoutSetting.addEventListener('change', handleTimeoutChange);
    elements.darkModeToggle.addEventListener('click', handleDarkModeToggle);

    // Keyboard shortcut: Escape to reset
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && state.isActive) {
        resetSession();
      }
    });
  };

  // ============================================
  // Initialization
  // ============================================

  /**
   * Initializes the application
   */
  const init = () => {
    cacheElements();
    loadSettings();
    bindEvents();

    console.log('WriteUntilYouDie initialized');
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Public API (for debugging)
  return {
    getState: () => ({ ...state }),
    reset: resetSession,
  };
})();
