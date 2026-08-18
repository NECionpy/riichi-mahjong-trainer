import { Tile, HonorType, getTileNumber } from '../core/tile';

// 牌的显示目录类型
// - hand: 手牌
// - out: 打出的牌 / 自家副露区
// - outh: 立直宣言牌 / 他家副露
export type TileImageDir = 'hand' | 'out' | 'outh';

// 字牌到数字的映射
const HONOR_TO_NUMBER: Record<HonorType, number> = {
  east: 1,
  south: 2,
  west: 3,
  north: 4,
  white: 5,
  green: 6,
  red: 7
};

/**
 * 获取牌的图片文件名
 * 例如: 1m, 5p, 0s(赤五索), 1z(东), 7z(中)
 */
export function getTileImageName(tile: Tile): string {
  let num: number;
  let suit: string;

  if(!tile) {
    return 'back.png'; // 返回牌背图片
  }

  if (tile.suit === 'honor') {
    num = HONOR_TO_NUMBER[tile.value as HonorType];
    suit = 'z';
  } else {
    num = getTileNumber(tile);
    suit = tile.suit.charAt(0); // man->m, pin->p, sou->s
  }

  return `${num}${suit}.png`;
}

/**
 * 获取牌的完整图片路径
 */
export function getTileImagePath(tile: Tile, dir: TileImageDir = 'hand'): string {
  return `./images/tiles/${dir}/${getTileImageName(tile)}`;
}

/**
 * 获取牌背图片路径
 */
export function getTileBackImagePath(dir: TileImageDir = 'out'): string {
  return `./images/tiles/${dir}/back.png`;
}
