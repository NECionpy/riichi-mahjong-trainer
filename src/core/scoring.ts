import { Tile, TileSuit, HonorType, Meld, isHonorTile, isYaochuTile, isLaotouTile, getTileNumber, isKotsuMeld, isKanMeld } from './tile';
import { Hand, MeldDecomposition, decomposeHand, isChiitoitsu, isKokushi, isKokushi13 } from './hand';

// 游戏上下文
export interface GameContext {
  round: 'east' | 'south' | 'west';  // 场风
  roundNumber: number;                // 东几局/南几局
  playerWind: 'east' | 'south' | 'west' | 'north';  // 自风
  isRiichi: boolean;                  // 是否立直
  isDoubleRiichi: boolean;            // 是否两立直
  isIppatsu: boolean;                 // 是否一发
  isHaitei: boolean;                  // 是否海底捞月
  isHoutei: boolean;                  // 是否河底捞鱼
  isRinshan: boolean;                 // 是否岭上开花
  isChankan: boolean;                 // 是否抢杠
  doraIndicators: Tile[];             // 宝牌指示牌
  uraDoraIndicators: Tile[];          // 里宝牌指示牌
  honba: number;                      // 本场数（庄家连庄次数，0=0本场）
}

// 役种
export interface Yaku {
  name: string;
  han: number;
  description?: string;
}

// 符数分解明细
export interface FuBreakdownItem {
  label: string;       // 项目名称
  fu: number;          // 符数贡献
  type: 'base' | 'add' | 'subtotal' | 'rounding' | 'floor' | 'final';  // 类型
}

export interface FuBreakdown {
  items: FuBreakdownItem[];
  specialNote?: string;  // 特殊说明（如七对子固定25符）
}

// 得点计算结果
export interface ScoringResult {
  fu: number;        // 符数
  han: number;       // 番数
  points: number;    // 基本点
  dealer: {          // 亲（庄家）得点
    tsumo: number;
    ron: number;
  };
  nonDealer: {       // 子得点
    tsumo: {
      fromDealer: number;
      fromNonDealer: number;
    };
    ron: number;
  };
  yaku: Yaku[];      // 役种列表
  isKeiten: boolean; // 型听（形式听牌：只有宝牌没有役种）
  honba: number;     // 本场数
  fuBreakdown?: FuBreakdown;  // 符数分解明细（不适用于七对子/国士无双等特殊牌型时为undefined）
}

/**
 * 根据宝牌指示牌计算宝牌
 */
function getDoraFromIndicator(indicator: Tile): Tile[] {
  if (indicator.suit === 'honor') {
    const num = getTileNumber(indicator);
    // 风牌 (1-4) 和 三元牌 (5-7) 各自独立循环
    let nextNum: number;
    if (num <= 4) {
      nextNum = num === 4 ? 1 : num + 1;  // 1→2→3→4→1
    } else {
      nextNum = num === 7 ? 5 : num + 1;  // 5→6→7→5
    }
    const nextHonor: HonorType =
      nextNum === 1 ? 'east' :
      nextNum === 2 ? 'south' :
      nextNum === 3 ? 'west' :
      nextNum === 4 ? 'north' :
      nextNum === 5 ? 'white' :
      nextNum === 6 ? 'green' : 'red';
    return [{ suit: 'honor', value: nextHonor, id: -1 }];
  } else {
    const num = getTileNumber(indicator);
    const nextNum = num === 9 ? 1 : num + 1;
    return [{ suit: indicator.suit, value: nextNum as any, id: -1 }];
  }
}

/** 统计手牌中包含的宝牌数量 */
function countDora(tiles: Tile[], indicators: Tile[]): number {
  if (indicators.length === 0) return 0;
  const doraTiles = indicators.flatMap(ind => getDoraFromIndicator(ind));
  let count = 0;
  for (const tile of tiles) {
    for (const dora of doraTiles) {
      if (tile.suit === dora.suit && tile.value === dora.value) {
        count++;
      }
    }
  }
  return count;
}

/** 判断是否为宝牌类役种（非正式役种） */
function isDoraYaku(name: string): boolean {
  return name.startsWith('宝牌') || name.startsWith('里宝牌');
}

// ============================================================
// 符数计算
// ============================================================

