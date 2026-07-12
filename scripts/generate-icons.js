// Generate PWA icon sizes from the source logo
import { sharp } from 'sharp'

const sizes = [192, 512, 180] // 192 & 512 for PWA, 180 for Apple touch icon

async function main() {
  for (const size of sizes) {
    await sharp('public/logo.png')
      .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toFile(`public/icon-${size}.png`)
    console.log(`Generated public/icon-${size}.png`)
  }
  // Apple touch icon (180x180, no transparency)
  await sharp('public/logo.png')
    .resize(180, 180, { fit: 'cover', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: '#ffffff' })
    .png()
    .toFile('public/apple-touch-icon.png')
  console.log('Generated public/apple-touch-icon.png')

  // Favicon 32x32
  await sharp('public/logo.png')
    .resize(32, 32, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile('public/favicon-32.png')
  console.log('Generated public/favicon-32.png')
}

main().catch(console.error)
