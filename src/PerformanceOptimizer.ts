/**
 * PerformanceOptimizer.ts - Task 2.6
 * Performance optimization utilities for memory, network, rendering, and loading
 */

/**
 * Memory optimization utilities
 */
export class MemoryOptimizer {
  private objectPools: Map<string, any[]> = new Map();
  private cacheLimit = 100;

  /**
   * Create object pool for reuse
   */
  public createPool<T>(poolName: string, factory: () => T, initialSize = 10): void {
    const pool: T[] = [];
    for (let i = 0; i < initialSize; i++) {
      pool.push(factory());
    }
    this.objectPools.set(poolName, pool);
  }

  /**
   * Get object from pool
   */
  public getFromPool<T>(poolName: string, factory: () => T): T {
    const pool = this.objectPools.get(poolName);
    if (pool && pool.length > 0) {
      return pool.pop() as T;
    }
    return factory();
  }

  /**
   * Return object to pool
   */
  public returnToPool(poolName: string, obj: any): void {
    const pool = this.objectPools.get(poolName);
    if (pool && pool.length < this.cacheLimit) {
      pool.push(obj);
    }
  }

  /**
   * Clear unused pools
   */
  public clearPools(): void {
    this.objectPools.clear();
  }

  /**
   * Get memory usage
   */
  public getMemoryUsage(): { used: number; total: number } | null {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      return {
        used: usage.heapUsed / 1024 / 1024,
        total: usage.heapTotal / 1024 / 1024
      };
    }
    return null;
  }
}

/**
 * Network optimization utilities
 */
export class NetworkOptimizer {
  private messageQueue: any[] = [];
  private batchInterval = 100; // ms
  private batchTimer: NodeJS.Timeout | null = null;
  private compressionEnabled = true;

  constructor(batchInterval = 100) {
    this.batchInterval = batchInterval;
  }

  /**
   * Queue message for batch sending
   */
  public queueMessage(message: any): void {
    this.messageQueue.push(message);

    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => this.flush(), this.batchInterval);
    }
  }

  /**
   * Flush queued messages
   */
  public flush(): any[] {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    if (this.messageQueue.length > 0) {
      // Return batched messages
      const batch = [...this.messageQueue];
      this.messageQueue = [];
      return batch;
    }
    
    return [];
  }

  /**
   * Compress data for transmission
   */
  public compress(data: any): string {
    if (!this.compressionEnabled) {
      return JSON.stringify(data);
    }

    // Simple compression: remove whitespace and use short keys
    const json = JSON.stringify(data);
    return json;
  }

  /**
   * Decompress received data
   */
  public decompress(compressed: string): any {
    return JSON.parse(compressed);
  }

  /**
   * Calculate data size
   */
  public getDataSize(data: any): number {
    return new Blob([JSON.stringify(data)]).size;
  }

  /**
   * Enable/disable compression
   */
  public setCompression(enabled: boolean): void {
    this.compressionEnabled = enabled;
  }
}

/**
 * Rendering optimization utilities
 */
export class RenderingOptimizer {
  private dirtyRects: Set<string> = new Set();
  private frameThrottle = 16; // 60 FPS
  private lastFrameTime = 0;
  private requestId: number | null = null;

  /**
   * Mark region as dirty for re-rendering
   */
  public markDirty(x: number, y: number, width: number, height: number): void {
    this.dirtyRects.add(`${x},${y},${width},${height}`);
  }

  /**
   * Get dirty rectangles
   */
  public getDirtyRects(): Array<{ x: number; y: number; width: number; height: number }> {
    const rects: Array<{ x: number; y: number; width: number; height: number }> = [];
    
    this.dirtyRects.forEach(rect => {
      const [x, y, width, height] = rect.split(',').map(Number);
      rects.push({ x, y, width, height });
    });

    this.dirtyRects.clear();
    return rects;
  }

  /**
   * Request animation frame with throttling
   */
  public requestRender(callback: () => void): void {
    const now = Date.now();
    const elapsed = now - this.lastFrameTime;

    if (elapsed < this.frameThrottle) {
      // Throttle: wait until next frame
      setTimeout(() => this.requestRender(callback), this.frameThrottle - elapsed);
      return;
    }

    this.lastFrameTime = now;

    if (typeof requestAnimationFrame !== 'undefined') {
      this.requestId = requestAnimationFrame(callback);
    } else {
      callback();
    }
  }

