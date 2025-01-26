/**
 * This is a branded type for the type T, it associates a symbol with the type so we
 * can refer to the T type at runtime.
 */
export interface InterfaceId<T> {
  readonly __type: T;
  readonly symbol: symbol;
}

/**
 * This is a runtime identifier for a collection of interfaces of the same type T.
 */
export interface CollectionId<T> {
  readonly __type: T[];
  readonly baseId: InterfaceId<T>;
}

/**
 * Creates a runtime identifier of an interface used for dependency injection.
 *
 * Every call to this function produces unique identifier, you can't call this method twice for the same Type!
 */
export const createInterfaceId = <T>(id: string): InterfaceId<T> => {
  return {
    symbol: Symbol(id),
  } as unknown as InterfaceId<T>;
};

/**
 * Creates a runtime identifier for a collection of interfaces. This allows the DI framework
 * to resolve all instances registered to a given interface.
 */
export const createCollectionId = <T>(interfaceId: InterfaceId<T>): CollectionId<T> => {
  return {
    baseId: interfaceId,
  } as CollectionId<T>;
};

/**
 * Creates a runtime identifier for a collection of interfaces. This allows the DI framework
 * to resolve all instances registered to a given interface.
 *
 * This is an alias for `createCollectionId`, intended for use directly within @Injectable when no intermediate variable is required.
 *
 * @example @Injectable(MyService, [collection(Dependency)])
 */
export const collection = createCollectionId;

type DependencyId<T> = InterfaceId<T> | CollectionId<T>;

type UnwrapDependencyId<T> =
  T extends CollectionId<infer U> ? U[] : T extends InterfaceId<infer U> ? U : never;

/*
 * Takes an array of InterfaceIDs with unknown type and turn them into an array of the types that the DependencyTokens wrap
 *
 * e.g. `UnwrapInterfaceIds<[InterfaceId<string>, InterfaceId<number>, CollectionToken<boolean>]>` equals to `[string, number, boolean[]]`
 *
 * this type is used to enforce dependency types in the constructor of the injected class
 */
type UnwrapDependencyIds<T extends DependencyId<unknown>[]> = {
  [K in keyof T]: UnwrapDependencyId<T[K]>;
};

interface Metadata {
  id: InterfaceId<unknown>;
  dependencies: DependencyId<unknown>[];
}

const isCollectionToken = <T>(token: DependencyId<T>): token is CollectionId<T> => {
  return 'baseId' in token;
};

/**
 * Here we store the id and dependencies for all classes decorated with @Injectable
 */
const injectableMetadata = new WeakMap<object, Metadata>();

/**
 * Decorate your class with @Injectable(id, dependencies)
 * param id = InterfaceId of the interface implemented by your class (use createInterfaceId to create one)
 * param dependencies = List of InterfaceIds that will be injected into class' constructor
 */
export function Injectable<I, TDependencies extends DependencyId<unknown>[]>(
  id: InterfaceId<I>,
  dependencies: [...TDependencies], // we can add  `| [] = [],` to make dependencies optional, but the type checker messages are quite cryptic when the decorated class has some constructor arguments
) {
  // this is the trickiest part of the whole DI framework
  // we say, this decorator takes
  // - id (the interface that the injectable implements)
  // - dependencies (list of interface ids that will be injected to constructor)
  //
  // With then we return function that ensures that the decorated class implements the id interface
  // and its constructor has arguments of same type and order as the dependencies argument to the decorator
  return function <T extends { new (...args: UnwrapDependencyIds<TDependencies>): I }>(
    constructor: T,
    { kind }: ClassDecoratorContext,
  ) {
    if (kind === 'class') {
      injectableMetadata.set(constructor, { id, dependencies: dependencies || [] });
      return constructor;
    }
    throw new Error('Injectable decorator can only be used on a class.');
  };
}

