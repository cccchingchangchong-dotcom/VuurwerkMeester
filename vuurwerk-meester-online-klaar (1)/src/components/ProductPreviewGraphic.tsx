import React from 'react';
import { FireworkProduct } from '../types';

interface Props {
  product: FireworkProduct;
  size?: 'sm' | 'md' | 'lg';
}

export const ProductPreviewGraphic: React.FC<Props> = ({ product, size = 'md' }) => {
  const dims =
    size === 'sm' ? 'w-12 h-12' : size === 'lg' ? 'w-28 h-28' : 'w-16 h-16';

  const isPremium = product.tier === 'premium';

  return (
    <div
      className={`${dims} relative rounded-lg overflow-hidden shrink-0 border flex items-center justify-center ${
        isPremium ? 'border-amber-400/70' : 'border-white/10'
      }`}
      style={{
        background: `linear-gradient(145deg, ${product.primaryColor}, #090B10)`,
      }}
    >
      {isPremium && size !== 'sm' && (
        <span className="absolute top-0.5 right-1 text-[9px] font-bold text-amber-300 leading-none">
          ★
        </span>
      )}
      <svg viewBox="0 0 64 64" className="w-4/5 h-4/5 drop-shadow">
        {product.shapeType === 'rocket' ? (
          <g>
            <rect x="30" y="28" width="4" height="30" fill="#A16207" />
            <rect x="24" y="18" width="16" height="22" rx="2" fill={product.primaryColor} stroke={product.accentColor} strokeWidth="2" />
            <polygon points="32,4 42,18 22,18" fill={product.accentColor} />
          </g>
        ) : product.shapeType === 'fountain' ? (
          <g>
            <polygon points="26,12 38,12 50,54 14,54" fill={product.primaryColor} stroke={product.accentColor} strokeWidth="2" />
            <rect x="24" y="8" width="16" height="4" fill={product.accentColor} />
          </g>
        ) : product.shapeType === 'candle' ? (
          <g>
            <rect x="26" y="8" width="12" height="48" rx="2" fill={product.primaryColor} stroke={product.accentColor} strokeWidth="2" />
            <line x1="26" y1="20" x2="38" y2="20" stroke={product.accentColor} strokeWidth="2" />
            <line x1="26" y1="42" x2="38" y2="42" stroke={product.accentColor} strokeWidth="2" />
          </g>
        ) : product.shapeType === 'thunderking' ? (
          <g>
            <rect x="23" y="14" width="18" height="36" rx="2" fill={product.primaryColor} stroke={product.accentColor} strokeWidth="2" />
            <rect x="16" y="48" width="32" height="6" rx="2" fill="#1F2937" />
          </g>
        ) : product.shapeType === 'shell' ? (
          <g>
            <rect x="18" y="48" width="28" height="6" fill="#92400E" />
            <rect x="22" y="16" width="14" height="32" fill={product.primaryColor} stroke={product.accentColor} strokeWidth="2" />
            <circle cx="43" cy="40" r="8" fill={product.accentColor} />
          </g>
        ) : product.shapeType === 'smoke' ? (
          <g>
            <rect x="21" y="18" width="22" height="34" rx="3" fill={product.primaryColor} stroke={product.accentColor} strokeWidth="2" />
            <rect x="23" y="13" width="18" height="5" rx="1" fill="#CBD5E1" />
            <circle cx="44" cy="16" r="4" fill="none" stroke={product.accentColor} strokeWidth="2" />
          </g>
        ) : product.shapeType === 'spinner' ? (
          <g>
            <circle cx="32" cy="36" r="16" fill={product.primaryColor} stroke={product.accentColor} strokeWidth="2.5" />
            <circle cx="32" cy="36" r="6" fill={product.accentColor} />
            <line x1="16" y1="36" x2="48" y2="36" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="3 3" />
          </g>
        ) : product.shapeType === 'novelty' ? (
          <g>
            <rect x="14" y="34" width="36" height="16" rx="2" fill={product.primaryColor} stroke={product.accentColor} strokeWidth="2" />
            <rect x="18" y="20" width="6" height="14" fill={product.accentColor} />
            <rect x="29" y="18" width="6" height="16" fill="#FDE047" />
            <rect x="40" y="20" width="6" height="14" fill={product.accentColor} />
          </g>
        ) : product.shapeType === 'premium_box' ? (
          <g>
            <rect x="8" y="18" width="48" height="34" rx="4" fill={product.primaryColor} stroke="#FDE047" strokeWidth="3" />
            <rect x="12" y="13" width="40" height="6" fill="#FBBF24" />
            <rect x="16" y="28" width="8" height="8" rx="1" fill="#E2E8F0" />
            <rect x="40" y="28" width="8" height="8" rx="1" fill="#E2E8F0" />
          </g>
        ) : (
          <g>
            <rect
              x={product.shapeType === 'compound' ? 8 : 14}
              y="20"
              width={product.shapeType === 'compound' ? 48 : 36}
              height="30"
              rx="3"
              fill={product.primaryColor}
              stroke={product.accentColor}
              strokeWidth="2.5"
            />
            <rect
              x={product.shapeType === 'compound' ? 12 : 18}
              y="16"
              width={product.shapeType === 'compound' ? 40 : 28}
              height="5"
              fill={product.accentColor}
            />
          </g>
        )}
        {product.effect.colors.slice(0, 3).map((col, idx) => (
          <circle
            key={col + idx}
            cx={16 + idx * 16}
            cy={10}
            r="2.5"
            fill={col}
          />
        ))}
      </svg>
    </div>
  );
};
