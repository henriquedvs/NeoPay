import { useEffect, useMemo, useState } from 'react';
import { AppShell } from './components/AppShell';
import { AuthFlow } from './components/AuthFlow';
import { OnboardingFlow } from './components/OnboardingFlow';
import { AccountView } from './components/views/AccountView';
import { CardsView } from './components/views/CardsView';
import { DocumentsView } from './components/views/DocumentsView';
import { EcosystemView } from './components/views/EcosystemView';
import { FinanceView } from './components/views/FinanceView';
import { GlobalSearchView } from './components/views/GlobalSearchView';
import { HomeView } from './components/views/HomeView';
import { NotificationsView } from './components/views/NotificationsView';
import { PaymentsView } from './components/views/PaymentsView';
import { RewardsView } from './components/views/RewardsView';
import { ShopView } from './components/views/ShopView';
import { TransactionDetailView } from './components/views/TransactionDetailView';
import { TransactionsView } from './components/views/TransactionsView';
import {
  buildCardTimeline,
  CARD_TIMELINE_STEPS,
  DEMO_ACCOUNTS,
  OFFICIAL_CARDS,
} from './data/neoSeed';
import {
  AccountSettings,
  AccountSubMode,
  AppSection,
  CardOrder,
  CartItem,
  EcosystemTab,
  NeoCard,
  OfficialCardId,
  OrderDeliveryStage,
  PaymentSubMode,
  QuickContact,
  RegistrationDraftNonSensitive,
  RewardCatalogItem,
  RewardMission,
  ShopCoupon,
  Transaction,
  UserAccount,
} from './types/neo';
import { generateAuthCode, isCreditAllowed } from './utils/formatters';

const NON_SENSITIVE_DRAFT_KEY = 'neo_reg_draft_nonsensitive_v1';
const SHOP_DELIVERY_ORDER: OrderDeliveryStage[] = [
  'Confirmado',
  'Em preparação',
  'Em transporte',
  'Entregue',
];

