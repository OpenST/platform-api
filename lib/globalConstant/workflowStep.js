'use strict';

class workflowStepConstants {
  constructor() {}

  // The process/task status, whether completed or inProgress
  get taskReadyToStart() {
    return 'taskReadyToStart';
  }

  get taskDone() {
    return 'taskDone';
  }
  // The process/task status end.

  //Generic constants start
  get init() {
    return 'init';
  }

  get queuedStatus() {
    return 'queued';
  }

  get pendingStatus() {
    return 'pending';
  }

  get processedStatus() {
    return 'processed';
  }

  get failedStatus() {
    return 'failed';
  }

  get timeoutStatus() {
    return 'time_out';
  }

  //Generic constants end

  // Test Steps Start
  get s1() {
    return 's1';
  }

  get s2() {
    return 's2';
  }

  get s33() {
    return 's3';
  }

  get s4() {
    return 's4';
  }

  get s5() {
    return 's5';
  }

  get s6() {
    return 's6';
  }

  get s7() {
    return 's7';
  }
  // Test Steps End

  // Onboarding Steps Start

  // Onboarding Steps end

  // stake & mint Steps Start

  // stake & mint Steps end
}

module.exports = new workflowStepConstants();
