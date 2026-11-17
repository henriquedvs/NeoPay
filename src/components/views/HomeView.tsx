import React, { useMemo, useState } from 'react';
import {
  AdjustmentsHorizontalIcon,
  ArrowDownLeftIcon,
  ArrowRightIcon,
  ArrowsRightLeftIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  BellIcon,
  BuildingOffice2Icon,
  CalendarDaysIcon,
  ChartBarIcon,
  CheckIcon,
  CreditCardIcon,
  DocumentTextIcon,
  EyeIcon,
  EyeSlashIcon,
  GiftIcon,
  LightBulbIcon,
  ListBulletIcon,
  MagnifyingGlassIcon,
  QrCodeIcon,
  SparklesIcon,
  TruckIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import { AVAILABLE_SHORTCUTS, CARD_TIMELINE_STEPS, OFFICIAL_CARDS } from '../../data/neoSeed';
import {
  AccountSubMode,
  AppSection,
  EcosystemTab,
  PaymentSubMode,
  Transaction,
  UserAccount,
} from '../../types/neo';
import {
  formatBRL,
  formatFullDate,
  getGreetingByHour,
  isCreditAllowed,
  tierDisplayLabel,
} from '../../utils/formatters';
import { OfficialCardVisual } from '../OfficialCardVisual';
import { TransactionRow } from '../TransactionRow';

interface HomeViewProps {
  account: UserAccount;
  hideBalances: boolean;
  onToggleHideBalances: () => void;
  onMarkNotificationsRead: () => void;
  onUpdateShortcuts: (shortcuts: string[]) => void;
  onSelectTransaction: (tx: Transaction) => void;
  onOpenEcosystem: (tab: EcosystemTab) => void;
  onNavigate: (
    section: AppSection,
    paymentSubMode?: PaymentSubMode,
    accountSubMode?: AccountSubMode
  ) => void;
}

const MONTH_LABELS = ['Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov'];

export const HomeView: React.FC<HomeViewProps> = ({
  account,
  hideBalances,
  onToggleHideBalances,
  onMarkNotificationsRead,
  onUpdateShortcuts,
  onSelectTransaction,
  onOpenEcosystem,
  onNavigate,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [editingShortcuts, setEditingShortcuts] = useState(false);
  const [chartMetric, setChartMetric] = useState<'income' | 'spent'>('income');
  const [selectedPointIdx, setSelectedPointIdx] = useState(MONTH_LABELS.length - 1);

  const creditAllowed = isCreditAllowed(account);
  const greeting = getGreetingByHour();
  const unreadCount = account.notifications.filter((n) => !n.read).length;

  const initials = account.displayName
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const totalCaixinhas = useMemo(
    () => account.caixinhas.reduce((sum, c) => sum + c.currentAmount, 0),
    [account.caixinhas]
  );

  const availableCardLimit = useMemo(() => {
    if (!creditAllowed) return 0;
    return account.cards.reduce((sum, c) => {
      if (c.frozen || c.mode === 'debit_only') return sum;
      return sum + Math.max(0, c.limit - c.usedLimit);
    }, 0);
  }, [account.cards, creditAllowed]);

  const totalAccountBalance = account.balance + account.reservedBalance;

  const monthSummary = useMemo(() => {
    let entries = 0;
    let exits = 0;
    account.transactions.forEach((tx) => {
      if (tx.amount >= 0) entries += tx.amount;
      else exits += Math.abs(tx.amount);
    });
    return { entries, exits };
  }, [account.transactions]);

  const hasFinancialActivity =
    account.transactions.length > 0 || account.monthlyIncome > 0 || account.balance > 0;

  const chartPoints = useMemo(() => {
    const baseIncome = monthSummary.entries || account.monthlyIncome || 0;
    const baseSpent = monthSummary.exits || 0;
    const incomeWeights = [0.76, 0.86, 0.84, 0.94, 0.96, 1];
    const spentWeights = [0.82, 0.92, 0.78, 1.05, 0.9, 1];
    return MONTH_LABELS.map((label, idx) => ({
      label,
      income: Math.round(baseIncome * incomeWeights[idx]),
      spent: Math.round(baseSpent * spentWeights[idx]),
    }));
  }, [account.monthlyIncome, monthSummary.entries, monthSummary.exits]);

  const upcomingPayments = useMemo(
    () => account.scheduledPayments.filter((p) => !p.paid).slice(0, 3),
    [account.scheduledPayments]
  );

  const pendingCardOrders = useMemo(
    () => account.cardOrders.filter((o) => o.status !== 'active'),
    [account.cardOrders]
  );

  const svgChart = useMemo(() => {
    const width = 300;
    const height = 84;
    const padX = 8;
    const padY = 12;
    const values = chartPoints.map((p) => (chartMetric === 'income' ? p.income : p.spent));
    const min = Math.min(...values) * 0.85;
    const max = Math.max(1, Math.max(...values) * 1.08);

    const coords = values.map((val, idx) => {
      const x = padX + (idx * (width - padX * 2)) / (values.length - 1);
      const y = height - padY - ((val - min) / (max - min || 1)) * (height - padY * 2);
      return { x, y };
    });

    const linePath = coords
      .map((c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
      .join(' ');
    const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${height} L ${coords[0].x.toFixed(1)} ${height} Z`;

    return { width, height, coords, linePath, areaPath };
  }, [chartMetric, chartPoints]);

  const activePoint = chartPoints[selectedPointIdx];

  const shortcutMeta: Record<
    string,
    { label: string; icon: React.ComponentType<{ className?: string }>; primary?: boolean; action: () => void }
  > = {
    pix: {
      label: 'Pix',
      icon: QrCodeIcon,
      primary: true,
      action: () => onNavigate('payments', 'pix'),
    },
    boleto: {
      label: 'Boletos',
      icon: DocumentTextIcon,
      action: () => onNavigate('payments', 'boleto'),
    },
    ted: {
      label: 'Transferir',
      icon: ArrowsRightLeftIcon,
      action: () => onNavigate('payments', 'ted'),
    },
    cards: {
      label: 'Cartões',
      icon: CreditCardIcon,
      action: () => onNavigate('cards'),
    },
    rewards: {
      label: 'NeoRewards',
      icon: GiftIcon,
      action: () => onNavigate('rewards'),
    },
    finance: {
      label: 'Financeiro',
      icon: ChartBarIcon,
      action: () => onNavigate('finance'),
    },
    cofrinhos: {
      label: 'Cofrinhos',
      icon: BanknotesIcon,
      action: () => onOpenEcosystem('cofrinhos'),
    },
    agenda: {
      label: 'Agenda',
      icon: CalendarDaysIcon,
      action: () => onOpenEcosystem('agenda'),
    },
    documents: {
      label: 'Documentos',
      icon: DocumentTextIcon,
      action: () => onNavigate('documents'),
    },
    assinaturas: {
      label: 'Assinaturas',
      icon: SparklesIcon,
      action: () => onOpenEcosystem('assinaturas'),
    },
    transactions: {
      label: 'Histórico',
      icon: ListBulletIcon,
      action: () => onNavigate('transactions'),
    },
  };

  const toggleShortcut = (id: string) => {
    const exists = account.shortcuts.includes(id);
    if (exists && account.shortcuts.length <= 3) return;
    const next = exists
      ? account.shortcuts.filter((s) => s !== id)
      : [...account.shortcuts, id];
    onUpdateShortcuts(next);
  };

  const ecosystemItems: {
    id: string;
    title: string;
    subtitle: string;
    icon: React.ComponentType<{ className?: string }>;
    action: () => void;
  }[] = [
    {
      id: 'rewards',
      title: 'NeoRewards',
      subtitle: `${account.rewardsPoints.toLocaleString('pt-BR')} pts`,
      icon: GiftIcon,
      action: () => onNavigate('rewards'),
    },
    {
      id: 'cofrinhos',
      title: 'Neo Cofrinhos',
      subtitle: formatBRL(totalCaixinhas, hideBalances),
      icon: BanknotesIcon,
      action: () => onOpenEcosystem('cofrinhos'),
    },
    {
      id: 'assinaturas',
      title: 'Neo Assinaturas',
      subtitle: `${account.subscriptions.filter((s) => s.active).length} ativas`,
      icon: SparklesIcon,
      action: () => onOpenEcosystem('assinaturas'),
    },
    {
      id: 'agenda',
      title: 'Neo Agenda',
      subtitle: `${upcomingPayments.length} pendentes`,
      icon: CalendarDaysIcon,
      action: () => onOpenEcosystem('agenda'),
    },
    {
      id: 'documents',
      title: 'Documentos',
      subtitle: 'Extratos e comprovantes',
      icon: DocumentTextIcon,
      action: () => onNavigate('documents'),
    },
    {
      id: 'insights',
      title: 'Neo Insights',
      subtitle: 'Diagnóstico',
      icon: LightBulbIcon,
      action: () => onOpenEcosystem('insights'),
    },
    ...(account.tier === 'teen'
      ? [
          {
            id: 'familia',
            title: 'Neo Família',
            subtitle: 'Mesada 14+',
            icon: UsersIcon,
            action: () => onOpenEcosystem('familia'),
          },
        ]
      : account.tier === 'business'
      ? [
          {
            id: 'empresas',
            title: 'Neo Empresas',
            subtitle: 'Gestão PJ',
            icon: BuildingOffice2Icon,
            action: () => onOpenEcosystem('empresas'),
          },
        ]
      : []),
  ];

  const compact = account.settings?.appearance?.compactMode;

  return (
    <div className={compact ? 'space-y-4 pt-1' : 'space-y-5 pt-2'}>
      {/* Native App Top Row: Avatar + Greeting + Search + Eye Toggle + Notifications Bell */}
      <header className="flex items-center justify-between gap-2.5">
        <button
          type="button"
          onClick={() => onNavigate('account', undefined, 'overview')}
          className="flex items-center gap-3 text-left min-w-0 cursor-pointer group"
        >
          <div className="w-11 h-11 rounded-full bg-[#3C3C3B] text-white font-display font-bold text-sm flex items-center justify-center shrink-0 ring-2 ring-white shadow-sm group-hover:bg-[#7D8A71] transition-colors">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-[#6E6E6B] truncate">
              {tierDisplayLabel(account.tier)} · Ag {account.agency} · CC {account.accountNumber}
            </p>
            <h1 className="font-display font-bold text-lg sm:text-xl text-[#3C3C3B] truncate">
              {greeting}, {account.displayName}
            </h1>
          </div>
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('search')}
            className="min-h-[42px] min-w-[42px] rounded-full bg-white/80 border border-[#E0E0E0]/80 flex items-center justify-center text-[#3C3C3B] hover:bg-white transition-colors cursor-pointer"
            aria-label="Buscar no Neo"
          >
            <MagnifyingGlassIcon className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={onToggleHideBalances}
            className="min-h-[42px] min-w-[42px] rounded-full bg-white/80 border border-[#E0E0E0]/80 flex items-center justify-center text-[#3C3C3B] hover:bg-white transition-colors cursor-pointer"
            aria-label={hideBalances ? 'Revelar saldo' : 'Ocultar saldo'}
          >
            {hideBalances ? (
              <EyeSlashIcon className="w-5 h-5" />
            ) : (
              <EyeIcon className="w-5 h-5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowNotifications((s) => !s)}
            className={`relative min-h-[42px] min-w-[42px] rounded-full border flex items-center justify-center transition-colors cursor-pointer ${
              showNotifications
                ? 'bg-[#3C3C3B] text-white border-[#3C3C3B]'
                : 'bg-white/80 text-[#3C3C3B] border-[#E0E0E0]/80 hover:bg-white'
            }`}
            aria-label="Notificações importantes"
            aria-expanded={showNotifications}
          >
            <BellIcon className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#7D8A71] text-white text-[10px] font-semibold flex items-center justify-center tabular-nums">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Inline Notifications Quick Drawer */}
      {showNotifications && (
        <section className="neo-glass rounded-3xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display font-bold text-sm text-[#3C3C3B]">
              Notificações recentes
            </h2>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={onMarkNotificationsRead}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#7D8A71] hover:underline cursor-pointer"
                >
                  <CheckIcon className="w-3.5 h-3.5" />
                  <span>Lidas</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setShowNotifications(false);
                  onNavigate('notifications');
                }}
                className="text-xs font-medium text-[#3C3C3B] hover:underline cursor-pointer"
              >
                Ver central
              </button>
            </div>
          </div>

          {account.notifications.length === 0 ? (
            <p className="text-xs text-[#6E6E6B]">Nenhuma notificação no momento.</p>
          ) : (
            <div className="space-y-2">
              {account.notifications.slice(0, 3).map((notif) => (
                <button
                  key={notif.id}
                  type="button"
                  onClick={() => {
                    onMarkNotificationsRead();
                    setShowNotifications(false);
                    if (notif.targetSection) onNavigate(notif.targetSection);
                  }}
                  className={`w-full p-3 rounded-2xl border text-left transition-colors cursor-pointer ${
                    notif.read
                      ? 'bg-white/60 border-[#E0E0E0]/60'
                      : 'bg-white border-[#7D8A71]/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-[#3C3C3B]">{notif.title}</p>
                    <span className="text-[11px] text-[#6E6E6B] shrink-0">
                      {notif.category} · {notif.timeLabel}
                    </span>
                  </div>
                  <p className="text-xs text-[#6E6E6B] mt-0.5">{notif.body}</p>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Welcome & Activation Guide for Newly Registered Accounts */}
      {(account.isNewAccount || (account.cards.length === 0 && account.balance === 0)) && (
        <section className="neo-glass rounded-[28px] p-5 border border-[#7D8A71]/35 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium text-[#7D8A71]">
                Conta recém-aberta · Primeiros passos
              </p>
              <h2 className="font-display font-bold text-base text-[#3C3C3B] mt-0.5">
                Sua conta Neo começou do zero com segurança
              </h2>
              <p className="text-xs text-[#6E6E6B] mt-1 leading-relaxed">
                Seu saldo inicial é R$ 0,00 e nenhum cartão foi emitido ainda.{' '}
                {!creditAllowed &&
                  'Como conta Jovem 14+, você opera exclusivamente no débito e Pix, sem produtos de crédito.'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onNavigate('cards')}
              className="min-h-[40px] px-4 rounded-xl bg-[#3C3C3B] text-white text-xs font-medium cursor-pointer"
            >
              Solicitar primeiro cartão
            </button>
            <button
              type="button"
              onClick={() => onNavigate('account', undefined, 'overview')}
              className="min-h-[40px] px-4 rounded-xl bg-white/85 border border-[#E0E0E0] text-[#3C3C3B] text-xs font-medium cursor-pointer"
            >
              Adicionar saldo (demo)
            </button>
            <button
              type="button"
              onClick={() => onNavigate('payments', 'hub')}
              className="min-h-[40px] px-4 rounded-xl bg-[#7D8A71]/15 text-[#4B5842] text-xs font-medium cursor-pointer"
            >
              Explorar pagamentos
            </button>
          </div>
        </section>
      )}

      {/* Active Card Order Tracking Alert */}
      {pendingCardOrders.length > 0 && (
        <button
          type="button"
          onClick={() => onNavigate('cards')}
          className="w-full neo-glass rounded-2xl p-4 flex items-center justify-between gap-3 text-left hover:bg-white/90 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#7D8A71]/15 text-[#4B5842] flex items-center justify-center shrink-0">
              <TruckIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#3C3C3B] truncate">
                {OFFICIAL_CARDS[pendingCardOrders[0].cardId].name} ·{' '}
                {CARD_TIMELINE_STEPS.find((s) => s.status === pendingCardOrders[0].status)
                  ?.label || 'Em andamento'}
              </p>
              <p className="text-[11px] text-[#6E6E6B] truncate">
                {pendingCardOrders[0].status === 'ready_to_unlock'
                  ? 'Seu cartão chegou! Toque para desbloquear em 4 etapas.'
                  : `Previsão: ${pendingCardOrders[0].estimatedDelivery} · Toque para acompanhar`}
              </p>
            </div>
          </div>
          <ArrowRightIcon className="w-4 h-4 text-[#7D8A71] shrink-0" />
        </button>
      )}

      {/* Primary Account Balance Card */}
      <section className="neo-glass rounded-[28px] p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-[#6E6E6B]">Saldo disponível (demo)</span>
          <button
            type="button"
            onClick={() => onNavigate('transactions')}
            className="text-xs font-medium text-[#3C3C3B] hover:text-[#7D8A71] inline-flex items-center gap-1 cursor-pointer"
          >
            <span>Extrato</span>
            <ArrowRightIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        <p className="font-display font-bold text-3xl sm:text-4xl text-[#3C3C3B] tabular-nums tracking-tight mt-1">
          {formatBRL(account.balance, hideBalances)}
        </p>

        {/* Saldo em conta vs Disponível + Modo Jovem / Limite */}
        <div className="grid grid-cols-3 gap-2.5 mt-4 pt-3.5 border-t border-[#E0E0E0]/60 text-xs">
          <div>
            <span className="text-[#6E6E6B] block text-[11px]">Saldo em conta</span>
            <span className="font-semibold text-[#3C3C3B] tabular-nums">
              {formatBRL(totalAccountBalance, hideBalances)}
            </span>
          </div>
          <div>
            <span className="text-[#6E6E6B] block text-[11px]">
              {!creditAllowed ? 'Teto débito 14+' : 'Limite disponível'}
            </span>
            <span className="font-semibold text-[#3C3C3B] tabular-nums">
              {!creditAllowed
                ? formatBRL(account.teenMonthlyAllowanceLimit || 500, hideBalances)
                : formatBRL(availableCardLimit, hideBalances)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[#6E6E6B] block text-[11px]">Rendimento mês</span>
            <span className="inline-flex items-center gap-1 font-semibold text-[#2E7D32] tabular-nums">
              <ArrowTrendingUpIcon className="w-3.5 h-3.5" />
              +{formatBRL(account.monthlyYield, hideBalances)}
            </span>
          </div>
        </div>

        {/* Customizable Shortcuts Strip */}
        <div className="mt-4 pt-4 border-t border-[#E0E0E0]/60">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-medium text-[#6E6E6B]">Atalhos rápidos</span>
            <button
              type="button"
              onClick={() => setEditingShortcuts((e) => !e)}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-[#7D8A71] hover:underline cursor-pointer"
            >
              <AdjustmentsHorizontalIcon className="w-3.5 h-3.5" />
              <span>{editingShortcuts ? 'Concluir' : 'Personalizar'}</span>
            </button>
          </div>

          {editingShortcuts ? (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {AVAILABLE_SHORTCUTS.map((sc) => {
                const active = account.shortcuts.includes(sc.id);
                return (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => toggleShortcut(sc.id)}
                    className={`min-h-[38px] px-3 rounded-xl border text-xs font-medium flex items-center justify-between cursor-pointer ${
                      active
                        ? 'bg-[#3C3C3B] text-white border-[#3C3C3B]'
                        : 'bg-white/75 text-[#6E6E6B] border-[#E0E0E0]'
                    }`}
                  >
                    <span className="truncate">{sc.label}</span>
                    {active && <CheckIcon className="w-3.5 h-3.5 shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
              {account.shortcuts
                .filter((id) => shortcutMeta[id])
                .map((id) => {
                  const sc = shortcutMeta[id];
                  const Icon = sc.icon;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={sc.action}
                      className="flex flex-col items-center gap-1.5 min-w-[64px] shrink-0 cursor-pointer group"
                    >
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform active:scale-95 ${
                          sc.primary
                            ? 'bg-[#3C3C3B] text-white'
                            : 'bg-white/85 border border-[#E0E0E0]/85 text-[#3C3C3B] group-hover:bg-white'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-medium text-[#3C3C3B] whitespace-nowrap">
                        {sc.label}
                      </span>
                    </button>
                  );
                })}
            </div>
          )}
        </div>
      </section>

      {/* Cartões Favoritos or Empty Card CTA */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-display font-bold text-base text-[#3C3C3B]">
            Cartões
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('cards')}
            className="text-xs font-medium text-[#7D8A71] hover:underline cursor-pointer"
          >
            {account.cards.length === 0 ? 'Solicitar cartão' : 'Gerenciar todos'}
          </button>
        </div>

        {account.cards.length === 0 ? (
          <div className="neo-glass rounded-3xl p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#7D8A71]/15 text-[#4B5842] flex items-center justify-center shrink-0">
                <CreditCardIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="font-display font-bold text-sm text-[#3C3C3B]">
                  Nenhum cartão ativo ainda
                </p>
                <p className="text-xs text-[#6E6E6B]">
                  {creditAllowed
                    ? 'Peça seu Neo Sage, Neo Sky ou Neo Aura e acompanhe a entrega.'
                    : 'Solicite seu cartão de débito Neo 14+ com acompanhamento de entrega.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('cards')}
              className="min-h-[42px] px-4 rounded-xl bg-[#3C3C3B] text-white text-xs font-medium cursor-pointer"
            >
              Solicitar agora
            </button>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 sm:grid sm:grid-cols-3">
            {account.cards.map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() => onNavigate('cards')}
                className="min-w-[215px] sm:min-w-0 neo-glass rounded-2xl p-3.5 flex items-center gap-3.5 text-left hover:bg-white/90 transition-colors cursor-pointer shrink-0"
              >
                <OfficialCardVisual cardId={card.id} size="sm" frozen={card.frozen} />
                <div className="min-w-0">
                  <p className="font-display font-bold text-xs text-[#3C3C3B] truncate">
                    {card.label}
                  </p>
                  <p className="text-[11px] text-[#6E6E6B] tabular-nums mt-0.5">
                    •••• {card.last4}
                  </p>
                  <p className="text-[11px] font-medium text-[#7D8A71] tabular-nums mt-1">
                    {card.frozen
                      ? 'Bloqueado'
                      : !creditAllowed || card.mode === 'debit_only'
                      ? 'Somente Débito'
                      : card.isDefaultNeoPay
                      ? 'Principal NeoPay'
                      : formatBRL(Math.max(0, card.limit - card.usedLimit), hideBalances)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Meu mês + Próximos pagamentos */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <section className="lg:col-span-7 neo-glass rounded-[28px] p-5 sm:p-6 space-y-4">
          {!hasFinancialActivity ? (
            <div className="h-full flex flex-col justify-between space-y-4">
              <div>
                <p className="text-xs text-[#6E6E6B]">Meu mês</p>
                <p className="font-display font-bold text-2xl text-[#3C3C3B] tabular-nums mt-1">
                  {formatBRL(0, hideBalances)}
                </p>
                <p className="text-xs text-[#6E6E6B] mt-2 leading-relaxed">
                  Nenhuma movimentação registrada ainda. Assim que você adicionar saldo demonstrativo ou enviar um Pix, o gráfico mensal será atualizado automaticamente.
                </p>
              </div>
              <div className="pt-2 border-t border-[#E0E0E0]/60 flex items-center justify-between">
                <span className="text-[11px] text-[#6E6E6B]">Central Financeira Neo</span>
                <button
                  type="button"
                  onClick={() => onNavigate('finance')}
                  className="text-xs font-medium text-[#7D8A71] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Abrir Central Financeira</span>
                  <ArrowRightIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-[#6E6E6B]">Meu mês · {activePoint.label}</p>
                  <div className="flex items-baseline gap-3 mt-0.5">
                    <span className="font-display font-bold text-xl text-[#3C3C3B] tabular-nums">
                      {formatBRL(
                        chartMetric === 'income' ? activePoint.income : activePoint.spent,
                        hideBalances
                      )}
                    </span>
                    <span className="text-[11px] text-[#6E6E6B] tabular-nums">
                      Entradas {formatBRL(monthSummary.entries, hideBalances)} · Saídas{' '}
                      {formatBRL(monthSummary.exits, hideBalances)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-[#E0E0E0]/55">
                    <button
                      type="button"
                      onClick={() => setChartMetric('income')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                        chartMetric === 'income'
                          ? 'bg-white text-[#3C3C3B] shadow-sm'
                          : 'text-[#6E6E6B]'
                      }`}
                    >
                      Entradas
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartMetric('spent')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                        chartMetric === 'spent'
                          ? 'bg-white text-[#3C3C3B] shadow-sm'
                          : 'text-[#6E6E6B]'
                      }`}
                    >
                      Saídas
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <svg
                  viewBox={`0 0 ${svgChart.width} ${svgChart.height}`}
                  className="w-full h-20 overflow-visible"
                  role="img"
                  aria-label="Resumo financeiro mensal"
                >
                  <defs>
                    <linearGradient id="neoHomeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor={chartMetric === 'income' ? '#7D8A71' : '#3C3C3B'}
                        stopOpacity="0.25"
                      />
                      <stop
                        offset="100%"
                        stopColor={chartMetric === 'income' ? '#7D8A71' : '#3C3C3B'}
                        stopOpacity="0"
                      />
                    </linearGradient>
                  </defs>
                  <path d={svgChart.areaPath} fill="url(#neoHomeGrad)" />
                  <path
                    d={svgChart.linePath}
                    fill="none"
                    stroke={chartMetric === 'income' ? '#7D8A71' : '#3C3C3B'}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {svgChart.coords.map((pt, idx) => (
                    <circle
                      key={chartPoints[idx].label}
                      cx={pt.x}
                      cy={pt.y}
                      r={selectedPointIdx === idx ? 4.5 : 2.5}
                      fill={selectedPointIdx === idx ? '#3C3C3B' : '#FFFFFF'}
                      stroke={chartMetric === 'income' ? '#7D8A71' : '#3C3C3B'}
                      strokeWidth="2"
                      className="cursor-pointer"
                      onClick={() => setSelectedPointIdx(idx)}
                    />
                  ))}
                </svg>
                <div className="flex items-center justify-between px-1 mt-1">
                  {chartPoints.map((p, idx) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setSelectedPointIdx(idx)}
                      className={`text-[11px] font-medium cursor-pointer ${
                        selectedPointIdx === idx ? 'text-[#3C3C3B]' : 'text-[#6E6E6B]'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-[#E0E0E0]/60 flex items-center justify-between">
                <span className="text-[11px] text-[#6E6E6B]">
                  Orçamentos e relatórios mensais
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate('finance')}
                  className="text-xs font-medium text-[#7D8A71] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Abrir Central Financeira</span>
                  <ArrowRightIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}
        </section>

        {/* Próximos Pagamentos */}
        <section className="lg:col-span-5 neo-glass rounded-[28px] p-5 sm:p-6 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-bold text-sm text-[#3C3C3B]">
                Próximos pagamentos
              </h2>
              <button
                type="button"
                onClick={() => onOpenEcosystem('agenda')}
                className="text-xs font-medium text-[#7D8A71] hover:underline cursor-pointer"
              >
                Ver agenda
              </button>
            </div>

            {upcomingPayments.length === 0 ? (
              <p className="text-xs text-[#6E6E6B] py-4">
                Nenhuma conta pendente agendada.
              </p>
            ) : (
              <div className="space-y-2">
                {upcomingPayments.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onOpenEcosystem('agenda')}
                    className="w-full p-3 rounded-2xl bg-white/80 hover:bg-white border border-[#E0E0E0]/80 flex items-center justify-between gap-3 text-left cursor-pointer"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#3C3C3B] truncate">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-[#6E6E6B] truncate">
                        Vence em {formatFullDate(item.dueDateISO)} · {item.type.toUpperCase()}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-[#3C3C3B] tabular-nums shrink-0">
                      {formatBRL(item.amount, hideBalances)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => onNavigate('payments', 'boleto')}
            className="w-full min-h-[40px] rounded-xl bg-[#3C3C3B]/8 hover:bg-[#3C3C3B]/14 text-xs font-medium text-[#3C3C3B] cursor-pointer"
          >
            Agendar ou pagar boleto
          </button>
        </section>
      </div>

      {/* Ecossistema Neo Strip */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-display font-bold text-base text-[#3C3C3B]">
            Ecossistema Neo
          </h2>
          <button
            type="button"
            onClick={() => onOpenEcosystem('cofrinhos')}
            className="text-xs font-medium text-[#7D8A71] hover:underline cursor-pointer"
          >
            Explorar todos
          </button>
        </div>

        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
          {ecosystemItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={item.action}
                className="min-w-[162px] neo-glass rounded-2xl p-3.5 flex items-center gap-3 text-left hover:bg-white/90 transition-colors shrink-0 cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-[#7D8A71]/15 text-[#4B5842] flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#3C3C3B] truncate">
                    {item.title}
                  </p>
                  <p className="text-[11px] text-[#6E6E6B] truncate tabular-nums">
                    {item.subtitle}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Latest Activity */}
      <section className="neo-glass rounded-[28px] p-5 sm:p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-bold text-base text-[#3C3C3B]">
            Últimas transações
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('transactions')}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#7D8A71] hover:underline cursor-pointer"
          >
            <ArrowDownLeftIcon className="w-3.5 h-3.5" />
            <span>Histórico completo</span>
          </button>
        </div>

        {account.transactions.length === 0 ? (
          <p className="text-xs text-[#6E6E6B] py-4">
            Suas movimentações aparecerão aqui assim que você realizar um Pix, pagamento ou compra.
          </p>
        ) : (
          <div>
            {account.transactions.slice(0, 5).map((tx) => (
              <TransactionRow
                key={tx.id}
                transaction={tx}
                hideBalances={hideBalances}
                onSelect={onSelectTransaction}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
