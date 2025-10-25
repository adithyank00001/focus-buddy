// All MVP page understanding, AI relevance, and distraction site blocking code has been removed for a clean slate. Ready for next implementation.

// Content script for Focus Partner extension
console.log("Focus Partner content script loaded");
console.log("Content script executing on:", window.location.href);

// A map to store resolvers for pending AI requests
const pendingAIRequests = new Map();

/**
 * [NEW] Listen for responses coming back from the ai.js script.
 */
window.addEventListener(
  "message",
  (event) => {
    // We only accept messages from ourselves, not from any other source.
    if (event.source !== window) {
      return;
    }

    const message = event.data;

    // Check if the message is from our AI script and is a response
    if (
      message.source === "focuspartner-ai-script" &&
      message.action === "relevanceResponse"
    ) {
      const resolver = pendingAIRequests.get(message.requestId);
      if (resolver) {
        if (message.response === "YES" || message.response === "NO") {
          resolver.resolve(message.response);
        } else {
          // Handle unexpected responses
          console.warn("Unexpected AI response:", message.response);
          resolver.resolve("NO"); // Default to NO
        }
        pendingAIRequests.delete(message.requestId);
      }
    }

    // Handle AI responses for chatbot
    if (
      message.source === "focuspartner-ai-script" &&
      message.action === "aiResponse"
    ) {
      const resolver = pendingAIRequests.get(message.requestId);
      if (resolver) {
        resolver.resolve(message.response);
        pendingAIRequests.delete(message.requestId);
      }
    }

    // Handle AI response requests from chatbot
    if (message.action === "getAIResponse") {
      handleAIResponseRequest(message);
    }

    // Handle forwarded requests from ai.js to background script
    if (
      message.source === "focuspartner-ai-script" &&
      message.action === "forwardToBackground"
    ) {
      handleForwardToBackground(message.payload);
    }
  },
  false
);

// Ensure AI script is injected into the page context
(function injectAiScript() {
  try {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("scripts/ai.js");
    (document.head || document.documentElement).appendChild(script);
    console.log("Focus Partner - Injected AI script into page context.");
    script.onload = () => {
      // Optional: remove the script tag from the DOM after it has loaded
      script.remove();
    };
  } catch (e) {
    console.error("Focus Partner - Failed to inject AI script:", e);
  }
})();

// Enhanced text extraction for MVP testing
function extractPageText() {
  try {
    // Extract all visible, readable text from the page
    let extractedText = document.body.innerText;

    // If no text from body, try other sources
    if (!extractedText || extractedText.trim().length === 0) {
      // Try document title
      extractedText = document.title || "";

      // Try meta description
      const metaDescription = document.querySelector(
        'meta[name="description"]'
      );
      if (metaDescription) {
        extractedText += " " + metaDescription.getAttribute("content");
      }

      // Try URL path for context
      const urlPath = window.location.pathname;
      if (urlPath && urlPath !== "/") {
        extractedText += " " + urlPath;
      }

      // Try to get any text from visible elements
      const visibleElements = document.querySelectorAll(
        "p, h1, h2, h3, h4, h5, h6, span, div, a"
      );
      let visibleText = "";
      for (let element of visibleElements) {
        if (element.offsetParent !== null && element.innerText) {
          // Check if element is visible
          visibleText += " " + element.innerText;
        }
      }

      if (visibleText.trim().length > 0) {
        extractedText += " " + visibleText;
      }
    }

    console.log("Focus Partner - Extracted Text:", extractedText);
    return extractedText;
  } catch (error) {
    console.error("Focus Partner - Error extracting text:", error);
    return null;
  }
}

/**
 * [REWRITTEN] AI relevance check function.
 * This now sends a message to the ai.js script and waits for a response.
 */
async function checkPageRelevance(userGoal, pageText) {
  console.log(
    "Focus Partner - Sending page relevance check for goal:",
    userGoal
  );

  return new Promise((resolve) => {
    // Generate a unique ID for this request
    const requestId = `fp-req-${Date.now()}-${Math.random()}`;

    // Store the resolver function so we can call it when the response comes back
    pendingAIRequests.set(requestId, { resolve });

    // Send the data to the ai.js script in the page's world
    window.postMessage(
      {
        source: "focuspartner-content-script",
        action: "checkRelevance",
        payload: {
          userGoal: userGoal,
          pageText: pageText,
          requestId: requestId,
        },
      },
      "*"
    ); // Using "*" is okay for extension-to-page communication like this

    // Add a timeout in case the AI script doesn't respond
    setTimeout(() => {
      if (pendingAIRequests.has(requestId)) {
        console.error("Focus Partner - AI relevance check timed out.");
        pendingAIRequests.delete(requestId);
        resolve("NO"); // Default to "NO" on timeout
      }
    }, 5000); // 5-second timeout
  });
}

// Log AI relevance response with dev-friendly messages
function logAIRelevanceResponse(aiResponse) {
  console.log("Focus Partner - AI Relevance Response:", aiResponse);

  if (aiResponse.trim().toUpperCase() === "NO") {
    console.log("AI Response: NO (Would show blocker)");
  } else if (aiResponse.trim().toUpperCase() === "YES") {
    console.log("AI Response: YES (Would allow browsing)");
  } else {
    console.log("Unexpected AI response:", aiResponse);
  }
}

