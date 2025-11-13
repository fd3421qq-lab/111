/**
 * AI 对手系统
 * 实现智能移动选择策略，支持单人测试和演示
 */

import { GridSystem, CandyType, Position, MatchResult } from './GridSystem.js';

/**
 * AI 移动接口
 */
export interface AIMove {
  pos1: Position;
  pos2: Position;
  estimatedScore: number;
  reason: string; // 移动策略说明
}

/**
 * 移动评估结果
 */
interface MoveEvaluation {
  move: { pos1: Position; pos2: Position };
  matchCount: number;      // 匹配组数
  totalCandies: number;    // 匹配糖果总数
  longestMatch: number;    // 最长匹配长度
  hasCascade: boolean;     // 是否可能产生连锁
  estimatedScore: number;  // 预估分数
}

/**
 * AI 策略类型
 */
export enum AIStrategy {
  AGGRESSIVE = 'AGGRESSIVE',   // 激进：追求高风险高回报
  BALANCED = 'BALANCED',       // 平衡：综合考虑多个因素
  CONSERVATIVE = 'CONSERVATIVE' // 保守：优先确保有效移动
}

/**
 * AI 对手类
 * 实现基于规则的智能移动选择
 */
export class AIOpponent {
  private grid: GridSystem;
  private currentStrategy: AIStrategy;
  private strategyChangeChance: number = 0.2; // 20% 概率切换到激进策略
  
  /**
   * 构造函数
   * @param grid 网格系统实例
   */
  constructor(grid: GridSystem) {
    this.grid = grid;
    this.currentStrategy = AIStrategy.BALANCED;
  }

  /**
   * 查找最佳移动
   * @returns AI 移动或 null（如果没有有效移动）
   */
  public findBestMove(): AIMove | null {
    // 20% 概率切换到激进策略
    if (Math.random() < this.strategyChangeChance) {
      this.currentStrategy = AIStrategy.AGGRESSIVE;
    } else {
      this.currentStrategy = AIStrategy.BALANCED;
    }

    // 获取所有可能的移动
    const possibleMoves = this.findAllPossibleMoves();
    
    if (possibleMoves.length === 0) {
      return null;
    }

    // 评估所有移动
    const moveEvals = possibleMoves.map(move => this.evaluateMove(move));
    
    // 过滤出有效移动（能产生匹配的）
    const validMoves = moveEvals.filter(e => e.matchCount > 0);
    
    if (validMoves.length === 0) {
      return null;
    }

    // 根据策略选择最佳移动
    const bestEvaluation = this.selectBestMove(validMoves);
    
    return {
      pos1: bestEvaluation.move.pos1,
      pos2: bestEvaluation.move.pos2,
      estimatedScore: bestEvaluation.estimatedScore,
      reason: this.getMoveReason(bestEvaluation)
    };
  }

  /**
   * 获取当前移动策略描述
   * @returns 策略描述字符串
   */
  public getMoveStrategy(): string {
    switch (this.currentStrategy) {
      case AIStrategy.AGGRESSIVE:
        return '激进策略：追求最高分数和最长匹配，冒险尝试连锁反应';
      case AIStrategy.BALANCED:
        return '平衡策略：综合考虑匹配长度、数量和连锁可能性';
      case AIStrategy.CONSERVATIVE:
        return '保守策略：优先选择确保能消除的安全移动';
      default:
        return '未知策略';
    }
  }

  /**
   * 设置策略切换概率
   * @param chance 切换到激进策略的概率（0-1）
   */
  public setStrategyChangeChance(chance: number): void {
    this.strategyChangeChance = Math.max(0, Math.min(1, chance));
  }

  /**
   * 手动设置策略
   * @param strategy 目标策略
   */
  public setStrategy(strategy: AIStrategy): void {
    this.currentStrategy = strategy;
  }

  /**
   * 获取当前策略
   * @returns 当前策略
   */
  public getCurrentStrategy(): AIStrategy {
    return this.currentStrategy;
  }

  // ==================== 私有方法：移动搜索和评估 ====================

  /**
   * 查找所有可能的移动（相邻交换）
   */
  private findAllPossibleMoves(): { pos1: Position; pos2: Position }[] {
    const moves: { pos1: Position; pos2: Position }[] = [];
    const gridSize = this.grid.getSize();

    for (let row = 0; row < gridSize.rows; row++) {
      for (let col = 0; col < gridSize.cols; col++) {
        const pos1: Position = { row, col };

        // 检查右边
        if (col < gridSize.cols - 1) {
          const pos2: Position = { row, col: col + 1 };
          moves.push({ pos1, pos2 });
        }

        // 检查下边
        if (row < gridSize.rows - 1) {
          const pos2: Position = { row: row + 1, col };
          moves.push({ pos1, pos2 });
        }
      }
    }

    return moves;
  }

