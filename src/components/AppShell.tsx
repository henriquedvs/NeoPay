import React from 'react';
import {
  ArrowsRightLeftIcon,
  BellIcon,
  ChartBarIcon,
  CreditCardIcon,
  DocumentTextIcon,
  GiftIcon,
  HomeIcon,
  ListBulletIcon,
  MagnifyingGlassIcon,
  ShoppingBagIcon,
  SparklesIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import {
  ArrowsRightLeftIcon as ArrowsRightLeftSolid,
  BellIcon as BellSolid,
  ChartBarIcon as ChartBarSolid,
  CreditCardIcon as CreditCardSolid,
  DocumentTextIcon as DocumentTextSolid,
  GiftIcon as GiftSolid,
  HomeIcon as HomeSolid,
  ListBulletIcon as ListBulletSolid,
  MagnifyingGlassIcon as MagnifyingGlassSolid,
  ShoppingBagIcon as ShoppingBagSolid,
  SparklesIcon as SparklesSolid,
  UserCircleIcon as UserCircleSolid,
} from '@heroicons/react/24/solid';
import { AnimatePresence, motion } from 'motion/react';
import { AccountSubMode, AppSection, PaymentSubMode, UserAccount } from '../types/neo';
import { tierDisplayLabel } from '../utils/formatters';
import { NeoLogo } from './NeoLogo';

interface AppShellProps {
  account: UserAccount;
  activeSection: AppSection;
  onSelectSection: (
    section: AppSection,
    paymentSubMode?: PaymentSubMode,
    accountSubMode?: AccountSubMode
  ) => void;
  children: React.ReactNode;
}

const BOTTOM_NAV_ITEMS: {
  id: AppSection;
  label: string;
  outline: React.ComponentType<{ className?: string }>;
  solid: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'home', label: 'Início', outline: HomeIcon, solid: HomeSolid },
  { id: 'cards', label: 'Cartões', outline: CreditCardIcon, solid: CreditCardSolid },
  {
    id: 'payments',
    label: 'Pagamentos',
    outline: ArrowsRightLeftIcon,
    solid: ArrowsRightLeftSolid,
  },
  { id: 'shop', label: 'Shop', outline: ShoppingBagIcon, solid: ShoppingBagSolid },
  { id: 'account', label: 'Conta', outline: UserCircleIcon, solid: UserCircleSolid },
];

const DESKTOP_RAIL_ITEMS = [
  BOTTOM_NAV_ITEMS[0],
  BOTTOM_NAV_ITEMS[1],
  BOTTOM_NAV_ITEMS[2],
  { id: 'finance' as AppSection, label: 'Financeiro', outline: ChartBarIcon, solid: ChartBarSolid },
  { id: 'transactions' as AppSection, label: 'Histórico', outline: ListBulletIcon, solid: ListBulletSolid },
  { id: 'rewards' as AppSection, label: 'NeoRewards', outline: GiftIcon, solid: GiftSolid },
  { id: 'ecosystem' as AppSection, label: 'Ecossistema', outline: SparklesIcon, solid: SparklesSolid },
  BOTTOM_NAV_ITEMS[3],
  { id: 'documents' as AppSection, label: 'Documentos', outline: DocumentTextIcon, solid: DocumentTextSolid },
  { id: 'notifications' as AppSection, label: 'Notificações', outline: BellIcon, solid: BellSolid },
  { id: 'search' as AppSection, label: 'Buscar', outline: MagnifyingGlassIcon, solid: MagnifyingGlassSolid },
  BOTTOM_NAV_ITEMS[4],
];

