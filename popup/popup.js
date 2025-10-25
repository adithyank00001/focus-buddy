// Popup script for Focus Partner extension - Chatbot Interface
console.log("Focus Partner popup script loaded");

// DOM elements
const chatbot = document.getElementById("focus-partner-chatbot");
const header = document.getElementById("focus-partner-header");
const content = document.getElementById("focus-partner-content");
const messages = document.getElementById("focus-partner-messages");
const goalInput = document.getElementById("focus-partner-goal-input");
const submitBtn = document.getElementById("focus-partner-submit");
const closeBtn = document.getElementById("focus-partner-close");
const startBtn = document.getElementById("focus-partner-start");
const stopBtn = document.getElementById("focus-partner-stop");
const testOverlayBtn = document.getElementById("focus-partner-test-overlay");

// Local state
let goalStack = [];
let sessionActive = false;

// Chat history persistence for popup chat
const POPUP_CHAT_HISTORY_KEY = "focus_chat_history";
let popupChatHistory = [];

async function popupLoadChatHistory() {
  return new Promise((resolve) => {
    chrome.storage.local.get([POPUP_CHAT_HISTORY_KEY], (result) => {
      const history = result[POPUP_CHAT_HISTORY_KEY] || [];
      popupChatHistory = Array.isArray(history) ? history : [];
      resolve(popupChatHistory);
    });
  });
}

async function popupSaveChatHistory(historyArray) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [POPUP_CHAT_HISTORY_KEY]: historyArray }, () => {
      resolve();
    });
  });
}

async function popupSaveChatMessage(message) {
  popupChatHistory.push(message);
  await popupSaveChatHistory(popupChatHistory);
}

async function popupClearChatHistory() {
  return new Promise((resolve) => {
    chrome.storage.local.remove([POPUP_CHAT_HISTORY_KEY], () => {
      popupChatHistory = [];
      resolve();
    });
  });
}

