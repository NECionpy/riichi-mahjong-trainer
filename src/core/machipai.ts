import { randomInt, shuffleFisherYates } from "../utils/utils";
import { calculateShanten } from "./shanten";
import {
  MeldType,
  parseHandString,
  parseTileString,
  sortTiles,
  TILE_NAMES,
  tilesToString,
  TileSuit,
} from "./tile";

export const SUITS = ["m", "p", "s", "z"] as const;

export type MachipaiResult = {
  tile: string;
  remaining: number;
  handsStr: string;
}[];

/**
 * 将计数数组重新转换成麻将字符串
 */
function countsToHand(counts: number[]): string {
  let result = "";

  for (let suitIndex = 0; suitIndex < 4; suitIndex++) {
    const start = suitIndex * 9;
    const end = suitIndex === 3 ? 7 : 9;

    let numbers = "";

    for (let i = 0; i < end; i++) {
      const count = counts[start + i];

      for (let j = 0; j < count; j++) {
        numbers += String(i + 1);
      }
    }

    if (numbers.length > 0) {
      result += numbers + SUITS[suitIndex];
    }
  }

  return result;
}

/**
 * 将 "66m678999s333z33p" 转换成 34 个牌的计数数组
 */
function parseHand(hand: string): number[] {
  const counts = new Array<number>(34).fill(0);

  const regex = /([0-9]+)([mpsz])/g;

  let match: RegExpExecArray | null;

  while ((match = regex.exec(hand)) !== null) {
    const numbers = match[1];
    const suit = match[2];

    for (const char of numbers) {
      const n = Number(char);

      if (suit === "m") {
        counts[n - 1]++;
      } else if (suit === "p") {
        counts[9 + n - 1]++;
      } else if (suit === "s") {
        counts[18 + n - 1]++;
      } else if (suit === "z") {
        if (n < 1 || n > 7) {
          throw new Error(`非法字牌：${n}${suit}`);
        }

        counts[27 + n - 1]++;
      }
    }
  }

  // 检查单张牌是否超过4张
  for (let i = 0; i < 34; i++) {
    if (counts[i] > 4) {
      throw new Error(`牌 ${tileToString(i)} 超过4张`);
    }
  }

  return counts;
}

/**
 * 牌编号转字符串
 */
function tileToString(tile: number): string {
  if (tile < 9) {
    return `${tile + 1}m`;
  }

  if (tile < 18) {
    return `${tile - 9 + 1}p`;
  }

  if (tile < 27) {
    return `${tile - 18 + 1}s`;
  }

  return `${tile - 27 + 1}z`;
}

function findOneReplacement(hand: string): string {
  const counts = parseHand(hand);

  const candidates: string[] = [];

  for (let remove = 0; remove < 34; remove++) {
    if (counts[remove] === 0) {
      continue;
    }

    counts[remove]--;

    for (let add = 0; add < 34; add++) {
      if (add === remove) {
        continue;
      }

      // 不能超过4张
      if (counts[add] >= 4) {
        continue;
      }

      counts[add]++;
      const handsStr = countsToHand(counts);

      const shanten = calculateShanten(parseTileString(handsStr));
      if (shanten.shanten === 1) {
        candidates.push(handsStr);
      }
      counts[add]--;
    }

    counts[remove]++;
  }

  const res = candidates[randomInt(candidates.length)];

  return res;
}

/**
 * 查找一向听手牌的所有有效进张
 */
export function getTenpaiDraws(hand: string) {
  const counts = parseHand(hand);
  const handsStr = countsToHand(counts);
  const shanten = calculateShanten(parseTileString(handsStr));

  if (shanten.shanten !== 1) {
    throw new Error(`输入手牌不是一向听，而是 ${shanten} 向听`);
  }

  const results: MachipaiResult = [];

  for (let i = 0; i < 34; i++) {
    // 已经有4张，不能再摸
    if (counts[i] >= 4) {
      continue;
    }

    // 假设摸进这一张牌
    counts[i]++;

    const newHandsStr = countsToHand(counts);
    const newShanten = calculateShanten(parseTileString(newHandsStr));

    counts[i]--;

    // 从一向听进入听牌
    if (newShanten.shanten === 0) {
      results.push({
        tile: TILE_NAMES[i],
        remaining: 4 - counts[i],
        handsStr: newHandsStr,
      });
    }
  }
  return results;
}

/**
 * 随机生成一副一向听牌的手牌（13张）
 */
