// Launcher assets use the institute's original crest, with Android mask-safe spacing.
const fs = require('fs');
const path = require('path');
const { generateImageAsync, generateImageBackgroundAsync, compositeImagesAsync } = require('@expo/image-utils');
const projectRoot = path.resolve(__dirname, '..');
async function launcher(name, size, backgroundColor) {
  const { source } = await generateImageAsync({ projectRoot }, { src: path.join(projectRoot, 'assets/logo.png'), width: size, height: size, resizeMode: 'contain', backgroundColor: '#00000000' });
  const background = await generateImageBackgroundAsync({ width: 1024, height: 1024, resizeMode: 'contain', backgroundColor });
  const image = await compositeImagesAsync({ foreground: source, background, x: (1024 - size) / 2, y: (1024 - size) / 2 });
  fs.writeFileSync(path.join(projectRoot, 'assets', name), image);
}
(async () => {
  await launcher('icon.png', 880, '#FFFFFF');
  // The full crest (including the ribbon) stays within Android's 66/108 circular safe zone.
  await launcher('adaptive-icon.png', 520, '#00000000');
  // Keep the original transparent crest over the white native splash background.
  fs.copyFileSync(path.join(projectRoot, 'assets/logo.png'), path.join(projectRoot, 'assets/splash-icon.png'));
  console.log('Generated launcher, adaptive foreground, and native splash assets.');
})().catch(error => { console.error(error); process.exitCode = 1; });
