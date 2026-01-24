const BACKEND_URL = 'http://localhost:3000';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'analyzeCurrentPage') {
        handlePageAnalysis(sendResponse);
        return true;
    }
});

async function handlePageAnalysis(sendResponse) {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab) {
            throw new Error('No active tab found');
        }

        const response = await chrome.tabs.sendMessage(tab.id, {
            action: 'extractPageContent'
        });

        if (!response.success) {
            throw new Error(response.error || 'Failed to extract page content');
        }

        const pageData = response.data;

        const explanation = await sendToBackend(pageData);

        sendResponse({
            success: true,
            explanation: explanation,
            metadata: pageData.metadata
        });

    } catch (error) {
        console.error('Error analyzing page:', error);
        sendResponse({
            success: false,
            error: error.message
        });
    }
}

async function sendToBackend(pageData) {
    try {
        const response = await fetch(`${BACKEND_URL}/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                mode: 'text',
                content: pageData.text,
                url: pageData.metadata.url,
                title: pageData.metadata.title
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Backend error: ${response.status}`);
        }

        const data = await response.json();
        return data.explanationText;

    } catch (error) {
        if (error.message.includes('fetch')) {
            throw new Error('Cannot connect to backend. Make sure the server is running on port 3000.');
        }
        throw error;
    }
}
