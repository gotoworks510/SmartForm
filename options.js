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
          <h3>No profiles available</h3>
          <p>Use forms to create profiles</p>
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
              Edit
            </button>
            <button class="btn btn-danger delete-profile" data-id="${profile.id}">
              <span class="icon">🗑️</span>
              Delete
            </button>
          </div>
        </div>
        <div class="profile-meta">
          <span class="profile-fields">${profile.values?.length || 0} field${(profile.values?.length || 0) !== 1 ? 's' : ''}</span>
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

    filterSelect.innerHTML = '<option value="">All Domains</option>' +
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

    document.getElementById('modalTitle').textContent = 'Edit Profile';
    document.getElementById('profileName').value = this.currentProfile.name || this.currentProfile.title;
    document.getElementById('profileUrl').value = this.currentProfile.url;

    this.renderProfileFields();
    this.showModal();
  }

  renderProfileFields() {
    const container = document.getElementById('fieldsContainer');
    const fields = this.currentProfile.values || [];

    if (fields.length === 0) {
      container.innerHTML = '<p>No field data available</p>';
      return;
    }

    container.innerHTML = fields.map((field, index) => `
      <div class="field-item" data-index="${index}">
        <div class="field-info">
          <div class="field-label">${this.escapeHtml(field.label || field.name || field.id)}</div>
          <div class="field-value">${this.escapeHtml(String(field.value).substring(0, 50))}${String(field.value).length > 50 ? '...' : ''}</div>
        </div>
        <div class="field-actions">
          <button class="btn btn-secondary edit-field" data-index="${index}">Edit</button>
          <button class="btn btn-danger delete-field" data-index="${index}">Delete</button>
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
    const newValue = prompt(`Value for field "${field.label || field.name || field.id}":`, field.value);

    if (newValue !== null) {
      this.currentProfile.values[index].value = newValue;
      this.renderProfileFields();
    }
  }

  deleteField(index) {
    if (confirm('Delete this field?')) {
      this.currentProfile.values.splice(index, 1);
      this.renderProfileFields();
    }
  }

  async deleteProfile(profileId) {
    if (!confirm('Delete this profile?')) return;

    this.profiles = this.profiles.filter(p => p.id !== profileId);
    this.filteredProfiles = this.filteredProfiles.filter(p => p.id !== profileId);

    await chrome.storage.local.set({ formProfiles: this.profiles });
    this.renderProfiles();
    this.updateStats();
    this.showNotification('Profile deleted', 'success');
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
        this.showNotification('Profile updated', 'success');
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
    this.showNotification('Settings saved', 'success');
  }

  resetSettings() {
    if (!confirm('Reset settings?')) return;

    this.settings = this.getDefaultSettings();
    this.renderSettings();
    this.showNotification('Settings reset', 'info');
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

    this.showNotification('Data exported', 'success');
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
          if (confirm(`Import ${data.profiles.length} profile${data.profiles.length !== 1 ? 's' : ''}? Existing data will be preserved.`)) {

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
            this.showNotification('Data imported', 'success');
          }
        } else {
          throw new Error('Invalid file format');
        }
      } catch (error) {
        console.error('Import error:', error);
        this.showNotification('Import error: Invalid file format', 'error');
      }
    };

    input.click();
  }

  async clearAllProfiles() {
    if (!confirm('Delete all profiles? This action cannot be undone.')) return;

    this.profiles = [];
    this.filteredProfiles = [];
    await chrome.storage.local.set({ formProfiles: [] });

    this.renderProfiles();
    this.updateStats();
    this.showNotification('All profiles deleted', 'info');
  }

  async clearCache() {
    if (!confirm('Clear cache?')) return;

    // Clear temporary data but keep profiles and settings
    await chrome.storage.session.clear();
    this.showNotification('Cache cleared', 'info');
  }

  async clearAllData() {
    if (!confirm('Delete all data? This action cannot be undone.')) return;
    if (!confirm('Really delete all data? All profiles and settings will be lost.')) return;

    await chrome.storage.local.clear();
    await chrome.storage.session.clear();

    this.profiles = [];
    this.filteredProfiles = [];
    this.settings = this.getDefaultSettings();

    this.renderProfiles();
    this.renderSettings();
    this.updateStats();
    this.showNotification('All data deleted', 'info');
  }

  updateSettingPreview() {
    // Real-time setting preview logic can be added here
  }

  formatDate(timestamp) {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
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