export const AppShell: React.FC<AppShellProps> = ({
  account,
  activeSection,
  onSelectSection,
  children,
}) => {
  const initials = account.displayName
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const reduceMotion = Boolean(account.settings?.appearance?.reduceMotion);
  const compactMode = Boolean(account.settings?.appearance?.compactMode);

  const handleNavTrigger = (section: AppSection) => {
    if (section === 'payments') {
      onSelectSection('payments', 'hub');
    } else if (section === 'account') {
      onSelectSection('account', undefined, 'hub');
    } else {
      onSelectSection(section);
    }
  };

  const isBottomTabActive = (itemId: AppSection) => {
    if (activeSection === itemId) return true;
    if (
      itemId === 'home' &&
      (activeSection === 'transactions' ||
        activeSection === 'transaction_detail' ||
        activeSection === 'finance' ||
        activeSection === 'ecosystem' ||
        activeSection === 'rewards' ||
        activeSection === 'notifications' ||
        activeSection === 'search')
    ) {
      return true;
    }
    if (itemId === 'account' && activeSection === 'documents') {
      return true;
    }
    return false;
  };

  return (
    <div className="min-h-[100dvh] w-full bg-[#F4F4F1] relative flex flex-col lg:flex-row">
      {/* Subtle neutral light background orbs */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -top-32 right-0 w-[420px] h-[420px] rounded-full bg-[#7D8A71]/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed bottom-0 left-40 w-[380px] h-[380px] rounded-full bg-[#5CA5D6]/8 blur-3xl"
      />

      {/* Desktop Compact App Rail */}
      <aside className="hidden lg:flex lg:flex-col lg:w-[236px] lg:shrink-0 lg:sticky lg:top-0 lg:h-[100dvh] p-4 z-20">
        <div className="neo-glass rounded-[28px] h-full flex flex-col justify-between p-4 overflow-y-auto no-scrollbar">
          <div className="space-y-4">
            <div className="px-2 pt-1 flex items-center justify-between">
              <NeoLogo variant="neo" size="lg" showEmblem />
            </div>

            <nav className="space-y-1" aria-label="Navegação do aplicativo">
              {DESKTOP_RAIL_ITEMS.map((item) => {
                const active =
                  activeSection === item.id ||
                  (item.id === 'transactions' && activeSection === 'transaction_detail');
                const Icon = active ? item.solid : item.outline;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavTrigger(item.id)}
                    className={`w-full min-h-[38px] px-3.5 py-1.5 rounded-2xl flex items-center gap-3 text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-[#3C3C3B] text-white shadow-sm'
                        : 'text-[#6E6E6B] hover:text-[#3C3C3B] hover:bg-white/75'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <button
            type="button"
            onClick={() => onSelectSection('account', undefined, 'overview')}
            className="w-full mt-3 p-3 rounded-2xl bg-white/80 hover:bg-white border border-[#E0E0E0]/80 flex items-center gap-3 text-left transition-colors cursor-pointer shrink-0"
          >
            <div className="w-9 h-9 rounded-full bg-[#7D8A71] text-white font-display font-bold text-xs flex items-center justify-center shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#3C3C3B] truncate">
                {account.displayName}
              </p>
              <p className="text-[11px] text-[#6E6E6B] truncate">
                {tierDisplayLabel(account.tier)}
              </p>
            </div>
          </button>
        </div>
      </aside>

      {/* Main App Viewport */}
      <main
        className={`flex-1 min-w-0 relative z-10 w-full max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8 pt-safe pb-24 ${
          compactMode ? 'lg:py-4' : 'lg:py-6'
        }`}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: reduceMotion ? 0 : 0.16, ease: [0.16, 1, 0.3, 1] }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Fixed Native 5-Tab Bottom Navigation (Mobile & Tablet) */}
      <nav
        aria-label="Navegação principal inferior"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/88 backdrop-blur-xl border-t border-[#E0E0E0]/85 pb-safe shadow-[0_-6px_24px_rgba(60,60,59,0.06)]"
      >
        <div className="grid grid-cols-5 items-center h-[60px] max-w-lg mx-auto px-1">
          {BOTTOM_NAV_ITEMS.map((item) => {
            const active = isBottomTabActive(item.id);
            const Icon = active ? item.solid : item.outline;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavTrigger(item.id)}
                className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-colors ${
                  active ? 'text-[#3C3C3B]' : 'text-[#6E6E6B]'
                }`}
              >
                <Icon className={`w-[22px] h-[22px] ${active ? 'text-[#7D8A71]' : ''}`} />
                <span className="text-[10px] font-medium tracking-tight truncate max-w-[64px]">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
