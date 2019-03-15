const rootPrefix = '../../..';

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

    return sessionData.data;
  }
}

module.exports = GetSession;
