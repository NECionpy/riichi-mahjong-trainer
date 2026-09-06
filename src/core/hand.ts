import { Tile, Meld, parseHandString, sortTiles, getTileNumber } from "./tile";

// 重新导出，方便其他模块引用
export type { MeldType, Meld } from "./tile";

// 手牌结构
export interface Hand {
  handTiles: Tile[]; // 手牌（不含鸣牌）
  melds: Meld[]; // 鸣牌（吃碰杠）
  winningTile: Tile; // 和了牌
  isTsumo: boolean; // 自摸还是荣和
}

// 面子组合（用于手牌分解）
export interface MeldDecomposition {
  mentsu: Meld[]; // 面子（顺子或刻子）
  jantai: Tile[]; // 雀头（对子）
}

/**
 * 解析手牌字符串
 * 支持两种格式：
 *   旧格式：手牌 + 和了牌，如 "123m456p789s11z5m"
 *   新格式：手牌 + 鸣牌 + 和了牌，如 "123m c456m p111m 789s11z 4p"
 *   鸣牌前缀：c=吃 p=碰 k=明杠 a=暗杠 g=加杠
 */
export function parseHand(handStr: string, isTsumo: boolean = false): Hand {
  const parsed = parseHandString(handStr);

  if (!parsed.winTile) {
    throw new Error("Invalid hand format: missing winning tile");
  }

  return {
    handTiles: sortTiles(parsed.handTiles),
    melds: parsed.melds,
    winningTile: parsed.winTile,
    isTsumo,
  };
}

/**
 * 验证手牌是否有效
 */
export function validateHand(hand: Hand): boolean {
  // 检查手牌数量（不含鸣牌应该是13张，加上和了牌14张）
  const totalTiles = hand.handTiles.length + (hand.winningTile ? 1 : 0);

  // 加上鸣牌的数量
  const meldTiles = hand.melds.reduce(
    (sum, meld) => sum + meld.tiles.length,
    0,
  );
  const total = totalTiles + meldTiles;

  // 标准手牌应该是14张（4面子1雀头）
  // 七对子是14张
  // 国士无双是14张
  if (total !== 14) {
    return false;
  }

  // 检查是否有重复的牌（超过4张）
  const tileCounts = getTileCounts([
    ...hand.handTiles,
    hand.winningTile,
    ...hand.melds.flatMap((m) => m.tiles),
  ]);
  for (const count of Object.values(tileCounts)) {
    if (count > 4) {
      return false;
    }
  }

  return true;
}

/**
 * 获取牌的计数
 */
