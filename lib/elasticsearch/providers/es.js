'use strict';

const rootPrefix = '..';
let Constants, elasticSearch, aws, awsEs, elasticSearchClientConfig, logger;

let esMap = {};

try {
  require('http').globalAgent.keepAlive = true;
  aws = require('aws-sdk');
  awsEs = require('http-aws-es');
  elasticSearch = require('elasticsearch');
  Constants = require(rootPrefix + '/config/constants');
  logger = require(rootPrefix + '/providers/logger');
  aws.config.httpOptions.keepAlive = true;
  aws.config.httpOptions.disableProgressEvents = false;
} catch (e) {
  console.error('Failed to initilaize some packages. Some methods may not work. Error:', e);
}

elasticSearchClientConfig = {
  log: {
    type: function() {
      return logger;
    },
    level: 'trace'
  }
};

class ElasticSearchClient {
  constructor() {}

  getESClient(config) {
    if (!config) {
      throw 'ES Config is mandatory to connect with ES client.';
    }

    if (!config.host) {
      logger.error('Host is mandatory in ES config to connect with ES client.', config);
      throw 'Host is mandatory in ES config to connect with ES client.';
    }

    if (!config.apiVersion) {
      logger.error('apiVersion is mandatory in ES config to connect with ES client.', config);
      throw 'apiVersion is mandatory in ES config to connect with ES client.';
    }

    let host = config.host,
      esMapKey = String(host).toLowerCase(),
      apiVersion = config.apiVersion,
      esClient;

    elasticSearchClientConfig['host'] = host;
    elasticSearchClientConfig['apiVersion'] = apiVersion;

    if (Constants.ENVIRONMENT != 'development') {
      let awsESAccessKey = config['apiKey'],
        awsESSecretKey = config['apiSecret'],
        awsRegion = config['region'];
      elasticSearchClientConfig.connectionClass = awsEs;
      elasticSearchClientConfig.awsConfig = new aws.Config({
        credentials: new aws.Credentials(awsESAccessKey, awsESSecretKey),
        region: awsRegion
      });
    }

    logger.log('elasticSearchClientConfig', elasticSearchClientConfig);

    if (esMap[esMapKey]) {
      esClient = esMap[esMapKey];
    } else {
      esClient = new elasticSearch.Client(elasticSearchClientConfig);
      esMap[esMapKey] = esClient;
    }

    return esClient;
  }
}

module.exports = new ElasticSearchClient();
