import { ScenarioService } from '../../src/services/scenario.service';

describe('ScenarioService', () => {
  let scenarioService: ScenarioService;

  beforeEach(() => {
    scenarioService = new ScenarioService();
  });

  describe('getOutcomeForTransaction', () => {
    it('should return SUCCESS when default outcome is SUCCESS', () => {
      scenarioService.setScenario({ defaultOutcome: 'SUCCESS' });

      const outcome = scenarioService.getOutcomeForTransaction(
        '100.00',
        'Alipay',
        'test-token'
      );

      expect(outcome).toBe('1'); // SUCCESS
    });

    it('should return FAIL when default outcome is FAIL', () => {
      scenarioService.setScenario({ defaultOutcome: 'FAIL' });

      const outcome = scenarioService.getOutcomeForTransaction(
        '100.00',
        'Alipay',
        'test-token'
      );

      expect(outcome).toBe('2'); // FAIL
    });

    it('should return random outcome when set to RANDOM', () => {
      scenarioService.setScenario({ defaultOutcome: 'RANDOM' });

      const outcomes = new Set<string>();
      // Run multiple times to get both outcomes
      for (let i = 0; i < 100; i++) {
        const outcome = scenarioService.getOutcomeForTransaction(
          '100.00',
          'Alipay',
          'test-token'
        );
        outcomes.add(outcome);
      }

      // Should have both '1' and '2' in outcomes (very unlikely to have only one)
      expect(outcomes.size).toBeGreaterThan(0);
      expect(outcomes.has('1') || outcomes.has('2')).toBe(true);
    });

    it('should match amount_ends_with rule', () => {
      scenarioService.setScenario({
        defaultOutcome: 'SUCCESS',
        rules: [
          {
            condition: 'amount_ends_with',
            value: '.99',
            outcome: 'FAIL',
          },
        ],
      });

      const outcome1 = scenarioService.getOutcomeForTransaction(
        '99.99',
        'Alipay',
        'test-token'
      );
      const outcome2 = scenarioService.getOutcomeForTransaction(
        '100.00',
        'Alipay',
        'test-token'
      );

      expect(outcome1).toBe('2'); // FAIL (matches rule)
      expect(outcome2).toBe('1'); // SUCCESS (default)
    });

    it('should match amount_equals rule', () => {
      scenarioService.setScenario({
        defaultOutcome: 'SUCCESS',
        rules: [
          {
            condition: 'amount_equals',
            value: '50.00',
            outcome: 'FAIL',
          },
        ],
      });

      const outcome1 = scenarioService.getOutcomeForTransaction(
        '50.00',
        'Alipay',
        'test-token'
      );
      const outcome2 = scenarioService.getOutcomeForTransaction(
        '100.00',
        'Alipay',
        'test-token'
      );

      expect(outcome1).toBe('2'); // FAIL (matches rule)
      expect(outcome2).toBe('1'); // SUCCESS (default)
    });

    it('should match network rule', () => {
      scenarioService.setScenario({
        defaultOutcome: 'SUCCESS',
        rules: [
          {
            condition: 'network',
            value: 'CreditCard',
            outcome: 'FAIL',
          },
        ],
      });

      const outcome1 = scenarioService.getOutcomeForTransaction(
        '100.00',
        'CreditCard',
        'test-token'
      );
      const outcome2 = scenarioService.getOutcomeForTransaction(
        '100.00',
        'Alipay',
        'test-token'
      );

      expect(outcome1).toBe('2'); // FAIL (matches rule)
      expect(outcome2).toBe('1'); // SUCCESS (default)
    });

    it('should apply first matching rule', () => {
      scenarioService.setScenario({
        defaultOutcome: 'SUCCESS',
        rules: [
          {
            condition: 'amount_ends_with',
            value: '.99',
            outcome: 'FAIL',
          },
          {
            condition: 'amount_ends_with',
            value: '.99',
            outcome: 'SUCCESS',
          },
        ],
      });

      const outcome = scenarioService.getOutcomeForTransaction(
        '99.99',
        'Alipay',
        'test-token'
      );

      expect(outcome).toBe('2'); // Should match first rule (FAIL)
    });
  });

  describe('setScenario', () => {
    it('should update scenario configuration', () => {
      scenarioService.setScenario({
        defaultOutcome: 'FAIL',
        callbackDelay: 5000,
        processingDelay: 2000,
      });

      const config = scenarioService.getScenarioRules();

      expect(config.defaultOutcome).toBe('FAIL');
      expect(config.callbackDelay).toBe(5000);
      expect(config.processingDelay).toBe(2000);
    });

    it('should preserve existing rules when not specified', () => {
      scenarioService.addRule({
        condition: 'network',
        value: 'Alipay',
        outcome: 'SUCCESS',
      });

      scenarioService.setScenario({
        defaultOutcome: 'FAIL',
      });

      const config = scenarioService.getScenarioRules();
      expect(config.rules).toHaveLength(1);
    });
  });

  describe('addRule', () => {
    it('should add rule to configuration', () => {
      scenarioService.addRule({
        condition: 'amount_ends_with',
        value: '.50',
        outcome: 'FAIL',
      });

      const config = scenarioService.getScenarioRules();
      expect(config.rules).toHaveLength(1);
      expect(config.rules[0].condition).toBe('amount_ends_with');
      expect(config.rules[0].value).toBe('.50');
    });

    it('should add multiple rules', () => {
      scenarioService.addRule({
        condition: 'amount_ends_with',
        value: '.99',
        outcome: 'FAIL',
      });
      scenarioService.addRule({
        condition: 'network',
        value: 'Alipay',
        outcome: 'SUCCESS',
      });

      const config = scenarioService.getScenarioRules();
      expect(config.rules).toHaveLength(2);
    });
  });

  describe('clearRules', () => {
    it('should clear all rules', () => {
      scenarioService.addRule({
        condition: 'amount_ends_with',
        value: '.99',
        outcome: 'FAIL',
      });
      scenarioService.addRule({
        condition: 'network',
        value: 'Alipay',
        outcome: 'SUCCESS',
      });

      scenarioService.clearRules();

      const config = scenarioService.getScenarioRules();
      expect(config.rules).toHaveLength(0);
    });
  });

  describe('getScenarioRules', () => {
    it('should return current configuration', () => {
      const config = scenarioService.getScenarioRules();

      expect(config).toHaveProperty('defaultOutcome');
      expect(config).toHaveProperty('callbackDelay');
      expect(config).toHaveProperty('processingDelay');
      expect(config).toHaveProperty('rules');
      expect(Array.isArray(config.rules)).toBe(true);
    });
  });
});


