/**
 * 三消网格核心系统
 * 负责网格管理、糖果生成、匹配检测、重力掉落等核心逻辑
 */

/**
 * 糖果类型枚举
 */
export enum CandyType {
  RED = 'RED',       // 红色糖果
  BLUE = 'BLUE',     // 蓝色糖果
  GREEN = 'GREEN',   // 绿色糖果
  YELLOW = 'YELLOW', // 黄色糖果
  PURPLE = 'PURPLE', // 紫色糖果
  EMPTY = 'EMPTY'    // 空格（用于标记待填充位置）
}

/**
 * 位置坐标接口
 */
export interface Position {
  row: number;
  col: number;
}

/**
 * 匹配结果接口
 */
export interface MatchResult {
  positions: Position[];  // 匹配的位置列表
  type: CandyType;       // 匹配的糖果类型
  length: number;        // 匹配长度
}

/**
 * 交换结果接口
 */
export interface SwapResult {
  success: boolean;        // 交换是否成功
  matches: MatchResult[];  // 产生的匹配
  score: number;          // 本次得分
  combo: number;          // 连击数
}

/**
 * 网格状态接口
 */
export interface GridState {
  grid: CandyType[][];
  score: number;
  combo: number;
  moves: number;
}

/**
 * 三消网格系统类
 */
export class GridSystem {
  private grid: CandyType[][];
  private readonly rows: number;
  private readonly cols: number;
  private readonly candyTypes: CandyType[];
  private frozenTypes: Set<CandyType>; // 冻结的糖果类型（事件效果）
  private gravityReversed: boolean;    // 重力反转标志（事件效果）
  
  /**
   * 构造函数
   * @param rows 行数（默认8）
   * @param cols 列数（默认8）
   */
  constructor(rows: number = 8, cols: number = 8) {
    this.rows = rows;
    this.cols = cols;
    this.candyTypes = [
      CandyType.RED,
      CandyType.BLUE,
      CandyType.GREEN,
      CandyType.YELLOW,
      CandyType.PURPLE
    ];
    this.frozenTypes = new Set();
    this.gravityReversed = false;
    this.grid = this.createEmptyGrid();
  }

  /**
   * 创建空网格
   */
  private createEmptyGrid(): CandyType[][] {
    const grid: CandyType[][] = [];
    for (let row = 0; row < this.rows; row++) {
      grid[row] = [];
      for (let col = 0; col < this.cols; col++) {
        grid[row][col] = CandyType.EMPTY;
      }
    }
    return grid;
  }

