class SmartFormOptions {
  constructor() {
    this.profiles = [];
    this.settings = {};
    this.currentProfile = null;
    this.filteredProfiles = [];
    this.init();
  }

  async init() {
    await this.loadData();
    this.bindEvents();
    this.renderProfiles();
    this.renderSettings();
    this.updateStats();
  }

  async loadData() {
    try {
      const result = await chrome.storage.local.get(['formProfiles', 'settings']);
      this.profiles = result.formProfiles || [];
      this.settings = result.settings || this.getDefaultSettings();
      this.filteredProfiles = [...this.profiles];
    } catch (error) {
      console.error('Error loading data:', error);
      this.profiles = [];
      this.settings = this.getDefaultSettings();
    }
  }

  getDefaultSettings() {
    return {
      autoSave: false,
      autoFill: false,
      showNotifications: true,
      excludeDomains: ['example.com'],
      maxProfiles: 100,
      encryptData: false,
      clearOnClose: false
    };
  }

  bindEvents() {
    this.bindTabEvents();
    this.bindProfileEvents();
    this.bindSettingEvents();
    this.bindSecurityEvents();
    this.bindModalEvents();
  }

  bindTabEvents() {
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const tabName = e.target.dataset.tab;
        this.switchTab(tabName);
      });
    });
  }

  bindProfileEvents() {
    document.getElementById('searchProfiles').addEventListener('input', (e) => {
      this.filterProfiles(e.target.value);
    });

    document.getElementById('filterDomain').addEventListener('change', (e) => {
      this.filterByDomain(e.target.value);
    });

    document.getElementById('importBtn').addEventListener('click', () => {
      this.importProfiles();
    });

    document.getElementById('exportBtn').addEventListener('click', () => {
      this.exportProfiles();
    });

    document.getElementById('clearAllBtn').addEventListener('click', () => {
      this.clearAllProfiles();
    });
  }

  bindSettingEvents() {
    document.getElementById('saveSettings').addEventListener('click', () => {
      this.saveSettings();
    });

    document.getElementById('resetSettings').addEventListener('click', () => {
      this.resetSettings();
    });

    const settingCheckboxes = ['autoSave', 'autoFill', 'showNotifications', 'encryptData', 'clearOnClose'];
    settingCheckboxes.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener('change', () => {
          this.updateSettingPreview();
        });
      }
    });
  }

  bindSecurityEvents() {
    document.getElementById('clearCache').addEventListener('click', () => {
      this.clearCache();
    });

    document.getElementById('clearAllData').addEventListener('click', () => {
      this.clearAllData();
    });
  }

  bindModalEvents() {
    document.querySelector('.modal-close').addEventListener('click', () => {
      this.closeModal();
    });

    document.getElementById('cancelEdit').addEventListener('click', () => {
      this.closeModal();
    });

    document.getElementById('saveProfile').addEventListener('click', () => {
      this.saveProfileEdit();
    });

    document.getElementById('profileModal').addEventListener('click', (e) => {
      if (e.target.id === 'profileModal') {
        this.closeModal();
      }
    });
  }

  switchTab(tabName) {
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.classList.remove('active');
    });

    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });

    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
  }

  async renderProfiles() {
    const container = document.getElementById('profilesList');

    if (this.filteredProfiles.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>プロファイルがありません</h3>
          <p>フォームを使用してプロファイルを作成してください</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.filteredProfiles.map(profile => `
      <div class="profile-item" data-id="${profile.id}">
        <div class="profile-header">
          <div class="profile-info">
            <h3>${this.escapeHtml(profile.name || profile.title)}</h3>
            <p>${this.escapeHtml(profile.domain)}${profile.path}</p>
          </div>
          <div class="profile-actions">
            <button class="btn btn-secondary edit-profile" data-id="${profile.id}">
              <span class="icon">✏️</span>
              編集
            </button>
            <button class="btn btn-danger delete-profile" data-id="${profile.id}">
              <span class="icon">🗑️</span>
              削除
            </button>
          </div>
        </div>
        <div class="profile-meta">
          <span class="profile-fields">${profile.values?.length || 0}個のフィールド</span>
          <span>${this.formatDate(profile.updatedAt)}</span>
        </div>
      </div>
    `).join('');

    this.bindProfileItemEvents();
    this.updateDomainFilter();
  }

  bindProfileItemEvents() {
    document.querySelectorAll('.edit-profile').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const profileId = e.target.closest('[data-id]').dataset.id;
        this.editProfile(profileId);
      });
    });

    document.querySelectorAll('.delete-profile').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const profileId = e.target.closest('[data-id]').dataset.id;
        this.deleteProfile(profileId);
      });
    });
  }

  renderSettings() {
    document.getElementById('autoSave').checked = this.settings.autoSave;
    document.getElementById('autoFill').checked = this.settings.autoFill;
    document.getElementById('showNotifications').checked = this.settings.showNotifications;
    document.getElementById('maxProfiles').value = this.settings.maxProfiles;
    document.getElementById('excludeDomains').value = this.settings.excludeDomains.join('\n');
    document.getElementById('encryptData').checked = this.settings.encryptData;
    document.getElementById('clearOnClose').checked = this.settings.clearOnClose;
  }

  updateStats() {
    const totalProfiles = this.profiles.length;
    const totalDomains = new Set(this.profiles.map(p => p.domain)).size;
    const lastUsed = this.profiles.length > 0
      ? this.formatDate(Math.max(...this.profiles.map(p => new Date(p.updatedAt).getTime())))
      : '-';

    document.getElementById('totalProfiles').textContent = totalProfiles;
    document.getElementById('totalDomains').textContent = totalDomains;
    document.getElementById('lastUsed').textContent = lastUsed;
  }

  updateDomainFilter() {
    const filterSelect = document.getElementById('filterDomain');
    const domains = [...new Set(this.profiles.map(p => p.domain))].sort();

    filterSelect.innerHTML = '<option value="">すべてのドメイン</option>' +
      domains.map(domain => `<option value="${domain}">${domain}</option>`).join('');
  }

  filterProfiles(searchTerm) {
    const term = searchTerm.toLowerCase();
    this.filteredProfiles = this.profiles.filter(profile => {
      return (profile.name || profile.title).toLowerCase().includes(term) ||
             profile.domain.toLowerCase().includes(term) ||
             profile.url.toLowerCase().includes(term);
    });
    this.renderProfiles();
  }

  filterByDomain(domain) {
    if (domain) {
      this.filteredProfiles = this.profiles.filter(profile => profile.domain === domain);
    } else {
      this.filteredProfiles = [...this.profiles];
    }
    this.renderProfiles();
  }

  editProfile(profileId) {
    this.currentProfile = this.profiles.find(p => p.id === profileId);
    if (!this.currentProfile) return;

    document.getElementById('modalTitle').textContent = 'プロファイル編集';
    document.getElementById('profileName').value = this.currentProfile.name || this.currentProfile.title;
    document.getElementById('profileUrl').value = this.currentProfile.url;

    this.renderProfileFields();
    this.showModal();
  }

  renderProfileFields() {
    const container = document.getElementById('fieldsContainer');
    const fields = this.currentProfile.values || [];

    if (fields.length === 0) {
      container.innerHTML = '<p>フィールドデータがありません</p>';
      return;
    }

    container.innerHTML = fields.map((field, index) => `
      <div class="field-item" data-index="${index}">
        <div class="field-info">
          <div class="field-label">${this.escapeHtml(field.label || field.name || field.id)}</div>
          <div class="field-value">${this.escapeHtml(String(field.value).substring(0, 50))}${String(field.value).length > 50 ? '...' : ''}</div>
        </div>
        <div class="field-actions">
          <button class="btn btn-secondary edit-field" data-index="${index}">編集</button>
          <button class="btn btn-danger delete-field" data-index="${index}">削除</button>
        </div>
      </div>
    `).join('');

    this.bindFieldEvents();
  }

  bindFieldEvents() {
    document.querySelectorAll('.edit-field').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        this.editField(index);
      });
    });

    document.querySelectorAll('.delete-field').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        this.deleteField(index);
      });
    });
  }

  editField(index) {
    const field = this.currentProfile.values[index];
    const newValue = prompt(`フィールド「${field.label || field.name || field.id}」の値:`, field.value);

    if (newValue !== null) {
      this.currentProfile.values[index].value = newValue;
      this.renderProfileFields();
    }
  }

  deleteField(index) {
    if (confirm('このフィールドを削除しますか？')) {
      this.currentProfile.values.splice(index, 1);
      this.renderProfileFields();
    }
  }

  async deleteProfile(profileId) {
    if (!confirm('このプロファイルを削除しますか？')) return;

    this.profiles = this.profiles.filter(p => p.id !== profileId);
    this.filteredProfiles = this.filteredProfiles.filter(p => p.id !== profileId);

    await chrome.storage.local.set({ formProfiles: this.profiles });
    this.renderProfiles();
    this.updateStats();
    this.showNotification('プロファイルを削除しました', 'success');
  }

  async saveProfileEdit() {
    if (!this.currentProfile) return;

    const newName = document.getElementById('profileName').value.trim();
    if (newName) {
      this.currentProfile.name = newName;
      this.currentProfile.updatedAt = new Date().toISOString();

      const index = this.profiles.findIndex(p => p.id === this.currentProfile.id);
      if (index >= 0) {
        this.profiles[index] = this.currentProfile;
        await chrome.storage.local.set({ formProfiles: this.profiles });
        this.renderProfiles();
        this.updateStats();
        this.showNotification('プロファイルを更新しました', 'success');
      }
    }

    this.closeModal();
  }

  showModal() {
    document.getElementById('profileModal').classList.add('show');
  }

  closeModal() {
    document.getElementById('profileModal').classList.remove('show');
    this.currentProfile = null;
  }

  async saveSettings() {
    this.settings = {
      autoSave: document.getElementById('autoSave').checked,
      autoFill: document.getElementById('autoFill').checked,
      showNotifications: document.getElementById('showNotifications').checked,
      maxProfiles: parseInt(document.getElementById('maxProfiles').value),
      excludeDomains: document.getElementById('excludeDomains').value
        .split('\n')
        .map(domain => domain.trim())
        .filter(domain => domain),
      encryptData: document.getElementById('encryptData').checked,
      clearOnClose: document.getElementById('clearOnClose').checked
    };

    await chrome.storage.local.set({ settings: this.settings });
    this.showNotification('設定を保存しました', 'success');
  }

  resetSettings() {
    if (!confirm('設定をリセットしますか？')) return;

    this.settings = this.getDefaultSettings();
    this.renderSettings();
    this.showNotification('設定をリセットしました', 'info');
  }

  exportProfiles() {
    const data = {
      profiles: this.profiles,
      settings: this.settings,
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smartform-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    this.showNotification('データをエクスポートしました', 'success');
  }

  importProfiles() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (data.profiles && Array.isArray(data.profiles)) {
          if (confirm(`${data.profiles.length}個のプロファイルをインポートしますか？既存のデータは保持されます。`)) {

            this.profiles = [...this.profiles, ...data.profiles];

            if (data.settings) {
              this.settings = { ...this.settings, ...data.settings };
            }

            await chrome.storage.local.set({
              formProfiles: this.profiles,
              settings: this.settings
            });

            this.filteredProfiles = [...this.profiles];
            this.renderProfiles();
            this.renderSettings();
            this.updateStats();
            this.showNotification('データをインポートしました', 'success');
          }
        } else {
          throw new Error('Invalid file format');
        }
      } catch (error) {
        console.error('Import error:', error);
        this.showNotification('インポートエラー: ファイル形式が正しくありません', 'error');
      }
    };

    input.click();
  }

  async clearAllProfiles() {
    if (!confirm('すべてのプロファイルを削除しますか？この操作は取り消せません。')) return;

    this.profiles = [];
    this.filteredProfiles = [];
    await chrome.storage.local.set({ formProfiles: [] });

    this.renderProfiles();
    this.updateStats();
    this.showNotification('すべてのプロファイルを削除しました', 'info');
  }

  async clearCache() {
    if (!confirm('キャッシュをクリアしますか？')) return;

    // Clear temporary data but keep profiles and settings
    await chrome.storage.session.clear();
    this.showNotification('キャッシュをクリアしました', 'info');
  }

  async clearAllData() {
    if (!confirm('すべてのデータを削除しますか？この操作は取り消せません。')) return;
    if (!confirm('本当にすべてのデータを削除しますか？プロファイルと設定がすべて失われます。')) return;

    await chrome.storage.local.clear();
    await chrome.storage.session.clear();

    this.profiles = [];
    this.filteredProfiles = [];
    this.settings = this.getDefaultSettings();

    this.renderProfiles();
    this.renderSettings();
    this.updateStats();
    this.showNotification('すべてのデータを削除しました', 'info');
  }

  updateSettingPreview() {
    // Real-time setting preview logic can be added here
  }

  formatDate(timestamp) {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `smartform-toast ${type} show`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new SmartFormOptions();
});