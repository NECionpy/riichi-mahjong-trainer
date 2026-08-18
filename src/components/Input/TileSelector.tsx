import React, { useState } from 'react';
import { useToast } from '../Toast/ToastContext';
import Tile from '../Tile/Tile';
import { Tile as TileType, TileSuit, TileValue, HonorType, createTile, parseTileString } from '../../core/tile';
import './TileSelector.less';

interface TileSelectorProps {
  onTileSelect: (tile: TileType) => void;
  selectedTiles?: TileType[];
  maxCount?: number;
}

const TileSelector: React.FC<TileSelectorProps> = ({ 
  onTileSelect, 
  selectedTiles = [],
  maxCount = 14 
}) => {
  const [inputMode, setInputMode] = useState<'visual' | 'text'>('text');
  const [textInput, setTextInput] = useState('');
  const toast = useToast();

  const generateAllTiles = (): TileType[] => {
    const tiles: TileType[] = [];
    let id = 0;

    // 数牌
    const suits: TileSuit[] = ['man', 'pin', 'sou'];
    for (const suit of suits) {
      for (let value = 1; value <= 9; value++) {
        tiles.push(createTile(suit, value as TileValue, id++));
      }
    }

    // 字牌
    const honorTypes: HonorType[] = ['east', 'south', 'west', 'north', 'white', 'green', 'red'];
    for (const honor of honorTypes) {
      tiles.push(createTile('honor', honor, id++));
    }

    return tiles;
  };

  const handleTextSubmit = () => {
    try {
      const tiles = parseTileString(textInput);
      tiles.forEach((tile: TileType) => onTileSelect(tile));
      setTextInput('');
    } catch (error) {
      toast.showToast('输入的牌格式不正确，请使用如 "123m456p789s11z" 的格式', 'error');
    }
  };

  const handleTileClick = (tile: TileType) => {
    if (selectedTiles.length < maxCount) {
      onTileSelect(tile);
    }
  };

  const allTiles = generateAllTiles();

  // 按花色分组
  const manTiles = allTiles.filter(t => t.suit === 'man');
  const pinTiles = allTiles.filter(t => t.suit === 'pin');
  const souTiles = allTiles.filter(t => t.suit === 'sou');
  const honorTiles = allTiles.filter(t => t.suit === 'honor');

  return (
    <div className="tile-selector">
      <div className="tile-selector-header">
        <div className="tile-selector-modes">
          <button
            className={`mode-btn ${inputMode === 'text' ? 'active' : ''}`}
            onClick={() => setInputMode('text')}
          >
            文本输入
          </button>
          <button
            className={`mode-btn ${inputMode === 'visual' ? 'active' : ''}`}
            onClick={() => setInputMode('visual')}
          >
            可视化选择
          </button>
        </div>
        <div className="tile-selector-count">
          已选: {selectedTiles.length} / {maxCount}
        </div>
      </div>

      {inputMode === 'text' ? (
        <div className="tile-selector-text">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="输入牌，如: 123m456p789s11z"
            className="tile-input"
          />
          <button onClick={handleTextSubmit} className="submit-btn">
            添加
          </button>
        </div>
      ) : (
        <div className="tile-selector-visual">
          <div className="tile-suit-group">
            <div className="suit-label">万</div>
            <div className="suit-tiles">
              {manTiles.map((tile, idx) => (
                <Tile
                  key={idx}
                  tile={tile}
                  size="small"
                  onClick={() => handleTileClick(tile)}
                />
              ))}
            </div>
          </div>

          <div className="tile-suit-group">
            <div className="suit-label">筒</div>
            <div className="suit-tiles">
              {pinTiles.map((tile, idx) => (
                <Tile
                  key={idx}
                  tile={tile}
                  size="small"
                  onClick={() => handleTileClick(tile)}
                />
              ))}
            </div>
          </div>

          <div className="tile-suit-group">
            <div className="suit-label">索</div>
            <div className="suit-tiles">
              {souTiles.map((tile, idx) => (
                <Tile
                  key={idx}
                  tile={tile}
                  size="small"
                  onClick={() => handleTileClick(tile)}
                />
              ))}
            </div>
          </div>

          <div className="tile-suit-group">
            <div className="suit-label">字</div>
            <div className="suit-tiles">
              {honorTiles.map((tile, idx) => (
                <Tile
                  key={idx}
                  tile={tile}
                  size="small"
                  onClick={() => handleTileClick(tile)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TileSelector;
