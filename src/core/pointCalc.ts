import { shuffleFisherYates } from "../utils/utils";
import { GameContext } from "./scoring";
import {
  HonorType,
  MeldType,
  Tile as TileType,
  TileSuit,
  TileValue,
} from "./tile";

/** 兜底：生成简单有效手牌 */
export function generateFallbackHand(): {
  handInput: string;
  gameContext: GameContext;
  isTsumo: boolean;
} {
  return {
    handInput: "123m456p789s1122z1z",
    gameContext: {
      round: "east",
      roundNumber: 1,
      playerWind: "east",
      isRiichi: false,
      isDoubleRiichi: false,
      isIppatsu: false,
      isHaitei: false,
      isHoutei: false,
      isRinshan: false,
      isChankan: false,
      doraIndicators: [{ suit: "man", value: 3 as TileValue, id: 1000 }],
      uraDoraIndicators: [],
      honba: 0,
    },
    isTsumo: false,
  };
}

// ============================================================
// 随机生成手牌和场况
// ============================================================

export function generateRandomGame(): {
  handInput: string;
  gameContext: GameContext;
  isTsumo: boolean;
} {
  const suitChars: Record<TileSuit, string> = {
    man: "m",
    pin: "p",
    sou: "s",
    honor: "z",
  };
  const prefixByMeld: Record<MeldType, string> = {
    chi: "c",
    pon: "p",
    minkan: "k",
    ankan: "a",
    kakan: "g",
  };
  const honorNumToType: Record<number, HonorType> = {
    1: "east",
    2: "south",
    3: "west",
    4: "north",
    5: "white",
    6: "green",
    7: "red",
  };

  // 追踪所有牌的数量（手牌+鸣牌+指示牌），确保不超过4张
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

  // ---- Step 1: 生成场况（逻辑一致） ----
  let isRiichi = Math.random() < 0.3;
  let isDoubleRiichi = !isRiichi && Math.random() < 0.1;
  // 是否自摸
  const isTsumo = Math.random() < 0.5;
  // 立直或双立直，一定是门清
  let isMenzen = isRiichi || isDoubleRiichi;

  let isHaitei = false,
    isHoutei = false,
    isRinshan = false,
    isChankan = false;
  if (isTsumo) {
    // 自摸时不能抢杠/河底捞鱼，可以是海底捞月/岭上开花
    const r = Math.random();
    if (r < 0.15) isHaitei = true;
    else if (r < 0.3) isRinshan = true;
  } else {
    // 荣和时不能海底捞月/岭上开花，可以是河底捞鱼/抢杠
    const r = Math.random();
    if (r < 0.15) isHoutei = true;
    else if (r < 0.9) isChankan = true; // 立直时不能抢杠
  }

  // 一发的条件：立直或双立直，且不是岭上开花/抢杠
  let isIppatsu =
    (isRiichi || isDoubleRiichi) &&
    !isRinshan &&
    !isChankan &&
    Math.random() < 0.3;

  // 双立直不能海底或河底和牌
  if (isDoubleRiichi) {
    isHaitei = false;
    isHoutei = false;
  }

  // ---- Step 2: 生成4面子+1雀头 ----
  interface GenMentsu {
    type: "sequence" | "triplet" | "kan";
    suit: TileSuit;
    num: number;
    isMeld: boolean;
    meldType?: MeldType;
  }

  const mentsuList: GenMentsu[] = [];
  let pairSuit: TileSuit | null = null;
  let pairNum: number | null = null;
  let kanCount = 0;

  // 如果需要岭上开花，至少需要一个杠子；抢杠需要加杠
  const needsKan = isRinshan;
  const needsKakan = false;

  let attempts = 0;
  while (mentsuList.length < 4 && attempts < 500) {
    attempts++;

    let mentsuType: "sequence" | "triplet" | "kan";
    if ((needsKan || needsKakan) && kanCount === 0 && mentsuList.length >= 3) {
      mentsuType = "kan"; // 强制生成一个杠子
    } else {
      const r = Math.random();
      if (r < 0.55) mentsuType = "sequence";
      else if (r < 0.9) mentsuType = "triplet";
      else mentsuType = "kan";
    }

    if (mentsuType === "sequence") {
      const suits: TileSuit[] = ["man", "pin", "sou"];
      const suit = suits[Math.floor(Math.random() * 3)];
      const start = Math.floor(Math.random() * 7) + 1;
      const nums = [start, start + 1, start + 2];

      if (canAdd(suit, nums)) {
        nums.forEach((n) => addCount(suit, n));
        const isMeld = !isMenzen && Math.random() < 0.3;
        mentsuList.push({
          type: "sequence",
          suit,
          num: start,
          isMeld,
          meldType: isMeld ? "chi" : undefined,
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
        const isMeld = !isMenzen && Math.random() < 0.3;
        mentsuList.push({
          type: "triplet",
          suit,
          num,
          isMeld,
          meldType: isMeld ? "pon" : undefined,
        });
      }
    } else {
      // kan: 4张相同牌
      const suitIdx = Math.floor(Math.random() * 4);
      const suit: TileSuit =
        suitIdx < 3 ? (["man", "pin", "sou"] as TileSuit[])[suitIdx] : "honor";
      const maxNum = suit === "honor" ? 7 : 9;
      const num = Math.floor(Math.random() * maxNum) + 1;
      const nums = [num, num, num, num];

      if (canAdd(suit, nums)) {
        nums.forEach((n) => addCount(suit, n));
        kanCount++;
        let meldType: MeldType;
        if (needsKakan) {
          meldType = "kakan";
        } else if (isMenzen) {
          meldType = "ankan"; // 立直时只能暗杠
        } else {
          meldType = Math.random() < 0.5 ? "minkan" : "ankan";
        }
        mentsuList.push({ type: "kan", suit, num, isMeld: true, meldType });
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

  // 兜底：生成失败时使用简单有效手牌
  if (mentsuList.length < 4 || pairSuit === null) {
    return generateFallbackHand();
  }

  // 暗杠属于鸣牌，有暗杠时不能双立直，只能降级为普通立直
  if (kanCount > 0 && isDoubleRiichi) {
    isDoubleRiichi = false;
    isRiichi = true;
  }

  // ---- Step 3: 构建手牌字符串 ----
  interface RawTile {
    suit: TileSuit;
    num: number;
  }
  const handTiles: RawTile[] = [];
  const melds: { type: MeldType; tiles: RawTile[] }[] = [];

  for (const m of mentsuList) {
    let tiles: RawTile[];
    if (m.type === "sequence") {
      tiles = [
        { suit: m.suit, num: m.num },
        { suit: m.suit, num: m.num + 1 },
        { suit: m.suit, num: m.num + 2 },
      ];
    } else if (m.type === "triplet") {
      tiles = [
        { suit: m.suit, num: m.num },
        { suit: m.suit, num: m.num },
        { suit: m.suit, num: m.num },
      ];
    } else {
      tiles = [
        { suit: m.suit, num: m.num },
        { suit: m.suit, num: m.num },
        { suit: m.suit, num: m.num },
        { suit: m.suit, num: m.num },
      ];
    }

    if (m.isMeld && m.meldType) {
      melds.push({ type: m.meldType, tiles });
    } else {
      handTiles.push(...tiles);
    }
  }

  // 雀头加入手牌
  handTiles.push({ suit: pairSuit!, num: pairNum! });
  handTiles.push({ suit: pairSuit!, num: pairNum! });

  // ---- Step 4: 生成宝牌指示牌（基础1张，每个杠子+1张） ----
  const doraCount = Math.min(1 + kanCount, 5);
  const doraIndicators: TileType[] = [];
  let doraId = 1000;

  for (let i = 0; i < doraCount; i++) {
    let found = false;
    for (let da = 0; da < 200 && !found; da++) {
      const suitIdx = Math.floor(Math.random() * 4);
      const suit: TileSuit =
        suitIdx < 3 ? (["man", "pin", "sou"] as TileSuit[])[suitIdx] : "honor";
      const maxNum = suit === "honor" ? 7 : 9;
      const num = Math.floor(Math.random() * maxNum) + 1;

      if (canAdd(suit, [num])) {
        addCount(suit, num);
        if (suit === "honor") {
          doraIndicators.push({
            suit,
            value: honorNumToType[num],
            id: doraId++,
          });
        } else {
          doraIndicators.push({ suit, value: num as TileValue, id: doraId++ });
        }
        found = true;
      }
    }
  }

  // ---- Step 5: 生成里宝指示牌（仅立直时，数量与宝牌一致） ----
  const uraDoraIndicators: TileType[] = [];
  if (isRiichi || isDoubleRiichi) {
    let uraId = 2000;
    for (let i = 0; i < doraIndicators.length; i++) {
      let found = false;
      for (let ua = 0; ua < 200 && !found; ua++) {
        const suitIdx = Math.floor(Math.random() * 4);
        const suit: TileSuit =
          suitIdx < 3
            ? (["man", "pin", "sou"] as TileSuit[])[suitIdx]
            : "honor";
        const maxNum = suit === "honor" ? 7 : 9;
        const num = Math.floor(Math.random() * maxNum) + 1;

        if (canAdd(suit, [num])) {
          addCount(suit, num);
          if (suit === "honor") {
            uraDoraIndicators.push({
              suit,
              value: honorNumToType[num],
              id: uraId++,
            });
          } else {
            uraDoraIndicators.push({
              suit,
              value: num as TileValue,
              id: uraId++,
            });
          }
          found = true;
        }
      }
    }
  }

  let chankanFix: RawTile | null = null;

  // 如果是抢杠，需要校验所和牌手里一张都不能有，否则无法抢杠
  if (isChankan) {
    // 整理所有出现的牌，包括手牌、鸣牌、宝牌指示牌和里宝指示牌，计数
    const tileCounts: Map<string, number> = new Map();
    handTiles.forEach((t) => {
      const key = `${t.suit}-${t.num}`;
      tileCounts.set(key, (tileCounts.get(key) || 0) + 1);
    });
    melds.forEach((m) => {
      m.tiles.forEach((t) => {
        const key = `${t.suit}-${t.num}`;
        tileCounts.set(key, (tileCounts.get(key) || 0) + 1);
      });
    });

    doraIndicators.forEach((dora) => {
      const key = `${dora.suit}-${dora.value}`;
      tileCounts.set(key, (tileCounts.get(key) || 0) + 1);
    });

    uraDoraIndicators.forEach((dora) => {
      const key = `${dora.suit}-${dora.value}`;
      tileCounts.set(key, (tileCounts.get(key) || 0) + 1);
    });

    // 选出唯一一张的牌
    const onlyOne = Array.from(tileCounts.entries()).filter(
      ([, count]) => count === 1,
    );

    if (onlyOne.length === 0) {
      // 没有唯一一张的牌，无法满足抢杠条件，重新生成
      return generateRandomGame();
    }

    // 过滤手牌，只保留唯一一张的牌
    const filteredHandTiles = handTiles.filter((t) =>
      onlyOne.some(([key]) => key === `${t.suit}-${t.num}`),
    );
    if (filteredHandTiles.length === 0) {
      // 过滤后手牌为空，无法满足抢杠条件，重新生成
      return generateRandomGame();
    }

    // 如果找到了手牌中唯一一张的牌，设置为和牌，移动到手牌的最后
    handTiles.splice(handTiles.indexOf(filteredHandTiles[0]), 1);
    chankanFix = filteredHandTiles[0];
  }

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
//   for (const s of Object.keys(grouped) as TileSuit[]) {
//     grouped[s].sort((a, b) => a - b);
//   }

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


  if(chankanFix) {
    // 如果是抢杠，手牌中唯一一张的牌需要放在最后，确保和牌条件满足
    handStr += `${chankanFix.num}${suitChars[chankanFix.suit]}`;
  }

  // 鸣牌追加
  for (const m of melds) {
    const prefix = prefixByMeld[m.type];
    const s = m.tiles[0].suit;
    const nums = m.tiles.map((t) => t.num);
    handStr += " " + prefix + nums.join("") + suitChars[s];
  }

  // ---- Step 6: 组装返回 ----
  const gameContext: GameContext = {
    round: (["east", "south", "west"] as const)[Math.floor(Math.random() * 3)],
    roundNumber: Math.floor(Math.random() * 4) + 1,
    playerWind: (["east", "south", "west", "north"] as const)[
      Math.floor(Math.random() * 4)
    ],
    isRiichi,
    isDoubleRiichi,
    isIppatsu,
    isHaitei,
    isHoutei,
    isRinshan,
    isChankan,
    doraIndicators,
    uraDoraIndicators,
    honba: Math.floor(Math.random() * 6), // 0~5本场
  };

  return { handInput: handStr, gameContext, isTsumo };
}
