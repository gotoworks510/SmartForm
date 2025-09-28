class SmartFormPopup {
  constructor() {
    this.currentTab = null;
    this.formsData = null;
    this.initializePopup();
  }

  async initializePopup() {
    await this.getCurrentTab();
    this.bindEvents();

    // Prompt for manual scan instead of auto-scan
    this.updateStatus('Click "Scan Forms" to begin', 'default');
  }

  async getCurrentTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    this.currentTab = tab;
  }

  bindEvents() {
    document.getElementById('scanFormsBtn').addEventListener('click', () => {
      this.scanCurrentPage();
    });

    document.getElementById('fillFormsBtn').addEventListener('click', () => {
      this.fillForms();
    });

    document.getElementById('saveCurrentBtn').addEventListener('click', () => {
      this.saveCurrentValues();
    });

    document.getElementById('optionsBtn').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });

    document.getElementById('helpBtn').addEventListener('click', () => {
      this.showHelp();
    });
  }

  async scanCurrentPage() {
    this.updateStatus('Scanning page...', 'scanning');

    try {
      // Content Scriptとの接続をチェック
      const isConnected = await this.checkContentScriptConnection();

      if (!isConnected) {
        this.updateStatus('Initializing content script...', 'scanning');
        await this.initializeContentScript();
      }

      const response = await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'scanForms'
      });

      console.log('Scan response:', response);

      if (response && response.success) {
        this.formsData = response.forms;

        // より詳細な情報を表示
        const message = response.message || `Found ${response.forms.length} form${response.forms.length !== 1 ? 's' : ''}`;
        this.updateStatus(message, 'ready');

        // フォーム数とフィールド数の両方を表示
        this.updateFormCount(response.forms.length, response.totalFields, response.totalInputs);
        this.enableButtons();
      } else {
        const errorMsg = response?.error || 'No forms found on this page';
        this.updateStatus(errorMsg, 'error');
        this.disableButtons();
      }
    } catch (error) {
      console.error('Error scanning forms:', error);
      await this.handleScanError(error);
    }
  }

  async checkContentScriptConnection() {
    try {
      const response = await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'ping'
      });
      return response && response.success;
    } catch (error) {
      return false;
    }
  }

  async initializeContentScript() {
    try {
      // 現在のタブがContent Scriptを受け入れ可能かチェック
      if (this.currentTab.url.startsWith('chrome://') ||
          this.currentTab.url.startsWith('chrome-extension://') ||
          this.currentTab.url.startsWith('edge://') ||
          this.currentTab.url.startsWith('about:')) {
        throw new Error('Cannot access special pages');
      }

      console.log('Injecting Content Script...');

      // 既存のスクリプトをクリーンアップ
      await chrome.scripting.executeScript({
        target: { tabId: this.currentTab.id },
        func: () => {
          if (window.smartFormContentLoaded) {
            console.log('Clearing existing SmartForm instance...');
            window.smartFormContentLoaded = false;
            window.smartFormInstance = null;
          }
        }
      });

      // 少し待ってからContent Scriptを注入
      await new Promise(resolve => setTimeout(resolve, 200));

      await chrome.scripting.executeScript({
        target: { tabId: this.currentTab.id },
        files: ['content.js']
      });

      // 初期化完了まで待機
      await new Promise(resolve => setTimeout(resolve, 800));

      const isConnected = await this.checkContentScriptConnection();
      if (!isConnected) {
        throw new Error('Content Script initialization failed');
      }

      console.log('Content Script initialized successfully');
    } catch (error) {
      console.error('Failed to initialize content script:', error);
      throw error;
    }
  }

  async handleScanError(error) {
    let errorMessage = 'Scan error occurred';

    if (error.message.includes('Could not establish connection')) {
      errorMessage = 'Please reload the page and try again';

      // リロードボタンを表示
      this.showReloadSuggestion();
    } else if (error.message.includes('Cannot access')) {
      errorMessage = 'Cannot run scripts on this page';
    } else if (error.message.includes('initialization failed')) {
      errorMessage = 'Content script initialization failed';
    }

    this.updateStatus(errorMessage, 'error');
    this.disableButtons();
  }

  showReloadSuggestion() {
    const statusEl = document.getElementById('status');
    const reloadBtn = document.createElement('button');
    reloadBtn.className = 'btn btn-secondary';
    reloadBtn.innerHTML = '<span class="icon">🔄</span> Reload Page';
    reloadBtn.style.marginTop = '10px';

    reloadBtn.onclick = () => {
      chrome.tabs.reload(this.currentTab.id);
      window.close();
    };

    statusEl.appendChild(reloadBtn);
  }

  async fillForms() {
    if (!this.formsData || this.formsData.length === 0) {
      this.updateStatus('No form data available', 'error');
      return;
    }

    this.updateStatus('Auto-filling forms...', 'scanning');

    try {
      const response = await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'fillForms',
        data: this.formsData
      });

      if (response && response.success) {
        this.updateStatus(`Filled ${response.filledCount} field${response.filledCount !== 1 ? 's' : ''}`, 'ready');
      } else {
        this.updateStatus('Auto-fill failed', 'error');
      }
    } catch (error) {
      console.error('Error filling forms:', error);
      this.updateStatus('Fill error occurred', 'error');
    }
  }

  async saveCurrentValues() {
    if (!this.formsData || this.formsData.length === 0) {
      this.updateStatus('No form data to save', 'error');
      return;
    }

    this.updateStatus('Saving current values...', 'scanning');

    try {
      const response = await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'getCurrentValues'
      });

      if (response && response.success) {
        await this.saveFormProfile(response.values);
        this.updateStatus('Values saved successfully', 'ready');
      } else {
        this.updateStatus('Failed to retrieve values', 'error');
      }
    } catch (error) {
      console.error('Error saving values:', error);
      this.updateStatus('Save error occurred', 'error');
    }
  }

  async saveFormProfile(values) {
    const url = new URL(this.currentTab.url);
    const domain = url.hostname;
    const path = url.pathname;

    const profile = {
      name: `${domain}${path}`,
      domain: domain,
      path: path,
      url: this.currentTab.url,
      title: this.currentTab.title,
      values: values,
      updatedAt: new Date().toISOString()
    };

    // background.jsのsaveFormProfile関数を使用
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'saveProfile',
        profile: profile
      });

      if (!response.success) {
        console.error('Failed to save profile:', response.error);
        throw new Error(response.error || 'Failed to save profile');
      }

      console.log('Profile saved successfully');
    } catch (error) {
      console.error('Error saving profile:', error);
      throw error;
    }
  }

  updateStatus(text, type = 'default') {
    const statusText = document.getElementById('statusText');
    const statusIndicator = document.getElementById('statusIndicator');

    statusText.textContent = text;

    statusIndicator.className = 'status-indicator';
    if (type === 'ready') {
      statusIndicator.classList.add('ready');
    } else if (type === 'error') {
      statusIndicator.classList.add('error');
    }
  }

  updateFormCount(formCount, fieldCount = null, totalInputs = null) {
    const formCountEl = document.getElementById('formCount');
    const formCountText = document.getElementById('formCountText');

    if (formCount > 0) {
      let text = `${formCount} form${formCount !== 1 ? 's' : ''} detected`;

      if (fieldCount !== null) {
        text += ` (${fieldCount} field${fieldCount !== 1 ? 's' : ''})`;
      }

      if (totalInputs !== null && totalInputs !== fieldCount) {
        text += `\nTotal input elements: ${totalInputs}`;
      }

      formCountText.innerHTML = text.replace('\n', '<br>');
      formCountEl.style.display = 'block';
    } else {
      if (totalInputs !== null && totalInputs > 0) {
        formCountText.innerHTML = `No forms<br>Input elements: ${totalInputs}`;
        formCountEl.style.display = 'block';
      } else {
        formCountEl.style.display = 'none';
      }
    }
  }

  enableButtons() {
    document.getElementById('fillFormsBtn').disabled = false;
    document.getElementById('saveCurrentBtn').disabled = false;
  }

  disableButtons() {
    document.getElementById('fillFormsBtn').disabled = true;
    document.getElementById('saveCurrentBtn').disabled = true;
  }

  showHelp() {
    const helpText = `
How to use SmartForm:

1. Click "Scan Forms" to detect forms on the page
2. Use "Save Current Values" to save filled values as a profile
3. Click "Auto Fill" to restore saved values
4. Access "Settings" for profile management

Note: For security, avoid saving sensitive information.
    `.trim();

    alert(helpText);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new SmartFormPopup();
});