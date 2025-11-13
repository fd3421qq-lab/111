/**
 * 对战管理器
 * 集成 GameManager 事件系统和 GridSystem 三消逻辑
 * 管理双人PVP对战流程
 */

import { GameManager, GameState } from './GameManager.js';
import { GameEventType } from './GameEventType.js';
import { GridSystem, CandyType, Position, SwapResult } from './GridSystem.js';

/**
 * 玩家类型
 */
export enum PlayerType {
  PLAYER = 'PLAYER',     // 玩家
  OPPONENT = 'OPPONENT'  // 对手
}

/**
 * 玩家数据接口
 */
export interface PlayerData {
  id: string;
  type: PlayerType;
  score: number;
  moves: number;
  grid: GridSystem;
}

/**
 * 对战结果接口
 */
export interface BattleResult {
  winner: PlayerType | null;
  playerScore: number;
  opponentScore: number;
  reason: string;
}

/**
 * 回合操作结果接口
 */
export interface TurnResult {
  success: boolean;
  swapResult?: SwapResult;
  eventTriggered?: GameEventType;
  message: string;
}

/**
 * 对战配置接口
 */
export interface BattleConfig {
  maxMoves?: number;           // 最大步数（默认30）
  targetScore?: number;        // 目标分数（默认1000）
  eventProgressMax?: number;   // 事件进度最大值（默认100）
  gridSize?: { rows: number, cols: number };  // 网格尺寸
}

/**
 * 对战管理器类
 * 整合事件系统与三消玩法
 */
export class BattleManager {
  private gameManager: GameManager;
  private player: PlayerData;
  private opponent: PlayerData;
  private currentTurn: PlayerType;
  private config: Required<BattleConfig>;
  private battleActive: boolean;
  
  // 事件效果持续时间（毫秒）
  private readonly EVENT_DURATION = 15000; // 15秒
  private activeEventTimers: Map<GameEventType, NodeJS.Timeout>;

  /**
   * 构造函数
   * @param config 对战配置
   */
  constructor(config: BattleConfig = {}) {
    // 设置默认配置
    this.config = {
      maxMoves: config.maxMoves || 30,
      targetScore: config.targetScore || 1000,
      eventProgressMax: config.eventProgressMax || 100,
      gridSize: config.gridSize || { rows: 8, cols: 8 }
    };

    // 初始化事件管理器
    this.gameManager = new GameManager(this.config.eventProgressMax);

    // 初始化玩家数据
    this.player = {
      id: 'player1',
      type: PlayerType.PLAYER,
      score: 0,
      moves: 0,
      grid: new GridSystem(this.config.gridSize.rows, this.config.gridSize.cols)
    };

    this.opponent = {
      id: 'opponent1',
      type: PlayerType.OPPONENT,
      score: 0,
      moves: 0,
      grid: new GridSystem(this.config.gridSize.rows, this.config.gridSize.cols)
    };

    this.currentTurn = PlayerType.PLAYER;
    this.battleActive = false;
    this.activeEventTimers = new Map();

    // 注册事件监听器
    this.registerEventListeners();
  }

  /**
   * 注册事件监听器
   */
  private registerEventListeners(): void {
    // 重力反转事件
    this.gameManager.onEvent(GameEventType.GRAVITY_REVERSE, () => {
      console.log('⬆️ 事件触发：重力反转');
      // 对双方网格都应用重力反转
      this.player.grid.setGravityReversed(true);
      this.opponent.grid.setGravityReversed(true);
      
      // 设置定时器，15秒后恢复
      this.setEventTimer(GameEventType.GRAVITY_REVERSE, () => {
        this.player.grid.setGravityReversed(false);
        this.opponent.grid.setGravityReversed(false);
        console.log('⬇️ 重力反转结束');
      });
    });

    // 冻结颜色事件
    this.gameManager.onEvent(GameEventType.FROZEN_COLORS, () => {
      console.log('❄️ 事件触发：冻结颜色');
      // 随机选择1-2种颜色冻结
      const colorCount = Math.floor(Math.random() * 2) + 1;
      const allColors = [
        CandyType.RED,
        CandyType.BLUE,
        CandyType.GREEN,
        CandyType.YELLOW,
        CandyType.PURPLE
      ];
      
      const frozenColors: CandyType[] = [];
      for (let i = 0; i < colorCount; i++) {
        const randomIndex = Math.floor(Math.random() * allColors.length);
        frozenColors.push(allColors[randomIndex]);
        allColors.splice(randomIndex, 1);
      }
      
      this.player.grid.freezeColors(frozenColors);
      this.opponent.grid.freezeColors(frozenColors);
      console.log(`冻结颜色: ${frozenColors.join(', ')}`);
      
      // 设置定时器，15秒后解冻
      this.setEventTimer(GameEventType.FROZEN_COLORS, () => {
        this.player.grid.unfreezeColors();
        this.opponent.grid.unfreezeColors();
        console.log('❄️ 颜色解冻');
      });
    });

    // 连击加成事件
    this.gameManager.onEvent(GameEventType.COMBO_BONUS, () => {
      console.log('⚡ 事件触发：连击加成（分数翻倍15秒）');
      // 连击加成效果在计分时处理，这里只记录
      this.setEventTimer(GameEventType.COMBO_BONUS, () => {
        console.log('⚡ 连击加成结束');
      });
    });

    // 生成障碍物事件
    this.gameManager.onEvent(GameEventType.OBSTACLE_GENERATE, () => {
      console.log('🚧 事件触发：生成障碍物');
      // 对对手的网格生成2-4个障碍物
      const obstacleCount = Math.floor(Math.random() * 3) + 2;
      const obstacles = this.opponent.grid.generateObstacles(obstacleCount);
      console.log(`在对手棋盘生成 ${obstacles.length} 个障碍物`);
    });

    // 加速事件
    this.gameManager.onEvent(GameEventType.SPEED_UP, () => {
      console.log('🚀 事件触发：加速模式（可视化效果）');
      // 加速效果主要影响UI动画，这里只记录
      this.setEventTimer(GameEventType.SPEED_UP, () => {
        console.log('🚀 加速结束');
      });
    });
  }

