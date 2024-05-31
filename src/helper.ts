import { Result } from './result-cache';

export function successOr404Error<TValue, TError = any>(ttl: number): (result: Result<TValue, TError>) => number {
  return (result: Result<TValue, TError>) => {
    return result.value || (result.error as any)?.status === 404 ? ttl : -1;
  };
}