  /**
   * 评估单个移动
   * @param move 移动
   * @returns 评估结果
   */
  private evaluateMove(move: { pos1: Position; pos2: Position }): MoveEvaluation {
    // 创建网格副本进行模拟
    const gridCopy = this.createGridCopy();
    
    // 模拟交换
    const candy1 = gridCopy[move.pos1.row][move.pos1.col];
    const candy2 = gridCopy[move.pos2.row][move.pos2.col];
    gridCopy[move.pos1.row][move.pos1.col] = candy2;
    gridCopy[move.pos2.row][move.pos2.col] = candy1;

    // 检测匹配
    const matches = this.findMatchesInGrid(gridCopy);
    
    if (matches.length === 0) {
      return {
        move,
        matchCount: 0,
        totalCandies: 0,
        longestMatch: 0,
        hasCascade: false,
        estimatedScore: 0
      };
    }

    // 统计匹配信息
    let totalCandies = 0;
    let longestMatch = 0;
    
    for (const match of matches) {
      totalCandies += match.positions.length;
      longestMatch = Math.max(longestMatch, match.length);
    }

    // 评估连锁可能性
    const hasCascade = this.evaluateCascadePotential(gridCopy, matches);

    // 计算预估分数
    const estimatedScore = this.calculateEstimatedScore(
      matches.length,
      totalCandies,
      longestMatch,
      hasCascade
    );

    return {
      move,
      matchCount: matches.length,
      totalCandies,
      longestMatch,
      hasCascade,
      estimatedScore
    };
  }

  /**
   * 根据策略选择最佳移动
   * @param moveEvals 所有有效移动的评估结果
   * @returns 最佳移动评估
   */
  private selectBestMove(moveEvals: MoveEvaluation[]): MoveEvaluation {
    if (moveEvals.length === 1) {
      return moveEvals[0];
    }

    switch (this.currentStrategy) {
      case AIStrategy.AGGRESSIVE:
        // 激进策略：优先选择最高分数，其次最长匹配
        return moveEvals.reduce((best, current) => {
          if (current.estimatedScore > best.estimatedScore) return current;
          if (current.estimatedScore === best.estimatedScore && 
              current.longestMatch > best.longestMatch) return current;
          return best;
        });

      case AIStrategy.BALANCED:
        // 平衡策略：综合评分
        return moveEvals.reduce((best, current) => {
          const bestScore = this.calculateBalancedScore(best);
          const currentScore = this.calculateBalancedScore(current);
          return currentScore > bestScore ? current : best;
        });

      case AIStrategy.CONSERVATIVE:
        // 保守策略：优先匹配组数多的
        return moveEvals.reduce((best, current) => {
          if (current.matchCount > best.matchCount) return current;
          if (current.matchCount === best.matchCount && 
              current.totalCandies > best.totalCandies) return current;
          return best;
        });

      default:
        return moveEvals[0];
    }
  }

  /**
   * 计算平衡策略的综合评分
   */
  private calculateBalancedScore(moveEval: MoveEvaluation): number {
    return (
      moveEval.estimatedScore * 1.0 +       // 预估分数权重 1.0
      moveEval.matchCount * 30 +            // 匹配组数权重 30
      moveEval.longestMatch * 20 +          // 最长匹配权重 20
      (moveEval.hasCascade ? 50 : 0)        // 连锁潜力权重 50
    );
  }

  /**
   * 计算预估分数
   */
  private calculateEstimatedScore(
    matchCount: number,
    totalCandies: number,
    longestMatch: number,
    hasCascade: boolean
  ): number {
    const baseScore = 10;
    let score = 0;

    // 基础分数：每个糖果 10 分
    score += totalCandies * baseScore;

    // 匹配长度加成：超过 3 个的每个额外糖果 +20 分
    if (longestMatch > 3) {
      score += (longestMatch - 3) * 20;
    }

    // 多组匹配加成：每额外一组 +30 分
    if (matchCount > 1) {
      score += (matchCount - 1) * 30;
    }

    // 连锁潜力加成：+50%
    if (hasCascade) {
      score = Math.floor(score * 1.5);
    }

    return score;
  }

