import fs from 'fs';
import { makeTempDir } from '@skypilot/sugarbowl';

import type { Dict, MaybePromise } from 'src/lib/types';
import { Pipeline } from '../Pipeline';
import type { StepFilter } from '../Pipeline';

const logDir = makeTempDir('Pipeline-class', { baseDir: 'Pipeline-package' });

describe('Pipeline class', () => {
  describe('instantiation', () => {
    it('should accept an initial context', async () => {
      const context = { a: 1 };

      const pipeline = new Pipeline(context);

      expect(pipeline.context).toStrictEqual(context);
    });

    it('if a logFileName is given, should write to a log', async () => {
      const pipeline = new Pipeline({}, { logDir, logFileName: 'no-steps-in-pipeline.log' });
      await pipeline.run();

      const { fullFilePath } = pipeline.logger.getPaths();
      expect(fs.existsSync(fullFilePath)).toBe(true);
    });
  });

  describe('addStep(:Step | :StepParams)', () => {
    it('given a Step created by the Pipeline, should add it to the Pipeline instance', async () => {
      const pipeline = new Pipeline();
      const stepOutput = { a: 1 };

      const step = pipeline.createStep({ name: 'test-step', handle: () => stepOutput });
      pipeline.addStep(step);

      expect(pipeline.steps).toHaveLength(1);

      // Prove that the step is part of the pipeline
      const finalValue = await pipeline.run();
      expect(finalValue).toStrictEqual(stepOutput);
    });

    it('given StepParams, should create a Step with them & add it to the Pipeline instance', async () => {
      const pipeline = new Pipeline();
      const stepOutput = { a: 1 };

      pipeline.addStep({ handle: () => stepOutput });

      expect(pipeline.steps).toHaveLength(1);

      // Prove that the step is part of the pipeline
      const finalValue = await pipeline.run();
      expect(finalValue).toStrictEqual(stepOutput);
    });

    it('should refuse to add a step created in a different Pipeline', () => {
      const pipeline = new Pipeline();
      const otherPipeline = new Pipeline();
      const stepOutput = { a: 1 };

      const step = pipeline.createStep({ name: 'test-step', handle: () => stepOutput });

      expect(() => {
        otherPipeline.addStep(step);
      }).toThrow('The step was created in a different pipeline');
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

    it('steps can write to the log', async () => {
      const pipeline = new Pipeline({}, { logDir, logFileName: 'step-writes-to-log.log' });
      const message = 'This step writes to the log';

      pipeline.addStep({
        handle: (_context, { logger }) => logger.add(message),
      });
      await pipeline.run();

      const { fullFilePath } = pipeline.logger.getPaths();

      const inMemoryLog = pipeline.logger.format();
      expect(inMemoryLog).toMatch(message);

      const writtenLog = fs.readFileSync(fullFilePath, { encoding: 'utf-8' });
      expect(writtenLog).toMatch(message);
    });
  });

  describe('createStep(:StepParams)', () => {
    it('should create & return a Step without adding it to the Pipeline', async () => {
      const pipeline = new Pipeline();
      const stepOutput = { a: 1 };

      const step = pipeline.createStep({ name: 'test-step', handle: () => stepOutput });
      expect(step.name).toBe('test-step');

      // Prove that the step is not part of the pipeline
      expect(pipeline.steps).toHaveLength(0);
      const finalValue = await pipeline.run();
      expect(finalValue).toStrictEqual({});
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
        const pipeline = new Pipeline({}, { logDir, logFileName: 'slice-1.log' })
          .addStep({ handle: () => ({ step0: 'Include' }) })
          .addStep({ handle: () => ({ step1: 'Do not include' }) });
        const expected = { step0: 'Include' };

        const output = await pipeline.run({ slice: [0, 1] });

        expect(output).toStrictEqual(expected);
      }

      // slice(1): Run step 1 onward
      {
        const pipeline = new Pipeline({}, { logDir, logFileName: 'slice-2.log' })
          .addStep({ handle: () => ({ step0: 'Do not include' }) })
          .addStep({ handle: () => ({ step1: 'Include' }) })
          .addStep({ handle: () => ({ step2: 'Include' }) });
        const expected = { step1: 'Include', step2: 'Include' };

        const output = await pipeline.run({ slice: [1] });

        expect(output).toStrictEqual(expected);
      }

      // slice(1, -1): Run from step 1 to second to last
      {
        const pipeline = new Pipeline({}, { logDir, logFileName: 'slice-3.log' })
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

    it('if excludeSteps is given, should not run those steps ', async () => {
      {
        const pipeline = new Pipeline({}, { logDir, logFileName: 'exclude-steps' })
          .addStep({ handle: () => ({ step0: 'step0' }), name: 'step0' })
          .addStep({ handle: () => ({ step1: 'excluded' }), name: 'step1' })
          .addStep({ handle: () => ({ step2: 'step2' }), name: 'step2' });

        await expect(
          await pipeline.run({ excludeSteps: ['step1'] })
        ).toStrictEqual({ step0: 'step0', step2: 'step2' });
      }
    });

    it('if includeSteps is given, should run only those steps', async () => {
      {
        const pipeline = new Pipeline({}, { logDir, logFileName: 'include-steps' })
          .addStep({ handle: () => ({ step0: 'step0' }), name: 'step0' })
          .addStep({ handle: () => ({ step1: 'included' }), name: 'step1' })
          .addStep({ handle: () => ({ step2: 'included' }), name: 'step2' });

        await expect(
          await pipeline.run({ includeSteps: ['step1', 'step2'] })
        ).toStrictEqual({ step1: 'included', step2: 'included' });
      }
    });

    it('if an error occurs in a step, should record it to the log and write the log', async () => {
      {
        const pipeline = new Pipeline({}, { logDir, logFileName: 'error-in-step.log' })
          .addStep({
            handle: () => ({ goodStep: 'this should be saved' }),
            name: 'goodStep',
          })
          .addStep({
            name: 'badStep',
            handle: () => {
              throw new Error('Error in badStep');
            },
          });

        await expect(
          pipeline.run()
        ).rejects.toThrow();

        // Despite the error, the log should exist
        const { fullFilePath } = pipeline.logger.getPaths();
        expect(fs.existsSync(fullFilePath)).toBe(true);

        // Data captured up to the time of the error should be in the context
        expect(pipeline.context).toStrictEqual({ goodStep: 'this should be saved' });
      }
    });

    it('if validation fails, should reject', async () => {
      const pipeline = new Pipeline()
        .addStep({ handle: () => ({}), dependsOn: ['dependency'] });

      await expect(pipeline.run()).rejects.toThrow();
    });
  });

  describe('validate(:StepFilters)', () => {
    it('when no step has a dependency, should return an empty errors array', () => {
      const pipeline = new Pipeline();
      pipeline.addStep({ handle: () => ({}) });

      const { errors } = pipeline.validate();
      expect(errors).toHaveLength(0);
    });

    it('when no included step has a dependency, should return an empty errors array', () => {
      const pipeline = new Pipeline();
      pipeline.addStep({ name: 'dependent', handle: () => ({}), dependsOn: ['dependency'] });

      const { errors } = pipeline.validate({ includeSteps: [] });
      expect(errors).toHaveLength(0);
    });

    it('when a dependency occurs before its dependent, should return an empty errors array', () => {
      const pipeline = new Pipeline();
      pipeline.addStep({ name: 'dependency', handle: () => ({}) });
      pipeline.addStep({ name: 'dependent', handle: () => ({}), dependsOn: ['dependency'] });

      const { errors } = pipeline.validate();

      expect(errors).toHaveLength(0);
    });

    it('when a dependency occurs after its dependent, should return an error message', () => {
      const pipeline = new Pipeline();
      pipeline.addStep({ name: 'dependent', handle: () => ({}), dependsOn: ['dependency'] });
      pipeline.addStep({ name: 'dependency', handle: () => ({}) });

      const { errors } = pipeline.validate();

      expect(errors).toHaveLength(1);
      expect(errors[0]).toBe("Step 'dependent' occurs before its dependency 'dependency'");
    });

    it('when required dependencies are excluded, should report each in the errors array', () => {
      const pipeline = new Pipeline();
      pipeline.addStep({ name: 'dependency1', handle: () => ({}) });
      pipeline.addStep({ name: 'dependency2', handle: () => ({}) });
      pipeline.addStep({ name: 'dependent', handle: () => ({}), dependsOn: ['dependency1', 'dependency2'] });

      const stepFilters: StepFilter[] = [
        { slice: [-2] },
        { includeSteps: ['dependency2', 'dependent'] },
        { excludeSteps: ['dependency1'] },
      ];
      stepFilters.forEach(stepFilter => {
        const { errors } = pipeline.validate(stepFilter);
        expect(errors).toHaveLength(1);
        expect(errors[0]).toBe("Step 'dependency1' required by 'dependent' is not in the pipeline");
      });

      const stepFilter = { includeSteps: ['dependent'] };
      const { errors } = pipeline.validate(stepFilter);
      expect(errors).toStrictEqual([
        "Step 'dependency1' required by 'dependent' is not in the pipeline",
        "Step 'dependency2' required by 'dependent' is not in the pipeline",
      ]);
    });
  });
});
