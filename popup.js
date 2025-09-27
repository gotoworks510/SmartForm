class SmartFormPopup {
  constructor() {
    this.currentTab = null;
    this.formsData = null;
    this.initializePopup();
  }

  async initializePopup() {
    await this.getCurrentTab();
    this.bindEvents();
    await this.scanCurrentPage();
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
    this.updateStatus('ページをスキャン中...', 'scanning');

    try {
      // Content Scriptとの接続をチェック
      const isConnected = await this.checkContentScriptConnection();

      if (!isConnected) {
        this.updateStatus('Content Scriptを初期化中...', 'scanning');
        await this.initializeContentScript();
      }

      const response = await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'scanForms'
      });

      console.log('Scan response:', response);

      if (response && response.success) {
        this.formsData = response.forms;
        this.updateStatus(`${response.forms.length}個のフォームが見つかりました`, 'ready');
        this.updateFormCount(response.forms.length);
        this.enableButtons();
      } else {
        const errorMsg = response?.error || 'フォームが見つかりませんでした';
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
      // Content Scriptを強制的に再注入
      await chrome.scripting.executeScript({
        target: { tabId: this.currentTab.id },
        files: ['content.js']
      });

      // 少し待ってから接続をチェック
      await new Promise(resolve => setTimeout(resolve, 500));

      const isConnected = await this.checkContentScriptConnection();
      if (!isConnected) {
        throw new Error('Content Script initialization failed');
      }
    } catch (error) {
      console.error('Failed to initialize content script:', error);
      throw error;
    }
  }

  async handleScanError(error) {
    let errorMessage = 'スキャンエラーが発生しました';

    if (error.message.includes('Could not establish connection')) {
      errorMessage = 'ページを再読み込みしてから再試行してください';

      // リロードボタンを表示
      this.showReloadSuggestion();
    } else if (error.message.includes('Cannot access')) {
      errorMessage = 'このページではスクリプトを実行できません';
    } else if (error.message.includes('initialization failed')) {
      errorMessage = 'Content Scriptの初期化に失敗しました';
    }

    this.updateStatus(errorMessage, 'error');
    this.disableButtons();
  }

  showReloadSuggestion() {
    const statusEl = document.getElementById('status');
    const reloadBtn = document.createElement('button');
    reloadBtn.className = 'btn btn-secondary';
    reloadBtn.innerHTML = '<span class="icon">🔄</span> ページを再読み込み';
    reloadBtn.style.marginTop = '10px';

    reloadBtn.onclick = () => {
      chrome.tabs.reload(this.currentTab.id);
      window.close();
    };

    statusEl.appendChild(reloadBtn);
  }

  async fillForms() {
    if (!this.formsData || this.formsData.length === 0) {
      this.updateStatus('フォームデータがありません', 'error');
      return;
    }

    this.updateStatus('フォームを自動入力中...', 'scanning');

    try {
      const response = await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'fillForms',
        data: this.formsData
      });

      if (response && response.success) {
        this.updateStatus(`${response.filledCount}個のフィールドを入力しました`, 'ready');
      } else {
        this.updateStatus('自動入力に失敗しました', 'error');
      }
    } catch (error) {
      console.error('Error filling forms:', error);
      this.updateStatus('入力エラーが発生しました', 'error');
    }
  }

  async saveCurrentValues() {
    if (!this.formsData || this.formsData.length === 0) {
      this.updateStatus('保存するフォームデータがありません', 'error');
      return;
    }

    this.updateStatus('現在の値を保存中...', 'scanning');

    try {
      const response = await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'getCurrentValues'
      });

      if (response && response.success) {
        await this.saveFormProfile(response.values);
        this.updateStatus('値を保存しました', 'ready');
      } else {
        this.updateStatus('値の取得に失敗しました', 'error');
      }
    } catch (error) {
      console.error('Error saving values:', error);
      this.updateStatus('保存エラーが発生しました', 'error');
    }
  }

  async saveFormProfile(values) {
    const url = new URL(this.currentTab.url);
    const domain = url.hostname;
    const path = url.pathname;

    const profile = {
      id: Date.now().toString(),
      name: `${domain}${path}`,
      domain: domain,
      path: path,
      url: this.currentTab.url,
      title: this.currentTab.title,
      values: values,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const { formProfiles = [] } = await chrome.storage.local.get(['formProfiles']);

    const existingIndex = formProfiles.findIndex(p =>
      p.domain === domain && p.path === path
    );

    if (existingIndex >= 0) {
      formProfiles[existingIndex] = { ...formProfiles[existingIndex], ...profile };
    } else {
      formProfiles.push(profile);
    }

    await chrome.storage.local.set({ formProfiles });
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

  updateFormCount(count) {
    const formCountEl = document.getElementById('formCount');
    const formCountText = document.getElementById('formCountText');

    if (count > 0) {
      formCountText.textContent = `${count}個のフォームが検出されました`;
      formCountEl.style.display = 'block';
    } else {
      formCountEl.style.display = 'none';
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
SmartForm の使い方:

1. 「フォームをスキャン」でページ内のフォームを検出
2. 「現在の値を保存」で入力済みの値をプロファイルとして保存
3. 「フォームを自動入力」で保存済みの値を自動入力
4. 「設定」でプロファイルの詳細管理

注意: セキュリティのため、機密情報の保存は避けてください。
    `.trim();

    alert(helpText);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new SmartFormPopup();
});