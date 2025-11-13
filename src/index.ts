/**
 * 三消对战游戏事件系统核心框架
 * 主入口文件
 */

// 事件系统核心
export { GameEventType, EventConfig } from './GameEventType.js';
export { EventBar } from './EventBar.js';
export { GameManager, GameState } from './GameManager.js';

// 三消网格系统
export { GridSystem, CandyType, Position, MatchResult, SwapResult, GridState } from './GridSystem.js';

// 对战管理系统
export { BattleManager, PlayerType, PlayerData, BattleResult, TurnResult, BattleConfig, AIMove } from './BattleManager.js';
