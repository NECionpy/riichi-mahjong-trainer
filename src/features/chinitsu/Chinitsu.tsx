import React, { useEffect, useRef, useState } from "react";
import { useToast } from "../../components/Toast/ToastContext";
import Hand from "../../components/Hand/Hand";
import Tile from "../../components/Tile/Tile";
import {
  Tile as TileType,
  TileSuit,
  TileValue,
  sortTiles,
  createTile,
} from "../../core/tile";
import { detectWait, WaitResult } from "../../core/wait";
import "./Chinitsu.less";
import Header from "../../components/Header/Header";
import CustomModal from "../../components/Modal/CustomModal";
import { randomInt } from "../../utils/utils";

/**
 * 随机生成一副已听牌的清一色手牌（13张）
 */
function generateRandomChinitsuHand(suitTypeIndex: number): TileType[] {
  const suits: TileSuit[] = ["man", "pin", "sou"];
  const suit = suits[suitTypeIndex];
  let tiles: number[] = [];
  let valid = false;
  let attempts = 0;

  while (!valid && attempts < 100) {
    attempts++;
    tiles = [];
    const counts = new Array(10).fill(0); // index 1-9

    // 生成4个面子
    for (let i = 0; i < 4; i++) {
      const isSequence = Math.random() < 0.6; // 60%概率生成顺子

      if (isSequence) {
        const start = Math.floor(Math.random() * 7) + 1; // 1-7
        tiles.push(start, start + 1, start + 2);
        counts[start]++;
        counts[start + 1]++;
        counts[start + 2]++;
      } else {
        const num = Math.floor(Math.random() * 9) + 1; // 1-9
        tiles.push(num, num, num);
        counts[num] += 3;
      }
    }

    // 生成雀头
    const pairNum = Math.floor(Math.random() * 9) + 1;
    tiles.push(pairNum, pairNum);
    counts[pairNum] += 2;

    // 检查每种牌不超过4张
    valid = counts.every((c) => c <= 4);
  }

  // 转换为 Tile 对象
  let id = 0;
  const tileObjects = tiles.map((n) => createTile(suit, n as TileValue, id++));

  // 随机移除一张牌，使其变为听牌状态
  const removeIdx = Math.floor(Math.random() * tileObjects.length);
  tileObjects.splice(removeIdx, 1);

  return tileObjects;
}

const tileKey = (t: TileType) => `${t.suit}-${t.value}`;

