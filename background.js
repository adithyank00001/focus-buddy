import { ENV_CONFIG } from "./scripts/config.js";

// Background service worker for Focus Partner extension
console.log("Focus Partner background script loaded");

// AI Configuration now uses the imported ENV_CONFIG
let AI_CONFIG = {
  API_ENDPOINT: "https://api.openai.com/v1/chat/completions",
  API_KEY: ENV_CONFIG?.OPENAI_API_KEY || "", // Use imported config
  MODEL: ENV_CONFIG?.OPENAI_MODEL || "gpt-5-nano", // Use imported config
  DEBUG: true,
};

// Log configuration on startup
console.log("AI_CONFIG loaded:", {
  API_ENDPOINT: AI_CONFIG.API_ENDPOINT,
  MODEL: AI_CONFIG.MODEL,
  API_KEY_PRESENT: !!AI_CONFIG.API_KEY,
  API_KEY_PREFIX: AI_CONFIG.API_KEY
    ? AI_CONFIG.API_KEY.substring(0, 10) + "..."
    : "NOT_SET",
});

// AI Functions (moved from ai.js to avoid dynamic imports)
async function analyzeUserGoal(userGoal) {
  console.log("Analyzing user goal:", userGoal);

  const prompt = `Given the user's stated goal: "${userGoal}", analyze it and return a JSON response with the following structure:
{
  "summary": "Brief summary of the goal",
  "activity_type": "Type of activity (e.g., 'learning', 'work', 'research', 'entertainment')",
  "focus_elements": ["key", "focus", "areas"],
  "distraction_patterns": ["common", "distractions", "to", "avoid"]
}`;

  try {
    const response = await callAI(prompt);
    return JSON.parse(response);
  } catch (error) {
    console.error("Error analyzing goal:", error);
    // Return fallback analysis
    return {
      summary: userGoal,
      activity_type: "general",
      focus_elements: ["focus", "productivity"],
      distraction_patterns: ["social media", "entertainment", "news"],
    };
  }
}

