const express = require('express');
const { randomUUID } = require('crypto');
const config = require('../config');
const { generateCampaignCopy, generateVideoScript } = require('../lib/claude');
const { renderFlyer } = require('../lib/flyer');
const { listCampaigns, getCampaign, upsertCampaign } = require('../lib/campaignStore');

const router = express.Router();

function appDisplayName(app) {
  return config.apps[app].displayName;
}

router.get('/', (req, res) => {
  res.json(listCampaigns());
});

router.get('/:id', (req, res) => {
  const campaign = getCampaign(req.params.id);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
  res.json(campaign);
});

router.post('/', (req, res) => {
  const { app, goal, keyMessage, offer, targetAudience, platforms, language } = req.body;

  if (!app || !config.apps[app]) {
    return res.status(400).json({ error: `app must be one of: ${Object.keys(config.apps).join(', ')}` });
  }
  if (!goal || !keyMessage || !targetAudience || !Array.isArray(platforms) || platforms.length === 0) {
    return res
      .status(400)
      .json({ error: 'goal, keyMessage, targetAudience and a non-empty platforms array are required' });
  }

  const campaign = {
    id: randomUUID(),
    app,
    goal,
    keyMessage,
    offer: offer || null,
    targetAudience,
    platforms,
    language: language || config.defaultLanguage,
    status: 'draft',
    copy: null,
    videoScript: null,
    flyerUrl: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  upsertCampaign(campaign);
  res.status(201).json(campaign);
});

router.post('/:id/copy', async (req, res) => {
  const campaign = getCampaign(req.params.id);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

  try {
    const copy = await generateCampaignCopy({
      appName: appDisplayName(campaign.app),
      goal: campaign.goal,
      keyMessage: campaign.keyMessage,
      offer: campaign.offer,
      targetAudience: campaign.targetAudience,
      platforms: campaign.platforms,
      language: campaign.language
    });

    campaign.copy = copy;
    campaign.status = 'copy_generated';
    campaign.updatedAt = new Date().toISOString();
    upsertCampaign(campaign);
    res.json(campaign);
  } catch (err) {
    res.status(502).json({ error: `Claude generation failed: ${err.message}` });
  }
});

router.post('/:id/video-script', async (req, res) => {
  const campaign = getCampaign(req.params.id);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

  try {
    const videoScript = await generateVideoScript({
      appName: appDisplayName(campaign.app),
      goal: campaign.goal,
      keyMessage: campaign.keyMessage,
      offer: campaign.offer,
      targetAudience: campaign.targetAudience,
      language: campaign.language
    });

    // NOTE: this only produces the script/storyboard. Rendering it into an
    // actual video clip needs a text-to-video provider (Runway, Pika, etc.)
    // wired in separately - not implemented here, see README.
    campaign.videoScript = videoScript;
    campaign.updatedAt = new Date().toISOString();
    upsertCampaign(campaign);
    res.json(campaign);
  } catch (err) {
    res.status(502).json({ error: `Claude generation failed: ${err.message}` });
  }
});

router.post('/:id/design', async (req, res) => {
  const campaign = getCampaign(req.params.id);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
  if (!campaign.copy) return res.status(400).json({ error: 'Generate copy before rendering the flyer' });

  try {
    const { publicPath } = await renderFlyer({
      app: campaign.app,
      campaignId: campaign.id,
      headline: campaign.copy.flyer.headline,
      subtext: campaign.copy.flyer.subtext
    });

    campaign.flyerUrl = publicPath;
    campaign.status = 'design_generated';
    campaign.updatedAt = new Date().toISOString();
    upsertCampaign(campaign);
    res.json(campaign);
  } catch (err) {
    res.status(500).json({ error: `Flyer rendering failed: ${err.message}` });
  }
});

router.post('/:id/approve', (req, res) => {
  const campaign = getCampaign(req.params.id);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
  if (campaign.status !== 'design_generated') {
    return res.status(400).json({ error: 'Campaign must have a generated flyer before approval' });
  }

  campaign.status = 'approved';
  campaign.approvedAt = new Date().toISOString();
  campaign.updatedAt = campaign.approvedAt;
  upsertCampaign(campaign);
  res.json(campaign);
});

router.post('/:id/publish', (req, res) => {
  const campaign = getCampaign(req.params.id);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
  if (campaign.status !== 'approved') {
    return res.status(400).json({ error: 'Campaign must be approved before publishing' });
  }

  // Stub: wire this up to Meta Graph API / WhatsApp Business API per
  // platform once each social account's own app credentials/OAuth grant
  // exist. Left unimplemented on purpose so nothing posts to a real
  // account automatically.
  campaign.status = 'published';
  campaign.publishedAt = new Date().toISOString();
  campaign.updatedAt = campaign.publishedAt;
  upsertCampaign(campaign);
  res.json({ ...campaign, note: 'Publish is a stub - no social API call was made. See README.' });
});

module.exports = router;