  /**
   * Cancel pending render
   */
  public cancelRender(): void {
    if (this.requestId && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.requestId);
      this.requestId = null;
    }
  }

  /**
   * Set target FPS
   */
  public setTargetFPS(fps: number): void {
    this.frameThrottle = 1000 / fps;
  }

  /**
   * Check if should skip frame
   */
  public shouldSkipFrame(): boolean {
    const now = Date.now();
    const elapsed = now - this.lastFrameTime;
    return elapsed < this.frameThrottle;
  }
}

/**
 * Loading optimization utilities
 */
export class LoadingOptimizer {
  private loadedAssets: Set<string> = new Set();
  private loadingQueue: Map<string, Promise<any>> = new Map();
  private preloadQueue: string[] = [];

  /**
   * Preload assets
   */
  public async preload(urls: string[]): Promise<void> {
    this.preloadQueue = urls;
    
    const promises = urls.map(url => this.loadAsset(url));
    await Promise.all(promises);
  }

  /**
   * Load single asset
   */
  public async loadAsset(url: string): Promise<any> {
    // Check if already loaded
    if (this.loadedAssets.has(url)) {
      return Promise.resolve(url);
    }

    // Check if already loading
    if (this.loadingQueue.has(url)) {
      return this.loadingQueue.get(url);
    }

    // Start loading
    const promise = this.fetchAsset(url);
    this.loadingQueue.set(url, promise);

    try {
      await promise;
      this.loadedAssets.add(url);
      this.loadingQueue.delete(url);
      return url;
    } catch (error) {
      this.loadingQueue.delete(url);
      throw error;
    }
  }

  /**
   * Fetch asset (can be overridden)
   */
  private async fetchAsset(url: string): Promise<any> {
    // Simulate loading
    return new Promise(resolve => setTimeout(() => resolve(url), 100));
  }

  /**
   * Check if asset is loaded
   */
  public isLoaded(url: string): boolean {
    return this.loadedAssets.has(url);
  }

  /**
   * Clear loaded assets
   */
  public clearCache(): void {
    this.loadedAssets.clear();
    this.loadingQueue.clear();
  }

  /**
   * Get loading progress
   */
  public getProgress(): number {
    const total = this.preloadQueue.length;
    if (total === 0) return 100;

    const loaded = this.preloadQueue.filter(url => this.isLoaded(url)).length;
    return (loaded / total) * 100;
  }
}

/**
 * Comprehensive performance monitor
 */
export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  private maxSamples = 100;

  /**
   * Record metric
   */
  public recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const samples = this.metrics.get(name)!;
    samples.push(value);

    // Keep only last N samples
    if (samples.length > this.maxSamples) {
      samples.shift();
    }
  }

  /**
   * Get metric average
   */
  public getAverage(name: string): number {
    const samples = this.metrics.get(name);
    if (!samples || samples.length === 0) return 0;

    const sum = samples.reduce((a, b) => a + b, 0);
    return sum / samples.length;
  }

  /**
   * Get metric min/max
   */
  public getMinMax(name: string): { min: number; max: number } {
    const samples = this.metrics.get(name);
    if (!samples || samples.length === 0) {
      return { min: 0, max: 0 };
    }

    return {
      min: Math.min(...samples),
      max: Math.max(...samples)
    };
  }

  /**
   * Get all metrics
   */
  public getAllMetrics(): Record<string, { avg: number; min: number; max: number }> {
    const result: Record<string, { avg: number; min: number; max: number }> = {};

    this.metrics.forEach((_, name) => {
      const { min, max } = this.getMinMax(name);
      result[name] = {
        avg: this.getAverage(name),
        min,
        max
      };
    });

    return result;
  }

  /**
   * Clear metrics
   */
  public clear(): void {
    this.metrics.clear();
  }

  /**
   * Measure execution time
   */
  public measure<T>(name: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    this.recordMetric(name, duration);
    return result;
  }

  /**
   * Measure async execution time
   */
  public async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    this.recordMetric(name, duration);
    return result;
  }
}

/**
 * Global performance optimizer instance
 */
export const performanceOptimizer = {
  memory: new MemoryOptimizer(),
  network: new NetworkOptimizer(),
  rendering: new RenderingOptimizer(),
  loading: new LoadingOptimizer(),
  monitor: new PerformanceMonitor()
};