  /**
   * 设置事件定时器
   */
  private setEventTimer(event: GameEventType, callback: () => void): void {
    // 清除已有的定时器
    if (this.activeEventTimers.has(event)) {
      clearTimeout(this.activeEventTimers.get(event)!);
    }
    
    // 设置新定时器
    const timer = setTimeout(() => {
      callback();
      this.activeEventTimers.delete(event);
    }, this.EVENT_DURATION);
    
    this.activeEventTimers.set(event, timer);
  }

  /**
   * 开始对战
   */
  public startBattle(): void {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║      三消对战开始！                    ║');
    console.log('╚════════════════════════════════════════╝\n');
    
    // 启动游戏管理器
    this.gameManager.startGame();
    
    // 初始化双方网格
    this.player.grid.initialize();
    this.opponent.grid.initialize();
    
    // 重置数据
    this.player.score = 0;
    this.player.moves = 0;
    this.opponent.score = 0;
    this.opponent.moves = 0;
    this.currentTurn = PlayerType.PLAYER;
    this.battleActive = true;
    
    console.log(`配置: 最大步数=${this.config.maxMoves}, 目标分数=${this.config.targetScore}`);
    console.log(`事件系统: 进度最大值=${this.config.eventProgressMax}\n`);
  }

  /**
   * 执行玩家回合
   * @param pos1 第一个位置
   * @param pos2 第二个位置
   * @returns 回合结果
   */
  public playerTurn(pos1: Position, pos2: Position): TurnResult {
    if (!this.battleActive) {
      return { success: false, message: '对战未开始或已结束' };
    }

    if (this.currentTurn !== PlayerType.PLAYER) {
      return { success: false, message: '不是玩家的回合' };
    }

    return this.executeTurn(this.player, pos1, pos2);
  }

  /**
   * 执行对手回合（AI或远程玩家）
   * @param pos1 第一个位置
   * @param pos2 第二个位置
   * @returns 回合结果
   */
  public opponentTurn(pos1: Position, pos2: Position): TurnResult {
    if (!this.battleActive) {
      return { success: false, message: '对战未开始或已结束' };
    }

    if (this.currentTurn !== PlayerType.OPPONENT) {
      return { success: false, message: '不是对手的回合' };
    }

    return this.executeTurn(this.opponent, pos1, pos2);
  }

  /**
   * 执行回合操作（内部方法）
   */
  private executeTurn(playerData: PlayerData, pos1: Position, pos2: Position): TurnResult {
    // 执行交换
    const swapResult = playerData.grid.swap(pos1, pos2);

    if (!swapResult.success) {
      return {
        success: false,
        swapResult,
        message: '无效的交换（无法形成匹配或位置不相邻）'
      };
    }

    // 更新步数
    playerData.moves++;

    // 计算得分（考虑连击加成）
    let score = swapResult.score;
    if (this.gameManager.isEventActive(GameEventType.COMBO_BONUS)) {
      score *= 2; // 连击加成翻倍
      console.log(`⚡ 连击加成生效：${swapResult.score} → ${score}`);
    }
    
    playerData.score += score;

    // 推进事件系统（只有玩家的操作推进事件）
    let eventTriggered: GameEventType | undefined;
    if (playerData.type === PlayerType.PLAYER) {
      // 使用得分推进事件进度
      this.gameManager.addScore(score);
      
      // 检查是否触发了新事件
      const activeEvents = this.gameManager.getActiveEvents();
      if (activeEvents.length > 0) {
        eventTriggered = activeEvents[activeEvents.length - 1];
      }
    }

    console.log(`\n${playerData.type} 回合 #${playerData.moves}:`);
    console.log(`  交换: (${pos1.row},${pos1.col}) ↔ (${pos2.row},${pos2.col})`);
    console.log(`  匹配: ${swapResult.matches.length} 组`);
    console.log(`  连击: x${swapResult.combo}`);
    console.log(`  得分: +${score} (总分: ${playerData.score})`);

    // 切换回合
    this.currentTurn = this.currentTurn === PlayerType.PLAYER 
      ? PlayerType.OPPONENT 
      : PlayerType.PLAYER;

    // 检查对战是否结束
    const battleResult = this.checkBattleEnd();
    if (battleResult) {
      this.endBattle(battleResult);
    }

    return {
      success: true,
      swapResult,
      eventTriggered,
      message: `成功消除 ${swapResult.matches.length} 组，获得 ${score} 分`
    };
  }

