/**
 * 游戏事件类型枚举
 * 定义三消对战游戏中可能触发的各种事件
 */
export enum GameEventType {
  /** 重力反转 - 方块从上往下变成从下往上 */
  GRAVITY_REVERSE = 'GRAVITY_REVERSE',
  
  /** 冻结颜色 - 某些颜色的方块无法消除 */
  FROZEN_COLORS = 'FROZEN_COLORS',
  
  /** 连击加成 - 连击获得额外分数 */
  COMBO_BONUS = 'COMBO_BONUS',
  
  /** 生成障碍物 - 在棋盘上生成不可消除的障碍 */
  OBSTACLE_GENERATE = 'OBSTACLE_GENERATE',
  
  /** 加速 - 方块下落速度增加 */
  SPEED_UP = 'SPEED_UP'
}

/**
 * 事件配置接口
 * 用于配置每个事件的属性
 */
export interface EventConfig {
  type: GameEventType;
  duration?: number;  // 事件持续时间（毫秒）
  intensity?: number; // 事件强度（0-1）
}