  /**
   * 评估连锁潜力
   * 检查消除后是否可能产生新的匹配
   */
  private evaluateCascadePotential(
    grid: CandyType[][],
    matches: MatchResult[]
  ): boolean {
    // 简化评估：检查匹配位置附近是否有相同颜色的糖果聚集
    const gridSize = this.grid.getSize();
    
    for (const match of matches) {
      for (const pos of match.positions) {
        // 检查周围 3x3 区域
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const newRow = pos.row + dr;
            const newCol = pos.col + dc;
            
            if (newRow >= 0 && newRow < gridSize.rows &&
                newCol >= 0 && newCol < gridSize.cols) {
              const candy = grid[newRow][newCol];
              
              // 如果周围有相同颜色的糖果，可能产生连锁
              if (candy !== CandyType.EMPTY && candy !== match.type) {
                // 检查这个糖果周围是否有 2 个以上相同颜色
                let sameColorCount = 0;
                for (let dr2 = -1; dr2 <= 1; dr2++) {
                  for (let dc2 = -1; dc2 <= 1; dc2++) {
                    const checkRow = newRow + dr2;
                    const checkCol = newCol + dc2;
                    if (checkRow >= 0 && checkRow < gridSize.rows &&
                        checkCol >= 0 && checkCol < gridSize.cols &&
                        grid[checkRow][checkCol] === candy) {
                      sameColorCount++;
                    }
                  }
                }
                if (sameColorCount >= 2) {
                  return true;
                }
              }
            }
          }
        }
      }
    }
    
    return false;
  }

  /**
   * 生成移动原因说明
   */
  private getMoveReason(moveEval: MoveEvaluation): string {
    const parts: string[] = [];

    // 基础信息
    if (moveEval.matchCount === 1) {
      parts.push(`消除 ${moveEval.totalCandies} 个糖果`);
    } else {
      parts.push(`${moveEval.matchCount} 组匹配，共 ${moveEval.totalCandies} 个糖果`);
    }

    // 特殊匹配
    if (moveEval.longestMatch >= 5) {
      parts.push(`超长匹配(${moveEval.longestMatch}连)`);
    } else if (moveEval.longestMatch >= 4) {
      parts.push(`长匹配(${moveEval.longestMatch}连)`);
    }

    // 连锁潜力
    if (moveEval.hasCascade) {
      parts.push('可能触发连锁');
    }

    // 策略说明
    switch (this.currentStrategy) {
      case AIStrategy.AGGRESSIVE:
        parts.push('【激进】');
        break;
      case AIStrategy.CONSERVATIVE:
        parts.push('【保守】');
        break;
    }

    return parts.join(' | ');
  }

  // ==================== 辅助方法 ====================

  /**
   * 创建网格副本
   */
  private createGridCopy(): CandyType[][] {
    const original = this.grid.getGrid();
    return original.map(row => [...row]);
  }

  /**
   * 在网格副本中查找匹配
   */
  private findMatchesInGrid(grid: CandyType[][]): MatchResult[] {
    const matches: MatchResult[] = [];
    const gridSize = this.grid.getSize();
    const processed = new Set<string>();

    // 横向扫描
    for (let row = 0; row < gridSize.rows; row++) {
      let col = 0;
      while (col < gridSize.cols) {
        const candy = grid[row][col];
        if (candy === CandyType.EMPTY) {
          col++;
          continue;
        }

        let matchLength = 1;
        while (col + matchLength < gridSize.cols && 
               grid[row][col + matchLength] === candy) {
          matchLength++;
        }

        if (matchLength >= 3) {
          const positions: Position[] = [];
          for (let i = 0; i < matchLength; i++) {
            const pos = { row, col: col + i };
            const key = `${pos.row},${pos.col}`;
            if (!processed.has(key)) {
              positions.push(pos);
              processed.add(key);
            }
          }
          if (positions.length >= 3) {
            matches.push({ positions, type: candy, length: matchLength });
          }
        }

        col += matchLength;
      }
    }

    // 纵向扫描
    for (let col = 0; col < gridSize.cols; col++) {
      let row = 0;
      while (row < gridSize.rows) {
        const candy = grid[row][col];
        if (candy === CandyType.EMPTY) {
          row++;
          continue;
        }

        let matchLength = 1;
        while (row + matchLength < gridSize.rows && 
               grid[row + matchLength][col] === candy) {
          matchLength++;
        }

        if (matchLength >= 3) {
          const positions: Position[] = [];
          for (let i = 0; i < matchLength; i++) {
            const pos = { row: row + i, col };
            const key = `${pos.row},${pos.col}`;
            if (!processed.has(key)) {
              positions.push(pos);
              processed.add(key);
            }
          }
          if (positions.length >= 3) {
            matches.push({ positions, type: candy, length: matchLength });
          }
        }

        row += matchLength;
      }
    }

    return matches;
  }

  /**
   * 获取移动统计信息（用于调试和测试）
   */
  public getDebugInfo(): string {
    const possibleMoves = this.findAllPossibleMoves();
    const moveEvals = possibleMoves.map(move => this.evaluateMove(move));
    const validMoves = moveEvals.filter(e => e.matchCount > 0);

    return `
AI 调试信息:
  当前策略: ${this.getMoveStrategy()}
  可能移动总数: ${possibleMoves.length}
  有效移动数: ${validMoves.length}
  成功率: ${validMoves.length > 0 ? ((validMoves.length / possibleMoves.length) * 100).toFixed(1) : 0}%
  平均预估分数: ${validMoves.length > 0 ? (validMoves.reduce((sum, e) => sum + e.estimatedScore, 0) / validMoves.length).toFixed(0) : 0}
    `;
  }
}
