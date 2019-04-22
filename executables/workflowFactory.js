/**
 * Factory class for workflowRouter.
 *
 * @module executables/workflowFactory
 */

const program = require('commander');

const rootPrefix = '..',
  RabbitmqSubscription = require(rootPrefix + '/lib/entity/RabbitSubscription'),
  MultiSubscriptionBase = require(rootPrefix + '/executables/rabbitmq/MultiSubscriptionBase'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  rabbitmqConstants = require(rootPrefix + '/lib/globalConstant/rabbitmq'),
  workflowTopicConstant = require(rootPrefix + '/lib/globalConstant/workflowTopic'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses');

program.option('--cronProcessId <cronProcessId>', 'Cron table process ID').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/workflowFactory.js --cronProcessId 3');
  logger.log('');
  logger.log('');
});

if (!program.cronProcessId) {
  program.help();
  process.exit(1);
}

/**
 * Class for workflow router factory.
 *
 * @class WorkflowRouterFactory
 */
class WorkflowRouterFactory extends MultiSubscriptionBase {
  /**
   * Constructor for workflow router factory.
   *
   * @augments MultiSubscriptionBase
   *
   * @param {object} params: params object
   * @param {number} params.cronProcessId: cron_processes table id
   *
   * @constructor
   */
  constructor(params) {
    super(params);
  }

  /**
   * Process name prefix
   *
   * @returns {string}
   * @private
   */
  get _processNamePrefix() {
    return 'workflow_processor';
  }

  /**
   * Topics to subscribe
   *
   * @returns {*[]}
   * @private
   */
  get _topicsToSubscribe() {
    return ['workflow.#'];
  }

  /**
   * Queue name.
   *
   * @returns {string}
   * @private
   */
  get _queueName() {
    return 'workflow';
  }

  /**
   * Specific validations
   *
   * @returns {boolean}
   * @private
   */
  _specificValidations() {
    // Add specific validations here
    return true;
  }

  /**
   * Cron kind.
   *
   * @returns {string}
   * @private
   */
  get _cronKind() {
    return cronProcessesConstants.workflowWorker;
  }

  /**
   * Steps to do before subscribe.
   *
   * @return {Promise<boolean>}
   * @private
   */
  async _beforeSubscribe() {
    return true;
  }

  /**
   * Prepare subscription data.
   *
   * @returns {{}}
   * @private
   */
  _prepareSubscriptionData() {
    const oThis = this;

    oThis.subscriptionTopicToDataMap[oThis._topicsToSubscribe[0]] = new RabbitmqSubscription({
      rabbitmqKind: rabbitmqConstants.globalRabbitmqKind,
      topic: oThis._topicsToSubscribe[0],
      queue: oThis._queueName,
      prefetchCount: oThis.prefetchCount
    });
  }

  /**
   * Process message.
   *
   * @param {object} messageParams
   * @param {string} messageParams.stepKind: Which step to execute in router
   * @param {number} messageParams.currentStepId: id of process parent
   * @param {number} messageParams.parentStepId: id of process parent
   * @param {string} messageParams.status
   * @param {object} messageParams.payload
   *
   * @returns {Promise<>}
   *
   * @private
   */
  async _processMessage(messageParams) {
    // Identify which file/function to initiate to execute task of specific kind.
    // Query in workflow_steps to get details pf parent id in message params
    const msgParams = messageParams.message.payload;
    msgParams.topic = messageParams.topics[0];

    switch (msgParams.topic) {
      case workflowTopicConstant.test: {
        const testProcessRouter = require(rootPrefix + '/lib/workflow/test/Router');

        return new testProcessRouter(msgParams).perform();
      }

      case workflowTopicConstant.stateRootSync: {
        const stateRootSyncRouter = require(rootPrefix + '/lib/workflow/stateRootSync/Router');

        return new stateRootSyncRouter(msgParams).perform();
      }

      case workflowTopicConstant.economySetup: {
        const EconomySetupRouter = require(rootPrefix + '/lib/workflow/economySetup/Router');

        return new EconomySetupRouter(msgParams).perform();
      }

      case workflowTopicConstant.stPrimeStakeAndMint: {
        const stPrimeRouter = require(rootPrefix + '/lib/workflow/stakeAndMint/stPrime/Router');

        return new stPrimeRouter(msgParams).perform();
      }

      case workflowTopicConstant.btStakeAndMint: {
        const BtStakeAndMintRouter = require(rootPrefix + '/lib/workflow/stakeAndMint/brandedToken/Router');

        return new BtStakeAndMintRouter(msgParams).perform();
      }

      case workflowTopicConstant.stPrimeRedeemAndUnstake: {
        const stPrimeRedeemRouter = require(rootPrefix + '/lib/workflow/redeemAndUnstake/stPrime/Router');
        return new stPrimeRedeemRouter(msgParams).perform();
      }

      case workflowTopicConstant.btRedeemAndUnstake: {
        const BTRedeemRouter = require(rootPrefix + '/lib/workflow/redeemAndUnstake/brandToken/Router');
        return new BTRedeemRouter(msgParams).perform();
      }

      case workflowTopicConstant.grantEthOst: {
        const GrantEthOstRouter = require(rootPrefix + '/lib/workflow/grantEthOst/Router');

        return new GrantEthOstRouter(msgParams).perform();
      }

      default:
        throw new Error(`Unsupported workflow topic ${messageParams.topics[0]}`);
    }
  }

  /**
   * Start subscription.
   *
   * @return {Promise<void>}
   * @private
   */
  async _startSubscription() {
    const oThis = this;

    await oThis._startSubscriptionFor(oThis._topicsToSubscribe[0]);
  }
}

logger.step('Workflow Router Factory started.');

new WorkflowRouterFactory({ cronProcessId: +program.cronProcessId }).perform();

setInterval(function() {
  logger.info('Ending the process. Sending SIGINT.');
  process.emit('SIGINT');
}, cronProcessesConstants.continuousCronRestartInterval);
