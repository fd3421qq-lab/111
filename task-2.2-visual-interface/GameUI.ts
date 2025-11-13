/**
 * 游戏UI系统
 * 负责可视化对战界面、动画效果和交互
 */

import { BattleManager, PlayerType, TurnResult } from './BattleManager.js';
import { GameEventType } from './GameEventType.js';
import { Position, CandyType } from './GridSystem.js';
import { AIMove } from './AIOpponent.js';

/**
 * 对战状态接口
 */
export interface BattleState {
  playerScore: number;
  opponentScore: number;
  playerMoves: number;
  opponentMoves: number;
  currentTurn: PlayerType;
  eventProgress: number;
  activeEvents: GameEventType[];
  playerGrid: CandyType[][];
  opponentGrid: CandyType[][];
}

/**
 * 游戏UI接口
 */
export interface IGameUI {
  renderBattleState(state: BattleState): void;
  highlightAIMove(move: AIMove): void;
  showEventEffect(event: GameEventType): void;
  updateScores(playerScore: number, opponentScore: number): void;
}

/**
 * UI配置接口
 */
export interface GameUIConfig {
  canvasId: string;
  width?: number;
  height?: number;
  cellSize?: number;
  animationSpeed?: number;
  enableSound?: boolean;
}

/**
 * 糖果颜色映射
 */
export const CANDY_COLORS: Record<CandyType, string> = {
  [CandyType.RED]: '#FF4444',
  [CandyType.BLUE]: '#4444FF',
  [CandyType.GREEN]: '#44FF44',
  [CandyType.YELLOW]: '#FFFF44',
  [CandyType.PURPLE]: '#FF44FF',
  [CandyType.EMPTY]: '#CCCCCC'
};

/**
 * 糖果Emoji映射（备用显示）
 */
export const CANDY_EMOJIS: Record<CandyType, string> = {
  [CandyType.RED]: '🔴',
  [CandyType.BLUE]: '🔵',
  [CandyType.GREEN]: '🟢',
  [CandyType.YELLOW]: '🟡',
  [CandyType.PURPLE]: '🟣',
  [CandyType.EMPTY]: '⚫'
};

/**
 * 游戏UI核心类
 */
export class GameUI implements IGameUI {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: Required<GameUIConfig>;
  private battleManager: BattleManager | null = null;
  
  // UI状态
  private currentState: BattleState | null = null;
  private highlightedMove: AIMove | null = null;
  private activeEventEffects: Map<GameEventType, number> = new Map();
  
  // 动画状态
  private animationFrameId: number = 0;
  private lastFrameTime: number = 0;
  
  // 交互状态
  private selectedCell: Position | null = null;
  private isPlayerTurn: boolean = true;

  constructor(config: GameUIConfig) {
    // 设置默认配置
    this.config = {
      canvasId: config.canvasId,
      width: config.width || 800,
      height: config.height || 600,
      cellSize: config.cellSize || 60,
      animationSpeed: config.animationSpeed || 1.0,
      enableSound: config.enableSound || false
    };

    // 获取Canvas元素
    const canvas = document.getElementById(this.config.canvasId) as HTMLCanvasElement;
    if (!canvas) {
      throw new Error(`Canvas element with id "${this.config.canvasId}" not found`);
    }
    
    this.canvas = canvas;
    this.canvas.width = this.config.width;
    this.canvas.height = this.config.height;
    
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context from canvas');
    }
    this.ctx = ctx;