  /**
   * 检查对战是否结束
   */
  private checkBattleEnd(): BattleResult | null {
    // 检查是否达到目标分数
    if (this.player.score >= this.config.targetScore) {
      return {
        winner: PlayerType.PLAYER,
        playerScore: this.player.score,
        opponentScore: this.opponent.score,
        reason: '玩家达到目标分数'
      };
    }

    if (this.opponent.score >= this.config.targetScore) {
      return {
        winner: PlayerType.OPPONENT,
        playerScore: this.player.score,
        opponentScore: this.opponent.score,
        reason: '对手达到目标分数'
      };
    }

    // 检查步数是否用完
    if (this.player.moves >= this.config.maxMoves && 
        this.opponent.moves >= this.config.maxMoves) {
      const winner = this.player.score > this.opponent.score 
        ? PlayerType.PLAYER 
        : this.player.score < this.opponent.score 
          ? PlayerType.OPPONENT 
          : null;
      
      return {
        winner,
        playerScore: this.player.score,
        opponentScore: this.opponent.score,
        reason: '步数用完，根据分数判定胜负'
      };
    }

    // 检查是否无法继续移动
    if (!this.player.grid.hasPossibleMoves() && 
        !this.opponent.grid.hasPossibleMoves()) {
      const winner = this.player.score > this.opponent.score 
        ? PlayerType.PLAYER 
        : this.player.score < this.opponent.score 
          ? PlayerType.OPPONENT 
          : null;
      
      return {
        winner,
        playerScore: this.player.score,
        opponentScore: this.opponent.score,
        reason: '双方无可用移动，根据分数判定胜负'
      };
    }

    return null;
  }

  /**
   * 结束对战
   */
  private endBattle(result: BattleResult): void {
    this.battleActive = false;
    this.gameManager.endGame();
    
    // 清除所有事件定时器
    this.activeEventTimers.forEach(timer => clearTimeout(timer));
    this.activeEventTimers.clear();

    console.log('\n╔════════════════════════════════════════╗');
    console.log('║      对战结束！                        ║');
    console.log('╚════════════════════════════════════════╝');
    console.log(`\n胜者: ${result.winner || '平局'}`);
    console.log(`原因: ${result.reason}`);
    console.log(`\n最终比分:`);
    console.log(`  玩家: ${result.playerScore} 分 (${this.player.moves} 步)`);
    console.log(`  对手: ${result.opponentScore} 分 (${this.opponent.moves} 步)`);
  }

  // ==================== 查询方法 ====================

  /**
   * 获取玩家数据
   */
  public getPlayerData(): PlayerData {
    return { ...this.player };
  }

  /**
   * 获取对手数据
   */
  public getOpponentData(): PlayerData {
    return { ...this.opponent };
  }

  /**
   * 获取当前回合
   */
  public getCurrentTurn(): PlayerType {
    return this.currentTurn;
  }

  /**
   * 检查对战是否活跃
   */
  public isBattleActive(): boolean {
    return this.battleActive;
  }

  /**
   * 获取事件管理器（用于查询事件状态）
   */
  public getGameManager(): GameManager {
    return this.gameManager;
  }

  /**
   * 获取对战配置
   */
  public getConfig(): BattleConfig {
    return { ...this.config };
  }

  /**
   * 获取对战状态摘要
   */
  public getBattleSummary(): string {
    const eventBar = this.gameManager.getEventBar();
    const activeEvents = this.gameManager.getActiveEvents();
    
    return `
=== 对战状态 ===
状态: ${this.battleActive ? '进行中' : '未开始/已结束'}
回合: ${this.currentTurn}

玩家: ${this.player.score} 分 (${this.player.moves}/${this.config.maxMoves} 步)
对手: ${this.opponent.score} 分 (${this.opponent.moves}/${this.config.maxMoves} 步)

事件进度: ${eventBar.getProgressPercentage().toFixed(1)}%
下一事件: ${eventBar.getNextEvent() || '无'}
活动事件: ${activeEvents.join(', ') || '无'}
`;
  }

  /**
   * 打印双方网格（用于调试）
   */
  public printGrids(): void {
    console.log('\n【玩家棋盘】');
    this.player.grid.printGrid();
    
    console.log('\n【对手棋盘】');
    this.opponent.grid.printGrid();
  }
}
