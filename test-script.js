// SmartForm Test Script
// Run this script in the browser console with test-form.html open for testing

console.log('🧪 SmartForm Test Script Starting...');

// Test data to fill into the form
const testData = {
  // Text fields
  username: 'testuser',
  email: 'test@example.com',
  password: 'testpassword123',
  age: '30',
  bio: 'This is a test bio description.',

  // Select boxes
  country: 'japan',
  job: 'engineer',

  // Radio buttons
  gender: 'male',
  experience: '3-5',

  // Checkboxes
  technologies: ['javascript', 'react', 'nodejs'],
  newsletter: true,
  terms: true
};

// Fill form with test data
function fillTestData() {
  console.log('📝 Filling form with test data...');

  // Text fields
  document.getElementById('username').value = testData.username;
  document.getElementById('email').value = testData.email;
  document.getElementById('password').value = testData.password;
  document.getElementById('age').value = testData.age;
  document.getElementById('bio').value = testData.bio;

  // Select boxes
  document.getElementById('country').value = testData.country;
  document.getElementById('job').value = testData.job;

  // Radio buttons
  document.querySelector(`input[name="gender"][value="${testData.gender}"]`).checked = true;
  document.querySelector(`input[name="experience"][value="${testData.experience}"]`).checked = true;

  // Checkboxes - technologies
  testData.technologies.forEach(tech => {
    const checkbox = document.querySelector(`input[name="technologies"][value="${tech}"]`);
    if (checkbox) checkbox.checked = true;
  });

  // Other checkboxes
  document.getElementById('newsletter').checked = testData.newsletter;
  document.getElementById('terms').checked = testData.terms;

  console.log('✅ Test data filled successfully');
}

// Clear all form data
function clearForm() {
  console.log('🧹 Clearing form...');
  document.getElementById('testForm').reset();
  console.log('✅ Form cleared');
}

// Verify form data matches test data
function verifyFormData() {
  console.log('🔍 Verifying form data...');
  let allMatch = true;

  // Check text fields
  const checks = [
    { field: 'username', expected: testData.username },
    { field: 'email', expected: testData.email },
    { field: 'password', expected: testData.password },
    { field: 'age', expected: testData.age },
    { field: 'bio', expected: testData.bio },
    { field: 'country', expected: testData.country },
    { field: 'job', expected: testData.job }
  ];

  checks.forEach(check => {
    const element = document.getElementById(check.field);
    const actual = element.value;
    const match = actual === check.expected;
    allMatch = allMatch && match;
    console.log(`${match ? '✅' : '❌'} ${check.field}: expected="${check.expected}", actual="${actual}"`);
  });

  // Check radio buttons
  const genderChecked = document.querySelector('input[name="gender"]:checked');
  const genderMatch = genderChecked && genderChecked.value === testData.gender;
  allMatch = allMatch && genderMatch;
  console.log(`${genderMatch ? '✅' : '❌'} gender: expected="${testData.gender}", actual="${genderChecked ? genderChecked.value : 'none'}"`);

  const expChecked = document.querySelector('input[name="experience"]:checked');
  const expMatch = expChecked && expChecked.value === testData.experience;
  allMatch = allMatch && expMatch;
  console.log(`${expMatch ? '✅' : '❌'} experience: expected="${testData.experience}", actual="${expChecked ? expChecked.value : 'none'}"`);

  // Check checkboxes
  const checkedTechs = Array.from(document.querySelectorAll('input[name="technologies"]:checked')).map(cb => cb.value);
  const techMatch = testData.technologies.every(tech => checkedTechs.includes(tech)) &&
                   checkedTechs.every(tech => testData.technologies.includes(tech));
  allMatch = allMatch && techMatch;
  console.log(`${techMatch ? '✅' : '❌'} technologies: expected=[${testData.technologies.join(',')}], actual=[${checkedTechs.join(',')}]`);

  const newsletterMatch = document.getElementById('newsletter').checked === testData.newsletter;
  allMatch = allMatch && newsletterMatch;
  console.log(`${newsletterMatch ? '✅' : '❌'} newsletter: expected=${testData.newsletter}, actual=${document.getElementById('newsletter').checked}`);

  const termsMatch = document.getElementById('terms').checked === testData.terms;
  allMatch = allMatch && termsMatch;
  console.log(`${termsMatch ? '✅' : '❌'} terms: expected=${testData.terms}, actual=${document.getElementById('terms').checked}`);

  console.log(`\n${allMatch ? '🎉' : '💥'} Overall verification: ${allMatch ? 'PASSED' : 'FAILED'}`);
  return allMatch;
}

// Test procedure
async function runTest() {
  console.log('\n🧪 Starting SmartForm Test Procedure...');
  console.log('Step 1: Fill form with test data');
  fillTestData();

  console.log('\nStep 2: Use SmartForm extension to scan forms');
  console.log('👆 Please click "Scan Forms" in the SmartForm popup');
  console.log('   Check console for scan results');

  await new Promise(resolve => {
    console.log('\nStep 3: Save current values');
    console.log('👆 Please click "Save Current Values" in the SmartForm popup');
    console.log('   Press Enter in console to continue after saving...');

    const listener = (e) => {
      if (e.key === 'Enter') {
        document.removeEventListener('keydown', listener);
        resolve();
      }
    };
    document.addEventListener('keydown', listener);
  });

  console.log('\nStep 4: Clear the form');
  clearForm();

  console.log('\nStep 5: Use SmartForm to auto-fill');
  console.log('👆 Please click "Auto Fill" in the SmartForm popup');

  await new Promise(resolve => {
    console.log('\nStep 6: Verify restoration');
    console.log('   Press Enter in console to verify after auto-fill...');

    const listener = (e) => {
      if (e.key === 'Enter') {
        document.removeEventListener('keydown', listener);
        resolve();
      }
    };
    document.addEventListener('keydown', listener);
  });

  console.log('\nStep 7: Verifying form data...');
  const passed = verifyFormData();

  console.log(`\n🏁 Test ${passed ? 'COMPLETED SUCCESSFULLY' : 'FAILED'}`);
  return passed;
}

// Export functions for manual use
window.SmartFormTest = {
  fillTestData,
  clearForm,
  verifyFormData,
  runTest,
  testData
};

console.log('✅ SmartForm Test Script Loaded');
console.log('📋 Available functions:');
console.log('  - SmartFormTest.fillTestData() - Fill form with test data');
console.log('  - SmartFormTest.clearForm() - Clear all form data');
console.log('  - SmartFormTest.verifyFormData() - Verify form matches test data');
console.log('  - SmartFormTest.runTest() - Run full test procedure');
console.log('\n🚀 Run SmartFormTest.runTest() to start the test procedure');