import React from "react";
import { Tile as TileType } from "../../core/tile";
import {
  getTileImagePath,
  TileImageDir,
  getTileBackImagePath,
} from "../../utils/tileImage";
import "./Tile.less";

interface TileProps {
  tile: TileType;
  size?: "tiny" | "small" | "medium" | "large";
  highlighted?: boolean;
  faceDown?: boolean;
  dir?: TileImageDir;
  onClick?: () => void;
}

/**
 * 渲染一个牌
 *
 * @param tile 牌
 * @param size 牌的大小
 * @param highlighted 是否高亮显示
 * @param faceDown 是否显示牌背
 * @param dir 牌的方向
 * @param onClick 点击事件
 * @returns
 */
const Tile: React.FC<TileProps> = ({
  tile,
  size = "medium",
  highlighted = false,
  faceDown = false,
  dir = "hand",
  onClick,
}) => {
  const imagePath = faceDown
    ? getTileBackImagePath(dir)
    : getTileImagePath(tile, dir);

    // 如果 tile 为 null 或 undefined，则不渲染任何内容
    // 防止手动输入的牌值不合法导致的错误
  if (!tile) {
    return null;
  } 

  return (
    <div
      className={`tile tile-${dir} tile-${size} ${highlighted ? "tile-highlighted" : ""} ${onClick ? "tile-clickable" : ""}`}
      onClick={onClick}
    >
      <img
        src={imagePath}
        alt={faceDown ? "牌背" : `${tile.suit}-${tile.value}`}
        className="tile-image"
        draggable={false}
      />
    </div>
  );
};

export default Tile;
