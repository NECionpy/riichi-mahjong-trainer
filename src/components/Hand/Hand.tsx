import React from "react";
import Tile from "../Tile/Tile";
import { Tile as TileType } from "../../core/tile";
import { TileImageDir } from "../../utils/tileImage";
import "./Hand.css";

interface HandProps {
  tiles: TileType[];
  winningTile?: TileType;
  isTsumo?: boolean;
  highlightedTiles?: TileType[];
  size?: "small" | "medium" | "large";
  dir?: TileImageDir;
  faceDown?: boolean;
}

const Hand: React.FC<HandProps> = ({
  tiles,
  winningTile,
  isTsumo,
  highlightedTiles = [],
  size = "medium",
  dir = "hand",
  faceDown = false,
}) => {
  const isHighlighted = (tile: TileType) => {
    return highlightedTiles.some(
      (t) => t.suit === tile.suit && t.value === tile.value,
    );
  };

  return (
    <div className="hand">
      <div className="hand-tiles">
        {tiles.map((tile, index) => (
          <Tile
            key={`${tile.suit}-${tile.value}-${index}`}
            tile={tile}
            size={size}
            highlighted={isHighlighted(tile)}
            dir={dir}
            faceDown={faceDown}
          />
        ))}
      </div>
      {winningTile && (
        <>
          <div className="hand-separator" />
          <div className="hand-winning-tile">
            {isTsumo !== undefined && (
              <div
                className={`winning-type-label ${isTsumo ? "tsumo" : "ron"}`}
              >
                {isTsumo ? "自摸" : "荣和"}
              </div>
            )}
            <Tile tile={winningTile} size={size} highlighted={true} dir={dir} />
          </div>
        </>
      )}
    </div>
  );
};

export default Hand;