// [REWRITTEN] This function is now much simpler.
async function checkPageRelevanceIfSessionActive() {
  try {
    const result = await chrome.storage.local.get([
      "isSessionActive",
      "userGoal",
    ]);

    console.log("Focus Partner - Checking session state:", {
      isSessionActive: result.isSessionActive,
      userGoal: result.userGoal ? "Present" : "Missing",
      url: window.location.href,
    });

    if (result.isSessionActive && result.userGoal) {
      console.log("Focus Partner - Session active, checking page relevance.");
      const pageText = extractPageText();
      const pageContent =
        pageText && pageText.trim().length > 0
          ? pageText
          : `URL: ${window.location.href}`;

      // Await the YES/NO response from our new messaging system
      const aiResponse = await checkPageRelevance(result.userGoal, pageContent);

      // Log the final result to the console as required
      logAIRelevanceResponse(aiResponse);
    } else {
      console.log(
        "Focus Partner - No active session, skipping relevance check.",
        "Session active:",
        result.isSessionActive,
        "Goal present:",
        !!result.userGoal
      );
    }
  } catch (error) {
    console.error("Focus Partner - Error checking page relevance:", error);
  }
}

// Run text extraction immediately when content script loads
extractPageText();

// Check page relevance if session is active (with delay to ensure storage is ready)
setTimeout(() => {
  checkPageRelevanceIfSessionActive();
}, 100);

// Listen for page navigation changes to check relevance on every page load
let lastUrl = window.location.href;
const urlChangeObserver = new MutationObserver(() => {
  const currentUrl = window.location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    console.log("Focus Partner - Page navigation detected, checking relevance");
    // Small delay to ensure page content is loaded
    setTimeout(() => {
      checkPageRelevanceIfSessionActive();
    }, 1000);
  }
});

// Start observing for URL changes
urlChangeObserver.observe(document, { subtree: true, childList: true });

// Also listen for popstate events (back/forward navigation)
window.addEventListener("popstate", () => {
  console.log("Focus Partner - Popstate event detected, checking relevance");
  setTimeout(() => {
    checkPageRelevanceIfSessionActive();
  }, 1000);
});

// Overlay functionality removed - focusing only on AI relevance checking

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Content script received message:", request);

  if (!request || !request.action) return;

  if (request.action === "sessionStarted") {
    console.log("Session started - running relevance check");
    // Re-run relevance check when session is started
    setTimeout(() => {
      checkPageRelevanceIfSessionActive();
    }, 500); // Small delay to ensure storage is updated
    sendResponse({ success: true });
  }

  if (request.action === "sessionStopped") {
    console.log("Session stopped");
    sendResponse({ success: true });
  }

  if (request.action === "activate") {
    console.log("Extension activated - overlay functionality removed");
    sendResponse({ success: true });
  }

  if (request.action === "deactivate") {
    console.log("Extension deactivated");
    sendResponse({ success: true });
  }

  if (request.action === "getState") {
    sendResponse({ isOverlayInjected: false });
  }

  // Handle AI responses from background script
  if (request.action === "relevanceCheckResponse") {
    console.log("Content script received relevance response:", request);

    // Forward the response to ai.js
    window.postMessage(
      {
        source: "focuspartner-content-script",
        action: "relevanceResponse",
        response: request.response,
        requestId: request.requestId,
      },
      "*"
    );

    sendResponse({ success: true });
  }

  if (request.action === "aiResponseResponse") {
    console.log("Content script received AI response:", request);

    // Forward the response to ai.js
    window.postMessage(
      {
        source: "focuspartner-content-script",
        action: "aiResponse",
        response: request.response,
        requestId: request.requestId,
      },
      "*"
    );

    sendResponse({ success: true });
  }
});

// All overlay-related functions removed - focusing only on AI relevance checking

// Check if extension should be active on page load
chrome.storage.local.get(["isActive"], (result) => {
  if (result.isActive) {
    console.log("Extension is active - overlay functionality removed");
  }
});

// All test overlay and global function code removed - focusing only on AI relevance checking

// Handle forwarded requests from ai.js to background script
async function handleForwardToBackground(payload) {
  console.log("Forwarding request to background script:", payload);

  try {
    // Forward the request to the background script
    chrome.runtime.sendMessage(payload, (response) => {
      if (chrome.runtime.lastError) {
        console.error(
          "Error forwarding to background:",
          chrome.runtime.lastError
        );
        return;
      }
      console.log("Background script response:", response);
    });
  } catch (error) {
    console.error("Error forwarding to background:", error);
  }
}

// Handle AI response requests from chatbot
async function handleAIResponseRequest(message) {
  console.log("Handling AI response request:", message);

  try {
    // Send the request to the AI script
    const requestId = `fp-chat-${Date.now()}-${Math.random()}`;

    // Store the resolver for the chatbot response
    pendingAIRequests.set(requestId, {
      resolve: (response) => {
        // Send response back to chatbot
        window.postMessage(
          {
            action: "aiResponse",
            messageId: message.messageId,
            response: response,
          },
          "*"
        );
      },
    });

    // Send request to AI script
    window.postMessage(
      {
        source: "focuspartner-content-script",
        action: "getAIResponse",
        payload: {
          prompt: message.prompt,
          requestId: requestId,
        },
      },
      "*"
    );

    // Add timeout
    setTimeout(() => {
      if (pendingAIRequests.has(requestId)) {
        console.error("AI response request timed out");
        pendingAIRequests.delete(requestId);
        // Send fallback response to chatbot
        window.postMessage(
          {
            action: "aiResponse",
            messageId: message.messageId,
            response: null,
          },
          "*"
        );
      }
    }, 10000);
  } catch (error) {
    console.error("Error handling AI response request:", error);
    // Send error response to chatbot
    window.postMessage(
      {
        action: "aiResponse",
        messageId: message.messageId,
        response: null,
      },
      "*"
    );
  }
}

// Expose checkPageRelevance function globally for testing
window.checkPageRelevance = checkPageRelevance;
