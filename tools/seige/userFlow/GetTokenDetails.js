const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response');

class GetTokenDetails {
  constructor(params) {
    const oThis = this;

    oThis.ostObj = params.ostObj;
  }

  async perform() {
    let oThis = this,
      tokenService = oThis.ostObj.services.tokens,
      beforeTimeStamp = Date.now(),
      tokenData = await tokenService.get({}).catch(function(err) {
        console.log(JSON.stringify(err));
        return {};
      }),
      afterTimeStamp = Date.now();

    console.log('Time taken by Get Token Details: ', afterTimeStamp - beforeTimeStamp, 'ms');

    if (tokenData['success']) {
      return responseHelper.successWithData(tokenData.data);
    } else {
      console.log('Error in api call', tokenData);
      return responseHelper.error({
        internal_error_identifier: 't_s_uf_gtd_1',
        api_error_identifier: 'something_went_wrong',
        debug_options: { API: 'GetTokenDetails' }
      });
    }
  }
}

module.exports = GetTokenDetails;
