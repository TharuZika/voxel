const explainBtn = document.getElementById('explainBtn');
const stopBtn = document.getElementById('stopBtn');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const playbackControls = document.getElementById('playbackControls');
const infoSection = document.getElementById('infoSection');
const infoText = document.getElementById('infoText');

let isPlaying = false;
let currentUtterance = null;
let currentAudio = null;

explainBtn.addEventListener('click', handleExplainClick);
stopBtn.addEventListener('click', handleStopClick);

async function handleExplainClick() {
    try {
        stopSpeech();

        setStatus('loading', 'Analyzing page...');
        explainBtn.disabled = true;
        hideInfo();

        chrome.runtime.sendMessage(
            { action: 'analyzeCurrentPage' },
            handleAnalysisResponse
        );

    } catch (error) {
        handleError(error);
    }
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

    // Play the explanation
    playExplanation(response.explanation);
}



const BACKEND_URL = 'http://localhost:3000'; // Define backend URL here as well or import

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
        setStatus('loading', 'Generating Audio...');
        explainBtn.disabled = true;
        showPlaybackControls(); // Show controls so stop works

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
            isPlaying = true;
            setStatus('playing', 'Playing (Qwen)...');
            explainBtn.disabled = false;
        };

        currentAudio.onended = () => {
            isPlaying = false;
            setStatus('idle', 'Ready');
            hidePlaybackControls();
            URL.revokeObjectURL(url);
            currentAudio = null;
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

// Rename existing logic to playLocalPlayback and adjust
function playLocalPlayback(text) {
    window.speechSynthesis.cancel();
    currentUtterance = new SpeechSynthesisUtterance(text);
    // ... existing configuration ...
    currentUtterance.rate = 1.0;
    currentUtterance.pitch = 1.0;
    currentUtterance.volume = 1.0;

    currentUtterance.onstart = () => {
        isPlaying = true;
        setStatus('playing', 'Playing...');
        showPlaybackControls();
        explainBtn.disabled = false;
    };

    currentUtterance.onend = () => {
        isPlaying = false;
        setStatus('idle', 'Ready');
        hidePlaybackControls();
    };

    currentUtterance.onerror = (event) => {
        if (currentUtterance !== event.target) {
            return;
        }
        if (event.error === 'interrupted' || event.error === 'canceled') {
            setStatus('idle', 'Stopped');
            hidePlaybackControls();
            isPlaying = false;
            currentUtterance = null;
        } else {
            handleError(new Error(`Speech error: ${event.error}`));
        }
    };

    window.speechSynthesis.speak(currentUtterance);
}

function handleStopClick() {
    stopSpeech();
    setStatus('idle', 'Stopped');
    hidePlaybackControls();
}

function stopSpeech() {
    window.speechSynthesis.cancel();
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }
    isPlaying = false;
    currentUtterance = null;
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
}


function hidePlaybackControls() {
    playbackControls.style.display = 'none';
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

    setStatus('error', 'Error');
    showInfo(error.message);

    explainBtn.disabled = false;
    hidePlaybackControls();
    stopSpeech();
}

document.addEventListener('DOMContentLoaded', () => {
    setStatus('idle', 'Ready');
});
