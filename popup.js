const explainBtn = document.getElementById('explainBtn');
const stopBtn = document.getElementById('stopBtn');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const playbackControls = document.getElementById('playbackControls');
const infoSection = document.getElementById('infoSection');
const infoText = document.getElementById('infoText');

let isPlaying = false;
let currentUtterance = null;

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

function playExplanation(text) {
    if (!text) {
        handleError(new Error('No explanation text received'));
        return;
    }

    window.speechSynthesis.cancel();
    currentUtterance = new SpeechSynthesisUtterance(text);
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
        handleError(new Error(`Speech error: ${event.error}`));
    };

    window.speechSynthesis.speak(currentUtterance);
}

function handleStopClick() {
    stopSpeech();
    setStatus('idle', 'Ready');
    hidePlaybackControls();
}

function stopSpeech() {
    window.speechSynthesis.cancel();
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
