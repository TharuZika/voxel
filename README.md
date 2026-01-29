# Vision AI - Web Page Audio Reader

A Chrome extension that reads and explains web pages aloud using AI-powered summarization with Google Gemini.

## ✨ Features

- 🎙️ **AI-Powered Explanations** - Uses Google Gemini to create spoken-friendly summaries
- 🔊 **Browser Text-to-Speech** - Plays audio directly in your browser
- 🎨 **Modern UI** - Clean, beautiful interface with status indicators
- ⚡ **Fast & Simple** - One-click operation

## 🚀 Installation

### 1. Install the Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right corner)
3. Click "Load unpacked"
4. Select the `voxel` folder

The Nova AI icon should now appear in your Chrome toolbar!

### 2. Set Up the Backend

The extension requires a local backend server to communicate with Gemini AI.

Navigate to the backend directory and follow the setup:

```bash
cd voxel-backend
npm install
```

Create a `.env` file:
```bash
cp .env.example .env
```

Add your Gemini API key to `.env`:
```
GEMINI_API_KEY=your_api_key_here
```

Start the server:
```bash
npm run dev
```

The server should run on `http://localhost:3000`

## 📖 Usage

1. **Start the backend server** (must be running!)
   ```bash
   cd voxel-backend
   npm run dev
   ```

2. **Navigate to any web page** you want explained

3. **Click the Nova AI extension icon** in your toolbar

4. **Click "Explain Page"** button

5. **Listen!** The AI will analyze the page and read the explanation aloud

6. **Click "Stop"** to interrupt playback anytime

## 🎯 How It Works

```
Web Page → Extension → Backend API → Gemini AI → Explanation → Browser TTS → Audio
```

1. Extension captures page text
2. Sends to backend API
3. Gemini AI generates spoken-friendly explanation
4. Extension receives text
5. Browser text-to-speech plays audio

## 🛠️ Development

### Extension Structure
```
voxel/
├── manifest.json       # Extension configuration
├── content.js          # Page text extraction
├── background.js       # Service worker
├── popup.html          # Extension UI
├── popup.js            # UI logic & TTS
└── ui.css              # Styling
```

### Key Files
- **manifest.json** - Extension metadata and permissions
- **content.js** - Extracts and cleans page text
- **background.js** - Communicates with backend API
- **popup.js** - Manages UI state and text-to-speech

## 📝 Requirements

- Chrome Browser (Manifest V3 compatible)
- Node.js 18 or higher
- Gemini API key ([Get one free](https://aistudio.google.com/app/apikey))

## 🔧 Configuration

### Backend URL
The extension expects the backend at `http://localhost:3000`. To change this, edit `background.js`:

```javascript
const BACKEND_URL = 'http://localhost:3000'; // Change this
```

### Text Limit
Content is limited to 10,000 characters. Adjust in `content.js`:

```javascript
.substring(0, 10000); // Change this
```

## 🐛 Troubleshooting

### "Cannot connect to backend"
- Ensure backend server is running (`npm run dev`)
- Check that it's on port 3000
- Look for errors in backend console

### "No audio playing"
- Check browser audio settings
- Try refreshing the extension
- Check browser console for errors

### "API key error"
- Verify your `.env` file has the correct key
- Restart the backend server after changing `.env`

## 🚀 Future Enhancements

- 📸 Screenshot-based analysis
- 🎤 Multiple voice options
- ⚡ Playback speed control
- 💾 Explanation caching
- 🌍 Multi-language support

## 📄 License

MIT

---

Built with ❤️ using Google Gemini AI