async function callAI(prompt) {
  if (AI_CONFIG.DEBUG) {
    console.log("AI API call:", prompt);
  }

  // Check if API key is configured
  if (!AI_CONFIG.API_KEY || AI_CONFIG.API_KEY === "your-api-key-here") {
    console.warn("AI API key not configured, using mock response");
    console.warn("Please set a valid OpenAI API key in your .env file");
    return getMockResponse(prompt);
  }

  try {
    console.log("Making API call to:", AI_CONFIG.API_ENDPOINT);
    console.log("Using model:", AI_CONFIG.MODEL);
    console.log("API Key present:", !!AI_CONFIG.API_KEY);

    const requestBody = {
      model: AI_CONFIG.MODEL,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      max_completion_tokens: 300,
    };

    console.log("Request body:", JSON.stringify(requestBody, null, 2));

    const response = await fetch(AI_CONFIG.API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AI_CONFIG.API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    console.log("Response status:", response.status);
    console.log("Response ok:", response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API error response:", errorText);

      // Handle specific authentication errors
      if (response.status === 401) {
        console.error("Authentication failed - check your API key");
        throw new Error(
          `Authentication failed: Please check your OpenAI API key in the .env file`
        );
      }

      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("Full API response:", data);

    const aiResponse = data.choices[0].message.content;
    console.log("Extracted AI response:", aiResponse);

    return aiResponse;
  } catch (error) {
    console.error("AI API error details:", error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    return getMockResponse(prompt);
  }
}

function getMockResponse(prompt) {
  // Return a simple mock response for testing
  console.log("Using mock response for prompt:", prompt);
  return "🎯 Focus session started! I'll help you stay focused on your goal.";
}

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Background received message:", request);

  switch (request.action) {
    case "activate":
      // Store activation state
      chrome.storage.local.set({ isActive: true }, () => {
        console.log("Extension activated");
        sendResponse({ success: true });
      });
      break;

    case "deactivate":
      // Store deactivation state
      chrome.storage.local.set({ isActive: false }, () => {
        console.log("Extension deactivated");
        sendResponse({ success: true });
      });
      break;

    case "getState":
      // Get current state
      chrome.storage.local.get(["isActive"], (result) => {
        sendResponse({ isActive: result.isActive || false });
      });
      break;

    case "goalSubmitted":
      // Handle goal submission and AI analysis
      handleGoalSubmission(request.goal);
      sendResponse({ success: true });
      break;

    case "analyzeGoal":
      // Handle goal analysis request from chatbot
      handleGoalAnalysis(request.goal, request.messageId, sender.tab.id);
      sendResponse({ success: true });
      break;

    case "sessionStarted":
      // Handle session start
      handleSessionStarted(request.goal);
      sendResponse({ success: true });
      break;

    case "sessionStopped":
      // Handle session stop
      handleSessionStopped();
      sendResponse({ success: true });
      break;

    case "generateAISummary":
      // Handle AI summary generation request from popup
      handleAISummaryGeneration(request.prompt, request.messageId, sender);
      sendResponse({ success: true });
      break;

    case "performRelevanceCheck":
      // Handle relevance check request from ai.js
      handleRelevanceCheck(request.prompt, request.requestId, sender);
      sendResponse({ success: true });
      break;

    case "performAIResponse":
      // Handle AI response request from ai.js
      handleAIResponse(request.prompt, request.requestId);
      sendResponse({ success: true });
      break;

    // Test overlay functionality disabled for text extraction testing
    // case "showTestOverlay":
    //   // Handle test overlay request
    //   handleTestOverlay(sender.tab?.id);
    //   sendResponse({ success: true });
    //   break;

    default:
      sendResponse({ error: "Unknown action" });
  }

  // Return true to indicate we will send a response asynchronously
  return true;
});

// Handle goal submission and AI analysis
async function handleGoalSubmission(goal) {
  console.log("Processing goal submission:", goal);

  try {
    // Analyze the user goal using AI (now using inlined function)
    const aiAnalysis = await analyzeUserGoal(goal);

    // Store the AI analysis
    chrome.storage.local.set(
      {
        aiAnalysis: aiAnalysis,
        goalProcessed: true,
      },
      function () {
        console.log("AI analysis stored:", aiAnalysis);
      }
    );
  } catch (error) {
    console.error("Error processing goal:", error);

    // Store fallback analysis
    const fallbackAnalysis = {
      summary: goal,
      activity_type: "general",
      focus_elements: ["focus", "productivity"],
      distraction_patterns: ["social media", "entertainment", "news"],
    };

    chrome.storage.local.set({
      aiAnalysis: fallbackAnalysis,
      goalProcessed: true,
    });
  }
}

// Handle goal analysis request from chatbot
async function handleGoalAnalysis(goal, messageId, tabId) {
  console.log("Processing goal analysis request:", goal, messageId);

  try {
    // Analyze the user goal using AI (now using inlined function)
    const aiAnalysis = await analyzeUserGoal(goal);

    // Store the AI analysis
    chrome.storage.local.set(
      {
        aiAnalysis: aiAnalysis,
        goalProcessed: true,
      },
      function () {
        console.log("AI analysis stored:", aiAnalysis);

        // Send analysis response back to the specific tab
        chrome.tabs
          .sendMessage(tabId, {
            action: "goalAnalyzed",
            goal: goal,
            analysis: aiAnalysis,
            messageId: messageId,
          })
          .catch(function () {
            console.log("Could not send analysis to tab:", tabId);
          });
      }
    );
  } catch (error) {
    console.error("Error processing goal analysis:", error);

    // Store fallback analysis
    const fallbackAnalysis = {
      summary: goal,
      activity_type: "general",
      focus_elements: ["focus", "productivity"],
      distraction_patterns: ["social media", "entertainment", "news"],
    };

    chrome.storage.local.set({
      aiAnalysis: fallbackAnalysis,
      goalProcessed: true,
    });

    // Send fallback analysis response
    chrome.tabs
      .sendMessage(tabId, {
        action: "goalAnalyzed",
        goal: goal,
        analysis: fallbackAnalysis,
        messageId: messageId,
      })
      .catch(function () {
        console.log("Could not send fallback analysis to tab:", tabId);
      });
  }
}

// Handle session started
function handleSessionStarted(goal) {
  console.log("Session started:", goal);

  // Store session data
  chrome.storage.local.set(
    {
      isActive: true,
      userGoal: goal,
      sessionStartTime: Date.now(),
      isSessionActive: true,
    },
    () => {
      console.log("Session data stored in background");

      // Notify all tabs about session start
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          chrome.tabs
            .sendMessage(tab.id, {
              action: "sessionStarted",
              goal: goal,
            })
            .catch(() => {
              // Ignore errors for tabs that don't have content script
            });
        });
      });
    }
  );
}

// Handle session stopped
function handleSessionStopped() {
  console.log("Session stopped - clearing all data");

  // Clear ALL session-related data
  chrome.storage.local.remove(
    [
      "isActive",
      "userGoal",
      "sessionStartTime",
      "isSessionActive",
      "aiAnalysis",
      "focusSession",
      "focus_chat_history",
      "goalProcessed",
    ],
    () => {
      console.log("All session data cleared in background");

      // Notify all tabs about session stop
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          chrome.tabs
            .sendMessage(tab.id, {
              action: "sessionStopped",
            })
            .catch(() => {
              // Ignore errors for tabs that don't have content script
            });
        });
      });
    }
  );
}

// Test API call function
async function testAPICall() {
  console.log("=== TESTING API CALL ===");
  try {
    const testPrompt = "Say hello in one word";
    const result = await callAI(testPrompt);
    console.log("API test result:", result);
  } catch (error) {
    console.error("API test failed:", error);
  }
  console.log("=== END API TEST ===");
}

