// Minimal service worker for testing
console.log('Minimal service worker loaded');

// Simple message handler
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('Minimal service worker received message:', message.type);
  
  if (message.type === 'PING') {
    console.log('PING received - responding');
    sendResponse({ success: true, status: 'ready', timestamp: Date.now() });
    return false;
  }
  
  if (message.type === 'GET_USER_PROFILE') {
    console.log('GET_USER_PROFILE received - responding with empty profile');
    sendResponse({ success: true, data: null });
    return false;
  }
  
  console.log('Unknown message type:', message.type);
  sendResponse({ success: false, error: 'Unknown message type' });
  return false;
});

console.log('Minimal service worker setup complete');