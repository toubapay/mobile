require('dotenv').config();

const path = require('path');

module.exports = {
  port: process.env.PORT || 4100,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  defaultLanguage: process.env.DEFAULT_LANGUAGE || 'fr',
  apps: {
    ocass: {
      displayName: 'Ocass',
      backgroundPath: path.join(__dirname, '..', 'assets', 'templates', 'ocass', 'background.png')
    },
    intercity: {
      displayName: 'Intercity Travel',
      backgroundPath: path.join(__dirname, '..', 'assets', 'templates', 'intercity', 'background.png')
    }
  }
};
