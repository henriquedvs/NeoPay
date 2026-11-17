import React from 'react';

interface NeoLogoProps {
  variant?: 'neo' | 'neopay';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showEmblem?: boolean;
  tone?: 'dark' | 'light';
  className?: string;
}

export const NeoLogo: React.FC<NeoLogoProps> = ({
  variant = 'neo',
  size = 'md',
  showEmblem = false,
  tone = 'dark',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-5xl',
  }[size];

  const emblemSizes = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-11 h-11',
  }[size];

  const textColor = tone === 'light' ? 'text-white' : 'text-[#3C3C3B]';
  const accentColor = tone === 'light' ? 'text-white/80' : 'text-[#7D8A71]';

  return (
    <span
      className={`inline-flex items-center gap-2 select-none whitespace-nowrap shrink-0 ${className}`}
    >
      {showEmblem && (
        <svg
          viewBox="0 0 36 36"
          fill="none"
          aria-hidden="true"
          className={`${emblemSizes} ${accentColor} shrink-0`}
        >
          <path
            d="M18 32C18 32 18 18 18 6M18 32L7.5 11.5M18 32L28.5 11.5M18 32L4 21.5M18 32L32 21.5"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </svg>
      )}
      {variant === 'neo' ? (
        <span
          className={`font-display font-bold tracking-tight leading-none ${sizeClasses} ${textColor}`}
        >
          NEO
        </span>
      ) : (
        <span
          className={`font-display font-semibold tracking-tight leading-none ${sizeClasses} ${textColor}`}
        >
          Neo<span className="text-[#7D8A71]">Pay</span>
        </span>
      )}
    </span>
  );
};
