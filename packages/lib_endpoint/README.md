# `@khulnasoft/endpoint`

`@khulnasoft/endpoint` provides types and utilities for declaring strongly-typed endpoint definitions. These definitions enable type-safe JSON-RPC endpoints with runtime validation utilizing Zod schemas.

## Key features

- **Dynamic Discovery**: Use `EndpointDefinitionProvider` to dynamically define and manage endpoint groups modularly.

- **Ergonomic API**: Simplify endpoint creation with utilities like `defineNotification` and `defineRequest`, and handle common cases using constants like `NoParams` and `NoResponse`.

- **Namespace Support**: Group and organize endpoints with `withNamespace` for logical structuring.

## Basic Usage

### Defining Schemas

```typescript
import { z } from 'zod';

// Define schemas and infer types
const CreateUserParams = z.object({
  name: z.string(),
  email: z.string().email(),
});
type CreateUserParams = z.infer<typeof CreateUserParams>;

const UserResponse = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
});
type UserResponse = z.infer<typeof UserResponse>;
```

### Creating Endpoints

```typescript
import { createNotificationEndpoint, createRequestEndpoint, NO_PARAMS } from '@khulnasoft/endpoint';

// Notification Endpoint
const userCreated = createNotificationEndpoint({
  methodName: 'userCreated',
  paramsSchema: CreateUserParams,
  handler: async (params) => {
    console.log(`User created: ${params.name} (${params.email})`);
  },
});

// Request Endpoint
const getUser = createRequestEndpoint({
  methodName: 'getUser',
  paramsSchema: z.object({ id: z.number() }),
  responseSchema: UserResponse,
  handler: async (params): Promise<UserResponse> => {
    return {
      id: params.id,
      name: `User ${params.id}`,
      email: `user${params.id}@example.com`,
      createdAt: new Date(),
    };
  },
});
```

### Group Endpoints With Namespaces

Use `withNamespace` to logically group related endpoints under a namespace.

```typescript
import { withNamespace } from '@khulnasoft/endpoint';

const namespacedEndpoints = withNamespace('user', endpoints);

console.log(namespacedEndpoints);
/*
[
  { methodName: 'user/user-created', ... },
  { methodName: 'user/get-user', ... },
  { methodName: 'user/no-params-example', ... },
  { methodName: 'user/no-response-example', ... },
]
*/
```

### Dynamically Register Endpoints

Use `EndpointDefinitionProvider` to dynamically manage and register endpoint groups for modular systems.

```typescript
import { EndpointProvider, Endpoint } from '@khulnasoft/endpoint';

// Define schemas
const NotifyUserParams = z.object({
  userId: z.number(),
  message: z.string(),
  priority: z.enum(['low', 'medium', 'high']),
});
type NotifyUserParams = z.infer<typeof NotifyUserParams>;

const GetUserDetailsParams = z.object({
  userId: z.number(),
  includePrivate: z.boolean().default(false),
});
type GetUserDetailsParams = z.infer<typeof GetUserDetailsParams>;

const UserDetailsResponse = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string(),
  private: z
    .object({
      phone: z.string().optional(),
      address: z.string().optional(),
    })
    .optional(),
});
type UserDetailsResponse = z.infer<typeof UserDetailsResponse>;

class UserEndpoints implements EndpointProvider {
  getEndpoints(): Endpoint[] {
    return [
      createNotificationEndpoint({
        methodName: 'notifyUser',
        paramsSchema: NotifyUserParams,
        handler: async (params) => {
          console.log(`Notifying user ${params.userId}: ${params.message} (${params.priority})`);
        },
      }),
      createRequestEndpoint({
        methodName: 'getUserDetails',
        paramsSchema: GetUserDetailsParams,
        responseSchema: UserDetailsResponse,
        handler: async (params): Promise<UserDetailsResponse> => {
          const details: UserDetailsResponse = {
            id: params.userId,
            name: `User ${params.userId}`,
            email: `user${params.userId}@example.com`,
          };

          if (params.includePrivate) {
            details.private = {
              phone: '+1234567890',
              address: '123 Main St',
            };
          }

          return details;
        },
      }),
    ];
  }
}

// Aggregate endpoints from multiple providers
const providers = [new UserEndpointProvider()];
const allEndpoints = providers.flatMap((provider) => provider.getEndpoints());

console.log(allEndpoints);
```

#### Dependency Injection using `@khulnasoft/di`

## API Reference

### `defineNotification`

Creates a request endpoint definition.

- `methodName`: Name of the request.
- `paramsSchema`: A `zod` schema defining the request parameters.
- `handler`: Function that handles the request.

### `defineRequest`

Creates a request endpoint definition.

- `methodName`: Name of the request.
- `paramsSchema`: A `zod` schema defining the request parameters.
- `responseSchema`: A `zod` schema defining the response.
- `handler`: Function that handles the request.

### `withNamespace`

```typescript
function withNamespace(namespace: string, endpoints: EndpointDefinition[]): EndpointDefinition[];
```

Adds a namespace prefix to methodName for all provided endpoints.

namespace: Prefix to apply.
endpoints: Array of endpoints to modify.

### `NoParams` and `NoResponse`

```typescript
export const NoParams = z.void();
export const NoResponse = z.void();
```

### `EndpointDefinitionProvider`

```typescript
export interface EndpointDefinitionProvider {
  getEndpoints(): EndpointDefinition[];
}
```

Interface for dynamically providing endpoint definitions.

## FAQ

### Why use `zod` for schemas?

`zod` provides both compile-time inference and runtime validation, ensuring safe and predictable endpoint interactions.

## Additional Resources

[zod Documentation](https://zod.dev/)