function calculateFu(hand: Hand, decomposition: MeldDecomposition, gameContext: GameContext): { fu: number; breakdown: FuBreakdown } {
  const items: FuBreakdownItem[] = [];
  let fu = 0;

  const isMenzen = !hand.melds.some(m => m.isOpen);

  // 底符
  fu += 20;
  items.push({ label: '底符', fu: 20, type: 'base' });

  // 门清荣和加10符
  if (!hand.isTsumo && isMenzen) {
    fu += 10;
    items.push({ label: '门清荣和', fu: 10, type: 'add' });
  }

  // 自摸加2符（平和自摸在 calculateScore 中后处理为20符）
  if (hand.isTsumo) {
    fu += 2;
    items.push({ label: '自摸', fu: 2, type: 'add' });
  }

  // 雀头符
  const jantai = decomposition.jantai[0];
  if (jantai && isHonorTile(jantai)) {
    const honorValue = jantai.value as HonorType;
    // 场风
    if (honorValue === gameContext.round) {
      const name = gameContext.round === 'east' ? '场风 东' : gameContext.round === 'south' ? '场风 南' : '场风 西';
      fu += 2;
      items.push({ label: `雀头: ${name}`, fu: 2, type: 'add' });
    }
    // 自风
    if (honorValue === gameContext.playerWind) {
      const name = gameContext.playerWind === 'east' ? '自风 东' : gameContext.playerWind === 'south' ? '自风 南' :
                   gameContext.playerWind === 'west' ? '自风 西' : '自风 北';
      fu += 2;
      items.push({ label: `雀头: ${name}`, fu: 2, type: 'add' });
    }
    // 三元牌
    if (honorValue === 'white') {
      fu += 2;
      items.push({ label: '雀头: 三元牌 白', fu: 2, type: 'add' });
    }
    if (honorValue === 'green') {
      fu += 2;
      items.push({ label: '雀头: 三元牌 发', fu: 2, type: 'add' });
    }
    if (honorValue === 'red') {
      fu += 2;
      items.push({ label: '雀头: 三元牌 中', fu: 2, type: 'add' });
    }
  }

  // 面子符
	for (const mentsu of decomposition.mentsu) {
	  // 荣和时，含和了牌的面子视为明刻/明杠（手中有2张，第3张从别家来）
	  const isEffectivelyOpen = mentsu.isOpen || (!hand.isTsumo && mentsuContainsWinningTile(mentsu, hand.winningTile));

	  if (mentsu.type === 'pon') {
	    const tile = mentsu.tiles[0];
	    const isYaochu = isYaochuTile(tile);
	    if (isEffectivelyOpen) {
	      const f = isYaochu ? 4 : 2;
	      fu += f;
	      items.push({ label: `明刻: ${describeTile(tile)}`, fu: f, type: 'add' });
	    } else {
	      const f = isYaochu ? 8 : 4;
	      fu += f;
	      items.push({ label: `暗刻: ${describeTile(tile)}`, fu: f, type: 'add' });
	    }
	  } else if (isKanMeld(mentsu.type)) {
	    const tile = mentsu.tiles[0];
	    const isYaochu = isYaochuTile(tile);
	    if (isEffectivelyOpen) {
	      const f = isYaochu ? 16 : 8;
	      fu += f;
	      items.push({ label: `明杠: ${describeTile(tile)}`, fu: f, type: 'add' });
	    } else {
	      const f = isYaochu ? 32 : 16;
	      fu += f;
	      items.push({ label: `暗杠: ${describeTile(tile)}`, fu: f, type: 'add' });
	    }
	  }
	  // 顺子不加符，但我们可以留下一个标记（可选）
	}

	// 听牌型符：坎张听、边张听、单骑听各+2符，两面听和双碰听不加符
	const { fu: waitFu, label: waitLabel } = getWaitFu(hand, decomposition);
	if (waitFu > 0) {
	  fu += waitFu;
	  items.push({ label: waitLabel, fu: waitFu, type: 'add' });
	}

  // 小计（向上取整前）
  const subtotalBefore = fu;
  items.push({ label: '小计', fu: subtotalBefore, type: 'subtotal' });

  // 向上取整到10的倍数
  fu = Math.ceil(fu / 10) * 10;
  if (fu !== subtotalBefore) {
    items.push({ label: `向上取整 (${subtotalBefore} → ${fu})`, fu: fu, type: 'rounding' });
  }

  // 非门清和牌最低30符（平和自摸=20符在 calculateScore 中处理）
  if (!isMenzen && fu < 30) {
    const before = fu;
    fu = 30;
    items.push({ label: `副露和牌最低符调整 (${before} → 30)`, fu: 30, type: 'floor' });
  }
  // 门清荣和最低30符
  if (!hand.isTsumo && isMenzen && fu < 30) {
    const before = fu;
    fu = 30;
    items.push({ label: `门清荣和最低符调整 (${before} → 30)`, fu: 30, type: 'floor' });
  }

  return { fu, breakdown: { items } };
}

/** 描述一张牌（用于符数分解展示） */
function describeTile(tile: Tile): string {
  if (tile.suit === 'honor') {
    const honorNames: Record<string, string> = { east: '東', south: '南', west: '西', north: '北', white: '白', green: '發', red: '中' };
    return honorNames[tile.value as string] || tile.value.toString();
  }
  const suitNames: Record<string, string> = { man: 'm', pin: 'p', sou: 's' };
  return `${tile.value}${suitNames[tile.suit] || ''}`;
}

/** 判断面子是否包含和了牌 */
function mentsuContainsWinningTile(mentsu: Meld, winningTile: Tile): boolean {
  return mentsu.tiles.some(t => t.suit === winningTile.suit && t.value === winningTile.value);
}

// ============================================================
// 役种判定
// ============================================================