export function generateRandomMachipaiHand(): string {
  const suitChars: Record<TileSuit, string> = {
    man: "m",
    pin: "p",
    sou: "s",
    honor: "z",
  };

  // 追踪所有牌的数量，确保不超过4张
  const tileCounts: Record<string, number> = {};

  function addCount(suit: TileSuit, num: number): void {
    const key = `${suit}-${num}`;
    tileCounts[key] = (tileCounts[key] || 0) + 1;
  }

  function canAdd(suit: TileSuit, nums: number[]): boolean {
    const temp = { ...tileCounts };
    for (const n of nums) {
      const key = `${suit}-${n}`;
      temp[key] = (temp[key] || 0) + 1;
      if (temp[key] > 4) return false;
    }
    return true;
  }

  // ---- Step 2: 生成4面子+1雀头 ----
  interface GenMentsu {
    type: "sequence" | "triplet"; // 顺子 或者 刻子
    suit: TileSuit;
    num: number;
    isMeld: boolean;
    meldType?: MeldType;
  }

  const mentsuList: GenMentsu[] = [];
  let pairSuit: TileSuit | null = null;
  let pairNum: number | null = null;

  let attempts = 0;
  while (mentsuList.length < 4 && attempts < 500) {
    attempts++;

    let mentsuType: "sequence" | "triplet";
    const r = Math.random();
    if (r < 0.65) mentsuType = "sequence";
    else mentsuType = "triplet";

    if (mentsuType === "sequence") {
      const suits: TileSuit[] = ["man", "pin", "sou"];
      const suit = suits[Math.floor(Math.random() * 3)];
      const start = Math.floor(Math.random() * 7) + 1;
      const nums = [start, start + 1, start + 2];

      if (canAdd(suit, nums)) {
        nums.forEach((n) => addCount(suit, n));
        mentsuList.push({
          type: "sequence",
          suit,
          num: start,
          isMeld: false,
        });
      }
    } else if (mentsuType === "triplet") {
      const suitIdx = Math.floor(Math.random() * 4);
      const suit: TileSuit =
        suitIdx < 3 ? (["man", "pin", "sou"] as TileSuit[])[suitIdx] : "honor";
      const maxNum = suit === "honor" ? 7 : 9;
      const num = Math.floor(Math.random() * maxNum) + 1;
      const nums = [num, num, num];

      if (canAdd(suit, nums)) {
        nums.forEach((n) => addCount(suit, n));
        mentsuList.push({
          type: "triplet",
          suit,
          num,
          isMeld: false,
        });
      }
    }
  }

  // 生成雀头
  attempts = 0;
  while (pairSuit === null && attempts < 200) {
    attempts++;
    const suitIdx = Math.floor(Math.random() * 4);
    const suit: TileSuit =
      suitIdx < 3 ? (["man", "pin", "sou"] as TileSuit[])[suitIdx] : "honor";
    const maxNum = suit === "honor" ? 7 : 9;
    const num = Math.floor(Math.random() * maxNum) + 1;
    const nums = [num, num];

    if (canAdd(suit, nums)) {
      nums.forEach((n) => addCount(suit, n));
      pairSuit = suit;
      pairNum = num;
    }
  }

  // ---- Step 3: 构建手牌字符串 ----
  interface RawTile {
    suit: TileSuit;
    num: number;
  }
  const handTiles: RawTile[] = [];

  for (const m of mentsuList) {
    let tiles: RawTile[];
    if (m.type === "sequence") {
      tiles = [
        { suit: m.suit, num: m.num },
        { suit: m.suit, num: m.num + 1 },
        { suit: m.suit, num: m.num + 2 },
      ];
    } else {
      tiles = [
        { suit: m.suit, num: m.num },
        { suit: m.suit, num: m.num },
        { suit: m.suit, num: m.num },
      ];
    }

    handTiles.push(...tiles);
  }

  // 雀头加入手牌
  handTiles.push({ suit: pairSuit!, num: pairNum! });
  handTiles.push({ suit: pairSuit!, num: pairNum! });

  // 按花色分组排序手牌，构建字符串
  const grouped: Record<TileSuit, number[]> = {
    man: [],
    pin: [],
    sou: [],
    honor: [],
  };
  for (const t of handTiles) {
    grouped[t.suit].push(t.num);
  }
  for (const s of Object.keys(grouped) as TileSuit[]) {
    grouped[s].sort((a, b) => a - b);
  }

  const suitOrder: TileSuit[] = shuffleFisherYates([
    "man",
    "pin",
    "sou",
    "honor",
  ]);
  let handStr = "";
  for (const s of suitOrder) {
    const nums = grouped[s];
    if (nums.length > 0) {
      handStr += nums.join("") + suitChars[s];
    }
  }

  // 字符串解析成手牌
  const tiles = parseHandString(handStr);
  //  重新整理的手牌字符串
  const handsStr = findOneReplacement(
    tilesToString(sortTiles(tiles.handTiles)),
  );
  return handsStr;
}
