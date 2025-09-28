// Debug script for selector diagnostics
// Check if saved selectors are valid on the current page

async function testSelectors() {
  try {
    const result = await chrome.storage.local.get(['formProfiles']);
    const profiles = result.formProfiles || [];

    console.log('🔍 Testing Saved Selectors:');

    profiles.forEach((profile, profileIndex) => {
      console.log(`\n📋 Profile ${profileIndex + 1}: ${profile.domain}${profile.path}`);

      if (profile.values && profile.values.length > 0) {
        let validCount = 0;
        let invalidCount = 0;

        profile.values.forEach((field, fieldIndex) => {
          const element = document.querySelector(field.selector);
          const isValid = !!element;

          if (isValid) {
            validCount++;
            console.log(`  ✅ ${fieldIndex + 1}. ${field.type} - ${field.selector}`);
          } else {
            invalidCount++;
            console.log(`  ❌ ${fieldIndex + 1}. ${field.type} - ${field.selector}`);

            // Try alternative selectors
            let alternatives = [];

            if (field.id) {
              const byId = document.getElementById(field.id);
              alternatives.push({ method: 'ID', selector: `#${field.id}`, found: !!byId });
            }

            if (field.name) {
              if (field.type === 'radio' || field.type === 'checkbox') {
                const byName = document.querySelector(`input[type="${field.type}"][name="${field.name}"][value="${field.inputValue || field.value}"]`);
                alternatives.push({
                  method: 'Name+Value',
                  selector: `input[type="${field.type}"][name="${field.name}"][value="${field.inputValue || field.value}"]`,
                  found: !!byName
                });
              } else {
                const byName = document.querySelector(`[name="${field.name}"]`);
                alternatives.push({ method: 'Name', selector: `[name="${field.name}"]`, found: !!byName });
              }
            }

            if (alternatives.length > 0) {
              console.log(`    🔄 Alternatives:`);
              alternatives.forEach(alt => {
                console.log(`      ${alt.found ? '✅' : '❌'} ${alt.method}: ${alt.selector}`);
              });
            }
          }
        });

        console.log(`  📊 Summary: ${validCount} valid, ${invalidCount} invalid selectors`);
      }
    });

    return { profiles: profiles.length, tested: true };
  } catch (error) {
    console.error('❌ Error testing selectors:', error);
    return { error: error.message };
  }
}

async function generateBetterSelectors() {
  console.log('🔧 Generating Better Selectors for Current Page:');

  const inputs = document.querySelectorAll('input, textarea, select');
  const suggestions = [];

  inputs.forEach((input, index) => {
    const current = {
      element: input,
      type: input.type || input.tagName.toLowerCase(),
      id: input.id,
      name: input.name,
      value: input.value
    };

    // Generate better selector candidates
    const selectors = [];

    if (input.id) {
      selectors.push({ priority: 1, selector: `#${input.id}`, method: 'ID' });
    }

    if (input.name) {
      if (input.type === 'radio' || input.type === 'checkbox') {
        selectors.push({
          priority: 2,
          selector: `input[type="${input.type}"][name="${input.name}"][value="${input.value}"]`,
          method: 'Type+Name+Value'
        });
      } else {
        selectors.push({ priority: 2, selector: `[name="${input.name}"]`, method: 'Name' });
      }
    }

    // Check data attributes
    ['data-id', 'data-name', 'data-field'].forEach(attr => {
      if (input.hasAttribute(attr)) {
        selectors.push({
          priority: 3,
          selector: `[${attr}="${input.getAttribute(attr)}"]`,
          method: 'Data Attribute'
        });
      }
    });

    if (selectors.length > 0) {
      selectors.sort((a, b) => a.priority - b.priority);
      const best = selectors[0];

      suggestions.push({
        index: index + 1,
        type: current.type,
        id: current.id || 'none',
        name: current.name || 'none',
        recommendedSelector: best.selector,
        method: best.method,
        alternatives: selectors.slice(1)
      });

      console.log(`${index + 1}. ${current.type} (${current.id || current.name || 'no-id'})`);
      console.log(`   🎯 Recommended: ${best.selector} (${best.method})`);
      if (selectors.length > 1) {
        console.log(`   🔄 Alternatives: ${selectors.slice(1).map(s => s.selector).join(', ')}`);
      }
    }
  });

  return suggestions;
}

function validateSpecificSelector(selector) {
  try {
    const element = document.querySelector(selector);
    console.log(`🔍 Testing selector: ${selector}`);
    console.log(`   Result: ${element ? '✅ Found' : '❌ Not found'}`);
    if (element) {
      console.log(`   Element:`, element);
      console.log(`   Tag: ${element.tagName}, Type: ${element.type || 'none'}, ID: ${element.id || 'none'}, Name: ${element.name || 'none'}`);
    }
    return !!element;
  } catch (error) {
    console.log(`❌ Invalid selector: ${selector}`);
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

// Display usage instructions
console.log('🔧 SmartForm Selector Debug Tools:');
console.log('  testSelectors() - Test saved selectors');
console.log('  generateBetterSelectors() - Generate better selector candidates');
console.log('  validateSpecificSelector("selector") - Test specific selector');

// Auto-execute
testSelectors();