'use strict';

const OSTBase = require('@openstfoundation/openst-base');

const rootPrefix = '../../../..',
  GetUserBase = require(rootPrefix + '/app/services/user/get/Base'),
  pagination = require(rootPrefix + '/lib/globalConstant/pagination'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  coreConstants = require(rootPrefix + '/config/coreConstants');

const InstanceComposer = OSTBase.InstanceComposer;

class GetUserList extends GetUserBase {
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.userIds = params.ids || [];
    oThis.limit = params.limit;
    oThis.paginationIdentifier = params[pagination.paginationIdentifierKey];

    oThis.lastEvaluatedKey = null;
    oThis.page = null;

    oThis.responseMetaData = {
      [pagination.nextPagePayloadKey]: {}
    };
  }

  /**
   * Validate and sanitize specific params
   *
   * @returns {Promise<never>}
   * @private
   */
  async _validateAndSanitizeParams() {
    const oThis = this;

    // Parameters in paginationIdentifier take higher precedence
    if (oThis.paginationIdentifier) {
      let parsedPaginationParams = oThis._parsePaginationParams(oThis.paginationIdentifier);
      oThis.userIds = []; //user ids not allowed after first page
      oThis.page = parsedPaginationParams.page; //override page
      oThis.limit = parsedPaginationParams.limit; //override limit
      oThis.lastEvaluatedKey = parsedPaginationParams.lastEvaluatedKey;
    } else {
      oThis.userIds = oThis.userIds || [];
      oThis.page = 1;
      oThis.limit = oThis.limit || pagination.defaultUserListPageSize;
      oThis.lastEvaluatedKey = null;
    }

    // Validate user ids length
    if (oThis.userIds && oThis.userIds.length > pagination.maxUserListPageSize) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 's_u_gl_1',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['ids_more_than_allowed_limit'],
          debug_options: {}
        })
      );
    }

    //Validate limit
    return await oThis._validatePageSize();
  }

  /**
   * set user ids - by hitting pagination cache
   *
   * @return {Promise<void>}
   * @private
   */
  async _setUserIds() {
    const oThis = this;

    if (!oThis.userIds || oThis.userIds.length === 0) {
      const UserModelKlass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'UserModel');

      let userModelObj = new UserModelKlass({ shardNumber: oThis.userShard }),
        response = await userModelObj.getUserIds(oThis.tokenId, oThis.limit, oThis.lastEvaluatedKey);

      // If user ids are found from Dynamo then fetch data from cache.
      if (response.isSuccess() && response.data.users.length > 0) {
        for (let i = 0; i < response.data.users.length; i++) {
          oThis.userIds.push(response.data.users[i].userId);
        }
        oThis.responseMetaData[pagination.nextPagePayloadKey] = response.data[pagination.nextPagePayloadKey] || {};
      }
    }
  }

  /**
   * Format API response
   *
   * @return {Promise<*|result>}
   * @private
   */
  async _formatApiResponse() {
    const oThis = this;

    return responseHelper.successWithData({
      [resultType.users]: oThis.userDetails,
      [resultType.meta]: oThis.responseMetaData
    });
  }

  /**
   * _defaultPageLimit
   *
   * @private
   */
  _defaultPageLimit() {
    return pagination.defaultUserListPageSize;
  }

  /**
   * _minPageLimit
   *
   * @private
   */
  _minPageLimit() {
    return pagination.minUserListPageSize;
  }

  /**
   * _maxPageLimit
   *
   * @private
   */
  _maxPageLimit() {
    return pagination.maxUserListPageSize;
  }

  /**
   * _currentPageLimit
   *
   * @private
   */
  _currentPageLimit() {
    const oThis = this;

    return oThis.limit;
  }
}

InstanceComposer.registerAsShadowableClass(GetUserList, coreConstants.icNameSpace, 'GetUserList');
