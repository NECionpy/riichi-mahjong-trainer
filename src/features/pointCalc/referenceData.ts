// ============================================================
// 报点训练 — 参考数据（符数表、点数表、番种图谱）
// ============================================================

// ---- 符数计算规则 ----

export interface FuRuleItem {
  category: string;
  condition: string;
  fu: number | string;
  note?: string;
}

export interface FuRuleSection {
  title: string;
  items: FuRuleItem[];
}

export const fuTable: FuRuleSection[] = [
  {
    title: '底符（基本符）',
    items: [
      { category: '和牌', condition: '基本符', fu: 20 },
    ],
  },
  {
    title: '面子（メンツ）',
    items: [
      { category: '顺子', condition: '明顺 / 暗顺', fu: 0 },
      { category: '明刻', condition: '中张牌（2-8）', fu: 2 },
      { category: '明刻', condition: '幺九牌（1/9/字）', fu: 4 },
      { category: '暗刻', condition: '中张牌（2-8）', fu: 4 },
      { category: '暗刻', condition: '幺九牌（1/9/字）', fu: 8 },
      { category: '明杠', condition: '中张牌（2-8）', fu: 8 },
      { category: '明杠', condition: '幺九牌（1/9/字）', fu: 16 },
      { category: '暗杠', condition: '中张牌（2-8）', fu: 16 },
      { category: '暗杠', condition: '幺九牌（1/9/字）', fu: 32 },
    ],
  },
  {
    title: '雀头（アタマ）',
    items: [
      { category: '役牌', condition: '场风 / 自风 / 三元牌', fu: 2 },
      { category: '连风', condition: '场风 = 自风（双风）', fu: 4, note: '即 2+2' },
      { category: '其他', condition: '数牌 / 客风', fu: 0 },
    ],
  },
  {
    title: '听牌形（待ち）',
    items: [
      { category: '两面听', condition: '两面搭子', fu: 0 },
      { category: '双碰听', condition: '双碰', fu: 0 },
      { category: '坎张听', condition: '中张嵌张', fu: 2 },
      { category: '边张听', condition: '边张（12 或 89）', fu: 2 },
      { category: '单骑听', condition: '单骑', fu: 2 },
    ],
  },
  {
    title: '和牌方式',
    items: [
      { category: '自摸', condition: '自摸（无平和等特例）', fu: 2 },
      { category: '门清荣和', condition: '门前清 + 荣和', fu: 10 },
    ],
  },
  {
    title: '计算规则',
    items: [
      { category: '进位', condition: '合计后向上取整至 10 的倍数', fu: '⌈x/10⌉×10' },
      { category: '特例', condition: '平和 + 门清自摸', fu: '20 符（固定）' },
      { category: '特例', condition: '七对子', fu: '25 符（固定）' },
      { category: '特例', condition: '副露和牌（非门清荣和）最低', fu: '30 符' },
    ],
  },
];

// ---- 点数表（动态计算） ----

/** 计算基本点 */
function calcBasePoints(fu: number, han: number): number {
  // 满贯以上
  if (han >= 13) return 8000;
  if (han >= 11) return 6000;
  if (han >= 8) return 4000;
  if (han >= 6) return 3000;
  if (han >= 5) return 2000;

  const base = fu * Math.pow(2, han + 2);
  return Math.min(base, 2000);
}

/** 向上取整到 100 */
function roundUp100(n: number): number {
  return Math.ceil(n / 100) * 100;
}

export interface PointCell {
  ron: number;
  tsumo: string; // 自摸时各家支付
}

export interface PointTableData {
  fuValues: number[];
  hanLabels: string[];
  cells: (PointCell | null)[][];
  manganNote: string;
}

/** 生成庄家点数表 */
export function generateDealerTable(): PointTableData {
  const fuValues = [20, 25, 30, 40, 50, 60, 70, 80, 90, 100, 110];
  const hanLabels = ['1番', '2番', '3番', '4番'];

  const cells: (PointCell | null)[][] = fuValues.map((fu) =>
    hanLabels.map((_, hi) => {
      const han = hi + 1;
      if (fu === 20 && han === 1) return null; // 20符1番不存在
      if (fu === 25 && han === 1) return null; // 25符1番不存在

      const base = calcBasePoints(fu, han);
      if (base >= 2000 && han < 5) {
        // 满贯
        return { ron: 12000, tsumo: '4000' };
      }

      const ron = roundUp100(base * 6);
      const tsumo = roundUp100(base * 2);
      return { ron, tsumo: String(tsumo) };
    })
  );

  return {
    fuValues,
    hanLabels,
    cells,
    manganNote: '满贯（5番） 12000/4000 | 跳满（6～7番） 18000/6000 | 倍满（8～10番） 24000/8000 | 三倍满（11～12番） 36000/12000 | 役满（13番） 48000/16000',
  };
}

