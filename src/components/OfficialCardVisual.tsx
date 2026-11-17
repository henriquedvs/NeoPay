import React, { useState } from 'react';
import { LockClosedIcon } from '@heroicons/react/24/solid';
import { OFFICIAL_CARDS } from '../data/neoSeed';
import { OfficialCardId } from '../types/neo';

interface OfficialCardVisualProps {
  cardId: OfficialCardId;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  frozen?: boolean;
  holderName?: string;
  last4?: string;
  className?: string;
}

export const OfficialCardVisual: React.FC<OfficialCardVisualProps> = ({
  cardId,
  size = 'md',
  frozen = false,
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);
  const meta = OFFICIAL_CARDS[cardId];

  const dimensionClasses = {
    xs: 'w-[28px] h-[44px] rounded-[5px]',
    sm: 'w-[52px] h-[82px] rounded-[9px]',
    md: 'w-[126px] h-[200px] rounded-[16px]',
    lg: 'w-[216px] h-[342px] sm:w-[236px] sm:h-[374px] rounded-[22px]',
  }[size];

  const fallbackGradient = {
    sage: 'linear-gradient(160deg, #86947A 0%, #6E7B63 100%)',
    sky: 'linear-gradient(155deg, #AED7F2 0%, #5CA5D6 52%, #C9E4F7 100%)',
    aura: 'linear-gradient(165deg, #D8D4C8 0%, #8CA7BE 55%, #C9CED4 100%)',
  }[cardId];

  return (
    <div
      className={`relative overflow-hidden shrink-0 select-none shadow-[0_8px_24px_rgba(60,60,59,0.12)] ${dimensionClasses} ${className}`}
      style={{ background: fallbackGradient }}
      aria-label={`Cartão oficial ${meta.name}`}
    >
      {!imgError ? (
        <img
          src={meta.imagePath}
          alt={`Cartão oficial ${meta.name} Visa`}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover scale-[1.21] pointer-events-none"
        />
      ) : (
        <div className="w-full h-full flex flex-col justify-between p-2.5 text-white">
          <span className="font-display font-bold text-[10px] leading-none">NEO</span>
          <span className="font-display font-bold text-[9px] self-end italic leading-none">
            VISA
          </span>
        </div>
      )}

      {frozen && (
        <div className="absolute inset-0 bg-[#3C3C3B]/55 backdrop-blur-[2px] flex flex-col items-center justify-center gap-1.5 text-white">
          <LockClosedIcon className={size === 'xs' ? 'w-3 h-3' : 'w-6 h-6'} />
          {(size === 'md' || size === 'lg') && (
            <span className="text-[11px] font-medium tracking-wide">Bloqueado</span>
          )}
        </div>
      )}
    </div>
  );
};
