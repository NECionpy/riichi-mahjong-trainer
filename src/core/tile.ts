// 牌的类型定义
export type TileSuit = 'man' | 'pin' | 'sou' | 'honor';
export type TileValue = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type HonorType = 'east' | 'south' | 'west' | 'north' | 'white' | 'green' | 'red';

export interface Tile {
  suit: TileSuit;
  value: TileValue | HonorType;
  id: number; // 唯一标识（0-135，共136张牌）
}

// 鸣牌类型
export type MeldType = 'chi' | 'pon' | 'minkan' | 'ankan' | 'kakan';

// 鸣牌（吃、碰、杠）
export interface Meld {
  type: MeldType;
  tiles: Tile[];
  isOpen: boolean; // 暗杠为 false，其余为 true
}

// 鸣牌前缀映射
const MELD_PREFIX: Record<string, MeldType> = {
  'c': 'chi',    // 吃
  'p': 'pon',    // 碰
  'k': 'minkan',  // 明杠
  'a': 'ankan',   // 暗杠
  'g': 'kakan',   // 加杠
};

const MELD_IS_OPEN: Record<MeldType, boolean> = {
  'chi': true,
  'pon': true,
  'minkan': true,
  'ankan': false,
  'kakan': true,
};

// 手牌解析结果
export interface ParsedHand {
  handTiles: Tile[];   // 手牌（不含鸣牌和和了牌）
  melds: Meld[];        // 鸣牌
  winTile: Tile | null; // 和了牌
}

/** 判断是否为刻子类鸣牌（碰/明杠/暗杠/加杠） */
export function isKotsuMeld(type: MeldType): boolean {
  return type === 'pon' || type === 'minkan' || type === 'ankan' || type === 'kakan';
}

/** 判断是否为杠子类鸣牌 */
export function isKanMeld(type: MeldType): boolean {
  return type === 'minkan' || type === 'ankan' || type === 'kakan';
}

// 字牌类型
export const HONOR_TYPES: HonorType[] = ['east', 'south', 'west', 'north', 'white', 'green', 'red'];

// 花色缩写映射
const SUIT_ABBREVIATIONS: Record<string, TileSuit> = {
  'm': 'man',
  'p': 'pin',
  's': 'sou',
  'z': 'honor'
};

// 字牌值映射
const HONOR_VALUES: Record<string, HonorType> = {
  '1': 'east',
  '2': 'south',
  '3': 'west',
  '4': 'north',
  '5': 'white',
  '6': 'green',
  '7': 'red'
};

// 反向映射
const HONOR_NUMBERS: Record<HonorType, number> = {
  'east': 1,
  'south': 2,
  'west': 3,
  'north': 4,
  'white': 5,
  'green': 6,
  'red': 7
};

/**
 * 创建一张牌
 */
export function createTile(suit: TileSuit, value: TileValue | HonorType, id: number): Tile {
  return { suit, value, id };
}


/**
 * 将牌键转换为牌名
 * @param tileKey man-1
 */
export function tileKeyToName(tileKey: string): string {

  const [suitChar, valueStr] = tileKey.split('-');
  if(suitChar === 'honor') {
    return `${valueStr}z`; // 字牌使用数字+z表示
  }
  return `${valueStr}${suitChar.charAt(0)}`; // 例如 1m, 5p, 0s(赤五索), 1z(东), 7z(中)
}

/**
 * 解析手牌字符串（支持鸣牌记号）
 * 格式：
 *   普通牌：数字+花色，如 123m 456p 789s 11z
 *   鸣牌：前缀+数字+花色，如 c123m p111m k1111m a1111m g1111m
 *     c = 吃（chi，open sequence）
 *     p = 碰（pon，open triplet）
 *     k = 明杠（minkan，open kan）
 *     a = 暗杠（ankan，closed kan）
 *     g = 加杠（kakan，added kan）
 *   最后一张手牌为和了牌
 * 示例：
 *   "123m678m56p1111p11z4p" (兼容旧格式，全部为手牌)
 *   "123m c456m p111m 789s11z 4p" (手牌 + 吃 + 碰)
 */
export function parseHandString(str: string): ParsedHand {
  // 移除所有空格
  str = str.replace(/\s+/g, '');

  const melds: Meld[] = [];
  const handTiles: Tile[] = [];
  let idCounter = 0;

  // 匹配：可选鸣牌前缀 + 数字序列 + 花色
  const pattern = /([cpgka])?(\d+)([mpsz])/g;
  let match;

  while ((match = pattern.exec(str)) !== null) {
    const prefix = match[1];
    const numbers = match[2];
    const suitChar = match[3];
    const suit = SUIT_ABBREVIATIONS[suitChar];

    if (!suit) {
      throw new Error(`Invalid suit character: ${suitChar}`);
    }

    const tiles: Tile[] = [];
    for (const numChar of numbers) {
      const num = parseInt(numChar);
      if (suit === 'honor') {
        if (num < 1 || num > 7) {
          throw new Error(`Invalid honor tile number: ${num}`);
        }
        tiles.push(createTile(suit, HONOR_VALUES[num], idCounter++));
      } else {
        if (num < 1 || num > 9) {
          throw new Error(`Invalid tile number: ${num}`);
        }
        tiles.push(createTile(suit, num as TileValue, idCounter++));
      }
    }

    if (prefix) {
      const meldType = MELD_PREFIX[prefix];
      if (!meldType) {
        throw new Error(`Invalid meld prefix: ${prefix}`);
      }
      melds.push({
        type: meldType,
        tiles,
        isOpen: MELD_IS_OPEN[meldType],
      });
    } else {
      handTiles.push(...tiles);
    }
  }

  // 最后一张手牌为和了牌
  let winTile: Tile | null = null;
  if (handTiles.length > 0) {
    winTile = handTiles.pop()!;
  }

  return { handTiles, melds, winTile };
}

