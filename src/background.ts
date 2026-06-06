chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'START_RECORDING') {
    // Open the hidden engine tab
    chrome.tabs.create({
      url: chrome.runtime.getURL("recorder.html"),
      pinned: true,
      active: false
    });
  }
});
