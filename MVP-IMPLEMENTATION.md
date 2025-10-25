# Focus Partner Chrome Extension - MVP Implementation

## 🎯 Overview

This MVP implements essential page understanding and blocker logic for the Focus Partner Chrome Extension. The system can extract page metadata, classify content relevance using AI, and block distracting sites to help users stay focused on their goals.

## ✨ Key Features Implemented

### 1. **Page Data Extraction**

- Extracts comprehensive page metadata including:
  - Document title
  - Main heading (H1 with fallbacks)
  - Meta description
  - First 500 characters of main content
  - URL and hostname
- Handles dynamic content and SPA navigation
- Caches page data for analysis

### 2. **Hardcoded Heuristic Blocking**

- Blocks known distraction sites instantly:
  - Facebook, Instagram, Twitter, YouTube
  - Netflix, TikTok, Reddit, Discord
  - Twitch, Pinterest
- No AI call needed for obvious distractions
- Configurable blocked sites list

### 3. **AI-Driven Relevance Check**

- Uses GPT-4o-mini (GPT-5 Nano is not available yet) for intelligent classification
- Sends page data + user goal to AI for relevance analysis
- Returns simple YES/NO response for blocking decision
- Fallback to mock responses when API key not configured
- **Note**: GPT-5 Nano doesn't exist yet - GPT-4o-mini is the fastest/cheapest current model

### 4. **Enhanced Blocking Overlay**

- Beautiful, modern full-page overlay
- Shows user's current goal
- Explains why page was blocked
- "Continue Anyway" option for user override
- Prevents scrolling and interactions
- Persists through page refreshes and SPA navigation

### 5. **Session State Persistence**

- Stores session state in Chrome Storage API
- Persists across tabs and browser refreshes
- Maintains user goal and session status
- Automatic state restoration on page load

### 6. **Comprehensive Logging**

- All actions logged with "Focus Partner—" prefix
- Detailed console output for debugging
- Session state changes tracked
- AI analysis results logged

## 🚀 How to Use

### Basic Usage

1. **Start a Session**: Open extension popup → Set goal → Start focus session
2. **Navigate**: Visit different websites
3. **Automatic Analysis**: Extension analyzes each page for relevance
4. **Blocking**: Irrelevant/distracting sites show blocking overlay
5. **Override**: Click "Continue Anyway" if you need access

### Testing

1. Open `test-mvp.html` in your browser
2. Use the test buttons to manually trigger functions
3. Check browser console for detailed logs
4. Test different sites to see blocking behavior

## 🔧 Technical Implementation

### File Structure

```
scripts/
├── pageMonitor.js    # Main MVP logic and page analysis
├── ai.js            # AI integration and relevance checking
└── storage.js       # Chrome Storage API wrapper

content-script.js    # Extension communication and session management
test-mvp.html       # Testing interface
```

### Key Functions

#### Page Data Extraction

```javascript
const pageData = {
  url: window.location.href,
  hostname: window.location.hostname,
  title: document.title || "",
  mainHeading: document.querySelector("h1")?.textContent || "",
  description:
    document.querySelector('meta[name="description"]')?.content || "",
  mainText: extractMainTextSnippet(), // First 500 chars
};
```

#### Heuristic Blocking

```javascript
const BLOCKED_SITES = ["facebook.com", "instagram.com", "netflix.com", ...];
if (BLOCKED_SITES.some(site => hostname.includes(site))) {
  showBlockingOverlay();
  return;
}
```

#### AI Relevance Check

```javascript
const prompt = `Given the user's goal: '${userGoal}'
And page data: {title, mainHeading, description, mainText, url, hostname}
Is this page helpful for achieving the goal? Answer with ONLY 'YES' or 'NO'.`;
```

### Global Testing API

The extension exposes `window.focusPartner` with these functions:

