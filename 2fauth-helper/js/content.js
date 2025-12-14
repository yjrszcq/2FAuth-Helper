// Content script for 2FAuth Browser Extension
// This script is injected into web pages to enable screen QR code scanning

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPageInfo') {
    sendResponse({
      url: window.location.href,
      title: document.title,
    });
  }
  return true;
});
