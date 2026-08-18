import React, { useEffect, useState } from "react";
import { useToast } from "../../components/Toast/ToastContext";
import Hand from "../../components/Hand/Hand";
import {
  Tile,
  TileSuit,
  TileValue,
  HonorType,
  sortTiles,
  createTile,
} from "../../core/tile";
import { calculateShanten, ShantenResult } from "../../core/shanten";
import "./Shanten.less";
import ShantenAlgorithmModal from "./ShantenAlgorithmModal";
import Header from "../../components/Header/Header";
import CustomModal from "../../components/Modal/CustomModal";
import { getKeys } from "../../utils/utils";

/**
 * 随机生成一副13张的手牌
 */
function generateRandomHand(): Tile[] {
  const counts: Record<string, number> = {};
  const tiles: Tile[] = [];
  let id = 0;

  const honorMap: Record<number, HonorType> = {
    1: "east",
    2: "south",
    3: "west",
    4: "north",
    5: "white",
    6: "green",
    7: "red",
  };

  while (tiles.length < 13) {
    // 随机花色：0=万, 1=筒, 2=索, 3=字
    const suitIdx = Math.floor(Math.random() * 4);
    let suit: TileSuit;
    let num: number;

    if (suitIdx < 3) {
      const suits: TileSuit[] = ["man", "pin", "sou"];
      suit = suits[suitIdx];
      num = Math.floor(Math.random() * 9) + 1; // 1-9
    } else {
      suit = "honor";
      num = Math.floor(Math.random() * 7) + 1; // 1-7
    }

    const key = `${suit}-${num}`;
    const currentCount = counts[key] || 0;

    // 每种牌最多4张
    if (currentCount < 4) {
      const value: TileValue | HonorType =
        suit === "honor" ? honorMap[num] : (num as TileValue);
      tiles.push(createTile(suit, value, id++));
      counts[key] = currentCount + 1;
    }
  }

  return tiles;
}

interface ShantenOption {
  value: number; // 向听数值（-1, 0, 1, 2, ..., 6）
  label: string;
}

const typeNames = {
  regular: "普通面子",
  chiitoitsu: "七对子",
  kokushi: "国士无双",
} as const;

const Shanten: React.FC = () => {
  // const [handInput, setHandInput] = useState("");
  const [handTiles, setHandTiles] = useState<Tile[]>([]);
  const [userAnswer, setUserAnswer] = useState<number | null>(null);
  const [result, setResult] = useState<ShantenResult | null>(null);
  const [showAlgorithmModal, setShowAlgorithmModal] = useState(false);
  const toast = useToast();

  // 答案选项：-1(已和了) / 0(听牌) / 1-6 向听
  const allOptions: ShantenOption[] = [
    { value: -1, label: "已和了" },
    { value: 0, label: "已听牌" },
    { value: 1, label: "1向听" },
    { value: 2, label: "2向听" },
    { value: 3, label: "3向听" },
    { value: 4, label: "4向听" },
    { value: 5, label: "5向听" },
    { value: 6, label: "6向听" },
  ];

  // 只有14张时显示"已和了"选项
  const options =
    handTiles.length === 14
      ? allOptions
      : allOptions.filter((o) => o.value !== -1);

  const getShantenDescription = (shanten: number): string => {
    if (shanten === -1) return "已和了";
    if (shanten === 0) return "听牌";
    return `${shanten}向听`;
  };

  // 判断是否为最终采用的向听数
  const isChosen = (value: number): boolean => {
    return result !== null && value === result.shanten;
  };

  // 检查答案
  const handleCheckAnswer = () => {
    // 必须先输入合法手牌
    if (handTiles.length !== 13 && handTiles.length !== 14) {
      toast.showToast("请先输入13或14张手牌", "error");
      return;
    }

    // 用户未选择答案
    if (userAnswer === null) {
      toast.showToast("请先选择答案", "error");
      return;
    }

    // 计算向听数，保存结果以便用户对比
    let shantenResult: ShantenResult;
    try {
      shantenResult = calculateShanten(handTiles);
      if (shantenResult.shanten === -2) {
        toast.showToast("手牌中包含大于4张的牌", "error");
        setResult(null);
        return;
      }
      setResult(shantenResult);
    } catch (err) {
      toast.showToast("计算失败：" + (err as Error).message, "error");
      return;
    }

    // 对比用户答案
    if (userAnswer === shantenResult.shanten) {
      toast.showToast("答案正确！", "success");
    } else {
      toast.showToast(
        `答案错误\n正确答案：${getShantenDescription(shantenResult.shanten)}`,
        "error",
      );
    }
  };

  const handleReset = () => {
    setUserAnswer(null);
  };

  const closeModal =
    (next: boolean = false) =>
    () => {
      setResult(null);
      if (next) {
        setUserAnswer(null);
        handleGenerateHand();
      }
    };

  const handleGenerateHand = () => {
    const tiles = generateRandomHand();
    const sorted = sortTiles(tiles);
    // const handStr = tilesToString(sorted);
    // setHandInput(handStr);
    setHandTiles(sorted);
    setUserAnswer(null);
    setResult(null);
  };

  useEffect(() => {
    handleGenerateHand();
  }, []);

  return (
    <div className="app-container">
      <Header
        title="向听数训练"
        backable
        actions={
          <>
            <img
              src="./images/info.png"
              className="info"
              alt="报点参考"
              title="报点参考"
              onClick={() => setShowAlgorithmModal(true)}
            />
            <img
              src="./images/random.png"
              className="random"
              alt="随机手牌"
              title="随机手牌"
              onClick={handleGenerateHand}
            />
          </>
        }
      />
      <div className="app-main shanten">
        <section className="section">
          <div className="section-top">
            <div className="tips">请选择下方手牌的向听数：</div>
            <div className="answer">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  className={`btn ${userAnswer === opt.value ? "btn-primary" : ""}`}
                  onClick={() => setUserAnswer(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
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
        <CustomModal title="计算结果" isOpen={!!result} onClose={closeModal()}>
          {result ? (
            <div className="result">
              <div className="result-summary final-shanten">
                <div className="result-item">
                  <span className="label">最终向听数:</span>
                  <span className="value final-value">
                    {getShantenDescription(result.shanten)}
                  </span>
                </div>
              </div>
              <div className="shanten-types">
                <div className="shanten-type-list">
                  {getKeys(typeNames).map((key) => (
                    <div
                      key={key}
                      className={`shanten-type-item ${isChosen(result[key]) ? "chosen" : ""}`}
                    >
                      <div className="type-name">{typeNames[key]}</div>
                      <div className="type-value">
                        {getShantenDescription(result[key])}
                      </div>
                      {isChosen(result[key]) && (
                        <span className="chosen-badge">采用</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <button
                  className="button next"
                  onClick={closeModal(true)}
                ></button>
              </div>
            </div>
          ) : null}
        </CustomModal>
        <ShantenAlgorithmModal
          isOpen={showAlgorithmModal}
          onClose={() => setShowAlgorithmModal(false)}
        />
      </div>
    </div>
  );
};

export default Shanten;
