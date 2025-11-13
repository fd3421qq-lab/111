/**
 * 网格渲染器
 * 负责渲染游戏网格、糖果和特效
 */

import { CandyType } from '../GridSystem.js';

export interface RenderConfig {
  cellSize: number;
  padding: number;
  candyRadius: number;
}

export class GridRenderer {
  private ctx: CanvasRenderingContext2D;
  private config: RenderConfig;

  constructor(ctx: CanvasRenderingContext2D, config: Partial<RenderConfig> = {}) {
    this.ctx = ctx;
    this.config = {
      cellSize: config.cellSize || 60,
      padding: config.padding || 5,
      candyRadius: config.candyRadius || 25
    };
  }

  /**
   * 渲染网格
   */
  public renderGrid(
    x: number,
    y: number,
    grid: CandyType[][],
    frozenColors: CandyType[] = []
  ): void {
    const { cellSize, padding, candyRadius } = this.config;

    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        const cellX = x + col * cellSize;
        const cellY = y + row * cellSize;
        const candy = grid[row][col];

        // 绘制单元格背景
        this.ctx.fillStyle = '#2d2d44';
        this.ctx.fillRect(
          cellX + padding,
          cellY + padding,
          cellSize - padding * 2,
          cellSize - padding * 2
        );

        // 绘制糖果
        if (candy !== CandyType.EMPTY) {
          this.renderCandy(
            cellX + cellSize / 2,
            cellY + cellSize / 2,
            candy,
            frozenColors.includes(candy)
          );
        }
      }
    }
  }

  /**
   * 渲染单个糖果
   */
  private renderCandy(
    x: number,
    y: number,
    candy: CandyType,
    isFrozen: boolean = false
  ): void {
    const { candyRadius } = this.config;

    // 糖果颜色
    const colors: Record<CandyType, string> = {
      [CandyType.RED]: '#FF4444',
      [CandyType.BLUE]: '#4444FF',
      [CandyType.GREEN]: '#44FF44',
      [CandyType.YELLOW]: '#FFFF44',
      [CandyType.PURPLE]: '#FF44FF',
      [CandyType.EMPTY]: '#CCCCCC'
    };

    // 绘制糖果圆形
    this.ctx.fillStyle = colors[candy];
    this.ctx.beginPath();
    this.ctx.arc(x, y, candyRadius, 0, Math.PI * 2);
    this.ctx.fill();

    // 添加高光
    const gradient = this.ctx.createRadialGradient(
      x - candyRadius / 3,
      y - candyRadius / 3,
      0,
      x,
      y,
      candyRadius
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    this.ctx.fillStyle = gradient;
    this.ctx.fill();

    // 冻结效果
    if (isFrozen) {
      this.ctx.strokeStyle = '#00BCD4';
      this.ctx.lineWidth = 3;
      this.ctx.setLineDash([5, 5]);
      this.ctx.beginPath();
      this.ctx.arc(x, y, candyRadius + 3, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }
  }

  /**
   * 高亮单元格
   */
  public highlightCell(
    x: number,
    y: number,
    row: number,
    col: number,
    color: string = '#FFD700'
  ): void {
    const { cellSize, padding } = this.config;
    const cellX = x + col * cellSize;
    const cellY = y + row * cellSize;

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 4;
    this.ctx.strokeRect(
      cellX + padding,
      cellY + padding,
      cellSize - padding * 2,
      cellSize - padding * 2
    );
  }

  /**
   * 绘制连接线
   */
  public drawConnectionLine(
    x: number,
    y: number,
    fromRow: number,
    fromCol: number,
    toRow: number,
    toCol: number,
    color: string = '#FFD700'
  ): void {
    const { cellSize } = this.config;

    const fromX = x + fromCol * cellSize + cellSize / 2;
    const fromY = y + fromRow * cellSize + cellSize / 2;
    const toX = x + toCol * cellSize + cellSize / 2;
    const toY = y + toRow * cellSize + cellSize / 2;

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 3;
    this.ctx.setLineDash([5, 5]);
    this.ctx.beginPath();
    this.ctx.moveTo(fromX, fromY);
    this.ctx.lineTo(toX, toY);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }
}
