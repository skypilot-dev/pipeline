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
  });
});
