chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('SmartForm extension installed');

    chrome.storage.local.set({
      formProfiles: [],
      settings: {
        autoSave: false,
        autoFill: false,
        showNotifications: true,
        excludeDomains: ['example.com'],
        maxProfiles: 100
      }
    });

    chrome.tabs.create({
      url: chrome.runtime.getURL('options.html')
    });
  }
});

chrome.action.onClicked.addListener((tab) => {
  if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
    return;
  }

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content.js']
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSettings') {
    chrome.storage.local.get(['settings'], (result) => {
      sendResponse(result.settings || {});
    });
    return true;
  }

  if (request.action === 'saveProfile') {
    saveFormProfile(request.profile).then(() => {
      sendResponse({ success: true });
    }).catch((error) => {
      console.error('Error saving profile:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }

  if (request.action === 'getProfiles') {
    getFormProfiles(request.domain, request.path).then((profiles) => {
      sendResponse({ success: true, profiles });
    }).catch((error) => {
      console.error('Error getting profiles:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }

  if (request.action === 'showNotification') {
    if (request.type && request.message) {
      showNotification(request.type, request.message);
    }
  }
});

async function saveFormProfile(profile) {
  const { formProfiles = [] } = await chrome.storage.local.get(['formProfiles']);

  const existingIndex = formProfiles.findIndex(p =>
    p.domain === profile.domain && p.path === profile.path
  );

  if (existingIndex >= 0) {
    formProfiles[existingIndex] = {
      ...formProfiles[existingIndex],
      ...profile,
      updatedAt: new Date().toISOString()
    };
  } else {
    profile.id = Date.now().toString();
    profile.createdAt = new Date().toISOString();
    profile.updatedAt = new Date().toISOString();
    formProfiles.push(profile);
  }

  const { settings } = await chrome.storage.local.get(['settings']);
  const maxProfiles = settings?.maxProfiles || 100;

  if (formProfiles.length > maxProfiles) {
    formProfiles.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    formProfiles.splice(maxProfiles);
  }

  await chrome.storage.local.set({ formProfiles });
}

async function getFormProfiles(domain, path) {
  const { formProfiles = [] } = await chrome.storage.local.get(['formProfiles']);

  return formProfiles.filter(profile => {
    if (domain && profile.domain !== domain) return false;
    if (path && profile.path !== path) return false;
    return true;
  }).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

function showNotification(type, message) {
  chrome.storage.local.get(['settings'], (result) => {
    if (!result.settings?.showNotifications) return;

    // アイコンが存在しない場合はiconUrlを省略
    const notificationOptions = {
      type: 'basic',
      title: 'SmartForm',
      message: message
    };

    chrome.notifications.create(notificationOptions);
  });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome')) {
    chrome.storage.local.get(['settings'], (result) => {
      if (result.settings?.autoFill) {
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['content.js']
        });
      }
    });
  }
});

// chrome.commands API は manifest で commands を定義していない場合は使用しない
try {
  if (chrome.commands && typeof chrome.commands.onCommand !== 'undefined') {
    chrome.commands.onCommand.addListener((command) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && !tabs[0].url.startsWith('chrome')) {
          chrome.tabs.sendMessage(tabs[0].id, { action: command });
        }
      });
    });
  }
} catch (error) {
  console.log('chrome.commands API not available:', error.message);
}