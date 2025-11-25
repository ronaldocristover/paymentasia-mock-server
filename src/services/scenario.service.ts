import { ScenarioConfig, ScenarioRule } from '../types/payment.types';
import { config } from '../config/config';
import logger from '../utils/logger';

export class ScenarioService {
  private scenarioConfig: ScenarioConfig;

  constructor() {
    this.scenarioConfig = {
      defaultOutcome: config.payment.outcome as 'SUCCESS' | 'FAIL' | 'RANDOM',
      callbackDelay: config.payment.callbackDelay,
      processingDelay: config.payment.processingDelay,
      rules: [],
    };
  }

  /**
   * Determine payment outcome based on scenario rules
   * @param amount - Transaction amount
   * @param network - Payment network
   * @param merchantToken - Merchant token
   * @returns '1' for SUCCESS, '2' for FAIL
   */
  getOutcomeForTransaction(
    amount: string,
    network: string,
    merchantToken: string
  ): '1' | '2' {
    // Check rules first
    for (const rule of this.scenarioConfig.rules) {
      if (this.ruleMatches(rule, amount, network)) {
        logger.info('Scenario rule matched', { rule, amount, network });
        return rule.outcome === 'SUCCESS' ? '1' : '2';
      }
    }

    // Use default outcome
    const outcome = this.scenarioConfig.defaultOutcome;

    if (outcome === 'RANDOM') {
      const randomOutcome = Math.random() > 0.5 ? '1' : '2';
      logger.info('Random outcome selected', { outcome: randomOutcome });
      return randomOutcome;
    }

    const result = outcome === 'SUCCESS' ? '1' : '2';
    logger.info('Default outcome used', { outcome: result });
    return result;
  }

  /**
   * Check if a rule matches the transaction
   */
  private ruleMatches(rule: ScenarioRule, amount: string, network: string): boolean {
    switch (rule.condition) {
      case 'amount_ends_with':
        return amount.endsWith(rule.value);
      case 'amount_equals':
        return amount === rule.value;
      case 'network':
        return network === rule.value;
      default:
        return false;
    }
  }

  /**
   * Set scenario configuration
   */
  setScenario(scenario: Partial<ScenarioConfig>): void {
    this.scenarioConfig = {
      ...this.scenarioConfig,
      ...scenario,
    };
    logger.info('Scenario configuration updated', { scenario: this.scenarioConfig });
  }

  /**
   * Get current scenario rules
   */
  getScenarioRules(): ScenarioConfig {
    return this.scenarioConfig;
  }

  /**
   * Add a scenario rule
   */
  addRule(rule: ScenarioRule): void {
    this.scenarioConfig.rules.push(rule);
    logger.info('Scenario rule added', { rule });
  }

  /**
   * Clear all scenario rules
   */
  clearRules(): void {
    this.scenarioConfig.rules = [];
    logger.info('All scenario rules cleared');
  }
}

export const scenarioService = new ScenarioService();

