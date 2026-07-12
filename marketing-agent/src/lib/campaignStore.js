const { readJson, writeJson } = require('./store');

const FILE = 'campaigns.json';

function listCampaigns() {
  return readJson(FILE, []);
}

function saveCampaigns(campaigns) {
  writeJson(FILE, campaigns);
}

function getCampaign(id) {
  return listCampaigns().find((c) => c.id === id);
}

function upsertCampaign(campaign) {
  const campaigns = listCampaigns();
  const idx = campaigns.findIndex((c) => c.id === campaign.id);
  if (idx === -1) campaigns.push(campaign);
  else campaigns[idx] = campaign;
  saveCampaigns(campaigns);
  return campaign;
}

module.exports = { listCampaigns, getCampaign, upsertCampaign };
