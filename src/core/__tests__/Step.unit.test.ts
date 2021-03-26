import { Step } from '../Step';
import { Logger } from './__mocks__/Logger';

jest.mock('src/logger/Logger');

const logger = Logger;

describe('Step class', () => {
  describe('instantiation', () => {
    it('can be instantiated without a pipeline reference', () => {
      const step = new Step({
        name: 'test-step',
        handle: () => ({}),
      });

      expect(step).toBeInstanceOf(Step);
      expect(step.name).toBe('test-step');
    });
  });

  describe('run', () => {
    it('should return the result of its handle method', async () => {
      const step = new Step({
        name: 'test-step',
        handle: () => ({ a: 1 }),
      });

      await expect(
        step.run({}, { logger })
      ).resolves.toStrictEqual({ a: 1 });
    });

    it('if input is required, should reject if the input is not provided', async () => {
      type Initial = { input: number };
      type Final = { input: number; output: number };
      const step = new Step<Initial, Final>({
        name: 'test-step',
        handle: context => ({ output: (context.input || 0) + 1 }),
        inputs: {
          'input': { required: true },
        },
      });

      await expect(step.run({ input: 1 })).resolves.not.toThrow();
      await expect(step.run({})).rejects.toThrow('Invalid input');
    });
  });

  describe('validateInputs', () => {
    it('if context satisfies the inputs, should return a ValidationResult containing no events', async () => {
      const step = new Step({
        name: 'test-step',
        handle: () => ({ a: 1 }),
        inputs: {
          'branch.leaf': { required: true },
        },
      });

      const validationResult = step.validateInputs({ branch: { leaf: 1 } });
      expect(validationResult.success).toBe(true);
      expect(validationResult.errors).toHaveLength(0);
      expect(validationResult.messages).toHaveLength(0);
    });

    it('if context does not satisfy the inputs, should return a ValidationResult containing error events', async () => {
      const step = new Step({
        name: 'test-step',
        handle: () => ({ a: 1 }),
        inputs: {
          'branch.leaf1': { required: true },
          'branch.leaf2': { required: true },
        },
      });

      const validationResult = step.validateInputs({});
      // expect(validationResult.success).toBe(false);
      expect(validationResult.errors).toHaveLength(2);
      expect(validationResult.messages).toStrictEqual([
        "Error: Missing required context path 'branch.leaf1'",
        "Error: Missing required context path 'branch.leaf2'",
      ]);
    });
  });
});
