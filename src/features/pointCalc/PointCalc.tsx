import React, { useEffect, useState } from "react";
import { useToast } from "../../components/Toast/ToastContext";
import Tile from "../../components/Tile/Tile";
import {
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
import {
  calculateScore,
  GameContext,
  getBasePointsName,
  ScoringResult,
} from "../../core/scoring";
import ReferenceModal from "./ReferenceModal";
import "./PointCalc.less";
import Header from "../../components/Header/Header";
import CustomModal from "../../components/Modal/CustomModal";
import { shuffleFisherYates } from "../../utils/utils";
import RichHand from "../../components/RichHand/RichHand";
import KeypadInput from "../../components/Input/KeypadInput";

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
    else if (r < 0.3 && !isMenzen) isChankan = true; // 立直时不能抢杠（抢杠需要加杠=明杠）
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

function getWindName(
  wind: "east" | "south" | "west" | "north",
): "东" | "南" | "西" | "北" {
  switch (wind) {
    case "east":
      return "东";
    case "south":
      return "南";
    case "west":
      return "西";
    default:
      return "北";
  }
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

  const [paymentAnswer, setPaymentAnswer] = useState("");

  const [result, setResult] = useState<ScoringResult | null>(null);
  const [showAnswerRulesModal, setShowAnswerRulesModal] = useState(false);
  const toast = useToast();
  const [showReference, setShowReference] = useState(false);

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
        toast.showToast(
          `牌 ${tileName} 出现了 ${count} 张，超过了4张`,
          "error",
        );
        return false;
      }
    }
    return true;
  };

  // 检查答案
  const handleCheckAnswer = () => {
    // 先执行计算得分
    if (handTiles.length === 0 || !winningTile) {
      toast.showToast("请输入完整的手牌", "error");
      return;
    }

    try {
      const hand = parseHand(handInput, isTsumo);
      if (!checkHandValidity(hand, gameContext)) {
        return;
      }
      const score = calculateScore(hand, gameContext);
      setResult(score);

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
      toast.showToast("计算失败：" + (err as Error).message, "error");
    }
  };

  const closeResult =
    (next: boolean = false) =>
    () => {
      setResult(null);
      if (next) {
        handleGenerateGame();
      }
    };

  // 尽可能获取有效手牌
  const getEffectiveGame = (): {
    handInput: string;
    gameContext: GameContext;
    isTsumo: boolean;
  } => {
    let generated = generateFallbackHand();
    for (let index = 0; index < 5; index++) {
      generated = generateRandomGame();
      const hand = parseHand(generated.handInput, generated.isTsumo);
      const score = calculateScore(hand, generated.gameContext);
      if (!score.isKeiten) return generated;
    }
    return generated;
  };

  const handleGenerateGame = () => {
    const generated = getEffectiveGame();

    setHandInput(generated.handInput);
    const parsed = parseHandString(generated.handInput);
    setHandTiles(sortTiles(parsed.handTiles));
    setWinningTile(parsed.winTile);
    setMelds(parsed.melds);
    setIsTsumo(generated.isTsumo);
    setGameContext(generated.gameContext);
    setPaymentAnswer("");
    setResult(null);
  };

  const handleReset = () => {
    setPaymentAnswer("");
  };

  useEffect(() => {
    handleGenerateGame();
  }, []);

  return (
    <div className="app-container">
      <Header
        title="报点训练"
        backable
        actions={
          <>
            <img
              src="./images/info.png"
              className="info"
              alt="报点参考"
              title="报点参考"
              onClick={() => setShowReference(true)}
            />
            <img
              src="./images/random.png"
              className="random"
              alt="随机手牌"
              title="随机手牌"
              onClick={handleGenerateGame}
            />
          </>
        }
      />
      <div className="app-main point-calc">
        {(handTiles.length > 0 || melds.length > 0) && (
          <div className="table-area">
            <div className="table-top">
              {/* 场况展示栏 */}
              <div className="game-info-bar">
                <div className="tags-container">
                  {(() => {
                    const roundName = getWindName(gameContext.round);
                    const windName = getWindName(gameContext.playerWind);
                    const tags: string[] = [];
                    tags.push(`${roundName}场 ${windName}家`);
                    tags.push(`${gameContext.honba} 本场`);
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
                  <span
                    className={`game-info-tag ${isTsumo ? "tsumo" : "ron"}`}
                  >
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
                          <Tile
                            key={i}
                            tile={gameContext.doraIndicators[i]}
                            size="small"
                            dir="out"
                          />
                        );
                      }
                      return (
                        <Tile
                          key={i}
                          tile={{ suit: "man", value: 1, id: -1 }}
                          size="small"
                          dir="out"
                          faceDown={true}
                        />
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
                            <Tile
                              key={i}
                              tile={gameContext.uraDoraIndicators[i]}
                              size="small"
                              dir="out"
                            />
                          );
                        }
                        return (
                          <Tile
                            key={i}
                            tile={{ suit: "man", value: 1, id: -1 }}
                            size="small"
                            dir="out"
                            faceDown={true}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="table-bottom">
              <div className="answer-item">
                <label>支付报点 :</label>
                <KeypadInput
                  type="text"
                  value={paymentAnswer}
                  onChange={setPaymentAnswer}
                  placeholder="如: 500/1000、8000、2000ALL"
                />
                <button
                  className="button reminder"
                  onClick={() => setShowAnswerRulesModal(true)}
                ></button>
                <button
                  className="button submit"
                  onClick={handleCheckAnswer}
                ></button>

                <button className="button reset" onClick={handleReset}></button>
              </div>

              {/* 手牌展示区 */}
              <div className="hand-area">
                <RichHand tilesStr={handInput} />
              </div>
            </div>
          </div>
        )}

        <CustomModal
          title="报点说明"
          isOpen={showAnswerRulesModal}
          onClose={() => setShowAnswerRulesModal(false)}
        >
          <div className="answer-rules-info">
            <div>宝牌区域显示的为宝牌指示牌</div>
            <div>报点需要考虑当前本场数</div>
            <div>如果不能和牌(形听/炸和)，支付报点为0</div>
          </div>
        </CustomModal>
        {/* 计算结果 */}
        <CustomModal
          title="计算结果"
          isOpen={!!result}
          onClose={closeResult(false)}
        >
          {result && (
            <div className="result">
              <div className="result-summary">
                <div>
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
                  <div className="result-item">
                    <span className="label">报点:</span>
                    <span className="value">
                      {result.isKeiten
                        ? 0
                        : isTsumo
                          ? gameContext.playerWind === "east"
                            ? `${result.dealer.tsumo} ALL `
                            : `${result.nonDealer.tsumo.fromNonDealer} / ${result.nonDealer.tsumo.fromDealer}`
                          : `${gameContext.playerWind === "east" ? result.dealer.ron : result.nonDealer.ron}`}
                    </span>
                  </div>
                </div>
                <div>
                  <button
                    className="button next"
                    onClick={closeResult(true)}
                  ></button>
                </div>
              </div>
              {result.isKeiten ? (
                <div className="result-keiten">
                  ⚠️ 形听（形式听牌）：没有正式役种，无法和牌
                </div>
              ) : (
                <div className="result-details">
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
                              <span className="fu-breakdown-label">
                                {item.label}
                              </span>
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
                    <div className="points-name">
                      {getBasePointsName(result.points)}
                    </div>
                  </div>
                </div>
              )}

              <div className="result-payment">
                <h4>支付:</h4>
                {result.isKeiten ? (
                  <p className="payment-amount">0</p>
                ) : isTsumo ? (
                  gameContext.playerWind === "east" ? (
                    <>
                      <p className="payment-amount">
                        {result.dealer.tsumo} ALL
                      </p>
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
        </CustomModal>
        {/* 报点参考 */}
        <ReferenceModal
          isOpen={showReference}
          onClose={() => setShowReference(false)}
        />
      </div>
    </div>
  );
};

export default PointCalc;
