// Storage wrapper for Focus Partner extension
console.log("Focus Partner storage script loaded");

// Storage keys
const STORAGE_KEYS = {
  IS_ACTIVE: "isActive",
  USER_GOAL: "userGoal",
  SESSION_START_TIME: "sessionStartTime",
  IS_SESSION_ACTIVE: "isSessionActive",
  AI_ANALYSIS: "aiAnalysis",
  CURRENT_PAGE_DATA: "currentPageData",
  DEBUG_MODE: "debugMode",
};

// Storage wrapper class
class FocusPartnerStorage {
  constructor() {
    this.debug = false;
  }

  // Enable debug mode
  enableDebug() {
    this.debug = true;
    chrome.storage.local.set({ [STORAGE_KEYS.DEBUG_MODE]: true });
  }

  // Disable debug mode
  disableDebug() {
    this.debug = false;
    chrome.storage.local.set({ [STORAGE_KEYS.DEBUG_MODE]: false });
  }

  // Log debug message
  log(message, data = null) {
    if (this.debug) {
      console.log(`[FocusPartnerStorage] ${message}`, data);
    }
  }

  // Set extension active state
  setActive(isActive) {
    this.log("Setting active state:", isActive);
    return this.set(STORAGE_KEYS.IS_ACTIVE, isActive);
  }

  // Get extension active state
  getActive() {
    return this.get(STORAGE_KEYS.IS_ACTIVE);
  }

  // Set user goal
  setUserGoal(goal) {
    this.log("Setting user goal:", goal);
    return this.set(STORAGE_KEYS.USER_GOAL, goal);
  }

  // Get user goal
  getUserGoal() {
    return this.get(STORAGE_KEYS.USER_GOAL);
  }

  // Set session start time
  setSessionStartTime(timestamp) {
    this.log("Setting session start time:", timestamp);
    return this.set(STORAGE_KEYS.SESSION_START_TIME, timestamp);
  }

  // Get session start time
  getSessionStartTime() {
    return this.get(STORAGE_KEYS.SESSION_START_TIME);
  }

  // Set session active state
  setSessionActive(isActive) {
    this.log("Setting session active:", isActive);
    return this.set(STORAGE_KEYS.IS_SESSION_ACTIVE, isActive);
  }

  // Get session active state
  getSessionActive() {
    return this.get(STORAGE_KEYS.IS_SESSION_ACTIVE);
  }

  // Set AI analysis data
  setAIAnalysis(analysis) {
    this.log("Setting AI analysis:", analysis);
    return this.set(STORAGE_KEYS.AI_ANALYSIS, analysis);
  }

  // Get AI analysis data
  getAIAnalysis() {
    return this.get(STORAGE_KEYS.AI_ANALYSIS);
  }

  // Set current page data
  setCurrentPageData(pageData) {
    this.log("Setting current page data:", pageData);
    return this.set(STORAGE_KEYS.CURRENT_PAGE_DATA, pageData);
  }

  // Get current page data
  getCurrentPageData() {
    return this.get(STORAGE_KEYS.CURRENT_PAGE_DATA);
  }

  // Start a new focus session
  startSession(goal) {
    this.log("Starting new session with goal:", goal);
    const timestamp = Date.now();

    return Promise.all([
      this.setUserGoal(goal),
      this.setSessionStartTime(timestamp),
      this.setSessionActive(true),
      this.setActive(true),
    ]);
  }

  // End the current session
  endSession() {
    this.log("Ending session");
    return Promise.all([
      this.setSessionActive(false),
      this.setActive(false),
      this.clear(STORAGE_KEYS.USER_GOAL),
      this.clear(STORAGE_KEYS.SESSION_START_TIME),
      this.clear(STORAGE_KEYS.AI_ANALYSIS),
    ]);
  }

  // Get session duration in minutes
  getSessionDuration() {
    return this.getSessionStartTime().then((startTime) => {
      if (!startTime) return 0;
      return Math.floor((Date.now() - startTime) / 1000 / 60);
    });
  }

  // Get all session data
  getSessionData() {
    return Promise.all([
      this.getActive(),
      this.getUserGoal(),
      this.getSessionStartTime(),
      this.getSessionActive(),
      this.getAIAnalysis(),
    ]).then(
      ([isActive, userGoal, sessionStartTime, isSessionActive, aiAnalysis]) => {
        return {
          isActive: isActive || false,
          userGoal: userGoal || "",
          sessionStartTime: sessionStartTime || null,
          isSessionActive: isSessionActive || false,
          aiAnalysis: aiAnalysis || null,
        };
      }
    );
  }

  // Generic set method
  set(key, value) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: value }, () => {
        if (chrome.runtime.lastError) {
          this.log("Storage set error:", chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          this.log("Storage set success:", key, value);
          resolve(value);
        }
      });
    });
  }

  // Generic get method
  get(key) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get([key], (result) => {
        if (chrome.runtime.lastError) {
          this.log("Storage get error:", chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          this.log("Storage get success:", key, result[key]);
          resolve(result[key]);
        }
      });
    });
  }

  // Generic clear method
  clear(key) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.remove([key], () => {
        if (chrome.runtime.lastError) {
          this.log("Storage clear error:", chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          this.log("Storage clear success:", key);
          resolve();
        }
      });
    });
  }

  // Clear all storage
  clearAll() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.clear(() => {
        if (chrome.runtime.lastError) {
          this.log("Storage clear all error:", chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          this.log("Storage clear all success");
          resolve();
        }
      });
    });
  }
}

// Create global instance
const focusPartnerStorage = new FocusPartnerStorage();

// Initialize debug mode
chrome.storage.local.get([STORAGE_KEYS.DEBUG_MODE], (result) => {
  if (result[STORAGE_KEYS.DEBUG_MODE]) {
    focusPartnerStorage.enableDebug();
  }
});

// Export for use in other scripts
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    FocusPartnerStorage,
    focusPartnerStorage,
    STORAGE_KEYS,
  };
} else {
  // Make available globally
  window.focusPartnerStorage = focusPartnerStorage;
  window.STORAGE_KEYS = STORAGE_KEYS;
}