function detectYaku(hand: Hand, decomposition: MeldDecomposition, gameContext: GameContext, allTiles: Tile[]): Yaku[] {
  const yaku: Yaku[] = [];
  const isMenzen = !hand.melds.some(m => m.isOpen);

  // ---- 役满 (Yakuman) ----

  // 国士无双（十三面优先）
  if (isKokushi13(allTiles, hand.winningTile)) {
    yaku.push({ name: '国士无双十三面', han: 26 });
  } else if (isKokushi(allTiles)) {
    yaku.push({ name: '国士无双', han: 13 });
  }

  // 九莲宝灯（纯正优先，门清限定）
  if (isMenzen && isJunseiChuurenpoutou(allTiles, hand.winningTile)) {
    yaku.push({ name: '纯正九莲宝灯', han: 26 });
  } else if (isMenzen && isChuurenpoutou(allTiles)) {
    yaku.push({ name: '九莲宝灯', han: 13 });
  }

  // 四暗刻（单骑优先）
  if (isSuuankouTanki(hand, decomposition)) {
    yaku.push({ name: '四暗刻单骑', han: 26 });
  } else if (isSuuankou(hand, decomposition)) {
    yaku.push({ name: '四暗刻', han: 13 });
  }

  // 其他役满
  if (isDaisuushii(decomposition)) yaku.push({ name: '大四喜', han: 26 });
  if (isShousuushii(decomposition)) yaku.push({ name: '小四喜', han: 13 });
  if (isDaisangen(decomposition)) yaku.push({ name: '大三元', han: 13 });
  if (isTsuuiisou(allTiles)) yaku.push({ name: '字一色', han: 13 });
  if (isChinroutou(allTiles)) yaku.push({ name: '清老头', han: 13 });
  if (isRyuuiisou(allTiles)) yaku.push({ name: '绿一色', han: 13 });
  if (isSuukantsu(decomposition)) yaku.push({ name: '四杠子', han: 13 });

  // ---- 1番 役种 ----

  // 两立直 (2番，包含立直，不再额外加立直)
  if (gameContext.isDoubleRiichi && isMenzen) {
    yaku.push({ name: '两立直', han: 2 });
  }
  // 立直（只有未设两立直时才加）
  else if (gameContext.isRiichi && isMenzen) {
    yaku.push({ name: '立直', han: 1 });
  }

  // 一发（立直或两立直后一巡内和牌）
  if (gameContext.isIppatsu && (gameContext.isRiichi || gameContext.isDoubleRiichi) && isMenzen) {
    yaku.push({ name: '一发', han: 1 });
  }

  // 门清自摸和
  if (isMenzen && hand.isTsumo) {
    yaku.push({ name: '门前清自摸和', han: 1 });
  }

  // 平和
  const hasPinfu = isMenzen && isPinfu(hand, decomposition, gameContext);
  if (hasPinfu) {
    yaku.push({ name: '平和', han: 1 });
  }

  // 一盃口
  if (isMenzen && isIipeikou(decomposition)) {
    yaku.push({ name: '一盃口', han: 1 });
  }

  // 断幺九
  if (isTanyao(allTiles)) {
    yaku.push({ name: '断幺九', han: 1 });
  }

  // 役牌
  const yakuhai = detectYakuhai(decomposition, gameContext);
  yaku.push(...yakuhai);

  // 海底捞月
  if (gameContext.isHaitei && hand.isTsumo) {
    yaku.push({ name: '海底捞月', han: 1 });
  }

  // 河底捞鱼
  if (gameContext.isHoutei && !hand.isTsumo) {
    yaku.push({ name: '河底捞鱼', han: 1 });
  }

  // 岭上开花
  if (gameContext.isRinshan && hand.isTsumo) {
    yaku.push({ name: '岭上开花', han: 1 });
  }

  // 抢杠
  if (gameContext.isChankan && !hand.isTsumo) {
    yaku.push({ name: '抢杠', han: 1 });
  }

  // ---- 2番 役种 ----

  // 七对子
  if (isChiitoitsu(allTiles)) {
    yaku.push({ name: '七对子', han: 2 });
  }

  // 对对和
  if (isToitoi(decomposition)) {
    yaku.push({ name: '对对和', han: 2 });
  }

  // 三暗刻
  if (isSanankou(hand, decomposition)) {
    yaku.push({ name: '三暗刻', han: 2 });
  }

  // 三色同刻
  if (isSanshokuDoukou(decomposition)) {
    yaku.push({ name: '三色同刻', han: 2 });
  }

  // 三杠子
  if (isSankantsu(decomposition)) {
    yaku.push({ name: '三杠子', han: 2 });
  }

  // 混老头
  if (isHonroutou(allTiles)) {
    yaku.push({ name: '混老头', han: 2 });
  }

  // 小三元
  if (isShousangen(decomposition)) {
    yaku.push({ name: '小三元', han: 2 });
  }

  // 三色同顺
  if (isSanshokuDoujun(decomposition)) {
    if (isMenzen) {
      yaku.push({ name: '三色同顺', han: 2 });
    } else {
      yaku.push({ name: '三色同顺', han: 1 });
    }
  }

  // 一气通贯
  if (isIkkitsuukan(decomposition)) {
    if (isMenzen) {
      yaku.push({ name: '一气通贯', han: 2 });
    } else {
      yaku.push({ name: '一气通贯', han: 1 });
    }
  }

  // 混全带幺九
  if (isChanta(decomposition, allTiles)) {
    if (isMenzen) {
      yaku.push({ name: '混全带幺九', han: 2 });
    } else {
      yaku.push({ name: '混全带幺九', han: 1 });
    }
  }

  // ---- 3番 役种 ----

  // 二盃口
  if (isMenzen && isRyanpeikou(decomposition)) {
    yaku.push({ name: '二盃口', han: 3 });
  }

  // 纯全带幺九
  if (isJunchan(decomposition, allTiles)) {
    if (isMenzen) {
      yaku.push({ name: '纯全带幺九', han: 3 });
    } else {
      yaku.push({ name: '纯全带幺九', han: 2 });
    }
  }

  // 混一色
  if (isChinitsu(allTiles, true)) {
    if (isMenzen) {
      yaku.push({ name: '混一色', han: 3 });
    } else {
      yaku.push({ name: '混一色', han: 2 });
    }
  }

  // ---- 6番 役种 ----

  // 清一色
  if (isChinitsu(allTiles, false)) {
    if (isMenzen) {
      yaku.push({ name: '清一色', han: 6 });
    } else {
      yaku.push({ name: '清一色', han: 5 });
    }
  }

  // ---- 宝牌 ----

  const doraCount = countDora(allTiles, gameContext.doraIndicators);
  if (doraCount > 0) {
    yaku.push({ name: `宝牌 ×${doraCount}`, han: doraCount });
  }

  // 里宝牌（仅立直时有效）
  if (gameContext.isRiichi || gameContext.isDoubleRiichi) {
    const uraDoraCount = countDora(allTiles, gameContext.uraDoraIndicators);
    if (uraDoraCount > 0) {
      yaku.push({ name: `里宝牌 ×${uraDoraCount}`, han: uraDoraCount });
    }
  }

  return postProcessYaku(yaku);
}