/** 生成闲家点数表 */
export function generateNonDealerTable(): PointTableData {
  const fuValues = [20, 25, 30, 40, 50, 60, 70, 80, 90, 100, 110];
  const hanLabels = ['1番', '2番', '3番', '4番'];

  const cells: (PointCell | null)[][] = fuValues.map((fu) =>
    hanLabels.map((_, hi) => {
      const han = hi + 1;
      if (fu === 20 && han <= 2) return null; // 20符1-2番不存在
      if (fu === 25 && han === 1) return null; // 25符1番不存在

      const base = calcBasePoints(fu, han);
      if (base >= 2000 && han < 5) {
        return { ron: 8000, tsumo: '2000 / 4000' };
      }

      const ron = roundUp100(base * 4);
      const fromNonDealer = roundUp100(base * 1);
      const fromDealer = roundUp100(base * 2);
      return { ron, tsumo: `${fromNonDealer} / ${fromDealer}` };
    })
  );

  return {
    fuValues,
    hanLabels,
    cells,
    manganNote: '满贯（5番） 8000/2000,4000 | 跳满（6～7番） 12000/3000,6000 | 倍满（8～10番） 16000/4000,8000 | 三倍满（11～12番） 24000/6000,12000 | 役满（13番） 32000/8000,16000',
  };
}

// ---- 役种图谱 ----

export interface YakuEntry {
  name: string;
  nameJa?: string;
  han: number | string;
  condition: string; // 门清限定 / 副露减1番 等
  description: string;
  handExample?: string; // 参考手牌
}

export interface YakuCategory {
  title: string;
  yakus: YakuEntry[];
}