// Handle AI summary generation request from popup
async function handleAISummaryGeneration(prompt, messageId, sender) {
  console.log("Processing AI summary generation request:", messageId);
  console.log("Prompt:", prompt);

  try {
    // Use the existing AI function to generate summary
    const summary = await callAI(prompt);
    console.log("AI summary generated:", summary);

    // Store the result in storage for the popup to retrieve
    chrome.storage.local.set(
      {
        [`aiSummary_${messageId}`]: {
          summary: summary,
          timestamp: Date.now(),
          status: "success",
        },
      },
      () => {
        console.log("AI summary stored for popup retrieval");

        // Clean up old summary results (older than 5 minutes)
        chrome.storage.local.get(null, (items) => {
          const now = Date.now();
          const keysToRemove = [];

          for (const key in items) {
            if (key.startsWith("aiSummary_") && items[key].timestamp) {
              if (now - items[key].timestamp > 5 * 60 * 1000) {
                // 5 minutes
                keysToRemove.push(key);
              }
            }
          }

          if (keysToRemove.length > 0) {
            chrome.storage.local.remove(keysToRemove, () => {
              console.log(
                `Cleaned up ${keysToRemove.length} old AI summary results`
              );
            });
          }
        });
      }
    );
  } catch (error) {
    console.error("Error generating AI summary:", error);

    // Store error result in storage
    chrome.storage.local.set(
      {
        [`aiSummary_${messageId}`]: {
          summary: null,
          timestamp: Date.now(),
          status: "error",
          error: error.message,
        },
      },
      () => {
        console.log("AI summary error stored for popup retrieval");

        // Clean up old summary results (older than 5 minutes)
        chrome.storage.local.get(null, (items) => {
          const now = Date.now();
          const keysToRemove = [];

          for (const key in items) {
            if (key.startsWith("aiSummary_") && items[key].timestamp) {
              if (now - items[key].timestamp > 5 * 60 * 1000) {
                // 5 minutes
                keysToRemove.push(key);
              }
            }
          }

          if (keysToRemove.length > 0) {
            chrome.storage.local.remove(keysToRemove, () => {
              console.log(
                `Cleaned up ${keysToRemove.length} old AI summary results`
              );
            });
          }
        });
      }
    );
  }
}

// Handle relevance check request from ai.js
async function handleRelevanceCheck(prompt, requestId, sender) {
  console.log("Processing relevance check request:", requestId);
  console.log("Prompt:", prompt);
  console.log("Sender tab ID:", sender.tab?.id);

  try {
    // Use the existing AI function for relevance check
    const response = await callAI(prompt);
    console.log("Relevance check response:", response);

    // Send response back to the specific tab that made the request
    if (sender.tab?.id) {
      chrome.tabs
        .sendMessage(sender.tab.id, {
          action: "relevanceCheckResponse",
          requestId: requestId,
          response: response,
        })
        .catch((error) => {
          console.error("Error sending relevance response to tab:", error);
        });
    }
  } catch (error) {
    console.error("Error processing relevance check:", error);

    // Send error response back to the specific tab
    if (sender.tab?.id) {
      chrome.tabs
        .sendMessage(sender.tab.id, {
          action: "relevanceCheckResponse",
          requestId: requestId,
          response: "NO", // Default to NO on error
        })
        .catch((error) => {
          console.error("Error sending error response to tab:", error);
        });
    }
  }
}

// Handle AI response request from ai.js
async function handleAIResponse(prompt, requestId) {
  console.log("Processing AI response request:", requestId);
  console.log("Prompt:", prompt);

  try {
    // Use the existing AI function for AI response
    const response = await callAI(prompt);
    console.log("AI response generated:", response);

    // Send response back to ai.js
    chrome.runtime.sendMessage({
      action: "aiResponseResponse",
      requestId: requestId,
      response: response,
    });
  } catch (error) {
    console.error("Error generating AI response:", error);

    // Send error response back to ai.js
    chrome.runtime.sendMessage({
      action: "aiResponseResponse",
      requestId: requestId,
      response: null,
    });
  }
}

// Handle test overlay request - DISABLED for text extraction testing
/*
function handleTestOverlay(tabId) {
  console.log("Handling test overlay request for tab:", tabId);

  if (tabId) {
    // Send message to the specific tab to show test overlay
    chrome.tabs
      .sendMessage(tabId, {
        action: "showTestOverlay",
      })
      .catch((error) => {
        console.error(
          "Error sending test overlay message to tab:",
          tabId,
          error
        );
      });
  } else {
    // If no tabId (called from popup), send to all tabs
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        chrome.tabs
          .sendMessage(tab.id, {
            action: "showTestOverlay",
          })
          .catch((error) => {
            console.error(
              "Error sending test overlay message to tab:",
              tab.id,
              error
            );
          });
      });
    });
  }
}
*/

// Initialize storage on startup
chrome.runtime.onStartup.addListener(() => {
  console.log("Focus Partner extension started");
  chrome.storage.local.set({ isActive: false });
});
