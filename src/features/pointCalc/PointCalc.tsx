import React, { useEffect, useState } from "react";
import { useToast } from "../../components/Toast/ToastContext";
import Hand from "../../components/Hand/Hand";
import MeldsDisplay from "../../components/Hand/MeldsDisplay";
import Tile from "../../components/Tile/Tile";
import {
  parseTileString,
  parseHandString,
  Tile as TileType,
  sortTiles,
  Meld,
  TileSuit,
  TileValue,
  HonorType,
  MeldType,
  tileKeyToName,
} from "../../core/tile";
import { parseHand, Hand as HandType } from "../../core/hand";
import { calculateScore, GameContext, ScoringResult } from "../../core/scoring";
import ReferenceModal from "./ReferenceModal";
import "./PointCalc.css";

// ============================================================
// 随机生成手牌和场况
// ============================================================

function generateRandomGame(): {
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
  const isTsumo = Math.random() < 0.5;
  let isIppatsu = (isRiichi || isDoubleRiichi) && Math.random() < 0.3;
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
    else if (r < 0.3 && !isMenzen) isChankan = true; // 立直时不能抢杠（抢杠需要加杠=明杠）
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
  const needsKakan = isChankan;

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
    console.warn("随机生成手牌失败，使用兜底手牌");
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

  const suitOrder: TileSuit[] = ["man", "pin", "sou", "honor"];
  let handStr = "";
  for (const s of suitOrder) {
    const nums = grouped[s];
    if (nums.length > 0) {
      handStr += nums.join("") + suitChars[s];
    }
  }

  // 鸣牌追加
  for (const m of melds) {
    const prefix = prefixByMeld[m.type];
    const s = m.tiles[0].suit;
    const nums = m.tiles.map((t) => t.num);
    handStr += " " + prefix + nums.join("") + suitChars[s];
  }

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

/** 兜底：生成简单有效手牌 */
function generateFallbackHand(): {
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

const PointCalc: React.FC = () => {
  const [handInput, setHandInput] = useState("");
  const [handTiles, setHandTiles] = useState<TileType[]>([]);
  const [winningTile, setWinningTile] = useState<TileType | null>(null);
  const [melds, setMelds] = useState<Meld[]>([]);
  const [isTsumo, setIsTsumo] = useState(false);

  const [gameContext, setGameContext] = useState<GameContext>({
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
    doraIndicators: [],
    uraDoraIndicators: [],
    honba: 0,
  });

  const [doraInput, setDoraInput] = useState("");
  const [uraDoraInput, setUraDoraInput] = useState("");

  const [paymentAnswer, setPaymentAnswer] = useState("");

  const [result, setResult] = useState<ScoringResult | null>(null);
  const [error, setError] = useState("");
  const toast = useToast();
  const [showReference, setShowReference] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);

  const handleHandInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setHandInput(value);

    try {
      if (value) {
        const parsed = parseHandString(value);
        setHandTiles(sortTiles(parsed.handTiles));
        setWinningTile(parsed.winTile);
        setMelds(parsed.melds);
        setError("");
      } else {
        setHandTiles([]);
        setWinningTile(null);
        setMelds([]);
      }
    } catch (err) {
      setError(
        '牌格式不正确，请使用如 "123m456p789s22z3m" 或 "123m c456m p111m 789s11z 4p" 的格式',
      );
    }
  };

  const handleAddDora = () => {
    try {
      if (!doraInput.trim()) return;
      const tiles = parseTileString(doraInput);
      if (tiles.length === 0) return;
      const newIndicators = [...gameContext.doraIndicators, tiles[0]];
      if (newIndicators.length > 5) {
        setError("宝牌指示牌最多5张");
        return;
      }
      setGameContext({ ...gameContext, doraIndicators: newIndicators });
      setDoraInput("");
      setError("");
    } catch (err) {
      setError("宝牌指示牌格式不正确");
    }
  };

  const handleRemoveDora = (index: number) => {
    const newIndicators = gameContext.doraIndicators.filter(
      (_, i) => i !== index,
    );
    setGameContext({ ...gameContext, doraIndicators: newIndicators });
  };

  const handleAddUraDora = () => {
    try {
      if (!uraDoraInput.trim()) return;
      const tiles = parseTileString(uraDoraInput);
      if (tiles.length === 0) return;
      const newIndicators = [...gameContext.uraDoraIndicators, tiles[0]];
      if (newIndicators.length > 5) {
        setError("里宝指示牌最多5张");
        return;
      }
      setGameContext({ ...gameContext, uraDoraIndicators: newIndicators });
      setUraDoraInput("");
      setError("");
    } catch (err) {
      setError("里宝指示牌格式不正确");
    }
  };

  const handleRemoveUraDora = (index: number) => {
    const newIndicators = gameContext.uraDoraIndicators.filter(
      (_, i) => i !== index,
    );
    setGameContext({ ...gameContext, uraDoraIndicators: newIndicators });
  };

  // 校验手牌是否合法
  const checkHandValidity = (
    hand: HandType,
    gameContext: GameContext,
  ): boolean => {
    // 计算手牌中每张牌的数量（包括鸣牌和和牌），防止超过4张
    const cardCount: Record<string, number> = {};

    // 计算手牌中每张牌的数量
    hand.handTiles.forEach((t) => {
      const key = `${t.suit}-${t.value}`;
      cardCount[key] = (cardCount[key] || 0) + 1;
    });

    // 计算鸣牌中每张牌的数量
    hand.melds.forEach((meld) => {
      meld.tiles.forEach((t) => {
        const key = `${t.suit}-${t.value}`;
        cardCount[key] = (cardCount[key] || 0) + 1;
      });
    });

    // 计算和牌中每张牌的数量
    hand.winningTile &&
      (() => {
        const key = `${hand.winningTile.suit}-${hand.winningTile.value}`;
        cardCount[key] = (cardCount[key] || 0) + 1;
      })();

    // 计算宝牌指示牌和里宝指示牌中每张牌的数量
    gameContext.doraIndicators.forEach((t) => {
      const key = `${t.suit}-${t.value}`;
      cardCount[key] = (cardCount[key] || 0) + 1;
    });

    gameContext.uraDoraIndicators.forEach((t) => {
      const key = `${t.suit}-${t.value}`;
      cardCount[key] = (cardCount[key] || 0) + 1;
    });

    // 判断 cardCount 是否有超过4张的牌
    for (const [key, count] of Object.entries(cardCount)) {
      if (count > 4) {
        const tileName = tileKeyToName(key);
        setResult(null);
        setError(`牌 ${tileName} 出现了 ${count} 张，超过了4张`);
        return false;
      }
    }
    return true;
  };

  // 计算报点
  const handleCalculate = () => {
    if (handTiles.length === 0 || !winningTile) {
      setError("请输入完整的手牌");
      return;
    }

    try {
      const hand = parseHand(handInput, isTsumo);
      if (!checkHandValidity(hand, gameContext)) {
        return;
      }
      const score = calculateScore(hand, gameContext);

      setResult(score);
      setError("");
    } catch (err) {
      setError("计算失败：" + (err as Error).message);
    }
  };

  // 检查答案
  const handleCheckAnswer = () => {
    // 先执行计算得分
    if (handTiles.length === 0 || !winningTile) {
      setError("请输入完整的手牌");
      return;
    }

    try {
      const hand = parseHand(handInput, isTsumo);
      if (!checkHandValidity(hand, gameContext)) {
        return;
      }
      const score = calculateScore(hand, gameContext);
      setResult(score);
      setError("");

      // 构建期望的支付报点字符串
      let expectedPayment: string;
      if (score.isKeiten) {
        expectedPayment = "0";
      } else if (isTsumo) {
        if (gameContext.playerWind === "east") {
          expectedPayment = `${score.dealer.tsumo}ALL`;
        } else {
          expectedPayment = `${score.nonDealer.tsumo.fromNonDealer}/${score.nonDealer.tsumo.fromDealer}`;
        }
      } else {
        expectedPayment = `${gameContext.playerWind === "east" ? score.dealer.ron : score.nonDealer.ron}`;
      }

      // 标准化对比（忽略空格、大小写）
      const userInput = paymentAnswer.trim().replace(/\s+/g, "").toUpperCase();
      const expected = expectedPayment.replace(/\s+/g, "").toUpperCase();

      if (userInput === expected) {
        toast.showToast("答案正确！", "success");
      } else {
        toast.showToast("答案错误\n正确答案：" + expectedPayment, "error");
      }
    } catch (err) {
      setError("计算失败：" + (err as Error).message);
    }
  };

  const handleGenerateGame = () => {
    const generated = generateRandomGame();
    setHandInput(generated.handInput);
    // 解析生成的手牌字符串
    const parsed = parseHandString(generated.handInput);
    setHandTiles(sortTiles(parsed.handTiles));
    setWinningTile(parsed.winTile);
    setMelds(parsed.melds);
    setIsTsumo(generated.isTsumo);
    setGameContext(generated.gameContext);
    setDoraInput("");
    setUraDoraInput("");
    setPaymentAnswer("");
    setResult(null);
    setError("");
  };

  const handleReset = () => {
    setPaymentAnswer("");
  };

  useEffect(() => {
    handleGenerateGame();
  }, []);

  return (
    <div className="point-calc">
      <div className="point-calc-header">
        <h2>报点模拟器</h2>
        <div className="header-buttons">
          <button className="ref-btn" onClick={() => setShowReference(true)}>
            📖 报点参考
          </button>
          <button
            onClick={handleGenerateGame}
            className="action-btn generate-btn"
          >
            🎲 生成手牌
          </button>
          <button
            className="custom-btn"
            onClick={() => setShowCustomModal(true)}
          >
            ⚙️ 自定义
          </button>
        </div>
      </div>

      {/* 绿色桌面展示区 */}
      {(handTiles.length > 0 || melds.length > 0) && (
        <div className="table-area">
          {/* 场况展示栏 */}
          <div className="game-info-bar">
            <div className="tags-container">
              {(() => {
                const roundName =
                  gameContext.round === "east"
                    ? "东"
                    : gameContext.round === "south"
                      ? "南"
                      : "西";
                const windName =
                  gameContext.playerWind === "east"
                    ? "东"
                    : gameContext.playerWind === "south"
                      ? "南"
                      : gameContext.playerWind === "west"
                        ? "西"
                        : "北";
                const tags: string[] = [];
                tags.push(`${roundName} ${gameContext.roundNumber} 局`);
                tags.push(`${gameContext.honba} 本场`);
                tags.push(`自风：${windName}`);
                return tags.map((tag, i) => (
                  <span key={i} className="game-info-tag">
                    {tag}
                  </span>
                ));
              })()}
            </div>
            <div className="tags-container">
              {(() => {
                const tags: string[] = [];
                if (gameContext.isDoubleRiichi) tags.push("两立直");
                else if (gameContext.isRiichi) tags.push("立直");
                if (gameContext.isIppatsu) tags.push("一发");
                if (gameContext.isHaitei) tags.push("海底捞月");
                if (gameContext.isHoutei) tags.push("河底捞鱼");
                if (gameContext.isRinshan) tags.push("岭上开花");
                if (gameContext.isChankan) tags.push("抢杠");
                return tags.map((tag, i) => (
                  <span key={i} className="game-info-tag">
                    {tag}
                  </span>
                ));
              })()}
              <span className={`game-info-tag ${isTsumo ? "tsumo" : "ron"}`}>
                {isTsumo ? "自摸" : "荣和"}
              </span>
            </div>
          </div>

          {/* 宝牌展示区 */}
          <div className="dora-display-area">
            <div className="dora-indicator-row">
              <span className="dora-indicator-label">宝牌</span>
              <div className="dora-indicator-tiles">
                {[0, 1, 2, 3, 4].map((i) => {
                  if (i < gameContext.doraIndicators.length) {
                    return (
                      <div key={i} className="dora-slot dora-slot-active">
                        <Tile
                          tile={gameContext.doraIndicators[i]}
                          size="small"
                          dir="out"
                        />
                      </div>
                    );
                  }
                  return (
                    <div key={i} className="dora-slot dora-slot-empty">
                      <Tile
                        tile={{ suit: "man", value: 1, id: -1 }}
                        size="small"
                        dir="out"
                        faceDown={true}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
            {(gameContext.isRiichi || gameContext.isDoubleRiichi) && (
              <div className="dora-indicator-row">
                <span className="dora-indicator-label">里宝牌</span>
                <div className="dora-indicator-tiles">
                  {[0, 1, 2, 3, 4].map((i) => {
                    if (i < gameContext.uraDoraIndicators.length) {
                      return (
                        <div key={i} className="dora-slot dora-slot-active">
                          <Tile
                            tile={gameContext.uraDoraIndicators[i]}
                            size="small"
                          />
                        </div>
                      );
                    }
                    return (
                      <div key={i} className="dora-slot dora-slot-empty">
                        <Tile
                          tile={{ suit: "man", value: 1, id: -1 }}
                          size="small"
                          faceDown={true}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 手牌展示区 */}
          <div className="hand-area">
            {handTiles.length > 0 && (
              <Hand
                tiles={handTiles}
                winningTile={winningTile || undefined}
                size="medium"
              />
            )}
            {melds.length > 0 && <MeldsDisplay melds={melds} />}
          </div>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      <div className="section">
        <h3>模拟报点</h3>
        <div className="answer-input">
          <div className="answer-item">
            <label>支付报点:</label>
            <input
              type="text"
              value={paymentAnswer}
              onChange={(e) => setPaymentAnswer(e.target.value)}
              placeholder="如: 500/1000、8000、2000ALL"
              style={{ width: "300px" }}
            />
          </div>
        </div>
        <div className="answer-rules-info">
          <div>宝牌区域显示的为宝牌指示牌</div>
          <div>报点需要考虑当前本场数</div>
          <div>如果不能和牌(型听/炸和)，支付报点为0</div>
          <div>役满封顶，不计算双倍役满和复合役满</div>
        </div>
        <div className="action-buttons">
          <button onClick={handleCheckAnswer} className="action-btn">
            检查答案
          </button>
          <button onClick={handleReset} className="action-btn secondary">
            重置
          </button>
        </div>
      </div>

      <div className="section">
        <h3>计算结果</h3>
        <button onClick={handleCalculate} className="action-btn">
          计算得分
        </button>

        {result && (
          <div className="result">
            <div className="result-summary">
              <div className="result-item">
                <span className="label">符数:</span>
                <span className="value">{result.fu}符</span>
              </div>
              <div className="result-item">
                <span className="label">番数:</span>
                <span className="value">{result.han}番</span>
              </div>
              <div className="result-item">
                <span className="label">基本点:</span>
                <span className="value">{result.points}点</span>
              </div>
              {result.honba > 0 && (
                <div className="result-item">
                  <span className="label">本场数:</span>
                  <span className="value">{result.honba}本场</span>
                </div>
              )}
            </div>

            {result.isKeiten && (
              <div className="result-keiten">
                ⚠️ 型听（形式听牌）：没有正式役种，无法和牌
              </div>
            )}

            {result.fuBreakdown && (
              <div className="result-fu-breakdown">
                <h4>符数计算过程:</h4>
                {result.fuBreakdown.specialNote ? (
                  <div className="fu-breakdown-special">
                    {result.fuBreakdown.specialNote}
                  </div>
                ) : (
                  <div className="fu-breakdown-table">
                    {result.fuBreakdown.items.map((item, idx) => (
                      <div
                        key={idx}
                        className={`fu-breakdown-row fu-type-${item.type}`}
                      >
                        <span className="fu-breakdown-label">{item.label}</span>
                        <span className="fu-breakdown-value">
                          {item.type === "add"
                            ? `+${item.fu}符`
                            : item.type === "subtotal"
                              ? `${item.fu}符`
                              : item.type === "rounding" ||
                                  item.type === "floor"
                                ? `${item.fu}符`
                                : `${item.fu}符`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="result-yaku">
              <h4>役种:</h4>
              <ul>
                {result.yaku.map((yaku, idx) => (
                  <li key={idx}>
                    {yaku.name} ({yaku.han}番)
                  </li>
                ))}
              </ul>
            </div>

            <div className="result-payment">
              <h4>支付:</h4>
              {result.isKeiten ? (
                <p className="payment-amount">0</p>
              ) : isTsumo ? (
                gameContext.playerWind === "east" ? (
                  <>
                    <p className="payment-amount">{result.dealer.tsumo} ALL</p>
                    {result.honba > 0 && (
                      <p className="payment-honba">
                        （含场供 {result.honba * 300}点，每家 +
                        {result.honba * 100}点）
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="payment-amount">
                      {result.nonDealer.tsumo.fromNonDealer} /{" "}
                      {result.nonDealer.tsumo.fromDealer}
                    </p>
                    {result.honba > 0 && (
                      <p className="payment-honba">
                        （子/亲，含场供 {result.honba * 300}点，每家 +
                        {result.honba * 100}点）
                      </p>
                    )}
                  </>
                )
              ) : (
                <>
                  <p className="payment-amount">
                    {gameContext.playerWind === "east"
                      ? result.dealer.ron
                      : result.nonDealer.ron}
                    点
                  </p>
                  {result.honba > 0 && (
                    <p className="payment-honba">
                      （含场供 +{result.honba * 300}点）
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 自定义设置弹窗 */}
      {showCustomModal && (
        <div
          className="modal-overlay"
          onMouseDown={() => setShowCustomModal(false)}
        >
          <div
            className="modal custom-modal"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="custom-modal-header">
              <h2>自定义设置</h2>
              <button
                className="modal-close-btn"
                onClick={() => setShowCustomModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="custom-modal-body">
              {/* 场况设置 */}
              <div className="custom-section">
                <h3>场况设置</h3>
                <div className="game-context">
                  <div className="context-item">
                    <label>场风:</label>
                    <select
                      value={gameContext.round}
                      onChange={(e) =>
                        setGameContext({
                          ...gameContext,
                          round: e.target.value as any,
                        })
                      }
                    >
                      <option value="east">东</option>
                      <option value="south">南</option>
                      <option value="west">西</option>
                    </select>
                  </div>

                  <div className="context-item">
                    <label>局数:</label>
                    <input
                      type="number"
                      min="1"
                      max="4"
                      value={gameContext.roundNumber}
                      onChange={(e) =>
                        setGameContext({
                          ...gameContext,
                          roundNumber: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>

                  <div className="context-item">
                    <label>自风:</label>
                    <select
                      value={gameContext.playerWind}
                      onChange={(e) =>
                        setGameContext({
                          ...gameContext,
                          playerWind: e.target.value as any,
                        })
                      }
                    >
                      <option value="east">东</option>
                      <option value="south">南</option>
                      <option value="west">西</option>
                      <option value="north">北</option>
                    </select>
                  </div>

                  <div className="context-item">
                    <label>
                      <input
                        type="checkbox"
                        checked={isTsumo}
                        onChange={(e) => setIsTsumo(e.target.checked)}
                      />
                      自摸
                    </label>
                  </div>

                  <div className="context-item">
                    <label>
                      <input
                        type="checkbox"
                        checked={gameContext.isRiichi}
                        onChange={(e) =>
                          setGameContext({
                            ...gameContext,
                            isRiichi: e.target.checked,
                          })
                        }
                      />
                      立直
                    </label>
                  </div>

                  <div className="context-item">
                    <label>
                      <input
                        type="checkbox"
                        checked={gameContext.isDoubleRiichi}
                        onChange={(e) =>
                          setGameContext({
                            ...gameContext,
                            isDoubleRiichi: e.target.checked,
                          })
                        }
                      />
                      两立直
                    </label>
                  </div>

                  <div className="context-item">
                    <label>
                      <input
                        type="checkbox"
                        checked={gameContext.isIppatsu}
                        onChange={(e) =>
                          setGameContext({
                            ...gameContext,
                            isIppatsu: e.target.checked,
                          })
                        }
                      />
                      一发
                    </label>
                  </div>

                  <div className="context-item">
                    <label>
                      <input
                        type="checkbox"
                        checked={gameContext.isHaitei}
                        onChange={(e) =>
                          setGameContext({
                            ...gameContext,
                            isHaitei: e.target.checked,
                          })
                        }
                      />
                      海底捞月
                    </label>
                  </div>

                  <div className="context-item">
                    <label>
                      <input
                        type="checkbox"
                        checked={gameContext.isHoutei}
                        onChange={(e) =>
                          setGameContext({
                            ...gameContext,
                            isHoutei: e.target.checked,
                          })
                        }
                      />
                      河底捞鱼
                    </label>
                  </div>

                  <div className="context-item">
                    <label>
                      <input
                        type="checkbox"
                        checked={gameContext.isRinshan}
                        onChange={(e) =>
                          setGameContext({
                            ...gameContext,
                            isRinshan: e.target.checked,
                          })
                        }
                      />
                      岭上开花
                    </label>
                  </div>

                  <div className="context-item">
                    <label>
                      <input
                        type="checkbox"
                        checked={gameContext.isChankan}
                        onChange={(e) =>
                          setGameContext({
                            ...gameContext,
                            isChankan: e.target.checked,
                          })
                        }
                      />
                      抢杠
                    </label>
                  </div>

                  <div className="context-item">
                    <label>本场数:</label>
                    <input
                      type="number"
                      min="0"
                      max="99"
                      value={gameContext.honba}
                      onChange={(e) =>
                        setGameContext({
                          ...gameContext,
                          honba: Math.max(0, parseInt(e.target.value) || 0),
                        })
                      }
                      style={{ width: "60px" }}
                    />
                  </div>
                </div>
              </div>

              {/* 宝牌与里宝牌 */}
              <div className="custom-section">
                <h3>宝牌与里宝牌</h3>
                <div className="dora-section">
                  <div className="dora-group">
                    <div className="dora-label">
                      <span className="dora-title">宝牌指示牌</span>
                      <span className="dora-hint">
                        （最多5张，输入单张后点击"翻开"）
                      </span>
                    </div>
                    <div className="dora-slots">
                      {[0, 1, 2, 3, 4].map((i) => {
                        if (i < gameContext.doraIndicators.length) {
                          return (
                            <div
                              key={i}
                              className="dora-slot dora-slot-active"
                              onClick={() => handleRemoveDora(i)}
                              title="点击移除"
                            >
                              <Tile
                                tile={gameContext.doraIndicators[i]}
                                size="small"
                              />
                            </div>
                          );
                        }
                        return (
                          <div key={i} className="dora-slot dora-slot-empty">
                            <Tile
                              tile={{ suit: "man", value: 1, id: -1 }}
                              size="small"
                              faceDown={true}
                            />
                          </div>
                        );
                      })}
                    </div>
                    <div className="dora-input-row">
                      <input
                        type="text"
                        value={doraInput}
                        onChange={(e) => setDoraInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddDora();
                        }}
                        placeholder="输入单张指示牌，如: 3m"
                        className="dora-input"
                      />
                      <button onClick={handleAddDora} className="dora-btn">
                        翻开
                      </button>
                    </div>
                  </div>

                  <div className="dora-group">
                    <div className="dora-label">
                      <span className="dora-title">里宝牌指示牌</span>
                      <span className="dora-hint">（立直时有效，最多5张）</span>
                    </div>
                    <div className="dora-slots">
                      {[0, 1, 2, 3, 4].map((i) => {
                        if (i < gameContext.uraDoraIndicators.length) {
                          return (
                            <div
                              key={i}
                              className="dora-slot dora-slot-active"
                              onClick={() => handleRemoveUraDora(i)}
                              title="点击移除"
                            >
                              <Tile
                                tile={gameContext.uraDoraIndicators[i]}
                                size="small"
                              />
                            </div>
                          );
                        }
                        return (
                          <div key={i} className="dora-slot dora-slot-empty">
                            <Tile
                              tile={{ suit: "man", value: 1, id: -1 }}
                              size="small"
                              faceDown={true}
                            />
                          </div>
                        );
                      })}
                    </div>
                    <div className="dora-input-row">
                      <input
                        type="text"
                        value={uraDoraInput}
                        onChange={(e) => setUraDoraInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddUraDora();
                        }}
                        placeholder="输入单张指示牌，如: 7z"
                        className="dora-input"
                      />
                      <button onClick={handleAddUraDora} className="dora-btn">
                        翻开
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 手牌输入 */}
              <div className="custom-section">
                <h3>
                  <span>手牌输入</span>
                  <span className="dora-hint">（请输入一副和牌的手牌）</span>
                </h3>

                <div className="hand-input-row">
                  <input
                    type="text"
                    value={handInput}
                    onChange={handleHandInputChange}
                    placeholder="输入手牌，如: 123m456p789s1122z1z (最后一张为和了牌)&#10;或带鸣牌: 234m567p c123m p111z 2z2z (鸣牌: c=吃 p=碰 k=明杠 a=暗杠 g=加杠)"
                    className="hand-input"
                  />
                </div>
                {(handTiles.length > 0 || melds.length > 0) && (
                  <div className="hand-area" style={{ marginTop: "12px" }}>
                    {handTiles.length > 0 && (
                      <Hand
                        tiles={handTiles}
                        winningTile={winningTile || undefined}
                        size="medium"
                      />
                    )}
                    {melds.length > 0 && <MeldsDisplay melds={melds} />}
                  </div>
                )}
              </div>
            </div>

            <div className="custom-modal-footer">
              <button
                onClick={() => setShowCustomModal(false)}
                className="action-btn"
              >
                完成
              </button>
            </div>
          </div>
        </div>
      )}

      <ReferenceModal
        isOpen={showReference}
        onClose={() => setShowReference(false)}
      />
    </div>
  );
};

export default PointCalc;
