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
  console.log('💾 Saving profile for:', profile.domain + profile.path);

  const { formProfiles = [] } = await chrome.storage.local.get(['formProfiles']);
  console.log('📋 Current profiles count:', formProfiles.length);

  const existingIndex = formProfiles.findIndex(p =>
    p.domain === profile.domain && p.path === profile.path
  );

  if (existingIndex >= 0) {
    console.log(`🔄 Updating existing profile at index ${existingIndex}`);
    console.log('📝 Old values count:', formProfiles[existingIndex].values?.length || 0);
    console.log('📝 New values count:', profile.values?.length || 0);

    formProfiles[existingIndex] = {
      ...formProfiles[existingIndex],
      ...profile,
      updatedAt: new Date().toISOString()
    };

    console.log('✅ Profile updated successfully');
  } else {
    console.log('✨ Creating new profile');
    profile.id = Date.now().toString();
    profile.createdAt = new Date().toISOString();
    profile.updatedAt = new Date().toISOString();
    formProfiles.push(profile);

    console.log('✅ New profile created with ID:', profile.id);
  }

  const { settings } = await chrome.storage.local.get(['settings']);
  const maxProfiles = settings?.maxProfiles || 100;

  if (formProfiles.length > maxProfiles) {
    console.log(`⚠️ Profile limit exceeded (${formProfiles.length}/${maxProfiles}), cleaning up...`);
    formProfiles.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    formProfiles.splice(maxProfiles);
  }

  await chrome.storage.local.set({ formProfiles });
  console.log('💾 Profile storage completed');
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

    // Omit iconUrl if icon doesn't exist
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

// Don't use chrome.commands API if commands are not defined in manifest
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