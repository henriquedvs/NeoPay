import React, { useEffect, useState } from 'react';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BuildingOffice2Icon,
  ShieldCheckIcon,
  SparklesIcon,
  UserIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import { AnimatePresence, motion } from 'motion/react';
import { BRAND_BOARD_IMAGE } from '../data/neoSeed';
import { NeoLogo } from './NeoLogo';
import { OfficialCardVisual } from './OfficialCardVisual';

interface OnboardingFlowProps {
  onComplete: (initialTab: 'login' | 'register') => void;
}

const SLIDES = [
  {
    index: 0,
    kicker: '01 · Bem-vindo ao NEO',
    title: 'Seu banco digital leve, claro e no seu ritmo.',
    description:
      'Conta digital, cartões oficiais Visa e NeoPay integrados em uma experiência minimalista.',
  },
  {
    index: 1,
    kicker: '02 · Para cada momento',
    title: 'Contas feitas para jovens 14+, adultos e empresas.',
    description:
      'Limites inteligentes, autorização responsável para adolescentes e gestão completa para PJ.',
  },
  {
    index: 2,
    kicker: '03 · Ecossistema completo',
    title: 'Controle financeiro, Cofrinhos, Rewards e Neo Shop.',
    description:
      'Acompanhe seu mês em tempo real, organize metas e aproveite benefícios sem sair do app.',
  },
];

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setActiveSlide((prev) => Math.min(SLIDES.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        setActiveSlide((prev) => Math.max(0, prev - 1));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const current = SLIDES[activeSlide];
  const isLast = activeSlide === SLIDES.length - 1;

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full bg-[#F4F4F1] relative overflow-hidden flex flex-col items-center justify-center sm:p-6">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -top-32 -right-24 w-[380px] h-[380px] rounded-full bg-[#7D8A71]/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -bottom-36 -left-24 w-[380px] h-[380px] rounded-full bg-[#5CA5D6]/12 blur-3xl"
      />

      {/* Zero-scroll full-height app container */}
      <div className="relative z-10 w-full max-w-[900px] h-full sm:h-auto sm:max-h-[680px] sm:rounded-[32px] sm:neo-glass flex flex-col justify-between px-5 sm:px-8 pt-safe pb-safe sm:py-7 overflow-hidden">
        {/* Top Bar */}
        <header className="flex items-center justify-between pt-2 shrink-0">
          <NeoLogo variant="neo" size="md" showEmblem />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5" role="tablist" aria-label="Progresso">
              {SLIDES.map((s, idx) => (
                <button
                  key={s.kicker}
                  type="button"
                  role="tab"
                  aria-selected={idx === activeSlide}
                  aria-label={`Slide ${idx + 1}`}
                  onClick={() => setActiveSlide(idx)}
                  className={`h-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                    idx === activeSlide
                      ? 'w-7 bg-[#3C3C3B]'
                      : 'w-2 bg-[#3C3C3B]/20 hover:bg-[#3C3C3B]/40'
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => onComplete('login')}
              className="min-h-[38px] px-2.5 text-xs font-medium text-[#6E6E6B] hover:text-[#3C3C3B] cursor-pointer"
            >
              Pular
            </button>
          </div>
        </header>

        {/* Central Slide Stage (Fits cleanly inside viewport without scroll) */}
        <div className="flex-1 min-h-0 flex items-center py-3 sm:py-5">
          <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-7 items-center">
            {/* Visual Composition */}
            <div className="md:col-span-6 md:order-2 flex justify-center">
              <div className="w-full max-w-[360px] md:max-w-none rounded-3xl bg-white/70 border border-white/90 shadow-sm p-4 sm:p-5">
                <AnimatePresence mode="wait">
                  {activeSlide === 0 && (
                    <motion.div
                      key="onb-vis-0"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col items-center"
                    >
                      <div className="w-full flex items-center justify-between mb-2">
                        <NeoLogo variant="neopay" size="sm" />
                        <span className="text-[11px] text-[#6E6E6B]">Cartões Oficiais</span>
                      </div>
                      <div className="flex items-center justify-center py-2 sm:py-4 scale-90 sm:scale-100">
                        <div className="-rotate-12 -mr-11 translate-y-2">
                          <OfficialCardVisual cardId="sky" size="md" />
                        </div>
                        <div className="z-10 -translate-y-1">
                          <OfficialCardVisual cardId="sage" size="md" />
                        </div>
                        <div className="rotate-12 -ml-11 translate-y-2">
                          <OfficialCardVisual cardId="aura" size="md" />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeSlide === 1 && (
                    <motion.div
                      key="onb-vis-1"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-2.5"
                    >
                      <div className="rounded-2xl bg-white/90 border border-[#E0E0E0]/80 p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-[#7D8A71]/15 flex items-center justify-center text-[#3C3C3B]">
                            <UsersIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-display font-semibold text-xs text-[#3C3C3B]">
                              Adolescente 14+
                            </p>
                            <p className="text-[11px] text-[#6E6E6B]">Com responsável legal</p>
                          </div>
                        </div>
                        <OfficialCardVisual cardId="sky" size="xs" />
                      </div>

                      <div className="rounded-2xl bg-white/90 border border-[#E0E0E0]/80 p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-[#7D8A71]/15 flex items-center justify-center text-[#3C3C3B]">
                            <UserIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-display font-semibold text-xs text-[#3C3C3B]">
                              Pessoa Física 18+
                            </p>
                            <p className="text-[11px] text-[#6E6E6B]">Crédito, Pix e Cofrinhos</p>
                          </div>
                        </div>
                        <OfficialCardVisual cardId="sage" size="xs" />
                      </div>

                      <div className="rounded-2xl bg-[#3C3C3B] text-white p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-white/12 flex items-center justify-center">
                            <BuildingOffice2Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-display font-semibold text-xs">Pessoa Jurídica</p>
                            <p className="text-[11px] text-white/75">MEI, Ltda e empresas</p>
                          </div>
                        </div>
                        <OfficialCardVisual cardId="aura" size="xs" />
                      </div>
                    </motion.div>
                  )}

                  {activeSlide === 2 && (
                    <motion.div
                      key="onb-vis-2"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-2.5"
                    >
                      <div className="rounded-2xl overflow-hidden h-28 sm:h-36 relative">
                        <img
                          src={BRAND_BOARD_IMAGE}
                          alt="Ecossistema NEO"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover object-top"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#3C3C3B]/85 via-[#3C3C3B]/20 to-transparent flex flex-col justify-end p-3">
                          <NeoLogo variant="neopay" size="sm" tone="light" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="rounded-xl bg-white/90 p-2.5 flex items-center gap-2 text-[#3C3C3B]">
                          <SparklesIcon className="w-4 h-4 text-[#7D8A71] shrink-0" />
                          <span className="font-medium truncate">Neo Rewards &amp; Shop</span>
                        </div>
                        <div className="rounded-xl bg-white/90 p-2.5 flex items-center gap-2 text-[#3C3C3B]">
                          <ShieldCheckIcon className="w-4 h-4 text-[#7D8A71] shrink-0" />
                          <span className="font-medium truncate">Central Financeira</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Copy */}
            <div className="md:col-span-6 md:order-1">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSlide}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-2 sm:space-y-3"
                >
                  <p className="text-xs font-medium text-[#7D8A71]">{current.kicker}</p>
                  <h1
                    className="font-display font-semibold text-xl sm:text-3xl text-[#3C3C3B] leading-[1.14]"
                    style={{ textWrap: 'balance' }}
                  >
                    {current.title}
                  </h1>
                  <p className="text-xs sm:text-sm text-[#6E6E6B] leading-relaxed">
                    {current.description}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Bottom Thumb-Zone Controls (Always visible, zero scroll) */}
        <footer className="pt-2 pb-3 sm:pb-0 flex items-center justify-between gap-2.5 shrink-0">
          {activeSlide > 0 ? (
            <button
              type="button"
              onClick={() => setActiveSlide((p) => Math.max(0, p - 1))}
              className="min-h-[46px] px-4 rounded-2xl bg-white/85 border border-[#E0E0E0] text-xs sm:text-sm font-medium text-[#3C3C3B] inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              <span>Voltar</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onComplete('login')}
              className="min-h-[46px] px-4 rounded-2xl bg-white/85 border border-[#E0E0E0] text-xs sm:text-sm font-medium text-[#3C3C3B] cursor-pointer whitespace-nowrap"
            >
              Já tenho conta
            </button>
          )}

          {!isLast ? (
            <button
              type="button"
              onClick={() => setActiveSlide((p) => Math.min(SLIDES.length - 1, p + 1))}
              className="flex-1 sm:flex-none min-h-[46px] px-6 rounded-2xl bg-[#3C3C3B] text-white text-xs sm:text-sm font-medium inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Avançar</span>
              <ArrowRightIcon className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onComplete('register')}
              className="flex-1 sm:flex-none min-h-[46px] px-6 rounded-2xl bg-[#7D8A71] text-white text-xs sm:text-sm font-medium inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Começar a usar o Neo</span>
              <ArrowRightIcon className="w-4 h-4" />
            </button>
          )}
        </footer>
      </div>
    </div>
  );
};
