'use strict';

const express = require('express');

const rootPrefix = '../..',
  signerRoutes = require(rootPrefix + '/routes/internal/verifySigner'),
  contracts = require(rootPrefix + '/routes/internal/contracts'),
  tokenRoutes = require(rootPrefix + '/routes/internal/token');

let router = express.Router();

router.use('/verifySigner', signerRoutes);
router.use('/contracts', contracts);
router.use('/token', tokenRoutes);

module.exports = router;
