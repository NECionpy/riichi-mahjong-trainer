import React, { useEffect, useState } from "react";
import {
  Meld,
  parseHandString,
  sortTiles,
  Tile as TileType,
} from "../../core/tile";
import MeldsDisplay from "../Hand/MeldsDisplay";
import Hand from "../Hand/Hand";
import "./RichHand.less";

interface RichHandProps {
  tilesStr: string;
  size?: "tiny" | "small" | "medium" | "large";
}

// 富手牌解析器
const RichHand: React.FC<RichHandProps> = ({ tilesStr, size = "medium" }) => {
  const [handTiles, setHandTiles] = useState<TileType[]>([]);
  const [melds, setMelds] = useState<Meld[]>([]);
  const [winningTile, setWinningTile] = useState<TileType | null>(null);

  useEffect(() => {
    const parsed = parseHandString(tilesStr);
    setHandTiles(sortTiles(parsed.handTiles));
    setWinningTile(parsed.winTile);
    setMelds(parsed.melds);
  }, [tilesStr]);

  return (
    <div className="rich-hand">
      {handTiles.length > 0 && (
        <Hand
          tiles={handTiles}
          winningTile={winningTile || undefined}
          size={size}
        />
      )}
      {melds.length > 0 && <MeldsDisplay melds={melds} size={size} />}
    </div>
  );
};

export default RichHand;