export function getTileCounts(tiles: Tile[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const tile of tiles) {
    const key = `${tile.suit}-${tile.value}`;
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

/**
 * 拆分出所有的雀头及剩余手牌
 * @param tiles 手牌
 * @returns 雀头和剩余手牌的组合
 */
function TantaiAnalysis(tiles: Tile[]): { tantai: Tile[]; rest: Tile[] }[] {
  const results = [];

  const groups = new Map();

  for (const tile of tiles) {
    const key = `${tile.suit}-${tile.value}`;

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push(tile);
  }

  for (const group of groups.values()) {
    if (group.length < 2) continue;

    for (let i = 0; i < group.length - 1; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const tantai = [group[i], group[j]];

        const tantaiId1 = group[i].id;
        const tantaiId2 = group[j].id;

        const rest = tiles.filter(
          (tile) => tile.id !== tantaiId1 && tile.id !== tantaiId2,
        );

        results.push({
          tantai,
          rest,
        });
      }
    }
  }

  return results;
}

/**
 * 分解手牌为所有可能的面子组合
 * @param tiles 手牌（不含鸣牌，但包含和了牌）
 * @param existingMelds 已有的鸣牌（吃、碰、杠），这些已经是完成的面子
 */
export function decomposeHand(
  tiles: Tile[],
  existingMelds: Meld[] = [],
): MeldDecomposition[] {
  const sorted = sortTiles(tiles);

  // 手牌分解组合
  const decompositionResults = TantaiAnalysis(sorted);

  const results: MeldDecomposition[] = [];
  const neededMentsu = 4 - existingMelds.length;

  // 验证剩余牌数：需要 neededMentsu 个面子 + 1 个雀头
  const expectedTiles = neededMentsu * 3 + 2;
  if (sorted.length !== expectedTiles) {
    return []; // 牌数不对，无法分解
  }

  for (const { tantai, rest } of decompositionResults) {
    const mentsuList = findMentsu(rest);
    for (const mentsu of mentsuList) {
      if (mentsu.length === neededMentsu) {
        results.push({
          mentsu: [...existingMelds, ...mentsu],
          jantai: tantai,
        });
      }
    }
  }

  return results;
}

/**
 * 递归查找所有面子组合
 */
function findMentsu(tiles: Tile[]): Meld[][] {
  if (tiles.length === 0) {
    return [[]];
  }

  const results: Meld[][] = [];
  const sorted = sortTiles(tiles);
  const firstTile = sorted[0];

  // 尝试刻子
  const counts = getTileCounts(sorted);
  const firstKey = `${firstTile.suit}-${firstTile.value}`;
  if (counts[firstKey] >= 3) {
    const remaining = [...sorted];
    let removed = 0;
    for (let i = remaining.length - 1; i >= 0 && removed < 3; i--) {
      if (
        remaining[i].suit === firstTile.suit &&
        remaining[i].value === firstTile.value
      ) {
        remaining.splice(i, 1);
        removed++;
      }
    }

    const subResults = findMentsu(remaining);
    for (const sub of subResults) {
      results.push([
        {
          type: "pon",
          tiles: [firstTile, firstTile, firstTile],
          isOpen: false,
        },
        ...sub,
      ]);
    }
  }

  // 尝试顺子（只有数牌可以）
  if (firstTile.suit !== "honor") {
    const num = getTileNumber(firstTile);
    if (num <= 7) {
      // 顺子最大从7开始（789）
      // 查找 num+1 和 num+2
      const next1 = sorted.find(
        (t) => t.suit === firstTile.suit && getTileNumber(t) === num + 1,
      );
      const next2 = sorted.find(
        (t) => t.suit === firstTile.suit && getTileNumber(t) === num + 2,
      );

      if (next1 && next2) {
        const remaining = [...sorted];
        removeTile(remaining, firstTile);
        removeTile(remaining, next1);
        removeTile(remaining, next2);

        const subResults = findMentsu(remaining);
        for (const sub of subResults) {
          results.push([
            { type: "chi", tiles: [firstTile, next1, next2], isOpen: false },
            ...sub,
          ]);
        }
      }
    }
  }

  return results;
}

/**
 * 从数组中移除一张牌
 */
function removeTile(tiles: Tile[], tile: Tile): void {
  const index = tiles.findIndex(
    (t) => t.suit === tile.suit && t.value === tile.value,
  );
  if (index !== -1) {
    tiles.splice(index, 1);
  }
}

/**
 * 检查是否为七对子
 */
export function isChiitoitsu(tiles: Tile[]): boolean {
  if (tiles.length !== 14) return false;

  const counts = getTileCounts(tiles);
  const values = Object.values(counts);

  // 必须有7个对子
  return values.length === 7 && values.every((c) => c === 2);
}

// 国士无双需要的13种幺九牌
const YAOCHU_TYPES = [
  { suit: "man" as const, value: 1 as const },
  { suit: "man" as const, value: 9 as const },
  { suit: "pin" as const, value: 1 as const },
  { suit: "pin" as const, value: 9 as const },
  { suit: "sou" as const, value: 1 as const },
  { suit: "sou" as const, value: 9 as const },
  { suit: "honor" as const, value: "east" as const },
  { suit: "honor" as const, value: "south" as const },
  { suit: "honor" as const, value: "west" as const },
  { suit: "honor" as const, value: "north" as const },
  { suit: "honor" as const, value: "white" as const },
  { suit: "honor" as const, value: "green" as const },
  { suit: "honor" as const, value: "red" as const },
];

/**
 * 检查是否为国士无双
 */
export function isKokushi(tiles: Tile[]): boolean {
  if (tiles.length !== 14) return false;

  const counts = getTileCounts(tiles);

  // 检查是否包含所有幺九牌
  let hasAll = true;
  let hasPair = false;

  for (const type of YAOCHU_TYPES) {
    const key = `${type.suit}-${type.value}`;
    const count = counts[key] || 0;

    if (count === 0) {
      hasAll = false;
      break;
    }
    if (count === 2) {
      hasPair = true;
    }
  }

  return hasAll && hasPair;
}

/**
 * 检查是否为国士无双十三面（13面听牌）
 * 移除和了牌后，剩余13张牌恰好是13种幺九牌各一张
 */
export function isKokushi13(tiles: Tile[], winningTile: Tile): boolean {
  if (tiles.length !== 14) return false;
  const counts = getTileCounts(tiles);
  const key = `${winningTile.suit}-${winningTile.value}`;
  counts[key] = (counts[key] || 0) - 1;

  for (const type of YAOCHU_TYPES) {
    const typeKey = `${type.suit}-${type.value}`;
    if ((counts[typeKey] || 0) !== 1) return false;
  }
  return true;
}
