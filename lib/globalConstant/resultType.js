/**
 * Module for result types.
 *
 * @module lib/globalConstant/resultType
 */

/**
 * Class for result types.
 *
 * @class ResultType
 */
class ResultType {
  get token() {
    return 'token';
  }

  get baseTokens() {
    return 'base_tokens';
  }

  get chain() {
    return 'chain';
  }

  get user() {
    return 'user';
  }

  get users() {
    return 'users';
  }

  get device() {
    return 'device';
  }

  get devices() {
    return 'devices';
  }

  get sessions() {
    return 'sessions';
  }

  get session() {
    return 'session';
  }

  get deviceManager() {
    return 'device_manager';
  }

  get salt() {
    return 'salt';
  }

  get pricePoint() {
    return 'price_point';
  }

  get userRedemption() {
    return 'redemption';
  }

  get userRedemptions() {
    return 'redemptions';
  }

  get transaction() {
    return 'transaction';
  }

  get recoveryOwner() {
    return 'recovery_owner';
  }

  get transactions() {
    return 'transactions';
  }

  get rules() {
    return 'rules';
  }

  get meta() {
    return 'meta';
  }

  get balance() {
    return 'balance';
  }

  get tokenHolder() {
    return 'token_holder';
  }

  get webhook() {
    return 'webhook';
  }

  get webhooks() {
    return 'webhooks';
  }

  get redemptionProduct() {
    return 'redemption_product';
  }

  get redemptionProducts() {
    return 'redemption_products';
  }
}

module.exports = new ResultType();
