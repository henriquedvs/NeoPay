export type AccountTier = 'teen' | 'adult' | 'business';

export type OfficialCardId = 'sage' | 'sky' | 'aura';

export type AppSection =
  | 'home'
  | 'cards'
  | 'payments'
  | 'shop'
  | 'account'
  | 'transactions'
  | 'transaction_detail'
  | 'finance'
  | 'ecosystem'
  | 'rewards'
  | 'notifications'
  | 'documents'
  | 'search';

export type PaymentSubMode = 'hub' | 'pix' | 'boleto' | 'ted' | 'recarga' | 'consumo' | 'tributos';

export type AccountSubMode =
  | 'hub'
  | 'overview'
  | 'security'
  | 'cards_prefs'
  | 'notifications_prefs'
  | 'appearance'
  | 'privacy'
  | 'help'
  | 'documents'
  | 'terms';

export type EcosystemTab =
  | 'cofrinhos'
  | 'rewards'
  | 'assinaturas'
  | 'agenda'
  | 'insights'
  | 'familia'
  | 'empresas';

export type TransactionType =
  | 'pix'
  | 'card'
  | 'boleto'
  | 'ted'
  | 'cashback'
  | 'caixinha'
  | 'recarga'
  | 'tributo';

export type TransactionCategory =
  | 'Alimentação'
  | 'Transporte'
  | 'Assinaturas'
  | 'Transferências'
  | 'Compras'
  | 'Contas & Boletos'
  | 'Cashback'
  | 'Investimentos'
  | 'Recebimentos'
  | string;

export interface OfficialCardMeta {
  id: OfficialCardId;
  name: string;
  subtitle: string;
  imagePath: string;
  accentHex: string;
  tierLabel: string;
  debitOnlyLabel: string;
}

export type CardLifecycleStatus =
  | 'requested'
  | 'analyzing'
  | 'approved'
  | 'preparing'
  | 'shipped'
  | 'in_transit'
  | 'delivered'
  | 'ready_to_unlock'
  | 'active';

export interface CardOrderTimelineItem {
  status: CardLifecycleStatus;
  label: string;
  dateLabel: string;
  done: boolean;
}

export interface CardOrder {
  id: string;
  cardId: OfficialCardId;
  variant: 'debit_only' | 'credit_debit';
  status: CardLifecycleStatus;
  requestedAt: string;
  estimatedDelivery: string;
  trackingCode?: string;
  deliveryAddress: string;
  last4Preview: string;
  timeline: CardOrderTimelineItem[];
}

export interface NeoCard {
  id: OfficialCardId;
  label: string;
  last4: string;
  virtualLast4: string;
  virtualNickname?: string;
  fullNumber: string;
  expiry: string;
  cvv: string;
  holderName: string;
  limit: number;
  usedLimit: number;
  frozen: boolean;
  isDefaultNeoPay: boolean;
  addedToWallet: boolean;
  onlinePurchasesEnabled: boolean;
  contactlessEnabled: boolean;
  mode: 'credit_debit' | 'debit_only';
  orderId?: string;
}

export interface Transaction {
  id: string;
  title: string;
  counterparty: string;
  category: TransactionCategory;
  type: TransactionType;
  amount: number;
  dateISO: string;
  timeLabel: string;
  status: 'Demonstração' | 'Agendada' | 'Processando' | 'Concluída';
  cardId?: OfficialCardId;
  cardModeLabel?: string;
  pixKey?: string;
  authCode: string;
  notes?: string;
}

export type NotificationCategory = 'Pagamentos' | 'Cartões' | 'Segurança' | 'Conta';
export type NotificationImportance = 'Alta' | 'Média' | 'Normal';

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  timeLabel: string;
  dateISO: string;
  category: NotificationCategory;
  importance: NotificationImportance;
  read: boolean;
  targetSection?: AppSection;
}

export interface Caixinha {
  id: string;
  name: string;
  goalAmount: number;
  currentAmount: number;
  cdiPercent: number;
  categoryLabel: string;
}

export interface SubscriptionItem {
  id: string;
  name: string;
  category: string;
  amount: number;
  billingDay: number;
  cardId: OfficialCardId;
  active: boolean;
}

export interface ScheduledPayment {
  id: string;
  title: string;
  counterparty: string;
  amount: number;
  dueDateISO: string;
  type: 'pix' | 'boleto' | 'ted';
  paid: boolean;
}

export interface BudgetGoal {
  id: string;
  category: string;
  limitAmount: number;
}

export interface ConnectedDevice {
  id: string;
  deviceName: string;
  location: string;
  lastActive: string;
  current: boolean;
}

export type ShopCategory =
  | 'Tecnologia'
  | 'Eletrônicos'
  | 'Casa'
  | 'Moda'
  | 'Beleza'
  | 'Esportes'
  | 'Acessórios'
  | 'Entretenimento';

export interface ShopReview {
  id: string;
  author: string;
  rating: number;
  comment: string;
  dateLabel: string;
}

