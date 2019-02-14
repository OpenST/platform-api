'use strict';

/**
 *  Authorize session
 *
 * @module app/services/deviceManager/multisigOperation/AuthorizeDevice
 */

const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  Base = require(rootPrefix + '/app/services/deviceManager/multisigOperation/Base'),
  deviceConstants = require(rootPrefix + '/lib/globalConstant/device');

// Following require(s) for registering into instance composer

class AuthorizeSession extends Base {
  constructor(params) {
    super(params);
  }

  /**
   *
   *
   * @returns {Promise<void>}
   * @private
   */
  async _performOperation() {
    const oThis = this;

    //Perform all the custom checks related to authorize device
    await oThis._fetchAndCheckSessionStatus();

    await oThis._updateSessionStatus();

    await oThis._startWorkflow();
  }

  /**
   * Fetches the session details present in the database.
   *
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchAndCheckSessionStatus() {
    return Promise.resolve(responseHelper.successWithData({}));
  }

  async _updateSessionStatus() {
    return Promise.resolve(responseHelper.successWithData({}));
  }

  async _startWorkflow() {
    const oThis = this;
    //Todo: Start the workflow from here
  }
}

InstanceComposer.registerAsShadowableClass(AuthorizeSession, coreConstants.icNameSpace, 'AuthorizeSession');