function popupRenderMessage(message) {
  const sender = message.type === "user" ? "user" : "bot";
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${sender}-message`;

  const contentDiv = document.createElement("div");
  contentDiv.className = "message-content";

  const p = document.createElement("p");
  p.textContent = message.content;

  contentDiv.appendChild(p);
  messageDiv.appendChild(contentDiv);
  messages.appendChild(messageDiv);
}

async function popupInitializeChat() {
  // Always rebuild UI from storage to avoid duplicate greeting
  messages.innerHTML = "";
  const history = await popupLoadChatHistory();
  if (history.length === 0) {
    const onboarding = {
      type: "bot",
      content: "Hi! I'm your Focus Partner. What are you planning to do today?",
      timestamp: Date.now(),
    };
    await popupSaveChatMessage(onboarding);
    popupRenderMessage(onboarding);
  } else {
    history.forEach((m) => popupRenderMessage(m));
    messages.scrollTop = messages.scrollHeight;
  }
}

// Initialize popup
document.addEventListener("DOMContentLoaded", () => {
  console.log("Popup DOM loaded");
  setupEventListeners();
  makeDraggable();
  popupInitializeChat().then(() => {
    restoreSessionState();
  });
});

// Setup event listeners
function setupEventListeners() {
  // Submit button
  submitBtn.addEventListener("click", handleGoalSubmission);

  // Enter key in input
  goalInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      handleGoalSubmission();
    }
  });

  // Close button
  closeBtn.addEventListener("click", () => {
    closeChatbot();
  });

  // Start/Stop buttons
  startBtn.addEventListener("click", onStartSession);
  stopBtn.addEventListener("click", onStopSession);

  // Test overlay button
  testOverlayBtn.addEventListener("click", onTestOverlay);

  // Focus input on load
  goalInput.focus();
}

// Handle goal/detail submission (static flow, no AI)
async function handleGoalSubmission() {
  const text = goalInput.value.trim();
  if (!text) return;

  addMessage(text, "user");
  goalInput.value = "";

  // Push to stack
  goalStack.push(text);

  // Detect confirmation keywords
  const normalized = text.toLowerCase();
  const confirmation = [
    "no",
    "nothing",
    "nope",
    "that's it",
    "thats it",
    "start",
    "start session",
  ];
  const isConfirm = confirmation.some(
    (k) => normalized === k || normalized.includes(k)
  );

  if (goalStack.length === 1 && !isConfirm) {
    // First message received -> static follow-up without referencing goal
    addMessage(
      "Great, let's focus on that. Before we start, is there anything else you need to share or mention?",
      "bot"
    );
    showStart(false);
    return;
  }

  if (isConfirm) {
    addMessage(
      "Great! Let's get started. Click 'Start Focus Session' to begin.",
      "bot"
    );
    showStart(true);
    return;
  }

  // Additional details stacked; keep awaiting confirmation
}

function showStart(canStart) {
  startBtn.style.display = canStart ? "inline-block" : "none";
}

function setInputVisible(visible) {
  const inputWrap = document.getElementById("focus-partner-input");
  inputWrap.style.display = visible ? "flex" : "none";
}

async function onStartSession() {
  if (!goalStack.length) return;
  sessionActive = true;
  persistState();

  setInputVisible(false);
  startBtn.style.display = "none";
  stopBtn.style.display = "inline-block";

  // Compile goal + details
  const goalText = goalStack[0];
  const details = goalStack.slice(1);

  // Generate dynamic AI summary for session start
  try {
    console.log("Generating dynamic summary for goal:", goalText);
    const dynamicSummary = await generateDynamicSessionSummary(goalText);
    console.log("Received dynamic summary:", dynamicSummary);

    if (dynamicSummary && dynamicSummary.trim().length > 0) {
      addMessage(dynamicSummary, "bot");
    } else {
      console.warn("AI summary was empty or null, using fallback");
      // Fallback response if AI fails
      addMessage(
        "🎯 Focus session started! I'll help you stay focused on your goal.",
        "bot"
      );
    }
  } catch (error) {
    console.error("Error generating dynamic session summary:", error);
    // Fallback response
    addMessage(
      "🎯 Focus session started! I'll help you stay focused on your goal.",
      "bot"
    );
  }

  // Store session data and notify content scripts
  chrome.storage.local.set(
    {
      isActive: true,
      userGoal: goalText,
      sessionStartTime: Date.now(),
      isSessionActive: true,
    },
    () => {
      console.log("Session data stored");

      // Send message to all content scripts to show blocking overlay
      chrome.runtime.sendMessage({ action: "sessionStarted", goal: goalText });
    }
  );
}

async function onStopSession() {
  console.log("Stopping session from popup - clearing all data");

  sessionActive = false;
  goalStack = [];

  // Clear all session-related storage
  chrome.storage.local.remove(
    [
      "isActive",
      "userGoal",
      "sessionStartTime",
      "isSessionActive",
      "aiAnalysis",
      "focusSession",
      "focus_chat_history",
    ],
    () => {
      console.log("All session data cleared from popup");
    }
  );

  persistState();

  stopBtn.style.display = "none";
  setInputVisible(true);

  // Reset UI to initial greeting
  await popupClearChatHistory();
  messages.innerHTML = "";
  const onboarding = {
    type: "bot",
    content: "Hi! I'm your Focus Partner. What are you planning to do today?",
    timestamp: Date.now(),
  };
  await popupSaveChatMessage(onboarding);
  popupRenderMessage(onboarding);

  // Send message to all content scripts to hide blocking overlay
  chrome.runtime.sendMessage({ action: "sessionStopped" });
}

// Handle test overlay button click
function onTestOverlay() {
  console.log("Test overlay button clicked");

  // Send message to background script to show test overlay
  chrome.runtime.sendMessage(
    {
      action: "showTestOverlay",
    },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error("Chrome runtime error:", chrome.runtime.lastError);
        return;
      }

      if (response && response.success) {
        console.log("Test overlay triggered successfully");
      } else {
        console.error("Failed to trigger test overlay. Response:", response);
      }
    }
  );
}

function persistState() {
  try {
    chrome.storage.local.set({
      focusSession: {
        sessionActive,
        goalStack,
      },
    });
  } catch (e) {
    console.warn("Storage unavailable", e);
  }
}

function restoreSessionState() {
  try {
    chrome.storage.local.get(["focusSession"], (data) => {
      const s = data && data.focusSession;
      if (!s) return;
      sessionActive = !!s.sessionActive;
      goalStack = Array.isArray(s.goalStack) ? s.goalStack : [];

      if (sessionActive) {
        setInputVisible(false);
        startBtn.style.display = "none";
        stopBtn.style.display = "inline-block";
      } else {
        setInputVisible(true);
        stopBtn.style.display = "none";
      }
    });
  } catch (e) {
    console.warn("Restore state failed", e);
  }
}

// Add message to chat
function addMessage(text, sender) {
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${sender}-message`;

  const contentDiv = document.createElement("div");
  contentDiv.className = "message-content";

  const p = document.createElement("p");
  p.textContent = text;

  contentDiv.appendChild(p);
  messageDiv.appendChild(contentDiv);
  messages.appendChild(messageDiv);

  // Scroll to bottom
  messages.scrollTop = messages.scrollHeight;

  // Persist message in chat history
  const messageObj = {
    type: sender === "user" ? "user" : "bot",
    content: text,
    timestamp: Date.now(),
  };
  popupSaveChatMessage(messageObj);
}