// ============================================================
// 役种判定辅助函数
// ============================================================

/** 判定平和 */
function isPinfu(hand: Hand, decomposition: MeldDecomposition, gameContext: GameContext): boolean {
  const isMenzen = !hand.melds.some(m => m.isOpen);
  if (!isMenzen) return false;

  for (const mentsu of decomposition.mentsu) {
    if (mentsu.type !== 'chi') return false;
  }

  const jantai = decomposition.jantai[0];
  if (jantai && isHonorTile(jantai)) {
    const honorValue = jantai.value as HonorType;
    if (honorValue === gameContext.round || honorValue === gameContext.playerWind) return false;
    if (honorValue === 'white' || honorValue === 'green' || honorValue === 'red') return false;
  }

  // 必须两面听
  if (!isRyanmenWait(hand, decomposition)) return false;

  return true;
}

/** 判定断幺九 */
function isTanyao(tiles: Tile[]): boolean {
  for (const tile of tiles) {
    if (isYaochuTile(tile)) return false;
  }
  return true;
}

/** 判定役牌 */
function detectYakuhai(decomposition: MeldDecomposition, gameContext: GameContext): Yaku[] {
  const yaku: Yaku[] = [];
  for (const meld of decomposition.mentsu) {
    if (isKotsuMeld(meld.type)) {
      const tile = meld.tiles[0];
      if (isHonorTile(tile)) {
        const honorValue = tile.value as HonorType;
        if (honorValue === gameContext.round) {
          const name = gameContext.round === 'east' ? '东' : gameContext.round === 'south' ? '南' : '西';
          yaku.push({ name: `役牌:场风${name}`, han: 1 });
        }
        if (honorValue === gameContext.playerWind) {
          const name = gameContext.playerWind === 'east' ? '东' : gameContext.playerWind === 'south' ? '南' :
                       gameContext.playerWind === 'west' ? '西' : '北';
          yaku.push({ name: `役牌:自风${name}`, han: 1 });
        }
        if (honorValue === 'white') yaku.push({ name: '役牌:白', han: 1 });
        if (honorValue === 'green') yaku.push({ name: '役牌:发', han: 1 });
        if (honorValue === 'red') yaku.push({ name: '役牌:中', han: 1 });
      }
    }
  }
  return yaku;
}

/** 判定混一色/清一色 */
function isChinitsu(tiles: Tile[], allowHonor: boolean): boolean {
  const suits = new Set<TileSuit>();
  for (const tile of tiles) suits.add(tile.suit);
  if (allowHonor) {
    const numberSuits = Array.from(suits).filter(s => s !== 'honor');
    return numberSuits.length === 1 && suits.has('honor');
  }
  return suits.size === 1 && !suits.has('honor');
}

/** 判定对对和 */
function isToitoi(decomposition: MeldDecomposition): boolean {
  let kotsuCount = 0;
  for (const meld of decomposition.mentsu) {
    if (isKotsuMeld(meld.type)) kotsuCount++;
  }
  return kotsuCount === 4;
}

/** 判定一盃口（门清限定）：同花色同数字的2组顺子 */
function isIipeikou(decomposition: MeldDecomposition): boolean {
  const chiList = decomposition.mentsu.filter(m => m.type === 'chi');
  for (let i = 0; i < chiList.length; i++) {
    for (let j = i + 1; j < chiList.length; j++) {
      const a = chiList[i].tiles[0];
      const b = chiList[j].tiles[0];
      if (a.suit === b.suit && a.value === b.value) return true;
    }
  }
  return false;
}

/** 判定二盃口（门清限定）：2组一盃口 */
function isRyanpeikou(decomposition: MeldDecomposition): boolean {
  const chiList = decomposition.mentsu.filter(m => m.type === 'chi');
  const matched = new Set<number>();
  let pairs = 0;
  for (let i = 0; i < chiList.length; i++) {
    if (matched.has(i)) continue;
    for (let j = i + 1; j < chiList.length; j++) {
      if (matched.has(j)) continue;
      const a = chiList[i].tiles[0];
      const b = chiList[j].tiles[0];
      if (a.suit === b.suit && a.value === b.value) {
        matched.add(i);
        matched.add(j);
        pairs++;
        break;
      }
    }
  }
  return pairs >= 2;
}

/** 判定三暗刻：3组暗刻（暗杠也算） */
function isSanankou(hand: Hand, decomposition: MeldDecomposition): boolean {
  return countClosedKotsu(hand, decomposition) >= 3;
}

/** 判定四暗刻：4个暗刻（门清限定，役满，和了牌完成刻子而非雀头） */
function isSuuankou(hand: Hand, decomposition: MeldDecomposition): boolean {
  const isMenzen = !hand.melds.some(m => m.isOpen);
  if (!isMenzen) return false;
  if (countClosedKotsu(hand, decomposition) !== 4) return false;

  // 和了牌不能在雀头中（否则是四暗刻单骑）
  const jantai = decomposition.jantai[0];
  if (!jantai) return false;
  return !(jantai.suit === hand.winningTile.suit && jantai.value === hand.winningTile.value);
}

