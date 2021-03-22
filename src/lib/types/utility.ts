/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-empty-interface */
import type { Merge } from 'type-fest';
import type { PartialObjectDeep } from './PartialObjectDeep';

export type Dict<Value = any> = Record<string, Value>;

export type MaybePromise<T> = T | Promise<T>;

// For describing additive data
export type Final<Initial, Added> = Merge<Initial, Added>;

export type Fragment<Initial, Added> = PartialObjectDeep<Merge<Initial, Added>>;

export type Interim<Initial, Added> = Initial | Partial<Added>;
