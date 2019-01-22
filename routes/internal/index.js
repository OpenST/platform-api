'use strict';

const express = require('express');

const rootPrefix = '../..',
  signerRoutes = require(rootPrefix + '/routes/internal/signer'),
  tokenRoutes = require(rootPrefix + '/routes/internal/token'),
  contracts = require(rootPrefix + '/routes/internal/contracts');

let router = express.Router();

router.use('/signer', signerRoutes);
router.use('/token', tokenRoutes);
router.use('/contracts', contracts);

module.exports = router;
