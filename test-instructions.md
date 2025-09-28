# SmartForm SELECT/Radio Test Procedure

## Test Purpose
Verify that SELECT elements and radio button scanning, saving, and restoration functions work correctly.

## Prerequisites
1. Chrome extension "SmartForm" must be loaded
2. Open `test-form.html` in browser
3. Open Developer Tools (F12) and go to Console tab

## Test Procedure

### Method 1: Using Automated Test Script
1. Copy & paste the contents of `test-script.js` into Console
2. Execute `SmartFormTest.runTest()`
3. Follow instructions to operate the SmartForm extension

### Method 2: Manual Testing
1. **Fill form with values**
   - Username: `testuser`
   - Email: `test@example.com`
   - Country: Select `United States`
   - Job: Select `Engineering`
   - Employment Type: Select `Full-time`
   - Work Location: Select `Remote`
   - Technologies: Check `JavaScript`, `React`, `Node.js`
   - Check other checkboxes as well

2. **Scan with SmartForm extension**
   - Open extension popup
   - Click "Scan Forms"
   - Check Console output (verify SELECT/radio elements are detected correctly)

3. **Save values**
   - Click "Save Current Values"
   - Check Console output (verify SELECT/radio element values are saved correctly)

4. **Clear form**
   - Click Reset button to clear form

5. **Restore with auto-fill**
   - Click "Auto Fill"
   - Verify all values are restored correctly

## Check Points

### Items to verify in Console output
1. **During scan**
   ```
   📝 SELECT: value="us", index=1, text="United States"
   🔘 RADIO: checked=true, inputValue="fulltime", group="employment"
   ☑️ CHECKBOX: checked=true, inputValue="javascript"
   ```

2. **During save**
   ```
   ✅ SAVED: select - "Country" = "us"
   ✅ SAVED: radio - "Employment Type" = true
   ✅ SAVED: checkbox - "JavaScript" = true
   ```

3. **During restore**
   ```
   🎯 Filling field: select - #country = "us"
   🎯 Filling field: radio - input[name="employment"][value="fulltime"] = true
   🎯 Filling field: checkbox - #skill1 = true
   ```

### Items to verify on screen
- SELECT boxes are set to correct values
- Radio buttons are selected correctly (only one per group)
- Checkboxes are in correct state
- Text fields are also filled correctly

## Troubleshooting

### Common Issues
1. **"Cannot save select boxes and radio buttons"**
   - Check if SELECT/radio elements are detected during scan in Console output
   - Verify extractFieldData function's visibility check is working correctly

2. **"Values not set during restore"**
   - Check if findMatchingValue function performs matching correctly
   - Verify fillField function performs appropriate DOM operations

3. **"Radio buttons don't work correctly in groups"**
   - Check if radioGroup and inputValue are saved correctly
   - Verify other radio buttons in group are cleared during restore

## Expected Results
- All form elements (text, SELECT, radio, checkbox) are scanned correctly
- All values are saved appropriately during save
- All values are restored accurately to original state during restore
- Clear logs are displayed in Console output, allowing verification of processing status at each stage