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
class GraphConstants {
  /**
   * Constructor for graph constants
   *
   * @constructor
   */
  constructor() {}

  //DurationType Start
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

  get allDurationTypes() {
    const oThis = this;

    return [oThis.durationTypeDay, oThis.durationTypeWeek, oThis.durationTypeMonth, oThis.durationTypeYear];
  }
  //DurationType End
}

module.exports = new GraphConstants();
