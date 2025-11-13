import { EventBar } from './EventBar.js';
import { GameEventType } from './GameEventType.js';

/**
 * 游戏状态枚举
 */
export enum GameState {
  IDLE = 'IDLE',           // 空闲状态
  PLAYING = 'PLAYING',     // 游戏进行中
  PAUSED = 'PAUSED',       // 暂停
  GAME_OVER = 'GAME_OVER'  // 游戏结束
}

/**
 * 活动事件接口
 * 表示当前正在生效的事件
 */
interface ActiveEvent {
  type: GameEventType;
  startTime: number;
  duration: number;
}

/**
 * 游戏管理器类
 * 协调游戏状态和事件系统
 */
export class GameManager {
  /** 事件条实例 */
  private eventBar: EventBar;
  
  /** 当前游戏状态 */
  private gameState: GameState;
  
  /** 当前分数 */
  private score: number;
  
  /** 当前活动的事件列表 */
  private activeEvents: Map<GameEventType, ActiveEvent>;
  
  /** 事件触发回调函数 */
  private eventCallbacks: Map<GameEventType, ((event: GameEventType) => void)[]>;

  /**
   * 构造函数
   * @param maxProgress 进度条最大值
   * @param eventSequence 事件序列（可选）
   */
  constructor(maxProgress: number = 100, eventSequence?: GameEventType[]) {
    this.eventBar = new EventBar(maxProgress, eventSequence);
    this.gameState = GameState.IDLE;
    this.score = 0;
    this.activeEvents = new Map();
    this.eventCallbacks = new Map();
  }

  /**
   * 开始游戏
   */
  public startGame(): void {
    this.gameState = GameState.PLAYING;
    this.score = 0;
    this.activeEvents.clear();
    this.eventBar.reset();
    console.log('游戏开始！');
    console.log(this.eventBar.toString());
  }

  /**
   * 暂停游戏
   */
  public pauseGame(): void {
    if (this.gameState === GameState.PLAYING) {
      this.gameState = GameState.PAUSED;
      console.log('游戏暂停');
    }
  }

  /**
   * 恢复游戏
   */
  public resumeGame(): void {
    if (this.gameState === GameState.PAUSED) {
      this.gameState = GameState.PLAYING;
      console.log('游戏恢复');
    }
  }

  /**
   * 结束游戏
   */
  public endGame(): void {
    this.gameState = GameState.GAME_OVER;
    this.activeEvents.clear();
    console.log(`游戏结束！最终分数: ${this.score}`);
  }

  /**
   * 增加分数并推进进度条
   * @param points 增加的分数
   */
  public addScore(points: number): void {
    if (this.gameState !== GameState.PLAYING) {
      return;
    }

    this.score += points;
    
    // 推进事件条进度
    const triggeredEvent = this.eventBar.advanceProgress(points);
    
    // 如果触发了事件，处理它
    if (triggeredEvent) {
      this.onEventTriggered(triggeredEvent);
    }
    
    console.log(`分数: ${this.score} | ${this.eventBar.toString()}`);
  }

