import React, { useState, useMemo } from 'react';
import {
  fuTable,
  generateDealerTable,
  generateNonDealerTable,
  yakuChart,
} from './referenceData';
import Tile from '../../components/Tile/Tile';
import { parseTileString, Tile as TileType } from '../../core/tile';
import './ReferenceModal.css';

type TabKey = 'fu' | 'dealer' | 'nonDealer' | 'yaku' | 'formula';

interface Tab {
  key: TabKey;
  label: string;
}

const tabs: Tab[] = [
  { key: 'fu', label: '符数表' },
  { key: 'dealer', label: '庄家点数表' },
  { key: 'nonDealer', label: '闲家点数表' },
  { key: 'yaku', label: '役种图谱' },
  { key: 'formula', label: '计算公式' },
];

interface ReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ReferenceModal: React.FC<ReferenceModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabKey>('fu');

  const dealerTable = useMemo(() => generateDealerTable(), []);
  const nonDealerTable = useMemo(() => generateNonDealerTable(), []);

  /** 解析参考手牌字符串为 Tile 数组 */
  const parseHandExample = useMemo(() => {
    const cache: Record<string, TileType[]> = {};
    return (example: string): TileType[] => {
      if (!example || example === '—') return [];
      if (cache[example]) return cache[example];
      try {
        cache[example] = parseTileString(example);
      } catch {
        cache[example] = [];
      }
      return cache[example];
    };
  }, []);

  if (!isOpen) return null;

  const renderFuTable = () => (
    <div className="ref-fu-table">
      {fuTable.map((section, si) => (
        <div key={si} className="ref-fu-section">
          <h4 className="ref-fu-section-title">{section.title}</h4>
          <table className="ref-table">
            <thead>
              <tr>
                <th>种类</th>
                <th>条件</th>
                <th>符数</th>
                {section.items.some(i => i.note) && <th>备注</th>}
              </tr>
            </thead>
            <tbody>
              {section.items.map((item, ii) => (
                <tr key={ii}>
                  <td>{item.category}</td>
                  <td>{item.condition}</td>
                  <td className="ref-fu-value">{item.fu}</td>
                  {section.items.some(i => i.note) && <td>{item.note || ''}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );

  const renderPointTable = (tableData: ReturnType<typeof generateDealerTable>, isDealer: boolean) => (
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
                <td key={ci} className={cell ? '' : 'ref-empty'}>
                  {cell ? (
                    <>
                      <div className="ref-ron">{cell.ron}</div>
                      <div className="ref-tsumo">{cell.tsumo} {isDealer ? 'ALL' : ''}</div>
                    </>
                  ) : (
                    '-'
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
          {isDealer ? '自摸时各家支付' : '自摸时 闲家/庄家 支付'}
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
                const tiles = yaku.handExample ? parseHandExample(yaku.handExample) : [];
                return (
                  <React.Fragment key={yi}>
                    <tr className="ref-yaku-info-row">
                      <td className="ref-yaku-name">
                        {yaku.name}
                        {yaku.nameJa && <span className="ref-yaku-name-ja">（{yaku.nameJa}）</span>}
                      </td>
                      <td className="ref-yaku-han">{yaku.han}</td>
                      <td className={`ref-yaku-condition ${yaku.condition.includes('门清限定') ? 'ref-condition-menzen' : ''}`}>
                        {yaku.condition}
                      </td>
                      <td className="ref-yaku-desc">{yaku.description}</td>
                    </tr>
                    <tr className="ref-yaku-tiles-row">
                      <td colSpan={4} className="ref-yaku-tiles-cell">
                        {tiles.length > 0 ? (
                          <div className="ref-yaku-tiles">
                            {tiles.map((tile, ti) => (
                              <Tile key={ti} tile={tile} size="small" dir="hand" />
                            ))}
                          </div>
                        ) : (
                          <span className="ref-yaku-no-example">—</span>
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
      {/* 符数计算 */}
      <div className="ref-formula-section">
        <h4>一、符数计算</h4>
        <div className="ref-formula-block">
          <p className="ref-formula-text">
            <strong>符数 = 向上取整<sub>10</sub>( 底符 + 各构成符 )</strong>
          </p>
          <table className="ref-table ref-formula-table">
            <thead>
              <tr><th>构成</th><th>条件</th><th>符数</th></tr>
            </thead>
            <tbody>
              <tr><td>底符</td><td>和牌基本符</td><td className="ref-fu-value">20</td></tr>
              <tr><td>门清荣和</td><td>门清状态下荣和</td><td className="ref-fu-value">+10</td></tr>
              <tr><td>自摸</td><td>自摸和牌</td><td className="ref-fu-value">+2</td></tr>
              <tr><td>雀头</td><td>场风 / 自风 / 三元牌</td><td className="ref-fu-value">+2（每种）</td></tr>
              <tr><td>明刻</td><td>中张 / 幺九</td><td className="ref-fu-value">+2 / +4</td></tr>
              <tr><td>暗刻</td><td>中张 / 幺九</td><td className="ref-fu-value">+4 / +8</td></tr>
              <tr><td>明杠</td><td>中张 / 幺九</td><td className="ref-fu-value">+8 / +16</td></tr>
              <tr><td>暗杠</td><td>中张 / 幺九</td><td className="ref-fu-value">+16 / +32</td></tr>
              <tr><td>听牌形</td><td>边张 / 嵌张 / 单骑</td><td className="ref-fu-value">+2</td></tr>
            </tbody>
          </table>
          <p className="ref-formula-note">
            ※ 向上取整到10的倍数（如 32 → 40，40 → 40）<br />
            ※ 平和 + 门清自摸 = 固定20符<br />
            ※ 七对子 = 固定25符（不使用上述公式）<br />
            ※ 非门清和牌最低30符；门清荣和最低30符
          </p>
        </div>
      </div>

      {/* 番数计算 */}
      <div className="ref-formula-section">
        <h4>二、番数计算</h4>
        <div className="ref-formula-block">
          <p className="ref-formula-text">
            <strong>番数 = Σ(各役种番数) + 宝牌数 + 里宝牌数</strong>
          </p>
          <p className="ref-formula-desc">
            役种包括：立直(1番)、两立直(2番)、一发(1番)、门清自摸和(1番)、平和(1番)、
            断幺九(1番)、役牌(1番/种)、海底捞月(1番)、河底捞鱼(1番)、岭上开花(1番)、抢杠(1番)、
            七对子(2番)、对对和(2番)、三暗刻(2番)、三色同刻(2番)、三杠子(2番)、混老头(2番)、小三元(2番)、
            三色同顺(2番/1番)、一气通贯(2番/1番)、混全带幺九(2番/1番)、
            二盃口(3番)、纯全带幺九(3番/2番)、混一色(3番/2番)、
            清一色(6番/5番)、国士无双(役满) 等
          </p>
          <p className="ref-formula-note">
            ※ 宝牌和里宝牌本身不是役种，无役种时无法和牌（型听）<br />
            ※ 里宝牌仅立直/两立直时有效
          </p>
        </div>
      </div>

      {/* 基本点计算 */}
      <div className="ref-formula-section">
        <h4>三、基本点计算</h4>
        <div className="ref-formula-block">
          <table className="ref-table ref-formula-table">
            <thead>
              <tr><th>番数</th><th>基本点</th><th>名称</th></tr>
            </thead>
            <tbody>
              <tr><td>5番及以上</td><td className="ref-fu-value">2000</td><td>满贯</td></tr>
              <tr><td>6~7番</td><td className="ref-fu-value">3000</td><td>跳满</td></tr>
              <tr><td>8~10番</td><td className="ref-fu-value">4000</td><td>倍满</td></tr>
              <tr><td>11~12番</td><td className="ref-fu-value">6000</td><td>三倍满</td></tr>
              <tr><td>13番及以上</td><td className="ref-fu-value">8000</td><td>役满</td></tr>
            </tbody>
          </table>
          <p className="ref-formula-text">
            <strong>1~4番时：基本点 = min( 符 × 2<sup>(番+2)</sup> , 2000 )</strong>
          </p>
          <p className="ref-formula-note">
            ※ 基本点上限为2000（满贯）<br />
            ※ 例：30符3番 = 30 × 2<sup>5</sup> = 30 × 32 = 960 → 基本点960
          </p>
        </div>
      </div>

      {/* 最终点数计算 */}
      <div className="ref-formula-section">
        <h4>四、最终点数计算</h4>
        <div className="ref-formula-block">
          <table className="ref-table ref-formula-table">
            <thead>
              <tr><th>角色</th><th>和牌方式</th><th>计算公式</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>庄家</td>
                <td>荣和</td>
                <td className="ref-formula-math">基本点 × 6 → 向上取整<sub>100</sub></td>
              </tr>
              <tr>
                <td>庄家</td>
                <td>自摸</td>
                <td className="ref-formula-math">基本点 × 2 → 向上取整<sub>100</sub>（各家支付）</td>
              </tr>
              <tr>
                <td>闲家</td>
                <td>荣和</td>
                <td className="ref-formula-math">基本点 × 4 → 向上取整<sub>100</sub></td>
              </tr>
              <tr>
                <td>闲家</td>
                <td>自摸</td>
                <td className="ref-formula-math">
                  庄家：基本点 × 2 → 向上取整<sub>100</sub><br />
                  闲家：基本点 × 1 → 向上取整<sub>100</sub>
                </td>
              </tr>
            </tbody>
          </table>
          <p className="ref-formula-note">
            ※ 最终点数 = 上述计算值 + 场供<br />
            ※ 自摸时支付格式："闲家支付/庄家支付" 或 "各家支付 ALL"（庄家自摸）
          </p>
        </div>
      </div>

      {/* 场供 */}
      <div className="ref-formula-section">
        <h4>五、场供（本场）</h4>
        <div className="ref-formula-block">
          <p className="ref-formula-text">
            <strong>场供 = 本场数 × 300点</strong>
            <small>（四人麻将一般规则）</small>
          </p>
          <table className="ref-table ref-formula-table">
            <thead>
              <tr><th>和牌方式</th><th>场供分配</th></tr>
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
            ※ 例：3本场，场供 = 900点<br />
            &nbsp;&nbsp;荣和：报点 +900点<br />
            &nbsp;&nbsp;自摸：每家多付 300点
          </p>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'fu':
        return renderFuTable();
      case 'dealer':
        return renderPointTable(dealerTable, true);
      case 'nonDealer':
        return renderPointTable(nonDealerTable, false);
      case 'yaku':
        return renderYakuChart();
      case 'formula':
        return renderFormulaTab();
    }
  };

  return (
    <div className="ref-modal-overlay" onClick={onClose}>
      <div className="ref-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ref-modal-header">
          <h2>报点参考</h2>
          <button className="ref-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="ref-modal-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`ref-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="ref-modal-body">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default ReferenceModal;