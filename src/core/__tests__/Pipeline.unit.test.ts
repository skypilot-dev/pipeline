import { Pipeline } from '../Pipeline';

describe('Pipeline class', () => {
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
  });
});
