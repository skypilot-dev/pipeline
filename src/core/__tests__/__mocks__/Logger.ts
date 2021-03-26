export const Logger = {
  indentWidth: 2,
  sectionBreakWidth: 40,
  sectionBreak: '-'.repeat(40),
  verbose: false,

  add: jest.fn().mockImplementation(),
  addSectionBreak: jest.fn().mockImplementation(),
  computeIndent: jest.fn().mockImplementation(),
  display: jest.fn().mockImplementation(),
  format: jest.fn().mockImplementation(),
  get: jest.fn().mockImplementation(),
  getPaths: jest.fn().mockImplementation(),
  write: jest.fn().mockImplementation(),
} as any; // see https://stackoverflow.com/questions/35987055/

module.exports = () => Logger;
