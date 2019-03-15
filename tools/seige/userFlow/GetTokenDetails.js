const rootPrefix = '../../..';

class GetTokenDetails {
  constructor(params) {
    const oThis = this;

    oThis.ostObj = params.ostObj;
  }

  async perform() {
    let oThis = this,
      tokenService = oThis.ostObj.services.tokens,
      tokenData = await tokenService.get({}).catch(function(err) {
        console.log(JSON.stringify(err));
      });

    return tokenData.data;
  }
}

module.exports = GetTokenDetails;
