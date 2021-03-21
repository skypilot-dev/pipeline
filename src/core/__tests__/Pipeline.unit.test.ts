import type { Dict, MaybePromise } from 'src/lib/types';
import { Pipeline } from '../Pipeline';

describe('Pipeline class', () => {
  describe('instantiation', () => {
    it('should accept an initial context', async () => {
      const context = { a: 1 };

      const pipeline = new Pipeline(context);

      expect(pipeline.context).toStrictEqual(context);
    });
  });

  describe('addStep', () => {
    it('should add a Step to the Pipeline instance', async () => {
      const pipeline = new Pipeline();
      const stepOutput = { a: 1 };

      pipeline.addStep({ handle: () => stepOutput });

      // Prove that the step is part of the pipeline
      const finalValue = await pipeline.run();
      expect(finalValue).toStrictEqual(stepOutput);
    });

    it('can chain method calls', async () => {
      const pipeline = new Pipeline();
      const step1Output = { a: 1 };
      const step2Output = { b: 2 };

      const finalValue = await pipeline
        .addStep({ handle: () => step1Output })
        .addStep({ handle: () => step2Output })
        .run();

      expect(finalValue).toStrictEqual({ a: 1, b: 2 });
    });

    it('accepts both synchronous & asynchronous handlers', async () => {
      type Handler = () => MaybePromise<Dict>;

      const pipeline = new Pipeline();
      const syncHandler: Handler = () => ({ a: 1 });
      const asyncHandler: Handler = async () => ({ b: 2 });
      const timeoutHandler: Handler = () => new Promise(resolve => {
        setTimeout(() => resolve({ a: 3, c: 4 }));
      });

      const finalValue = await pipeline
        .addStep({ handle: syncHandler })
        .addStep({ handle: asyncHandler })
        .addStep({ handle: timeoutHandler })
        .run();

      expect(finalValue).toStrictEqual({ a: 3, b: 2, c: 4 });
    });
  });

  describe('run()', () => {
    it('when there are no steps, should return the initial context', async () => {
      // Pipeline without context
      {
        const pipeline = new Pipeline();

        const output1 = await pipeline.run();

        expect(output1).toStrictEqual({});
      }

      // Pipeline  with context
      {
        const context = { a: { b: 1 } };
        const pipeline = new Pipeline(context);

        const output = await pipeline.run();

        expect(output).toStrictEqual(context);
        expect(output).not.toBe(context);
      }
    });

    it('if slice is specified, should run only the steps included in the slice', async () => {
      // slice(0, 1): Run only step 0
      {
        const pipeline = new Pipeline()
          .addStep({ handle: () => ({ step0: 'Include' }) })
          .addStep({ handle: () => ({ step1: 'Do not include' }) });
        const expected = { step0: 'Include' };

        const output = await pipeline.run({ slice: [0, 1] });

        expect(output).toStrictEqual(expected);
      }

      // slice(1): Run step 1 onward
      {
        const pipeline = new Pipeline()
          .addStep({ handle: () => ({ step0: 'Do not include' }) })
          .addStep({ handle: () => ({ step1: 'Include' }) })
          .addStep({ handle: () => ({ step2: 'Include' }) });
        const expected = { step1: 'Include', step2: 'Include' };

        const output = await pipeline.run({ slice: [1] });

        expect(output).toStrictEqual(expected);
      }

      // slice(1, -1): Run from step 1 to second to last
      {
        const pipeline = new Pipeline()
          .addStep({ handle: () => ({ step0: 'Do not include' }) })
          .addStep({ handle: () => ({ step1: 'Include' }) })
          .addStep({ handle: () => ({ step2: 'Include' }) });
        const expected = { step1: 'Include' };

        const output = await pipeline.run({ slice: [1, -1] });

        expect(output).toStrictEqual(expected);
      }

      // slice(-2): Run from second-to-last onward
      {
        const pipeline = new Pipeline()
          .addStep({ handle: () => ({ step0: 'Do not include' }) })
          .addStep({ handle: () => ({ step1: 'Include' }) })
          .addStep({ handle: () => ({ step2: 'Include' }) });
        const expected = { step1: 'Include', step2: 'Include' };

        const output = await pipeline.run({ slice: [-2] });

        expect(output).toStrictEqual(expected);
      }

      // slice(4): Run from 4th indexed step onward (i.e., none)
      {
        const pipeline = new Pipeline()
          .addStep({ handle: () => ({ step0: 'Do not include' }) })
          .addStep({ handle: () => ({ step1: 'Do not include' }) })
          .addStep({ handle: () => ({ step2: 'Do not include' }) });
        const expected = {};

        const output = await pipeline.run({ slice: [4] });

        expect(output).toStrictEqual(expected);
      }
    });
  });
});