import './ForestDecorations.css';

const pieces = [
  { file: 'leaf-serrated', className: 'forest-leaf leaf-0', width: 127, height: 168 },
  { file: 'leaf-curled', className: 'forest-leaf leaf-1', width: 92, height: 168 },
  { file: 'leaf-rounded', className: 'forest-leaf leaf-2', width: 168, height: 155 },
  { file: 'petal-pink', className: 'forest-petal petal-0', width: 168, height: 133 },
  { file: 'petal-apricot', className: 'forest-petal petal-1', width: 168, height: 151 },
];

/** Reusable generated cutouts; kept separate from the original artwork photographs. */
export function ForestDecorations() {
  return <span className="forest-drift" aria-hidden="true">
    {pieces.map(piece => <span key={piece.file} className={`forest-drift-piece ${piece.className}`}><img src={`/botanical/${piece.file}.webp`} width={piece.width} height={piece.height} alt="" draggable={false} decoding="async"/></span>)}
  </span>;
}
