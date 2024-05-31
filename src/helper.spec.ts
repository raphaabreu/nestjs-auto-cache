import { successOr404Error } from './helper';
import { Result } from './result-cache';

describe('successOr404Error', () => {
  it('should return ttl if the result has a value', () => {
    // Arrange
    const ttl = 60;
    const result: Result<string> = { value: 'some data' };
    const ttlFunction = successOr404Error(ttl);

    // Act
    const returnedTtl = ttlFunction(result);

    // Assert
    expect(returnedTtl).toBe(ttl);
  });

  it('should return ttl if the result has an error with status 404', () => {
    // Arrange
    const ttl = 60;
    const result: Result<null> = { error: { status: 404 } };
    const ttlFunction = successOr404Error(ttl);

    // Act
    const returnedTtl = ttlFunction(result);

    // Assert
    expect(returnedTtl).toBe(ttl);
  });

  it('should return -1 if the result has an error with a status other than 404', () => {
    // Arrange
    const ttl = 60;
    const result: Result<null> = { error: { status: 500 } };
    const ttlFunction = successOr404Error(ttl);

    // Act
    const returnedTtl = ttlFunction(result);

    // Assert
    expect(returnedTtl).toBe(-1);
  });

  it('should return -1 if the result has no value and no error', () => {
    // Arrange
    const ttl = 60;
    const result: Result<null> = {};
    const ttlFunction = successOr404Error(ttl);

    // Act
    const returnedTtl = ttlFunction(result);

    // Assert
    expect(returnedTtl).toBe(-1);
  });
});