const Chinitsu: React.FC = () => {
  // const [handInput, setHandInput] = useState("");
  const [handTiles, setHandTiles] = useState<TileType[]>([]);
  // 用户选择的"听牌"集合（以 suit-value 为 key）
  const [userWaitTiles, setUserWaitTiles] = useState<Set<string>>(new Set());
  // 计算结果
  const [waitResult, setWaitResult] = useState<WaitResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const suitTypeIndex = useRef(randomInt(3));
  const toast = useToast();

  // 根据手牌花色生成 1-9 的候选牌
  const handSuit: TileSuit | null =
    handTiles.length > 0 ? handTiles[0].suit : null;
  const candidateTiles: TileType[] =
    handSuit && handSuit !== "honor"
      ? Array.from({ length: 9 }, (_, i) =>
          createTile(handSuit, (i + 1) as TileValue, 0),
        )
      : [];

  const handleToggleWaitTile = (tile: TileType) => {
    if (showResult) return; // 已显示结果后禁止修改
    setUserWaitTiles((prev) => {
      const next = new Set(prev);
      const key = tileKey(tile);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleCheckAnswer = () => {
    if (handTiles.length !== 13) {
      toast.showToast("请先输入13张手牌", "error");
      return;
    }

    // 检查是否为清一色
    const suits = new Set(handTiles.map((t) => t.suit));
    if (suits.size !== 1 || handTiles[0].suit === "honor") {
      toast.showToast("手牌必须是清一色", "error");
      return;
    }

    // 计算听牌并保存结果以便用户对比
    let result: WaitResult;
    try {
      result = detectWait(handTiles);
      setWaitResult(result);
      setShowResult(true);
    } catch (err) {
      toast.showToast("计算失败：" + (err as Error).message, "error");
      return;
    }

    if (!result.isTenpai) {
      toast.showToast("手牌未听牌", "error");
      return;
    }

    // 对比用户选择与计算结果
    const correctKeys = new Set(result.waitingTiles.map((t) => tileKey(t)));
    const userKeys = userWaitTiles;

    if (userKeys.size !== correctKeys.size) {
      toast.showToast(
        `答案错误\n正确答案：${result.waitingTiles.length} 种听牌`,
        "error",
      );
      return;
    }

    let allMatch = true;
    for (const k of correctKeys) {
      if (!userKeys.has(k)) {
        allMatch = false;
        break;
      }
    }

    if (allMatch) {
      toast.showToast("答案正确！", "success");
    } else {
      toast.showToast(
        `答案错误\n正确答案：${result.waitingTiles.length} 种听牌`,
        "error",
      );
    }
  };

  const handleReset = () => {
    setUserWaitTiles(new Set());
    setShowResult(false);
  };

  const closeModal =
    (next: boolean = false) =>
    () => {
      setShowResult(false);
      setWaitResult(null);
      if (next) {
        setUserWaitTiles(new Set());
        handleGenerateHand();
      }
    };

  const handleGenerateHand = () => {
     suitTypeIndex.current =
      suitTypeIndex.current >= 2 ? 0 : suitTypeIndex.current! + 1;
    const tiles = generateRandomChinitsuHand(suitTypeIndex.current);
    const sorted = sortTiles(tiles);
    // const handStr = tilesToString(sorted);
    // setHandInput(handStr);
    setHandTiles(sorted);
    setUserWaitTiles(new Set());
    setWaitResult(null);
    setShowResult(false);
  };

  useEffect(() => {
    handleGenerateHand();
  }, []);

  return (
    <div className="app-container">
      <Header
        title="清一色听牌训练"
        backable
        actions={
          <img
            src="./images/random.png"
            className="random"
            alt="随机手牌"
            title="随机手牌"
            onClick={handleGenerateHand}
          />
        }
      />
      <div className="app-main chinitsu">
        <section className="section">
          <div className="section-top">
            <div className="waiting-pick-hint">
              <span> 请从下方候选牌中点击选择听牌（可多选）：</span>
              <strong> 已选择 {userWaitTiles.size} 种</strong>
            </div>
            <div className="candidate-tiles">
              {candidateTiles.map((tile) => {
                const isSelected = userWaitTiles.has(tileKey(tile));
                return (
                  <Tile
                    key={tileKey(tile)}
                    tile={tile}
                    size="medium"
                    highlighted={isSelected}
                    onClick={() => handleToggleWaitTile(tile)}
                  />
                );
              })}
            </div>
            <div className="actions">
              <button
                className="button submit"
                onClick={handleCheckAnswer}
              ></button>
              <button className="button reset" onClick={handleReset}></button>
            </div>
          </div>

          {handTiles.length > 0 && <Hand tiles={handTiles} size="medium" />}
        </section>

        <CustomModal
          title="计算结果"
          isOpen={!!waitResult}
          onClose={closeModal()}
        >
          {waitResult ? (
            <div className="result">
              {!waitResult.isTenpai ? (
                <div className="result-item">
                  <span className="label">手牌未听牌</span>
                </div>
              ) : (
                <>
                  <div>
                    {handTiles.length > 0 && (
                      <Hand tiles={handTiles} size="medium" />
                    )}
                  </div>
                  <div className="result-summary">
                    <div className="result-item">
                      <span className="label">听牌数:</span>
                      <span className="value">
                        {waitResult.waitingTiles.length} 种
                      </span>
                    </div>
                  </div>
                  <div className="waiting-tiles">
                    <div className="tiles-display">
                      {waitResult.waitingTiles.map((tile, idx) => (
                        <Tile key={idx} tile={tile} size="small" />
                      ))}
                    </div>
                  </div>
                  <div className="next-row">
                    <button
                      className="button next"
                      onClick={closeModal(true)}
                    ></button>
                  </div>
                </>
              )}
            </div>
          ) : null}
        </CustomModal>
      </div>
    </div>
  );
};

export default Chinitsu;
