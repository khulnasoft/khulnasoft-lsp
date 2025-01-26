export type ToolUse<Name extends string, Input extends object> = { name: Name; input: Input };
export type Tool = { name: string; input: object };

export type FindToolByName<Union, Name> = Union extends { name: Name } ? Union : never;
export type ToolParam<T extends Tool, Name> = FindToolByName<T, Name>['input'];
export type ToolFunction<T extends Tool, Name> = (input: ToolParam<T, Name>) => string;

export type ToolMessageMap<T extends Tool> = { [N in T['name']]: ToolFunction<T, N> };
