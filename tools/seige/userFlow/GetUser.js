//IP: User id:
//Op: User Data:

const rootPrefix = '../../..';

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
        console.log(JSON.stringify(err));
      });

    return userdata.data;
  }
}

module.exports = GetUser;
