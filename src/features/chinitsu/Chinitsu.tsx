import React, { useEffect, useState } from 'react';
import { useToast } from '../../components/Toast/ToastContext';
import Hand from '../../components/Hand/Hand';
import Tile from '../../components/Tile/Tile';
import { parseTileString, Tile as TileType, TileSuit, TileValue, sortTiles, createTile, tilesToString } from '../../core/tile';
import { detectWait, WaitResult } from '../../core/wait';
import './Chinitsu.css';

/**
 * 随机生成一副已听牌的清一色手牌（13张）
 */
function generateRandomChinitsuHand(): TileType[] {
  const suits: TileSuit[] = ['man', 'pin', 'sou'];
  const suit = suits[Math.floor(Math.random() * 3)];

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
    valid = counts.every(c => c <= 4);
  }

  // 转换为 Tile 对象
  let id = 0;
  const tileObjects = tiles.map(n => createTile(suit, n as TileValue, id++));

  // 随机移除一张牌，使其变为听牌状态
  const removeIdx = Math.floor(Math.random() * tileObjects.length);
  tileObjects.splice(removeIdx, 1);

  return tileObjects;
}

const tileKey = (t: TileType) => `${t.suit}-${t.value}`;

const Chinitsu: React.FC = () => {
  const [handInput, setHandInput] = useState('');
  const [handTiles, setHandTiles] = useState<TileType[]>([]);
  // 用户选择的"听牌"集合（以 suit-value 为 key）
  const [userWaitTiles, setUserWaitTiles] = useState<Set<string>>(new Set());
  // 计算结果
  const [waitResult, setWaitResult] = useState<WaitResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  // 根据手牌花色生成 1-9 的候选牌
  const handSuit: TileSuit | null = handTiles.length > 0 ? handTiles[0].suit : null;
  const candidateTiles: TileType[] = handSuit && handSuit !== 'honor'
    ? Array.from({ length: 9 }, (_, i) => createTile(handSuit, (i + 1) as TileValue, 0))
    : [];

  const handleHandInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setHandInput(value);

    // 手牌变化时清空用户选择和结果
    setUserWaitTiles(new Set());
    setWaitResult(null);
    setShowResult(false);

    try {
      if (value) {
        const tiles = parseTileString(value);
        setHandTiles(sortTiles(tiles));
        setError('');
      } else {
        setHandTiles([]);
      }
    } catch (err) {
      setHandTiles([]);
      setError('牌格式不正确，请使用如 "1112345678999m" 的格式');
    }
  };

  const handleCalculate = () => {
    if (handTiles.length === 0) {
      setError('请输入手牌');
      return;
    }

    // 检查是否为清一色
    const suits = new Set(handTiles.map(t => t.suit));
    if (suits.size !== 1 || handTiles[0].suit === 'honor') {
      setError('手牌必须是清一色（只有一种花色）');
      return;
    }

    // 检查牌数
    if (handTiles.length !== 13) {
      setError('手牌必须是13张');
      return;
    }

    try {
      const result = detectWait(handTiles);
      setWaitResult(result);
      setShowResult(true);
      setError('');
    } catch (err) {
      setError('计算失败：' + (err as Error).message);
    }
  };

  const handleToggleWaitTile = (tile: TileType) => {
    if (showResult) return; // 已显示结果后禁止修改
    setUserWaitTiles(prev => {
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
      toast.showToast('请先输入13张手牌', 'error');
      return;
    }

    // 检查是否为清一色
    const suits = new Set(handTiles.map(t => t.suit));
    if (suits.size !== 1 || handTiles[0].suit === 'honor') {
      toast.showToast('手牌必须是清一色', 'error');
      return;
    }

    // 计算听牌并保存结果以便用户对比
    let result: WaitResult;
    try {
      result = detectWait(handTiles);
      setWaitResult(result);
      setShowResult(true);
      setError('');
    } catch (err) {
      toast.showToast('计算失败：' + (err as Error).message, 'error');
      return;
    }

    if (!result.isTenpai) {
      toast.showToast('手牌未听牌', 'error');
      return;
    }

    // 对比用户选择与计算结果
    const correctKeys = new Set(result.waitingTiles.map(t => tileKey(t)));
    const userKeys = userWaitTiles;

    if (userKeys.size !== correctKeys.size) {
      toast.showToast(`答案错误\n正确答案：${result.waitingTiles.length} 张听牌`, 'error');
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
      toast.showToast('答案正确！', 'success');
    } else {
      toast.showToast(`答案错误\n正确答案：${result.waitingTiles.length} 张听牌`, 'error');
    }
  };

  const handleReset = () => {
    setUserWaitTiles(new Set());   
    setShowResult(false);
    setError('');
  };

  const handleGenerateHand = () => {
    const tiles = generateRandomChinitsuHand();
    const sorted = sortTiles(tiles);
    const handStr = tilesToString(sorted);
    setHandInput(handStr);
    setHandTiles(sorted);
    setUserWaitTiles(new Set());
    setWaitResult(null);
    setShowResult(false);
    setError('');
  };

  useEffect(() => {
    handleGenerateHand();
  }, []);

  return (
    <div className="chinitsu">
      <h2>清一色听牌模拟器</h2>

      <div className="section">
        <h3>手牌输入</h3>
        <div className="hand-input-row">
          <input
            type="text"
            value={handInput}
            onChange={handleHandInputChange}
            placeholder="输入清一色手牌，如: 1112345678999m (13张牌)"
            className="hand-input"
          />
          <button onClick={handleGenerateHand} className="action-btn generate-btn">
            🎲 生成手牌
          </button>
        </div>
        {handTiles.length > 0 && (
          <Hand tiles={handTiles} size="medium" />
        )}
        <div className="tile-count">
          当前牌数: {handTiles.length} 张
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="section">
        <h3>听牌推断</h3>
        <div className="waiting-pick-hint">
          请从下方候选牌中点击选择听牌（可多选）：
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
        <div className="selected-count">
          已选择：{userWaitTiles.size} 张
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
          计算听牌
        </button>

        {showResult && waitResult && (
          <div className="result">
            {!waitResult.isTenpai ? (
              <div className="result-item">
                <span className="label">手牌未听牌</span>
              </div>
            ) : (
              <>
                <div className="result-summary">
                  <div className="result-item">
                    <span className="label">听牌数:</span>
                    <span className="value">{waitResult.waitingTiles.length} 张</span>
                  </div>
                </div>
                <div className="waiting-tiles">
                  <h4>听的牌:</h4>
                  <div className="tiles-display">
                    {waitResult.waitingTiles.map((tile, idx) => (
                      <Tile key={idx} tile={tile} size="medium" />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="section info-section">
        <h3>说明</h3>
        <ul>
          <li>清一色：手牌只有一种花色（万、筒或索）</li>
          <li>输入必须是13张牌</li>
          <li>手牌必须处于听牌状态</li>
          <li>从下方候选牌中点击选择你认为的听牌，可多选</li>
          <li>按"检查答案"会显示计算结果并对比</li>
        </ul>
      </div>
    </div>
  );
};

export default Chinitsu;
