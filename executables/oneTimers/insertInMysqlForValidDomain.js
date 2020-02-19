'use strict';

/**
 * This inserts entry in valid_domians table,
 *
 * Usage: node executables/oneTimers/insertInMysqlForValidDomain.js
 *
 * @module executables/oneTimers/insertInMysqlForValidDomain
 */

const command = require('commander');

const rootPrefix = '../..',
  ValidDomainModel = require(rootPrefix + '/app/models/mysql/ValidDomain'),
  ValidDomainByTokenIdCache = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/ValidDomainByTokenId'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

command
  .version('0.1.0')
  .usage('[options]')
  .option('--tokenId <tokenId>', 'token id for the valid domain table')
  .option('--domain <domain>', 'domain for the valid domain table')
  .parse(process.argv);

class InsertInMysqlForValidDomain {
  /**
   *
   * @constructor
   */
  constructor() {
    const oThis = this;

    oThis.tokenId = null;
    oThis.domain = null;
  }

  /**
   * Perform
   *
   * @return {Promise|*|Promise<T>}
   */
  perform() {
    const oThis = this;

    return oThis._asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error(`${__filename}::perform::catch`);
        logger.error(error);
        return responseHelper.error({
          internal_error_identifier: 'e_ot_iimfvd_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  /**
   * _asyncPerform
   *
   * @return {Promise<void>}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    oThis.tokenId = command.tokenId;
    oThis.domain = command.domain;

    if (!oThis.tokenId || !oThis.domain) {
      command.help();
      process.exit(1);
    }

    const insertParams = {
      token_id: oThis.tokenId,
      domain: oThis.domain
    };
    await new ValidDomainModel().insert(insertParams).fire();

    const flushCacheParams = {
      tokenIds: [oThis.tokenId]
    };

    await ValidDomainByTokenIdCache.flushCache(flushCacheParams);

    logger.info('Created entries in valid domains tables');

    return Promise.resolve(responseHelper.successWithData('Done with success.'));
  }
}

const insertInMysqlForValidDomain = new InsertInMysqlForValidDomain();

insertInMysqlForValidDomain
  .perform()
  .then(function(r) {
    logger.log(r);
    process.exit(0);
  })
  .catch(function(e) {
    logger.log(e);
    process.exit(1);
  });
