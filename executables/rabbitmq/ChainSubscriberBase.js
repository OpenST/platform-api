'use strict';
/**
 * Class for subscriber base.
 *
 * @module executables/rabbitmq/SubscriberBase
 */
const OSTBase = require('@openstfoundation/openst-base');

const rootPrefix = '../..',
  CronBase = require(rootPrefix + '/executables/CronBase'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  rabbitMqProvider = require(rootPrefix + '/lib/providers/notification'),
  connectionTimeoutConst = require(rootPrefix + '/lib/globalConstant/connectionTimeout'),
  cronProcessHandler = require(rootPrefix + '/lib/CronProcessesHandler'),
  cronProcessHandlerObject = new cronProcessHandler();

/**
 * Class for subscriber base.
 *
 * @class
 */
class SubscriberBase extends CronBase {
  /**
   * Constructor for subscriber base
   *
   * @param {Object} params
   * @param {Number} params.cronProcessId
   *
   * @constructor
   */
  constructor(params) {
    super(params);
  }

  /**
   * Validate and sanitize params.
   *
   * @private
   */
  _validateAndSanitize() {
    const oThis = this;

    if (!oThis.prefetchCount) {
      logger.error('Prefetch count un-available in cron params in the database.');
      process.emit('SIGINT');
    }

    oThis.prefetchCount = parseInt(oThis.prefetchCount);

    if (!CommonValidators.validateInteger(oThis.prefetchCount)) {
      logger.error('Prefetch count is not an integer.');
      process.emit('SIGINT');
    }

    if (oThis.prefetchCount < 0) {
      logger.error('Prefetch count is invalid.');
      process.emit('SIGINT');
    }

    logger.step('Common validations done.');

    oThis._specificValidations();

    logger.step('Specific validations done.');

    return true;
  }

  /**
   * Promise queue manager
   *
   * @returns {OSTBase.OSTPromise.QueueManager}
   */
  promiseQueueManager(topicName) {
    const oThis = this;

    // trying to ensure that there is only one _PromiseQueueManager;
    if (oThis.subscriptionTopicToDataMap[topicName]['promiseQueueManager'])
      return oThis.subscriptionTopicToDataMap[topicName]['promiseQueueManager'];

    oThis.subscriptionTopicToDataMap[topicName]['promiseQueueManager'] = new OSTBase.OSTPromise.QueueManager(
      function(...args) {
        // Promise executor should be a static method by itself. We declared an unnamed function
        // which was a static method, and promiseExecutor was passed in the same scope as that
        // of the class with oThis preserved.
        oThis._promiseExecutor(...args);
      },
      {
        name: oThis._processNamePrefix + '_promise_queue_manager',
        timeoutInMilliSecs: oThis.timeoutInMilliSecs,
        maxZombieCount: Math.round(oThis.prefetchCount * 0.25),
        onMaxZombieCountReached: oThis.onMaxZombieCountReached
      }
    );

    return oThis.subscriptionTopicToDataMap[topicName]['promiseQueueManager'];
  }

  /**
   * Start subscription.
   *
   * @returns {Promise<void>}
   */
  async _startSubscription(topicName) {
    const oThis = this;

    // TODO: chain specific rabbit provider.
    const openStNotification = await rabbitMqProvider.getInstance({
      connectionWaitSeconds: connectionTimeoutConst.crons,
      switchConnectionWaitSeconds: connectionTimeoutConst.switchConnectionCrons,
      chainId: oThis.auxChainId
    });

    let subData = oThis.subscriptionTopicToDataMap[topicName];

    // below condition is to save from multiple subscriptions by command messages.
    if (oThis.subscriptionTopicToDataMap[topicName]['subscribed'] == 0) {
      oThis.subscriptionTopicToDataMap[topicName]['subscribed'] = 1;

      oThis.promiseQueueManager(topicName);

      if (subData['consumerTag']) {
        process.emit('RESUME_CONSUME', subData['consumerTag']);
      } else {
        openStNotification.subscribeEvent
          .rabbit(
            [subData.topicName],
            {
              queue: subData.queueName,
              ackRequired: oThis.ackRequired,
              prefetch: subData.prefetchCount
            },
            function(params) {
              let messageParams = JSON.parse(params);
              return oThis
                ._sequentialExecutor(messageParams)
                .then(function(response) {
                  messageParams.sequentialExecutorResponse = response.data;

                  return oThis.subscriptionTopicToDataMap[topicName]['promiseQueueManager'].createPromise(
                    messageParams
                  );
                })
                .catch(function(error) {
                  logger.error('Error in promise creation', error);
                });
            },
            function(consumerTag) {
              oThis.subscriptionTopicToDataMap[topicName]['consumerTag'] = consumerTag;
            }
          )
          .catch(function(error) {
            logger.error('Error in subscription', error);
            oThis._ostRmqError();
          });
      }
    }
  }

  /**
   * This method executes the promises.
   *
   * @param onResolve
   * @param onReject
   * @param {String} messageParams
   *
   * @returns {*}
   *
   * @private
   */
  _promiseExecutor(onResolve, onReject, messageParams) {
    const oThis = this;

    oThis._incrementUnAck(messageParams);

    oThis
      ._processMessage(messageParams)
      .then(function() {
        oThis._decrementUnAck(messageParams);
        onResolve();
      })
      .catch(function(error) {
        oThis._decrementUnAck(messageParams);
        logger.error(
          'e_r_csb_w_1',
          'Error in process message from rmq. unAckCount ->',
          oThis._getUnAck(messageParams),
          'Error: ',
          error,
          'Params: ',
          messageParams
        );
        onResolve();
      });
  }

  _ostRmqError(err) {
    logger.info('ostRmqError occurred.', err);
    process.emit('SIGINT');
  }

  /**
   * This function checks if there are any pending tasks left or not.
   *
   * @returns {Boolean}
   */
  _pendingTasksDone() {
    const oThis = this;

    for (let topicName in oThis.subscriptionTopicToDataMap) {
      let subData = oThis.subscriptionTopicToDataMap[topicName];

      if (!subData['promiseQueueManager']) {
        continue;
      }

      if (subData.unAckCount !== subData['promiseQueueManager'].getPendingCount()) {
        logger.error('ERROR :: unAckCount and pending counts are not in sync for', topicName);
      }

      if (!(subData['promiseQueueManager'].getPendingCount() == 0 && subData['unAckCount'] == 0)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Attach SIGINT/SIGTERM handlers to the current process.
   */
  attachHandlers() {
    const oThis = this;

    let handle = function() {
      for (let topicName in oThis.subscriptionTopicToDataMap) {
        oThis.stopPickingUpNewTasks(topicName);
      }

      if (oThis._pendingTasksDone()) {
        logger.info(':: No pending tasks. Changing the status ');
        cronProcessHandlerObject.stopProcess(oThis.cronProcessId).then(function() {
          logger.info('Status and last_ended_at updated in table. Killing process.');

          // Stop the process only after the entry has been updated in the table.
          process.exit(1);
        });
      } else {
        logger.info(':: There are pending tasks. Waiting for completion.');
        setTimeout(handle, 1000);
      }
    };

    process.on('SIGINT', handle);
    process.on('SIGTERM', handle);
  }

  /**
   * Stops consumption upon invocation
   */
  stopPickingUpNewTasks(topicName) {
    const oThis = this;

    oThis.subscriptionTopicToDataMap[topicName]['subscribed'] = 0;
    if (oThis.subscriptionTopicToDataMap[topicName].consumerTag) {
      logger.info(':: :: Cancelling consumption on tag=====', oThis.subscriptionTopicToDataMap[topicName].consumerTag);
      process.emit('CANCEL_CONSUME', oThis.subscriptionTopicToDataMap[topicName].consumerTag);
    }
  }

  get timeoutInMilliSecs() {
    return 3 * 60 * 1000; // By default the time out is 3 minutes
  }

  get ackRequired() {
    return 1;
  }

  onMaxZombieCountReached() {
    logger.warn('e_r_sb_1', 'maxZombieCount reached. Triggering SIGTERM.');
    // Trigger gracefully shutdown of process.
    process.kill(process.pid, 'SIGTERM');
  }

  get _processNamePrefix() {
    throw 'sub class to implement.';
  }

  _specificValidations() {
    throw 'sub class to implement.';
  }

  _processMessage() {
    throw 'sub class to implement.';
  }

  _incrementUnAck() {
    throw 'sub class to implement.';
  }

  _decrementUnAck() {
    throw 'sub class to implement.';
  }
}

module.exports = SubscriberBase;
