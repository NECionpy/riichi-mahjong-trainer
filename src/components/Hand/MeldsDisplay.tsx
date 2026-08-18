import React from "react";
import Tile from "../Tile/Tile";
import { Meld } from "../../core/tile";
import "./MeldsDisplay.less";

interface MeldsDisplayProps {
  melds: Meld[];
  size?: "tiny" | "small" | "medium" | "large";
}

/**
 * 鸣牌展示组件（吃、碰、杠、加杠）
 */
const MeldsDisplay: React.FC<MeldsDisplayProps> = ({ melds, size }) => {
  return (
    <div className="melds-display">
      {melds.map((meld, mi) => {
        const isAnkan = meld.type === "ankan";
        const isKakan = meld.type === "kakan";
        const totalTiles = meld.tiles.length;

        if (isKakan) {
          // 加杠：左右out竖牌 + 中间outh横牌上下叠放
          return (
            <div key={mi} className="meld-group meld-kakan">
              <Tile
                key="k-0"
                tile={meld.tiles[0]}
                size={size}
                dir="out"
                faceDown={false}
              />
              <div className="meld-kakan-middle">
                <Tile
                  key="k-2"
                  tile={meld.tiles[2]}
                  size={size}
                  dir="outh"
                  faceDown={false}
                />
                <Tile
                  key="k-1"
                  tile={meld.tiles[1]}
                  size={size}
                  dir="outh"
                  faceDown={false}
                />
              </div>
              <Tile
                key="k-3"
                tile={meld.tiles[3]}
                size={size}
                dir="out"
                faceDown={false}
              />
            </div>
          );
        }

        return (
          <div
            key={mi}
            className={`meld-group ${meld.isOpen ? "meld-open" : "meld-closed"}`}
          >
            <div className="meld-tiles">
              {meld.tiles.map((tile, ti) => {
                if (isAnkan && (ti === 0 || ti === totalTiles - 1)) {
                  return (
                    <Tile
                      key={ti}
                      tile={tile}
                      size={size}
                      dir="out"
                      faceDown={true}
                    />
                  );
                }
                if (!isAnkan && ti === 0) {
                  return (
                    <Tile
                      key={ti}
                      tile={tile}
                      size={size}
                      dir="outh"
                      faceDown={false}
                    />
                  );
                }
                return (
                  <Tile
                    key={ti}
                    tile={tile}
                    size={size}
                    dir="out"
                    faceDown={false}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MeldsDisplay;