// new (...args: any[]): any is actually how TS defines type of a class
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WithConstructor = { new (...args: any[]): any; name: string };
type ClassWithDependencies = {
  cls: WithConstructor;
  id: InterfaceId<unknown>;
  dependencies: DependencyId<unknown>[];
};

type Validator = (cwds: ClassWithDependencies[], instances: Map<symbol, unknown>) => void;

/** throws an error if any class depends on an interface that is not available */
const dependenciesArePresent: Validator = (cwds, instances) => {
  const allSymbols = new Set([...cwds.map((cwd) => cwd.id.symbol), ...instances.keys()]);

  const cwsWithUnmetDeps = cwds.filter((cwd) =>
    cwd.dependencies.some((dep) => {
      if (isCollectionToken(dep)) {
        // Collections are always considered present as they can be empty
        return false;
      }
      return !allSymbols.has(dep.symbol);
    }),
  );

  if (cwsWithUnmetDeps.length === 0) {
    return;
  }

  const messages = cwsWithUnmetDeps.map((cwd) => {
    const unmetDeps = cwd.dependencies
      .filter((dep) => !isCollectionToken(dep) && !allSymbols.has(dep.symbol))
      .map((dep) => (dep as InterfaceId<unknown>).symbol.description);

    return `Class ${cwd.cls.name} (interface ${cwd.id.symbol.description}) depends on interfaces [${unmetDeps}] that weren't added to the init method.`;
  });

  throw new Error(messages.join('\n'));
};

/** uses depth first search to find out if the classes have circular dependency */
const noCircularDependencies: Validator = (cwds, instances) => {
  const inStack = new Set<symbol>();

  const hasCircularDependency = (symbol: symbol): boolean => {
    if (inStack.has(symbol)) {
      return true;
    }
    inStack.add(symbol);

    const cwd = cwds.find((c) => c.id.symbol === symbol);

    if (!cwd && instances.has(symbol)) {
      inStack.delete(symbol);
      return false;
    }

    if (!cwd) throw new Error(`assertion error: dependency ID missing ${symbol.description}`);

    for (const dep of cwd.dependencies) {
      if (isCollectionToken(dep)) {
        if (hasCircularDependency(dep.baseId.symbol)) {
          return true;
        }
      } else if (hasCircularDependency(dep.symbol)) {
        return true;
      }
    }

    inStack.delete(symbol);
    return false;
  };

  for (const cwd of cwds) {
    if (hasCircularDependency(cwd.id.symbol)) {
      throw new Error(
        `Circular dependency detected between interfaces (${Array.from(inStack).map(
          (s) => s.description,
        )}), starting with '${cwd.id.symbol.description}' (class: ${cwd.cls.name}).`,
      );
    }
  }
};

/**
 * Topological sort of the dependencies - returns array of classes. The classes should be initialized in order given by the array.
 * https://en.wikipedia.org/wiki/Topological_sorting
 */
const sortDependencies = (classes: ClassWithDependencies[]): ClassWithDependencies[] => {
  const sortedClasses: ClassWithDependencies[] = [];
  const processedClasses = new Set<WithConstructor>();

  const topologicalSort = (symbol: symbol) => {
    const cwds = classes.filter((c) => c.id.symbol === symbol && !processedClasses.has(c.cls));
    for (const cwd of cwds) {
      for (const dep of cwd.dependencies) {
        if (isCollectionToken(dep)) {
          topologicalSort(dep.baseId.symbol);
        } else {
          topologicalSort(dep.symbol);
        }
      }
      sortedClasses.push(cwd);
      processedClasses.add(cwd.cls);
    }
  };

  for (const cwd of classes) {
    topologicalSort(cwd.id.symbol);
  }

  return sortedClasses;
};

/**
 * Helper type used by the brandInstance function to ensure that all container.addInstances parameters are branded
 */
export type BrandedInstance<T extends object> = T;

/**
 * use brandInstance to be able to pass this instance to the container.addInstances method
 */
