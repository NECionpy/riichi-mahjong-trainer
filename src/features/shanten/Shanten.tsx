import React, { useEffect, useState } from "react";
import { useToast } from "../../components/Toast/ToastContext";
import Hand from "../../components/Hand/Hand";
import {
  parseTileString,
  Tile,
  TileSuit,
  TileValue,
  HonorType,
  sortTiles,
  createTile,
  tilesToString,
} from "../../core/tile";
import { calculateShanten, ShantenResult } from "../../core/shanten";
import "./Shanten.css";
import ShantenAlgorithmModal from "./ShantenAlgorithmModal";

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

const Shanten: React.FC = () => {
  const [handInput, setHandInput] = useState("");
  const [handTiles, setHandTiles] = useState<Tile[]>([]);
  const [userAnswer, setUserAnswer] = useState<number | null>(null);
  const [result, setResult] = useState<ShantenResult | null>(null);
  const [error, setError] = useState("");
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

  const handleHandInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setHandInput(value);
    // 手牌变化时清空用户答案和计算结果
    setUserAnswer(null);
    setResult(null);

    try {
      if (value) {
        const tiles = parseTileString(value);
        const sorted = sortTiles(tiles);
        // 手牌数量检查：必须是13或14张
        if (sorted.length !== 13 && sorted.length !== 14) {
          setHandTiles([]);
          setError(`手牌数量必须为13或14张，当前为${sorted.length}张`);
        } else {
          setHandTiles(sorted);
          setError("");
        }
      } else {
        setHandTiles([]);
        setError("");
      }
    } catch (err) {
      setHandTiles([]);
      setError('牌格式不正确，请使用如 "123m456p789s12z" 的格式');
    }
  };

  const handleCalculate = () => {
    if (handTiles.length !== 13 && handTiles.length !== 14) {
      toast.showToast("请先输入13或14张手牌", "error");
      return;
    }

    try {
      const shantenResult = calculateShanten(handTiles);
      if (shantenResult.shanten === -2) {
        toast.showToast("手牌中包含大于4张的牌", "error");
        setResult(null);
        return;
      }
      setResult(shantenResult);
      setError("");
    } catch (err) {
      setError("计算失败：" + (err as Error).message);
    }
  };

  const getShantenDescription = (shanten: number): string => {
    if (shanten === -1) return "已和了";
    if (shanten === 0) return "听牌";
    return `${shanten}向听`;
  };

  // 判断是否为最终采用的向听数
  const isChosen = (value: number): boolean => {
    return result !== null && value === result.shanten;
  };

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
      setError("");
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
    setError("");
  };

  const handleGenerateHand = () => {
    const tiles = generateRandomHand();
    const sorted = sortTiles(tiles);
    const handStr = tilesToString(sorted);
    setHandInput(handStr);
    setHandTiles(sorted);
    setUserAnswer(null);
    setResult(null);
    setError("");
  };

  useEffect(() => {
    handleGenerateHand()
  }, []);

  return (
    <div className="shanten">
      <div className="header">
        <h2>向听数模拟器</h2>
        <div className="header-buttons">
          <button className="ref-btn" onClick={() => setShowAlgorithmModal(true)}>
            📖 算法参考
          </button>      
        </div>
      </div>

      <div className="section">
        <h3>手牌输入</h3>
        <div className="hand-input-row">
          <input
            type="text"
            value={handInput}
            onChange={handleHandInputChange}
            placeholder="输入手牌，如: 123m456p789s12z (13或14张牌)"
            className="hand-input"
          />
          <button
            onClick={handleGenerateHand}
            className="action-btn generate-btn"
          >
            🎲 生成手牌
          </button>
        </div>
        {handTiles.length > 0 && <Hand tiles={handTiles} size="medium" />}
        <div className="tile-count">当前牌数: {handTiles.length} 张</div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="section">
        <h3>向听数推断</h3>
        <div className="answer-options">
          {options.map((opt) => (
            <label
              key={opt.value}
              className={`answer-option ${userAnswer === opt.value ? "selected" : ""}`}
            >
              <input
                type="radio"
                name="shanten-answer"
                value={opt.value}
                checked={userAnswer === opt.value}
                onChange={() => setUserAnswer(opt.value)}
              />
              <span className="option-label">{opt.label}</span>
            </label>
          ))}
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
          计算向听数
        </button>

        {result && (
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
              <h4>各牌形向听数</h4>
              <div className="shanten-type-list">
                <div
                  className={`shanten-type-item ${isChosen(result.regular) ? "chosen" : ""}`}
                >
                  <div className="type-name">普通面子</div>
                  <div className="type-value">
                    {getShantenDescription(result.regular)}
                  </div>
                  {isChosen(result.regular) && (
                    <span className="chosen-badge">采用</span>
                  )}
                </div>
                <div
                  className={`shanten-type-item ${isChosen(result.chiitoitsu) ? "chosen" : ""}`}
                >
                  <div className="type-name">七对子</div>
                  <div className="type-value">
                    {getShantenDescription(result.chiitoitsu)}
                  </div>
                  {isChosen(result.chiitoitsu) && (
                    <span className="chosen-badge">采用</span>
                  )}
                </div>
                <div
                  className={`shanten-type-item ${isChosen(result.kokushi) ? "chosen" : ""}`}
                >
                  <div className="type-name">国士无双</div>
                  <div className="type-value">
                    {getShantenDescription(result.kokushi)}
                  </div>
                  {isChosen(result.kokushi) && (
                    <span className="chosen-badge">采用</span>
                  )}
                </div>
              </div>
              <div className="shanten-note">
                最终向听数为三种牌形向听数中的最小值
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="section info-section">
        <h3>说明</h3>
        <ul>
          <li>
            <strong>手牌要求</strong>: 必须是13或14张牌，模拟正常的手牌进张
          </li>
          <li>
            <strong>普通面子向听数</strong>: 组成四面子一雀头牌型的向听数
          </li>
          <li>
            <strong>七对子向听数</strong>: 组成七对子牌型的向听数
          </li>
          <li>
            <strong>国士无双向听数</strong>: 组成国士无双牌型的向听数
          </li>
          <li>
            <strong>向听数有什么用？</strong>:
            向听数是麻将中衡量“进攻距离”的尺子。
          </li>
        </ul>
      </div>
      <ShantenAlgorithmModal isOpen={showAlgorithmModal} onClose={() => setShowAlgorithmModal(false)} />
    </div>
  );
};

export default Shanten;
