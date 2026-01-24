# Web Page Audio Reader

This document describes how to build the **Web Page Audio Reader** system using a Chrome extension and a backend service. It is written to be clear, structured, and friendly for Cursor or any AI-assisted code editor.

---

## 1. System Overview

The goal of this project is to read a web page aloud by:

1. Capturing the current web page (text or screenshot)
2. Sending the content to an LLM for explanation or summarization
3. Converting the generated text into speech
4. Playing the audio inside a browser extension

The system is split into two independent parts:
- Chrome Extension (Frontend)
- Backend API (LLM and optional TTS)

---

## 2. High-Level Architecture

Chrome Extension
→ Backend API
→ LLM (Gemini)
→ (Optional) TTS API
→ Chrome Extension Audio Player

For MVP, browser-native text-to-speech can replace the TTS API.

---

# PART A: CHROME EXTENSION

## 3. Extension Responsibilities

- Capture the current web page
- Send captured content to backend
- Receive processed text or audio
- Play voice output
- Provide simple UI controls

---

## 4. Extension Tech Stack

- Chrome Extension (Manifest V3)
- JavaScript or TypeScript
- HTML and CSS
- Chrome Extension APIs

---

## 5. Extension Folder Structure

```
/extension
 ├── manifest.json
 ├── background.js
 ├── content.js
 ├── popup.html
 ├── popup.js
 ├── ui.css
```

---

## 6. manifest.json

Purpose:
- Declare permissions
- Register background service worker
- Define popup UI

Required permissions:
- activeTab
- scripting
- tabCapture

Key notes for Cursor:
- Use Manifest Version 3
- Background must be a service worker

---

## 7. content.js

Responsibilities:
- Extract page text when using text-based mode
- Provide page metadata (title, URL)

Main tasks:
- Read `document.body.innerText`
- Trim excessive whitespace
- Split very large text into chunks if needed

This file does not call external APIs.

---

## 8. background.js

This is the core logic of the extension.

Responsibilities:
- Capture visible tab screenshot (optional)
- Send content to backend API
- Receive processed response

Key features:
- Use `chrome.tabs.captureVisibleTab` for image capture
- Use `fetch` for backend calls
- Handle API errors gracefully

Modes supported:
- Text mode: sends cleaned page text
- Image mode: sends base64 screenshot

---

## 9. popup.html and popup.js

popup.html:
- Button: "Explain Page"
- Status text (Idle, Loading, Playing)
- Play and Stop controls

popup.js responsibilities:
- Trigger background script actions
- Receive explanation text or audio
- Use `window.speechSynthesis` for MVP

Audio handling:
- Cancel speech before starting new playback
- Allow playback speed control if needed

---

## 10. Extension MVP Flow

1. User clicks "Explain Page"
2. popup.js sends message to background.js
3. background.js captures page data
4. Data is sent to backend
5. Explanation text is returned
6. popup.js plays voice using browser TTS

---

# PART B: BACKEND SERVICE

## 11. Backend Responsibilities

- Secure API keys
- Communicate with LLM
- Shape output for audio playback
- Optionally generate speech audio

---

## 12. Backend Tech Stack

Recommended:
- Node.js
- Express.js
- Fetch or Axios

Alternative:
- Python + FastAPI

---

## 13. Backend Folder Structure

```
/backend
 ├── src
 │   ├── index.js
 │   ├── routes
 │   │   ├── analyze.js
 │   ├── services
 │   │   ├── geminiService.js
 │   │   ├── ttsService.js
 │   ├── utils
 │   │   ├── textCleaner.js
 ├── .env
 ├── package.json
```

---

## 14. Environment Variables

Store secrets in `.env`:

- GEMINI_API_KEY
- TTS_API_KEY (optional)
- PORT

Never expose these to the extension.

---

## 15. API Endpoint: Analyze Page

Endpoint:
- POST /analyze

Request body:
- mode: "text" or "image"
- content: string (text or base64 image)
- url: page URL

Response:
- explanationText: string

This endpoint calls the LLM.

---

## 16. LLM Service (Gemini)

Model:
- gemini-1.5-flash

Responsibilities:
- Accept text or image input
- Generate spoken-friendly explanation

Prompt rules:
- Use short, clear sentences
- Avoid visual phrases
- Explain diagrams step by step
- Summarize long content

---

## 17. Optional TTS Service

If using server-side TTS:

- Google Cloud Text-to-Speech
- ElevenLabs
- OpenAI TTS

Endpoint:
- POST /tts

Input:
- explanation text

Output:
- audio file or audio stream URL

---

## 18. Backend Flow

1. Receive page content from extension
2. Clean and preprocess input
3. Send request to Gemini
4. Receive explanation text
5. Return text or audio to extension

---

## 19. Error Handling

Backend should handle:
- Missing API keys
- Large input size
- LLM timeouts
- Invalid requests

Always return clear error messages.

---

## 20. Cursor Editor Guidelines

Recommended `.cursorrules`:

- Prefer small, readable functions
- Avoid hardcoding secrets
- Log errors clearly
- Keep prompts in dedicated files
- Write comments explaining intent, not syntax

---

## 21. Future Enhancements

- Page language detection
- Voice selection
- Playback speed control
- Caching explanations
- User authentication
- Usage limits

---

## 22. Development Phases

Phase 1:
- Text-only capture
- Gemini explanation
- Browser TTS

Phase 2:
- Screenshot-based analysis
- Backend TTS

Phase 3:
- Monetization
- Analytics
- Cross-browser support

---

End of documentation.

