const BACKEND_URL = 'http://localhost:3000';

let state = {
    currentScreen: 'screen-home',
    isPlaying: false,
    isPaused: false,
    currentUtterance: null,
    currentAudio: null,
    currentText: null,
    settings: {
        voice: 'qwen',
        speed: 1.0
    }
};

document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    setupEventListeners();
    showScreen('screen-home');
});

function loadSettings() {
    const savedVoice = localStorage.getItem('voxel_voice');
    const savedSpeed = localStorage.getItem('voxel_speed');

    if (savedVoice) state.settings.voice = savedVoice;
    if (savedSpeed) state.settings.speed = parseFloat(savedSpeed);

    const voiceSelector = document.getElementById('voiceSelector');
    const speedSlider = document.getElementById('speedSlider');
    const speedValue = document.getElementById('speedValue');

    if (voiceSelector) voiceSelector.value = state.settings.voice;
    if (speedSlider) {
        speedSlider.value = state.settings.speed;
        speedValue.textContent = getSpeedLabel(state.settings.speed);
    }
}

function getSpeedLabel(val) {
    if (val == 0.5) return 'Slow';
    if (val == 2) return 'Fast';
    if (val == 1) return 'Normal';
    return `${val}x`;
}

function setupEventListeners() {
    document.getElementById('headerSettingsBtn').addEventListener('click', () => showScreen('screen-settings'));
    document.getElementById('headerCloseBtn').addEventListener('click', () => window.close());
    document.getElementById('analyzeBtn').addEventListener('click', handleAnalyzeClick);
    document.getElementById('saveSettingsBtn').addEventListener('click', () => {
        const oldVoice = state.settings.voice;
        saveSettings();
        const newVoice = state.settings.voice;

        if (state.currentText) {
            const isRemoteActive = !!state.currentAudio;
            const isLocalActive = !!(state.currentUtterance && window.speechSynthesis.speaking);
            if (oldVoice !== newVoice) {
                playExplanation(state.currentText);
                return;
            }

            if (newVoice === 'qwen' && isRemoteActive) {
                showScreen('screen-audio');
                state.currentAudio.playbackRate = state.settings.speed;
            } else if (newVoice === 'default' && isLocalActive) {
                playExplanation(state.currentText);
            } else {
                showScreen('screen-audio');
            }

        } else {
            showScreen('screen-home');
        }
    });

    document.getElementById('speedSlider').addEventListener('input', (e) => {
        const val = e.target.value;
        document.getElementById('speedValue').textContent = getSpeedLabel(val);
    });

    document.getElementById('audioStopBtn').addEventListener('click', () => {
        stopSpeech();
        showScreen('screen-home');
    });

    document.getElementById('audioPlayPauseBtn').addEventListener('click', handlePlayPauseClick);

    document.getElementById('audioReplayBtn').addEventListener('click', () => {
        document.getElementById('replaySection').style.display = 'none';
        playExplanation(state.currentText);
    });

    document.getElementById('errorHomeBtn').addEventListener('click', () => showScreen('screen-home'));
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(el => el.classList.remove('active-screen'));

    const target = document.getElementById(screenId);
    if (target) {
        target.classList.add('active-screen');
        state.currentScreen = screenId;
    }
}

async function handleAnalyzeClick() {
    try {
        showScreen('screen-loading');
        updateLoadingStatus('Analyzing Page Content...', 'Please wait...');

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) throw new Error("No active tab found");

        const dataUrl = await captureTab();

        if (!dataUrl) throw new Error("Failed to capture snapshot");

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

        if (!data.success || !data.explanationText) {
            throw new Error(data.error || "No explanation received");
        }

        state.currentText = data.explanationText;
        playExplanation(state.currentText);

    } catch (error) {
        showError(error.message);
    }
}

async function captureTab() {
    return new Promise((resolve) => {
        chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 60 }, (dataUrl) => {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError);
                resolve(null);
            } else {
                resolve(dataUrl);
            }
        });
    });
}

function updateLoadingStatus(main, sub) {
    document.getElementById('loadingStatusText').textContent = main;
    document.getElementById('loadingDetailText').textContent = sub;
}

function showError(msg) {
    document.getElementById('errorMsgText').textContent = msg;
    showScreen('screen-error');
}

function saveSettings() {
    const voice = document.getElementById('voiceSelector').value;
    const speed = document.getElementById('speedSlider').value;

    state.settings.voice = voice;
    state.settings.speed = parseFloat(speed);

    localStorage.setItem('voxel_voice', voice);
    localStorage.setItem('voxel_speed', speed);
}

