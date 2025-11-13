/**
 * AnimationManager.ts
 * Manages animations for candy swap, elimination, falling, and event effects
 */

import { CandyType, Position } from '../GridSystem';

/**
 * Animation types
 */
export enum AnimationType {
  SWAP = 'SWAP',           // Candy swap animation
  ELIMINATE = 'ELIMINATE', // Candy elimination animation
  FALL = 'FALL',           // Candy falling animation
  EVENT = 'EVENT',         // Event effect animation
  HIGHLIGHT = 'HIGHLIGHT'  // Cell highlight animation
}

/**
 * Easing functions for smooth animations
 */
export class Easing {
  static linear(t: number): number {
    return t;
  }

  static easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  static easeOut(t: number): number {
    return t * (2 - t);
  }

  static easeIn(t: number): number {
    return t * t;
  }

  static bounce(t: number): number {
    if (t < 1 / 2.75) {
      return 7.5625 * t * t;
    } else if (t < 2 / 2.75) {
      return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    } else if (t < 2.5 / 2.75) {
      return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    } else {
      return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
    }
  }
}

/**
 * Base animation interface
 */
export interface Animation {
  id: string;
  type: AnimationType;
  startTime: number;
  duration: number;
  isComplete: boolean;
  update(currentTime: number): void;
  render(ctx: CanvasRenderingContext2D): void;
}

/**
 * Swap animation - animates two candies swapping positions
 */
export class SwapAnimation implements Animation {
  public id: string;
  public type = AnimationType.SWAP;
  public startTime: number;
  public duration: number;
  public isComplete = false;

  constructor(
    private pos1: Position,
    private pos2: Position,
    private candy1: CandyType,
    private candy2: CandyType,
    private gridX: number,
    private gridY: number,
    private cellSize: number,
    duration = 300
  ) {
    this.id = `swap_${Date.now()}_${Math.random()}`;
    this.startTime = Date.now();
    this.duration = duration;
  }

  update(currentTime: number): void {
    const elapsed = currentTime - this.startTime;
    if (elapsed >= this.duration) {
      this.isComplete = true;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const elapsed = Date.now() - this.startTime;
    const progress = Math.min(elapsed / this.duration, 1);
    const t = Easing.easeInOut(progress);

    // Calculate positions
    const x1Start = this.gridX + this.pos1.col * this.cellSize + this.cellSize / 2;
    const y1Start = this.gridY + this.pos1.row * this.cellSize + this.cellSize / 2;
    const x2Start = this.gridX + this.pos2.col * this.cellSize + this.cellSize / 2;
    const y2Start = this.gridY + this.pos2.row * this.cellSize + this.cellSize / 2;

    const x1 = x1Start + (x2Start - x1Start) * t;
    const y1 = y1Start + (y2Start - y1Start) * t;
    const x2 = x2Start + (x1Start - x2Start) * t;
    const y2 = y2Start + (y1Start - y2Start) * t;

    // Render candies at interpolated positions
    this.renderCandy(ctx, x1, y1, this.candy1);
    this.renderCandy(ctx, x2, y2, this.candy2);
  }

  private renderCandy(ctx: CanvasRenderingContext2D, x: number, y: number, candy: CandyType): void {
    const candyColors: Record<CandyType, string> = {
      [CandyType.RED]: '#ff4757',
      [CandyType.BLUE]: '#5352ed',
      [CandyType.GREEN]: '#26de81',
      [CandyType.YELLOW]: '#fed330',
      [CandyType.PURPLE]: '#a55eea',
      [CandyType.EMPTY]: 'transparent'
    };

    const color = candyColors[candy];
    if (color === 'transparent') return;

    const radius = this.cellSize * 0.35;

    // Draw candy circle
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    const gradient = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, 0, x, y, radius);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.3, color);
    gradient.addColorStop(1, this.darkenColor(color, 0.3));
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  private darkenColor(color: string, factor: number): string {
    const hex = color.replace('#', '');
    const r = Math.floor(parseInt(hex.substr(0, 2), 16) * (1 - factor));
    const g = Math.floor(parseInt(hex.substr(2, 2), 16) * (1 - factor));
    const b = Math.floor(parseInt(hex.substr(4, 2), 16) * (1 - factor));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
}

/**
 * Elimination animation - animates candies disappearing
 */
export class EliminateAnimation implements Animation {
  public id: string;
  public type = AnimationType.ELIMINATE;
  public startTime: number;
  public duration: number;
  public isComplete = false;

  constructor(
    private positions: Position[],
    private gridX: number,
    private gridY: number,
    private cellSize: number,
    duration = 400
  ) {
    this.id = `eliminate_${Date.now()}_${Math.random()}`;
    this.startTime = Date.now();
    this.duration = duration;
  }

  update(currentTime: number): void {
    const elapsed = currentTime - this.startTime;
    if (elapsed >= this.duration) {
      this.isComplete = true;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const elapsed = Date.now() - this.startTime;
    const progress = Math.min(elapsed / this.duration, 1);
    const t = Easing.easeOut(progress);

    for (const pos of this.positions) {
      const x = this.gridX + pos.col * this.cellSize + this.cellSize / 2;
      const y = this.gridY + pos.row * this.cellSize + this.cellSize / 2;
      const radius = this.cellSize * 0.35 * (1 - t);
      const alpha = 1 - t;

      ctx.save();
      ctx.globalAlpha = alpha;

      // Draw expanding circle
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Draw particles
      const particleCount = 8;
      for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 * i) / particleCount;
        const distance = radius + this.cellSize * 0.2 * t;
        const px = x + Math.cos(angle) * distance;
        const py = y + Math.sin(angle) * distance;
        const particleRadius = 3 * (1 - t);

        ctx.beginPath();
        ctx.arc(px, py, particleRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }

      ctx.restore();
    }
  }
}

/**
 * Fall animation - animates candies falling down
 */
export class FallAnimation implements Animation {
  public id: string;
  public type = AnimationType.FALL;
  public startTime: number;
  public duration: number;
  public isComplete = false;

