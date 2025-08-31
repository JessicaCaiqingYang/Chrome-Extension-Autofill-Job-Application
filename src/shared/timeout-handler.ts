// Timeout Handler for CV Processing Operations
// Provides timeout functionality for parsing operations to prevent hanging

export class TimeoutHandler {
  /**
   * Wraps a promise with a timeout
   * @param promise The promise to wrap
   * @param timeoutMs Timeout in milliseconds
   * @param timeoutMessage Custom timeout error message
   * @returns Promise that rejects if timeout is reached
   */
  static withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutMessage?: string
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      // Create timeout
      const timeoutId = setTimeout(() => {
        reject(new Error(timeoutMessage || `Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      // Execute the original promise
      promise
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Creates a timeout promise that rejects after specified time
   * @param timeoutMs Timeout in milliseconds
   * @param message Error message
   * @returns Promise that rejects after timeout
   */
  static createTimeout(timeoutMs: number, message?: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(message || `Timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });
  }

  /**
   * Races a promise against a timeout
   * @param promise The promise to race
   * @param timeoutMs Timeout in milliseconds
   * @param timeoutMessage Custom timeout error message
   * @returns Promise that resolves with the first to complete
   */
  static race<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutMessage?: string
  ): Promise<T> {
    const timeoutPromise = this.createTimeout(timeoutMs, timeoutMessage);
    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * Default timeout values for different operations
   */
  static readonly DEFAULT_TIMEOUTS = {
    PDF_PARSING: 15000,    // 15 seconds for PDF parsing
    DOCX_PARSING: 10000,   // 10 seconds for DOCX parsing
    FILE_READING: 5000,    // 5 seconds for file reading
    TEXT_CLEANING: 2000    // 2 seconds for text cleaning
  } as const;
}