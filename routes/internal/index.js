'use strict';

const express = require('express');

const rootPrefix = '../..',
  signerRoutes = require(rootPrefix + '/routes/internal/signer');

let router = express.Router();

router.use('/signer', signerRoutes);

module.exports = router;
