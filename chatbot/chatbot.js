// Chatbot script for Focus Partner extension
console.log("Focus Partner chatbot script loaded");

// DOM elements
const chatbot = document.getElementById("focus-partner-chatbot");
const header = document.getElementById("focus-partner-header");
const content = document.getElementById("focus-partner-content");
const messages = document.getElementById("focus-partner-messages");
const goalInput = document.getElementById("focus-partner-goal-input");
const submitBtn = document.getElementById("focus-partner-submit");
const closeBtn = document.getElementById("focus-partner-close");
const sessionControls = document.getElementById(
  "focus-partner-session-controls"
);
const startSessionBtn = document.getElementById("focus-partner-start-session");
const stopSessionBtn = document.getElementById("focus-partner-stop-session");

let userGoal = null;
let isSessionActive = false;
let awaitingConfirmation = false;
let sessionContext = {
  goal: null,
  startTime: null,
  conversationHistory: [],
  focusReminders: 0,
};

// Chat history persistence
const CHAT_HISTORY_KEY = "focus_chat_history";
let chatHistory = [];

async function loadChatHistory() {
  return new Promise((resolve) => {
    chrome.storage.local.get([CHAT_HISTORY_KEY], (result) => {
      const history = result[CHAT_HISTORY_KEY] || [];
      chatHistory = Array.isArray(history) ? history : [];
      resolve(chatHistory);
    });
  });
}

async function saveChatHistory(historyArray) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [CHAT_HISTORY_KEY]: historyArray }, () => {
      resolve();
    });
  });
}

async function saveChatMessage(message) {
  chatHistory.push(message);
  await saveChatHistory(chatHistory);
}

async function clearChatHistory() {
  return new Promise((resolve) => {
    chrome.storage.local.remove([CHAT_HISTORY_KEY], () => {
      chatHistory = [];
      resolve();
    });
  });
}

