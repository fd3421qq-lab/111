import { GameEventType } from './GameEventType.js';

/**
 * 事件条类
 * 管理游戏进度和事件触发机制
 */
export class EventBar {
  /** 当前进度值 */
  private currentProgress: number;
  
  /** 进度条最大值 */
  private maxProgress: number;
  
  /** 本局游戏的事件序列 */
  private eventSequence: GameEventType[];
  
  /** 当前事件索引 */
  private currentEventIndex: number;
  
  /** 每次事件触发所需的进度点数 */
  private progressPerEvent: number;

  /**
   * 构造函数
   * @param maxProgress 进度条最大值（默认100）
   * @param eventSequence 事件序列，如果不提供则随机生成
   */
  constructor(maxProgress: number = 100, eventSequence?: GameEventType[]) {
    this.currentProgress = 0;
    this.maxProgress = maxProgress;
    this.currentEventIndex = 0;
    
    // 如果没有提供事件序列，则随机生成
    if (eventSequence && eventSequence.length > 0) {
      this.eventSequence = [...eventSequence];
    } else {
      this.eventSequence = this.generateRandomEventSequence();
    }
    
    // 计算每个事件需要的进度点数
    this.progressPerEvent = this.maxProgress / this.eventSequence.length;
  }

  /**
   * 随机生成事件序列
   * @param count 事件数量（默认5个）
   * @returns 随机生成的事件序列
   */
  private generateRandomEventSequence(count: number = 5): GameEventType[] {
    const allEvents = Object.values(GameEventType);
    const sequence: GameEventType[] = [];
    
    for (let i = 0; i < count; i++) {
      const randomIndex = Math.floor(Math.random() * allEvents.length);
      sequence.push(allEvents[randomIndex]);
    }
    
    return sequence;
  }

  /**
   * 推进进度条
   * @param points 要增加的进度点数
   * @returns 触发的事件类型（如果有），否则返回null
   */
  public advanceProgress(points: number): GameEventType | null {
    // 增加进度
    this.currentProgress += points;
    
    // 限制进度不超过最大值
    if (this.currentProgress > this.maxProgress) {
      this.currentProgress = this.maxProgress;
    }
    
    // 检查是否达到下一个事件的阈值
    const eventThreshold = (this.currentEventIndex + 1) * this.progressPerEvent;
    
    // 如果当前进度达到或超过阈值，且还有未触发的事件
    if (this.currentProgress >= eventThreshold && this.currentEventIndex < this.eventSequence.length) {
      const triggeredEvent = this.eventSequence[this.currentEventIndex];
      this.currentEventIndex++;
      return triggeredEvent;
    }
    
    return null;
  }

  /**
   * 获取下一个即将触发的事件
   * @returns 下一个事件类型，如果没有则返回null
   */
  public getNextEvent(): GameEventType | null {
    if (this.currentEventIndex < this.eventSequence.length) {
      return this.eventSequence[this.currentEventIndex];
    }
    return null;
  }

  /**
   * 获取当前进度值
   */
  public getCurrentProgress(): number {
    return this.currentProgress;
  }

  /**
   * 获取最大进度值
   */
  public getMaxProgress(): number {
    return this.maxProgress;
  }

  /**
   * 获取当前进度百分比
   * @returns 0-100的百分比值
   */
  public getProgressPercentage(): number {
    return (this.currentProgress / this.maxProgress) * 100;
  }

  /**
   * 获取到下一个事件还需要的进度
   * @returns 所需进度点数，如果没有更多事件则返回0
   */
  public getProgressToNextEvent(): number {
    if (this.currentEventIndex >= this.eventSequence.length) {
      return 0;
    }
    
    const nextEventThreshold = (this.currentEventIndex + 1) * this.progressPerEvent;
    return Math.max(0, nextEventThreshold - this.currentProgress);
  }

  /**
   * 获取所有事件序列
   */
  public getEventSequence(): GameEventType[] {
    return [...this.eventSequence];
  }

  /**
   * 获取已触发的事件数量
   */
  public getTriggeredEventsCount(): number {
    return this.currentEventIndex;
  }

  /**
   * 获取剩余事件数量
   */
  public getRemainingEventsCount(): number {
    return this.eventSequence.length - this.currentEventIndex;
  }

  /**
   * 重置事件条
   * @param newEventSequence 新的事件序列（可选）
   */
  public reset(newEventSequence?: GameEventType[]): void {
    this.currentProgress = 0;
    this.currentEventIndex = 0;
    
    if (newEventSequence && newEventSequence.length > 0) {
      this.eventSequence = [...newEventSequence];
    } else {
      this.eventSequence = this.generateRandomEventSequence();
    }
    
    this.progressPerEvent = this.maxProgress / this.eventSequence.length;
  }

  /**
   * 获取事件条状态的字符串表示
   */
  public toString(): string {
    return `EventBar: ${this.currentProgress}/${this.maxProgress} (${this.getProgressPercentage().toFixed(1)}%) | ` +
           `Events: ${this.currentEventIndex}/${this.eventSequence.length} | ` +
           `Next: ${this.getNextEvent() || 'None'}`;
  }
}
