'use strict';

const express = require('express');

const rootPrefix = '../..',
  userRoutes = require(rootPrefix + '/routes/v2/users'),
  chainRoutes = require(rootPrefix + '/routes/v2/chains'),
  tokenRoutes = require(rootPrefix + '/routes/v2/tokens'),
  rulesRoutes = require(rootPrefix + '/routes/v2/rules'),
  webhookRoutes = require(rootPrefix + '/routes/v2/webhooks'),
  baseTokenRoutes = require(rootPrefix + '/routes/v2/baseTokens'),
  redemptionProductRoutes = require(rootPrefix + '/routes/v2/redemptionProducts');

const router = express.Router();

router.use('/users', userRoutes);
router.use('/chains', chainRoutes);
router.use('/tokens', tokenRoutes);
router.use('/rules', rulesRoutes);
router.use('/base-tokens', baseTokenRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/redeemable-skus', redemptionProductRoutes);

module.exports = router;
