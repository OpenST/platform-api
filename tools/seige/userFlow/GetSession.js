const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response');

class GetSession {
  constructor(params) {
    const oThis = this;

    oThis.userUuid = params.userUuid;
    oThis.sessionAddress = params.sessionAddress;
    oThis.ostObj = params.ostObj;
  }

  async perform() {
    let oThis = this,
      sessionService = oThis.ostObj.services.sessions,
      sessionData = await sessionService
        .get({ user_id: oThis.userUuid, session_address: oThis.sessionAddress })
        .catch(function(err) {
          console.log(JSON.stringify(err));
        });

    if (sessionData['success']) {
      return responseHelper.successWithData(sessionData.data);
    } else {
      console.log('Error in api call', sessionData);
      return responseHelper.error({
        internal_error_identifier: 't_s_uf_gd_1',
        api_error_identifier: 'something_went_wrong',
        debug_options: { API: 'GetSession' }
      });
    }
  }
}

module.exports = GetSession;
