import { Tile, TileSuit, TileValue, HonorType, getTileNumber, isHonorTile, createTile } from './tile';
import { calculateShanten } from './shanten';

/**
 * 听牌结果
 */
export interface WaitResult {
  isTenpai: boolean;
  waitingTiles: Tile[];  // 听的牌
  waitType: WaitType[];  // 听牌类型
}

/**
 * 听牌类型
 */
export type WaitType = 'ryanmen' | 'shanpon' | 'kanchan' | 'penchan' | 'tanki';

/**
 * 判断手牌是否听牌，并返回听的牌
 * @param tiles 手牌（13张）
 */
export function detectWait(tiles: Tile[]): WaitResult {
  if (tiles.length !== 13) {
    return {
      isTenpai: false,
      waitingTiles: [],
      waitType: []
    };
  }

  const waitingTiles: Tile[] = [];
  const waitTypeMap: Map<string, WaitType> = new Map();

  // 尝试添加每一张可能的牌，检查是否和了
  const allPossibleTiles = generateAllTiles();

  for (const testTile of allPossibleTiles) {
    const testHand = [...tiles, testTile];
    const shantenResult = calculateShanten(testHand);

    // 向听数为-1表示已和了
    if (shantenResult.shanten === -1) {
      waitingTiles.push(testTile);

      // 判断听牌类型（简化处理）
      const waitType = determineWaitType(tiles, testTile);
      waitTypeMap.set(tileKey(testTile), waitType);
    }
  }

  return {
    isTenpai: waitingTiles.length > 0,
    waitingTiles,
    waitType: Array.from(waitTypeMap.values())
  };
}

/**
 * 生成所有可能的牌（每种牌4张，但只返回34种不同的牌）
 */
function generateAllTiles(): Tile[] {
  const tiles: Tile[] = [];
  let id = 0;

  // 数牌
  const suits: TileSuit[] = ['man', 'pin', 'sou'];
  for (const suit of suits) {
    for (let value = 1; value <= 9; value++) {
      tiles.push(createTile(suit, value as TileValue, id++));
    }
  }

  // 字牌
  const honorTypes: HonorType[] = ['east', 'south', 'west', 'north', 'white', 'green', 'red'];
  for (const honor of honorTypes) {
    tiles.push(createTile('honor', honor, id++));
  }

  return tiles;
}

/**
 * 判断听牌类型
 */
function determineWaitType(tiles: Tile[], winningTile: Tile): WaitType {
  // 简化的听牌类型判断
  // 实际应该根据手牌结构详细分析

  // 单骑听牌：手牌中只有一张与和了牌相同的牌
  const sameCount = tiles.filter(t =>
    t.suit === winningTile.suit && t.value === winningTile.value
  ).length;

  if (sameCount === 3) {
    return 'shanpon'; // 双碰听
  }

  if (sameCount === 0) {
    // 可能是两面、坎张或边张
    if (isHonorTile(winningTile)) {
      return 'tanki'; // 字牌只能是单骑
    }

    const num = getTileNumber(winningTile);

    // 检查是否是坎张
    const prevTile = tiles.find(t =>
      t.suit === winningTile.suit && getTileNumber(t) === num - 1
    );
    const nextTile = tiles.find(t =>
      t.suit === winningTile.suit && getTileNumber(t) === num + 1
    );

    if (prevTile && nextTile) {
      return 'kanchan'; // 坎张听
    }

    // 检查是否是边张
    if (num === 3 && tiles.find(t => t.suit === winningTile.suit && getTileNumber(t) === 1) &&
        tiles.find(t => t.suit === winningTile.suit && getTileNumber(t) === 2)) {
      return 'penchan'; // 边张听
    }

    if (num === 7 && tiles.find(t => t.suit === winningTile.suit && getTileNumber(t) === 8) &&
        tiles.find(t => t.suit === winningTile.suit && getTileNumber(t) === 9)) {
      return 'penchan'; // 边张听
    }

    // 默认两面听
    return 'ryanmen';
  }

  return 'tanki'; // 单骑听
}

/**
 * 获取牌的唯一标识键
 */
function tileKey(tile: Tile): string {
  return `${tile.suit}-${tile.value}`;
}

/**
 * 判断是否为清一色手牌
 */
export function isChinitsu(tiles: Tile[]): boolean {
  if (tiles.length === 0) return false;

  const firstSuit = tiles[0].suit;

  // 清一色：所有牌都是同一花色，且不能是字牌
  if (firstSuit === 'honor') return false;

  return tiles.every(t => t.suit === firstSuit);
}

/**
 * 判断手牌是否听牌（简化版）
 */
export function isTenpai(tiles: Tile[]): boolean {
  const result = detectWait(tiles);
  return result.isTenpai;
}
