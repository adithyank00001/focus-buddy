// All MVP page understanding, AI relevance, and distraction site blocking code has been removed for a clean slate. Ready for next implementation.

// Focus Partner Chrome Extension - Clean Page Monitor
console.log("Focus Partner—Page monitor loaded");

// State management
let isSessionActive = false;
let currentUserGoal = "";

// Initialize on page load
document.addEventListener("DOMContentLoaded", initializePageMonitor);
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializePageMonitor);
} else {
  initializePageMonitor();
}

// Main initialization function
async function initializePageMonitor() {
  console.log(
    "Focus Partner—Initializing page monitor on:",
    window.location.href
  );

  // Check session state from storage
  await checkSessionState();

  // Expose global functions for testing
  exposeGlobalFunctions();
}

// Check session state from storage
async function checkSessionState() {
  try {
    const result = await new Promise((resolve) => {
      chrome.storage.local.get(["isSessionActive", "userGoal"], resolve);
    });

    isSessionActive = result.isSessionActive || false;
    currentUserGoal = result.userGoal || "";

    console.log("Focus Partner—Session state:", {
      isSessionActive,
      currentUserGoal,
    });
  } catch (error) {
    console.error("Focus Partner—Error checking session state:", error);
  }
}

// Listen for session state changes from background/content
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!request || !request.action) return;

  console.log("Focus Partner—Received message:", request.action);

  switch (request.action) {
    case "sessionStarted":
      console.log("Focus Partner—Session started with goal:", request.goal);
      isSessionActive = true;
      currentUserGoal = request.goal || "";
      break;

    case "sessionStopped":
      console.log("Focus Partner—Session stopped");
      isSessionActive = false;
      currentUserGoal = "";
      break;

    case "goalUpdated":
      console.log("Focus Partner—Goal updated:", request.goal);
      currentUserGoal = request.goal || "";
      break;
  }

  sendResponse({ success: true });
});

// Expose global functions for testing and debugging
function exposeGlobalFunctions() {
  window.focusPartner = {
    // State functions
    getSessionState: () => ({
      isSessionActive,
      currentUserGoal,
    }),
    setSessionState: (active, goal) => {
      isSessionActive = active;
      currentUserGoal = goal;
      console.log("Focus Partner—Session state manually set:", {
        active,
        goal,
      });
    },

    // Debug functions
    logState: () => {
      console.log("Focus Partner—Current state:", {
        isSessionActive,
        currentUserGoal,
      });
    },
  };

  console.log(
    "Focus Partner—Global functions exposed. Use window.focusPartner for testing."
  );
}

// Handle page refresh/reload
window.addEventListener("beforeunload", () => {
  // Clean up any session state if needed
});

// Initialize on page load (for refreshes)
window.addEventListener("load", () => {
  console.log("Focus Partner—Page loaded, checking state");
  checkSessionState();
});

console.log("Focus Partner—Page monitor initialization complete");