/**
 * 解析牌字符串，例如 "123m456p789s11z"
 */
export function parseTileString(str: string): Tile[] {
  const tiles: Tile[] = [];
  let idCounter = 0;
  
  // 匹配模式：数字序列 + 花色字母
  const pattern = /(\d+)([mpsz])/g;
  let match;
  
  while ((match = pattern.exec(str)) !== null) {
    const numbers = match[1];
    const suitChar = match[2];
    const suit = SUIT_ABBREVIATIONS[suitChar];
    
    if (!suit) {
      throw new Error(`Invalid suit character: ${suitChar}`);
    }
    
    for (const numChar of numbers) {
      const num = parseInt(numChar);
      
      if (suit === 'honor') {
        if (num < 1 || num > 7) {
          throw new Error(`Invalid honor tile number: ${num}`);
        }
        const honorType = HONOR_VALUES[num];
        tiles.push(createTile(suit, honorType, idCounter++));
      } else {
        if (num < 1 || num > 9) {
          throw new Error(`Invalid tile number: ${num}`);
        }
        tiles.push(createTile(suit, num as TileValue, idCounter++));
      }
    }
  }
  
  return tiles;
}

/**
 * 将牌转换为字符串表示
 */
export function tileToString(tile: Tile): string {
  if (tile.suit === 'honor') {
    const num = HONOR_NUMBERS[tile.value as HonorType];
    return `${num}z`;
  } else {
    const suitChar = Object.entries(SUIT_ABBREVIATIONS).find(([_, s]) => s === tile.suit)?.[0];
    return `${tile.value}${suitChar}`;
  }
}

/**
 * 将多张牌转换为字符串表示
 */
export function tilesToString(tiles: Tile[]): string {
  // 按花色分组
  const grouped: Record<TileSuit, (TileValue | HonorType)[]> = {
    man: [],
    pin: [],
    sou: [],
    honor: []
  };
  
  for (const tile of tiles) {
    grouped[tile.suit].push(tile.value);
  }
  
  // 排序并转换
  const suitOrder: TileSuit[] = ['man', 'pin', 'sou', 'honor'];
  const suitChars: Record<TileSuit, string> = {
    man: 'm',
    pin: 'p',
    sou: 's',
    honor: 'z'
  };
  
  let result = '';
  for (const suit of suitOrder) {
    const values = grouped[suit];
    if (values.length > 0) {
      // 排序
      const sorted = values.sort((a, b) => {
        const numA = typeof a === 'number' ? a : HONOR_NUMBERS[a];
        const numB = typeof b === 'number' ? b : HONOR_NUMBERS[b];
        return numA - numB;
      });

      // 字牌使用数字(1-7)而非字符串
      const valueStr = sorted.map(v => typeof v === 'number' ? v : HONOR_NUMBERS[v]).join('');
      result += valueStr + suitChars[suit];
    }
  }
  
  return result;
}

/**
 * 排序牌
 */
export function sortTiles(tiles: Tile[]): Tile[] {
  const suitOrder: Record<TileSuit, number> = {
    man: 0,
    pin: 1,
    sou: 2,
    honor: 3
  };
  
  return [...tiles].sort((a, b) => {
    // 先按花色排序
    if (suitOrder[a.suit] !== suitOrder[b.suit]) {
      return suitOrder[a.suit] - suitOrder[b.suit];
    }
    
    // 同花色按数值排序
    const numA = typeof a.value === 'number' ? a.value : HONOR_NUMBERS[a.value as HonorType];
    const numB = typeof b.value === 'number' ? b.value : HONOR_NUMBERS[b.value as HonorType];
    return numA - numB;
  });
}

/**
 * 比较两组牌是否相等（不考虑顺序和id）
 */
export function tilesEqual(a: Tile[], b: Tile[]): boolean {
  if (a.length !== b.length) return false;
  
  const sortedA = sortTiles(a);
  const sortedB = sortTiles(b);
  
  for (let i = 0; i < sortedA.length; i++) {
    if (sortedA[i].suit !== sortedB[i].suit || sortedA[i].value !== sortedB[i].value) {
      return false;
    }
  }
  
  return true;
}

/**
 * 获取牌的数值（用于计算）
 */
export function getTileNumber(tile: Tile): number {
  if (tile.suit === 'honor') {
    return HONOR_NUMBERS[tile.value as HonorType];
  }
  return tile.value as number;
}

/**
 * 判断是否为数牌
 */
export function isNumberTile(tile: Tile): boolean {
  return tile.suit !== 'honor';
}

/**
 * 判断是否为字牌
 */
export function isHonorTile(tile: Tile): boolean {
  return tile.suit === 'honor';
}

/**
 * 判断是否为幺九牌（1或9或字牌）
 */
export function isYaochuTile(tile: Tile): boolean {
  if (tile.suit === 'honor') return true;
  const num = tile.value as number;
  return num === 1 || num === 9;
}

/**
 * 判断是否为老头牌（1或9的数牌）
 */
export function isLaotouTile(tile: Tile): boolean {
  if (tile.suit === 'honor') return false;
  const num = tile.value as number;
  return num === 1 || num === 9;
}
