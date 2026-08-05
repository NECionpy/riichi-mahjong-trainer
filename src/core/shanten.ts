import { Tile, getTileNumber } from "./tile";

/**
 * 向听数计算结果
 */
export interface ShantenResult {
  regular: number; // 普通面子向听数（4面子1雀头形）
  chiitoitsu: number; // 七对子向听数
  kokushi: number; // 国士无双向听数
  shanten: number; // 最终向听数（取三种向听数中的最小值，-1表示已和了，0表示听牌）
}

/**
 * 将牌转换为34种牌的索引（0-33）
 * 0-8: 1m-9m
 * 9-17: 1p-9p
 * 18-26: 1s-9s
 * 27-33: 1z-7z
 */
function tileToIndex(tile: Tile): number {
  if (tile.suit === "man") return getTileNumber(tile) - 1;
  if (tile.suit === "pin") return getTileNumber(tile) - 1 + 9;
  if (tile.suit === "sou") return getTileNumber(tile) - 1 + 18;
  if (tile.suit === "honor") return getTileNumber(tile) - 1 + 27;
  return -1;
}

/**
 * 将牌数组转换为34种牌的计数数组
 */
function tilesToCounts(tiles: Tile[]): number[] {
  const counts = new Array(34).fill(0);
  for (const tile of tiles) {
    const idx = tileToIndex(tile);
    if (idx >= 0) counts[idx]++;
  }
  return counts;
}

/**
 * 计算向听数（支持所有牌形）
 * @param tiles 手牌（13张或14张）
 * @param meldCount 副露面子数
 */
export function calculateShanten(
  tiles: Tile[],
  meldCount: number = 0,
): ShantenResult {
  const counts = tilesToCounts(tiles);

  // 判断是否有大于4张的牌
  if (counts.some((count) => count > 4)) {
    return {
      regular: -2,
      chiitoitsu: -2,
      kokushi: -2,
      shanten: -2,
    };
  }

  // 计算三种牌形的向听数，取最小值
  const regular = calculateRegularShanten(counts, meldCount);
  const chiitoitsu = calculateChiitoiShanten(counts);
  const kokushi = calculateKokushiShanten(counts);

  const minShanten = Math.min(regular, chiitoitsu, kokushi);

  return {
    regular,
    chiitoitsu,
    kokushi,
    shanten: minShanten,
  };
}

/**
 * 计算常规形（4面子1雀头）的向听数
 */
function calculateRegularShanten(counts: number[], meldCount: number): number {
  let minShanten = 8;

  // 尝试所有可能的雀头
  for (let i = 0; i < 34; i++) {
    if (counts[i] >= 2) {
      counts[i] -= 2;
      const shanten = findRegularShantenHelper(counts, 0, 0, meldCount, true);
      minShanten = Math.min(minShanten, shanten);
      counts[i] += 2;
    }
  }

  // 没有雀头的情况（需要额外1向听来凑雀头）
  const shantenNoPair = findRegularShantenHelper(
    counts,
    0,
    0,
    meldCount,
    false,
  );
  minShanten = Math.min(minShanten, shantenNoPair);

  return minShanten;
}

/**
 * 递归搜索常规形的向听数
 * @param hasPair 是否已经确定了雀头
 */
