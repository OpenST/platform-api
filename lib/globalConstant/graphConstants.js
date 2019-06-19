'use strict';

/**
 * Global constants for Graphs.
 *
 * @module lib/globalConstant/graphConstants
 */

/**
 * Class for GraphConstants
 *
 * @class
 */
const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util');

let invertedDurationTypes, invertedGraphTypes;

class GraphConstants {
  /**
   * Constructor for graph constants
   *
   * @constructor
   */
  constructor() {}

  // Duration Type
  get durationTypeDay() {
    return 'day';
  }

  get durationTypeWeek() {
    return 'week';
  }

  get durationTypeMonth() {
    return 'month';
  }

  get durationTypeYear() {
    return 'year';
  }

  // Graph Type
  get totalTransactionsGraphType() {
    return 'total_transactions';
  }

  get totalTransactionsByTypeGraphType() {
    return 'total_transactions_by_type';
  }

  get totalTransactionsByNameGraphType() {
    return 'total_transactions_by_name';
  }

  get durationTypes() {
    const oThis = this;

    return {
      '1': oThis.durationTypeDay,
      '2': oThis.durationTypeWeek,
      '3': oThis.durationTypeMonth,
      '4': oThis.durationTypeYear
    };
  }

  get invertedDurationTypes() {
    const oThis = this;

    if (invertedDurationTypes) {
      return invertedDurationTypes;
    }

    invertedDurationTypes = util.invert(oThis.durationTypes);

    return invertedDurationTypes;
  }

  get graphTypes() {
    const oThis = this;

    return {
      '1': oThis.totalTransactionsGraphType,
      '2': oThis.totalTransactionsByTypeGraphType,
      '3': oThis.totalTransactionsByNameGraphType
    };
  }

  get invertedGraphTypes() {
    const oThis = this;

    if (invertedGraphTypes) {
      return invertedGraphTypes;
    }

    invertedGraphTypes = util.invert(oThis.graphTypes);

    return invertedGraphTypes;
  }

  get allDurationTypes() {
    const oThis = this;

    return [oThis.durationTypeDay, oThis.durationTypeWeek, oThis.durationTypeMonth, oThis.durationTypeYear];
  }

  get allGraphTypes() {
    const oThis = this;

    return [
      oThis.totalTransactionsGraphType,
      oThis.totalTransactionsByTypeGraphType,
      oThis.totalTransactionsByNameGraphType
    ];
  }
}

module.exports = new GraphConstants();
