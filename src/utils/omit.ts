export function omit<TObject, TKeys extends (keyof TObject)[]>(
  object: TObject,
  keys: TKeys,
): Omit<TObject, TKeys[number]> {
  return Object.entries(object).reduce((result, [key, value]) => {
    if (!keys.includes(key as keyof TObject)) {
      result[key as keyof Omit<TObject, TKeys[number]>] = value;
    }
    return result;
  }, {} as unknown as Omit<TObject, TKeys[number]>);
}
