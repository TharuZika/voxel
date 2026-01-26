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
  const tables = extractTables();
  const charts = extractCharts();
  let content = rawText;

  if (tables.length > 0 || charts.length > 0) {
    content += "\n\n--- DETECTED DATA ELEMENTS ---\n";

    if (tables.length > 0) {
      content += "\n[TABLES]\n" + tables.join("\n\n") + "\n";
    }

    if (charts.length > 0) {
      content += "\n[CHARTS/VISUALIZATIONS]\n" + charts.join("\n\n") + "\n";
    }
  }

  const cleanedText = cleanText(content);

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

function extractTables() {
  const tables = Array.from(document.querySelectorAll('table'));
  return tables.map((table, index) => {
    let tableStr = `Table ${index + 1}:\n`;

    const headers = Array.from(table.querySelectorAll('th')).map(th => th.innerText.trim());
    if (headers.length > 0) {
      tableStr += "| " + headers.join(" | ") + " |\n";
      tableStr += "| " + headers.map(() => "---").join(" | ") + " |\n";
    }

    const rows = Array.from(table.querySelectorAll('tr'));
    const dataRows = rows.filter(row => row.querySelector('td'));
    const previewRows = dataRows.slice(0, 10);
    previewRows.forEach(row => {
      const cells = Array.from(row.querySelectorAll('td')).map(td => td.innerText.trim().replace(/\n/g, ' '));
      if (cells.length > 0) {
        tableStr += "| " + cells.join(" | ") + " |\n";
      }
    });

    if (dataRows.length > 10) {
      tableStr += `... (and ${dataRows.length - 10} more rows)`;
    }

    return tableStr;
  });
}

function extractCharts() {
  const selectors = [
    'svg',
    'canvas',
    '[role="img"]',
    '[role="graphics-document"]',
    '[role="graphics-symbol"]',
    '.chart',
    '.graph',
    '.highcharts-container'
  ];

  const elements = Array.from(document.querySelectorAll(selectors.join(',')));
  const uniqueCharts = new Set();
  const chartDescriptions = [];

  elements.forEach((el, index) => {
    if (el.getBoundingClientRect().width < 10 && el.getBoundingClientRect().height < 10) return;
    let description = [];
    const ariaLabel = el.getAttribute('aria-label');
    const ariaDesc = el.getAttribute('aria-description');
    const title = el.getAttribute('title') || el.querySelector('title')?.innerText;
    const desc = el.querySelector('desc')?.innerText;
    const alt = el.getAttribute('alt');
    if (ariaLabel) description.push(`Label: ${ariaLabel}`);
    if (ariaDesc) description.push(`Description: ${ariaDesc}`);
    if (title) description.push(`Title: ${title}`);
    if (desc) description.push(`Details: ${desc}`);
    if (alt) description.push(`Alt Text: ${alt}`);
    if (description.length > 0) {
      const descStr = description.join("; ");
      if (!uniqueCharts.has(descStr)) {
        uniqueCharts.add(descStr);
        chartDescriptions.push(`Chart/Image ${chartDescriptions.length + 1}: ${descStr}`);
      }
    }
  });

  return chartDescriptions;
}

function cleanText(text) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .substring(0, 20000);
}
