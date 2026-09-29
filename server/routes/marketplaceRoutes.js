const express = require('express');
const router = express.Router();
const marketplaceService = require('../services/marketplaceService');

router.get('/', (req, res) => {
  res.json(marketplaceService.getMarketplaceFeed());
});

router.post('/install', (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'id required' });
  res.json(marketplaceService.installPackage(id));
});

router.post('/uninstall', (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'id required' });
  res.json(marketplaceService.uninstallPackage(id));
});

router.post('/theme', (req, res) => {
  const { themeCode } = req.body;
  if (!themeCode) return res.status(400).json({ error: 'themeCode required' });
  res.json(marketplaceService.setTheme(themeCode));
});

router.post('/toggle-extension', (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'id required' });
  res.json(marketplaceService.toggleExtension(id));
});

router.post('/update-all', (req, res) => {
  res.json(marketplaceService.updateAll());
});

module.exports = router;