  constructor(
    private candyData: Array<{
      candy: CandyType;
      fromRow: number;
      toRow: number;
      col: number;
    }>,
    private gridX: number,
    private gridY: number,
    private cellSize: number,
    duration = 500
  ) {
    this.id = `fall_${Date.now()}_${Math.random()}`;
    this.startTime = Date.now();
    this.duration = duration;
  }

  update(currentTime: number): void {
    const elapsed = currentTime - this.startTime;
    if (elapsed >= this.duration) {
      this.isComplete = true;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const elapsed = Date.now() - this.startTime;
    const progress = Math.min(elapsed / this.duration, 1);
    const t = Easing.bounce(progress);

    for (const data of this.candyData) {
      const x = this.gridX + data.col * this.cellSize + this.cellSize / 2;
      const yStart = this.gridY + data.fromRow * this.cellSize + this.cellSize / 2;
      const yEnd = this.gridY + data.toRow * this.cellSize + this.cellSize / 2;
      const y = yStart + (yEnd - yStart) * t;

      this.renderCandy(ctx, x, y, data.candy);
    }
  }

  private renderCandy(ctx: CanvasRenderingContext2D, x: number, y: number, candy: CandyType): void {
    const candyColors: Record<CandyType, string> = {
      [CandyType.RED]: '#ff4757',
      [CandyType.BLUE]: '#5352ed',
      [CandyType.GREEN]: '#26de81',
      [CandyType.YELLOW]: '#fed330',
      [CandyType.PURPLE]: '#a55eea',
      [CandyType.EMPTY]: 'transparent'
    };

    const color = candyColors[candy];
    if (color === 'transparent') return;

    const radius = this.cellSize * 0.35;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    const gradient = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, 0, x, y, radius);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.3, color);
    gradient.addColorStop(1, this.darkenColor(color, 0.3));
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  private darkenColor(color: string, factor: number): string {
    const hex = color.replace('#', '');
    const r = Math.floor(parseInt(hex.substr(0, 2), 16) * (1 - factor));
    const g = Math.floor(parseInt(hex.substr(2, 2), 16) * (1 - factor));
    const b = Math.floor(parseInt(hex.substr(4, 2), 16) * (1 - factor));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
}

/**
 * Event effect animation - animates special event effects
 */
export class EventAnimation implements Animation {
  public id: string;
  public type = AnimationType.EVENT;
  public startTime: number;
  public duration: number;
  public isComplete = false;

  constructor(
    private eventName: string,
    private gridX: number,
    private gridY: number,
    private gridWidth: number,
    private gridHeight: number,
    duration = 1000
  ) {
    this.id = `event_${Date.now()}_${Math.random()}`;
    this.startTime = Date.now();
    this.duration = duration;
  }

  update(currentTime: number): void {
    const elapsed = currentTime - this.startTime;
    if (elapsed >= this.duration) {
      this.isComplete = true;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const elapsed = Date.now() - this.startTime;
    const progress = Math.min(elapsed / this.duration, 1);
    const alpha = 1 - progress;

    ctx.save();
    ctx.globalAlpha = alpha * 0.6;

    // Draw event overlay
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const centerX = this.gridX + this.gridWidth / 2;
    const centerY = this.gridY + this.gridHeight / 2;
    const offsetY = -50 * progress;

    ctx.fillText(this.eventName, centerX, centerY + offsetY);

    // Draw expanding circle
    const radius = this.gridWidth * 0.5 * progress;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.restore();
  }
}

/**
 * Animation manager - manages all active animations
 */
export class AnimationManager {
  private animations: Animation[] = [];
  private isAnimating = false;

  /**
   * Add animation to queue
   */
  public addAnimation(animation: Animation): void {
    this.animations.push(animation);
    if (!this.isAnimating) {
      this.isAnimating = true;
    }
  }

  /**
   * Update all animations
   */
  public update(currentTime: number): void {
    this.animations = this.animations.filter(anim => {
      anim.update(currentTime);
      return !anim.isComplete;
    });

    if (this.animations.length === 0) {
      this.isAnimating = false;
    }
  }

  /**
   * Render all animations
   */
  public render(ctx: CanvasRenderingContext2D): void {
    for (const animation of this.animations) {
      animation.render(ctx);
    }
  }

  /**
   * Check if any animations are active
   */
  public hasActiveAnimations(): boolean {
    return this.animations.length > 0;
  }

  /**
   * Clear all animations
   */
  public clear(): void {
    this.animations = [];
    this.isAnimating = false;
  }

  /**
   * Wait for all animations to complete
   */
  public async waitForCompletion(): Promise<void> {
    return new Promise(resolve => {
      const check = () => {
        if (!this.hasActiveAnimations()) {
          resolve();
        } else {
          requestAnimationFrame(check);
        }
      };
      check();
    });
  }
}