/** 判定三色同刻：万/筒/索同数字刻子 */
function isSanshokuDoukou(decomposition: MeldDecomposition): boolean {
  const kotsuList = decomposition.mentsu.filter(m => isKotsuMeld(m.type));
  const suits: TileSuit[] = ['man', 'pin', 'sou'];
  for (const suit of suits) {
    let found = false;
    for (let num = 1; num <= 9; num++) {
      const hasTriplet = kotsuList.some(m => {
        const t = m.tiles[0];
        return t.suit === suit && getTileNumber(t) === num;
      });
      if (hasTriplet) { found = true; break; }
    }
    if (!found) return false;
  }
  // 进一步检查是否有相同数字的三色刻子
  for (let num = 1; num <= 9; num++) {
    const man = kotsuList.some(m => m.tiles[0].suit === 'man' && getTileNumber(m.tiles[0]) === num);
    const pin = kotsuList.some(m => m.tiles[0].suit === 'pin' && getTileNumber(m.tiles[0]) === num);
    const sou = kotsuList.some(m => m.tiles[0].suit === 'sou' && getTileNumber(m.tiles[0]) === num);
    if (man && pin && sou) return true;
  }
  return false;
}

/** 判定三杠子：3组杠子 */
function isSankantsu(decomposition: MeldDecomposition): boolean {
  let kanCount = 0;
  for (const meld of decomposition.mentsu) {
    if (isKanMeld(meld.type)) kanCount++;
  }
  return kanCount >= 3;
}

/** 判定混老头：仅由幺九牌组成，且必须同时包含字牌和老头牌 */
function isHonroutou(tiles: Tile[]): boolean {
  let hasHonor = false;
  let hasTerminal = false;
  for (const tile of tiles) {
    if (!isYaochuTile(tile)) return false;
    if (isHonorTile(tile)) hasHonor = true;
    else hasTerminal = true;
  }
  return hasHonor && hasTerminal;
}

/** 判定小三元：2组三元刻子 + 三元雀头 */
function isShousangen(decomposition: MeldDecomposition): boolean {
  const dragonTypes: HonorType[] = ['white', 'green', 'red'];
  const dragonKotsu: Set<string> = new Set();
  for (const meld of decomposition.mentsu) {
    if (isKotsuMeld(meld.type)) {
      const tile = meld.tiles[0];
      if (isHonorTile(tile) && dragonTypes.includes(tile.value as HonorType)) {
        dragonKotsu.add(tile.value as string);
      }
    }
  }
  if (dragonKotsu.size < 2) return false;
  // 雀头是三元牌
  const jantai = decomposition.jantai[0];
  if (jantai && isHonorTile(jantai) && dragonTypes.includes(jantai.value as HonorType)) {
    return true;
  }
  return false;
}

/** 判定三色同顺：万/筒/索同数字顺子 */
function isSanshokuDoujun(decomposition: MeldDecomposition): boolean {
  const chiList = decomposition.mentsu.filter(m => m.type === 'chi');
  for (let num = 1; num <= 7; num++) {
    const man = chiList.some(m => m.tiles[0].suit === 'man' && getTileNumber(m.tiles[0]) === num);
    const pin = chiList.some(m => m.tiles[0].suit === 'pin' && getTileNumber(m.tiles[0]) === num);
    const sou = chiList.some(m => m.tiles[0].suit === 'sou' && getTileNumber(m.tiles[0]) === num);
    if (man && pin && sou) return true;
  }
  return false;
}

/** 判定一气通贯：同花色 123+456+789 顺子 */
function isIkkitsuukan(decomposition: MeldDecomposition): boolean {
  const chiList = decomposition.mentsu.filter(m => m.type === 'chi');
  const suitNums: Record<string, Set<number>> = {};
  for (const chi of chiList) {
    const suit = chi.tiles[0].suit;
    const start = getTileNumber(chi.tiles[0]);
    if (!suitNums[suit]) suitNums[suit] = new Set();
    suitNums[suit].add(start);
  }
  for (const suit of Object.keys(suitNums)) {
    const nums = suitNums[suit];
    if (nums.has(1) && nums.has(4) && nums.has(7)) return true;
  }
  return false;
}

/** 判断一个面子是否包含幺九牌 */
function mentsuContainsYaochu(mentsu: { tiles: Tile[] }): boolean {
  return mentsu.tiles.some(t => isYaochuTile(t));
}

/** 判断一个面子是否包含老头牌（1/9，不含字牌） */
function mentsuContainsLaotou(mentsu: { tiles: Tile[] }): boolean {
  return mentsu.tiles.some(t => isLaotouTile(t));
}

/** 判定混全带幺九：所有面子/雀头含幺九牌，且必须包含字牌 */
function isChanta(decomposition: MeldDecomposition, allTiles: Tile[]): boolean {
  // 所有面子必须含幺九
  for (const mentsu of decomposition.mentsu) {
    if (!mentsuContainsYaochu(mentsu)) return false;
  }
  // 雀头必须含幺九
  const jantai = decomposition.jantai[0];
  if (!jantai || !isYaochuTile(jantai)) return false;
  // 必须包含至少一种字牌
  if (!allTiles.some(t => isHonorTile(t))) return false;
  // 不能是纯字牌/混老头/清老头
  if (allTiles.every(t => t.suit === 'honor')) return false;
  if (isHonroutou(allTiles)) return false;
  if (isChinroutou(allTiles)) return false;
  return true;
}

/** 判定纯全带幺九：所有面子/雀头含老头牌（1/9），不含字牌 */
function isJunchan(decomposition: MeldDecomposition, allTiles: Tile[]): boolean {
  // 不能有字牌
  if (allTiles.some(t => t.suit === 'honor')) return false;
  // 所有面子必须含老头牌
  for (const mentsu of decomposition.mentsu) {
    if (!mentsuContainsLaotou(mentsu)) return false;
  }
  // 雀头必须是老头牌
  const jantai = decomposition.jantai[0];
  if (!jantai || !isLaotouTile(jantai)) return false;
  return true;
}

