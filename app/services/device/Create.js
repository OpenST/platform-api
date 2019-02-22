'use strict';
/**
 * Create device.
 *
 * @module app/services/device/Create
 */
const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  deviceConstants = require(rootPrefix + '/lib/globalConstant/device'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object');

// Following require(s) for registering into instance composer
require(rootPrefix + '/app/models/ddb/sharded/Device');
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');

/**
 * Class for CreateDevice
 *
 * @class CreateDevice
 *
 * @param {Integer} params.client_id
 * @param {String} params.user_id - uuid
 * @param {String} params.address
 * @param {String} params.api_signer_address
 * @param {String} params.device_name
 * @param {String} params.device_uuid
 */
class CreateDevice extends ServiceBase {
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.clientId = params.client_id;
    oThis.userId = params.user_id;
    oThis.walletAddress = params.address;
    oThis.personalSignAddress = params.api_signer_address;
    oThis.deviceName = params.device_name;
    oThis.deviceUuid = params.device_uuid;
  }

  /**
   * Main performer method for the class.
   *
   * @returns {Promise<void>}
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(err) {
      if (responseHelper.isCustomResult(err)) {
        return err;
      } else {
        logger.error(' In catch block of app/services/device/Create.js');

        return responseHelper.error({
          internal_error_identifier: 'a_s_d_c_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: { error: err.toString() }
        });
      }
    });
  }

  /**
   * Async performer.
   *
   * @returns {Promise<*>}
   */
  async asyncPerform() {
    const oThis = this;

    oThis._sanitize();

    await oThis._fetchTokenDetails();

    return oThis._create();
  }

  /**
   * Sanitize input parameters.
   *
   */
  _sanitize() {
    const oThis = this;
    oThis.userId = oThis.userId.toLowerCase();
    oThis.personalSignAddress = oThis.personalSignAddress.toLowerCase();
    oThis.walletAddress = oThis.walletAddress.toLowerCase();
  }

  /**
   * This method creates entry into device table.
   *
   * @returns {Promise<*>}
   */
  async _create() {
    const oThis = this,
      TokenUSerDetailsCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenUserDetailsCache'),
      tokenUserDetailsCacheObj = new TokenUSerDetailsCache({ tokenId: oThis.tokenId, userIds: [oThis.userId] }),
      cacheFetchRsp = await tokenUserDetailsCacheObj.fetch();

    if (!CommonValidators.validateObject(cacheFetchRsp.data[oThis.userId])) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_d_c_2',
          api_error_identifier: 'resource_not_found',
          params_error_identifiers: ['user_not_found'],
          debug_options: {}
        })
      );
    }

    const userData = cacheFetchRsp.data[oThis.userId];

    let Device = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'DeviceModel'),
      chainId = oThis._configStrategyObject.auxChainId,
      device = new Device({ chainId: chainId, shardNumber: userData['deviceShardNumber'] }),
      params = {
        userId: oThis.userId,
        walletAddress: oThis.walletAddress,
        personalSignAddress: oThis.personalSignAddress,
        deviceUuid: oThis.deviceUuid,
        deviceName: oThis.deviceName,
        status: deviceConstants.registeredStatus,
        updatedTimestamp: Math.floor(new Date().getTime() / 1000)
      };

    await device.create(basicHelper.deepDup(params));

    logger.info('Entry created in device table with shardNumber ', userData['deviceShardNumber']);

    return responseHelper.successWithData({ [resultType.device]: params });
  }

  /**
   * Object of config strategy klass
   *
   * @return {object}
   */
  get _configStrategyObject() {
    const oThis = this;

    if (oThis.configStrategyObj) return oThis.configStrategyObj;

    oThis.configStrategyObj = new ConfigStrategyObject(oThis._configStrategy);

    return oThis.configStrategyObj;
  }

  /**
   * Config strategy
   *
   * @return {object}
   */
  get _configStrategy() {
    const oThis = this;

    return oThis.ic().configStrategy;
  }
}

InstanceComposer.registerAsShadowableClass(CreateDevice, coreConstants.icNameSpace, 'CreateDevice');

module.exports = {};