async function playExplanation(text) {
    stopSpeech();
    resetAudioControlsVisibility();

    document.getElementById('audioStatusDisplay').textContent = 'Preparing Audio...';
    document.getElementById('replaySection').style.display = 'none';
    document.getElementById('audioPlayPauseBtn').textContent = '⏸ Pause';
    document.querySelector('.audio-visualizer').style.opacity = '0.5';

    document.querySelector('.audio-visualizer').style.opacity = '0.5';

    if (state.settings.voice === 'qwen') {
        showScreen('screen-loading');
        updateLoadingStatus('Generating Speech...', 'Processing AI Voice...');
        await playRemoteAudio(text);
    } else {
        showScreen('screen-audio');
        playLocalPlayback(text);
    }
}

async function playRemoteAudio(text) {
    try {
        const response = await fetch(`${BACKEND_URL}/tts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: text,
                style: "Speak like a professional news presenter"
            })
        });

        if (!response.ok) throw new Error(`TTS Error: ${response.statusText}`);

        const arrayBuffer = await response.arrayBuffer();
        const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);

        state.currentAudio = new Audio(url);

        showScreen('screen-audio');

        state.currentAudio.playbackRate = state.settings.speed;
        state.currentAudio.preservesPitch = true;

        state.currentAudio.onplay = () => {
            state.isPlaying = true;
            state.isPaused = false;
            updateAudioUI('playing');
        };

        state.currentAudio.onended = () => {
            handlePlaybackEnded();
            URL.revokeObjectURL(url);
        };

        state.currentAudio.onerror = (e) => {
            console.error("Audio Error", e);
            showError("Audio playback failed");
        };

        await state.currentAudio.play();

    } catch (error) {
        showError(error.message);
    }
}

function playLocalPlayback(text) {
    window.speechSynthesis.cancel();
    state.currentUtterance = new SpeechSynthesisUtterance(text);

    state.currentUtterance.rate = state.settings.speed;
    state.currentUtterance.pitch = 1.0;

    state.currentUtterance.onstart = () => {
        state.isPlaying = true;
        state.isPaused = false;
        updateAudioUI('playing');
    };

    state.currentUtterance.onend = () => {
        handlePlaybackEnded();
    };

    state.currentUtterance.onerror = (event) => {
        if (event.error !== 'interrupted' && event.error !== 'canceled') {
            showError(`Speech error: ${event.error}`);
        }
    };

    window.speechSynthesis.speak(state.currentUtterance);
}

function stopSpeech() {
    window.speechSynthesis.cancel();
    if (state.currentAudio) {
        state.currentAudio.pause();
        state.currentAudio = null;
    }
    state.isPlaying = false;
    state.isPaused = false;
}

function handlePlayPauseClick() {
    if (state.isPaused) {
        resumeSpeech();
    } else {
        pauseSpeech();
    }
}

function pauseSpeech() {
    if (state.currentAudio) {
        state.currentAudio.pause();
    } else if (window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
    }
    state.isPaused = true;
    updateAudioUI('paused');
}

function resumeSpeech() {
    if (state.currentAudio) {
        state.currentAudio.play();
    } else if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
    }
    state.isPaused = false;
    updateAudioUI('playing');
}

function handlePlaybackEnded() {
    state.isPlaying = false;
    state.isPaused = false;
    updateAudioUI('ended');
}

function updateAudioUI(status) {
    const playPauseBtn = document.getElementById('audioPlayPauseBtn');
    const statusDisplay = document.getElementById('audioStatusDisplay');
    const visualizer = document.querySelector('.audio-visualizer');
    const replaySection = document.getElementById('replaySection');

    if (status === 'playing') {
        playPauseBtn.textContent = '⏸ Pause';
        statusDisplay.textContent = 'Playing...';
        visualizer.style.opacity = '1';
        document.querySelector('.audio-controls').style.display = 'flex';
        playPauseBtn.style.display = 'block';
        replaySection.style.display = 'none';

    } else if (status === 'paused') {
        playPauseBtn.textContent = '▶ Resume';
        statusDisplay.textContent = 'Paused';
        visualizer.style.opacity = '0.5';

    } else if (status === 'ended') {
        document.querySelector('.audio-controls').style.display = 'none';
        statusDisplay.textContent = 'Finished';
        visualizer.style.opacity = '0.2';
        replaySection.style.display = 'flex';
    }
}


function resetAudioControlsVisibility() {
    document.querySelector('.audio-controls').style.display = 'flex';
    document.getElementById('audioPlayPauseBtn').style.display = 'block';
    document.getElementById('replaySection').style.display = 'none';
}
