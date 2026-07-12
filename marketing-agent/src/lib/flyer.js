const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const config = require('../config');
const { DATA_DIR } = require('./store');

const FLYERS_DIR = path.join(DATA_DIR, 'flyers');

function ensureFlyersDir() {
  if (!fs.existsSync(FLYERS_DIR)) fs.mkdirSync(FLYERS_DIR, { recursive: true });
}

// Rough char-count word wrap. Good enough for short flyer headlines/subtext;
// doesn't measure actual glyph widths, so very wide fonts may overflow.
function wrapText(text, maxCharsPerLine) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Lays out lines as a vertical stack starting at `startY`, returns each
// line's text baseline plus the cursor position after the last line (usable
// as the next block's startY). Ascent is approximated as 0.8*fontSize,
// which leaves ~0.6*fontSize of the line box below the baseline for
// descenders - comfortably more than real descenders need.
function layoutLines({ startY, lines, fontSize, lineHeightFactor }) {
  const lineHeight = fontSize * lineHeightFactor;
  const ascent = fontSize * 0.8;
  let cursor = startY;
  const positioned = lines.map((line) => {
    const baseline = cursor + ascent;
    cursor += lineHeight;
    return { line, baseline };
  });
  return { positioned, endY: cursor };
}

function buildOverlaySvg({ width, height, headline, subtext }) {
  const headlineSize = Math.round(width * 0.07);
  const subtextSize = Math.round(width * 0.035);
  const headlineLines = wrapText(headline, 22);
  const subtextLines = wrapText(subtext, 40);

  const topPadding = 40;
  const bottomPadding = 50;
  const blockGap = 20;

  // Compute layout relative to 0 first (band height/position depend on this
  // content height, so we can't know bandY until after we know how tall the
  // text block is).
  const headlineLayout = layoutLines({ startY: 0, lines: headlineLines, fontSize: headlineSize, lineHeightFactor: 1.3 });
  const subtextLayout = layoutLines({
    startY: headlineLayout.endY + blockGap,
    lines: subtextLines,
    fontSize: subtextSize,
    lineHeightFactor: 1.4
  });

  const contentHeight = subtextLayout.endY;
  const bandHeight = topPadding + contentHeight + bottomPadding;
  const bandY = Math.max(0, height - bandHeight);

  const headlineTspans = headlineLayout.positioned
    .map(({ line, baseline }) => `<tspan x="40" y="${Math.round(bandY + topPadding + baseline)}">${escapeXml(line)}</tspan>`)
    .join('');

  const subtextTspans = subtextLayout.positioned
    .map(({ line, baseline }) => `<tspan x="40" y="${Math.round(bandY + topPadding + baseline)}">${escapeXml(line)}</tspan>`)
    .join('');

  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="${bandY}" width="${width}" height="${bandHeight}" fill="rgba(0,0,0,0.55)" />
      <text font-family="sans-serif" font-weight="bold" font-size="${headlineSize}" fill="#ffffff">
        ${headlineTspans}
      </text>
      <text font-family="sans-serif" font-size="${subtextSize}" fill="#f0f0f0">
        ${subtextTspans}
      </text>
    </svg>
  `;
}

async function renderFlyer({ app, campaignId, headline, subtext }) {
  const appConfig = config.apps[app];
  if (!appConfig) throw new Error(`Unknown app "${app}"`);

  const background = sharp(appConfig.backgroundPath);
  const metadata = await background.metadata();
  const { width, height } = metadata;

  const svg = buildOverlaySvg({ width, height, headline, subtext });

  ensureFlyersDir();
  const outputFile = path.join(FLYERS_DIR, `${campaignId}.png`);

  await background
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png()
    .toFile(outputFile);

  return { filePath: outputFile, publicPath: `/flyers/${campaignId}.png` };
}

module.exports = { renderFlyer, FLYERS_DIR };
