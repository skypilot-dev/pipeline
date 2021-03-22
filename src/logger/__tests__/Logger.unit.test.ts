import { Logger } from '../Logger';

describe('Logger class', () => {
  describe('add(message: string)', () => {
    it('should add the message to the log', () => {
      const logger = new Logger();
      const messages = [
        '1st message',
        '2nd message',
      ];

      logger.add(messages[0]);
      logger.add(messages[1]);

      expect(logger.get().slice(2)).toStrictEqual(messages);
    });

    it('given a `runLevel` option, should indent the message 2 spaces per run level', () => {
      const logger = new Logger();
      const messages = [
        'run level: 1',
        'run level: 2',
        { runLevel: 3 },
      ];

      messages.forEach((message, index) => {
        logger.add(message, { runLevel: index + 1 });
      });

      expect(logger.get().slice(2)).toStrictEqual([
        'run level: 1',
        '  run level: 2',
        '    { "runLevel": 3 }',
      ]);
    });

    it('given a `prefix` option with a string, should prepend the prefix to the message', () => {
      const logger = new Logger();
      const message = 'Message';
      const prefix = 'Prefix: ';

      logger.add(message, { prefix });

      expect(logger.get().slice(2)).toStrictEqual([
        'Prefix: Message',
      ]);
    });
  });
});
