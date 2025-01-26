/**
 * Adds a namespace prefix to the `methodName` of each endpoint in the provided array.
 * eg: `withNamespace('myNamespace', [{ methodName: 'one' }, { methodName: 'two' }])`
 * would result in: `[ { methodName: 'myNamespace/one' }, { methodName: 'myNamespace/two' } ]`
 *
 * @param namespace - The namespace prefix to apply to each endpoint's `methodName`.
 * @param endpoints - An array of endpoints to modify.
 * @returns A new array of endpoints with namespaced `methodName`s.
 */
export function withNamespace<T extends { methodName: string }>(
  namespace: string,
  endpoints: T[],
): T[] {
  return endpoints.map((endpoint) => ({
    ...endpoint,
    methodName: `${namespace}/${endpoint.methodName}`,
  }));
}