/** 统计有效暗刻数（荣和时含和了牌的刻子不算暗刻） */
function countClosedKotsu(hand: Hand, decomposition: MeldDecomposition): number {
  let closedKotsu = 0;
  for (const meld of decomposition.mentsu) {
    if (isKotsuMeld(meld.type)) {
      const isEffectivelyClosed = !meld.isOpen && 
        !(!hand.isTsumo && mentsuContainsWinningTile(meld, hand.winningTile));
      if (isEffectivelyClosed) closedKotsu++;
    }
  }
  return closedKotsu;
}

/** 判定两面听（ryanmen）：和了牌完成的是一个两面搭子 */
function isRyanmenWait(hand: Hand, decomposition: MeldDecomposition): boolean {
  const wt = hand.winningTile;

  // 检查和了牌是否在雀头中（单骑听牌）
  const jantai = decomposition.jantai[0];
  if (jantai && jantai.suit === wt.suit && jantai.value === wt.value) {
    return false;
  }

  // 检查每个顺子面子
  for (const mentsu of decomposition.mentsu) {
    if (mentsu.type !== 'chi') continue;
    const tiles = mentsu.tiles;
    const idx = tiles.findIndex(t => t.suit === wt.suit && t.value === wt.value);
    if (idx === -1) continue;

    const startNum = getTileNumber(tiles[0]);
    if (idx === 0) {
      // 和了牌是顺子第一张：原搭子是 [startNum+1, startNum+2]
      // startNum=7 时原搭子是 89（边张），否则是两面
      return startNum < 7;
    } else if (idx === 1) {
      // 和了牌是顺子中间张：坎张
      return false;
    } else {
      // idx === 2：和了牌是顺子最后一张：原搭子是 [startNum, startNum+1]
      // startNum=1 时原搭子是 12（边张），否则是两面
      return startNum > 1;
    }
  }

  // 和了牌不在任何顺子中（双碰听牌）
  return false;
}

/** 获取听牌型的符数（坎张听、边张听、单骑听各2符，两面听和双碰听0符） */
function getWaitFu(hand: Hand, decomposition: MeldDecomposition): { fu: number; label: string } {
  const wt = hand.winningTile;

  // 单骑听牌（和了牌在雀头中）
  const jantai = decomposition.jantai[0];
  if (jantai && jantai.suit === wt.suit && jantai.value === wt.value) {
    return { fu: 2, label: '听牌型: 单骑听' };
  }

  // 检查每个顺子面子
  for (const mentsu of decomposition.mentsu) {
    if (mentsu.type !== 'chi') continue;
    const tiles = mentsu.tiles;
    const idx = tiles.findIndex(t => t.suit === wt.suit && t.value === wt.value);
    if (idx === -1) continue;

    const startNum = getTileNumber(tiles[0]);
    if (idx === 0) {
      // 和了牌是顺子第一张，原搭子是 [startNum+1, startNum+2]
      if (startNum === 7) {
        return { fu: 2, label: '听牌型: 边张听' };
      }
      return { fu: 0, label: '' };
    } else if (idx === 1) {
      // 和了牌是顺子中间张：坎张
      return { fu: 2, label: '听牌型: 坎张听' };
    } else {
      // idx === 2：和了牌是顺子最后一张，原搭子是 [startNum, startNum+1]
      if (startNum === 1) {
        return { fu: 2, label: '听牌型: 边张听' };
      }
      return { fu: 0, label: '' };
    }
  }

  // 双碰听牌，不加符
  return { fu: 0, label: '' };
}

/** 判定大三元：3组三元刻子 */
function isDaisangen(decomposition: MeldDecomposition): boolean {
  const dragonTypes: HonorType[] = ['white', 'green', 'red'];
  const dragonKotsu = new Set<string>();
  for (const meld of decomposition.mentsu) {
    if (isKotsuMeld(meld.type)) {
      const tile = meld.tiles[0];
      if (isHonorTile(tile) && dragonTypes.includes(tile.value as HonorType)) {
        dragonKotsu.add(tile.value as string);
      }
    }
  }
  return dragonKotsu.size === 3;
}

/** 判定大四喜：4组风牌刻子 */
function isDaisuushii(decomposition: MeldDecomposition): boolean {
  const windTypes: HonorType[] = ['east', 'south', 'west', 'north'];
  const windKotsu = new Set<string>();
  for (const meld of decomposition.mentsu) {
    if (isKotsuMeld(meld.type)) {
      const tile = meld.tiles[0];
      if (isHonorTile(tile) && windTypes.includes(tile.value as HonorType)) {
        windKotsu.add(tile.value as string);
      }
    }
  }
  return windKotsu.size === 4;
}

/** 判定小四喜：3组风牌刻子 + 风牌雀头 */
function isShousuushii(decomposition: MeldDecomposition): boolean {
  const windTypes: HonorType[] = ['east', 'south', 'west', 'north'];
  const windKotsu = new Set<string>();
  for (const meld of decomposition.mentsu) {
    if (isKotsuMeld(meld.type)) {
      const tile = meld.tiles[0];
      if (isHonorTile(tile) && windTypes.includes(tile.value as HonorType)) {
        windKotsu.add(tile.value as string);
      }
    }
  }
  if (windKotsu.size !== 3) return false;
  const jantai = decomposition.jantai[0];
  if (!jantai || !isHonorTile(jantai)) return false;
  const remainingWind = windTypes.find(w => !windKotsu.has(w));
  return jantai.value === remainingWind;
}

/** 判定字一色：全部为字牌 */
function isTsuuiisou(tiles: Tile[]): boolean {
  return tiles.every(t => t.suit === 'honor');
}

/** 判定清老头：全部为老头牌（1/9），不含字牌 */
function isChinroutou(tiles: Tile[]): boolean {
  return tiles.every(t => isLaotouTile(t));
}

