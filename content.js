// Prevent duplicate execution completely
if (window.smartFormContentLoaded) {
  console.log('SmartForm Content Script already loaded, skipping...');
} else {
  window.smartFormContentLoaded = true;
  console.log('Loading SmartForm Content Script...');

class SmartFormContent {
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
    console.log('🔍 Starting comprehensive form scan...');

    try {
      this.forms = [];
      let totalFieldsDetected = 0;

      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        await new Promise(resolve => {
          document.addEventListener('DOMContentLoaded', resolve);
        });
      }

      // Step 1: Scan basic form elements
      const formElements = document.querySelectorAll('form');
      console.log(`📋 Found ${formElements.length} <form> elements`);

      for (const formElement of formElements) {
        try {
          const formData = await this.analyzeForm(formElement);
          if (formData.fields.length > 0) {
            this.forms.push(formData);
            totalFieldsDetected += formData.fields.length;
            console.log(`✅ Added <form> with ${formData.fields.length} fields (ID: ${formElement.id || 'no-id'})`);
          } else {
            console.log(`⚠️ Skipped empty <form> (ID: ${formElement.id || 'no-id'})`);
          }
        } catch (error) {
          console.warn('❌ Error analyzing <form> element:', error);
        }
      }

      // Step 2: Scan divs with form-related classes/IDs (only those not inside <form> elements to avoid duplicates)
      const formLikeDivs = document.querySelectorAll('div[class*="form"], div[id*="form"], div[class*="Form"], div[id*="Form"]');
      const filteredFormLikeDivs = Array.from(formLikeDivs).filter(div => !div.closest('form'));
      console.log(`📦 Found ${filteredFormLikeDivs.length} form-like div elements (excluding those inside <form>)`);

      for (const divElement of filteredFormLikeDivs) {
        try {
          const formData = await this.analyzeForm(divElement);
          if (formData.fields.length > 0) {
            this.forms.push(formData);
            totalFieldsDetected += formData.fields.length;
            console.log(`✅ Added form-like div with ${formData.fields.length} fields (class: ${divElement.className || 'no-class'})`);
          }
        } catch (error) {
          console.warn('❌ Error analyzing form-like div:', error);
        }
      }

      // Step 3: Scan independent input elements (not belonging to forms)
      const allInputs = document.querySelectorAll('input, textarea, select');
      const orphanInputs = Array.from(allInputs).filter(input => !input.closest('form'));
      console.log(`🔗 Found ${orphanInputs.length} orphan input elements (not in <form>)`);

      if (orphanInputs.length > 0) {
        try {
          const orphanFormData = await this.analyzeForm(document.body, true); // orphan mode
          if (orphanFormData.fields.length > 0) {
            this.forms.push(orphanFormData);
            totalFieldsDetected += orphanFormData.fields.length;
            console.log(`✅ Added orphan inputs as single form with ${orphanFormData.fields.length} fields`);
          }
        } catch (error) {
          console.warn('❌ Error analyzing orphan inputs:', error);
        }
      }

      // Step 4: Summary of results
      this.highlightForms();

      console.log(`\n📊 Scan Results Summary:`);
      console.log(`  • Forms detected: ${this.forms.length}`);
      console.log(`  • Total fields: ${totalFieldsDetected}`);
      console.log(`  • Input elements on page: ${allInputs.length}`);

      const result = {
        success: true,
        forms: this.forms,
        totalFields: totalFieldsDetected,
        totalInputs: allInputs.length,
        message: `Found ${this.forms.length} form${this.forms.length !== 1 ? 's' : ''} (${totalFieldsDetected} field${totalFieldsDetected !== 1 ? 's' : ''})`
      };

      console.log('✅ Form scan completed successfully');
      return result;

    } catch (error) {
      console.error('❌ Error during form scan:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async analyzeForm(formElement, isOrphanMode = false) {
    const fields = [];
    let inputs;

    if (isOrphanMode) {
      // Orphan mode: only select inputs that are NOT inside any form
      inputs = document.querySelectorAll('input, textarea, select');
      inputs = Array.from(inputs).filter(input => !input.closest('form'));
    } else {
      // Normal mode: select inputs within the given element
      inputs = formElement.querySelectorAll('input, textarea, select');
    }

    console.log(`🔍 Analyzing ${isOrphanMode ? 'orphan' : 'regular'} form with ${inputs.length} input elements`);

    inputs.forEach((input, index) => {
      if (this.isValidInput(input)) {
        const fieldData = this.extractFieldData(input, index);
        if (fieldData) {
          fields.push(fieldData);
          console.log(`  ✓ Added field: ${fieldData.type} - ${fieldData.label || fieldData.name || fieldData.id}`);
        } else {
          console.log(`  ⚠️ Skipped field: ${input.type} - hidden or invalid`);
        }
      } else {
        console.log(`  ❌ Invalid input: ${input.type} (${input.id || input.name || 'no-id'})`);
      }
    });

    const formId = isOrphanMode
      ? 'orphan_inputs_form'
      : (formElement.id || `form_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

    return {
      id: formId,
      selector: isOrphanMode ? 'body' : this.generateSelector(formElement),
      fields: fields,
      url: window.location.href,
      title: document.title,
      isOrphan: isOrphanMode
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

    // Improved visibility check (more lenient for SELECT, radio, checkbox)
    const isSpecialInput = input.tagName === 'SELECT' || input.type === 'radio' || input.type === 'checkbox';
    if (!isSpecialInput && rect.width === 0 && rect.height === 0) {
      console.log(`🚫 Skipping invisible element: ${input.type} (${input.id || input.name || 'no-id'})`);
      return null;
    }

    const label = this.findLabel(input);
    const placeholder = input.placeholder || input.getAttribute('aria-label') || '';

    // Get value according to field type
    let value = '';
    let additionalData = {};

    console.log(`🔍 Processing ${input.tagName.toLowerCase()}${input.type ? `[${input.type}]` : ''}: ${input.id || input.name || 'no-id'}`);

    if (input.tagName === 'SELECT') {
      value = input.value;
      additionalData.selectedIndex = input.selectedIndex;
      additionalData.selectedText = input.options[input.selectedIndex]?.text || '';
      console.log(`  📝 SELECT value: "${value}" (index: ${input.selectedIndex}, text: "${additionalData.selectedText}")`);

    } else if (input.type === 'checkbox') {
      value = input.checked;
      additionalData.inputValue = input.value;
      console.log(`  ☑️ CHECKBOX: checked=${value}, inputValue="${input.value}"`);

    } else if (input.type === 'radio') {
      value = input.checked;
      additionalData.inputValue = input.value;
      additionalData.radioGroup = input.name;
      console.log(`  🔘 RADIO: checked=${value}, inputValue="${input.value}", group="${input.name}"`);

    } else {
      value = input.value || '';
      console.log(`  📄 TEXT-like: value="${value}"`);
    }

    const fieldData = {
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

    console.log(`  ✅ Field data created: ${fieldData.type} - "${fieldData.label || fieldData.name || fieldData.id}"`);
    return fieldData;
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
    // ID has highest priority
    if (element.id) {
      return `#${element.id}`;
    }

    // name attribute is next most reliable
    if (element.name) {
      return `[name="${element.name}"]`;
    }

    // Combination of type and name attributes (for radio/checkbox)
    if (element.type && element.name && (element.type === 'radio' || element.type === 'checkbox')) {
      return `input[type="${element.type}"][name="${element.name}"][value="${element.value}"]`;
    }

    // Check data attributes
    const dataAttrs = ['data-id', 'data-name', 'data-field'];
    for (const attr of dataAttrs) {
      if (element.hasAttribute(attr)) {
        return `[${attr}="${element.getAttribute(attr)}"]`;
      }
    }

    // Fallback: Generate concise path
    const path = [];
    let currentElement = element;

    while (currentElement && currentElement.nodeType === Node.ELEMENT_NODE && path.length < 3) {
      let selector = currentElement.nodeName.toLowerCase();

      // Exclude SmartForm dynamic classes
      if (currentElement.className) {
        const classes = currentElement.className.split(' ')
          .filter(c => c.trim() && !c.startsWith('smartform-'))
          .slice(0, 2);

        if (classes.length > 0) {
          selector += '.' + classes.join('.');
        }
      }

      // Use nth-child to maintain uniqueness
      const parent = currentElement.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(child =>
          child.nodeName.toLowerCase() === currentElement.nodeName.toLowerCase()
        );
        if (siblings.length > 1) {
          const index = siblings.indexOf(currentElement) + 1;
          selector += `:nth-child(${index})`;
        }
      }

      path.unshift(selector);
      currentElement = currentElement.parentElement;

      // Stop when reaching form or body
      if (currentElement && (currentElement.tagName === 'FORM' || currentElement.tagName === 'BODY')) {
        break;
      }
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
          error: 'No matching profile found for this page'
        };
      }

      const profile = profiles[0];

      for (const form of this.forms) {
        for (const field of form.fields) {
          const savedField = this.findMatchingField(field, profile.values);
          if (savedField !== null) {
            const filled = await this.fillField(field, savedField.value, savedField);
            if (filled) filledCount++;
          }
        }
      }

      this.showNotification('success', `Filled ${filledCount} field${filledCount !== 1 ? 's' : ''}`);

      return {
        success: true,
        filledCount: filledCount
      };
    } catch (error) {
      console.error('Error filling forms:', error);
      this.showNotification('error', 'Error occurred while filling forms');
      return {
        success: false,
        error: error.message
      };
    }
  }

  findMatchingField(field, savedValues) {
    for (const saved of savedValues) {
      // Exact ID match (most reliable)
      if (saved.id === field.id && saved.id) {
        console.log(`🔍 Found ID match: ${field.id} => ${saved.value}`);
        return saved;
      }

      // For radio buttons, match by name AND value
      if (field.type === 'radio' && saved.type === 'radio') {
        if (saved.name === field.name && saved.inputValue === field.inputValue) {
          console.log(`🔘 Found radio match: name="${field.name}", value="${field.inputValue}" => ${saved.value}`);
          return saved;
        }
      }

      // Regular name match (for non-radio elements)
      if (saved.name === field.name && saved.name && field.type !== 'radio') {
        console.log(`📝 Found name match: ${field.name} => ${saved.value}`);
        return saved;
      }

      // Label match
      if (saved.label === field.label && saved.label) {
        console.log(`🏷️ Found label match: "${field.label}" => ${saved.value}`);
        return saved;
      }

      // Similarity match
      if (this.isSimilarField(field, saved)) {
        console.log(`🔄 Found similarity match: "${field.label}" ≈ "${saved.label}" => ${saved.value}`);
        return saved;
      }
    }

    console.log(`❌ No match found for field: ${field.type} - ${field.id || field.name || field.label}`);
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

  async fillField(field, value, savedField = null) {
    try {
      console.log(`🎯 Filling field: ${field.type} - ${field.selector} = ${JSON.stringify(value)}`);
      let element = document.querySelector(field.selector);

      // Fallback when element not found by selector
      if (!element) {
        console.warn(`⚠️ Primary selector failed: ${field.selector}`);

        // Retry with ID
        if (field.id) {
          element = document.getElementById(field.id);
          console.log(`🔄 Trying ID selector: #${field.id} => ${element ? 'found' : 'not found'}`);
        }

        // Retry with name
        if (!element && field.name) {
          if (field.type === 'radio' || field.type === 'checkbox') {
            element = document.querySelector(`input[type="${field.type}"][name="${field.name}"][value="${field.inputValue || field.value}"]`);
            console.log(`🔄 Trying name+value selector: input[type="${field.type}"][name="${field.name}"][value="${field.inputValue || field.value}"] => ${element ? 'found' : 'not found'}`);
          } else {
            element = document.querySelector(`[name="${field.name}"]`);
            console.log(`🔄 Trying name selector: [name="${field.name}"] => ${element ? 'found' : 'not found'}`);
          }
        }

        if (!element) {
          console.error(`❌ Element not found with any selector for field: ${field.type} - ${field.label || field.name || field.id}`);
          return false;
        } else {
          console.log(`✅ Found element using fallback selector`);
        }
      }

      element.classList.add('smartform-filled');

      if (element.tagName === 'SELECT') {
        // SELECT element processing
        console.log(`  📝 Filling SELECT: currentIndex=${element.selectedIndex}, targetValue="${value}"`);
        if (savedField) {
          console.log(`  📝 Saved field data: selectedIndex=${savedField.selectedIndex}, value="${savedField.value}"`);
        }

        // First try setting by value
        element.value = value;

        // If value setting failed, use saved index
        if (element.value !== value && savedField && savedField.selectedIndex !== undefined && savedField.selectedIndex >= 0) {
          console.log(`  📝 Value setting failed, using savedIndex: ${savedField.selectedIndex}`);
          element.selectedIndex = savedField.selectedIndex;
        }

        element.dispatchEvent(new Event('change', { bubbles: true }));
        console.log(`  ✅ SELECT filled: index=${element.selectedIndex}, value="${element.value}"`);

      } else if (element.type === 'checkbox') {
        // Checkbox element processing
        const targetChecked = value === true || value === 'true';
        console.log(`  ☑️ Filling CHECKBOX: current=${element.checked}, target=${targetChecked}`);
        element.checked = targetChecked;
        element.dispatchEvent(new Event('change', { bubbles: true }));
        console.log(`  ✅ CHECKBOX filled: checked=${element.checked}`);

      } else if (element.type === 'radio') {
        // Radio element processing
        const radioGroup = savedField ? savedField.radioGroup : field.radioGroup;
        const inputValue = savedField ? savedField.inputValue : field.inputValue;

        console.log(`  🔘 Filling RADIO: group="${radioGroup}", inputValue="${inputValue}", shouldCheck=${value}`);

        if (radioGroup && inputValue) {
          // Select radio with specified value in group and clear others
          const radioElements = document.querySelectorAll(`input[type="radio"][name="${radioGroup}"]`);
          console.log(`  🔘 Found ${radioElements.length} radio elements in group "${radioGroup}"`);

          let foundTarget = false;
          let targetElement = null;

          radioElements.forEach(radio => {
            const shouldCheck = radio.value === inputValue && value === true;
            radio.checked = shouldCheck;
            if (shouldCheck) {
              foundTarget = true;
              targetElement = radio;
              console.log(`  🔘 Selected radio: value="${radio.value}"`);
            }
          });

          if (!foundTarget && value === true) {
            console.warn(`  ⚠️ Target radio value "${inputValue}" not found in group "${radioGroup}"`);
          }

          // Trigger events
          if (targetElement) {
            targetElement.dispatchEvent(new Event('change', { bubbles: true }));
          } else {
            element.dispatchEvent(new Event('change', { bubbles: true }));
          }
        } else {
          console.log(`  🔘 Setting single radio: checked=${value === true || value === 'true'}`);
          element.checked = value === true || value === 'true';
          element.dispatchEvent(new Event('change', { bubbles: true }));
        }

        console.log(`  ✅ RADIO filled: checked=${element.checked}`);

      } else {
        // Text-type element processing
        console.log(`  📄 Filling TEXT: current="${element.value}", target="${value}"`);
        element.focus();
        element.value = value;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.blur();
        console.log(`  ✅ TEXT filled: value="${element.value}"`);
      }

      setTimeout(() => {
        element.classList.remove('smartform-filled');
      }, 2000);

      return true;
    } catch (error) {
      console.error(`❌ Error filling field ${field.selector}:`, error);
      return false;
    }
  }

  async getCurrentValues() {
    try {
      console.log('💾 Starting getCurrentValues...');
      const values = [];

      this.forms.forEach((form, formIndex) => {
        console.log(`📋 Processing form ${formIndex + 1}/${this.forms.length} with ${form.fields.length} fields`);

        form.fields.forEach((field, fieldIndex) => {
          try {
            console.log(`  🔍 Field ${fieldIndex + 1}: ${field.type} - ${field.selector}`);
            const element = document.querySelector(field.selector);

            if (element) {
              let value = '';
              let additionalData = {};
              let shouldSave = false;

              if (element.tagName === 'SELECT') {
                value = element.value;
                additionalData.selectedIndex = element.selectedIndex;
                additionalData.selectedText = element.options[element.selectedIndex]?.text || '';
                shouldSave = true;
                console.log(`    📝 SELECT: value="${value}", index=${element.selectedIndex}, text="${additionalData.selectedText}"`);

              } else if (element.type === 'checkbox') {
                value = element.checked;
                additionalData.inputValue = element.value;
                shouldSave = true;
                console.log(`    ☑️ CHECKBOX: checked=${value}, inputValue="${element.value}"`);

              } else if (element.type === 'radio') {
                value = element.checked;
                additionalData.inputValue = element.value;
                additionalData.radioGroup = element.name;
                shouldSave = true;
                console.log(`    🔘 RADIO: checked=${value}, inputValue="${element.value}", group="${element.name}"`);

              } else {
                value = element.value;
                shouldSave = value !== '' && value !== null && value !== undefined;
                console.log(`    📄 TEXT: value="${value}", shouldSave=${shouldSave}`);
              }

              if (shouldSave) {
                const savedField = {
                  ...field,
                  value: value,
                  ...additionalData
                };
                values.push(savedField);
                console.log(`    ✅ SAVED: ${field.type} - "${field.label || field.name || field.id}" = ${JSON.stringify(value)}`);
              } else {
                console.log(`    ⚠️ SKIPPED: ${field.type} - empty value`);
              }
            } else {
              console.warn(`    ❌ ELEMENT NOT FOUND: ${field.selector}`);
            }
          } catch (error) {
            console.warn(`    ❌ ERROR processing field:`, error);
          }
        });
      });

      console.log(`💾 getCurrentValues completed: ${values.length} values saved`);
      console.log('📊 Saved values summary:', values.map(v => `${v.type}:${v.value}`));

      return {
        success: true,
        values: values
      };
    } catch (error) {
      console.error('❌ Error getting current values:', error);
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
}

// Initialize SmartForm instance
function initializeSmartForm() {
  try {
    if (!window.smartFormInstance) {
      console.log('Initializing SmartForm content script...');
      window.smartFormInstance = new SmartFormContent();
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

} // End of protection block