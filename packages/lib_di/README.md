# `@khulnasoft/di` documentation

`@khulnasoft/di` is a lightweight dependency injection framework for TypeScript, using ES stage 3 decorators. It provides a type-safe solution for managing dependencies in your TypeScript projects.

## Key features

- Implements the new ES stage 3 decorators standard (the TS experimental decorators are now [marked as legacy](https://devblogs.microsoft.com/typescript/announcing-typescript-5-0/#differences-with-experimental-legacy-decorators) and even though still supported, it's recommended to use the standard going forward)
- Compatible with the latest TypeScript and esbuild without special build flags
- Fully type-safe, ensuring correct dependency types and constructor arguments

## Basic usage

1. [Define interfaces](#define-interfaces)
1. [Create interface IDs](#create-interface-ids)
1. [Implement and decorate classes](#implement-and-decorate-classes)
1. [Initialize container](#initialize-container)
1. [Retrieve dependencies (if needed)](#retrieve-dependencies-if-needed)

### Define interfaces

```typescript
interface A {
  field: string;
}

interface B {
  hello(): string;
}
```

### Create interface IDs

```typescript
import { createInterfaceId } from '@khulnasoft/di';

const A = createInterfaceId<A>('A');
const B = createInterfaceId<B>('B');
```

### Implement and decorate classes

```typescript
import { Injectable } from '@khulnasoft/di';

@Injectable(A, [])
class AImpl implements A {
  field = 'value';
}

@Injectable(B, [A])
class BImpl implements B {
  #a: A;

  constructor(a: A) {
    this.#a = a;
  }

  hello() {
    return `B.hello says A.field = ${this.#a.field}`;
  }
}
```

### Initialize container

```typescript
import { Container } from '@khulnasoft/di';

const container = new Container();
container.instantiate(AImpl, BImpl);
```

### Retrieve dependencies (if needed)

```typescript
const b = container.get(B);
console.log(b.hello());
```

## Advanced usage

### Add external dependencies

For dependencies that can't be provided by the container, you need to add them manually. Here's an example of adding an external logger dependency:

```typescript
import { createInterfaceId, brandInstance } from '@khulnasoft/di';

interface Logger {
  log(...args: unknown[]): void;
}

const Logger = createInterfaceId<Logger>('Logger');

const customLogger: Logger = {
  log: (...args) => console.log('custom logger', ...args),
};

container.addInstances(brandInstance(Logger, customLogger));
```

#### Example

We had to add the Language Server connection to the container (we get it from the VS Code framework already created). For that we [created an alias](https://github.com/khulnasoft/khulnasoft-lsp/blob/91232887debe11b2b8830975c1d9f8748b85707b/src/common/external_interfaces.ts#L5) for the `Connection` called `LsConnection` (so we can create the `InterfaceId`) and [added it to the container](https://github.com/khulnasoft/khulnasoft-lsp/blob/91232887debe11b2b8830975c1d9f8748b85707b/src/node/main.ts#L101).

### Collections

When you need to inject all registered instances of a particular interface, you can use collection dependencies:

```typescript
import { createInterfaceId, collection } from '@khulnasoft/di';

// Define interface and create its ID
interface Plugin {
  execute(): void;
}
const Plugin = createInterfaceId<Plugin>('Plugin');

// Implement multiple plugins
@Injectable(Plugin, [])
class Plugin1 implements Plugin {
  execute() {
    console.log('Plugin 1');
  }
}

@Injectable(Plugin, [])
class Plugin2 implements Plugin {
  execute() {
    console.log('Plugin 2');
  }
}

// Inject all plugins into a manager
@Injectable(PluginManager, [collection(Plugin)])
class PluginManager {
  constructor(private plugins: Plugin[]) {}

  executeAll() {
    this.plugins.forEach((p) => p.execute());
  }
}

// Initialize
const container = new Container();
container.instantiate(Plugin1, Plugin2, PluginManager);

// Use
const manager = container.get(PluginManager);
manager.executeAll(); // Outputs: "Plugin 1" "Plugin 2"
```

If the same collection is required in multiple places, a collectionId variable can be created:

```typescript
import { createInterfaceId, createCollectionId } from '@khulnasoft/di';

// Same Plugin setup as example above

const PluginsCollection = createCollectionId(Plugin);

@Injectable(PluginManager1, [PluginsCollection])
class PluginManager1 {
  constructor(private plugins: Plugin[]) {}
}

@Injectable(PluginManager2, [PluginsCollection])
class PluginManager2 {
  constructor(private plugins: Plugin[]) {}
}
```

## API reference

### `createInterfaceId<T>(id: string): InterfaceId<T>`

Creates a unique runtime identifier for an interface.

### `createCollectionId<T>(interfaceId: InterfaceId<T>): CollectionId<T>`

Creates a runtime identifier for a collection of interfaces.

### `collection<T>(interfaceId: InterfaceId<T>): CollectionId<T>`

Alias of `createCollectionId`, intended for use directly within @Injectable when no intermediate variable is required.

### `@Injectable(id: InterfaceId<I>, dependencies: (InterfaceId<unknown> | CollectionId<unknown>)[])`

Decorator for classes to mark them as injectable and specify their dependencies.

### `Container`

- `instantiate(...classes: Class[]): void`: Initializes the specified classes.
- `addInstances(...instances: BrandedInstance<object>[]): void`: Adds pre-initialized objects to the container.
- `get<T>(id: InterfaceId<T>): T`: Retrieves an instance from the container.

### `brandInstance<T>(id: InterfaceId<T>, instance: T): BrandedInstance<T>`

Brands an instance for use with `container.addInstances()`.

## Best Practices

1. Define interfaces for your dependencies.
1. Use `createInterfaceId` for each interface.
1. Implement classes and decorate them with `@Injectable`.
1. Initialize your container in the application's entry point.
1. Use `container.get()` sparingly, preferring constructor injection.

## Examples in the code

- [`ConfigService`](https://github.com/khulnasoft/khulnasoft-lsp/blob/91232887debe11b2b8830975c1d9f8748b85707b/src/common/config_service.ts#L110) (no constructor arguments)
- [`ConnectionService`](https://github.com/khulnasoft/khulnasoft-lsp/blob/91232887debe11b2b8830975c1d9f8748b85707b/src/common/connection_service.ts#L50) (many constructor arguments)
- [Instantiating the classes](https://github.com/khulnasoft/khulnasoft-lsp/blob/91232887debe11b2b8830975c1d9f8748b85707b/src/node/main.ts#L125)

## Troubleshooting

- Ensure all classes are decorated with `@Injectable`.
- Ensure your `InterfaceId` instances have the correct interface type and string identifier.
- Ensure that all constructor arguments implement interfaces mentioned in the `@Injectable` decorator.

## VS Code snippet

To reduce boilerplate, consider adding this snippet to your VS Code TypeScript snippets:

```json
{
  "New DI Class": {
    "prefix": "diclass",
    "body": [
      "import { Injectable, createInterfaceId } from '@khulnasoft/di';",
      "",
      "export interface ${1:InterfaceName} {}",
      "",
      "export const ${1:InterfaceName} = createInterfaceId<${1:InterfaceName}>('${1:InterfaceName}');",
      "",
      "@Injectable(${1:InterfaceName}, [])",
      "export class Default${1:InterfaceName} implements ${1:InterfaceName} {}"
    ],
    "description": "Creates DI framework boilerplate"
  }
}
```

## FAQ

### Why didn't you decorate the constructor parameters?

You can't, because the ES Stage 3 decorators don't support decorating method/function parameters.

- [See stage 1 proposal for parameter decorators](https://docs.google.com/document/d/1Qpkqf_8NzAwfD8LdnqPjXAQ2wwh8BBUGynhn-ZlCWT0/edit#heading=h.t9k9f05noi8w)

### How is this implemented?

- the type definition of `@Injectable` is a dark, write-only type magic
- the `Container` implementation is a straightforward graph traversing and string validation

Learn more in the blog post mentioned in the next section.

## Additional resources

- [TypeScript Dependency Injection using ES Decorators](https://blog.viktomas.com/graph/typescript-di-es-decorators/)
- [Decorator types for TypeScript](https://github.com/microsoft/TypeScript/pull/50820)
- [ES Decorators Proposal](https://github.com/tc39/proposal-decorators)
