## Project Overview

**Focus Partner** is a Chrome extension that uses a chatbot and real-time AI page analysis (driven by GPT-5 Nano) to keep users focused. It combines conversational intent onboarding, persistent goals, smart distraction-blocking on goal-related websites, and full blocking with gentle reminders when the user goes off-path.

---

## MVP: Phase-By-Phase Build (Technical)

---

### Phase 0. **Project Setup \& Manifest**

**Objectives:**

- Create the following folder/file structure:

```
focus-partner-extension/
  |-- manifest.json
  |-- background.js
  |-- content-script.js
  |-- popup/
      |-- popup.html
      |-- popup.js
      |-- popup.css
  |-- chatbot/
      |-- chatbot.html
      |-- chatbot.js
      |-- chatbot.css
  |-- scripts/
      |-- ai.js         // GPT-5 Nano API logic
      |-- pageMonitor.js
      |-- storage.js    // Chrome storage wrapper
  |-- styles/
      |-- overlay.css   // For full-page blocks
  |-- icons/
      |-- icon16.png
      |-- icon48.png
      |-- icon128.png
```

- Write `manifest.json` (V3):
  - Permissions: `"storage"`, `"activeTab"`, `"scripting"`
  - Content scripts run on `<all_urls>`
  - Background: `"service_worker": "background.js"`
  - `web_accessible_resources`: Expose injected chatbot assets
- Load as “unpacked extension” in Chrome for dev.

---

### Phase 1. **Activation \& Overlay UI**

**Objectives:**

- Add extension popup with ON/OFF toggle.
- When ON, inject `chatbot.html` overlay into the current tab (from `content-script.js`).
  - Position: bottom-right, z-index >10000, minimalist styling (`chatbot.css`).
- Overlay can be minimized, moved, or closed.

**Tech:**

- Popup triggers: `chrome.runtime.sendMessage({action: 'activate'})`
- Content script listens for state and injects overlay.
- ON/OFF state stored in Chrome Storage for session-wide persistence.

---

### Phase 2. **Chatbot Intent Capture \& Session Storage**

**Objectives:**

- On activation, show chatbot: “What are you planning to do?”
- User types goal; bot confirms and minimizes.
- Store:
  - User’s input goal
  - Placeholder for GPT-5 Nano response
  - Session start time

**Tech:**

- Input: HTML `<input>` and submit
- Session stored in Chrome storage (`storage.js`)
- All tabs react to session state

---

### Phase 3. **AI Integration with GPT-5 Nano**

**Objectives:**

- On goal input, call GPT-5 Nano API (or mock if not configured)
- API prompt:

```text
Given the user’s stated goal: “____”, return JSON: { summary, activity_type, focus_elements, distraction_patterns }
```

- Store and use response for blocking logic.

**Tech:**

- API endpoint (replace with your actual endpoint/key):

```
POST https://api.openai.com/v1/gpt-5-nano
```

    - Include `Authorization: Bearer <KEY>`
    - Use `fetch` in JS to call API

- Parse Structured JSON from API response
- Handle API failures gracefully with a fallback

---

### Phase 4. **Behavior Monitoring (On-Goal vs Off-Goal Pages)**

**Objectives:**

- In all tabs, monitor for navigation/load events.
- For each page:

1. Extract: URL, title, meta description, visible h1, and main text
2. Call GPT-5 Nano with:

```text
User goal: “...”, Page title: “...”, Description: “...”. Is this page on-topic? ONLY ‘YES’ or ‘NO’ as JSON.
```

3. If NO: Show full-screen overlay (`overlay.css`) with chatbot message/reminder and block interaction.

**Tech:**

- Use MutationObserver for dynamic sites (YouTube, Reddit, etc.)
- Overlay covers 100% viewport, disables scroll/click events on underlying page

---

### Phase 5. **DOM Distraction Blocking (On-Goal Pages Only)**

**Objectives:**

- If page is on-goal, scan for/hide distractions:
  - YouTube: `#comments`, `#secondary`, `.ytd-watch-next-secondary-results-renderer`, `.ytd-compact-video-renderer`, `.ad-container`
  - Reddit: `#comments`, `.promotedlink`, `.adsense`
  - News: selectors like `[id*="ad"]`, `[class*="popup"]`
- Use hardcoded selectors for MVP.
- Rerun on DOM changes/infinite scroll.

**Tech:**

- Use querySelectorAll and set `element.style.display = "none"`
- List for all sites can be expanded later

---

### Phase 6. **Session Persistence**

**Objectives:**

- Session state (goal, AI analysis) persists across all tabs, after refresh, and browser restarts.
- Only turns off/updates when user deactivates or updates goal.

**Tech:**

- Chrome Storage API (`chrome.storage.local` or `sync`)
- Message passing for multi-tab updates

---

### Phase 7. **Testing, Debugging, and Polish**

**Objectives:**

- Manual tests: YouTube, Wikipedia, Reddit, news, etc
- Test full ON/OFF flow and overlay function
- Log all AI requests/responses (with a `DEBUG` flag)
- Prepare for Web Store submission (fill out privacy, icons, docs)

**Tech:**

- Add debug console logging for all main actions
- Write easy-to-toggle debug boilerplate

---

## Non-MVP (Planned for Later)

- AI-powered YouTube recommendations curation (GPT-5 batching)
- Custom block/allow lists
- Analytics UI
- Multi-goal or team features

---

## Integration Examples and Prompts

**Intent Analysis (Goal input to GPT-5 Nano):**

```json
{
  "prompt": "Given the user's stated goal: 'studying React tutorials', respond in JSON as {summary, activity_type, focus_elements, distraction_patterns}."
}
```

**On/Page-Match Check (GPT-5 Nano):**

```json
{
  "prompt": "User goal: 'studying React'. Page: 'YouTube - Fortnite Best Kills'. Is this page on topic for the given goal? Only 'YES' or 'NO' as valid JSON."
}
```

**Selectors for MVP (add more as needed):**

- YouTube: `#comments`, `#related`, `.ad-container`, `.ytd-watch-next-secondary-results-renderer`
- Reddit: `.comments`, `.promotedlink`
- News: `[id*='ad']`, `[class*='popup']`

---

## Testing Checklist

- [ ] UI toggles/work on all tested sites
- [ ] Chatbot goal flow works, session persists across tabs/reloads
- [ ] AI calls to GPT-5 Nano for intent and page-matching
- [ ] Overlay blocks off-goal pages reliably
- [ ] Distraction selectors hide intended elements
- [ ] All code debuggable, no exposed API keys
- [ ] Files ready for Chrome Web Store package

---

## MVP Philosophy

- Each phase independently testable
- Start vanilla HTML/CSS/JS for best stability and smallest size
- Upgrade to React or complex UI only if needed post-MVP
- AI only for high-leverage intent/matching—not for every DOM operation

**End of file**
