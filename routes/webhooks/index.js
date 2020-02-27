const express = require('express'),
  router = express.Router();

const rootPrefix = '../..',
  slackRoutes = require(rootPrefix + '/routes/webhooks/slack/index');

router.use('/slack', slackRoutes);

module.exports = router;