  /**
   * 初始化网格（生成无初始匹配的随机网格）
   */
  public initialize(): void {
    // 随机填充网格
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        this.grid[row][col] = this.getRandomCandy();
      }
    }

    // 消除初始匹配，确保游戏开始时没有现成的消除
    let hasMatches = true;
    let iterations = 0;
    const maxIterations = 100; // 防止无限循环

    while (hasMatches && iterations < maxIterations) {
      hasMatches = false;
      for (let row = 0; row < this.rows; row++) {
        for (let col = 0; col < this.cols; col++) {
          if (this.wouldCreateMatch(row, col, this.grid[row][col])) {
            this.grid[row][col] = this.getRandomCandy();
            hasMatches = true;
          }
        }
      }
      iterations++;
    }
  }

  /**
   * 获取随机糖果类型
   */
  private getRandomCandy(): CandyType {
    const randomIndex = Math.floor(Math.random() * this.candyTypes.length);
    return this.candyTypes[randomIndex];
  }

  /**
   * 检查在指定位置放置糖果是否会立即形成匹配
   */
  private wouldCreateMatch(row: number, col: number, candy: CandyType): boolean {
    if (candy === CandyType.EMPTY) return false;

    // 检查横向
    let horizontalCount = 1;
    // 向左检查
    for (let c = col - 1; c >= 0 && this.grid[row][c] === candy; c--) {
      horizontalCount++;
    }
    // 向右检查
    for (let c = col + 1; c < this.cols && this.grid[row][c] === candy; c++) {
      horizontalCount++;
    }
    if (horizontalCount >= 3) return true;

    // 检查纵向
    let verticalCount = 1;
    // 向上检查
    for (let r = row - 1; r >= 0 && this.grid[r][col] === candy; r--) {
      verticalCount++;
    }
    // 向下检查
    for (let r = row + 1; r < this.rows && this.grid[r][col] === candy; r++) {
      verticalCount++;
    }
    if (verticalCount >= 3) return true;

    return false;
  }

  /**
   * 交换两个位置的糖果
   * @param pos1 第一个位置
   * @param pos2 第二个位置
   * @returns 交换结果
   */
  public swap(pos1: Position, pos2: Position): SwapResult {
    // 验证位置有效性
    if (!this.isValidPosition(pos1) || !this.isValidPosition(pos2)) {
      return { success: false, matches: [], score: 0, combo: 0 };
    }

    // 验证是否相邻
    if (!this.isAdjacent(pos1, pos2)) {
      return { success: false, matches: [], score: 0, combo: 0 };
    }

    // 检查是否有冻结的糖果
    const candy1 = this.grid[pos1.row][pos1.col];
    const candy2 = this.grid[pos2.row][pos2.col];
    if (this.frozenTypes.has(candy1) || this.frozenTypes.has(candy2)) {
      return { success: false, matches: [], score: 0, combo: 0 };
    }

    // 执行交换
    this.swapCandies(pos1, pos2);

    // 检查是否产生匹配
    const matches = this.findAllMatches();

    if (matches.length === 0) {
      // 没有匹配，交换回来
      this.swapCandies(pos1, pos2);
      return { success: false, matches: [], score: 0, combo: 0 };
    }

    // 处理连锁反应
    const result = this.processCascade();

    return {
      success: true,
      matches: result.matches,
      score: result.score,
      combo: result.combo
    };
  }

  /**
   * 交换两个糖果的实际操作
   */
  private swapCandies(pos1: Position, pos2: Position): void {
    const temp = this.grid[pos1.row][pos1.col];
    this.grid[pos1.row][pos1.col] = this.grid[pos2.row][pos2.col];
    this.grid[pos2.row][pos2.col] = temp;
  }

  /**
   * 检查位置是否有效
   */
  private isValidPosition(pos: Position): boolean {
    return pos.row >= 0 && pos.row < this.rows &&
           pos.col >= 0 && pos.col < this.cols;
  }

  /**
   * 检查两个位置是否相邻
   */
  private isAdjacent(pos1: Position, pos2: Position): boolean {
    const rowDiff = Math.abs(pos1.row - pos2.row);
    const colDiff = Math.abs(pos1.col - pos2.col);
    return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
  }

  /**
   * 查找所有匹配
   */
  private findAllMatches(): MatchResult[] {
    const matches: MatchResult[] = [];
    const processed = new Set<string>();

    // 横向扫描
    for (let row = 0; row < this.rows; row++) {
      let col = 0;
      while (col < this.cols) {
        const candy = this.grid[row][col];
        if (candy === CandyType.EMPTY || this.frozenTypes.has(candy)) {
          col++;
          continue;
        }

        let matchLength = 1;
        while (col + matchLength < this.cols && 
               this.grid[row][col + matchLength] === candy &&
               !this.frozenTypes.has(candy)) {
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
          if (positions.length > 0) {
            matches.push({ positions, type: candy, length: matchLength });
          }
        }

        col += matchLength;
      }
    }

    // 纵向扫描
    for (let col = 0; col < this.cols; col++) {
      let row = 0;
      while (row < this.rows) {
        const candy = this.grid[row][col];
        if (candy === CandyType.EMPTY || this.frozenTypes.has(candy)) {
          row++;
          continue;
        }

        let matchLength = 1;
        while (row + matchLength < this.rows && 
               this.grid[row + matchLength][col] === candy &&
               !this.frozenTypes.has(candy)) {
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
          if (positions.length > 0) {
            matches.push({ positions, type: candy, length: matchLength });
          }
        }

        row += matchLength;
      }
    }

    return matches;
  }

  /**
   * 处理连锁反应（消除→掉落→检查→重复）
   */
  private processCascade(): { matches: MatchResult[], score: number, combo: number } {
    let totalScore = 0;
    let combo = 0;
    const allMatches: MatchResult[] = [];

    let matches = this.findAllMatches();

    while (matches.length > 0) {
      combo++;
      
      // 消除匹配的糖果
      for (const match of matches) {
        for (const pos of match.positions) {
          this.grid[pos.row][pos.col] = CandyType.EMPTY;
        }
        
        // 计算分数：基础分 * 匹配长度 * 连击倍数
        const baseScore = 10;
        const matchScore = baseScore * match.length * combo;
        totalScore += matchScore;
        
        allMatches.push(match);
      }

      // 应用重力
      this.applyGravity();

      // 填充空格
      this.fillEmpty();

      // 检查新的匹配
      matches = this.findAllMatches();
    }

    return { matches: allMatches, score: totalScore, combo };
  }

  /**
   * 应用重力（糖果下落或上升）
   */
  private applyGravity(): void {
    if (this.gravityReversed) {
      // 重力反转：糖果向上移动
      for (let col = 0; col < this.cols; col++) {
        let writeRow = 0; // 从上往下写入
        for (let readRow = 0; readRow < this.rows; readRow++) {
          if (this.grid[readRow][col] !== CandyType.EMPTY) {
            if (writeRow !== readRow) {
              this.grid[writeRow][col] = this.grid[readRow][col];
              this.grid[readRow][col] = CandyType.EMPTY;
            }
            writeRow++;
          }
        }
      }
    } else {
      // 正常重力：糖果向下移动
      for (let col = 0; col < this.cols; col++) {
        let writeRow = this.rows - 1; // 从下往上写入
        for (let readRow = this.rows - 1; readRow >= 0; readRow--) {
          if (this.grid[readRow][col] !== CandyType.EMPTY) {
            if (writeRow !== readRow) {
              this.grid[writeRow][col] = this.grid[readRow][col];
              this.grid[readRow][col] = CandyType.EMPTY;
            }
            writeRow--;
          }
        }
      }
    }
  }

  /**
   * 填充空格
   */
  private fillEmpty(): void {
    if (this.gravityReversed) {
      // 重力反转：从下往上填充
      for (let col = 0; col < this.cols; col++) {
        for (let row = this.rows - 1; row >= 0; row--) {
          if (this.grid[row][col] === CandyType.EMPTY) {
            this.grid[row][col] = this.getRandomCandy();
          }
        }
      }
    } else {
      // 正常重力：从上往下填充
      for (let col = 0; col < this.cols; col++) {
        for (let row = 0; row < this.rows; row++) {
          if (this.grid[row][col] === CandyType.EMPTY) {
            this.grid[row][col] = this.getRandomCandy();
          }
        }
      }
    }
  }

  /**
   * 生成障碍物
   * @param count 障碍物数量
   */
  public generateObstacles(count: number): Position[] {
    const obstacles: Position[] = [];
    const attempts = count * 3; // 最多尝试次数
    
    for (let i = 0; i < attempts && obstacles.length < count; i++) {
      const row = Math.floor(Math.random() * this.rows);
      const col = Math.floor(Math.random() * this.cols);
      const pos = { row, col };
      
      // 检查该位置是否已经是障碍物
      if (this.grid[row][col] !== CandyType.EMPTY) {
        this.grid[row][col] = CandyType.EMPTY;
        obstacles.push(pos);
      }
    }
    
    return obstacles;
  }

  // ==================== 事件效果接口 ====================

  /**
   * 冻结指定类型的糖果
   * @param types 要冻结的糖果类型
   */
  public freezeColors(types: CandyType[]): void {
    types.forEach(type => this.frozenTypes.add(type));
  }

  /**
   * 解冻所有糖果
   */
  public unfreezeColors(): void {
    this.frozenTypes.clear();
  }

  /**
   * 设置重力反转状态
   * @param reversed 是否反转
   */
  public setGravityReversed(reversed: boolean): void {
    this.gravityReversed = reversed;
  }

  // ==================== 查询方法 ====================

  /**
   * 获取网格副本
   */
  public getGrid(): CandyType[][] {
    return this.grid.map(row => [...row]);
  }

  /**
   * 获取指定位置的糖果
   */
  public getCandyAt(pos: Position): CandyType {
    if (!this.isValidPosition(pos)) {
      return CandyType.EMPTY;
    }
    return this.grid[pos.row][pos.col];
  }

  /**
   * 获取网格尺寸
   */
  public getSize(): { rows: number, cols: number } {
    return { rows: this.rows, cols: this.cols };
  }

  /**
   * 检查是否有可能的移动
   */
  public hasPossibleMoves(): boolean {
    // 检查所有相邻位置的交换是否能产生匹配
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const pos1 = { row, col };
        
        // 检查右边
        if (col < this.cols - 1) {
          const pos2 = { row, col: col + 1 };
          this.swapCandies(pos1, pos2);
          const hasMatch = this.findAllMatches().length > 0;
          this.swapCandies(pos1, pos2); // 交换回来
          if (hasMatch) return true;
        }
        
        // 检查下边
        if (row < this.rows - 1) {
          const pos2 = { row: row + 1, col };
          this.swapCandies(pos1, pos2);
          const hasMatch = this.findAllMatches().length > 0;
          this.swapCandies(pos1, pos2); // 交换回来
          if (hasMatch) return true;
        }
      }
    }
    
    return false;
  }

  /**
   * 获取当前冻结的糖果类型
   */
  public getFrozenTypes(): CandyType[] {
    return Array.from(this.frozenTypes);
  }

  /**
   * 检查重力是否反转
   */
  public isGravityReversed(): boolean {
    return this.gravityReversed;
  }

  /**
   * 打印网格（用于调试）
   */
  public printGrid(): void {
    console.log('\n=== 网格状态 ===');
    for (let row = 0; row < this.rows; row++) {
      const rowStr = this.grid[row].map(candy => {
        switch (candy) {
          case CandyType.RED: return '🔴';
          case CandyType.BLUE: return '🔵';
          case CandyType.GREEN: return '🟢';
          case CandyType.YELLOW: return '🟡';
          case CandyType.PURPLE: return '🟣';
          case CandyType.EMPTY: return '⚫';
          default: return '❓';
        }
      }).join(' ');
      console.log(rowStr);
    }
    
    if (this.frozenTypes.size > 0) {
      console.log(`冻结类型: ${Array.from(this.frozenTypes).join(', ')}`);
    }
    if (this.gravityReversed) {
      console.log('⬆️ 重力反转中');
    }
  }
}
