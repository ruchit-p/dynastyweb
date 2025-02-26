/**
 * Type definition for server actions
 * TInput: The type of the input parameter
 * TResult: The type of the result value
 */
export type ServerAction<TInput = unknown, TResult = unknown> = (input: TInput) => Promise<ServerActionResult<TResult>>;

export type ServerActionResult<TData = unknown> = {
  success?: boolean;
  data?: TData;
  error?: string;
}; 