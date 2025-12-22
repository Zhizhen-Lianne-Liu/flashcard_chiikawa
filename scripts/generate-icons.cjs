const iconBuilder = require('electron-icon-builder');

iconBuilder({
  input: './build/icon.svg',
  output: './build',
  flatten: true
}).then(() => {
  console.log('✅ Icons generated successfully!');
  console.log('Generated files:');
  console.log('  - build/icon.icns (macOS)');
  console.log('  - build/icon.ico (Windows)');
  console.log('  - build/icons/ (Linux icon set)');
}).catch(error => {
  console.error('Failed to generate icons:', error);
  process.exit(1);
});
