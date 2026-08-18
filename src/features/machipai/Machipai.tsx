import React, { useEffect, useState } from "react";
import { useToast } from "../../components/Toast/ToastContext";
import Hand from "../../components/Hand/Hand";
import Tile from "../../components/Tile/Tile";
import {
  Tile as TileType,
  sortTiles,
  tilesToString,
  parseTileString,
  stringToTile,
} from "../../core/tile";
import "./Machipai.less";
import Header from "../../components/Header/Header";
import CustomModal from "../../components/Modal/CustomModal";
import {
  generateRandomMachipaiHand,
  getTenpaiDraws,
  MachipaiResult,
} from "../../core/machipai";
import KeypadInput from "../../components/Input/KeypadInput";

const Machipai: React.FC = () => {
  // const [handInput, setHandInput] = useState("");
  const [handTiles, setHandTiles] = useState<TileType[]>([]);
  // 计算结果
  const [machipaiResult, setMachipaiResult] = useState<MachipaiResult | null>(
    null,
  );
  const [answerTileTypeNum, setAnswerTileTypeNum] = useState<string>("");
  const [answerTileCountNum, setAnswerTileCountNum] = useState<string>("");
  const toast = useToast();

  const handleCheckAnswer = () => {
    if (handTiles.length !== 13) {
      toast.showToast("请先输入13张手牌", "error");
      return;
    }

    // 计算听牌并保存结果以便用户对比
    let result: MachipaiResult;
    try {
      result = getTenpaiDraws(tilesToString(handTiles));
      setMachipaiResult(result);
    } catch (err) {
      toast.showToast("计算失败：" + (err as Error).message, "error");
      return;
    }

    const typesCount = result.length;
    const sum = result.reduce((total, item) => {
      return total + item.remaining;
    }, 0);

    if (
      typesCount !== parseInt(answerTileTypeNum) ||
      sum !== parseInt(answerTileCountNum)
    ) {
      toast.showToast(
        `答案错误\n正确答案：${typesCount} 种 ${sum}张 张听牌`,
        "error",
      );
      return;
    } else {
      toast.showToast("答案正确！", "success");
    }
  };

  const handleReset = () => {
    setAnswerTileTypeNum("");
    setAnswerTileCountNum("");
  };

  const closeModal =
    (next: boolean = false) =>
    () => {
      setMachipaiResult(null);
      if (next) {
        handleGenerateHand();
      }
    };

  const handleGenerateHand = () => {
    const tilesStr = generateRandomMachipaiHand();
    const tiles = parseTileString(tilesStr);
    const sorted = sortTiles(tiles);
    setHandTiles(sorted);
    setAnswerTileTypeNum("");
    setAnswerTileCountNum("");
    setMachipaiResult(null);
  };

  useEffect(() => {
    handleGenerateHand();
  }, []);

  return (
    <div className="app-container">
      <Header
        title="待摸牌训练"
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
      <div className="app-main machipai">
        <section className="section">
          <div className="section-top">
            <div className="waiting-pick-hint">
              <span> 请填入可以使下方手牌听牌的进张一共有多少种？多少张？</span>
            </div>
            <div className="machipai-answer">
              <KeypadInput
                type="number"
                value={answerTileTypeNum}
                onChange={setAnswerTileTypeNum}
              />
              <span>种</span>
              <KeypadInput
                type="number"
                value={answerTileCountNum}
                onChange={setAnswerTileCountNum}
              />
              <span>张</span>
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
          isOpen={!!machipaiResult}
          onClose={closeModal()}
        >
          {machipaiResult ? (
            <div className="result">
              <div className="result-summary">
                <div>
                  {handTiles.length > 0 && (
                    <Hand tiles={handTiles} size="medium" />
                  )}
                </div>
                <div className="result-item">
                  <span className="label">听牌:</span>
                  <span className="value">{machipaiResult.length} 种</span>
                  <span className="value">
                    {machipaiResult.reduce((total, item) => {
                      return total + item.remaining;
                    }, 0)}{" "}
                    张
                  </span>
                </div>
              </div>
              <div className="waiting-tiles">
                <div className="tiles-display">
                  {machipaiResult.map((tile, idx) => {
                    const t = stringToTile(tile.tile);
                    if (t) return <Tile key={idx} tile={t} size="small" />;
                    return null;
                  })}
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
      </div>
    </div>
  );
};

export default Machipai;
