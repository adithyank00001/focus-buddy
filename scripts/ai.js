// AI integration script for Focus Partner extension
console.log("Focus Partner AI script loaded into page context.");

// Note: This script no longer contains API configuration or makes direct API calls.
// All AI operations are now handled by the background script for security and consistency.

// *** [NEW] Set up a listener for messages from the content script ***
window.addEventListener(
  "message",
  (event) => {
    // We only accept messages from ourselves, not from any other source.
    if (event.source !== window) {
      return;
    }

    const message = event.data;

    // Check if the message is for our extension and has the correct action
    if (
      message.source === "focuspartner-content-script" &&
      message.action === "checkRelevance"
    ) {
      console.log(
        "AI Script (Page World) received relevance check request:",
        message
      );

      // Asynchronously perform the AI check
      performRelevanceCheck(message.payload);
    }

    // Handle AI response requests from chatbot
    if (
      message.source === "focuspartner-content-script" &&
      message.action === "getAIResponse"
    ) {
      console.log(
        "AI Script (Page World) received AI response request:",
        message
      );

      // Asynchronously perform the AI response
      performAIResponse(message.payload);
    }

    // Handle responses from content script (which came from background script)
    if (
      message.source === "focuspartner-content-script" &&
      (message.action === "relevanceResponse" ||
        message.action === "aiResponse")
    ) {
      console.log(
        "AI Script (Page World) received response from background:",
        message
      );

      // Forward the response back to the content script's pending requests
      window.postMessage(
        {
          source: "focuspartner-ai-script",
          action: message.action,
          response: message.response,
          requestId: message.requestId,
        },
        "*"
      );
    }
  },
  false
);

/**
 * [FIXED] This function now forwards AI requests to the content script, which then forwards to background script.
 * @param {object} payload - The data from the content script.
 */
async function performRelevanceCheck(payload) {
  const { userGoal, pageText, requestId } = payload;

  const systemInstruction = `SYSTEM INSTRUCTION:
The extracted text below represents the main content of the website the user is currently visiting, or URL context if no content is available.
The "user goal" describes what the user wants to focus on or achieve during their session.
If the page content/URL is relevant or helpful for the user's goal, respond ONLY with "YES".
If it is not relevant or helpful, respond ONLY with "NO".
No explanation, just YES or NO.

User Goal: ${userGoal}
Page Content/URL Context:
${pageText}`;

  try {
    // Forward the request to the content script (which will forward to background script)
    window.postMessage(
      {
        source: "focuspartner-ai-script",
        action: "forwardToBackground",
        payload: {
          action: "performRelevanceCheck",
          prompt: systemInstruction,
          requestId: requestId,
        },
      },
      "*"
    );

    // Set up a timeout in case the background script doesn't respond
    setTimeout(() => {
      window.postMessage(
        {
          source: "focuspartner-ai-script",
          action: "relevanceResponse",
          response: "NO", // Default to NO on timeout
          requestId: requestId,
        },
        "*"
      );
    }, 10000);
  } catch (error) {
    console.error(
      "AI Script (Page World) - Error during relevance check:",
      error
    );
    // Send an error response back
    window.postMessage(
      {
        source: "focuspartner-ai-script",
        action: "relevanceResponse",
        response: "NO", // Default to "NO" on error
        requestId: requestId,
      },
      "*"
    );
  }
}

/**
 * [FIXED] This function handles AI response requests from the chatbot.
 * @param {object} payload - The data from the content script.
 */
async function performAIResponse(payload) {
  const { prompt, requestId } = payload;

  try {
    // Forward the request to the content script (which will forward to background script)
    window.postMessage(
      {
        source: "focuspartner-ai-script",
        action: "forwardToBackground",
        payload: {
          action: "performAIResponse",
          prompt: prompt,
          requestId: requestId,
        },
      },
      "*"
    );

    // Set up a timeout in case the background script doesn't respond
    setTimeout(() => {
      window.postMessage(
        {
          source: "focuspartner-ai-script",
          action: "aiResponse",
          response: null,
          requestId: requestId,
        },
        "*"
      );
    }, 10000);
  } catch (error) {
    console.error("AI Script (Page World) - Error during AI response:", error);
    // Send an error response back
    window.postMessage(
      {
        source: "focuspartner-ai-script",
        action: "aiResponse",
        response: null,
        requestId: requestId,
      },
      "*"
    );
  }
}

// Mark as loaded and ready for messaging
window.FP_AI_LOADED = true;
console.log("Focus Partner AI script is now listening for messages.");
