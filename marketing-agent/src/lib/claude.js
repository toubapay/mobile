const Anthropic = require('@anthropic-ai/sdk');
const config = require('../config');

const client = new Anthropic({ apiKey: config.anthropicApiKey });
const MODEL = 'claude-sonnet-5';

const PLATFORM_GUIDELINES = {
  instagram: "caption punchy et courte (150-300 caracteres), emojis bienvenus, se termine par un appel a l'action",
  facebook: "ton plus descriptif, 2-4 phrases pour expliquer l'offre, appel a l'action clair",
  whatsapp: 'texte tres court style statut/broadcast (max 200 caracteres), direct, emojis, pas de hashtags',
  tiktok: "accroche (hook) des la premiere phrase, ton energique et familier, tres court (max 150 caracteres)"
};

const COPY_TOOL = {
  name: 'submit_campaign_copy',
  description: 'Enregistre le contenu marketing genere pour une campagne (flyer + legendes par plateforme).',
  input_schema: {
    type: 'object',
    properties: {
      flyer: {
        type: 'object',
        properties: {
          headline: { type: 'string', description: 'Titre du flyer, 8 mots maximum' },
          subtext: { type: 'string', description: 'Sous-titre du flyer, 20 mots maximum' }
        },
        required: ['headline', 'subtext']
      },
      platforms: {
        type: 'object',
        description: 'Une entree par plateforme demandee, cle = nom de la plateforme',
        additionalProperties: {
          type: 'object',
          properties: {
            captions: {
              type: 'array',
              items: { type: 'string' },
              minItems: 3,
              maxItems: 3
            },
            hashtags: {
              type: 'array',
              items: { type: 'string' },
              minItems: 5,
              maxItems: 8
            }
          },
          required: ['captions', 'hashtags']
        }
      }
    },
    required: ['flyer', 'platforms']
  }
};

function buildCopyPrompt({ appName, goal, keyMessage, offer, targetAudience, platforms, language }) {
  const platformList = platforms
    .map((p) => `- ${p}: ${PLATFORM_GUIDELINES[p] || "ton adapte a la plateforme"}`)
    .join('\n');

  return `Tu es copywriter marketing pour "${appName}", une application ouest-africaine (marche Senegal/Afrique de l'Ouest).
Langue de sortie: ${language === 'fr' ? 'francais' : language}.

Brief de campagne:
- Objectif: ${goal}
- Message cle: ${keyMessage}
- Offre: ${offer || 'aucune offre specifique'}
- Audience cible: ${targetAudience}
- Plateformes: ${platforms.join(', ')}

Consignes par plateforme:
${platformList}

Utilise l'outil submit_campaign_copy pour renvoyer un titre + sous-titre de flyer, et pour chaque plateforme demandee exactement 3 variantes de legende et 5 a 8 hashtags pertinents (sans le symbole #).`;
}

async function generateCampaignCopy(brief) {
  const prompt = buildCopyPrompt(brief);

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1800,
    temperature: 0.9,
    tools: [COPY_TOOL],
    tool_choice: { type: 'tool', name: COPY_TOOL.name },
    messages: [{ role: 'user', content: prompt }]
  });

  const toolUse = response.content.find((block) => block.type === 'tool_use');
  if (!toolUse) throw new Error('Claude did not return the expected tool call');

  return toolUse.input;
}

async function generateVideoScript({ appName, goal, keyMessage, offer, targetAudience, language }) {
  const prompt = `Tu es scenariste pour des videos promotionnelles courtes (15-30 secondes) pour "${appName}".
Langue: ${language === 'fr' ? 'francais' : language}.

Brief:
- Objectif: ${goal}
- Message cle: ${keyMessage}
- Offre: ${offer || 'aucune offre specifique'}
- Audience: ${targetAudience}

Ecris un script scene par scene (3 a 5 scenes) avec pour chaque scene: description visuelle courte + texte de voix-off ou texte a l'ecran. Termine par un appel a l'action clair. Reponds en texte brut structure, pas de JSON.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1000,
    temperature: 0.8,
    messages: [{ role: 'user', content: prompt }]
  });

  return response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n');
}

module.exports = { generateCampaignCopy, generateVideoScript };
