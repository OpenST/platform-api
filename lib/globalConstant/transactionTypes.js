'use strict';

/**
 * Global constants for Transaction Types.
 *
 * @module lib/globalConstant/transactionTypes
 */

/**
 * Class for transactionTypes
 *
 * @class
 */
class TransactionTypesConstants {
  /**
   * Constructor for transaction types
   *
   * @constructor
   */
  constructor() {}

  //TransactionType Start
  get userToUserTransactionType() {
    return 'user_to_user';
  }

  get companyToUserTransactionType() {
    return 'company_to_user';
  }

  get userToCompanyTransactionType() {
    return 'user_to_company';
  }

  get allTransactionTypes() {
    const oThis = this;

    return [oThis.userToUserTransactionType, oThis.companyToUserTransactionType, oThis.userToCompanyTransactionType];
  }
  //TransactionType End
}

module.exports = new TransactionTypesConstants();
