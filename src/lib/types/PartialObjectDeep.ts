/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-empty-interface */

/* The types below have been adapted from `type-fest` to support independent use of `PartialObjectDeep`
 * (`type-fest` exports only `PartialDeep`). It may be possible to wrap `PartialDeep` to achieve the same effect.
 * */

export type PartialObjectDeep<ObjectType extends object> = {
  [KeyType in keyof ObjectType]?: PartialDeep<ObjectType[KeyType]>
};

type PartialDeep<T> = T extends Primitive
  ? never
  : T extends Map<infer KeyType, infer ValueType>
    ? PartialMapDeep<KeyType, ValueType>
    : T extends Set<infer ItemType>
      ? PartialSetDeep<ItemType>
      : T extends ReadonlyMap<infer KeyType, infer ValueType>
        ? PartialReadonlyMapDeep<KeyType, ValueType>
        : T extends ReadonlySet<infer ItemType>
          ? PartialReadonlySetDeep<ItemType>
          // @ts-ignore
          : T extends object
            ? PartialObjectDeep<T>
            : unknown;

interface PartialMapDeep<KeyType, ValueType> extends Map<PartialDeep<KeyType>, PartialDeep<ValueType>> {}

interface PartialReadonlyMapDeep<KeyType, ValueType> extends ReadonlyMap<PartialDeep<KeyType>, PartialDeep<ValueType>> {}

interface PartialReadonlySetDeep<T> extends ReadonlySet<PartialDeep<T>> {}

type PartialSetDeep<T> = Set<PartialDeep<T>>

type Primitive =
  | null
  | undefined
  | string
  | number
  | boolean
  | symbol
  | bigint;
