import React from "react";
import "./ShantenAlgorithmModal.less";
import CustomModal from "../../components/Modal/CustomModal";

interface ShantenAlgorithmModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ShantenAlgorithmModal: React.FC<ShantenAlgorithmModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <CustomModal title="向听数算法" isOpen={isOpen} onClose={onClose}>
      <div className="algorithm-formula">
        {/* 普通面子向听数 */}
        <div className="algorithm-formula-section">
          <h4>一、普通面子向听数</h4>
          <div className="algorithm-formula-block">
            <p className="algorithm-formula-text">
              <strong>向听数 = 8 - 2 x 面子数 - 搭子数 - 雀头数 </strong>
            </p>
            <p className="algorithm-formula-desc">
              <strong>其中：</strong>
              <span>面子数：已经成型的顺子或刻子。</span>
              <span>搭子：差一张牌就可以组成面子的牌。</span>
              <span>雀头数：固定为雀头的对子。</span>
            </p>
            <p className="algorithm-formula-note">
              ※ 无论多差的手牌，进8张牌都可以组成4个面子，或者三面子加一雀头、一搭子，所以普通面子最大向听数为8
              <br />
              ※ 向听数最小为0，表示已经听牌了。如果算出向听数为 -1，表示已经和牌了。
              <br />
              ※ 实际计算时需要考虑复合牌型的拆搭方式，以及雀头与搭子的转化。
            </p>
          </div>
        </div>

        {/* 七对子向听数 */}
        <div className="algorithm-formula-section">
          <h4>二、七对子向听数</h4>
          <div className="algorithm-formula-block">
            <p className="algorithm-formula-text">
              <strong>向听数 = 6 - 对子数</strong>
            </p>          
            <p className="algorithm-formula-note">
              ※ 七对子牌型组成6组对子时即可听牌，所以最大向听数为6
              <br />
              ※ 每凑齐一组对子，向听数就会减少1
            </p>
          </div>
        </div>

        {/* 国士无双向听数 */}
        <div className="algorithm-formula-section">
          <h4>三、国士无双向听数</h4>
          <div className="algorithm-formula-block">
            <p className="algorithm-formula-text">
              <strong>向听数 = 13 - 不重复的幺九牌数 - 是否存在幺九牌对子</strong>
            </p>               
          </div>
        </div>
      </div>
    </CustomModal>
  );
};

export default ShantenAlgorithmModal;
