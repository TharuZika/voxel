const explainBtn = document.getElementById('explainBtn');
const stopBtn = document.getElementById('stopBtn');
const pauseBtn = document.getElementById('pauseBtn');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const statusDetail = document.getElementById('statusDetail');
const playbackControls = document.getElementById('playbackControls');
const initialControls = document.getElementById('initialControls');
const infoSection = document.getElementById('infoSection');
const infoText = document.getElementById('infoText');

let isPlaying = false;
let isPaused = false;
let currentUtterance = null;
let currentAudio = null;
let statusInterval = null;

const LOADING_MESSAGES = [
    "Steeping the data for maximum flavor...",
    "Whisking the paragraphs into a light foam...",
    "Thinking... thinking... still thinking...",
    "Consulting the digital oracles...",
    "Translating internet to human...",
    "Parsing the matrix...",
    "Fetching fresh words from the cloud...",
    "Asking Gemini nicely...",
    "Trying to remember where I put the summary...",
    "Asking the AI to use its 'inside voice'...",
    "Warming up vocal cords...",
    "Adding a pinch of logic...",
    "Sifting through the fluff...",
    "Teaching the robot how to pronounce 'supercalifragilistic'...",
    "Waiting for the kettle to whistle...",
    "Plating the insights..."
];

explainBtn.addEventListener('click', handleExplainClick);
stopBtn.addEventListener('click', handleStopClick);
pauseBtn.addEventListener('click', handlePauseClick);

async function handleExplainClick() {
    try {
        stopSpeech();
        startStatusCycling();
        initialControls.style.display = 'none';
        hideInfo();

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) throw new Error("No active tab found");

        chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 60 }, async (dataUrl) => {
            if (chrome.runtime.lastError) {
                handleError(new Error(chrome.runtime.lastError.message));
                return;
            }

            if (!dataUrl) {
                handleError(new Error("Failed to capture snapshot"));
                return;
            }

            try {
                const response = await fetch(`${BACKEND_URL}/analyze`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        mode: 'image',
                        image: dataUrl,
                        url: tab.url,
                        title: tab.title
                    })
                });

                if (!response.ok) {
                    const errParams = await response.json().catch(() => ({}));
                    throw new Error(errParams.error || `Server error: ${response.statusText}`);
                }

                const data = await response.json();
                handleAnalysisResponse({ success: true, explanation: data.explanationText });

            } catch (netError) {
                handleError(netError);
            }
        });

    } catch (error) {
        handleError(error);
    }
}

function startStatusCycling() {
    let index = 0;
    setStatus('loading', 'Analyzing...');
    statusDetail.textContent = LOADING_MESSAGES[0];

    statusInterval = setInterval(() => {
        index = (index + 1) % LOADING_MESSAGES.length;
        statusDetail.textContent = LOADING_MESSAGES[index];
    }, 4000);
}

function stopStatusCycling() {
    if (statusInterval) {
        clearInterval(statusInterval);
        statusInterval = null;
    }
    statusDetail.textContent = '';
}

function handleAnalysisResponse(response) {
    if (!response) {
        handleError(new Error('No response from background script'));
        return;
    }

    if (!response.success) {
        handleError(new Error(response.error || 'Unknown error'));
        return;
    }

    playExplanation(response.explanation);
}

const BACKEND_URL = 'http://localhost:3000';

async function playExplanation(text) {
    if (!text) {
        handleError(new Error('No explanation text received'));
        return;
    }

    const voiceSelector = document.getElementById('voiceSelector');
    const selectedVoice = voiceSelector ? voiceSelector.value : 'default';

    if (selectedVoice === 'qwen') {
        await playRemoteAudio(text);
    } else {
        playLocalPlayback(text);
    }
}

async function playRemoteAudio(text) {
    try {
        const response = await fetch(`${BACKEND_URL}/tts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                style: "Speak like a professional news presenter"
            })
        });

        if (!response.ok) {
            throw new Error(`TTS Error: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);

        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
        }

        currentAudio = new Audio(url);

        currentAudio.onplay = () => {
            stopStatusCycling();
            isPlaying = true;
            isPaused = false;
            setStatus('playing', 'Playing (Presenter)...');
            showPlaybackControls();
        };

        currentAudio.onended = () => {
            handleStopClick();
            URL.revokeObjectURL(url);
        };

        currentAudio.onerror = (e) => {
            console.error("Audio playback error", e);
            handleError(new Error("Audio playback failed"));
        };

        await currentAudio.play();

    } catch (error) {
        handleError(error);
    }
}

function playLocalPlayback(text) {
    stopStatusCycling();

    window.speechSynthesis.cancel();
    currentUtterance = new SpeechSynthesisUtterance(text);
    currentUtterance.rate = 1.0;
    currentUtterance.pitch = 1.0;
    currentUtterance.volume = 1.0;

    currentUtterance.onstart = () => {
        isPlaying = true;
        isPaused = false;
        setStatus('playing', 'Playing...');
        showPlaybackControls();
    };

    currentUtterance.onend = () => {
        handleStopClick();
    };

    currentUtterance.onerror = (event) => {
        if (event.error === 'interrupted' || event.error === 'canceled') {
        } else {
            handleError(new Error(`Speech error: ${event.error}`));
        }
    };

    window.speechSynthesis.speak(currentUtterance);
}

function handlePauseClick() {
    if (isPaused) {
        resumeSpeech();
    } else {
        pauseSpeech();
    }
}

function pauseSpeech() {
    if (currentAudio) {
        currentAudio.pause();
    } else if (window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
    }
    isPaused = true;
    pauseBtn.textContent = '▶ Resume';
    setStatus('playing', 'Paused');
}

function resumeSpeech() {
    if (currentAudio) {
        currentAudio.play();
    } else if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
    }
    isPaused = false;
    pauseBtn.textContent = '⏸ Pause';
    setStatus('playing', 'Playing...');
}

function handleStopClick() {
    stopSpeech();
    setStatus('idle', 'Ready');
    hidePlaybackControls();
}

function stopSpeech() {
    stopStatusCycling();
    window.speechSynthesis.cancel();
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }
    isPlaying = false;
    isPaused = false;
    currentUtterance = null;

    if (pauseBtn) pauseBtn.textContent = '⏸ Pause';
}

function setStatus(state, text) {
    statusText.textContent = text;
    statusDot.className = 'status-dot';

    if (state === 'idle') {
        statusDot.classList.add('status-idle');
    } else if (state === 'loading') {
        statusDot.classList.add('status-loading');
    } else if (state === 'playing') {
        statusDot.classList.add('status-playing');
    } else if (state === 'error') {
        statusDot.classList.add('status-error');
    }
}

function showPlaybackControls() {
    playbackControls.style.display = 'flex';
    initialControls.style.display = 'none';
}

function hidePlaybackControls() {
    playbackControls.style.display = 'none';
    initialControls.style.display = 'flex';
}

function showInfo(message) {
    infoText.textContent = message;
    infoSection.style.display = 'block';
}

function hideInfo() {
    infoSection.style.display = 'none';
}

function handleError(error) {
    console.error('Voxel error:', error);
    stopStatusCycling();
    setStatus('error', 'Error');
    showInfo(error.message);
    stopSpeech();
    hidePlaybackControls();
    initialControls.style.display = 'flex';
    explainBtn.disabled = false;
}

document.addEventListener('DOMContentLoaded', () => {
    setStatus('idle', 'Ready');
});
