/**
 * ErrorHandler.ts - Task 2.6
 * Comprehensive error handling system with global error boundary,
 * user-friendly messages, and automatic error reporting
 */

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

/**
 * Error categories
 */
export enum ErrorCategory {
  NETWORK = 'NETWORK',
  GAME_LOGIC = 'GAME_LOGIC',
  RENDERING = 'RENDERING',
  STATE = 'STATE',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Error report interface
 */
export interface ErrorReport {
  id: string;
  timestamp: number;
  severity: ErrorSeverity;
  category: ErrorCategory;
  message: string;
  stack?: string;
  context?: any;
  userMessage: string;
  recoverable: boolean;
}

/**
 * Error handler configuration
 */
export interface ErrorHandlerConfig {
  enableReporting: boolean;
  enableConsoleLog: boolean;
  maxReports: number;
  reportingEndpoint?: string;
}

/**
 * Global error handler
 */
export class ErrorHandler {
  private config: ErrorHandlerConfig;
  private errorReports: ErrorReport[] = [];
  private errorCount = 0;
  private listeners: Array<(report: ErrorReport) => void> = [];

  constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = {
      enableReporting: true,
      enableConsoleLog: true,
      maxReports: 100,
      ...config
    };

    this.setupGlobalHandlers();
  }

  /**
   * Setup global error handlers
   */
  private setupGlobalHandlers(): void {
    // Handle uncaught errors
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.handleError(event.error, {
          type: 'uncaught',
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        });
      });

      // Handle unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        this.handleError(event.reason, {
          type: 'unhandled_rejection',
          promise: event.promise
        });
      });
    } else if (typeof process !== 'undefined') {
      process.on('uncaughtException', (error) => {
        this.handleError(error, { type: 'uncaught_exception' });
      });

      process.on('unhandledRejection', (reason) => {
        this.handleError(reason, { type: 'unhandled_rejection' });
      });
    }
  }

  /**
   * Handle error
   */
  public handleError(error: any, context?: any): ErrorReport {
    const report = this.createErrorReport(error, context);

    // Store report
    this.errorReports.push(report);
    if (this.errorReports.length > this.config.maxReports) {
      this.errorReports.shift();
    }

    this.errorCount++;

    // Log to console
    if (this.config.enableConsoleLog) {
      this.logError(report);
    }

    // Notify listeners
    this.notifyListeners(report);

    // Send report if enabled
    if (this.config.enableReporting) {
      this.sendErrorReport(report);
    }

    return report;
  }

  /**
   * Create error report
   */
  private createErrorReport(error: any, context?: any): ErrorReport {
    const err = this.normalizeError(error);
    const category = this.categorizeError(err, context);
    const severity = this.determineSeverity(category, err);

    return {
      id: this.generateErrorId(),
      timestamp: Date.now(),
      severity,
      category,
      message: err.message,
      stack: err.stack,
      context,
      userMessage: this.getUserFriendlyMessage(category, err),
      recoverable: this.isRecoverable(category, err)
    };
  }

  /**
   * Normalize error to Error object
   */
  private normalizeError(error: any): Error {
    if (error instanceof Error) {
      return error;
    }

    if (typeof error === 'string') {
      return new Error(error);
    }

    if (error && typeof error === 'object') {
      return new Error(JSON.stringify(error));
    }

    return new Error('Unknown error');
  }

  /**
   * Categorize error
   */
  private categorizeError(error: Error, context?: any): ErrorCategory {
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('connection') || 
        message.includes('websocket') || context?.type === 'network') {
      return ErrorCategory.NETWORK;
    }

    if (message.includes('grid') || message.includes('candy') || 
        message.includes('match') || message.includes('battle')) {
      return ErrorCategory.GAME_LOGIC;
    }

    if (message.includes('render') || message.includes('canvas') || 
        message.includes('animation')) {
      return ErrorCategory.RENDERING;
    }

    if (message.includes('state') || message.includes('sync') || 
        message.includes('conflict')) {
      return ErrorCategory.STATE;
    }

    return ErrorCategory.UNKNOWN;
  }

  /**
   * Determine error severity
   */
  private determineSeverity(category: ErrorCategory, error: Error): ErrorSeverity {
    const message = error.message.toLowerCase();

    if (message.includes('critical') || message.includes('fatal')) {
      return ErrorSeverity.CRITICAL;
    }

    if (category === ErrorCategory.NETWORK && message.includes('disconnect')) {
      return ErrorSeverity.WARNING;
    }

    if (category === ErrorCategory.GAME_LOGIC) {
      return ErrorSeverity.ERROR;
    }

    return ErrorSeverity.ERROR;
  }

  /**
   * Get user-friendly error message
   */
  private getUserFriendlyMessage(category: ErrorCategory, error: Error): string {
    switch (category) {
      case ErrorCategory.NETWORK:
        if (error.message.includes('connect')) {
          return '无法连接到服务器，请检查网络连接';
        }
        if (error.message.includes('disconnect')) {
          return '连接已断开，正在尝试重新连接...';
        }
        return '网络错误，请稍后重试';

      case ErrorCategory.GAME_LOGIC:
        return '游戏出现错误，请重新开始';

      case ErrorCategory.RENDERING:
        return '显示错误，请刷新页面';

      case ErrorCategory.STATE:
        return '游戏状态错误，正在恢复...';

      default:
        return '发生未知错误，请刷新页面';
    }
  }

  /**
   * Check if error is recoverable
   */
  private isRecoverable(category: ErrorCategory, error: Error): boolean {
    const message = error.message.toLowerCase();

    // Network errors are usually recoverable
    if (category === ErrorCategory.NETWORK) {
      return !message.includes('fatal');
    }

    // State errors are often recoverable
    if (category === ErrorCategory.STATE) {
      return true;
    }

    // Critical errors are not recoverable
    if (message.includes('critical') || message.includes('fatal')) {
      return false;
    }

    return false;
  }

  /**
   * Log error to console
   */
  private logError(report: ErrorReport): void {
    const prefix = this.getLogPrefix(report.severity);
    console.group(`${prefix} [${report.category}] ${report.message}`);
    console.log('Timestamp:', new Date(report.timestamp).toISOString());
    console.log('Severity:', report.severity);
    console.log('User Message:', report.userMessage);
    console.log('Recoverable:', report.recoverable);
    
    if (report.stack) {
      console.log('Stack:', report.stack);
    }
    
    if (report.context) {
      console.log('Context:', report.context);
    }
    
    console.groupEnd();
  }

  /**
   * Get log prefix based on severity
   */
  private getLogPrefix(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.INFO:
        return 'ℹ️';
      case ErrorSeverity.WARNING:
        return '⚠️';
      case ErrorSeverity.ERROR:
        return '❌';
      case ErrorSeverity.CRITICAL:
        return '🔥';
      default:
        return '❓';
    }
  }

  /**
   * Send error report to server
   */
  private async sendErrorReport(report: ErrorReport): Promise<void> {
    if (!this.config.reportingEndpoint) {
      return;
    }

    try {
      await fetch(this.config.reportingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(report)
      });
    } catch (error) {
      console.error('Failed to send error report:', error);
    }
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `ERR-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Add error listener
   */
  public addListener(listener: (report: ErrorReport) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Remove error listener
   */
  public removeListener(listener: (report: ErrorReport) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(report: ErrorReport): void {
    this.listeners.forEach(listener => {
      try {
        listener(report);
      } catch (error) {
        console.error('Error in error listener:', error);
      }
    });
  }

  /**
   * Get error reports
   */
  public getErrorReports(): ErrorReport[] {
    return [...this.errorReports];
  }

  /**
   * Get error count
   */
  public getErrorCount(): number {
    return this.errorCount;
  }

  /**
   * Clear error reports
   */
  public clearReports(): void {
    this.errorReports = [];
  }

  /**
   * Get errors by category
   */
  public getErrorsByCategory(category: ErrorCategory): ErrorReport[] {
    return this.errorReports.filter(r => r.category === category);
  }

  /**
   * Get errors by severity
   */
  public getErrorsBySeverity(severity: ErrorSeverity): ErrorReport[] {
    return this.errorReports.filter(r => r.severity === severity);
  }
}

/**
 * Error recovery strategies
 */
export class ErrorRecovery {
  private recoveryAttempts: Map<string, number> = new Map();
  private maxAttempts = 3;

  /**
   * Attempt to recover from error
   */
  public async attemptRecovery(report: ErrorReport): Promise<boolean> {
    const key = `${report.category}-${report.message}`;
    const attempts = this.recoveryAttempts.get(key) || 0;

    if (attempts >= this.maxAttempts) {
      console.error(`Max recovery attempts reached for: ${key}`);
      return false;
    }

    this.recoveryAttempts.set(key, attempts + 1);

    switch (report.category) {
      case ErrorCategory.NETWORK:
        return this.recoverNetwork(report);
      
      case ErrorCategory.STATE:
        return this.recoverState(report);
      
      case ErrorCategory.GAME_LOGIC:
        return this.recoverGameLogic(report);
      
      default:
        return false;
    }
  }

  /**
   * Recover from network error
   */
  private async recoverNetwork(report: ErrorReport): Promise<boolean> {
    console.log('Attempting network recovery...');
    
    // Wait before retry
    await this.sleep(2000);
    
    // Attempt reconnection would be handled by NetworkManager
    return true;
  }

  /**
   * Recover from state error
   */
  private async recoverState(report: ErrorReport): Promise<boolean> {
    console.log('Attempting state recovery...');
    
    // State recovery would be handled by ReconnectionManager
    return true;
  }

  /**
   * Recover from game logic error
   */
  private async recoverGameLogic(report: ErrorReport): Promise<boolean> {
    console.log('Attempting game logic recovery...');
    
    // May need to restart battle
    return false; // Usually requires user action
  }

  /**
   * Reset recovery attempts
   */
  public resetAttempts(category?: ErrorCategory): void {
    if (category) {
      const keys = Array.from(this.recoveryAttempts.keys());
      keys.forEach(key => {
        if (key.startsWith(category)) {
          this.recoveryAttempts.delete(key);
        }
      });
    } else {
      this.recoveryAttempts.clear();
    }
  }

  /**
   * Helper: sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Global error handler instance
 */
export const globalErrorHandler = new ErrorHandler({
  enableReporting: false, // Disable in development
  enableConsoleLog: true
});

/**
 * Global error recovery instance
 */
export const errorRecovery = new ErrorRecovery();
