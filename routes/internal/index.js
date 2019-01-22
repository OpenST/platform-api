'use strict';

const express = require('express');

const rootPrefix = '../..',
  signerRoutes = require(rootPrefix + '/routes/internal/signer'),
  contracts = require(rootPrefix + '/routes/internal/contracts');

let router = express.Router();

router.use('/signer', signerRoutes);
router.use('/contracts', contracts);

module.exports = router;