export interface ShopItem {
  id: string;
  title: string;
  brand: string;
  category: ShopCategory;
  price: number;
  originalPrice?: number;
  cashbackPercent: number;
  description: string;
  specs: string[];
  highlightColor: string;
  recommended?: boolean;
  popular?: boolean;
  dailyOffer?: boolean;
  neoExclusive?: boolean;
  rating: number;
  reviewCount: number;
  installmentsMax: number;
  deliveryEstimate: string;
  galleryLabels: string[];
  reviews: ShopReview[];
}

export interface ShopCoupon {
  code: string;
  label: string;
  discountPercent: number;
  minAmount: number;
}

export interface CartItem {
  item: ShopItem;
  quantity: number;
}

export type OrderDeliveryStage = 'Confirmado' | 'Em preparação' | 'Em transporte' | 'Entregue';

export interface ShopOrder {
  id: string;
  dateISO: string;
  itemsSummary: string;
  totalPaid: number;
  cashbackEarned: number;
  sourceLabel: string;
  cardId?: OfficialCardId;
  couponApplied?: string;
  deliveryAddress: string;
  deliveryStage: OrderDeliveryStage;
  trackingCode: string;
}

export type RewardCategory =
  | 'Cashback'
  | 'Descontos'
  | 'Cupons'
  | 'Produtos'
  | 'Gift cards'
  | 'Experiências'
  | 'Benefícios exclusivos';

export interface RewardCatalogItem {
  id: string;
  title: string;
  category: RewardCategory;
  pointsCost: number;
  description: string;
  cashValue?: number;
  couponCode?: string;
  teenEligible: boolean;
}

export interface RewardMission {
  id: string;
  title: string;
  description: string;
  rewardPoints: number;
  teenEligible: boolean;
  goalCount: number;
}

export interface RewardLedgerEntry {
  id: string;
  title: string;
  origin: string;
  points: number;
  kind: 'earn' | 'redeem';
  dateISO: string;
  status: 'Disponível' | 'Pendente' | 'Concluído';
}

export interface RewardRedemption {
  id: string;
  title: string;
  category: RewardCategory;
  pointsCost: number;
  codeOrValue: string;
  status: 'Disponível' | 'Utilizado';
  dateISO: string;
}

export interface QuickContact {
  id: string;
  name: string;
  initials: string;
  pixKey: string;
  bank: string;
  isNeo?: boolean;
}

export interface AccountSettings {
  twoFactorEnabled: boolean;
  biometricsEnabled: boolean;
  accessHistory: {
    id: string;
    event: string;
    device: string;
    dateLabel: string;
  }[];
  permissions: {
    camera: boolean;
    location: boolean;
    contacts: boolean;
  };
  notifications: {
    pix: boolean;
    purchases: boolean;
    transfers: boolean;
    payments: boolean;
    security: boolean;
    news: boolean;
  };
  appearance: {
    theme: 'light' | 'dark' | 'auto';
    compactMode: boolean;
    reduceMotion: boolean;
  };
  privacy: {
    analyticsConsent: boolean;
    partnerOffersConsent: boolean;
    personalizedTips: boolean;
  };
  supportTickets: {
    id: string;
    subject: string;
    status: 'Aberto' | 'Respondido';
    dateLabel: string;
  }[];
}

export interface RegistrationDraftNonSensitive {
  tier: AccountTier;
  step: number;
  displayHint: string;
  email: string;
  cityState: string;
  selectedCardId: OfficialCardId;
  savedAt: string;
}

export interface UserAccount {
  id: string;
  tier: AccountTier;
  isNewAccount?: boolean;
  fullName: string;
  displayName: string;
  document: string;
  email: string;
  phone: string;
  birthDate?: string;
  address?: string;
  guardianName?: string;
  guardianCpf?: string;
  companyTradeName?: string;
  agency: string;
  accountNumber: string;
  pixKeys: string[];
  balance: number;
  reservedBalance: number;
  monthlyIncome: number;
  monthlyYield: number;
  nightPixLimit: number;
  dayPixLimit: number;
  rewardsPoints: number;
  pendingPoints: number;
  expiringPoints: number;
  rewardsLedger: RewardLedgerEntry[];
  rewardsRedemptions: RewardRedemption[];
  completedMissions: string[];
  teenMonthlyAllowanceLimit?: number;
  password: string;
  pin4: string;
  hideBalancesByDefault: boolean;
  notificationsEnabled: boolean;
  cards: NeoCard[];
  cardOrders: CardOrder[];
  caixinhas: Caixinha[];
  transactions: Transaction[];
  notifications: AppNotification[];
  subscriptions: SubscriptionItem[];
  scheduledPayments: ScheduledPayment[];
  budgets: BudgetGoal[];
  customCategories: string[];
  devices: ConnectedDevice[];
  shopFavorites: string[];
  recentlyViewedShopIds: string[];
  shopOrders: ShopOrder[];
  shortcuts: string[];
  settings: AccountSettings;
}