export default function App() {
  // Accounts & active session remain strictly in memory (never storing sensitive credentials/docs in localStorage)
  const [accounts, setAccounts] = useState<UserAccount[]>(DEMO_ACCOUNTS);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [stage, setStage] = useState<'onboarding' | 'auth' | 'app'>('onboarding');

  // Non-sensitive registration progress draft (excludes passwords, PINs, CPFs/CNPJs, card numbers)
  const [savedDraft, setSavedDraft] = useState<RegistrationDraftNonSensitive | null>(() => {
    try {
      const raw = localStorage.getItem(NON_SENSITIVE_DRAFT_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as RegistrationDraftNonSensitive;
      if (parsed && parsed.tier && typeof parsed.step === 'number') return parsed;
    } catch {
      // ignore storage errors
    }
    return null;
  });

  // Clean up any legacy sensitive localStorage entries on startup
  useEffect(() => {
    try {
      localStorage.removeItem('neo_bank_accounts_v2');
      localStorage.removeItem('neo_bank_active_account_id_v2');
    } catch {
      // ignore
    }
  }, []);

  const handleSaveDraft = (draft: RegistrationDraftNonSensitive | null) => {
    setSavedDraft(draft);
    try {
      if (draft) {
        localStorage.setItem(NON_SENSITIVE_DRAFT_KEY, JSON.stringify(draft));
      } else {
        localStorage.removeItem(NON_SENSITIVE_DRAFT_KEY);
      }
    } catch {
      // ignore
    }
  };

  const [authInitialTab, setAuthInitialTab] = useState<'login' | 'register'>('login');
  const [activeSection, setActiveSection] = useState<AppSection>('home');
  const [returnSection, setReturnSection] = useState<AppSection>('home');
  const [paymentSubMode, setPaymentSubMode] = useState<PaymentSubMode>('hub');
  const [accountSubMode, setAccountSubMode] = useState<AccountSubMode>('hub');
  const [ecosystemTab, setEcosystemTab] = useState<EcosystemTab>('cofrinhos');
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [prefillContact, setPrefillContact] = useState<QuickContact | null>(null);
  const [hideBalances, setHideBalances] = useState(false);

  const activeAccount = useMemo(
    () => accounts.find((a) => a.id === activeAccountId) || accounts[0],
    [accounts, activeAccountId]
  );

  // Sync optional dark theme setting cleanly when inside the app
  useEffect(() => {
    if (stage !== 'app' || !activeAccount) {
      document.documentElement.classList.remove('neo-theme-dark');
      return;
    }
    const themePref = activeAccount.settings?.appearance?.theme || 'light';
    const apply = () => {
      const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
      const isDark = themePref === 'dark' || (themePref === 'auto' && prefersDark);
      document.documentElement.classList.toggle('neo-theme-dark', isDark);
    };
    apply();
    if (themePref === 'auto' && window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener?.('change', apply);
      return () => mq.removeEventListener?.('change', apply);
    }
  }, [stage, activeAccount]);

  const selectedTransaction = useMemo(
    () => activeAccount?.transactions.find((t) => t.id === selectedTxId) || null,
    [activeAccount, selectedTxId]
  );

  const availableCategories = useMemo(() => {
    if (!activeAccount) return [];
    const base = [
      'Alimentação',
      'Transporte',
      'Assinaturas',
      'Transferências',
      'Compras',
      'Contas & Boletos',
      'Investimentos',
      'Recebimentos',
      'Cashback',
      ...activeAccount.customCategories,
    ];
    return Array.from(new Set(base));
  }, [activeAccount]);

  const updateActiveAccount = (updater: (acc: UserAccount) => UserAccount) => {
    if (!activeAccount) return;
    setAccounts((prev) =>
      prev.map((acc) => (acc.id === activeAccount.id ? updater(acc) : acc))
    );
  };

  const handleLoginSuccess = (acc: UserAccount) => {
    setActiveAccountId(acc.id);
    setHideBalances(acc.hideBalancesByDefault);
    setActiveSection('home');
    setStage('app');
  };

  const handleRegisterSuccess = (newAcc: UserAccount) => {
    setAccounts((prev) => [newAcc, ...prev]);
    setActiveAccountId(newAcc.id);
    setHideBalances(false);
    setActiveSection('home');
    setStage('app');
    handleSaveDraft(null);
  };

  const handleNavigate = (
    section: AppSection,
    nextPaymentMode?: PaymentSubMode,
    nextAccountMode?: AccountSubMode
  ) => {
    setActiveSection(section);
    if (nextPaymentMode) {
      setPaymentSubMode(nextPaymentMode);
    } else if (section === 'payments') {
      setPaymentSubMode('hub');
    }

    if (nextAccountMode) {
      setAccountSubMode(nextAccountMode);
    } else if (section === 'account') {
      setAccountSubMode('hub');
    }

    if (section !== 'payments') setPrefillContact(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectTransaction = (tx: Transaction) => {
    setReturnSection(activeSection);
    setSelectedTxId(tx.id);
    setActiveSection('transaction_detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenEcosystem = (tab: EcosystemTab) => {
    if (tab === 'rewards') {
      handleNavigate('rewards');
      return;
    }
    setEcosystemTab(tab);
    setActiveSection('ecosystem');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleMarkNotificationsRead = () => {
    updateActiveAccount((acc) => ({
      ...acc,
      notifications: acc.notifications.map((n) => ({ ...n, read: true })),
    }));
  };

  const handleToggleNotificationRead = (notifId: string) => {
    updateActiveAccount((acc) => ({
      ...acc,
      notifications: acc.notifications.map((n) =>
        n.id === notifId ? { ...n, read: !n.read } : n
      ),
    }));
  };

  const handleExecuteTransaction = (
    txInput: Omit<Transaction, 'id' | 'dateISO' | 'timeLabel' | 'authCode'>,
    payWithCardId?: OfficialCardId
  ): { ok: boolean; error?: string; created?: Transaction } => {
    if (!activeAccount) return { ok: false, error: 'Sessão não iniciada.' };
    const absAmount = Math.abs(txInput.amount);
    const creditAllowed = isCreditAllowed(activeAccount);

    if (payWithCardId) {
      const card = activeAccount.cards.find((c) => c.id === payWithCardId);
      if (!card) return { ok: false, error: 'Cartão não encontrado.' };
      if (card.frozen) {
        return {
          ok: false,
          error: `O cartão ${card.label} está bloqueado no modo demonstração.`,
        };
      }
      if (!creditAllowed || card.mode === 'debit_only') {
        if (activeAccount.balance < absAmount) {
          return { ok: false, error: 'Saldo demonstrativo insuficiente para débito.' };
        }
      } else if (card.limit - card.usedLimit < absAmount) {
        return { ok: false, error: `Limite demonstrativo insuficiente no ${card.label}.` };
      }
    } else if (txInput.amount < 0 && activeAccount.balance < absAmount) {
      return { ok: false, error: 'Saldo demonstrativo insuficiente para esta operação.' };
    }

    const created: Transaction = {
      ...txInput,
      id: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      dateISO: new Date().toISOString().slice(0, 10),
      timeLabel: `Hoje, ${new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })}`,
      authCode: generateAuthCode(),
    };

    updateActiveAccount((acc) => {
      let nextBalance = acc.balance;
      let nextCards = acc.cards;

      if (payWithCardId) {
        const usedCard = acc.cards.find((c) => c.id === payWithCardId);
        if (!isCreditAllowed(acc) || usedCard?.mode === 'debit_only') {
          nextBalance = Number((acc.balance - absAmount).toFixed(2));
        } else {
          nextCards = acc.cards.map((c) =>
            c.id === payWithCardId
              ? { ...c, usedLimit: Number((c.usedLimit + absAmount).toFixed(2)) }
              : c
          );
        }
      } else {
        nextBalance = Number((acc.balance + txInput.amount).toFixed(2));
      }

      return {
        ...acc,
        isNewAccount: false,
        balance: nextBalance,
        cards: nextCards,
        transactions: [created, ...acc.transactions],
      };
    });

    return { ok: true, created };
  };

  const handleSchedulePayment = (
    title: string,
    counterparty: string,
    amount: number,
    dueDateISO: string,
    type: 'pix' | 'boleto' | 'ted'
  ) => {
    updateActiveAccount((acc) => ({
      ...acc,
      scheduledPayments: [
        ...acc.scheduledPayments,
        {
          id: `sch-${Date.now()}`,
          title,
          counterparty,
          amount,
          dueDateISO,
          type,
          paid: false,
        },
      ],
    }));
  };

  const handleUpdateCard = (cardId: OfficialCardId, patch: Partial<NeoCard>) => {
    updateActiveAccount((acc) => {
      const creditAllowed = isCreditAllowed(acc);
      return {
        ...acc,
        cards: acc.cards.map((c) => {
          if (c.id !== cardId) return c;
          const sanitizedPatch: Partial<NeoCard> = creditAllowed
            ? patch
            : { ...patch, mode: 'debit_only', limit: 0, usedLimit: 0 };
          return { ...c, ...sanitizedPatch };
        }),
      };
    });
  };

  const handleRequestCardOrder = (cardId: OfficialCardId, deliveryAddress: string) => {
    if (!activeAccount) return;
    const creditAllowed = isCreditAllowed(activeAccount);
    const orderId = `ord-card-${Date.now()}`;
    const last4Preview = String(Math.floor(1000 + Math.random() * 9000));
    const newOrder: CardOrder = {
      id: orderId,
      cardId,
      variant: creditAllowed ? 'credit_debit' : 'debit_only',
      status: 'requested',
      requestedAt: new Date().toISOString().slice(0, 10),
      estimatedDelivery: 'Em até 5 dias úteis (demo)',
      trackingCode: `NEO${Math.floor(100000 + Math.random() * 899999)}BR`,
      deliveryAddress,
      last4Preview,
      timeline: buildCardTimeline('requested'),
    };

    updateActiveAccount((acc) => ({
      ...acc,
      cardOrders: [newOrder, ...acc.cardOrders],
      notifications: [
        {
          id: `notif-card-${Date.now()}`,
          title: `Solicitação do ${OFFICIAL_CARDS[cardId].name}`,
          body: `Pedido #${newOrder.trackingCode} recebido para entrega em ${deliveryAddress}.`,
          timeLabel: 'Agora',
          dateISO: new Date().toISOString().slice(0, 10),
          category: 'Cartões',
          importance: 'Média',
          read: false,
          targetSection: 'cards',
        },
        ...acc.notifications,
      ],
    }));
  };

  const handleAdvanceOrderStatus = (orderId: string) => {
    updateActiveAccount((acc) => ({
      ...acc,
      cardOrders: acc.cardOrders.map((order) => {
        if (order.id !== orderId) return order;
        const currIdx = CARD_TIMELINE_STEPS.findIndex((s) => s.status === order.status);
        if (currIdx < 0 || currIdx >= CARD_TIMELINE_STEPS.length - 1) return order;
        const nextStatus = CARD_TIMELINE_STEPS[currIdx + 1].status;
        return {
          ...order,
          status: nextStatus,
          timeline: buildCardTimeline(nextStatus),
        };
      }),
    }));
  };

  const handleUnlockCardOrder = (orderId: string) => {
    if (!activeAccount) return;
    const order = activeAccount.cardOrders.find((o) => o.id === orderId);
    if (!order) return;

    const creditAllowed = isCreditAllowed(activeAccount);
    const last4 = order.last4Preview;
    const vLast4 = String(Math.floor(1000 + Math.random() * 9000));

    const activatedCard: NeoCard = {
      id: order.cardId,
      label: OFFICIAL_CARDS[order.cardId].name,
      last4,
      virtualLast4: vLast4,
      virtualNickname: `Virtual ${OFFICIAL_CARDS[order.cardId].name}`,
      fullNumber: `4532 ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(
        1000 + Math.random() * 9000
      )} ${last4}`,
      expiry: '11/31',
      cvv: String(Math.floor(100 + Math.random() * 900)),
      holderName: activeAccount.fullName.toUpperCase().slice(0, 22),
      limit: !creditAllowed ? 0 : activeAccount.tier === 'business' ? 18000 : 6000,
      usedLimit: 0,
      frozen: false,
      isDefaultNeoPay: activeAccount.cards.length === 0,
      addedToWallet: false,
      onlinePurchasesEnabled: true,
      contactlessEnabled: true,
      mode: creditAllowed ? 'credit_debit' : 'debit_only',
      orderId: order.id,
    };

    updateActiveAccount((acc) => {
      const alreadyHasCard = acc.cards.some((c) => c.id === activatedCard.id);
      return {
        ...acc,
        isNewAccount: false,
        cards: alreadyHasCard ? acc.cards : [...acc.cards, activatedCard],
        cardOrders: acc.cardOrders.map((o) =>
          o.id === orderId ? { ...o, status: 'active' } : o
        ),
        notifications: [
          {
            id: `notif-unlock-${Date.now()}`,
            title: `${activatedCard.label} desbloqueado`,
            body: `Cartão final ${last4} pronto para uso${
              creditAllowed ? '' : ' no débito'
            }.`,
            timeLabel: 'Agora',
            dateISO: new Date().toISOString().slice(0, 10),
            category: 'Cartões',
            importance: 'Alta',
            read: false,
            targetSection: 'cards',
          },
          ...acc.notifications,
        ],
      };
    });
  };

  const handleSetDefaultNeoPay = (cardId: OfficialCardId) => {
    updateActiveAccount((acc) => ({
      ...acc,
      cards: acc.cards.map((c) => ({ ...c, isDefaultNeoPay: c.id === cardId })),
    }));
  };

  const handlePayCardInvoice = (cardId: OfficialCardId, amount: number): boolean => {
    if (!activeAccount || !isCreditAllowed(activeAccount)) return false;
    if (activeAccount.balance < amount) return false;
    const card = activeAccount.cards.find((c) => c.id === cardId);
    if (!card || card.mode === 'debit_only') return false;

    const tx: Transaction = {
      id: `tx-inv-${Date.now()}`,
      title: `Pagamento fatura · ${card.label}`,
      counterparty: 'Neo Cartões (Demo)',
      category: 'Contas & Boletos',
      type: 'card',
      amount: -amount,
      dateISO: new Date().toISOString().slice(0, 10),
      timeLabel: `Hoje, ${new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })}`,
      status: 'Demonstração',
      cardId,
      cardModeLabel: 'Liberação de fatura',
      authCode: generateAuthCode(),
    };

    updateActiveAccount((acc) => ({
      ...acc,
      balance: Number((acc.balance - amount).toFixed(2)),
      cards: acc.cards.map((c) =>
        c.id === cardId
          ? {
              ...c,
              usedLimit: Math.max(0, Number((c.usedLimit - amount).toFixed(2))),
              limit:
                amount > c.usedLimit
                  ? Number((c.limit + (amount - c.usedLimit)).toFixed(2))
                  : c.limit,
            }
          : c
      ),
      transactions: [tx, ...acc.transactions],
    }));

    return true;
  };

  const handleDepositToAccount = (amount: number) => {
    if (!activeAccount) return;
    const tx: Transaction = {
      id: `tx-dep-${Date.now()}`,
      title: 'Entrada demonstrativa',
      counterparty: activeAccount.fullName,
      category: 'Recebimentos',
      type: 'pix',
      amount,
      dateISO: new Date().toISOString().slice(0, 10),
      timeLabel: `Hoje, ${new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })}`,
      status: 'Demonstração',
      authCode: generateAuthCode(),
    };

    updateActiveAccount((acc) => ({
      ...acc,
      isNewAccount: false,
      balance: Number((acc.balance + amount).toFixed(2)),
      transactions: [tx, ...acc.transactions],
    }));
  };

  const handleCreateCaixinha = (name: string, goalAmount: number) => {
    updateActiveAccount((acc) => ({
      ...acc,
      caixinhas: [
        ...acc.caixinhas,
        {
          id: `cx-${Date.now()}`,
          name,
          goalAmount,
          currentAmount: 0,
          cdiPercent: 104,
          categoryLabel: 'Demonstração · 104% CDI',
        },
      ],
    }));
  };

  const handleMoveCaixinha = (
    caixinhaId: string,
    amount: number,
    direction: 'deposit' | 'withdraw'
  ): boolean => {
    if (!activeAccount) return false;
    const cx = activeAccount.caixinhas.find((c) => c.id === caixinhaId);
    if (!cx) return false;
    if (direction === 'deposit' && activeAccount.balance < amount) return false;
    if (direction === 'withdraw' && cx.currentAmount < amount) return false;

    const tx: Transaction = {
      id: `tx-cx-${Date.now()}`,
      title:
        direction === 'deposit'
          ? `Reserva Caixinha · ${cx.name}`
          : `Resgate Caixinha · ${cx.name}`,
      counterparty: 'Neo Caixinhas (Demo)',
      category: 'Investimentos',
      type: 'caixinha',
      amount: direction === 'deposit' ? -amount : amount,
      dateISO: new Date().toISOString().slice(0, 10),
      timeLabel: `Hoje, ${new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })}`,
      status: 'Demonstração',
      authCode: generateAuthCode(),
    };

    updateActiveAccount((acc) => ({
      ...acc,
      isNewAccount: false,
      balance: Number(
        (direction === 'deposit' ? acc.balance - amount : acc.balance + amount).toFixed(2)
      ),
      reservedBalance: Number(
        (direction === 'deposit'
          ? acc.reservedBalance + amount
          : Math.max(0, acc.reservedBalance - amount)
        ).toFixed(2)
      ),
      caixinhas: acc.caixinhas.map((item) =>
        item.id === caixinhaId
          ? {
              ...item,
              currentAmount: Number(
                (direction === 'deposit'
                  ? item.currentAmount + amount
                  : item.currentAmount - amount
                ).toFixed(2)
              ),
            }
          : item
      ),
      transactions: [tx, ...acc.transactions],
    }));

    return true;
  };

  const handleViewShopProduct = (itemId: string) => {
    updateActiveAccount((acc) => {
      const next = [itemId, ...acc.recentlyViewedShopIds.filter((id) => id !== itemId)].slice(
        0,
        8
      );
      return { ...acc, recentlyViewedShopIds: next };
    });
  };

  const handleAdvanceShopOrderStage = (orderId: string) => {
    updateActiveAccount((acc) => ({
      ...acc,
      shopOrders: acc.shopOrders.map((ord) => {
        if (ord.id !== orderId) return ord;
        const idx = SHOP_DELIVERY_ORDER.indexOf(ord.deliveryStage);
        if (idx < 0 || idx >= SHOP_DELIVERY_ORDER.length - 1) return ord;
        return { ...ord, deliveryStage: SHOP_DELIVERY_ORDER[idx + 1] };
      }),
    }));
  };

  const handleCheckoutCart = (
    cartItems: CartItem[],
    source: 'account' | OfficialCardId,
    deliveryAddress: string,
    coupon?: ShopCoupon
  ): { ok: boolean; error?: string; totalPaid: number; cashback: number } => {
    if (!activeAccount) return { ok: false, error: 'Sessão inválida.', totalPaid: 0, cashback: 0 };
    const creditAllowed = isCreditAllowed(activeAccount);
    if (!creditAllowed && source !== 'account') {
      const selectedCard = activeAccount.cards.find((c) => c.id === source);
      if (!selectedCard || selectedCard.mode !== 'debit_only') {
        return {
          ok: false,
          error: 'Contas 14+ operam apenas com saldo em conta ou cartão de débito.',
          totalPaid: 0,
          cashback: 0,
        };
      }
    }

    const subtotal = cartItems.reduce((sum, c) => sum + c.item.price * c.quantity, 0);
    const discount = coupon ? (subtotal * coupon.discountPercent) / 100 : 0;
    const totalPaid = Math.max(0, Number((subtotal - discount).toFixed(2)));
    const cashback = Number(
      cartItems
        .reduce(
          (sum, c) => sum + (c.item.price * c.quantity * c.item.cashbackPercent) / 100,
          0
        )
        .toFixed(2)
    );
    const itemsSummary = cartItems.map((c) => `${c.quantity}x ${c.item.title}`).join(', ');
    const payWithCard = source === 'account' ? undefined : source;

    const res = handleExecuteTransaction(
      {
        title: `Neo Shop · ${itemsSummary.slice(0, 42)}`,
        counterparty: 'Neo Shop',
        category: 'Compras',
        type: payWithCard ? 'card' : 'pix',
        amount: -totalPaid,
        status: 'Demonstração',
        cardId: payWithCard,
        cardModeLabel: payWithCard
          ? !creditAllowed
            ? `Débito · ${OFFICIAL_CARDS[payWithCard].name}`
            : `NeoPay ${OFFICIAL_CARDS[payWithCard].name}`
          : undefined,
        notes: coupon
          ? `Cupom ${coupon.code} aplicado · Cashback ${cashback.toFixed(2)}`
          : 'Pedido Neo Shop',
      },
      payWithCard
    );

    if (!res.ok) return { ok: false, error: res.error, totalPaid: 0, cashback: 0 };

    const cashbackTx: Transaction = {
      id: `tx-cb-${Date.now()}`,
      title: `Cashback · Neo Shop`,
      counterparty: 'Neo Shop (Demo)',
      category: 'Cashback',
      type: 'cashback',
      amount: cashback,
      dateISO: new Date().toISOString().slice(0, 10),
      timeLabel: `Hoje, ${new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })}`,
      status: 'Demonstração',
      authCode: generateAuthCode(),
    };

    const earnedPoints = Math.round(totalPaid);

    updateActiveAccount((acc) => ({
      ...acc,
      balance: Number((acc.balance + cashback).toFixed(2)),
      rewardsPoints: acc.rewardsPoints + earnedPoints,
      rewardsLedger: [
        {
          id: `rl-shop-${Date.now()}`,
          title: `Compra Neo Shop`,
          origin: itemsSummary.slice(0, 32),
          points: earnedPoints,
          kind: 'earn',
          dateISO: new Date().toISOString().slice(0, 10),
          status: 'Disponível',
        },
        ...acc.rewardsLedger,
      ],
      shopOrders: [
        {
          id: `ord-${Date.now()}`,
          dateISO: new Date().toISOString().slice(0, 10),
          itemsSummary,
          totalPaid,
          cashbackEarned: cashback,
          sourceLabel: payWithCard ? OFFICIAL_CARDS[payWithCard].name : 'Saldo em conta',
          cardId: payWithCard,
          couponApplied: coupon?.code,
          deliveryAddress,
          deliveryStage: 'Confirmado',
          trackingCode: `SHOP${Math.floor(100000 + Math.random() * 899999)}`,
        },
        ...acc.shopOrders,
      ],
      transactions: [cashbackTx, ...acc.transactions],
    }));

    return { ok: true, totalPaid, cashback };
  };

  const handleRedeemRewards = (pointsCost: number, cashCredit: number): boolean => {
    if (!activeAccount || activeAccount.rewardsPoints < pointsCost) return false;
    const today = new Date().toISOString().slice(0, 10);
    const tx: Transaction = {
      id: `tx-rw-${Date.now()}`,
      title: `NeoRewards · Resgate ${pointsCost} pts`,
      counterparty: 'Programa NeoRewards',
      category: 'Cashback',
      type: 'cashback',
      amount: cashCredit,
      dateISO: today,
      timeLabel: `Hoje, ${new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })}`,
      status: 'Demonstração',
      authCode: generateAuthCode(),
    };
    updateActiveAccount((acc) => ({
      ...acc,
      rewardsPoints: Math.max(0, acc.rewardsPoints - pointsCost),
      balance: Number((acc.balance + cashCredit).toFixed(2)),
      rewardsLedger: [
        {
          id: `rl-red-${Date.now()}`,
          title: `Resgate Cashback R$ ${cashCredit}`,
          origin: 'NeoRewards',
          points: -pointsCost,
          kind: 'redeem',
          dateISO: today,
          status: 'Concluído',
        },
        ...acc.rewardsLedger,
      ],
      rewardsRedemptions: [
        {
          id: `red-${Date.now()}`,
          title: `Cashback R$ ${cashCredit}`,
          category: 'Cashback',
          pointsCost,
          codeOrValue: `R$ ${cashCredit.toFixed(2).replace('.', ',')} creditado`,
          status: 'Utilizado',
          dateISO: today,
        },
        ...acc.rewardsRedemptions,
      ],
      transactions: [tx, ...acc.transactions],
    }));
    return true;
  };

  const handleRedeemRewardItem = (
    item: RewardCatalogItem
  ): { ok: boolean; error?: string } => {
    if (!activeAccount) return { ok: false, error: 'Sessão inválida.' };
    if (!isCreditAllowed(activeAccount) && !item.teenEligible) {
      return { ok: false, error: 'Benefício indisponível para contas 14+.' };
    }
    if (activeAccount.rewardsPoints < item.pointsCost) {
      return { ok: false, error: 'Pontos insuficientes para este resgate.' };
    }

    const today = new Date().toISOString().slice(0, 10);
    const cash = item.cashValue || 0;
    const generatedCode =
      item.couponCode || `NEO-${Math.floor(1000 + Math.random() * 8999)}-RW`;

    const cashbackTx: Transaction | null =
      cash > 0
        ? {
            id: `tx-rw-${Date.now()}`,
            title: `NeoRewards · ${item.title}`,
            counterparty: 'Programa NeoRewards',
            category: 'Cashback',
            type: 'cashback',
            amount: cash,
            dateISO: today,
            timeLabel: `Hoje, ${new Date().toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            })}`,
            status: 'Demonstração',
            authCode: generateAuthCode(),
          }
        : null;

    updateActiveAccount((acc) => ({
      ...acc,
      isNewAccount: cash > 0 ? false : acc.isNewAccount,
      rewardsPoints: Math.max(0, acc.rewardsPoints - item.pointsCost),
      balance: Number((acc.balance + cash).toFixed(2)),
      rewardsLedger: [
        {
          id: `rl-${Date.now()}`,
          title: `Resgate · ${item.title}`,
          origin: item.category,
          points: -item.pointsCost,
          kind: 'redeem',
          dateISO: today,
          status: 'Concluído',
        },
        ...acc.rewardsLedger,
      ],
      rewardsRedemptions: [
        {
          id: `red-${Date.now()}`,
          title: item.title,
          category: item.category,
          pointsCost: item.pointsCost,
          codeOrValue: cash > 0 ? `R$ ${cash.toFixed(2).replace('.', ',')} na conta` : generatedCode,
          status: cash > 0 ? 'Utilizado' : 'Disponível',
          dateISO: today,
        },
        ...acc.rewardsRedemptions,
      ],
      transactions: cashbackTx ? [cashbackTx, ...acc.transactions] : acc.transactions,
    }));

    return { ok: true };
  };

  const handleClaimMission = (mission: RewardMission): { ok: boolean; error?: string } => {
    if (!activeAccount) return { ok: false, error: 'Sessão inválida.' };
    if (activeAccount.completedMissions.includes(mission.id)) {
      return { ok: false, error: 'Missão já resgatada anteriormente.' };
    }
    if (!isCreditAllowed(activeAccount) && !mission.teenEligible) {
      return { ok: false, error: 'Missão indisponível para conta Jovem 14+.' };
    }

    const today = new Date().toISOString().slice(0, 10);
    updateActiveAccount((acc) => ({
      ...acc,
      rewardsPoints: acc.rewardsPoints + mission.rewardPoints,
      completedMissions: [...acc.completedMissions, mission.id],
      rewardsLedger: [
        {
          id: `rl-mis-${Date.now()}`,
          title: `Missão · ${mission.title}`,
          origin: 'NeoRewards Missões',
          points: mission.rewardPoints,
          kind: 'earn',
          dateISO: today,
          status: 'Disponível',
        },
        ...acc.rewardsLedger,
      ],
    }));
    return { ok: true };
  };

  const handleToggleRedemptionUsed = (redemptionId: string) => {
    updateActiveAccount((acc) => ({
      ...acc,
      rewardsRedemptions: acc.rewardsRedemptions.map((r) =>
        r.id === redemptionId
          ? { ...r, status: r.status === 'Disponível' ? 'Utilizado' : 'Disponível' }
          : r
      ),
    }));
  };

  const handleUpdateSettings = (patch: Partial<AccountSettings>) => {
    updateActiveAccount((acc) => ({
      ...acc,
      settings: {
        ...acc.settings,
        ...patch,
      },
    }));
  };

  const handleCreateSupportTicket = (subject: string) => {
    updateActiveAccount((acc) => ({
      ...acc,
      settings: {
        ...acc.settings,
        supportTickets: [
          {
            id: `tk-${Date.now()}`,
            subject,
            status: 'Aberto',
            dateLabel: 'Hoje',
          },
          ...acc.settings.supportTickets,
        ],
      },
    }));
  };

  const handlePayScheduled = (schId: string): boolean => {
    if (!activeAccount) return false;
    const item = activeAccount.scheduledPayments.find((s) => s.id === schId && !s.paid);
    if (!item || activeAccount.balance < item.amount) return false;

    const tx: Transaction = {
      id: `tx-sch-${Date.now()}`,
      title: item.title,
      counterparty: item.counterparty,
      category: item.type === 'boleto' ? 'Contas & Boletos' : 'Transferências',
      type: item.type,
      amount: -item.amount,
      dateISO: new Date().toISOString().slice(0, 10),
      timeLabel: `Hoje, ${new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })}`,
      status: 'Demonstração',
      authCode: generateAuthCode(),
    };

    updateActiveAccount((acc) => ({
      ...acc,
      isNewAccount: false,
      balance: Number((acc.balance - item.amount).toFixed(2)),
      scheduledPayments: acc.scheduledPayments.map((s) =>
        s.id === schId ? { ...s, paid: true } : s
      ),
      transactions: [tx, ...acc.transactions],
    }));
    return true;
  };

  if (stage === 'onboarding') {
    return (
      <OnboardingFlow
        onComplete={(tab) => {
          setAuthInitialTab(tab);
          setStage('auth');
        }}
      />
    );
  }

  if (stage === 'auth' || !activeAccount) {
    return (
      <AuthFlow
        initialTab={authInitialTab}
        accounts={accounts}
        savedDraft={savedDraft}
        onSaveDraft={handleSaveDraft}
        onBackToOnboarding={() => setStage('onboarding')}
        onLoginSuccess={handleLoginSuccess}
        onRegisterSuccess={handleRegisterSuccess}
      />
    );
  }

  return (
    <AppShell
      account={activeAccount}
      activeSection={activeSection}
      onSelectSection={handleNavigate}
    >
      {activeSection === 'home' && (
        <HomeView
          account={activeAccount}
          hideBalances={hideBalances}
          onToggleHideBalances={() => setHideBalances((h) => !h)}
          onMarkNotificationsRead={handleMarkNotificationsRead}
          onUpdateShortcuts={(shortcuts) =>
            updateActiveAccount((acc) => ({ ...acc, shortcuts }))
          }
          onSelectTransaction={handleSelectTransaction}
          onOpenEcosystem={handleOpenEcosystem}
          onNavigate={handleNavigate}
        />
      )}

      {activeSection === 'cards' && (
        <CardsView
          account={activeAccount}
          hideBalances={hideBalances}
          onUpdateCard={handleUpdateCard}
          onRequestCardOrder={handleRequestCardOrder}
          onAdvanceOrderStatus={handleAdvanceOrderStatus}
          onUnlockCardOrder={handleUnlockCardOrder}
          onSetDefaultNeoPay={handleSetDefaultNeoPay}
          onPayCardInvoice={handlePayCardInvoice}
          onSelectTransaction={handleSelectTransaction}
        />
      )}

      {activeSection === 'payments' && (
        <PaymentsView
          account={activeAccount}
          hideBalances={hideBalances}
          initialSubMode={paymentSubMode}
          prefillContact={prefillContact}
          onExecuteTransaction={handleExecuteTransaction}
          onSchedulePayment={handleSchedulePayment}
          onUpdateLimits={(day, night) =>
            updateActiveAccount((acc) => ({
              ...acc,
              dayPixLimit: day,
              nightPixLimit: night,
            }))
          }
          onAddPixKey={(newKey) =>
            updateActiveAccount((acc) => ({
              ...acc,
              pixKeys: acc.pixKeys.includes(newKey) ? acc.pixKeys : [...acc.pixKeys, newKey],
            }))
          }
          onRemovePixKey={(keyToRemove) =>
            updateActiveAccount((acc) => ({
              ...acc,
              pixKeys: acc.pixKeys.filter((k) => k !== keyToRemove),
            }))
          }
          onSelectTransaction={handleSelectTransaction}
        />
      )}

      {activeSection === 'finance' && (
        <FinanceView
          account={activeAccount}
          hideBalances={hideBalances}
          onBack={() => handleNavigate('home')}
          onAddCustomCategory={(name) =>
            updateActiveAccount((acc) => ({
              ...acc,
              customCategories: acc.customCategories.includes(name)
                ? acc.customCategories
                : [...acc.customCategories, name],
            }))
          }
          onSaveBudget={(category, limitAmount) =>
            updateActiveAccount((acc) => {
              const existing = acc.budgets.find((b) => b.category === category);
              return {
                ...acc,
                budgets: existing
                  ? acc.budgets.map((b) =>
                      b.category === category ? { ...b, limitAmount } : b
                    )
                  : [...acc.budgets, { id: `bg-${Date.now()}`, category, limitAmount }],
              };
            })
          }
          onOpenEcosystem={handleOpenEcosystem}
        />
      )}

      {activeSection === 'transactions' && (
        <TransactionsView
          account={activeAccount}
          hideBalances={hideBalances}
          onBack={() => handleNavigate('home')}
          onSelectTransaction={handleSelectTransaction}
          onOpenFinance={() => handleNavigate('finance')}
        />
      )}

      {activeSection === 'transaction_detail' && selectedTransaction && (
        <TransactionDetailView
          transaction={selectedTransaction}
          availableCategories={availableCategories}
          hideBalances={hideBalances}
          onUpdateCategory={(txId, nextCategory) =>
            updateActiveAccount((acc) => ({
              ...acc,
              transactions: acc.transactions.map((t) =>
                t.id === txId ? { ...t, category: nextCategory } : t
              ),
            }))
          }
          onBack={() =>
            handleNavigate(returnSection === 'transaction_detail' ? 'transactions' : returnSection)
          }
        />
      )}

      {activeSection === 'ecosystem' && (
        <EcosystemView
          account={activeAccount}
          initialTab={ecosystemTab}
          hideBalances={hideBalances}
          onBack={() => handleNavigate('home')}
          onOpenRewards={() => handleNavigate('rewards')}
          onCreateCaixinha={handleCreateCaixinha}
          onMoveCaixinha={handleMoveCaixinha}
          onRedeemRewards={handleRedeemRewards}
          onToggleSubscription={(subId) =>
            updateActiveAccount((acc) => ({
              ...acc,
              subscriptions: acc.subscriptions.map((s) =>
                s.id === subId ? { ...s, active: !s.active } : s
              ),
            }))
          }
          onPayScheduled={handlePayScheduled}
          onScheduleNew={(title, counterparty, amount, dueDateISO) =>
            handleSchedulePayment(title, counterparty, amount, dueDateISO, 'boleto')
          }
          onUpdateAllowanceLimit={(limit) =>
            updateActiveAccount((acc) => ({ ...acc, teenMonthlyAllowanceLimit: limit }))
          }
        />
      )}

      {activeSection === 'rewards' && (
        <RewardsView
          account={activeAccount}
          onBack={() => handleNavigate('home')}
          onRedeemRewardItem={handleRedeemRewardItem}
          onClaimMission={handleClaimMission}
          onToggleRedemptionUsed={handleToggleRedemptionUsed}
        />
      )}

      {activeSection === 'notifications' && (
        <NotificationsView
          account={activeAccount}
          onBack={() => handleNavigate('home')}
          onMarkAllRead={handleMarkNotificationsRead}
          onToggleRead={handleToggleNotificationRead}
          onNavigate={(section) => handleNavigate(section)}
        />
      )}

      {activeSection === 'documents' && (
        <DocumentsView
          account={activeAccount}
          hideBalances={hideBalances}
          onBack={() => handleNavigate('account', undefined, 'hub')}
          onSelectTransaction={handleSelectTransaction}
        />
      )}

      {activeSection === 'search' && (
        <GlobalSearchView
          account={activeAccount}
          hideBalances={hideBalances}
          onBack={() => handleNavigate('home')}
          onNavigate={handleNavigate}
          onOpenEcosystem={handleOpenEcosystem}
          onSelectTransaction={handleSelectTransaction}
        />
      )}

      {activeSection === 'shop' && (
        <ShopView
          account={activeAccount}
          hideBalances={hideBalances}
          onToggleFavorite={(itemId) =>
            updateActiveAccount((acc) => ({
              ...acc,
              shopFavorites: acc.shopFavorites.includes(itemId)
                ? acc.shopFavorites.filter((f) => f !== itemId)
                : [...acc.shopFavorites, itemId],
            }))
          }
          onViewProduct={handleViewShopProduct}
          onAdvanceShopOrderStage={handleAdvanceShopOrderStage}
          onCheckoutCart={handleCheckoutCart}
        />
      )}

      {activeSection === 'account' && (
        <AccountView
          account={activeAccount}
          allAccounts={accounts}
          hideBalances={hideBalances}
          initialSubMode={accountSubMode}
          onDepositToAccount={handleDepositToAccount}
          onUpdateProfile={(patch) =>
            updateActiveAccount((acc) => ({ ...acc, ...patch }))
          }
          onUpdateSettings={handleUpdateSettings}
          onUpdateCard={handleUpdateCard}
          onCreateSupportTicket={handleCreateSupportTicket}
          onRevokeDevice={(deviceId) =>
            updateActiveAccount((acc) => ({
              ...acc,
              devices: acc.devices.filter((d) => d.id !== deviceId),
            }))
          }
          onSwitchAccount={(target) => {
            setActiveAccountId(target.id);
            setHideBalances(target.hideBalancesByDefault);
            setActiveSection('home');
          }}
          onCloseAccount={() => {
            const closingId = activeAccount.id;
            setAccounts((prev) => {
              const remaining = prev.filter((a) => a.id !== closingId);
              return remaining.length > 0 ? remaining : DEMO_ACCOUNTS;
            });
            setActiveAccountId(null);
            setAuthInitialTab('login');
            setStage('auth');
          }}
          onOpenFinance={() => handleNavigate('finance')}
          onOpenDocuments={() => handleNavigate('documents')}
          onOpenEcosystem={handleOpenEcosystem}
          onLogout={() => {
            setActiveAccountId(null);
            setAuthInitialTab('login');
            setStage('auth');
          }}
        />
      )}
    </AppShell>
  );
}
