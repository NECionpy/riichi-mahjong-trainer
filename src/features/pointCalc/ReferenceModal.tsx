import React, { useState, useMemo } from "react";
import {
  generateDealerTable,
  generateNonDealerTable,
  yakuChart,
} from "./referenceData";
import "./ReferenceModal.less";
import CustomModal from "../../components/Modal/CustomModal";
import RichHand from "../../components/RichHand/RichHand";

type TabKey = "fu" | "dealer" | "nonDealer" | "yaku" | "formula";

interface Tab {
  key: TabKey;
  label: string;
}

const tabs: Tab[] = [
  { key: "fu", label: "符数表" },
  { key: "dealer", label: "庄家点数表" },
  { key: "nonDealer", label: "闲家点数表" },
  { key: "yaku", label: "役种图谱" },
  { key: "formula", label: "计算公式" },
];

interface ReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ReferenceModal: React.FC<ReferenceModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabKey>("fu");

  const dealerTable = useMemo(() => generateDealerTable(), []);
  const nonDealerTable = useMemo(() => generateNonDealerTable(), []);

  if (!isOpen) return null;

  const renderFuTable = () => (
    <div className="ref-fu-table">
      <div className="ref-fu-section">
        <h4 className="ref-fu-section-title">底符（基本符）</h4>
        <table className="ref-table">
          <thead>
            <tr>
              <th>种类</th>
              <th>条件</th>
              <th>符数</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>基本符</td>
              <td>和牌</td>
              <td className="ref-fu-value">20</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="ref-fu-section">
        <h4 className="ref-fu-section-title">面子（メンツ）</h4>
        <table className="ref-table">
          <thead>
            <tr>
              <th>种类</th>
              <th>中张牌（2-8）</th>
              <th>幺九牌（1/9/字）</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>明刻</td>
              <td>2</td>
              <td>4</td>
            </tr>
            <tr>
              <td>暗刻</td>
              <td>4</td>
              <td>8</td>
            </tr>

            <tr>
              <td>明杠</td>
              <td>8</td>
              <td>16</td>
            </tr>

            <tr>
              <td>暗杠</td>
              <td>16</td>
              <td>32</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="ref-fu-section">
        <h4 className="ref-fu-section-title">雀头（アタマ）</h4>
        <table className="ref-table">
          <thead>
            <tr>
              <th>种类</th>
              <th>条件</th>
              <th>符数</th>
              <th>备注</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>役牌</td>
              <td>场风 / 自风 / 三元牌</td>
              <td className="ref-fu-value">2</td>
              <td></td>
            </tr>
            <tr>
              <td>连风</td>
              <td>场风 = 自风（双风）</td>
              <td className="ref-fu-value">4</td>
              <td>即 2+2</td>
            </tr>            
          </tbody>
        </table>
      </div>
      <div className="ref-fu-section">
        <h4 className="ref-fu-section-title">听牌形（待ち）</h4>
        <table className="ref-table">
          <thead>
            <tr>
              <th>种类</th>
              <th>条件</th>
              <th>符数</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>坎张听</td>
              <td>中张嵌张（46 听 5）</td>
              <td className="ref-fu-value">2</td>
            </tr>
            <tr>
              <td>边张听</td>
              <td>边张（12 听 3 或 89 听 7）</td>
              <td className="ref-fu-value">2</td>
            </tr>
            <tr>
              <td>单骑听</td>
              <td>单骑</td>
              <td className="ref-fu-value">2</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="ref-fu-section">
        <h4 className="ref-fu-section-title">和牌方式</h4>
        <table className="ref-table">
          <thead>
            <tr>
              <th>种类</th>
              <th>条件</th>
              <th>符数</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>自摸</td>
              <td>自摸（无平和等特例）</td>
              <td className="ref-fu-value">2</td>
            </tr>
            <tr>
              <td>门清荣和</td>
              <td>门前清 + 荣和</td>
              <td className="ref-fu-value">10</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="ref-fu-section">
        <h4 className="ref-fu-section-title">计算规则</h4>
        <table className="ref-table">
          <thead>
            <tr>
              <th>种类</th>
              <th>条件</th>
              <th>符数</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>进位</td>
              <td>合计后向上取整至 10 的倍数</td>
              <td className="ref-fu-value">⌈x/10⌉×10</td>
            </tr>
            <tr>
              <td>特例</td>
              <td>平和 + 门清自摸</td>
              <td className="ref-fu-value">20 符（固定）</td>
            </tr>
            <tr>
              <td>特例</td>
              <td>七对子</td>
              <td className="ref-fu-value">25 符（固定）</td>
            </tr>
            <tr>
              <td>特例</td>
              <td>副露和牌（非门清荣和）最低</td>
              <td className="ref-fu-value">30 符</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderPointTable = (
    tableData: ReturnType<typeof generateDealerTable>,
    isDealer: boolean,
  ) => (
    <div className="ref-point-table-wrap">
      <table className="ref-table ref-point-table">
        <thead>
          <tr>
            <th>符</th>
            {tableData.hanLabels.map((label, i) => (
              <th key={i}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tableData.fuValues.map((fu, fi) => (
            <tr key={fi}>
              <td className="ref-fu-header">{fu}</td>
              {tableData.cells[fi].map((cell, ci) => (
                <td key={ci} className={cell ? "" : "ref-empty"}>
                  {cell ? (
                    <div
                      className={
                        (isDealer && cell.ron === 12000) ||
                        (!isDealer && cell.ron === 8000)
                          ? "ref-mangan"
                          : ""
                      }
                    >
                      <div className="ref-ron">{cell.ron}</div>
                      <div className="ref-tsumo">
                        {cell.tsumo} {isDealer ? "ALL" : ""}
                      </div>
                    </div>
                  ) : (
                    "-"
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="ref-legend">
        <span className="ref-legend-item">
          <span className="ref-legend-ron">上段</span>：荣和点数
        </span>
        <span className="ref-legend-item">
          <span className="ref-legend-tsumo">下段</span>：
          {isDealer ? "自摸时各家支付" : "自摸时 闲家/庄家 支付"}
        </span>
      </div>
      <div className="ref-mangan-note">{tableData.manganNote}</div>
    </div>
  );

  const renderYakuChart = () => (
    <div className="ref-yaku-chart">
      {yakuChart.map((category, ci) => (
        <div key={ci} className="ref-yaku-section">
          <h4 className="ref-yaku-section-title">{category.title}</h4>
          <table className="ref-table ref-yaku-table">
            <thead>
              <tr>
                <th>役种</th>
                <th>番数</th>
                <th>条件</th>
                <th>说明</th>
              </tr>
            </thead>
            <tbody>
              {category.yakus.map((yaku, yi) => {
                return (
                  <React.Fragment key={yi}>
                    <tr className="ref-yaku-info-row">
                      <td className="ref-yaku-name">
                        {yaku.name}
                        {yaku.nameJa && (
                          <span className="ref-yaku-name-ja">
                            （{yaku.nameJa}）
                          </span>
                        )}
                      </td>
                      <td className="ref-yaku-han">{yaku.han}</td>
                      <td
                        className={`ref-yaku-condition ${yaku.condition.includes("门清限定") ? "ref-condition-menzen" : ""}`}
                      >
                        {yaku.condition}
                      </td>
                      <td className="ref-yaku-desc">{yaku.description}</td>
                    </tr>
                    <tr className="ref-yaku-tiles-row">
                      <td colSpan={4} className="ref-yaku-tiles-cell">
                        {yaku.handExample ? (
                          <RichHand size="tiny" tilesStr={yaku.handExample} />
                        ) : (
                          <span className="ref-yaku-no-example">&nbsp;</span>
                        )}
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );

  const renderFormulaTab = () => (
    <div className="ref-formula">
      {/* 符数、番数计算 */}
      <div className="ref-formula-section">
        <h4>一、符数、番数计算</h4>
        <div className="ref-formula-block">
          <p className="ref-formula-text">
            <strong>
              符数 = 向上取整<sub>10</sub>( 底符 + 各构成符 )
            </strong>
          </p>
          <p className="ref-formula-text">
            <strong>番数 = Σ(各役种番数) + 宝牌数 + 里宝牌数</strong>
          </p>
        </div>
      </div>

      {/* 基本点计算 */}
      <div className="ref-formula-section">
        <h4>二、基本点计算</h4>
        <div className="ref-formula-block">
          <table className="ref-table ref-formula-table">
            <thead>
              <tr>
                <th>番数</th>
                <th>基本点</th>
                <th>名称</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>5番及以上</td>
                <td className="ref-fu-value">2000</td>
                <td>满贯</td>
              </tr>
              <tr>
                <td>6~7番</td>
                <td className="ref-fu-value">3000</td>
                <td>跳满</td>
              </tr>
              <tr>
                <td>8~10番</td>
                <td className="ref-fu-value">4000</td>
                <td>倍满</td>
              </tr>
              <tr>
                <td>11~12番</td>
                <td className="ref-fu-value">6000</td>
                <td>三倍满</td>
              </tr>
              <tr>
                <td>13番及以上</td>
                <td className="ref-fu-value">8000</td>
                <td>役满</td>
              </tr>
            </tbody>
          </table>
          <p className="ref-formula-text">
            <strong>
              1~4番时：基本点 = min( 符 × 2<sup>(番+2)</sup> , 2000 )
            </strong>
          </p>
          <p className="ref-formula-note">
            <span className="color-red"> ※ 1~4番基本点上限为2000（满贯）</span>
            <br />※ 例：30符3番 = 30 × 2<sup>5</sup> = 30 × 32 = 960 → 基本点960
          </p>
        </div>
      </div>

      {/* 最终点数计算 */}
      <div className="ref-formula-section">
        <h4>三、最终点数计算</h4>
        <div className="ref-formula-block">
          <table className="ref-table ref-formula-table">
            <thead>
              <tr>
                <th>角色</th>
                <th>和牌方式</th>
                <th>计算公式</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>庄家</td>
                <td>荣和</td>
                <td className="ref-formula-math">
                  基本点 × 6 → 向上取整<sub>100</sub>
                </td>
              </tr>
              <tr>
                <td>庄家</td>
                <td>自摸</td>
                <td className="ref-formula-math">
                  基本点 × 2 → 向上取整<sub>100</sub>（各家支付）
                </td>
              </tr>
              <tr>
                <td>闲家</td>
                <td>荣和</td>
                <td className="ref-formula-math">
                  基本点 × 4 → 向上取整<sub>100</sub>
                </td>
              </tr>
              <tr>
                <td>闲家</td>
                <td>自摸</td>
                <td className="ref-formula-math">
                  庄家：基本点 × 2 → 向上取整<sub>100</sub>
                  <br />
                  闲家：基本点 × 1 → 向上取整<sub>100</sub>
                </td>
              </tr>
            </tbody>
          </table>
          <p className="ref-formula-note">
            ※ 最终点数 = 上述计算值 + 场供
            <br />※ 自摸时支付格式："闲家支付/庄家支付" 或 "各家支付
            ALL"（庄家自摸）
          </p>
        </div>
      </div>

      {/* 场供 */}
      <div className="ref-formula-section">
        <h4>四、场供（本场）</h4>
        <div className="ref-formula-block">
          <p className="ref-formula-text">
            <strong>场供 = 本场数 × 300点</strong>
            <small>（四人麻将一般规则）</small>
          </p>
          <table className="ref-table ref-formula-table">
            <thead>
              <tr>
                <th>和牌方式</th>
                <th>场供分配</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>荣和</td>
                <td>场供全部由放铳者承担，累加到报点中</td>
              </tr>
              <tr>
                <td>自摸</td>
                <td>场供平分三家，每家支付 本场数 × 100点</td>
              </tr>
            </tbody>
          </table>
          <p className="ref-formula-note">
            ※ 例：3本场，场供 = 900点
            <br />
            &nbsp;&nbsp;荣和：报点 +900点
            <br />
            &nbsp;&nbsp;自摸：每家多付 300点
          </p>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "fu":
        return renderFuTable();
      case "dealer":
        return renderPointTable(dealerTable, true);
      case "nonDealer":
        return renderPointTable(nonDealerTable, false);
      case "yaku":
        return renderYakuChart();
      case "formula":
        return renderFormulaTab();
    }
  };

  return (
    <CustomModal
      title="报点参考"
      className="ref-modal"
      isOpen={isOpen}
      width="1600px"
      onClose={onClose}
    >
      <div className="ref-modal-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`ref-tab ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="ref-modal-body">{renderContent()}</div>
    </CustomModal>
  );
};

export default ReferenceModal;
