export interface ChessRank {
  name: string;
  icon: string;
  minPoints: number;
  maxPoints: number;
  color: string;
  bg: string;
}

export const CHESS_RANKS: ChessRank[] = [
  {
    name: 'Peón Valiente',
    icon: '♟️',
    minPoints: 0,
    maxPoints: 5,
    color: '#94a3b8', // Slate grey
    bg: 'rgba(148, 163, 184, 0.1)',
  },
  {
    name: 'Caballo Veloz',
    icon: '♞',
    minPoints: 6,
    maxPoints: 15,
    color: '#60a5fa', // Blue
    bg: 'rgba(96, 165, 250, 0.1)',
  },
  {
    name: 'Alfil Estratega',
    icon: '♝',
    minPoints: 16,
    maxPoints: 30,
    color: '#a78bfa', // Purple
    bg: 'rgba(167, 139, 250, 0.1)',
  },
  {
    name: 'Torre Inquebrantable',
    icon: '♜',
    minPoints: 31,
    maxPoints: 50,
    color: '#f43f5e', // Rose/Red
    bg: 'rgba(244, 63, 94, 0.1)',
  },
  {
    name: 'Dama Temible',
    icon: '♛',
    minPoints: 51,
    maxPoints: 80,
    color: '#34d399', // Emerald/Green
    bg: 'rgba(52, 211, 153, 0.1)',
  },
  {
    name: 'Rey del Tablero',
    icon: '👑',
    minPoints: 81,
    maxPoints: 999999,
    color: '#fbbf24', // Amber/Gold
    bg: 'rgba(251, 191, 36, 0.15)',
  },
];

export function getPlayerRank(points: number): ChessRank {
  return CHESS_RANKS.find(r => points >= r.minPoints && points <= r.maxPoints) || CHESS_RANKS[0];
}
