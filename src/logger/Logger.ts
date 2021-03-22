/* eslint-disable @typescript-eslint/ban-ts-comment */

import fs from 'fs';
import path from 'path';
import type { Integer } from '@skypilot/common-types';
import { consoleIf, getLastItem } from '@skypilot/sugarbowl';
import beautify from 'json-beautify';

import { toUtcDateTimeText } from './toUtcDateTimeText';

interface AddOptions {
  sectionBreakAfter?: boolean;
  sectionBreakBefore?: boolean;
  prefix?: string;
  prependTimestamp?: boolean;
  runLevel?: Integer;
}

interface LoggerParams {
  logDir?: string;
  logFileName?: string;
  verbose?: boolean;
}

export class Logger {
  indentWidth = 2;
  sectionBreakWidth = 40;
  sectionBreak = '-'.repeat(this.sectionBreakWidth);
  verbose: boolean;

  private log: string[] = [];
  private readonly logDir: string;
  private readonly logFileName: string;

  constructor(params: LoggerParams = {}) {
    // If the file name is empty, saving to a file via `write` is disabled
    const { logDir = 'logs', logFileName = '', verbose = false } = params;
    this.logDir = logDir;
    this.logFileName = logFileName;
    this.verbose = verbose;

    this.add('Log created', { prependTimestamp: true, sectionBreakAfter: true });
  }

  add(message: string | Record<string, any>, options: AddOptions = {}): void {
    const { prefix = '', prependTimestamp, runLevel = 0, sectionBreakAfter, sectionBreakBefore } = options;

    const indent = this.computeIndent(runLevel);
    const timestamp = prependTimestamp ? `${toUtcDateTimeText()} | ` : '';

    const messageBlock = typeof message === 'string'
      ? message
      // @ts-ignore // ignore the erroneous typing in `json-beautify`
      : beautify(message, null, 2, 100);
    const lines = messageBlock.split('\n');

    const resolvedPrefix = (typeof message === 'string' || !prefix)
      ? prefix
      : `${prefix}: `; // TODO: Use the same behaviour for objects as for strings?
    const formattedLines: string[] = [];
    if (sectionBreakBefore) {
      this.addSectionBreak(runLevel);
    }
    lines.forEach((line, index) => {
      const formattedLine = `${indent}${timestamp}${index ? '' : resolvedPrefix}${line}`;
      formattedLines.push(formattedLine);
    });
    this.log.push(...formattedLines);
    if (sectionBreakAfter) {
      this.addSectionBreak(runLevel);
    }
    consoleIf(this.verbose)(formattedLines.join('\n'));
  }

  // TODO: Allow a section heading to be added
  addSectionBreak(runLevel: Integer = 1): void {
    if (!(getLastItem(this.log, { defaultValue: '' }).includes(this.sectionBreak))) {
      this.log.push(this.computeIndent(runLevel) + this.sectionBreak);
    }
  }

  computeIndent(runLevel: Integer = 1): string {
    const indentLevel = Math.max(0, runLevel - 1);
    return ' '.repeat(this.indentWidth * indentLevel);
  }

  display(): void {
    // eslint-disable-next-line no-console
    console.log(this.format());
  }

  format(): string {
    // TODO: Possibly, offer other formats
    return this.log.join('\n');
  }

  get(): string[] {
    return this.log;
  }

  getPaths(): { fullDirPath: string; fullFilePath: string } {
    const fullDirPath = this.logDir ? path.resolve(this.logDir) : '';
    const fullFilePath = this.logFileName ? path.join(fullDirPath, this.logFileName) : '';
    return { fullDirPath, fullFilePath };
  }

  write(): void {
    // Do nothing if no file name was given
    if (!this.logFileName) {
      return;
    }

    this.add('Log written', { prependTimestamp: true, sectionBreakBefore: true });

    const { fullDirPath, fullFilePath } = this.getPaths();
    fs.mkdirSync(fullDirPath, { recursive: true });
    fs.writeFileSync(fullFilePath, this.format());
  }
}