function renderMessage(message) {
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

async function initializeChat() {
  // Always rebuild UI from storage to avoid duplicate hardcoded greeting
  messages.innerHTML = "";

  const history = await loadChatHistory();
  if (history.length === 0) {
    // Seed with onboarding message and persist
    const onboarding = {
      type: "bot",
      content:
        "Hi! I'm your Focus Partner. What are you planning to focus on today?",
      timestamp: Date.now(),
    };
    await saveChatMessage(onboarding);
    renderMessage(onboarding);
  } else {
    history.forEach((m) => renderMessage(m));
    // Ensure scroll is at bottom after render
    messages.scrollTop = messages.scrollHeight;
  }
}

// Initialize chatbot
document.addEventListener("DOMContentLoaded", () => {
  console.log("Chatbot DOM loaded");
  setupEventListeners();
  makeDraggable();
  // Initialize chat history first, then load any session state
  initializeChat().then(() => {
    loadSessionState();
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

  // Session control buttons
  startSessionBtn.addEventListener("click", startFocusSession);
  stopSessionBtn.addEventListener("click", stopFocusSession);

  // Close button
  closeBtn.addEventListener("click", () => {
    closeChatbot();
  });

  // Focus input on load
  goalInput.focus();
}

// Load session state from storage
async function loadSessionState() {
  try {
    const sessionData = await getSessionData();
    if (sessionData.isSessionActive && sessionData.userGoal) {
      // Restore active session
      userGoal = sessionData.userGoal;
      isSessionActive = true;
      sessionContext.goal = sessionData.userGoal;
      sessionContext.startTime = sessionData.sessionStartTime;

      // Update UI for active session
      updateUIForActiveSession();

      // Show session active message only if no prior chat history exists
      if (!chatHistory || chatHistory.length === 0) {
        addMessage(
          `Welcome back! Your focus session is still active. Goal: "${userGoal}"`,
          "bot"
        );
      }

      // Update input placeholder
      goalInput.placeholder = "Ask me anything about your focus goal...";
    }
  } catch (error) {
    console.error("Error loading session state:", error);
  }
}

// Handle goal submission
function handleGoalSubmission() {
  const input = goalInput.value.trim();

  if (!input) {
    return;
  }

  console.log("Input submitted:", input);

  // Clear input
  goalInput.value = "";

  // Check if this is the initial goal setting or ongoing conversation
  if (!userGoal && !isSessionActive) {
    // Initial goal setting
    userGoal = input;
    sessionContext.goal = input;
    sessionContext.startTime = Date.now();
    sessionContext.conversationHistory = [];

    // Add user message
    addMessage(input, "user");
    sessionContext.conversationHistory.push({ role: "user", content: input });

    // Start dynamic AI response flow
    startDynamicGoalResponseFlow(input);
  } else if (isSessionActive) {
    // Ongoing conversation during active session
    addMessage(input, "user");
    handleConversation(input);
  } else if (awaitingConfirmation) {
    // Handle confirmation responses
    handleConfirmationResponse(input);
  } else {
    // If we have a goal but no active session, treat as conversation
    addMessage(input, "user");
    handleConversation(input);
  }
}

// Start dynamic AI response flow after goal submission
async function startDynamicGoalResponseFlow(goal) {
  awaitingConfirmation = true;

  // Send goal to parent window (content script)
  window.parent.postMessage(
    {
      action: "goalSubmitted",
      goal: goal,
    },
    "*"
  );

  // Generate dynamic AI response for the goal
  try {
    const aiResponse = await generateDynamicGoalResponse(goal);
    if (aiResponse) {
      addMessage(aiResponse, "bot");
      sessionContext.conversationHistory.push({
        role: "assistant",
        content: aiResponse,
      });
    } else {
      // Fallback response if AI fails
      const fallbackMessage = `Great! I understand you want to focus on "${goal}". Do you want to add any other details before starting your session?`;
      addMessage(fallbackMessage, "bot");
      sessionContext.conversationHistory.push({
        role: "assistant",
        content: fallbackMessage,
      });
    }
  } catch (error) {
    console.error("Error generating dynamic goal response:", error);
    // Fallback response
    const fallbackMessage = `Perfect! I'm here to help you stay focused on "${goal}". Should I confirm your goal and we can get started?`;
    addMessage(fallbackMessage, "bot");
    sessionContext.conversationHistory.push({
      role: "assistant",
      content: fallbackMessage,
    });
  }

  // Show session controls after AI response
  setTimeout(() => {
    showSessionControls();
  }, 500);
}

// Handle confirmation response
function handleConfirmationResponse(input) {
  if (!awaitingConfirmation) return;

  const lowerInput = input.toLowerCase().trim();

  // Check if user is confirming
  if (
    lowerInput === "yes" ||
    lowerInput === "confirm" ||
    lowerInput === "start" ||
    lowerInput === "go"
  ) {
    addMessage(input, "user");
    sessionContext.conversationHistory.push({ role: "user", content: input });

    // Generate dynamic confirmation response
    setTimeout(async () => {
      try {
        const confirmationResponse = await generateConfirmationResponse(input);
        if (confirmationResponse) {
          addMessage(confirmationResponse, "bot");
          sessionContext.conversationHistory.push({
            role: "assistant",
            content: confirmationResponse,
          });
        } else {
          // Fallback response
          addMessage(
            "Perfect! Ready to start your focus session. Click 'Start Focus Session' when you're ready!",
            "bot"
          );
          sessionContext.conversationHistory.push({
            role: "assistant",
            content:
              "Perfect! Ready to start your focus session. Click 'Start Focus Session' when you're ready!",
          });
        }
      } catch (error) {
        console.error("Error generating confirmation response:", error);
        addMessage(
          "Great! Ready to start your focus session. Click 'Start Focus Session' when you're ready!",
          "bot"
        );
        sessionContext.conversationHistory.push({
          role: "assistant",
          content:
            "Great! Ready to start your focus session. Click 'Start Focus Session' when you're ready!",
        });
      }
    }, 500);

    awaitingConfirmation = false;
  } else if (lowerInput === "no" || lowerInput === "cancel") {
    addMessage(input, "user");
    sessionContext.conversationHistory.push({ role: "user", content: input });

    // Reset the flow
    setTimeout(() => {
      addMessage("No problem! What would you like to focus on instead?", "bot");
      sessionContext.conversationHistory.push({
        role: "assistant",
        content: "No problem! What would you like to focus on instead?",
      });

      // Reset state
      userGoal = null;
      sessionContext.goal = null;
      sessionContext.startTime = null;
      sessionContext.conversationHistory = [];
      awaitingConfirmation = false;
      hideSessionControls();

      // Reset input placeholder
      goalInput.placeholder = "Type your goal here...";
    }, 500);
  } else {
    // User provided additional info/clarifications - treat as conversation
    addMessage(input, "user");
    sessionContext.conversationHistory.push({ role: "user", content: input });

    // Update goal with additional context
    userGoal = `${sessionContext.goal} (${input})`;
    sessionContext.goal = userGoal;

    // Generate dynamic response for additional context
    awaitingConfirmation = false;

    setTimeout(async () => {
      try {
        const contextResponse = await generateContextResponse(input);
        if (contextResponse) {
          addMessage(contextResponse, "bot");
          sessionContext.conversationHistory.push({
            role: "assistant",
            content: contextResponse,
          });
        } else {
          // Fallback response
          addMessage(
            `Perfect! I understand you want to focus on: "${userGoal}". Let me start your focus session now!`,
            "bot"
          );
          sessionContext.conversationHistory.push({
            role: "assistant",
            content: `Perfect! I understand you want to focus on: "${userGoal}". Let me start your focus session now!`,
          });
        }
      } catch (error) {
        console.error("Error generating context response:", error);
        addMessage(
          `Great! I understand you want to focus on: "${userGoal}". Let me start your focus session now!`,
          "bot"
        );
        sessionContext.conversationHistory.push({
          role: "assistant",
          content: `Great! I understand you want to focus on: "${userGoal}". Let me start your focus session now!`,
        });
      }

      // Automatically start the session
      setTimeout(() => {
        startFocusSession();
      }, 1000);
    }, 500);
  }
}

// Show session controls
function showSessionControls() {
  sessionControls.style.display = "flex";
  startSessionBtn.style.display = "block";
  stopSessionBtn.style.display = "none";
}

// Hide session controls
function hideSessionControls() {
  sessionControls.style.display = "none";
}

// Start focus session
async function startFocusSession() {
  if (!userGoal) return;

  try {
    // Save session to storage
    await saveSessionData({
      isActive: true,
      userGoal: userGoal,
      sessionStartTime: Date.now(),
      isSessionActive: true,
    });

    isSessionActive = true;
    sessionContext.startTime = Date.now();

    // Update UI
    updateUIForActiveSession();

    // Generate dynamic AI summary for session start
    const dynamicSummary = await generateDynamicSessionSummary(userGoal);
    console.log("Received dynamic summary in chatbot:", dynamicSummary);

    if (dynamicSummary && dynamicSummary.trim().length > 0) {
      addMessage(dynamicSummary, "bot");
      sessionContext.conversationHistory.push({
        role: "assistant",
        content: dynamicSummary,
      });
    } else {
      console.warn("AI summary was empty or null, using fallback");
      // Fallback response if AI fails
      addMessage(
        "🎯 Focus session started! I'll help you stay focused on your goal.",
        "bot"
      );
      sessionContext.conversationHistory.push({
        role: "assistant",
        content:
          "🎯 Focus session started! I'll help you stay focused on your goal.",
      });
    }

    // Update input placeholder
    goalInput.placeholder = "Ask me anything about your focus goal...";

    // Notify parent window
    window.parent.postMessage(
      {
        action: "sessionStarted",
        goal: userGoal,
      },
      "*"
    );
  } catch (error) {
    console.error("Error starting session:", error);
    addMessage(
      "Sorry, there was an error starting your session. Please try again.",
      "bot"
    );
  }
}

// Stop focus session
async function stopFocusSession() {
  try {
    console.log("Stopping focus session - clearing all data");

    // Clear session data from storage
    await clearSessionData();
    // Clear chat history from storage and UI
    await clearChatHistory();
    messages.innerHTML = "";

    // Reset state
    isSessionActive = false;
    userGoal = null;
    sessionContext.goal = null;
    sessionContext.startTime = null;
    sessionContext.conversationHistory = [];
    awaitingConfirmation = false;

    // Update UI
    updateUIForInactiveSession();

    // Reset input placeholder
    goalInput.placeholder = "Type your goal here...";

    // Notify parent window (content script)
    window.parent.postMessage(
      {
        action: "sessionStopped",
      },
      "*"
    );

    // Also notify background script directly
    chrome.runtime.sendMessage(
      {
        action: "sessionStopped",
      },
      (response) => {
        console.log("Background script notified of session stop:", response);
      }
    );
  } catch (error) {
    console.error("Error stopping session:", error);
    addMessage(
      "Sorry, there was an error stopping your session. Please try again.",
      "bot"
    );
  }
}

// Update UI for active session
function updateUIForActiveSession() {
  startSessionBtn.style.display = "none";
  stopSessionBtn.style.display = "block";
  sessionControls.style.display = "flex";
}

// Update UI for inactive session
function updateUIForInactiveSession() {
  hideSessionControls();
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

  // Persist message
  const messageObj = {
    type: sender === "user" ? "user" : "bot",
    content: text,
    timestamp: Date.now(),
  };
  saveChatMessage(messageObj);
}

// Generate dynamic confirmation response
async function generateConfirmationResponse(userInput) {
  console.log("Generating confirmation response for:", userInput);

  try {
    return new Promise((resolve) => {
      const messageId = Date.now().toString();

      const handleResponse = (event) => {
        if (
          event.data.action === "aiResponse" &&
          event.data.messageId === messageId
        ) {
          window.removeEventListener("message", handleResponse);
          resolve(event.data.response);
        }
      };

      window.addEventListener("message", handleResponse);

      const confirmationPrompt = `User confirmed their goal with: "${userInput}". 
      
Provide an encouraging, dynamic response acknowledging their confirmation and readiness to start their focus session. Be specific and motivating.`;

      window.parent.postMessage(
        {
          action: "getAIResponse",
          prompt: confirmationPrompt,
          messageId: messageId,
        },
        "*"
      );

      setTimeout(() => {
        window.removeEventListener("message", handleResponse);
        resolve(null);
      }, 10000);
    });
  } catch (error) {
    console.error("Error generating confirmation response:", error);
    return null;
  }
}

// Generate dynamic context response
async function generateContextResponse(userInput) {
  console.log("Generating context response for:", userInput);

  try {
    return new Promise((resolve) => {
      const messageId = Date.now().toString();

      const handleResponse = (event) => {
        if (
          event.data.action === "aiResponse" &&
          event.data.messageId === messageId
        ) {
          window.removeEventListener("message", handleResponse);
          resolve(event.data.response);
        }
      };

      window.addEventListener("message", handleResponse);

      const contextPrompt = `User provided additional context about their goal: "${userInput}". 
      
Their goal is: "${userGoal}"

Provide a dynamic response acknowledging their additional context and showing enthusiasm about starting their focus session. Be specific to their goal and context.`;

      window.parent.postMessage(
        {
          action: "getAIResponse",
          prompt: contextPrompt,
          messageId: messageId,
        },
        "*"
      );

      setTimeout(() => {
        window.removeEventListener("message", handleResponse);
        resolve(null);
      }, 10000);
    });
  } catch (error) {
    console.error("Error generating context response:", error);
    return null;
  }
}

// Generate dynamic session start response
async function generateSessionStartResponse() {
  console.log("Generating session start response for goal:", userGoal);

  try {
    return new Promise((resolve) => {
      const messageId = Date.now().toString();

      const handleResponse = (event) => {
        if (
          event.data.action === "aiResponse" &&
          event.data.messageId === messageId
        ) {
          window.removeEventListener("message", handleResponse);
          resolve(event.data.response);
        }
      };

      window.addEventListener("message", handleResponse);

      const sessionStartPrompt = `The user just started their focus session for the goal: "${userGoal}".

Provide an encouraging, dynamic response celebrating the start of their focus session. Be specific to their goal and motivating. Include an emoji and show enthusiasm.`;

      window.parent.postMessage(
        {
          action: "getAIResponse",
          prompt: sessionStartPrompt,
          messageId: messageId,
        },
        "*"
      );

      setTimeout(() => {
        window.removeEventListener("message", handleResponse);
        resolve(null);
      }, 10000);
    });
  } catch (error) {
    console.error("Error generating session start response:", error);
    return null;
  }
}

// Generate dynamic AI summary for session start
async function generateDynamicSessionSummary(userGoal) {
  console.log("Generating dynamic session summary for goal:", userGoal);

  try {
    return new Promise((resolve) => {
      const messageId = Date.now().toString();

      const handleResponse = (event) => {
        console.log("Received AI response in chatbot:", event.data);
        if (
          event.data.action === "aiResponse" &&
          event.data.messageId === messageId
        ) {
          window.removeEventListener("message", handleResponse);
          console.log("AI summary received in chatbot:", event.data.response);
          resolve(event.data.response);
        }
      };

      window.addEventListener("message", handleResponse);

      const summaryPrompt = `Create a very short, encouraging message for starting a focus session. 

Format: [Brief goal summary] + [Motivational phrase]

Examples:
- "Working on resume. Let's stay focused! 🎯"
- "Learning React. I'll help you concentrate! 💪"
- "Writing essay. Time to focus! ✨"

Keep it under 12 words total. Be encouraging and specific to their goal.

User's goal: ${userGoal}`;

      console.log(
        "Sending AI summary request from chatbot with prompt:",
        summaryPrompt
      );

      window.parent.postMessage(
        {
          action: "getAIResponse",
          prompt: summaryPrompt,
          messageId: messageId,
        },
        "*"
      );

      setTimeout(() => {
        console.warn("AI summary request timed out in chatbot");
        window.removeEventListener("message", handleResponse);
        resolve(null);
      }, 10000);
    });
  } catch (error) {
    console.error("Error generating dynamic session summary:", error);
    return null;
  }
}

// Generate dynamic session end response
async function generateSessionEndResponse() {
  console.log("Generating session end response");

  try {
    return new Promise((resolve) => {
      const messageId = Date.now().toString();

      const handleResponse = (event) => {
        if (
          event.data.action === "aiResponse" &&
          event.data.messageId === messageId
        ) {
          window.removeEventListener("message", handleResponse);
          resolve(event.data.response);
        }
      };

      window.addEventListener("message", handleResponse);

      const sessionEndPrompt = `The user just ended their focus session. 

Provide an encouraging, dynamic response celebrating their completion and asking what they'd like to focus on next. Be supportive and motivating. Include an emoji.`;

      window.parent.postMessage(
        {
          action: "getAIResponse",
          prompt: sessionEndPrompt,
          messageId: messageId,
        },
        "*"
      );

      setTimeout(() => {
        window.removeEventListener("message", handleResponse);
        resolve(null);
      }, 10000);
    });
  } catch (error) {
    console.error("Error generating session end response:", error);
    return null;
  }
}

// Generate dynamic AI response for goal submission
async function generateDynamicGoalResponse(goal) {
  console.log("Generating dynamic response for goal:", goal);

  try {
    // Send message to parent window to call AI
    return new Promise((resolve) => {
      const messageId = Date.now().toString();

      // Listen for response
      const handleResponse = (event) => {
        console.log("Received goal response:", event.data);
        if (
          event.data.action === "goalResponseGenerated" &&
          event.data.messageId === messageId
        ) {
          window.removeEventListener("message", handleResponse);
          resolve(event.data.response);
        }
      };

      window.addEventListener("message", handleResponse);

      // Request goal response from parent
      console.log("Sending goal response request:", {
        action: "generateGoalResponse",
        goal: goal,
        messageId: messageId,
      });
      window.parent.postMessage(
        {
          action: "generateGoalResponse",
          goal: goal,
          messageId: messageId,
        },
        "*"
      );

      // Timeout after 10 seconds
      setTimeout(() => {
        window.removeEventListener("message", handleResponse);
        console.log("Goal response timeout");
        resolve(null);
      }, 10000);
    });
  } catch (error) {
    console.error("Error generating dynamic goal response:", error);
    return null;
  }
}

// Analyze goal with AI
async function analyzeGoalWithAI(goal) {
  try {
    // Send message to parent window to call AI analysis
    return new Promise((resolve) => {
      const messageId = Date.now().toString();

      // Listen for response
      const handleResponse = (event) => {
        if (
          event.data.action === "goalAnalysisResponse" &&
          event.data.messageId === messageId
        ) {
          window.removeEventListener("message", handleResponse);
          resolve(event.data.analysis);
        }
      };

      window.addEventListener("message", handleResponse);

      // Request analysis from parent
      window.parent.postMessage(
        {
          action: "analyzeGoal",
          goal: goal,
          messageId: messageId,
        },
        "*"
      );

      // Timeout after 10 seconds
      setTimeout(() => {
        window.removeEventListener("message", handleResponse);
        resolve(null);
      }, 10000);
    });
  } catch (error) {
    console.error("Error analyzing goal:", error);
    return null;
  }
}

// Handle ongoing conversation with AI
async function handleConversation(userMessage) {
  if (!userGoal) {
    addMessage("Please first tell me what you want to focus on today.", "bot");
    return;
  }

  // Add user message to conversation history
  sessionContext.conversationHistory.push({
    role: "user",
    content: userMessage,
  });

  try {
    // Create focused AI prompt
    const aiResponse = await getFocusedAIResponse(userMessage);

    if (aiResponse) {
      addMessage(aiResponse, "bot");
      sessionContext.conversationHistory.push({
        role: "assistant",
        content: aiResponse,
      });
    } else {
      addMessage(
        "I'm here to help you stay focused on your goal. How can I assist you with that?",
        "bot"
      );
      sessionContext.conversationHistory.push({
        role: "assistant",
        content:
          "I'm here to help you stay focused on your goal. How can I assist you with that?",
      });
    }
  } catch (error) {
    console.error("Error in conversation:", error);
    addMessage(
      "I'm here to help you stay focused on your goal. How can I assist you with that?",
      "bot"
    );
    sessionContext.conversationHistory.push({
      role: "assistant",
      content:
        "I'm here to help you stay focused on your goal. How can I assist you with that?",
    });
  }
}

// Get focused AI response that only discusses goals and focus
async function getFocusedAIResponse(userMessage) {
  console.log("Getting AI response for:", userMessage, "Goal:", userGoal);

  const focusedPrompt = `User's current goal: "${userGoal}"
User's message: "${userMessage}"

Please respond as a Focus Partner AI assistant. Help the user stay focused on their goal and provide relevant guidance, encouragement, or questions. Be conversational and supportive.`;

  try {
    // Send message to parent window to call AI
    return new Promise((resolve) => {
      const messageId = Date.now().toString();

      // Listen for response
      const handleResponse = (event) => {
        console.log("Received AI response:", event.data);
        if (
          event.data.action === "aiResponse" &&
          event.data.messageId === messageId
        ) {
          window.removeEventListener("message", handleResponse);
          resolve(event.data.response);
        }
      };

      window.addEventListener("message", handleResponse);

      // Request AI response from parent
      console.log("Sending AI request:", {
        action: "getAIResponse",
        prompt: focusedPrompt,
        messageId: messageId,
      });
      window.parent.postMessage(
        {
          action: "getAIResponse",
          prompt: focusedPrompt,
          messageId: messageId,
        },
        "*"
      );

      // Timeout after 10 seconds
      setTimeout(() => {
        window.removeEventListener("message", handleResponse);
        console.log("AI response timeout");
        resolve(null);
      }, 10000);
    });
  } catch (error) {
    console.error("Error getting AI response:", error);
    return null;
  }
}

// Storage functions
async function getSessionData() {
  return new Promise((resolve) => {
    chrome.storage.local.get(
      [
        "isActive",
        "userGoal",
        "sessionStartTime",
        "isSessionActive",
        "aiAnalysis",
      ],
      (result) => {
        resolve({
          isActive: result.isActive || false,
          userGoal: result.userGoal || "",
          sessionStartTime: result.sessionStartTime || null,
          isSessionActive: result.isSessionActive || false,
          aiAnalysis: result.aiAnalysis || null,
        });
      }
    );
  });
}

async function saveSessionData(data) {
  return new Promise((resolve) => {
    chrome.storage.local.set(data, () => {
      resolve();
    });
  });
}

async function clearSessionData() {
  return new Promise((resolve) => {
    chrome.storage.local.remove(
      [
        "isActive",
        "userGoal",
        "sessionStartTime",
        "isSessionActive",
        "aiAnalysis",
      ],
      () => {
        resolve();
      }
    );
  });
}

// Close chatbot
function closeChatbot() {
  // Send message to parent window (content script)
  window.parent.postMessage(
    {
      action: "closeOverlay",
    },
    "*"
  );
}

// Provide focus reminder
function provideFocusReminder() {
  if (!userGoal || !isSessionActive) return;

  sessionContext.focusReminders++;

  const reminders = [
    `Remember your goal: "${userGoal}". How can I help you stay focused?`,
    `You're working on: "${userGoal}". What's your next step?`,
    `Stay focused on: "${userGoal}". Need any guidance?`,
    `Your focus goal: "${userGoal}". How's it going?`,
    `Keep working on: "${userGoal}". Any questions?`,
  ];

  const reminder = reminders[sessionContext.focusReminders % reminders.length];
  addMessage(reminder, "bot");
  sessionContext.conversationHistory.push({
    role: "assistant",
    content: reminder,
  });
}

// Listen for focus reminder requests from parent
window.addEventListener("message", (event) => {
  if (event.data.action === "provideFocusReminder") {
    provideFocusReminder();
  }
});

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
