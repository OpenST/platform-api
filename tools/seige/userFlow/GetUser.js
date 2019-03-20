//IP: User id:
//Op: User Data:

const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response');

class GetUser {
  constructor(params) {
    const oThis = this;

    oThis.userUuid = params.userUuid;
    oThis.ostObj = params.ostObj;
  }

  async perform() {
    let oThis = this,
      userService = oThis.ostObj.services.users,
      userdata = await userService.get({ user_id: oThis.userUuid }).catch(function(err) {
        console.log('User Data Error: ', oThis.userUuid, JSON.stringify(err));
        return {};
      });

    if (userdata['success']) {
      return responseHelper.successWithData(userdata.data);
    } else {
      console.log('Error in api call', userdata);
      return responseHelper.error({
        internal_error_identifier: 't_s_uf_gu_1',
        api_error_identifier: 'something_went_wrong',
        debug_options: { API: 'GetUser' }
      });
    }
  }
}

module.exports = GetUser;
