// Debug script for storage inspection
// Run in browser console to check stored profiles

async function showStoredProfiles() {
  try {
    const result = await chrome.storage.local.get(['formProfiles']);
    const profiles = result.formProfiles || [];

    console.log('🗄️ Stored Form Profiles:');
    console.log(`📊 Total profiles: ${profiles.length}`);

    profiles.forEach((profile, index) => {
      console.log(`\n📋 Profile ${index + 1}:`);
      console.log(`  ID: ${profile.id}`);
      console.log(`  Domain: ${profile.domain}`);
      console.log(`  Path: ${profile.path}`);
      console.log(`  Created: ${profile.createdAt}`);
      console.log(`  Updated: ${profile.updatedAt}`);
      console.log(`  Values count: ${profile.values?.length || 0}`);

      if (profile.values && profile.values.length > 0) {
        console.log('  📝 Values:');
        profile.values.forEach((value, vIndex) => {
          console.log(`    ${vIndex + 1}. ${value.type} - ${value.label || value.name || value.id} = ${JSON.stringify(value.value)}`);
        });
      }
    });

    return profiles;
  } catch (error) {
    console.error('❌ Error reading storage:', error);
    return [];
  }
}

async function clearAllProfiles() {
  try {
    await chrome.storage.local.set({ formProfiles: [] });
    console.log('🗑️ All profiles cleared');
  } catch (error) {
    console.error('❌ Error clearing profiles:', error);
  }
}

async function exportProfiles() {
  try {
    const profiles = await showStoredProfiles();
    const json = JSON.stringify(profiles, null, 2);
    console.log('📤 Export data (copy this):');
    console.log(json);
    return json;
  } catch (error) {
    console.error('❌ Error exporting profiles:', error);
  }
}

// Display usage instructions
console.log('🔧 SmartForm Debug Tools:');
console.log('  showStoredProfiles() - Display stored profiles');
console.log('  clearAllProfiles() - Delete all profiles');
console.log('  exportProfiles() - Export profiles in JSON format');

// Automatically display current state
showStoredProfiles();