/** 判定绿一色：仅含 2s/3s/4s/6s/8s/发 */
function isRyuuiisou(tiles: Tile[]): boolean {
  const greenTiles: { suit: TileSuit; value: number | string }[] = [
    { suit: 'sou', value: 2 },
    { suit: 'sou', value: 3 },
    { suit: 'sou', value: 4 },
    { suit: 'sou', value: 6 },
    { suit: 'sou', value: 8 },
    { suit: 'honor', value: 'green' },
  ];
  for (const tile of tiles) {
    const isGreen = greenTiles.some(g => g.suit === tile.suit && g.value === tile.value);
    if (!isGreen) return false;
  }
  return true;
}

/** 判定九莲宝灯：同花色 1112345678999 + 1张 */
function isChuurenpoutou(tiles: Tile[]): boolean {
  if (tiles.length !== 14) return false;
  const suit = tiles[0].suit;
  if (suit === 'honor') return false;
  if (!tiles.every(t => t.suit === suit)) return false;

  const counts = new Array(10).fill(0);
  for (const tile of tiles) {
    counts[tile.value as number]++;
  }
  return counts[1] >= 3 && counts[9] >= 3 &&
    counts[2] >= 1 && counts[3] >= 1 && counts[4] >= 1 &&
    counts[5] >= 1 && counts[6] >= 1 && counts[7] >= 1 && counts[8] >= 1;
}

/** 判定纯正九莲宝灯：移除和了牌后剩余13张为 1112345678999（9面听牌） */
function isJunseiChuurenpoutou(tiles: Tile[], winningTile: Tile): boolean {
  if (!isChuurenpoutou(tiles)) return false;

  const counts = new Array(10).fill(0);
  for (const tile of tiles) {
    counts[tile.value as number]++;
  }
  counts[winningTile.value as number]--;

  return counts[1] === 3 && counts[9] === 3 &&
    counts[2] === 1 && counts[3] === 1 && counts[4] === 1 &&
    counts[5] === 1 && counts[6] === 1 && counts[7] === 1 && counts[8] === 1;
}

/** 判定四杠子：4组杠子 */
function isSuukantsu(decomposition: MeldDecomposition): boolean {
  let kanCount = 0;
  for (const meld of decomposition.mentsu) {
    if (isKanMeld(meld.type)) kanCount++;
  }
  return kanCount === 4;
}

/** 判定四暗刻单骑：4暗刻 + 和了牌完成雀头（单骑听牌） */
function isSuuankouTanki(hand: Hand, decomposition: MeldDecomposition): boolean {
  const isMenzen = !hand.melds.some(m => m.isOpen);
  if (!isMenzen) return false;
  if (countClosedKotsu(hand, decomposition) !== 4) return false;

  // 和了牌必须在雀头中（单骑听牌）
  const jantai = decomposition.jantai[0];
  if (!jantai) return false;
  return jantai.suit === hand.winningTile.suit && jantai.value === hand.winningTile.value;
}

// ============================================================
// 役种后处理：层级、互斥、役满独占
// ============================================================

/** 役满层级：高等级覆盖低等级 */
const YAKUMAN_HIERARCHY: Record<string, string> = {
  '九莲宝灯': '纯正九莲宝灯',
  '四暗刻': '四暗刻单骑',
  '国士无双': '国士无双十三面',
};

/** 役种互斥 */
const YAKU_EXCLUSIONS: Record<string, string[]> = {
  '二盃口': ['一盃口', '七对子'],
  '纯全带幺九': ['混全带幺九'],
  '四暗刻': ['门前清自摸和'],
  '四暗刻单骑': ['门前清自摸和'],
};

/**
 * 后处理役种列表：
 * 1. 役满层级：高等级覆盖低等级
 * 2. 役满独占：存在役满时移除所有非役满役种
 * 3. 互斥规则：应用排除关系
 */
function postProcessYaku(yaku: Yaku[]): Yaku[] {
  // 1. 役满层级：高等级覆盖低等级
  let result = [...yaku];
  for (const [lower, higher] of Object.entries(YAKUMAN_HIERARCHY)) {
    const hasHigher = result.some(y => y.name === higher);
    if (hasHigher) {
      result = result.filter(y => y.name !== lower);
    }
  }

  // 2. 役满独占：存在役满时移除所有非役满役种
  const hasYakuman = result.some(y => y.han >= 13);
  if (hasYakuman) {
    result = result.filter(y => y.han >= 13);
  }

  // 3. 互斥规则
  for (const y of result) {
    const exclusions = YAKU_EXCLUSIONS[y.name];
    if (exclusions) {
      result = result.filter(y2 => !exclusions.includes(y2.name));
    }
  }

  return result;
}

// ============================================================
// 点数计算
// ============================================================

function calculateBasePoints(fu: number, han: number): number {
  if (han >= 13) return 8000; // 役满
  if (han >= 11) return 6000; // 三倍满
  if (han >= 8)  return 4000; // 倍满
  if (han >= 6)  return 3000; // 跳满
  if (han >= 5)  return 2000; // 满贯

  const base = fu * Math.pow(2, han + 2);
  return Math.min(base, 2000);
}

/** 向上取整到 100 */
function roundUp100(n: number): number {
  return Math.ceil(n / 100) * 100;
}

// ============================================================
// 主计算函数
// ============================================================

