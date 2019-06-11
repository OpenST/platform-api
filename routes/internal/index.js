'use strict';

const express = require('express');

const rootPrefix = '../..',
  signerRoutes = require(rootPrefix + '/routes/internal/signer'),
  tokenRoutes = require(rootPrefix + '/routes/internal/token'),
  userRoutes = require(rootPrefix + '/routes/internal/user'),
  webhookRoutes = require(rootPrefix + '/routes/internal/webhook');

let router = express.Router();

router.use('/signer', signerRoutes);
router.use('/token', tokenRoutes);
router.use('/user', userRoutes);
router.use('/webhook', webhookRoutes);

module.exports = router;
