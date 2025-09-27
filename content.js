// 重複宣言を防ぐ
if (typeof window.SmartFormContent === 'undefined') {
  window.SmartFormContent = class SmartFormContent {
  constructor() {
    this.forms = [];
    this.isInitialized = false;
    this.settings = {};
    this.messageListener = null;
    this.init();
  }

  async init() {
    if (this.isInitialized) return;

    try {
      await this.loadSettings();
      this.bindMessageListener();
      this.injectStyles();

      if (this.settings.autoFill) {
        await this.autoFillIfAvailable();
      }

      this.isInitialized = true;
      console.log('SmartForm Content Script initialized successfully');
    } catch (error) {
      console.error('SmartForm initialization error:', error);
    }
  }

  async loadSettings() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getSettings' });
      this.settings = response || {};
    } catch (error) {
      console.error('Error loading settings:', error);
      this.settings = {};
    }
  }

  bindMessageListener() {
    if (this.messageListener) {
      chrome.runtime.onMessage.removeListener(this.messageListener);
    }

    this.messageListener = (request, sender, sendResponse) => {
      console.log('SmartForm received message:', request.action);

      switch (request.action) {
        case 'ping':
          sendResponse({ success: true, message: 'SmartForm Content Script is ready' });
          break;
        case 'scanForms':
          this.scanForms().then(sendResponse).catch(error => {
            console.error('scanForms error:', error);
            sendResponse({ success: false, error: error.message });
          });
          break;
        case 'fillForms':
          this.fillForms(request.data).then(sendResponse).catch(error => {
            console.error('fillForms error:', error);
            sendResponse({ success: false, error: error.message });
          });
          break;
        case 'getCurrentValues':
          this.getCurrentValues().then(sendResponse).catch(error => {
            console.error('getCurrentValues error:', error);
            sendResponse({ success: false, error: error.message });
          });
          break;
        case 'quickScan':
          this.quickScan().then(sendResponse).catch(error => {
            console.error('quickScan error:', error);
            sendResponse({ success: false, error: error.message });
          });
          break;
        case 'quickFill':
          this.quickFill().then(sendResponse).catch(error => {
            console.error('quickFill error:', error);
            sendResponse({ success: false, error: error.message });
          });
          break;
        default:
          sendResponse({ success: false, error: 'Unknown action: ' + request.action });
      }
      return true;
    };

    chrome.runtime.onMessage.addListener(this.messageListener);
  }

  injectStyles() {
    if (document.getElementById('smartform-styles')) return;

    const styles = `
      .smartform-highlight {
        outline: 2px solid #4299e1 !important;
        outline-offset: 2px !important;
        background-color: rgba(66, 153, 225, 0.1) !important;
        transition: all 0.2s ease !important;
      }

      .smartform-filled {
        outline: 2px solid #48bb78 !important;
        outline-offset: 2px !important;
        background-color: rgba(72, 187, 120, 0.1) !important;
      }

      .smartform-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 12px 16px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        max-width: 300px;
        animation: slideIn 0.3s ease;
      }

      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }

      .smartform-notification.success {
        border-left: 4px solid #48bb78;
      }

      .smartform-notification.error {
        border-left: 4px solid #f56565;
      }

      .smartform-notification.info {
        border-left: 4px solid #4299e1;
      }
    `;

    const styleElement = document.createElement('style');
    styleElement.id = 'smartform-styles';
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
  }

  async scanForms() {
    console.log('Starting form scan...');

    try {
      this.forms = [];

      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        await new Promise(resolve => {
          document.addEventListener('DOMContentLoaded', resolve);
        });
      }

      const formElements = document.querySelectorAll('form, div[class*="form"], div[id*="form"]');
      console.log(`Found ${formElements.length} potential form containers`);

      for (const formElement of formElements) {
        try {
          const formData = await this.analyzeForm(formElement);
          if (formData.fields.length > 0) {
            this.forms.push(formData);
            console.log(`Added form with ${formData.fields.length} fields`);
          }
        } catch (error) {
          console.warn('Error analyzing form element:', error);
        }
      }

      // If no forms found, try to scan entire document for input fields
      if (this.forms.length === 0) {
        console.log('No forms found, scanning for standalone inputs...');
        const inputs = document.querySelectorAll('input, textarea, select');
        console.log(`Found ${inputs.length} input elements`);

        if (inputs.length > 0) {
          try {
            const formData = await this.analyzeForm(document.body);
            if (formData.fields.length > 0) {
              this.forms.push(formData);
              console.log(`Added standalone form with ${formData.fields.length} fields`);
            }
          } catch (error) {
            console.warn('Error analyzing standalone inputs:', error);
          }
        }
      }

      this.highlightForms();

      const result = {
        success: true,
        forms: this.forms,
        message: `${this.forms.length}個のフォームが見つかりました`
      };

      console.log('Form scan completed:', result);
      return result;

    } catch (error) {
      console.error('Error scanning forms:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async analyzeForm(formElement) {
    const fields = [];
    const inputs = formElement.querySelectorAll('input, textarea, select');

    inputs.forEach((input, index) => {
      if (this.isValidInput(input)) {
        const fieldData = this.extractFieldData(input, index);
        if (fieldData) {
          fields.push(fieldData);
        }
      }
    });

    return {
      id: formElement.id || `form_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      selector: this.generateSelector(formElement),
      fields: fields,
      url: window.location.href,
      title: document.title
    };
  }

  isValidInput(input) {
    const excludedTypes = ['submit', 'button', 'reset', 'file', 'image'];
    const excludedInputs = ['hidden'];

    if (excludedTypes.includes(input.type)) return false;
    if (excludedInputs.includes(input.type) && !input.value) return false;
    if (input.disabled || input.readOnly) return false;
    if (input.style.display === 'none' || input.style.visibility === 'hidden') return false;

    return true;
  }

  extractFieldData(input, index) {
    const rect = input.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return null;

    const label = this.findLabel(input);
    const placeholder = input.placeholder || input.getAttribute('aria-label') || '';

    // フィールドタイプに応じて値を取得
    let value = '';
    let additionalData = {};

    if (input.tagName === 'SELECT') {
      value = input.value;
      additionalData.selectedIndex = input.selectedIndex;
    } else if (input.type === 'checkbox' || input.type === 'radio') {
      value = input.checked;
      additionalData.inputValue = input.value; // actual input value for radio buttons
      if (input.type === 'radio') {
        additionalData.radioGroup = input.name; // group name for radio buttons
      }
    } else {
      value = input.value || '';
    }

    return {
      id: input.id || `field_${index}`,
      name: input.name || '',
      type: input.type || input.tagName.toLowerCase(),
      selector: this.generateSelector(input),
      label: label,
      placeholder: placeholder,
      value: value,
      required: input.required,
      maxLength: input.maxLength > 0 ? input.maxLength : null,
      pattern: input.pattern || '',
      options: this.getSelectOptions(input),
      ...additionalData
    };
  }

  findLabel(input) {
    if (input.id) {
      const label = document.querySelector(`label[for="${input.id}"]`);
      if (label) return label.textContent.trim();
    }

    const parentLabel = input.closest('label');
    if (parentLabel) return parentLabel.textContent.replace(input.value, '').trim();

    const siblingLabel = input.previousElementSibling;
    if (siblingLabel && siblingLabel.tagName === 'LABEL') {
      return siblingLabel.textContent.trim();
    }

    const nearbyText = this.findNearbyText(input);
    return nearbyText;
  }

  findNearbyText(input) {
    const parent = input.parentElement;
    if (!parent) return '';

    const textNodes = [];
    const walker = document.createTreeWalker(
      parent,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          if (node.textContent.trim().length > 0) {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_REJECT;
        }
      }
    );

    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node.textContent.trim());
    }

    return textNodes.join(' ').substring(0, 50);
  }

  getSelectOptions(input) {
    if (input.tagName !== 'SELECT') return null;

    const options = [];
    for (const option of input.options) {
      options.push({
        value: option.value,
        text: option.textContent.trim(),
        selected: option.selected
      });
    }
    return options;
  }

  generateSelector(element) {
    if (element.id) {
      return `#${element.id}`;
    }

    if (element.name) {
      return `[name="${element.name}"]`;
    }

    const path = [];
    while (element && element.nodeType === Node.ELEMENT_NODE) {
      let selector = element.nodeName.toLowerCase();

      if (element.className) {
        const classes = element.className.split(' ').filter(c => c.trim());
        if (classes.length > 0) {
          selector += '.' + classes.slice(0, 2).join('.');
        }
      }

      path.unshift(selector);
      element = element.parentNode;

      if (path.length > 5) break;
    }

    return path.join(' > ');
  }

  highlightForms() {
    document.querySelectorAll('.smartform-highlight').forEach(el => {
      el.classList.remove('smartform-highlight');
    });

    this.forms.forEach(form => {
      form.fields.forEach(field => {
        try {
          const element = document.querySelector(field.selector);
          if (element) {
            element.classList.add('smartform-highlight');
          }
        } catch (error) {
          console.warn('Invalid selector:', field.selector);
        }
      });
    });

    setTimeout(() => {
      document.querySelectorAll('.smartform-highlight').forEach(el => {
        el.classList.remove('smartform-highlight');
      });
    }, 3000);
  }

  async fillForms(formsData) {
    try {
      let filledCount = 0;
      const profiles = await this.getMatchingProfiles();

      if (profiles.length === 0) {
        return {
          success: false,
          error: 'このページに対応するプロファイルが見つかりません'
        };
      }

      const profile = profiles[0];

      for (const form of this.forms) {
        for (const field of form.fields) {
          const savedValue = this.findMatchingValue(field, profile.values);
          if (savedValue !== null) {
            const filled = await this.fillField(field, savedValue);
            if (filled) filledCount++;
          }
        }
      }

      this.showNotification('success', `${filledCount}個のフィールドを入力しました`);

      return {
        success: true,
        filledCount: filledCount
      };
    } catch (error) {
      console.error('Error filling forms:', error);
      this.showNotification('error', 'フォーム入力中にエラーが発生しました');
      return {
        success: false,
        error: error.message
      };
    }
  }

  findMatchingValue(field, savedValues) {
    for (const saved of savedValues) {
      if (saved.id === field.id && saved.id) return saved.value;
      if (saved.name === field.name && saved.name) return saved.value;
      if (saved.label === field.label && saved.label) return saved.value;

      if (this.isSimilarField(field, saved)) {
        return saved.value;
      }
    }

    return null;
  }

  isSimilarField(field1, field2) {
    const similarity = this.calculateSimilarity(
      (field1.label || field1.placeholder || '').toLowerCase(),
      (field2.label || field2.placeholder || '').toLowerCase()
    );

    return similarity > 0.8 && field1.type === field2.type;
  }

  calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  async fillField(field, value) {
    try {
      const element = document.querySelector(field.selector);
      if (!element) return false;

      element.classList.add('smartform-filled');

      if (element.tagName === 'SELECT') {
        // SELECT要素の処理
        if (field.selectedIndex !== undefined && field.selectedIndex >= 0) {
          element.selectedIndex = field.selectedIndex;
        } else {
          element.value = value;
        }
        element.dispatchEvent(new Event('change', { bubbles: true }));

      } else if (element.type === 'checkbox') {
        // Checkbox要素の処理
        element.checked = value === true || value === 'true';
        element.dispatchEvent(new Event('change', { bubbles: true }));

      } else if (element.type === 'radio') {
        // Radio要素の処理
        if (field.radioGroup && field.inputValue) {
          // グループ内の指定された値のradioを選択
          const radioElements = document.querySelectorAll(`input[type="radio"][name="${field.radioGroup}"]`);
          radioElements.forEach(radio => {
            radio.checked = radio.value === field.inputValue && value === true;
          });
          element.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          element.checked = value === true || value === 'true';
          element.dispatchEvent(new Event('change', { bubbles: true }));
        }

      } else {
        // テキスト系要素の処理
        element.focus();
        element.value = value;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.blur();
      }

      setTimeout(() => {
        element.classList.remove('smartform-filled');
      }, 2000);

      return true;
    } catch (error) {
      console.error('Error filling field:', error);
      return false;
    }
  }

  async getCurrentValues() {
    try {
      const values = [];

      this.forms.forEach(form => {
        form.fields.forEach(field => {
          try {
            const element = document.querySelector(field.selector);
            if (element) {
              let value = '';
              let additionalData = {};
              let shouldSave = false;

              if (element.tagName === 'SELECT') {
                value = element.value;
                additionalData.selectedIndex = element.selectedIndex;
                shouldSave = true; // Always save select values

              } else if (element.type === 'checkbox') {
                value = element.checked;
                additionalData.inputValue = element.value;
                shouldSave = true; // Always save checkbox state (true/false)

              } else if (element.type === 'radio') {
                value = element.checked;
                additionalData.inputValue = element.value;
                additionalData.radioGroup = element.name;
                shouldSave = true; // Always save radio state

              } else {
                value = element.value;
                shouldSave = value !== '' && value !== null && value !== undefined;
              }

              if (shouldSave) {
                values.push({
                  ...field,
                  value: value,
                  ...additionalData
                });
              }
            }
          } catch (error) {
            console.warn('Error getting value for field:', field.selector);
          }
        });
      });

      return {
        success: true,
        values: values
      };
    } catch (error) {
      console.error('Error getting current values:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getMatchingProfiles() {
    try {
      const url = new URL(window.location.href);
      const response = await chrome.runtime.sendMessage({
        action: 'getProfiles',
        domain: url.hostname,
        path: url.pathname
      });

      return response.success ? response.profiles : [];
    } catch (error) {
      console.error('Error getting profiles:', error);
      return [];
    }
  }

  async autoFillIfAvailable() {
    const profiles = await this.getMatchingProfiles();
    if (profiles.length > 0) {
      await this.scanForms();
      if (this.forms.length > 0) {
        await this.fillForms();
      }
    }
  }

  showNotification(type, message) {
    if (!this.settings.showNotifications) return;

    const notification = document.createElement('div');
    notification.className = `smartform-notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }

  async quickScan() {
    return await this.scanForms();
  }

  async quickFill() {
    await this.scanForms();
    return await this.fillForms();
  }
  }; // クラス定義の終了
}

// Prevent multiple initializations
if (!window.smartFormContentScript) {
  window.smartFormContentScript = true;

  function initializeSmartForm() {
    try {
      if (!window.smartFormInstance && window.SmartFormContent) {
        console.log('Initializing SmartForm content script...');
        window.smartFormInstance = new window.SmartFormContent();
      }
    } catch (error) {
      console.error('Failed to initialize SmartForm:', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSmartForm);
  } else {
    initializeSmartForm();
  }
}