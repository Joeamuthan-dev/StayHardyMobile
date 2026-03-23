import sharp from 'sharp';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const androidSrc = join(root, 'resources/ANDRIOD.svg');
const iosSrc = join(root, 'resources/IOS.svg');
const androidRes = join(root, 'android/app/src/main/res');

/** Adaptive icon foreground (dp × density). */
const foreground = {
  'mipmap-mdpi': 108,
  'mipmap-hdpi': 162,
  'mipmap-xhdpi': 216,
  'mipmap-xxhdpi': 324,
  'mipmap-xxxhdpi': 432,
};

/** Legacy launcher icons. */
const legacy = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

async function main() {
  for (const [folder, size] of Object.entries(foreground)) {
    const out = join(androidRes, folder, 'ic_launcher_foreground.png');
    await sharp(androidSrc)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(out);
    console.log(out);
  }

  for (const [folder, size] of Object.entries(legacy)) {
    for (const name of ['ic_launcher.png', 'ic_launcher_round.png']) {
      const out = join(androidRes, folder, name);
      await sharp(androidSrc)
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(out);
      console.log(out);
    }
  }

  const iosOut = join(
    root,
    'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'
  );
  await sharp(iosSrc)
    .resize(1024, 1024, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .flatten({ background: '#ffffff' })
    .png()
    .toFile(iosOut);
  console.log(iosOut);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
