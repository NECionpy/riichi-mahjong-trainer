import React from "react";
import CustomModal from "../../components/Modal/CustomModal";
import {
  defaultProbabilitySettings,
  ProbabilitySettingsData,
} from "../../core/pointCalc";
import "./SettingModal.less";

interface SettingModalProps {
  isOpen: boolean;
  value: ProbabilitySettingsData;
  onChange: (value: ProbabilitySettingsData) => void;
  onClose: () => void;
}

const SettingItems: Array<{
  key: keyof Omit<ProbabilitySettingsData, "honba">;
  label: string;
}> = [
  { key: "honbaMin", label: "最小本场数" },
  { key: "honbaMax", label: "最大本场数" },
  { key: "riichi", label: "立直率" },
  { key: "doubleRiichi", label: "双立直率" },
  { key: "ippatsu", label: "一发率" },
  { key: "tsumo", label: "自摸率" },
  { key: "haitei", label: "海底率" },
  { key: "houtei", label: "河底率" },
  { key: "rinshan", label: "岭上率" },
  { key: "chankan", label: "抢杠率" },
  { key: "sequence", label: "顺子率" },
  { key: "triplet", label: "刻子率" },
  { key: "meld", label: "副露率" },
  { key: "ankan", label: "暗杠率" },
  { key: "minkan", label: "明杠率" },
];

/**
 * 配置生成手牌的偏好设置
 * @param param0
 * @returns
 */
const SettingModal: React.FC<SettingModalProps> = ({
  isOpen,
  value,
  onChange,
  onClose,
}) => {
  const handleInputChange = (
    key: keyof ProbabilitySettingsData,
    target: HTMLInputElement,
  ) => {
    const newValue = target.value;
    let newVal = parseInt(newValue);
    newVal = newVal || 0;
    if (!["honbaMin", "honbaMax"].includes(key)) {
      newVal = newVal / 100;
    }
    onChange({ ...value, [key]: newVal || 0 });
  };

  const handleReset = () => {
    onChange({ ...defaultProbabilitySettings });
  };

  return (
    <CustomModal
      title="偏好设置"
      className="ref-modal"
      isOpen={isOpen}
      width="2000px"
      onClose={onClose}
    >
      <div className="setting-body">
        <div className="setting-form">
          {SettingItems.map((item) => (
            <div className="setting-item" key={item.key}>
              <label>{item.label} :</label>
              <input
                type="range"
                min={0}
                step={1}
                max={["honbaMin", "honbaMax"].includes(item.key) ? 9 : 99}
                value={
                  ["honbaMin", "honbaMax"].includes(item.key)
                    ? `${value[item.key]}`
                    : `${(value[item.key] * 100).toFixed(0)}`
                }
                onChange={(event) => handleInputChange(item.key, event.target)}
              />
              <span>
                {["honbaMin", "honbaMax"].includes(item.key)
                  ? `${value[item.key]}`
                  : `${(value[item.key] * 100).toFixed(0)} %`}
              </span>
            </div>
          ))}
        </div>
        <div className="setting-tips">
          <div>
            ※
            以上为参考概率，实际概率受实际逻辑影响，比如：一发受立直与双立直影响，双立直与开杠冲突，海底与岭上冲突等等
          </div>
          <div>
            ※ 优先生成顺子，然后是刻子，最后是杠子，杠子生成率 = 100% - 顺子率 -
            刻子率。顺子率设置为 99%，将几乎不会生成刻子和杠子。
          </div>
          <div>※ 生成杠子的概率还会受到“岭上”的偶然役影响。</div>
          <div>
            ※ 优先生成暗杠，然后是明杠，最后是加杠，加杠生成率 = 100% - 暗杠率 -
            明杠率。
          </div>
          <div>※ 最大概率设置为 99%，修改后自动生效。</div>
        </div>
        <button className="button reset" onClick={handleReset}></button>
      </div>
    </CustomModal>
  );
};

export default SettingModal;
