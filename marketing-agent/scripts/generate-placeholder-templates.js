const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const WIDTH = 1080;
const HEIGHT = 1080;

const TEMPLATES = [
  { app: 'ocass', label: 'Ocass', color: '#0b6e4f' },
  { app: 'intercity', label: 'Intercity Travel', color: '#1d4e89' }
];

async function generate({ app, label, color }) {
  const dir = path.join(__dirname, '..', 'assets', 'templates', app);
  fs.mkdirSync(dir, { recursive: true });

  const svg = `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${WIDTH}" height="${HEIGHT}" fill="${color}" />
      <text x="50%" y="50%" font-family="sans-serif" font-size="72" font-weight="bold"
            fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${label}</text>
    </svg>
  `;

  const outputFile = path.join(dir, 'background.png');
  await sharp(Buffer.from(svg)).png().toFile(outputFile);
  console.log(`Wrote ${outputFile}`);
}

async function main() {
  for (const template of TEMPLATES) {
    await generate(template);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
