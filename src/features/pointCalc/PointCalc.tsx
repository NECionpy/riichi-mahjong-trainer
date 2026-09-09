import React, { useEffect, useState } from "react";
import { useToast } from "../../components/Toast/ToastContext";
import Tile from "../../components/Tile/Tile";
import {
  parseHandString,
  Tile as TileType,
  sortTiles,
  Meld,
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
import RichHand from "../../components/RichHand/RichHand";
import KeypadInput from "../../components/Input/KeypadInput";
import { generateFallbackHand, generateRandomGame } from "../../core/pointCalc";

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
    // setHandInput('k1111zk2222zk3333zk4444z55z');
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
                            dir="out"
                          />
                        );
                      }
                      return (
                        <Tile
                          key={i}
                          tile={{ suit: "man", value: 1, id: -1 }}
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
                              dir="out"
                            />
                          );
                        }
                        return (
                          <Tile
                            key={i}
                            tile={{ suit: "man", value: 1, id: -1 }}
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
          minWidth="1000px"
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
                <div>
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
                <button
                  className="button next"
                  onClick={closeResult(true)}
                ></button>
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