export function calculateScore(hand: Hand, gameContext: GameContext): ScoringResult {
  const allTiles = [...hand.handTiles, hand.winningTile, ...hand.melds.flatMap(m => m.tiles)];
  const isMenzen = !hand.melds.some(m => m.isOpen);

  let fu: number;
  let fuBreakdown: FuBreakdown | undefined;
  let yaku: Yaku[];

  // 收集所有可能的解释（特殊牌型 + 普通分解），选择最高番数
  type CandidateResult = {
    fu: number;
    fuBreakdown: FuBreakdown;
    decomp: MeldDecomposition;
    yaku: Yaku[];
    formalHan: number;
  };
  const candidates: CandidateResult[] = [];

  // 特殊牌型：七对子
  if (isChiitoitsu(allTiles)) {
    const chiitoiDecomp: MeldDecomposition = { mentsu: [...hand.melds], jantai: [] };
    const chiitoiYaku = detectYaku(hand, chiitoiDecomp, gameContext, allTiles);
    const chiitoiFormalHan = chiitoiYaku.filter(y => !isDoraYaku(y.name)).reduce((s, y) => s + y.han, 0);
    candidates.push({
      fu: 25,
      fuBreakdown: { items: [], specialNote: '七对子固定25符' },
      decomp: chiitoiDecomp,
      yaku: chiitoiYaku,
      formalHan: chiitoiFormalHan,
    });
  }

  // 特殊牌型：国士无双
  if (isKokushi(allTiles)) {
    const kokushiDecomp: MeldDecomposition = { mentsu: [...hand.melds], jantai: [] };
    const kokushiYaku = detectYaku(hand, kokushiDecomp, gameContext, allTiles);
    const kokushiFormalHan = kokushiYaku.filter(y => !isDoraYaku(y.name)).reduce((s, y) => s + y.han, 0);
    candidates.push({
      fu: 30,
      fuBreakdown: { items: [], specialNote: '国士无双固定30符' },
      decomp: kokushiDecomp,
      yaku: kokushiYaku,
      formalHan: kokushiFormalHan,
    });
  }

  // 特殊牌型：九莲宝灯（门清限定）
  if (isMenzen && isChuurenpoutou(allTiles)) {
    const chuurenDecomp: MeldDecomposition = { mentsu: [...hand.melds], jantai: [] };
    const chuurenYaku = detectYaku(hand, chuurenDecomp, gameContext, allTiles);
    const chuurenFormalHan = chuurenYaku.filter(y => !isDoraYaku(y.name)).reduce((s, y) => s + y.han, 0);
    candidates.push({
      fu: 30,
      fuBreakdown: { items: [], specialNote: '九莲宝灯固定30符' },
      decomp: chuurenDecomp,
      yaku: chuurenYaku,
      formalHan: chuurenFormalHan,
    });
  }

  // 普通手牌：4面子+1雀头 — 对所有分解评估番数+符数
  const handTiles = [...hand.handTiles, hand.winningTile];
  const decompositions = decomposeHand(handTiles, hand.melds);

  if (decompositions.length > 0) {
    for (const decomp of decompositions) {
      const rawYaku = detectYaku(hand, decomp, gameContext, allTiles);
      const formalHan = rawYaku
        .filter(y => !isDoraYaku(y.name))
        .reduce((sum, y) => sum + y.han, 0);

      const { fu: decompFu, breakdown: decompBreakdown } = calculateFu(hand, decomp, gameContext);
      let effectiveFu = decompFu;
      let effectiveBreakdown = decompBreakdown;

      // 平和 + 门清自摸 = 20符固定
      if (rawYaku.some(y => y.name === '平和') && hand.isTsumo && isMenzen) {
        effectiveFu = 20;
        effectiveBreakdown = { items: [], specialNote: '平和 + 门清自摸 = 固定20符' };
      }

      candidates.push({
        fu: effectiveFu,
        fuBreakdown: effectiveBreakdown,
        decomp,
        yaku: rawYaku,
        formalHan,
      });
    }
  }

  // 选择最高番数解释（番数相同时取最高符数）
  if (candidates.length === 0) {
    throw new Error('手牌无法分解，不是有效的和了牌型');
  }

  let bestCandidate = candidates[0];
  for (const c of candidates) {
    if (c.formalHan > bestCandidate.formalHan ||
        (c.formalHan === bestCandidate.formalHan && c.fu > bestCandidate.fu)) {
      bestCandidate = c;
    }
  }

  fu = bestCandidate.fu;
  fuBreakdown = bestCandidate.fuBreakdown;
  yaku = bestCandidate.yaku;

  // 判断型听（只有宝牌没有正式役种）
  const formalYaku = yaku.filter(y => !isDoraYaku(y.name));
  const isKeiten = formalYaku.length === 0;

  const han = yaku.reduce((sum, y) => sum + y.han, 0);

  // 型听时得点为0
  if (isKeiten) {
    return {
      fu,
      han: 0,
      points: 0,
      dealer: { tsumo: 0, ron: 0 },
      nonDealer: { tsumo: { fromDealer: 0, fromNonDealer: 0 }, ron: 0 },
      yaku,
      isKeiten: true,
      honba: gameContext.honba,
      fuBreakdown,
    };
  }

  const basePoints = calculateBasePoints(fu, han);
  const honbaBonus = gameContext.honba * 300;  // 场供 = 300 × 本场数

  const dealer = {
    tsumo: roundUp100(basePoints * 2) + gameContext.honba * 100,  // 自摸时场供平分三家
    ron: roundUp100(basePoints * 6) + honbaBonus,                  // 荣和时场供由放铳者承担
  };

  const nonDealer = {
    tsumo: {
      fromDealer: roundUp100(basePoints * 2) + gameContext.honba * 100,
      fromNonDealer: roundUp100(basePoints * 1) + gameContext.honba * 100,
    },
    ron: roundUp100(basePoints * 4) + honbaBonus,
  };

  return {
    fu,
    han,
    points: basePoints,
    dealer,
    nonDealer,
    yaku,
    isKeiten: false,
    honba: gameContext.honba,
    fuBreakdown,
  };
}