- `showOverlay()` / `hideOverlay()` - Manual overlay control
- `analyzeCurrentPage()` - Force page analysis
- `getSessionState()` - Get current session info
- `setSessionState(active, goal)` - Set session state
- `logState()` - Log current state to console
- `testHeuristicBlocking()` - Test heuristic blocking
- `testAIRelevance()` - Test AI relevance check

## 🎨 UI/UX Features

### Blocking Overlay Design

- **Modern gradient background** with blur effect
- **Clear messaging** explaining why page was blocked
- **User's goal prominently displayed**
- **Smooth animations** and hover effects
- **Accessible design** with proper contrast
- **Mobile-responsive** layout

### Visual Hierarchy

- Large, gradient title: "Stay Focused! 🎯"
- Clear explanation of blocking reason
- Goal display with accent border
- Prominent "Continue Anyway" button
- Consistent with modern design trends

## 🔍 Debugging & Testing

### Console Logging

All actions are logged with the "Focus Partner—" prefix:

```
Focus Partner—Page monitor loaded
Focus Partner—Session started with goal: LEARNING REACT
Focus Partner—Analyzing page relevance
Focus Partner—AI relevance result: false
Focus Partner—Showing overlay (AI determined not relevant)
```

### Test Commands

```javascript
// Check current state
window.focusPartner.logState();

// Get page data
window.focusPartner.getPageData();

// Test blocking logic
window.focusPartner.testHeuristicBlocking();
window.focusPartner.testAIRelevance();

// Manual control
window.focusPartner.showOverlay();
window.focusPartner.hideOverlay();
```

### Test Sites

- **Should Allow**: Stack Overflow, GitHub, MDN, documentation sites
- **Should Block**: Facebook, YouTube, Instagram, Netflix, TikTok

## 🚧 Future Enhancements

### Planned Improvements

1. **GPT-5 Integration** (when available - currently doesn't exist)
2. **Machine Learning Model** for better relevance detection
3. **User Feedback System** to improve AI accuracy
4. **Custom Block Lists** per user
5. **Time-based Blocking** (e.g., block social media during work hours)
6. **Focus Session Analytics** and progress tracking

### Performance Optimizations

1. **Caching** of AI responses for similar pages
2. **Batch Processing** of multiple page analyses
3. **Lazy Loading** of AI script only when needed
4. **Debounced Analysis** for rapid navigation

## 🐛 Known Issues & Limitations

1. **API Key Required**: Real AI functionality requires OpenAI API key
2. **Mock Responses**: Falls back to mock responses without API key
3. **SPA Detection**: May miss some single-page app navigation
4. **Content Extraction**: May not work perfectly on all site layouts
5. **Performance**: AI calls add latency to page loads

## 📝 Configuration

### Environment Variables

Set your OpenAI API key in `scripts/ai.js`:

```javascript
const AI_CONFIG = {
  API_ENDPOINT: "https://api.openai.com/v1/chat/completions",
  API_KEY: "your-openai-api-key-here", // Replace with actual key
  MODEL: "gpt-4o-mini", // GPT-5 Nano doesn't exist yet
  DEBUG: true,
};
```

### Customization

- **Blocked Sites**: Modify `BLOCKED_SITES` array in `pageMonitor.js`
- **Overlay Styling**: Update CSS in `showBlockingOverlay()` function
- **AI Prompts**: Customize prompts in `ai.js` for different behavior
- **Logging**: Adjust log levels and prefixes throughout codebase

## 🎉 Success Metrics

The MVP successfully implements:

- ✅ **Page data extraction** from any website
- ✅ **Heuristic blocking** of known distraction sites
- ✅ **AI-driven relevance** checking with GPT-4o-mini
- ✅ **Persistent session state** across tabs and refreshes
- ✅ **Modern blocking overlay** with user override
- ✅ **Comprehensive logging** for debugging
- ✅ **Manual testing interface** for development
- ✅ **SPA navigation support** with content monitoring

This MVP provides a solid foundation for the full Focus Partner extension and demonstrates all core functionality working together seamlessly.
