chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractPageContent') {
    try {
      const pageData = extractPageData();
      sendResponse({ success: true, data: pageData });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }
  return true;
});

function extractPageData() {
  const rawText = document.body.innerText;
  const cleanedText = cleanText(rawText);
  const metadata = {
    title: document.title,
    url: window.location.href,
    timestamp: new Date().toISOString()
  };

  return {
    text: cleanedText,
    metadata: metadata,
    wordCount: cleanedText.split(/\s+/).length
  };
}

function cleanText(text) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .substring(0, 10000);
}
