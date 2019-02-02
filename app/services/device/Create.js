'use strict';
/**
 * Create device.
 *
 * @module app/services/device/Create
 */

const rootPrefix = '../../..',
  OSTBase = require('@openstfoundation/openst-base'),
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CommonValidator = require(rootPrefix + '/lib/validators/Common'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  deviceConstant = require(rootPrefix + '/lib/globalConstant/device'),
  DeviceFormatter = require(rootPrefix + '/lib/formatter/entity/Device'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object');

const InstanceComposer = OSTBase.InstanceComposer;

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/device/GetShard');
require(rootPrefix + '/app/models/ddb/sharded/Device');
require(rootPrefix + '/lib/cacheManagement/chain/TokenShardNumber');

/**
 * Class for CreateDevice
 *
 * @class CreateDevice
 *
 * @param {Integer} params.clientId
 * @param {Integer} params.userId
 * @param {String} params.walletAddress
 * @param {String} params.personalSignAddress
 * @param {String} params.deviceName
 * @param {String} params.deviceUuid
 */
class CreateDevice extends ServiceBase {
  constructor(params) {
    super(params);

    const oThis = this;
    oThis.clientId = params.clientId;
    oThis.userId = params.userId;
    oThis.walletAddress = params.walletAddress;
    oThis.personalSignAddress = params.personalSignAddress;
    oThis.deviceName = params.deviceName;
    oThis.deviceUuid = params.deviceUuid;
  }

  /**
   * Main performer method for the class.
   *
   * @returns {Promise<void>}
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(err) {
      logger.error(' In catch block of lib/device/Create.js');

      return responseHelper.error({
        internal_error_identifier: 'l_d_c_1',
        api_error_identifier: 'something_went_wrong',
        debug_options: err,
        error_config: {}
      });
    });
  }

  /**
   * Async performer.
   *
   * @returns {Promise<*>}
   */
  async asyncPerform() {
    const oThis = this;

    await oThis._validate();

    oThis._sanitize();

    return await oThis._create();
  }

  /**
   * This method validates input parameters.
   *
   */
  _validate() {
    const oThis = this;
    //&& CommonValidator.validatePersonalSign(oThis.personalSignAddress)
    if (
      CommonValidator.validateUuidV4(oThis.userId) &&
      CommonValidator.validateUuidV4(oThis.deviceUuid) &&
      CommonValidator.validateEthAddress(oThis.walletAddress)
    ) {
      logger.info('Validations Done');
    } else {
      logger.info('Validations Failed');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_d_c_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            userId: oThis.userId,
            deviceUuid: oThis.deviceUuid,
            personalSignAddress: oThis.personalSignAddress,
            walletAddress: oThis.walletAddress
          },
          error_config: {}
        })
      );
    }
  }

  /**
   * Sanitize input parameters.
   *
   */
  _sanitize() {
    const oThis = this;

    oThis.personalSignAddress.toLowerCase();

    oThis.walletAddress.toLowerCase();
  }

  /***
   *
   * config strategy
   *
   * @return {object}
   */
  get _configStrategy() {
    const oThis = this;
    return oThis.ic().configStrategy;
  }

  /***
   *
   * object of config strategy klass
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
   * This method creates entry into device table.
   *
   * @returns {Promise<*>}
   */
  async _create() {
    const oThis = this;

    let Device = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'DeviceModel'),
      GetShard = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'GetDeviceShard'),
      getShard = new GetShard({ clientId: oThis.clientId }),
      shardNumber = await getShard.perform(),
      chainId = oThis._configStrategyObject.auxChainId,
      device = new Device({ chainId: chainId, shardNumber: shardNumber }),
      params = {
        userId: oThis.userId,
        walletAddress: oThis.walletAddress,
        personalSignAddress: oThis.personalSignAddress,
        deviceUuid: oThis.deviceUuid,
        deviceName: oThis.deviceName,
        status: deviceConstant.registeredStatus,
        updatedTimestamp: Math.floor(new Date().getTime() / 1000)
      },
      deviceFormatter = new DeviceFormatter(params);

    await device.create(params);

    logger.info('Entry created in device table with shardNumber ', shardNumber);

    return deviceFormatter.perform(params);
  }
}

InstanceComposer.registerAsShadowableClass(CreateDevice, coreConstants.icNameSpace, 'CreateDevice');

module.exports = {};