export const brandInstance = <T extends object>(
  id: InterfaceId<T>,
  instance: T,
): BrandedInstance<T> => {
  injectableMetadata.set(instance, { id, dependencies: [] });
  return instance;
};

/**
 * Container is responsible for initializing a dependency tree.
 *
 * It receives a list of classes decorated with the `@Injectable` decorator
 * and it constructs instances of these classes in an order that ensures class' dependencies
 * are initialized before the class itself.
 *
 * check https://gitlab.com/viktomas/needle for full documentation of this mini-framework
 */
export class Container {
  #instances = new Map<symbol, unknown[]>();

  /**
   * addInstances allows you to add pre-initialized objects to the container.
   * This is useful when you want to keep mandatory parameters in class' constructor (e.g. some runtime objects like server connection).
   * addInstances accepts a list of any objects that have been "branded" by the `brandInstance` method
   */
  addInstances(...instances: BrandedInstance<object>[]) {
    for (const instance of instances) {
      const metadata = injectableMetadata.get(instance);
      if (!metadata) {
        throw new Error(
          'assertion error: addInstance invoked without branded object, make sure all arguments are branded with `brandInstance`',
        );
      }

      if (!this.#instances.has(metadata.id.symbol)) {
        this.#instances.set(metadata.id.symbol, [instance]);
      } else {
        this.#instances.get(metadata.id.symbol)?.push(instance);
      }
    }
  }

  /**
   * instantiate accepts list of classes, validates that they can be managed by the container
   * and then initialized them in such order that dependencies of a class are initialized before the class
   */
  instantiate(...classes: WithConstructor[]) {
    // ensure all classes have been decorated with @Injectable
    const undecorated = classes.filter((c) => !injectableMetadata.has(c)).map((c) => c.name);
    if (undecorated.length) {
      throw new Error(`Classes [${undecorated}] are not decorated with @Injectable.`);
    }

    const classesWithDeps: ClassWithDependencies[] = classes.map((cls) => {
      // we verified just above that all classes are present in the metadata map
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const { id, dependencies } = injectableMetadata.get(cls)!;
      return { cls, id, dependencies };
    });

    const validators: Validator[] = [dependenciesArePresent, noCircularDependencies];
    validators.forEach((v) => v(classesWithDeps, this.#instances));

    // Create instances in topological order
    for (const cwd of sortDependencies(classesWithDeps)) {
      const args = cwd.dependencies.map((dep) => {
        if (isCollectionToken(dep)) {
          return this.#instances.get(dep.baseId.symbol) || [];
        }
        const instances = this.#instances.get(dep.symbol);
        if (!instances || instances.length === 0) {
          throw new Error(
            `No instance found for ${dep.symbol.description}. This should not have been shown, the static validation should have handled this case.`,
          );
        }
        if (instances.length > 1) {
          throw new Error(
            `Multiple instances found for ${dep.symbol.description} when exactly one was expected`,
          );
        }
        return instances[0];
      });

      // eslint-disable-next-line new-cap
      const instance = new cwd.cls(...args);
      if (!this.#instances.has(cwd.id.symbol)) {
        this.#instances.set(cwd.id.symbol, []);
      }

      this.#instances.get(cwd.id.symbol)?.push(instance);
    }
  }

  get<T>(id: InterfaceId<T>): T {
    const instances = this.#instances.get(id.symbol);
    if (!instances || instances.length === 0) {
      throw new Error(`Instance for interface '${id.symbol.description}' is not in the container`);
    }
    if (instances.length > 1) {
      throw new Error(
        `Multiple instances found for ${id.symbol.description}. Use getAll(${id.symbol.description}) if you want to get all instances.`,
      );
    }
    return instances[0] as T;
  }

  getAll<T>(id: InterfaceId<T>): T[] {
    return (this.#instances.get(id.symbol) || []) as T[];
  }
}