function findRegularShantenHelper(
  counts: number[],
  mentsuCount: number,
  tatsuCount: number,
  meldCount: number,
  hasPair: boolean,
): number {
  // 找到第一个有牌的索引
  let startIndex = -1;
  for (let i = 0; i < 34; i++) {
    if (counts[i] > 0) {
      startIndex = i;
      break;
    }
  }

  if (startIndex === -1) {
    // 所有牌都用完了
    const requiredMentsu = 4 - meldCount;
    const need = requiredMentsu - mentsuCount;
    // 搭子数不能超过需要的面子数（超出无意义）
    const effectiveTatsu = Math.min(tatsuCount, need);
    // 未确定雀头时需要额外1向听
    const pairPenalty = hasPair ? 0 : 1;
    // 完成手牌所需总牌数 = 每个欠缺面子需2张 - 已有搭子各减1张 + 缺雀头加1张
    const tilesNeeded = need * 2 - effectiveTatsu + pairPenalty;
    // 向听数 = 完成手牌所需牌数 - 1（因听牌=需1张即和=0向听）
    // 已和了(tilesNeeded=0) → -1向听，听牌(tilesNeeded=1) → 0向听
    if (tilesNeeded <= 0) return -1;
    if (tilesNeeded === 1) return 0;
    return tilesNeeded - 1;
  }

  let minShanten = 8;

  // 尝试刻子
  if (counts[startIndex] >= 3) {
    counts[startIndex] -= 3;
    const shanten = findRegularShantenHelper(
      counts,
      mentsuCount + 1,
      tatsuCount,
      meldCount,
      hasPair,
    );
    minShanten = Math.min(minShanten, shanten);
    counts[startIndex] += 3;
  }

  // 尝试顺子（只有数牌，且不是字牌）
  const suitStart = Math.floor(startIndex / 9) * 9;
  const posInSuit = startIndex - suitStart;

  if (posInSuit <= 6 && startIndex < 27) {
    // 只有数牌可以组成顺子
    if (counts[startIndex + 1] > 0 && counts[startIndex + 2] > 0) {
      counts[startIndex]--;
      counts[startIndex + 1]--;
      counts[startIndex + 2]--;
      const shanten = findRegularShantenHelper(
        counts,
        mentsuCount + 1,
        tatsuCount,
        meldCount,
        hasPair,
      );
      minShanten = Math.min(minShanten, shanten);
      counts[startIndex]++;
      counts[startIndex + 1]++;
      counts[startIndex + 2]++;
    }
  }

  // 尝试对子（作为搭子）
  if (counts[startIndex] >= 2) {
    counts[startIndex] -= 2;
    const shanten = findRegularShantenHelper(
      counts,
      mentsuCount,
      tatsuCount + 1,
      meldCount,
      hasPair,
    );
    minShanten = Math.min(minShanten, shanten);
    counts[startIndex] += 2;
  }

  // 尝试两面/边张搭子
  if (posInSuit <= 7 && startIndex < 27) {
    if (counts[startIndex + 1] > 0) {
      counts[startIndex]--;
      counts[startIndex + 1]--;
      const shanten = findRegularShantenHelper(
        counts,
        mentsuCount,
        tatsuCount + 1,
        meldCount,
        hasPair,
      );
      minShanten = Math.min(minShanten, shanten);
      counts[startIndex]++;
      counts[startIndex + 1]++;
    }
  }

  // 尝试坎张搭子
  if (posInSuit <= 6 && startIndex < 27) {
    if (counts[startIndex + 2] > 0) {
      counts[startIndex]--;
      counts[startIndex + 2]--;
      const shanten = findRegularShantenHelper(
        counts,
        mentsuCount,
        tatsuCount + 1,
        meldCount,
        hasPair,
      );
      minShanten = Math.min(minShanten, shanten);
      counts[startIndex]++;
      counts[startIndex + 2]++;
    }
  }

  // 不组成任何组合（孤立牌）
  counts[startIndex]--;
  const shanten = findRegularShantenHelper(
    counts,
    mentsuCount,
    tatsuCount,
    meldCount,
    hasPair,
  );
  minShanten = Math.min(minShanten, shanten);
  counts[startIndex]++;

  return minShanten;
}

/**
 * 计算七对子的向听数
 * 七对子听牌条件：6个对子 + 1个单张（等待第7个对子）
 * 向听数 = 6 - 已有对子数 + 不足的牌种类数
 */
function calculateChiitoiShanten(counts: number[]): number {
  let pairCount = 0;
  let uniqueTypes = 0;

  for (let i = 0; i < 34; i++) {
    if (counts[i] >= 2) pairCount++;
    if (counts[i] >= 1) uniqueTypes++;
  }
  // 距离听牌（6对子）所需的向听数 + 牌种类不足的惩罚
  return 6 - pairCount + Math.max(0, 7 - uniqueTypes);
}

/**
 * 计算国士无双的向听数
 */
function calculateKokushiShanten(counts: number[]): number {
  // 国士无双只能是门清，且必须是13张牌
  const totalTiles = counts.reduce((a, b) => a + b, 0);
  if (totalTiles !== 13) return 8;

  // 国士无双需要的13种牌
  const yaochuIndices = [
    0,
    8, // 1m, 9m
    9,
    17, // 1p, 9p
    18,
    26, // 1s, 9s
    27,
    28,
    29,
    30,
    31,
    32,
    33, // 1z-7z
  ];

  let uniqueYaochu = 0;
  let hasPair = false;

  for (const idx of yaochuIndices) {
    if (counts[idx] >= 1) uniqueYaochu++;
    if (counts[idx] >= 2) hasPair = true;
  }

  // 需要13种幺九牌各至少1张，其中1种有2张
  return 13 - uniqueYaochu - (hasPair ? 1 : 0);
}
