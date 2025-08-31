// Tests for Timeout Handler
import { describe, it, expect } from 'vitest';
import { TimeoutHandler } from '../shared/timeout-handler';

describe('TimeoutHandler', () => {
  describe('withTimeout', () => {
    it('should resolve when promise completes before timeout', async () => {
      const fastPromise = Promise.resolve('success');
      const result = await TimeoutHandler.withTimeout(fastPromise, 1000);
      
      expect(result).toBe('success');
    });

    it('should reject when promise takes longer than timeout', async () => {
      const slowPromise = new Promise(resolve => setTimeout(() => resolve('late'), 200));
      
      await expect(
        TimeoutHandler.withTimeout(slowPromise, 100, 'Custom timeout message')
      ).rejects.toThrow('Custom timeout message');
    });

    it('should reject with default message when no custom message provided', async () => {
      const slowPromise = new Promise(resolve => setTimeout(() => resolve('late'), 200));
      
      await expect(
        TimeoutHandler.withTimeout(slowPromise, 100)
      ).rejects.toThrow('Operation timed out after 100ms');
    });

    it('should reject when original promise rejects', async () => {
      const failingPromise = Promise.reject(new Error('Original error'));
      
      await expect(
        TimeoutHandler.withTimeout(failingPromise, 1000)
      ).rejects.toThrow('Original error');
    });
  });

  describe('createTimeout', () => {
    it('should create a promise that rejects after specified time', async () => {
      const start = Date.now();
      
      await expect(
        TimeoutHandler.createTimeout(100, 'Timeout reached')
      ).rejects.toThrow('Timeout reached');
      
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(90); // Allow some variance
      expect(elapsed).toBeLessThan(150);
    });

    it('should use default message when none provided', async () => {
      await expect(
        TimeoutHandler.createTimeout(50)
      ).rejects.toThrow('Timeout after 50ms');
    });
  });

  describe('race', () => {
    it('should resolve with promise result when it completes first', async () => {
      const fastPromise = Promise.resolve('winner');
      const result = await TimeoutHandler.race(fastPromise, 1000);
      
      expect(result).toBe('winner');
    });

    it('should reject with timeout when timeout occurs first', async () => {
      const slowPromise = new Promise(resolve => setTimeout(() => resolve('late'), 200));
      
      await expect(
        TimeoutHandler.race(slowPromise, 100, 'Race timeout')
      ).rejects.toThrow('Race timeout');
    });
  });

  describe('DEFAULT_TIMEOUTS', () => {
    it('should have reasonable timeout values', () => {
      expect(TimeoutHandler.DEFAULT_TIMEOUTS.PDF_PARSING).toBe(15000);
      expect(TimeoutHandler.DEFAULT_TIMEOUTS.DOCX_PARSING).toBe(10000);
      expect(TimeoutHandler.DEFAULT_TIMEOUTS.FILE_READING).toBe(5000);
      expect(TimeoutHandler.DEFAULT_TIMEOUTS.TEXT_CLEANING).toBe(2000);
    });
  });
});