# Focus Partner Chrome Extension

A Chrome extension that uses AI-powered page analysis to help you stay focused on your goals by blocking distractions and providing gentle reminders when you go off-track.

## Features

- **Goal Setting**: Set your focus goal through a friendly chatbot interface
- **AI-Powered Analysis**: Uses GPT-3.5-turbo to analyze your goals and page relevance
- **Smart Blocking**: Blocks distractions on goal-relevant pages (YouTube comments, Reddit ads, etc.)
- **Off-Goal Protection**: Shows full-screen overlay when you visit off-topic pages
- **Session Persistence**: Maintains your focus session across tabs and browser restarts

## Installation (Development)

1. **Download/Clone** this repository to your local machine

2. **Open Chrome** and navigate to `chrome://extensions/`

3. **Enable Developer Mode** by toggling the switch in the top-right corner

4. **Click "Load unpacked"** and select the `focus-partner-extension` folder

5. **Pin the extension** to your toolbar for easy access

## Usage

1. **Click the Focus Partner icon** in your Chrome toolbar
2. **Toggle "Activate Focus Partner"** to turn on the extension
3. **Set your goal** when prompted by the chatbot overlay
4. **Browse normally** - the extension will:
   - Block distractions on goal-relevant pages
   - Show reminders when you visit off-topic pages
   - Help you stay focused on your objectives

## Configuration

### AI API Setup (Optional)

To enable AI-powered analysis, edit `scripts/ai.js` and replace the placeholder API key:

```javascript
const AI_CONFIG = {
  API_ENDPOINT: "https://api.openai.com/v1/chat/completions",
  API_KEY: "your-actual-api-key-here", // Replace this
  MODEL: "gpt-3.5-turbo",
  DEBUG: true,
};
```

**Note**: The extension works without an API key using mock responses for testing.

## File Structure

```
focus-partner-extension/
├── manifest.json              # Extension configuration
├── background.js              # Service worker
├── content-script.js          # Main content script
├── popup/                     # Extension popup
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── chatbot/                   # Chatbot overlay
│   ├── chatbot.html
│   ├── chatbot.js
│   └── chatbot.css
├── scripts/                   # Core functionality
│   ├── ai.js                  # AI integration
│   ├── pageMonitor.js         # Page analysis
│   └── storage.js             # Chrome storage wrapper
├── styles/                    # Styling
│   └── overlay.css            # Overlay styles
└── icons/                     # Extension icons
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Development

### Testing Checklist

- [ ] Extension loads without errors in Chrome
- [ ] Popup opens and toggle works
- [ ] Chatbot overlay appears when activated
- [ ] Goal setting and storage works
- [ ] Page monitoring functions correctly
- [ ] Distraction blocking works on test sites
- [ ] Off-goal overlay appears on unrelated pages

### Debug Mode

Enable debug logging by setting `DEBUG: true` in `scripts/ai.js`. This will log all AI requests and responses to the console.

### Supported Sites

The extension includes built-in distraction blocking for:

- YouTube (comments, related videos, ads)
- Reddit (promoted posts, ads)
- General sites (ad containers, popups)

## Privacy

- All data is stored locally in Chrome storage
- No data is sent to external servers (except optional AI API calls)
- AI analysis is optional and can be disabled

## Troubleshooting

**Extension won't load:**

- Check that all files are present
- Verify manifest.json syntax
- Check Chrome's extension error console

**Chatbot doesn't appear:**

- Ensure extension is activated in popup
- Check browser console for errors
- Verify content script permissions

**AI features not working:**

- Check API key configuration
- Verify network connectivity
- Check console for API errors

## License

This project is for educational and development purposes.

## Contributing

This is Phase 0 of the MVP. Future phases will include:

- Enhanced AI integration
- More sophisticated distraction blocking
- Analytics and insights
- Custom block/allow lists