    // 绑定事件
    this.bindEvents();
  }

  /**
   * 绑定BattleManager
   */
  public bindBattleManager(battleManager: BattleManager): void {
    this.battleManager = battleManager;
  }

  /**
   * 渲染对战状态
   */
  public renderBattleState(state: BattleState): void {
    this.currentState = state;
    this.isPlayerTurn = state.currentTurn === PlayerType.PLAYER;
    this.render();
  }

  /**
   * 高亮AI移动
   */
  public highlightAIMove(move: AIMove): void {
    this.highlightedMove = move;
    this.render();
    
    // 3秒后清除高亮
    setTimeout(() => {
      this.highlightedMove = null;
      this.render();
    }, 3000);
  }

  /**
   * 显示事件效果
   */
  public showEventEffect(event: GameEventType): void {
    this.activeEventEffects.set(event, Date.now());
    this.render();
    
    // 5秒后清除效果
    setTimeout(() => {
      this.activeEventEffects.delete(event);
      this.render();
    }, 5000);
  }

  /**
   * 更新分数
   */
  public updateScores(playerScore: number, opponentScore: number): void {
    if (this.currentState) {
      this.currentState.playerScore = playerScore;
      this.currentState.opponentScore = opponentScore;
      this.render();
    }
  }

  /**
   * 主渲染函数
   */
  private render(): void {
    if (!this.currentState) return;

    // 清空画布
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 渲染玩家网格（左侧）
    this.renderGrid(20, 100, this.currentState.playerGrid, 'PLAYER');
    
    // 渲染对手网格（右侧）
    this.renderGrid(420, 100, this.currentState.opponentGrid, 'OPPONENT');

    // 渲染分数
    this.renderScores();

    // 渲染回合指示器
    this.renderTurnIndicator();

    // 渲染事件进度条
    this.renderEventProgress();

    // 渲染激活的事件
    this.renderActiveEvents();

    // 渲染AI移动高亮
    if (this.highlightedMove) {
      this.renderAIHighlight();
    }
  }

  /**
   * 渲染网格
   */
  private renderGrid(
    x: number, 
    y: number, 
    grid: CandyType[][], 
    label: string
  ): void {
    const cellSize = this.config.cellSize;
    
    // 绘制标签
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 20px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(label, x + cellSize * 4, y - 10);

    // 绘制网格
    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        const cellX = x + col * cellSize;
        const cellY = y + row * cellSize;
        const candy = grid[row][col];

        // 绘制单元格背景
        this.ctx.fillStyle = '#2d2d44';
        this.ctx.fillRect(cellX, cellY, cellSize - 2, cellSize - 2);

        // 绘制糖果
        if (candy !== CandyType.EMPTY) {
          this.ctx.fillStyle = CANDY_COLORS[candy];
          this.ctx.beginPath();
          this.ctx.arc(
            cellX + cellSize / 2,
            cellY + cellSize / 2,
            cellSize / 2 - 8,
            0,
            Math.PI * 2
          );
          this.ctx.fill();

          // 添加高光效果
          const gradient = this.ctx.createRadialGradient(
            cellX + cellSize / 3,
            cellY + cellSize / 3,
            0,
            cellX + cellSize / 2,
            cellY + cellSize / 2,
            cellSize / 2 - 8
          );
          gradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
          gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
          this.ctx.fillStyle = gradient;
          this.ctx.fill();
        }
      }
    }
  }

  /**
   * 渲染分数
   */
  private renderScores(): void {
    if (!this.currentState) return;

    this.ctx.font = 'bold 24px Arial';
    this.ctx.textAlign = 'left';

    // 玩家分数
    this.ctx.fillStyle = '#4CAF50';
    this.ctx.fillText(
      `Player: ${this.currentState.playerScore}`,
      20,
      60
    );

    // 对手分数
    this.ctx.fillStyle = '#f44336';
    this.ctx.fillText(
      `AI: ${this.currentState.opponentScore}`,
      420,
      60
    );

    // 剩余步数
    this.ctx.font = '16px Arial';
    this.ctx.fillStyle = '#999';
    this.ctx.fillText(
      `Moves: ${this.currentState.playerMoves}`,
      20,
      80
    );
    this.ctx.fillText(
      `Moves: ${this.currentState.opponentMoves}`,
      420,
      80
    );
  }

  /**
   * 渲染回合指示器
   */
  private renderTurnIndicator(): void {
    if (!this.currentState) return;

    const text = this.isPlayerTurn ? 'YOUR TURN' : 'AI TURN';
    const color = this.isPlayerTurn ? '#4CAF50' : '#f44336';

    this.ctx.font = 'bold 28px Arial';
    this.ctx.fillStyle = color;
    this.ctx.textAlign = 'center';
    this.ctx.fillText(text, this.canvas.width / 2, 40);
  }

  /**
   * 渲染事件进度条
   */
  private renderEventProgress(): void {
    if (!this.currentState) return;

    const barWidth = 760;
    const barHeight = 20;
    const x = 20;
    const y = 550;

    // 背景
    this.ctx.fillStyle = '#2d2d44';
    this.ctx.fillRect(x, y, barWidth, barHeight);

    // 进度
    const progress = this.currentState.eventProgress / 100;
    this.ctx.fillStyle = '#FFD700';
    this.ctx.fillRect(x, y, barWidth * progress, barHeight);

    // 边框
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x, y, barWidth, barHeight);

    // 文字
    this.ctx.font = '14px Arial';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(
      `Event Progress: ${Math.round(progress * 100)}%`,
      this.canvas.width / 2,
      y + 15
    );
  }

  /**
   * 渲染激活的事件
   */
  private renderActiveEvents(): void {
    if (!this.currentState || this.currentState.activeEvents.length === 0) return;

    const y = 520;
    this.ctx.font = 'bold 16px Arial';
    this.ctx.textAlign = 'left';

    this.currentState.activeEvents.forEach((event, index) => {
      const x = 20 + index * 200;
      
      // 根据事件类型设置颜色
      let color = '#ffffff';
      let icon = '⚡';
      
      switch (event) {
        case GameEventType.GRAVITY_REVERSE:
          color = '#9C27B0';
          icon = '⬆️';
          break;
        case GameEventType.FROZEN_COLORS:
          color = '#00BCD4';
          icon = '❄️';
          break;
        case GameEventType.COMBO_BONUS:
          color = '#FFC107';
          icon = '⚡';
          break;
        case GameEventType.OBSTACLE_GENERATE:
          color = '#795548';
          icon = '🚧';
          break;
        case GameEventType.SPEED_UP:
          color = '#FF5722';
          icon = '🚀';
          break;
      }

      this.ctx.fillStyle = color;
      this.ctx.fillText(`${icon} ${event}`, x, y);
    });
  }

  /**
   * 渲染AI移动高亮
   */
  private renderAIHighlight(): void {
    if (!this.highlightedMove || !this.currentState) return;

    const cellSize = this.config.cellSize;
    const gridX = 420; // 对手网格X位置
    const gridY = 100; // 对手网格Y位置

    // 高亮第一个位置
    const x1 = gridX + this.highlightedMove.pos1.col * cellSize;
    const y1 = gridY + this.highlightedMove.pos1.row * cellSize;

    // 高亮第二个位置
    const x2 = gridX + this.highlightedMove.pos2.col * cellSize;
    const y2 = gridY + this.highlightedMove.pos2.row * cellSize;

    // 绘制高亮框
    this.ctx.strokeStyle = '#FFD700';
    this.ctx.lineWidth = 4;
    this.ctx.strokeRect(x1, y1, cellSize - 2, cellSize - 2);
    this.ctx.strokeRect(x2, y2, cellSize - 2, cellSize - 2);

    // 绘制连接线
    this.ctx.strokeStyle = '#FFD700';
    this.ctx.lineWidth = 3;
    this.ctx.setLineDash([5, 5]);
    this.ctx.beginPath();
    this.ctx.moveTo(x1 + cellSize / 2, y1 + cellSize / 2);
    this.ctx.lineTo(x2 + cellSize / 2, y2 + cellSize / 2);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // 显示AI策略说明
    this.ctx.font = '14px Arial';
    this.ctx.fillStyle = '#FFD700';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(
      `AI: ${this.highlightedMove.reason}`,
      gridX + cellSize * 4,
      gridY - 30
    );
    this.ctx.fillText(
      `Score: ${this.highlightedMove.estimatedScore}`,
      gridX + cellSize * 4,
      gridY - 50
    );
  }

  /**
   * 绑定事件监听器
   */
  private bindEvents(): void {
    this.canvas.addEventListener('click', this.handleClick.bind(this));
  }

  /**
   * 处理点击事件
   */
  private handleClick(event: MouseEvent): void {
    if (!this.isPlayerTurn || !this.currentState || !this.battleManager) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // 计算点击的网格位置（仅玩家网格）
    const gridX = 20;
    const gridY = 100;
    const cellSize = this.config.cellSize;

    if (x < gridX || x > gridX + cellSize * 8 || 
        y < gridY || y > gridY + cellSize * 8) {
      return; // 点击在玩家网格外
    }

    const col = Math.floor((x - gridX) / cellSize);
    const row = Math.floor((y - gridY) / cellSize);
    const clickedPos: Position = { row, col };

    if (!this.selectedCell) {
      // 第一次点击，选择单元格
      this.selectedCell = clickedPos;
      console.log('Selected:', clickedPos);
    } else {
      // 第二次点击，尝试交换
      console.log('Attempting swap:', this.selectedCell, clickedPos);
      
      // 执行玩家移动
      const result = this.battleManager.playerTurn(this.selectedCell, clickedPos);
      
      if (result.success) {
        console.log('Move successful!', result);
        
        // 更新状态
        this.updateStateFromBattle();
        
        // 如果是AI回合，自动执行
        if (this.battleManager.getCurrentTurn() === PlayerType.OPPONENT) {
          setTimeout(() => {
            this.executeAITurn();
          }, 1000);
        }
      } else {
        console.log('Invalid move:', result.message);
      }
      
      this.selectedCell = null;
    }
  }

  /**
   * 执行AI回合
   */
  private executeAITurn(): void {
    if (!this.battleManager || !this.battleManager.isAIEnabled()) return;

    const result = this.battleManager.executeAITurn();
    
    if (result && result.success) {
      // 获取AI移动信息（从日志中提取，实际应该从返回值获取）
      const aiStrategy = this.battleManager.getAIStrategy();
      console.log('AI Strategy:', aiStrategy);
      
      // 更新状态
      this.updateStateFromBattle();
    }
  }

  /**
   * 从BattleManager更新状态
   */
  private updateStateFromBattle(): void {
    if (!this.battleManager) return;

    const playerData = this.battleManager.getPlayerData();
    const opponentData = this.battleManager.getOpponentData();
    const gameManager = this.battleManager.getGameManager();
    const eventBar = gameManager.getEventBar();

    const state: BattleState = {
      playerScore: playerData.score,
      opponentScore: opponentData.score,
      playerMoves: playerData.moves,
      opponentMoves: opponentData.moves,
      currentTurn: this.battleManager.getCurrentTurn(),
      eventProgress: eventBar.getProgressPercentage(),
      activeEvents: gameManager.getActiveEvents(),
      playerGrid: playerData.grid.getGrid(),
      opponentGrid: opponentData.grid.getGrid()
    };

    this.renderBattleState(state);
  }

  /**
   * 启动游戏循环（可选，用于动画）
   */
  public startGameLoop(): void {
    const loop = (timestamp: number) => {
      if (this.lastFrameTime === 0) {
        this.lastFrameTime = timestamp;
      }

      const deltaTime = timestamp - this.lastFrameTime;
      
      // 这里可以添加动画更新逻辑
      // this.updateAnimations(deltaTime);
      
      this.render();
      this.lastFrameTime = timestamp;
      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  /**
   * 停止游戏循环
   */
  public stopGameLoop(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = 0;
    }
  }

  /**
   * 清理资源
   */
  public dispose(): void {
    this.stopGameLoop();
    this.canvas.removeEventListener('click', this.handleClick);
  }
}