  /**
   * 事件触发处理函数
   * @param event 被触发的事件类型
   */
  public onEventTriggered(event: GameEventType): void {
    console.log(`\n🎉 事件触发: ${event}`);
    
    // 根据不同的事件类型执行不同的逻辑
    switch (event) {
      case GameEventType.GRAVITY_REVERSE:
        this.handleGravityReverse();
        break;
      
      case GameEventType.FROZEN_COLORS:
        this.handleFrozenColors();
        break;
      
      case GameEventType.COMBO_BONUS:
        this.handleComboBonus();
        break;
      
      case GameEventType.OBSTACLE_GENERATE:
        this.handleObstacleGenerate();
        break;
      
      case GameEventType.SPEED_UP:
        this.handleSpeedUp();
        break;
      
      default:
        console.log(`未知事件类型: ${event}`);
    }
    
    // 调用注册的回调函数
    const callbacks = this.eventCallbacks.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(event));
    }
    
    // 添加到活动事件列表（假设事件持续30秒）
    this.activateEvent(event, 30000);
  }

  /**
   * 激活一个事件
   * @param event 事件类型
   * @param duration 持续时间（毫秒）
   */
  private activateEvent(event: GameEventType, duration: number): void {
    const activeEvent: ActiveEvent = {
      type: event,
      startTime: Date.now(),
      duration: duration
    };
    
    this.activeEvents.set(event, activeEvent);
    
    // 设置定时器自动移除事件
    setTimeout(() => {
      this.deactivateEvent(event);
    }, duration);
  }

  /**
   * 停用一个事件
   * @param event 事件类型
   */
  private deactivateEvent(event: GameEventType): void {
    if (this.activeEvents.has(event)) {
      this.activeEvents.delete(event);
      console.log(`事件结束: ${event}`);
    }
  }

  /**
   * 检查事件是否处于活动状态
   * @param event 事件类型
   */
  public isEventActive(event: GameEventType): boolean {
    return this.activeEvents.has(event);
  }

  /**
   * 注册事件回调
   * @param event 事件类型
   * @param callback 回调函数
   */
  public onEvent(event: GameEventType, callback: (event: GameEventType) => void): void {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, []);
    }
    this.eventCallbacks.get(event)!.push(callback);
  }

  // ==================== 事件处理方法 ====================

  /**
   * 处理重力反转事件
   */
  private handleGravityReverse(): void {
    console.log('⬆️ 重力反转：方块现在向上飘！');
    // TODO: 实现重力反转逻辑
    // 例如：改变方块移动方向，从下往上排列
  }

  /**
   * 处理冻结颜色事件
   */
  private handleFrozenColors(): void {
    // 随机选择1-2种颜色冻结
    const frozenColorCount = Math.floor(Math.random() * 2) + 1;
    console.log(`❄️ 冻结颜色：${frozenColorCount}种颜色被冻结，无法消除！`);
    // TODO: 实现颜色冻结逻辑
    // 例如：标记某些颜色的方块为不可消除状态
  }

  /**
   * 处理连击加成事件
   */
  private handleComboBonus(): void {
    console.log('⚡ 连击加成：连击分数翻倍！');
    // TODO: 实现连击加成逻辑
    // 例如：设置分数乘数，连击时获得更多分数
  }

  /**
   * 处理生成障碍物事件
   */
  private handleObstacleGenerate(): void {
    const obstacleCount = Math.floor(Math.random() * 3) + 2;
    console.log(`🚧 生成障碍物：在棋盘上生成${obstacleCount}个障碍物！`);
    // TODO: 实现障碍物生成逻辑
    // 例如：在随机位置生成不可消除的障碍方块
  }

  /**
   * 处理加速事件
   */
  private handleSpeedUp(): void {
    console.log('🚀 加速：方块下落速度提升50%！');
    // TODO: 实现加速逻辑
    // 例如：提高方块下落速度，减少下落时间间隔
  }

  // ==================== Getter方法 ====================

  /**
   * 获取当前分数
   */
  public getScore(): number {
    return this.score;
  }

  /**
   * 获取游戏状态
   */
  public getGameState(): GameState {
    return this.gameState;
  }

  /**
   * 获取事件条实例
   */
  public getEventBar(): EventBar {
    return this.eventBar;
  }

  /**
   * 获取所有活动事件
   */
  public getActiveEvents(): GameEventType[] {
    return Array.from(this.activeEvents.keys());
  }

  /**
   * 获取游戏状态摘要
   */
  public getGameSummary(): string {
    const activeEventsList = this.getActiveEvents().join(', ') || '无';
    return `游戏状态: ${this.gameState} | 分数: ${this.score} | ` +
           `${this.eventBar.toString()} | 活动事件: ${activeEventsList}`;
  }
}