// Close chatbot
function closeChatbot() {
  // Send message to background script
  chrome.runtime.sendMessage(
    {
      action: "closeOverlay",
    },
    (response) => {
      if (response && response.success) {
        console.log("Overlay closed");
      }
    }
  );
}

// Make chatbot draggable
function makeDraggable() {
  let isDragging = false;
  let startX, startY, startLeft, startTop;

  header.addEventListener("mousedown", (e) => {
    // Don't drag if clicking on buttons
    if (e.target.tagName === "BUTTON") {
      return;
    }

    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;

    const rect = chatbot.getBoundingClientRect();
    startLeft = rect.left;
    startTop = rect.top;

    chatbot.style.cursor = "grabbing";
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    chatbot.style.left = `${startLeft + deltaX}px`;
    chatbot.style.top = `${startTop + deltaY}px`;
  });

  document.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      chatbot.style.cursor = "default";
    }
  });
}

// Generate dynamic AI summary for session start
async function generateDynamicSessionSummary(userGoal) {
  console.log("Generating dynamic session summary for goal:", userGoal);

  try {
    // Send request to background script to get AI response
    return new Promise((resolve) => {
      const messageId = Date.now().toString();

      const summaryPrompt = `Create a very short, encouraging message for starting a focus session. 

Format: [Brief goal summary] + [Motivational phrase]

Examples:
- "Working on resume. Let's stay focused! 🎯"
- "Learning React. I'll help you concentrate! 💪"
- "Writing essay. Time to focus! ✨"

Keep it under 12 words total. Be encouraging and specific to their goal.

User's goal: ${userGoal}`;

      console.log("Sending AI summary request with prompt:", summaryPrompt);

      // Send request to background script
      chrome.runtime.sendMessage({
        action: "generateAISummary",
        prompt: summaryPrompt,
        messageId: messageId,
      });

      // Poll for the result instead of waiting for a message
      let attempts = 0;
      const maxAttempts = 40; // 8 seconds with 200ms intervals

      const pollForResult = () => {
        attempts++;

        chrome.storage.local.get([`aiSummary_${messageId}`], (result) => {
          const summaryData = result[`aiSummary_${messageId}`];

          if (summaryData) {
            console.log("AI summary received:", summaryData);

            // Clean up the storage
            chrome.storage.local.remove([`aiSummary_${messageId}`]);

            if (summaryData.status === "success") {
              resolve(summaryData.summary || null);
            } else {
              console.error("AI summary generation failed:", summaryData.error);
              resolve(null);
            }
          } else if (attempts < maxAttempts) {
            // Continue polling
            setTimeout(pollForResult, 200);
          } else {
            // Timeout
            console.warn("AI summary request timed out");
            resolve(null);
          }
        });
      };

      // Start polling after a short delay
      setTimeout(pollForResult, 200);
    });
  } catch (error) {
    console.error("Error generating dynamic session summary:", error);
    return null;
  }
}