export const yakuChart: YakuCategory[] = [
  {
    title: '1 番',
    yakus: [
      { name: '立直', nameJa: 'リーチ', han: 1, condition: '门清限定', description: '门清状态下宣言立直，支付 1000 点供托', handExample: '123m678m456p789s11z' },
      { name: '一发', nameJa: '一発', han: 1, condition: '门清限定', description: '立直后一巡内和牌（不可有他人鸣牌）', handExample: '123m678m456p789s11z' },
      { name: '门前清自摸和', nameJa: '門前清自摸和', han: 1, condition: '门清限定', description: '门清状态下自摸和牌', handExample: '123m678m456p789s11z' },
      { name: '平和', nameJa: '平和', han: 1, condition: '门清限定', description: '4 组顺子 + 非役牌雀头 + 两面听', handExample: '123m456p789s56m88p7m' },
      { name: '一盃口', nameJa: '一盃口', han: 1, condition: '门清限定', description: '同花色同数字的 2 组顺子', handExample: '112233m456p789s11z' },
      { name: '断幺九', nameJa: '断么九', han: 1, condition: '副露可', description: '不含幺九牌（1/9/字牌）', handExample: '234m456p567s22s55m5m' },
      { name: '役牌·场风', nameJa: '役牌（場風）', han: 1, condition: '副露可', description: '场风刻子（东场时东风刻）', handExample: '111z234m456p789s22m' },
      { name: '役牌·自风', nameJa: '役牌（自風）', han: 1, condition: '副露可', description: '自风刻子', handExample: '222z234m456p789s22m' },
      { name: '役牌·三元', nameJa: '役牌（三元）', han: 1, condition: '副露可', description: '白 / 发 / 中 刻子', handExample: '555z234m456p789s22m' },
      { name: '海底捞月', nameJa: '海底撈月', han: 1, condition: '副露可', description: '最后一张牌自摸和牌', handExample: '123m678m456p789s11z' },
      { name: '河底捞鱼', nameJa: '河底撈魚', han: 1, condition: '副露可', description: '最后一张牌荣和', handExample: '123m678m456p789s11z' },
      { name: '岭上开花', nameJa: '嶺上開花', han: 1, condition: '副露可', description: '杠后补牌自摸和牌', handExample: '123m678m56pa1111p11z4p' },
      { name: '抢杠', nameJa: '搶槓', han: 1, condition: '副露可', description: '他人加杠时荣和', handExample: 'g1111m' },
    ],
  },
  {
    title: '2 番',
    yakus: [
      { name: '两立直', nameJa: 'ダブル立直', han: 2, condition: '门清限定', description: '第一巡立直（无人鸣牌）', handExample: '123m678m456p789s11z' },
      { name: '七对子', nameJa: '七対子', han: 2, condition: '门清限定', description: '7 组对子，固定 25 符', handExample: '11m22p33s44z55m66p77s' },
      { name: '对对和', nameJa: '対々和', han: 2, condition: '副露可', description: '4 组刻子（或杠子）', handExample: '111m222p333s444z55m' },
      { name: '三暗刻', nameJa: '三暗刻', han: 2, condition: '副露可', description: '3 组暗刻（副露后也可）', handExample: '111m222p333s44z45m3m' },
      { name: '三色同刻', nameJa: '三色同刻', han: 2, condition: '副露可', description: '万/筒/索 同数字刻子', handExample: '111m111p111s22z34m5m' },
      { name: '三杠子', nameJa: '三槓子', han: 2, condition: '副露可', description: '3 组杠子', handExample: 'a1111mg2222pk3333s44z55m' },
      { name: '混老头', nameJa: '混老頭', han: 2, condition: '副露可', description: '仅由幺九牌组成（1/9/字牌）', handExample: '111m999p111s22z11p1p' },
      { name: '小三元', nameJa: '小三元', han: 2, condition: '副露可', description: '2 组三元刻子 + 三元雀头', handExample: '555z666z77z123m34p5p' },
      { name: '三色同顺', nameJa: '三色同順', han: 2, condition: '门清 2 / 副露 1', description: '万/筒/索 同数字顺子', handExample: '123m123p123s22z33m3m' },
      { name: '一气通贯', nameJa: '一気通貫', han: 2, condition: '门清 2 / 副露 1', description: '同花色 123+456+789 顺子', handExample: '123m456m789m22p23p1p' },
      { name: '混全带幺九', nameJa: '混全帯么九', han: 2, condition: '门清 2 / 副露 1', description: '所有面子/雀头含幺九牌', handExample: '123m789p123s11z99m1z' },
    ],
  },
  {
    title: '3 番',
    yakus: [
      { name: '二盃口', nameJa: '二盃口', han: 3, condition: '门清限定', description: '2 组一盃口（同花色 2+2 顺子）', handExample: '112233m112233p11z' },
      { name: '纯全带幺九', nameJa: '純全帯么九', han: 3, condition: '门清 3 / 副露 2', description: '所有面子/雀头含幺九（1/9），不含字牌', handExample: '123m789p123s99m11s9m' },
      { name: '混一色', nameJa: '混一色', han: 3, condition: '门清 3 / 副露 2', description: '一种数牌 + 字牌', handExample: '111m456m789m1166z1z' },
    ],
  },
  {
    title: '6 番',
    yakus: [
      { name: '清一色', nameJa: '清一色', han: 6, condition: '门清 6 / 副露 5', description: '全部为同一种花色', handExample: '111222456789m55m' },
    ],
  },
  {
    title: '役满',
    yakus: [
      { name: '国士无双', nameJa: '国士無双', han: '役满', condition: '门清限定', description: '全部 13 种幺九牌各 1 张 + 任意 1 张', handExample: '1m1m9m1p9p1s9s1234567z' },
      { name: '国士无双十三面', nameJa: '国士無双十三面待ち', han: '双倍役满', condition: '门清限定', description: '国士无双 13 面听牌', handExample: '1m9m1p9p1s9s1234567z1m' },
      { name: '四暗刻', nameJa: '四暗刻', han: '役满', condition: '门清限定', description: '4 组暗刻', handExample: '111m222p333s4455m4m' },
      { name: '四暗刻单骑', nameJa: '四暗刻単騎', han: '双倍役满', condition: '门清限定', description: '四暗刻 + 单骑听牌', handExample: '111m222p333s444z5m5m' },
      { name: '大三元', nameJa: '大三元', han: '役满', condition: '副露可', description: '白/发/中 各 1 组刻子', handExample: '555z666z777z23m4s4s1m' },
      { name: '小四喜', nameJa: '小四喜', han: '役满', condition: '副露可', description: '3 组风牌刻子 + 风牌雀头', handExample: '111z222z333z44z45m3m' },
      { name: '大四喜', nameJa: '大四喜', han: '双倍役满', condition: '副露可', description: '4 组风牌刻子', handExample: '111z222z333z444z55m' },
      { name: '字一色', nameJa: '字一色', han: '役满', condition: '副露可', description: '全部为字牌', handExample: '111z222z333z444z55z' },
      { name: '清老头', nameJa: '清老頭', han: '役满', condition: '副露可', description: '全部为老头牌（1/9）', handExample: '111m999p111s999m11p' },
      { name: '绿一色', nameJa: '緑一色', han: '役满', condition: '副露可', description: '仅由 2s/3s/4s/6s/8s/发 组成', handExample: '223344s666s66z88s6z' },
      { name: '九莲宝灯', nameJa: '九蓮宝燈', han: '役满', condition: '门清限定', description: '同花色 1112345678999 + 任意 1 张', handExample: '11123445678999m' },
      { name: '纯正九莲宝灯', nameJa: '純正九蓮宝燈', han: '双倍役满', condition: '门清限定', description: '九莲宝灯 9 面听牌', handExample: '1112345678999m4m' },
      { name: '四杠子', nameJa: '四槓子', han: '役满', condition: '副露可', description: '4 组杠子', handExample: 'a1111mk2222pg3333sa4444z55m' },
      { name: '天和', nameJa: '天和', han: '役满', condition: '门清限定', description: '亲家配牌即和牌', handExample: '' },
      { name: '地和', nameJa: '地和', han: '役满', condition: '门清限定', description: '子家第一巡自摸和牌', handExample: '' },
    ],
  },
];