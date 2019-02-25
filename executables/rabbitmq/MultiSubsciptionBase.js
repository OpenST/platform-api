'use strict';
/**
 * Class for subscriber base.
 *
 * @module executables/rabbitmq/MultiSubsciptionBase
 */
const OSTBase = require('@openstfoundation/openst-base');

const rootPrefix = '../..',
  CronBase = require(rootPrefix + '/executables/CronBase'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  rabbitmqProvider = require(rootPrefix + '/lib/providers/rabbitmq'),
  connectionTimeoutConst = require(rootPrefix + '/lib/globalConstant/connectionTimeout'),
  cronProcessHandler = require(rootPrefix + '/lib/CronProcessesHandler'),
  cronProcessHandlerObject = new cronProcessHandler();

/**
 * Class for subscriber base.
 *
 * @class
 */
class MultiSubsciptionBase extends CronBase {
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

    const oThis = this;

    oThis.subscriptionTopicToDataMap = {};
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
   * Get promise queue manager for subscription topic
   *
   * @param subscriptionTopic {string}
   * @return {*}
   */
  promiseQueueManager(subscriptionTopic) {
    const oThis = this;

    let rabbitmqSubscription = oThis.subscriptionTopicToDataMap[subscriptionTopic];

    // trying to ensure that there is only one _PromiseQueueManager;
    if (rabbitmqSubscription.promiseQueueManager) return rabbitmqSubscription.promiseQueueManager;

    let qm = new OSTBase.OSTPromise.QueueManager(
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
        onMaxZombieCountReached: oThis._onMaxZombieCountReached
      }
    );

    rabbitmqSubscription.setPromiseQueueManager(qm);

    return rabbitmqSubscription.promiseQueueManager;
  }

  /**
   * Start the actual functionality of the cron.
   *
   * @returns {Promise<void>}
   *
   * @private
   */
  async _start() {
    const oThis = this;

    await oThis._beforeSubscribe();

    oThis._prepareSubscriptionData();

    await oThis._startSubscription();

    return true;
  }

  /**
   * Start subscription
   *
   * @param subscriptionTopic
   * @return {Promise<void>}
   *
   * @private
   */
  async _startSubscriptionFor(subscriptionTopic) {
    const oThis = this;

    let rabbitmqSubscription = oThis.subscriptionTopicToDataMap[subscriptionTopic];

    const openStNotification = await rabbitmqProvider.getInstance(rabbitmqSubscription.rabbitmqKind, {
      connectionWaitSeconds: connectionTimeoutConst.crons,
      switchConnectionWaitSeconds: connectionTimeoutConst.switchConnectionCrons,
      auxChainId: rabbitmqSubscription.auxChainId
    });

    // below condition is to save from multiple subscriptions by command messages.
    if (!rabbitmqSubscription.isSubscribed()) {
      rabbitmqSubscription.markAsSubscribed();

      oThis.promiseQueueManager(subscriptionTopic);

      if (rabbitmqSubscription.consumerTag) {
        process.emit('RESUME_CONSUME', rabbitmqSubscription.consumerTag);
      } else {
        openStNotification.subscribeEvent
          .rabbit(
            [rabbitmqSubscription.topic],
            {
              queue: rabbitmqSubscription.queue,
              ackRequired: oThis.ackRequired,
              prefetch: rabbitmqSubscription.prefetchCount
            },
            function(params) {
              let messageParams = JSON.parse(params);
              return oThis
                ._sequentialExecutor(messageParams)
                .then(function(response) {
                  messageParams.sequentialExecutorResponse = response.data;

                  return rabbitmqSubscription.promiseQueueManager.createPromise(messageParams);
                })
                .catch(function(error) {
                  logger.error('Error in promise creation', error);
                });
            },
            function(consumerTag) {
              rabbitmqSubscription.setConsumerTag(consumerTag);
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

  /**
   * ost rmp error
   *
   * @param err
   * @private
   */
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

    for (let topic in oThis.subscriptionTopicToDataMap) {
      let rabbitmqSubscription = oThis.subscriptionTopicToDataMap[topic];

      if (!rabbitmqSubscription.promiseQueueManager) {
        continue;
      }

      if (rabbitmqSubscription.unAckCount !== rabbitmqSubscription.promiseQueueManager.getPendingCount()) {
        logger.error('ERROR :: unAckCount and pending counts are not in sync for', topic);
      }

      if (!(rabbitmqSubscription.promiseQueueManager.getPendingCount() == 0 && rabbitmqSubscription.unAckCount == 0)) {
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
      for (let topic in oThis.subscriptionTopicToDataMap) {
        oThis._stopPickingUpNewTasks(topic);
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
  _stopPickingUpNewTasks(topic) {
    const oThis = this;

    let rabbitmqSubscription = oThis.subscriptionTopicToDataMap[topic];

    rabbitmqSubscription.stopConsumption();
  }

  /**
   * Timeout in milli seconds
   *
   * @return {number}
   */
  get timeoutInMilliSecs() {
    return 3 * 60 * 1000; // By default the time out is 3 minutes
  }

  /**
   * Ack required
   *
   * @return {number}
   */
  get ackRequired() {
    return 1;
  }

  /**
   * On max zombie count reached
   *
   * @private
   */
  _onMaxZombieCountReached() {
    logger.warn('e_r_sb_1', 'maxZombieCount reached. Triggering SIGTERM.');
    // Trigger gracefully shutdown of process.
    process.kill(process.pid, 'SIGTERM');
  }

  /**
   * Process name prefix
   *
   * @private
   */
  get _processNamePrefix() {
    throw 'sub class to implement.';
  }

  /**
   * Specific validations
   *
   * @private
   */
  _specificValidations() {
    throw 'sub class to implement.';
  }

  /**
   * Process message
   *
   * @private
   */
  _processMessage() {
    throw 'sub class to implement.';
  }

  /**
   * Increment Unack count
   *
   * @param messageParams
   * @private
   */
  _incrementUnAck(messageParams) {
    throw 'sub class to implement.';
  }

  /**
   * Decrement Unack count
   *
   * @param messageParams
   * @private
   */
  _decrementUnAck(messageParams) {
    throw 'sub class to implement.';
  }

  /**
   * Before subscribe
   *
   * @private
   */
  _beforeSubscribe() {
    throw 'sub class to implement.';
  }

  /**
   * Prepare subscription data
   *
   * @private
   */
  _prepareSubscriptionData() {
    throw 'sub class to implement.';
  }

  /**
   * Start subscription
   *
   * @private
   */
  _startSubscription() {
    throw 'sub class to implement.';
  }
}

module.exports = MultiSubsciptionBase;