# `@khulnasoft/endpoint-controller`

A type-safe way to define JSON-RPC endpoints using decorators.

## Usage

### Basic Controller Example

```typescript
import { z } from 'zod';
import { Controller, controller, notification, request } from '@khulnasoft/endpoint-controller';
import { Injectable } from '@khulnasoft/di';
import { EndpointDefinitionProvider } from '@khulnasoft/endpoint';

// Define schemas and their types
const UserParams = z.object({
  id: z.number(),
  name: z.string(),
});

const UserResponse = z.object({
  id: z.number(),
  name: z.string(),
  createdAt: z.string(),
});

type UserParams = z.infer<typeof UserParams>;
type UserResponse = z.infer<typeof UserResponse>;

@Injectable(EndpointDefinitionProvider, [])
@controller({
  route: '$/users',
})
export class UserController extends Controller {
  // Notifications don't return values
  @notification('created', {
    paramsSchema: UserParams,
  })
  async userCreated(params: UserParams): Promise<void> {
    console.log('New user created:', params);
  }

  // Requests return values and can be called remotely
  @request('getById', {
    paramsSchema: UserParams,
    responseSchema: UserResponse,
  })
  async getUser(params: UserParams): Promise<UserResponse> {
    return {
      id: params.id,
      name: params.name,
      createdAt: new Date().toISOString(),
    };
  }
}
```

## API Overview

### `Controller`

Abstract base class that provides endpoint registration functionality. All controllers must extend this class.

```typescript
abstract class Controller implements EndpointDefinitionProvider {
  getEndpoints(): EndpointDefinition[];
}

// Example
@Injectable(EndpointDefinitionProvider, [])
class UserController extends Controller {
  // Must extend Controller to use endpoint decorators
}
```

### `@controller`

An optional class decorator that provides configuration for all endpoints defined within the controller.

```typescript
interface ControllerOptions {
  // Namespace prefix for all endpoints in this controller
  // Example: '$/users' will prefix all methods with '$/users/'
  route?: string;
}

// Example
@controller({
  route: '$/users'
})
class UserController extends Controller {
  // Method 'create' becomes '$/users/create'
  @request('create', {...})
  async createUser() {}
}

// Without @controller decorator
class BasicController extends Controller {
  // Method name is used as-is: 'create'
  @request('create', {...})
  async createUser() {}
}
```

### `@request`

Defines a request endpoint that expects a response.

```typescript
interface RequestOptions {
  // Schema for validating incoming parameters
  paramsSchema?: z.ZodType;
  // Schema for validating outgoing response
  responseSchema?: z.ZodType;
}

// Example
const UserParams = z.object({ name: z.string() });
const UserResponse = z.object({ id: z.number(), name: z.string() });

type UserParams = z.infer<typeof UserParams>;
type UserResponse = z.infer<typeof UserResponse>;

@request('create', {
  paramsSchema: UserParams,
  responseSchema: UserResponse,
})
async createUser(params: UserParams): Promise<UserResponse> {
  // Both params and return value are type-safe and validated
}
```

### `@notification`

Defines a notification endpoint that doesn't return a value.

```typescript
interface NotificationOptions {
  // Schema for validating incoming parameters
  paramsSchema?: z.ZodType;
}

// Example
const LogParams = z.object({
  level: z.enum(['info', 'error']),
  message: z.string()
});

type LogParams = z.infer<typeof LogParams>;

@notification('log', {
  paramsSchema: LogParams,
})
async logMessage(params: LogParams): Promise<void> {
  // Only params are validated, return value must be void
}
```

## Dependency Injection

Controllers are designed to work with dependency injection through the `@Injectable` decorator:

```typescript
@Injectable(EndpointDefinitionProvider, [UserService, Logger])
@controller({
  route: '$/users',
})
class UserController extends Controller {
  constructor(
    private userService: UserService,
    private logger: Logger,
  ) {
    super();
  }
}
```

## Best Practices

1. Define schemas separately from their usage
1. Create explicit type definitions using `z.infer`
