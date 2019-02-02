'use strict';

const rootPrefix = '../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  KnownAddressHelper = require(rootPrefix + '/lib/generateKnownAddress/ChainSetup'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress');

class AddSealerAddress {
  /**
   * Constructor
   *
   * @constructor
   */
  constructor(auxChainId, sealerAddress, sealerPrivateKey) {
    const oThis = this;

    oThis.auxChainId = auxChainId;
    oThis.sealerAddress = sealerAddress;
    oThis.sealerPrivateKey = sealerPrivateKey;
  }

  /**
   *
   * Perform
   *
   * @return {Promise<result>}
   *
   */
  perform() {
    const oThis = this;

    return oThis._asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error('lib/setup/auxChain/AddSealerAddress.js::perform::catch');
        logger.error(error);
        return responseHelper.error({
          internal_error_identifier: 't_ls_ocs_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  /**
   *
   * async perform
   *
   * @return {Promise<result>}
   *
   */
  async _asyncPerform() {
    const oThis = this;

    logger.step('** Insert Sealer Address into chain addresses and known addresses table.');
    await oThis.insertSealerAddressIntoTables();
  }

  async insertSealerAddressIntoTables() {
    const oThis = this;

    const insertToTableResponse = new KnownAddressHelper({
      chainId: oThis.auxChainId,
      chainKind: coreConstants.auxChainKind,
      addressKind: chainAddressConstants.auxSealerKind,
      address: oThis.sealerAddress,
      privateKey: oThis.sealerPrivateKey
    });

    let r = await insertToTableResponse.perform();

    if (r.isFailure()) {
      logger.error('Insertion failed ============ ', r);
      process.exit(0);
    }
    console.log(r);
  }
}

module.exports = AddSealerAddress;
