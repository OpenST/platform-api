const express = require('express');

const rootPrefix = '../../..',
  SlackWebhookAuth = require(rootPrefix + '/lib/authentication/SlackWebhook'),
  SlackEventFactory = require(rootPrefix + '/app/services/slackEvents/Factory'),
  apiVersions = require(rootPrefix + '/lib/globalConstant/apiVersions'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  errorConfig = basicHelper.fetchErrorConfig(apiVersions.general),
  sanitizer = require(rootPrefix + '/helpers/sanitizer');

const router = express.Router();

const validateSlackSignature = async function(req, res, next) {
  let authResponse;

  authResponse = await new SlackWebhookAuth({
    rawBody: req.rawBody,
    webhookParams: req.decodedParams.webhookParams,
    requestHeaders: req.headers
  })
    .perform()
    .catch(function(r) {
      return r;
    });

  if (authResponse.isFailure()) {
    return authResponse.renderResponse(res, errorConfig);
  }

  req.decodedParams.current_admin = authResponse.data.current_admin;

  next();
};

/**
 * Convert String to Json
 *
 * @param req
 * @param res
 * @param next
 */
const formatPayload = function(req, res, next) {
  let payload = JSON.parse(req.body.payload);

  req.body.payload = basicHelper.preprocessSlackPayload(payload);

  next();
};

/**
 * Assign params
 *
 * @param req
 * @param res
 * @param next
 */
const assignParams = function(req, res, next) {
  // IMPORTANT NOTE: Don't assign parameters before sanitization
  // And assign it to req.decodedParams
  req.decodedParams = req.decodedParams || {};

  req.decodedParams.webhookParams = Object.assign(req.body);

  next();
};

router.use(formatPayload, sanitizer.sanitizeBodyAndQuery, assignParams, validateSlackSignature);

/* Listen to Slack Events*/
router.post('/', sanitizer.sanitizeDynamicUrlParams, function(req, res, next) {
  const performer = async function() {
    let response = await new SlackEventFactory(req.decodedParams).perform();
    return response.renderResponse(res, errorConfig);
  };

  performer();
});

module.exports = router;
