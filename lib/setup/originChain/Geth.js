// 'use strict';
//
// /**
//  * @fileoverview Helper class for setting up Origin GETH and funding the required addresses
//  */
// const rootPrefix = '../../..',
//   coreConstants = require(rootPrefix + '/config/coreConstants'),
//   logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
//   responseHelper = require(rootPrefix + '/lib/formatter/response'),
//   fileManager = require(rootPrefix + '/tools/localSetup/fileManager'),
//   gethManager = require(rootPrefix + '/tools/localSetup/gethManager'),
//   serviceManager = require(rootPrefix + '/tools/localSetup/serviceManager');
//
// /**
//  * Class for origin geth setup.
//  *
//  * @class
//  */
// class OriginGethSetup {
//   /**
//    * Constructor for origin geth setup.
//    *
//    * @constructor
//    *
//    * @param {Number} originChainId: origin chain id
//    */
//   constructor(originChainId) {
//     const oThis = this;
//     oThis.originChainId = originChainId;
//   }
//
//   /**
//    * Perform
//    *
//    * @returns {Promise<void>}
//    */
//   perform() {
//     const oThis = this;
//
//     return oThis._asyncPerform().catch(function(error) {
//       if (responseHelper.isCustomResult(error)) {
//         return error;
//       } else {
//         logger.error('lib/setup/originChain/Geth.js::perform::catch');
//         logger.error(error);
//         return responseHelper.error({
//           internal_error_identifier: 'l_s_oc_g_1',
//           api_error_identifier: 'unhandled_catch_response',
//           debug_options: {}
//         });
//       }
//     });
//   }
//
//   /**
//    * Async perform
//    *
//    * @returns {Promise<void>}
//    *
//    * @private
//    */
//   async _asyncPerform() {
//     const oThis = this;
//
//     logger.step('** Starting fresh setup');
//     await fileManager.freshSetup();
//
//     logger.step('** Generating sealer address on GETH and init GETH with genesis');
//     let initChainRes = await gethManager.initChain(coreConstants.originChainKind, oThis.originChainId);
//
//     logger.step('** Starting origin geth for deployment.');
//     await serviceManager.startGeth(
//       coreConstants.originChainKind,
//       oThis.originChainId,
//       'deployment',
//       initChainRes.sealerAddress
//     );
//
//     logger.step('* Stopping origin geth.');
//     await serviceManager.stopOriginGeth(oThis.originChainId);
//     logger.info('** You can start geth from script in future:');
//
//     let gethRunCommand =
//       'sh ~/openst-setup/bin/origin-' + oThis.originChainId + '/origin-chain-' + oThis.originChainId + '.sh';
//
//     logger.info('gethRunCommand:', gethRunCommand);
//   }
// }
//
// module.exports = OriginGethSetup;
