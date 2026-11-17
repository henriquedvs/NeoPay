import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  BoltIcon,
  BuildingLibraryIcon,
  CalendarDaysIcon,
  CameraIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  ClipboardDocumentIcon,
  ClockIcon,
  CreditCardIcon,
  DevicePhoneMobileIcon,
  DocumentCheckIcon,
  DocumentTextIcon,
  InformationCircleIcon,
  KeyIcon,
  MagnifyingGlassIcon,
  QrCodeIcon,
  ReceiptPercentIcon,
  ShareIcon,
  ShieldCheckIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { OFFICIAL_CARDS, QUICK_CONTACTS } from '../../data/neoSeed';
import {
  OfficialCardId,
  PaymentSubMode,
  QuickContact,
  Transaction,
  UserAccount,
} from '../../types/neo';
import {
  formatBRL,
  formatFullDate,
  formatSignedBRL,
  generateAuthCode,
  isCreditAllowed,
} from '../../utils/formatters';
import { NeoLogo } from '../NeoLogo';
import { OfficialCardVisual } from '../OfficialCardVisual';
import { TransactionRow } from '../TransactionRow';

interface PaymentsViewProps {
  account: UserAccount;
  hideBalances: boolean;
  initialSubMode?: PaymentSubMode;
  prefillContact?: QuickContact | null;
  onExecuteTransaction: (
    tx: Omit<Transaction, 'id' | 'dateISO' | 'timeLabel' | 'authCode'>,
    payWithCardId?: OfficialCardId
  ) => { ok: boolean; error?: string; created?: Transaction };
  onSchedulePayment: (
    title: string,
    counterparty: string,
    amount: number,
    dueDateISO: string,
    type: 'pix' | 'boleto' | 'ted'
  ) => void;
  onUpdateLimits: (dayLimit: number, nightLimit: number) => void;
  onAddPixKey: (newKey: string) => void;
  onRemovePixKey: (keyToRemove: string) => void;
  onSelectTransaction: (tx: Transaction) => void;
}

type PaymentScreen =
  | PaymentSubMode
  | 'recorrentes'
  | 'history';

interface PendingConfirmation {
  kind: 'pix' | 'boleto' | 'ted' | 'recarga' | 'consumo' | 'tributo';
  title: string;
  recipient: string;
  amount: number;
  methodLabel: string;
  dateISO: string;
  isScheduled: boolean;
  description: string;
  payWithCardId?: OfficialCardId;
  txPayload: Omit<Transaction, 'id' | 'dateISO' | 'timeLabel' | 'authCode'>;
}

const BRAZILIAN_BANKS = [
  '341 · Itaú Unibanco S.A.',
  '260 · Nu Pagamentos (Nubank)',
  '237 · Banco Bradesco S.A.',
  '001 · Banco do Brasil S.A.',
  '033 · Banco Santander Brasil',
  '077 · Banco Inter S.A.',
  '104 · Caixa Econômica Federal',
];

const UTILITY_PROVIDERS: Record<'Água' | 'Luz' | 'Gás' | 'Internet', string[]> = {
  Água: ['Sabesp · SP', 'CEDAE · RJ', 'Copasa · MG', 'Sanepar · PR'],
  Luz: ['Enel Distribuição', 'CPFL Energia', 'Light Serviços', 'Cemig'],
  Gás: ['Comgás', 'Naturgy', 'Gasmig'],
  Internet: ['Vivo Fibra', 'Claro Residencial', 'TIM Ultrafibra', 'Oi Fibra'],
};

const TAX_TYPES = [
  { id: 'DAS', label: 'DAS · Simples Nacional', recipient: 'Receita Federal · Simples Nacional' },
  { id: 'DARF', label: 'DARF · Imposto Federal', recipient: 'Secretaria da Receita Federal' },
  { id: 'IPVA', label: 'IPVA · Veículo Estadual', recipient: 'Secretaria da Fazenda Estadual' },
  { id: 'IPTU', label: 'IPTU · Imposto Municipal', recipient: 'Prefeitura Municipal' },
];

export const PaymentsView: React.FC<PaymentsViewProps> = ({
  account,
  hideBalances,
  initialSubMode = 'hub',
  prefillContact,
  onExecuteTransaction,
  onSchedulePayment,
  onUpdateLimits,
  onAddPixKey,
  onRemovePixKey,
  onSelectTransaction,
}) => {
  const creditAllowed = isCreditAllowed(account);
  const [screen, setScreen] = useState<PaymentScreen>(initialSubMode);
  const [serviceSearch, setServiceSearch] = useState('');

  // PIX state
  const [pixTab, setPixTab] = useState<
    'send' | 'receive' | 'scan' | 'keys' | 'scheduled' | 'history' | 'limits'
  >('send');
  const [pixKeyType, setPixKeyType] = useState<'cpf_cnpj' | 'phone' | 'email' | 'random'>('email');
  const [pixKey, setPixKey] = useState('');
  const [pixRecipient, setPixRecipient] = useState('');
  const [pixAmount, setPixAmount] = useState('');
  const [pixDesc, setPixDesc] = useState('');
  const [pixScheduleDate, setPixScheduleDate] = useState('');
  const [copiaColaInput, setCopiaColaInput] = useState('');
  const [qrSimulated, setQrSimulated] = useState(false);
  const [receiveAmount, setReceiveAmount] = useState('150.00');
  const [copiedPixCode, setCopiedPixCode] = useState(false);
  const [newKeyInput, setNewKeyInput] = useState('');

  // Boleto state
  const [boletoTab, setBoletoTab] = useState<'pay' | 'pending' | 'paid'>('pay');
  const [boletoCode, setBoletoCode] = useState('');
  const [boletoLookedUp, setBoletoLookedUp] = useState<{
    beneficiary: string;
    bank: string;
    dueDate: string;
    amount: number;
    status: string;
  } | null>(null);
  const [boletoBeneficiary, setBoletoBeneficiary] = useState('');
  const [boletoAmount, setBoletoAmount] = useState('');
  const [boletoScheduleDate, setBoletoScheduleDate] = useState('');
  const [boletoSource, setBoletoSource] = useState<'account' | OfficialCardId>('account');
  const [cameraScanActive, setCameraScanActive] = useState(false);

  // Transferências (Entre Neo, TED, Salvos, Agendados, Histórico)
  const [transferTab, setTransferTab] = useState<'neo' | 'ted' | 'saved' | 'history'>('neo');
  const [neoAccountTarget, setNeoAccountTarget] = useState('0001 · CC 88412-0');
  const [neoRecipientName, setNeoRecipientName] = useState('Mariana Costa');
  const [neoAmount, setNeoAmount] = useState('');
  const [neoDate, setNeoDate] = useState('');

  const [tedBank, setTedBank] = useState(BRAZILIAN_BANKS[0]);
  const [tedAgency, setTedAgency] = useState('');
  const [tedAccount, setTedAccount] = useState('');
  const [tedDoc, setTedDoc] = useState('');
  const [tedName, setTedName] = useState('');
  const [tedAmount, setTedAmount] = useState('');
  const [tedDate, setTedDate] = useState('');

  // Recarga
  const [carrier, setCarrier] = useState('Vivo');
  const [rechargePhone, setRechargePhone] = useState(account.phone);
  const [rechargeValue, setRechargeValue] = useState(30);
  const [rechargeSource, setRechargeSource] = useState<'account' | OfficialCardId>('account');

  // Contas de Consumo
  const [utilityCategory, setUtilityCategory] = useState<'Água' | 'Luz' | 'Gás' | 'Internet'>('Luz');
  const [utilityProvider, setUtilityProvider] = useState(UTILITY_PROVIDERS.Luz[0]);
  const [utilityInstallCode, setUtilityInstallCode] = useState('');
  const [utilityAmount, setUtilityAmount] = useState('');
  const [utilityDate, setUtilityDate] = useState('');

  // Tributos
  const [taxTypeId, setTaxTypeId] = useState(TAX_TYPES[0].id);
  const [taxBarcode, setTaxBarcode] = useState('');
  const [taxCompetence, setTaxCompetence] = useState('11/2026');
  const [taxAmount, setTaxAmount] = useState('');

  // Mandatory Integrated Confirmation + PIN + Receipt
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);
  const [pinConfirm, setPinConfirm] = useState('');
  const [formError, setFormError] = useState('');
  const [completedReceipt, setCompletedReceipt] = useState<Transaction | null>(null);
  const [scheduledSuccessMsg, setScheduledSuccessMsg] = useState('');
  const [sharedReceiptNotice, setSharedReceiptNotice] = useState(false);

  const todayISO = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    setScreen(initialSubMode);
    setPendingConfirmation(null);
    setCompletedReceipt(null);
    setScheduledSuccessMsg('');
    setFormError('');
  }, [initialSubMode]);

  useEffect(() => {
    if (prefillContact) {
      setScreen('pix');
      setPixTab('send');
      setPixKey(prefillContact.pixKey);
      setPixRecipient(prefillContact.name);
    }
  }, [prefillContact]);

  // Cards allowed for payments (teen cannot use credit cards)
  const eligiblePaymentCards = useMemo(
    () => account.cards.filter((c) => !c.frozen && (creditAllowed || c.mode === 'debit_only')),
    [account.cards, creditAllowed]
  );

  const paymentHistory = useMemo(
    () =>
      account.transactions.filter(
        (t) =>
          t.amount < 0 ||
          t.type === 'pix' ||
          t.type === 'boleto' ||
          t.type === 'ted' ||
          t.type === 'tributo' ||
          t.type === 'recarga'
      ),
    [account.transactions]
  );

  const pixHistory = useMemo(
    () => account.transactions.filter((t) => t.type === 'pix'),
    [account.transactions]
  );

  const boletoHistory = useMemo(
    () => account.transactions.filter((t) => t.type === 'boleto'),
    [account.transactions]
  );

  const transferHistory = useMemo(
    () =>
      account.transactions.filter(
        (t) => t.type === 'ted' || (t.type === 'pix' && t.amount < 0)
      ),
    [account.transactions]
  );

  const scheduledPixItems = useMemo(
    () => account.scheduledPayments.filter((p) => p.type === 'pix' && !p.paid),
    [account.scheduledPayments]
  );

  const scheduledBoletoItems = useMemo(
    () => account.scheduledPayments.filter((p) => p.type === 'boleto' && !p.paid),
    [account.scheduledPayments]
  );

  const pixCopiaEColaString = `00020126580014BR.GOV.BCB.PIX0136${
    account.pixKeys[0] || account.email
  }5204000053039865406${Number(receiveAmount || 0).toFixed(2)}5802BR5913NEO DEMO6009SAO PAULO6304`;

  // Hub catalog grouped into 4 categories
  const serviceCatalog = useMemo(
    () => [
      {
        category: 'Transferir',
        items: [
          {
            id: 'pix-send',
            title: 'Enviar Pix',
            desc: 'CPF/CNPJ, telefone, e-mail ou chave aleatória',
            icon: QrCodeIcon,
            action: () => {
              setScreen('pix');
              setPixTab('send');
            },
          },
          {
            id: 'neo-internal',
            title: 'Entre contas Neo',
            desc: 'Transferência imediata sem tarifa entre clientes',
            icon: UserGroupIcon,
            action: () => {
              setScreen('ted');
              setTransferTab('neo');
            },
          },
          {
            id: 'ted-bank',
            title: 'TED outros bancos',
            desc: 'Envio por agência, conta e documento',
            icon: BuildingLibraryIcon,
            action: () => {
              setScreen('ted');
              setTransferTab('ted');
            },
          },
          {
            id: 'saved-contacts',
            title: 'Contatos frequentes',
            desc: 'Favorecidos salvos e agenda rápida',
            icon: UserGroupIcon,
            action: () => {
              setScreen('ted');
              setTransferTab('saved');
            },
          },
        ],
      },
      {
        category: 'Pagar',
        items: [
          {
            id: 'boleto-pay',
            title: 'Pagar boleto',
            desc: 'Leitor simulado, código manual e consulta de dados',
            icon: DocumentTextIcon,
            action: () => {
              setScreen('boleto');
              setBoletoTab('pay');
            },
          },
          {
            id: 'consumo-pay',
            title: 'Contas de consumo',
            desc: 'Água, luz, gás e internet residencial',
            icon: BoltIcon,
            action: () => setScreen('consumo'),
          },
          {
            id: 'tributos-pay',
            title: 'Tributos e impostos',
            desc: 'DAS, DARF, IPVA e IPTU demonstrativos',
            icon: DocumentCheckIcon,
            action: () => setScreen('tributos'),
          },
          {
            id: 'pix-qr',
            title: 'Pix Copia e Cola / QR',
            desc: 'Cole o código EMV ou leia o QR Code',
            icon: CameraIcon,
            action: () => {
              setScreen('pix');
              setPixTab('scan');
            },
          },
        ],
      },
      {
        category: 'Recargas',
        items: [
          {
            id: 'recarga-cel',
            title: 'Recarga de celular',
            desc: 'Vivo, Claro, TIM e Oi com confirmação instantânea',
            icon: DevicePhoneMobileIcon,
            action: () => setScreen('recarga'),
          },
        ],
      },
      {
        category: 'Gerenciar',
        items: [
          {
            id: 'pix-receive',
            title: 'Receber Pix / Gerar QR',
            desc: 'Crie cobrança e copie seu código Pix',
            icon: QrCodeIcon,
            action: () => {
              setScreen('pix');
              setPixTab('receive');
            },
          },
          {
            id: 'pix-keys',
            title: 'Minhas chaves Pix',
            desc: 'Gerencie, adicione ou remova chaves cadastradas',
            icon: KeyIcon,
            action: () => {
              setScreen('pix');
              setPixTab('keys');
            },
          },
          {
            id: 'pix-limits',
            title: 'Limites Pix',
            desc: 'Configure teto diurno e noturno com segurança',
            icon: ShieldCheckIcon,
            action: () => {
              setScreen('pix');
              setPixTab('limits');
            },
          },
          {
            id: 'recorrentes',
            title: 'Recorrentes & Agendados',
            desc: 'Débitos agendados e assinaturas programadas',
            icon: CalendarDaysIcon,
            action: () => setScreen('recorrentes'),
          },
          {
            id: 'comprovantes',
            title: 'Comprovantes',
            desc: 'Consulte, baixe e compartilhe recibos',
            icon: ReceiptPercentIcon,
            action: () => setScreen('history'),
          },
        ],
      },
    ],
    []
  );

  const filteredCatalog = useMemo(() => {
    const q = serviceSearch.trim().toLowerCase();
    if (!q) return serviceCatalog;
    return serviceCatalog
      .map((group) => ({
        ...group,
        items: group.items.filter((it) =>
          `${group.category} ${it.title} ${it.desc}`.toLowerCase().includes(q)
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [serviceCatalog, serviceSearch]);

  // Handlers
  const openService = (fn: () => void) => {
    setFormError('');
    setCompletedReceipt(null);
    setScheduledSuccessMsg('');
    setPendingConfirmation(null);
    fn();
  };

  const handlePreparePix = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const numeric = Number(pixAmount.replace(',', '.'));
    if (!pixKey.trim()) {
      setFormError('Informe a chave Pix do destinatário.');
      return;
    }
    if (!numeric || numeric <= 0) {
      setFormError('Informe um valor válido maior que zero.');
      return;
    }
    const targetName = pixRecipient.trim() || pixKey.trim();
    const isScheduled = Boolean(pixScheduleDate && pixScheduleDate > todayISO);

    setPendingConfirmation({
      kind: 'pix',
      title: `Pix · ${targetName}`,
      recipient: `${targetName} (${pixKey.trim()})`,
      amount: numeric,
      methodLabel: isScheduled ? 'Pix Agendado (Saldo)' : 'Pix Instantâneo (Saldo)',
      dateISO: pixScheduleDate || todayISO,
      isScheduled,
      description: pixDesc.trim() || `Chave (${pixKeyType.toUpperCase()}) · Transferência Pix`,
      txPayload: {
        title: `Pix · ${targetName}`,
        counterparty: targetName,
        category: 'Transferências',
        type: 'pix',
        amount: -numeric,
        status: 'Demonstração',
        pixKey: pixKey.trim(),
        notes: pixDesc.trim() || 'Transferência Pix em modo demonstração',
      },
    });
    setPinConfirm('');
  };

  const handlePrepareCopiaCola = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (copiaColaInput.trim().length < 12) {
      setFormError('Cole um código Pix Copia e Cola válido ou simule a leitura QR.');
      return;
    }
    const parsedAmount = 84.5;
    setPendingConfirmation({
      kind: 'pix',
      title: 'Pix QR / Copia e Cola · Cafeteria Aurora',
      recipient: 'Cafeteria Aurora LTDA · CNPJ 44.120.310/0001-08',
      amount: parsedAmount,
      methodLabel: 'Pix QR Code (Saldo)',
      dateISO: todayISO,
      isScheduled: false,
      description: `Leitura QR / Copia e Cola`,
      txPayload: {
        title: 'Pix QR · Cafeteria Aurora',
        counterparty: 'Cafeteria Aurora LTDA',
        category: 'Alimentação',
        type: 'pix',
        amount: -parsedAmount,
        status: 'Demonstração',
        notes: 'Pagamento via Pix Copia e Cola demonstrativo',
      },
    });
    setPinConfirm('');
  };

  const handleLookupBoleto = () => {
    setFormError('');
    const digits = boletoCode.replace(/\D/g, '');
    if (digits.length < 10) {
      setFormError('Digite ao menos 10 números do código de barras para consultar.');
      return;
    }
    const resolvedBeneficiary =
      boletoBeneficiary.trim() ||
      (digits.startsWith('237') ? 'Enel Distribuição SP' : 'Administradora Central S.A.');
    const resolvedAmount = Number(boletoAmount.replace(',', '.')) || 245.9;
    setBoletoLookedUp({
      beneficiary: resolvedBeneficiary,
      bank: 'Banco Emissor · 237',
      dueDate: boletoScheduleDate || '2026-11-25',
      amount: resolvedAmount,
      status: 'Em aberto · Pronto para pagamento',
    });
    setBoletoBeneficiary(resolvedBeneficiary);
    if (!boletoAmount) setBoletoAmount(resolvedAmount.toFixed(2).replace('.', ','));
  };

  const handlePrepareBoleto = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const numeric = Number(boletoAmount.replace(',', '.'));
    if (boletoCode.replace(/\D/g, '').length < 10) {
      setFormError('Informe uma linha digitável válida ou toque em "Usar boleto de exemplo".');
      return;
    }
    if (!numeric || numeric <= 0) {
      setFormError('Informe o valor do boleto.');
      return;
    }
    const payWithCard = boletoSource === 'account' ? undefined : boletoSource;
    const isScheduled = Boolean(boletoScheduleDate && boletoScheduleDate > todayISO);
    const benef = boletoBeneficiary.trim() || 'Beneficiário de demonstração';

    setPendingConfirmation({
      kind: 'boleto',
      title: benef,
      recipient: benef,
      amount: numeric,
      methodLabel: payWithCard
        ? `Cartão ${OFFICIAL_CARDS[payWithCard].name}`
        : isScheduled
        ? 'Agendamento em conta'
        : 'Saldo em conta',
      dateISO: boletoScheduleDate || todayISO,
      isScheduled,
      description: `Boleto · ${boletoCode.slice(0, 22)}...`,
      payWithCardId: payWithCard,
      txPayload: {
        title: benef,
        counterparty: benef,
        category: 'Contas & Boletos',
        type: payWithCard ? 'card' : 'boleto',
        amount: -numeric,
        status: 'Demonstração',
        cardId: payWithCard,
        cardModeLabel: payWithCard
          ? `Boleto · ${OFFICIAL_CARDS[payWithCard].name}`
          : undefined,
        notes: `Código ${boletoCode.slice(0, 20)}...`,
      },
    });
    setPinConfirm('');
  };

  const handlePrepareTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (transferTab === 'neo') {
      const numeric = Number(neoAmount.replace(',', '.'));
      if (!neoRecipientName.trim() || !neoAccountTarget.trim()) {
        setFormError('Informe os dados da conta Neo favorecida.');
        return;
      }
      if (!numeric || numeric <= 0) {
        setFormError('Informe um valor válido.');
        return;
      }
      const isScheduled = Boolean(neoDate && neoDate > todayISO);
      setPendingConfirmation({
        kind: 'ted',
        title: `Entre contas Neo · ${neoRecipientName.trim()}`,
        recipient: `${neoRecipientName.trim()} · Banco Neo (${neoAccountTarget.trim()})`,
        amount: numeric,
        methodLabel: isScheduled ? 'Agendamento Entre Contas Neo' : 'Transferência Neo Instantânea',
        dateISO: neoDate || todayISO,
        isScheduled,
        description: 'Transferência interna sem tarifa',
        txPayload: {
          title: `Neo · ${neoRecipientName.trim()}`,
          counterparty: `${neoRecipientName.trim()} (Banco Neo)`,
          category: 'Transferências',
          type: 'pix',
          amount: -numeric,
          status: 'Demonstração',
          notes: `Entre contas Neo · ${neoAccountTarget}`,
        },
      });
    } else {
      const numeric = Number(tedAmount.replace(',', '.'));
      if (!tedName.trim() || !tedAgency.trim() || !tedAccount.trim() || !tedDoc.trim()) {
        setFormError('Preencha todos os dados do favorecido para TED.');
        return;
      }
      if (!numeric || numeric <= 0) {
        setFormError('Informe um valor válido.');
        return;
      }
      const isScheduled = Boolean(tedDate && tedDate > todayISO);
      const bankShort = tedBank.split('·')[1]?.trim() || tedBank;
      setPendingConfirmation({
        kind: 'ted',
        title: `TED · ${tedName.trim()}`,
        recipient: `${tedName.trim()} · ${bankShort} (Ag ${tedAgency} / CC ${tedAccount})`,
        amount: numeric,
        methodLabel: isScheduled ? 'TED Agendada' : 'TED em conta',
        dateISO: tedDate || todayISO,
        isScheduled,
        description: `CPF/CNPJ ${tedDoc}`,
        txPayload: {
          title: `TED · ${tedName.trim()}`,
          counterparty: `${tedName.trim()} (${bankShort})`,
          category: 'Transferências',
          type: 'ted',
          amount: -numeric,
          status: 'Demonstração',
          notes: `TED Ag ${tedAgency} · CC ${tedAccount}`,
        },
      });
    }
    setPinConfirm('');
  };

  const handlePrepareRecharge = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (rechargePhone.replace(/\D/g, '').length < 10) {
      setFormError('Informe um número de celular válido com DDD.');
      return;
    }
    const payWithCard = rechargeSource === 'account' ? undefined : rechargeSource;
    setPendingConfirmation({
      kind: 'recarga',
      title: `Recarga ${carrier} · ${rechargePhone}`,
      recipient: `${carrier} Brasil (${rechargePhone})`,
      amount: rechargeValue,
      methodLabel: payWithCard
        ? `Cartão ${OFFICIAL_CARDS[payWithCard].name}`
        : 'Saldo em conta',
      dateISO: todayISO,
      isScheduled: false,
      description: 'Recarga de celular pré-pago',
      payWithCardId: payWithCard,
      txPayload: {
        title: `Recarga ${carrier} · ${rechargePhone}`,
        counterparty: `${carrier} Brasil`,
        category: 'Assinaturas',
        type: payWithCard ? 'card' : 'recarga',
        amount: -rechargeValue,
        status: 'Demonstração',
        cardId: payWithCard,
        cardModeLabel: payWithCard
          ? `Recarga · ${OFFICIAL_CARDS[payWithCard].name}`
          : undefined,
      },
    });
    setPinConfirm('');
  };

  const handlePrepareConsumo = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const numeric = Number(utilityAmount.replace(',', '.'));
    if (utilityInstallCode.trim().length < 5) {
      setFormError('Informe o código de instalação ou código da fatura.');
      return;
    }
    if (!numeric || numeric <= 0) {
      setFormError('Informe o valor da conta.');
      return;
    }
    const isScheduled = Boolean(utilityDate && utilityDate > todayISO);
    setPendingConfirmation({
      kind: 'consumo',
      title: `${utilityCategory} · ${utilityProvider}`,
      recipient: utilityProvider,
      amount: numeric,
      methodLabel: isScheduled ? 'Agendamento em conta' : 'Débito em conta',
      dateISO: utilityDate || todayISO,
      isScheduled,
      description: `Conta de consumo (${utilityCategory}) · Código ${utilityInstallCode}`,
      txPayload: {
        title: `${utilityCategory} · ${utilityProvider}`,
        counterparty: utilityProvider,
        category: 'Contas & Boletos',
        type: 'boleto',
        amount: -numeric,
        status: 'Demonstração',
        notes: `Instalação ${utilityInstallCode}`,
      },
    });
    setPinConfirm('');
  };

  const handlePrepareTributo = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const numeric = Number(taxAmount.replace(',', '.'));
    const chosenTax = TAX_TYPES.find((t) => t.id === taxTypeId) || TAX_TYPES[0];
    if (taxBarcode.trim().length < 8) {
      setFormError('Informe o código da guia ou número de referência.');
      return;
    }
    if (!numeric || numeric <= 0) {
      setFormError('Informe o valor do tributo.');
      return;
    }
    setPendingConfirmation({
      kind: 'tributo',
      title: `${chosenTax.id} · Competência ${taxCompetence}`,
      recipient: chosenTax.recipient,
      amount: numeric,
      methodLabel: 'Pagamento de Guia em conta',
      dateISO: todayISO,
      isScheduled: false,
      description: `${chosenTax.label} · Guia ${taxBarcode.slice(0, 18)}`,
      txPayload: {
        title: `${chosenTax.id} · ${taxCompetence}`,
        counterparty: chosenTax.recipient,
        category: 'Contas & Boletos',
        type: 'tributo',
        amount: -numeric,
        status: 'Demonstração',
        notes: `Guia ${taxBarcode.slice(0, 22)}`,
      },
    });
    setPinConfirm('');
  };

  // Stage 2 Execution
  const handleConfirmOperation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingConfirmation) return;
    setFormError('');
    if (pinConfirm !== account.pin4) {
      setFormError(`PIN de confirmação inválido. (PIN demo: ${account.pin4})`);
      return;
    }

    if (pendingConfirmation.isScheduled) {
      onSchedulePayment(
        pendingConfirmation.title,
        pendingConfirmation.recipient,
        pendingConfirmation.amount,
        pendingConfirmation.dateISO,
        pendingConfirmation.kind === 'boleto' || pendingConfirmation.kind === 'consumo'
          ? 'boleto'
          : pendingConfirmation.kind === 'ted'
          ? 'ted'
          : 'pix'
      );
      setScheduledSuccessMsg(
        `Operação "${pendingConfirmation.title}" agendada na Neo Agenda para ${formatFullDate(
          pendingConfirmation.dateISO
        )}.`
      );
      setPendingConfirmation(null);
      setPinConfirm('');
      return;
    }

    const res = onExecuteTransaction(
      pendingConfirmation.txPayload,
      pendingConfirmation.payWithCardId
    );
    if (!res.ok) {
      setFormError(res.error || 'Não foi possível concluir a simulação.');
      return;
    }

    setCompletedReceipt(res.created || null);
    setPendingConfirmation(null);
    setPinConfirm('');
    setPixAmount('');
    setPixDesc('');
    setPixScheduleDate('');
    setBoletoCode('');
    setBoletoAmount('');
    setBoletoBeneficiary('');
    setBoletoLookedUp(null);
    setBoletoScheduleDate('');
    setTedAmount('');
    setNeoAmount('');
    setUtilityAmount('');
    setUtilityInstallCode('');
    setTaxAmount('');
    setTaxBarcode('');
  };

  const handleDownloadReceipt = (tx: Transaction) => {
    const lines = [
      'COMPROVANTE DEMONSTRATIVO NEOPAY — NEO',
      '---------------------------------------',
      `Título: ${tx.title}`,
      `Favorecido: ${tx.counterparty}`,
      `Valor: ${formatSignedBRL(tx.amount)}`,
      `Data: ${formatFullDate(tx.dateISO)} (${tx.timeLabel})`,
      `Autenticação: ${tx.authCode}`,
      `Status: ${tx.status}`,
    ].join('\n');
    const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comprovante-${tx.authCode}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShareReceipt = (tx: Transaction) => {
    const text = `Comprovante NEO (${tx.status}): ${tx.title} · ${formatBRL(
      Math.abs(tx.amount)
    )} · Autenticação ${tx.authCode}`;
    if (navigator.share) {
      navigator.share({ title: 'Comprovante NEO', text }).catch(() => {
        navigator.clipboard?.writeText(text);
      });
    } else {
      navigator.clipboard?.writeText(text);
    }
    setSharedReceiptNotice(true);
    setTimeout(() => setSharedReceiptNotice(false), 2200);
  };

  const screenTitleMap: Record<PaymentScreen, string> = {
    hub: 'Pagamentos',
    pix: 'Central Pix',
    boleto: 'Boletos',
    ted: 'Transferências',
    recarga: 'Recarga de celular',
    consumo: 'Contas de consumo',
    tributos: 'Tributos e impostos',
    recorrentes: 'Pagamentos recorrentes',
    history: 'Comprovantes',
  };

  return (
    <div className="space-y-5 pt-2">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {screen !== 'hub' && !pendingConfirmation && (
            <button
              type="button"
              onClick={() => {
                setScreen('hub');
                setCompletedReceipt(null);
                setScheduledSuccessMsg('');
                setFormError('');
              }}
              className="min-h-[42px] min-w-[42px] rounded-xl bg-white/85 border border-[#E0E0E0] flex items-center justify-center text-[#3C3C3B] cursor-pointer"
              aria-label="Voltar à Central de Pagamentos"
            >
              <ArrowLeftIcon className="w-4 h-4" />
            </button>
          )}
          <div>
            <h1 className="font-display font-bold text-2xl text-[#3C3C3B]">
              {screenTitleMap[screen]}
            </h1>
            <p className="text-xs text-[#6E6E6B] tabular-nums">
              Saldo disponível (demo):{' '}
              <strong className="text-[#3C3C3B]">{formatBRL(account.balance, hideBalances)}</strong>
            </p>
          </div>
        </div>
        <NeoLogo variant="neopay" size="sm" />
      </div>

      {/* Honest Demo Banner */}
      <div className="rounded-2xl bg-white/75 border border-[#E0E0E0]/85 px-4 py-2.5 flex items-center gap-2.5 text-xs text-[#6E6E6B]">
        <InformationCircleIcon className="w-4 h-4 text-[#7D8A71] shrink-0" />
        <span>
          Ambiente demonstrativo: toda operação passa por revisão e confirmação por PIN de 4 dígitos
          antes de atualizar seu extrato simulado.
        </span>
      </div>

      {/* HUB VIEW WITH SEARCH & 4 CATEGORIES */}
      {screen === 'hub' && !pendingConfirmation && !completedReceipt && (
        <div className="space-y-5">
          {/* Search Services */}
          <div className="relative">
            <MagnifyingGlassIcon className="w-4 h-4 text-[#6E6E6B] absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={serviceSearch}
              onChange={(e) => setServiceSearch(e.target.value)}
              placeholder="Buscar serviço (Pix, boleto, TED, recarga, água, tributos, comprovantes...)"
              className="w-full min-h-[46px] pl-11 pr-4 rounded-2xl bg-white/85 border border-[#E0E0E0] text-sm"
            />
          </div>

          {filteredCatalog.length === 0 ? (
            <div className="neo-glass rounded-3xl p-8 text-center">
              <p className="text-sm font-medium text-[#3C3C3B]">
                Nenhum serviço encontrado para "{serviceSearch}".
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {filteredCatalog.map((group) => (
                <section key={group.category} className="space-y-2.5">
                  <h2 className="font-display font-bold text-sm text-[#3C3C3B] px-1">
                    {group.category}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => openService(item.action)}
                          className="neo-glass rounded-2xl p-4 flex items-center justify-between gap-3 text-left hover:bg-white/95 transition-all cursor-pointer group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-[#7D8A71]/15 text-[#4B5842] flex items-center justify-center shrink-0">
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-display font-bold text-sm text-[#3C3C3B] truncate">
                                {item.title}
                              </p>
                              <p className="text-[11px] text-[#6E6E6B] line-clamp-2 mt-0.5">
                                {item.desc}
                              </p>
                            </div>
                          </div>
                          <ChevronRightIcon className="w-4 h-4 text-[#6E6E6B] group-hover:text-[#3C3C3B] shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MANDATORY CONFIRMATION SCREEN */}
      {pendingConfirmation && (
        <section className="neo-glass rounded-[28px] p-5 sm:p-7 space-y-5 border border-[#3C3C3B]/15">
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-[#E0E0E0]/70">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setPendingConfirmation(null);
                  setFormError('');
                }}
                className="min-h-[38px] min-w-[38px] rounded-xl bg-white border border-[#E0E0E0] flex items-center justify-center text-[#3C3C3B] cursor-pointer"
                aria-label="Voltar e editar"
              >
                <ArrowLeftIcon className="w-4 h-4" />
              </button>
              <div>
                <h2 className="font-display font-bold text-lg text-[#3C3C3B]">
                  Revisão da operação
                </h2>
                <p className="text-xs text-[#6E6E6B]">
                  Confirme os dados antes da execução demonstrativa
                </p>
              </div>
            </div>
            <NeoLogo variant="neopay" size="sm" />
          </div>

          <div className="rounded-2xl bg-white/85 border border-[#E0E0E0] p-4 sm:p-5 space-y-3 text-xs">
            <div className="flex items-baseline justify-between pb-3 border-b border-[#E0E0E0]/60">
              <span className="text-[#6E6E6B]">Valor da operação</span>
              <span className="font-display font-bold text-2xl text-[#3C3C3B] tabular-nums">
                {formatBRL(pendingConfirmation.amount)}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-[#6E6E6B] block">Favorecido / Destinatário</span>
                <span className="font-semibold text-[#3C3C3B]">
                  {pendingConfirmation.recipient}
                </span>
              </div>
              <div>
                <span className="text-[#6E6E6B] block">Meio / Origem</span>
                <span className="font-medium text-[#3C3C3B]">
                  {pendingConfirmation.methodLabel}
                </span>
              </div>
              <div>
                <span className="text-[#6E6E6B] block">Data</span>
                <span className="font-medium text-[#3C3C3B] tabular-nums">
                  {pendingConfirmation.isScheduled
                    ? `Agendado para ${formatFullDate(pendingConfirmation.dateISO)}`
                    : `Hoje (${formatFullDate(pendingConfirmation.dateISO)})`}
                </span>
              </div>
              <div>
                <span className="text-[#6E6E6B] block">Descrição</span>
                <span className="font-medium text-[#3C3C3B]">
                  {pendingConfirmation.description}
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleConfirmOperation} className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="sm:w-56">
                <label className="block text-xs font-medium text-[#3C3C3B] mb-1">
                  Confirme seu PIN de 4 dígitos ({account.pin4})
                </label>
                <input
                  type="password"
                  maxLength={4}
                  inputMode="numeric"
                  value={pinConfirm}
                  onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  className="w-full min-h-[46px] px-3.5 rounded-xl bg-white border border-[#E0E0E0] text-sm tracking-widest tabular-nums"
                />
              </div>
              <div className="flex flex-1 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setPendingConfirmation(null);
                    setFormError('');
                  }}
                  className="min-h-[46px] px-5 rounded-xl bg-white border border-[#E0E0E0] text-xs font-medium text-[#3C3C3B] cursor-pointer"
                >
                  Editar dados
                </button>
                <button
                  type="submit"
                  className="flex-1 min-h-[46px] px-6 rounded-xl bg-[#3C3C3B] text-white text-xs font-medium cursor-pointer"
                >
                  {pendingConfirmation.isScheduled ? 'Confirmar agendamento' : 'Confirmar e concluir'}
                </button>
              </div>
            </div>

            {formError && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
                {formError}
              </p>
            )}
          </form>
        </section>
      )}

      {/* SCHEDULED CONFIRMATION */}
      {scheduledSuccessMsg && !pendingConfirmation && (
        <section className="neo-glass rounded-[28px] p-5 border border-[#7D8A71]/45 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CalendarDaysIcon className="w-6 h-6 text-[#4B5842] shrink-0" />
            <div>
              <p className="font-display font-bold text-sm text-[#3C3C3B]">
                Agendamento salvo com sucesso
              </p>
              <p className="text-xs text-[#6E6E6B]">{scheduledSuccessMsg}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setScheduledSuccessMsg('')}
            className="px-4 py-2 rounded-xl bg-[#3C3C3B] text-white text-xs font-medium cursor-pointer"
          >
            Nova operação
          </button>
        </section>
      )}

      {/* COMPLETE RECEIPT SCREEN */}
      {completedReceipt && !pendingConfirmation && (
        <section className="neo-glass rounded-[28px] p-5 sm:p-6 border border-[#7D8A71]/40 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#7D8A71]/15 text-[#4B5842] flex items-center justify-center">
                <CheckCircleIcon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-display font-bold text-base text-[#3C3C3B]">
                  Operação demonstrativa concluída
                </h2>
                <p className="text-xs text-[#6E6E6B]">
                  Autenticação {completedReceipt.authCode} · {completedReceipt.timeLabel}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleDownloadReceipt(completedReceipt)}
                className="min-h-[38px] px-3.5 rounded-xl bg-white border border-[#E0E0E0] text-xs font-medium text-[#3C3C3B] inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                <span>Baixar</span>
              </button>
              <button
                type="button"
                onClick={() => handleShareReceipt(completedReceipt)}
                className="min-h-[38px] px-3.5 rounded-xl bg-white border border-[#E0E0E0] text-xs font-medium text-[#3C3C3B] inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ShareIcon className="w-4 h-4" />
                <span>{sharedReceiptNotice ? 'Copiado!' : 'Compartilhar'}</span>
              </button>
              <button
                type="button"
                onClick={() => setCompletedReceipt(null)}
                className="min-h-[38px] px-4 rounded-xl bg-[#3C3C3B] text-white text-xs font-medium cursor-pointer"
              >
                Concluir
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-2xl bg-white/80 border border-[#E0E0E0]/80 p-4 text-xs">
            <div>
              <span className="text-[#6E6E6B] block">Operação</span>
              <span className="font-semibold text-[#3C3C3B]">{completedReceipt.title}</span>
              <span className="block text-[11px] text-[#6E6E6B] mt-0.5">
                {completedReceipt.counterparty}
              </span>
            </div>
            <div>
              <span className="text-[#6E6E6B] block">Valor</span>
              <span className="font-display font-bold text-base text-[#3C3C3B] tabular-nums">
                {formatBRL(Math.abs(completedReceipt.amount))}
              </span>
            </div>
            {completedReceipt.cardId ? (
              <div className="flex items-center gap-2.5">
                <OfficialCardVisual cardId={completedReceipt.cardId} size="xs" />
                <div>
                  <span className="text-[#6E6E6B] block">Cartão</span>
                  <span className="font-medium text-[#3C3C3B]">
                    {OFFICIAL_CARDS[completedReceipt.cardId].name}
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <span className="text-[#6E6E6B] block">Saldo atualizado</span>
                <span className="font-display font-bold text-base text-[#3C3C3B] tabular-nums">
                  {formatBRL(account.balance, hideBalances)}
                </span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* COMPROVANTES / HISTORY SCREEN */}
      {!pendingConfirmation && screen === 'history' && (
        <section className="neo-glass rounded-[28px] p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display font-bold text-base text-[#3C3C3B]">
                Comprovantes e histórico de pagamentos
              </h2>
              <p className="text-xs text-[#6E6E6B]">
                Toque em uma operação para ver detalhes, baixar ou compartilhar
              </p>
            </div>
            <ClockIcon className="w-5 h-5 text-[#7D8A71]" />
          </div>
          {paymentHistory.length === 0 ? (
            <p className="text-xs text-[#6E6E6B] py-6 text-center">
              Nenhuma operação de pagamento registrada nesta conta ainda.
            </p>
          ) : (
            <div>
              {paymentHistory.map((tx) => (
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
      )}

      {/* RECORRENTES & AGENDADOS SCREEN */}
      {!pendingConfirmation && screen === 'recorrentes' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <section className="neo-glass rounded-[28px] p-5 sm:p-6 space-y-3">
            <h2 className="font-display font-bold text-base text-[#3C3C3B]">
              Débitos agendados ({account.scheduledPayments.filter((p) => !p.paid).length})
            </h2>
            {account.scheduledPayments.filter((p) => !p.paid).length === 0 ? (
              <p className="text-xs text-[#6E6E6B] py-4">Nenhum pagamento agendado em aberto.</p>
            ) : (
              <div className="space-y-2.5">
                {account.scheduledPayments
                  .filter((p) => !p.paid)
                  .map((p) => (
                    <div
                      key={p.id}
                      className="p-3.5 rounded-2xl bg-white/85 border border-[#E0E0E0] flex items-center justify-between gap-3"
                    >
                      <div>
                        <p className="text-xs font-semibold text-[#3C3C3B]">{p.title}</p>
                        <p className="text-[11px] text-[#6E6E6B]">
                          {p.counterparty} · Vence {formatFullDate(p.dueDateISO)}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-[#3C3C3B] tabular-nums">
                        {formatBRL(p.amount, hideBalances)}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </section>

          <section className="neo-glass rounded-[28px] p-5 sm:p-6 space-y-3">
            <h2 className="font-display font-bold text-base text-[#3C3C3B]">
              Pagamentos recorrentes ({account.subscriptions.filter((s) => s.active).length})
            </h2>
            {account.subscriptions.length === 0 ? (
              <p className="text-xs text-[#6E6E6B] py-4">
                Nenhuma recorrência ou assinatura ativa no momento.
              </p>
            ) : (
              <div className="space-y-2.5">
                {account.subscriptions.map((s) => (
                  <div
                    key={s.id}
                    className="p-3.5 rounded-2xl bg-white/85 border border-[#E0E0E0] flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-xs font-semibold text-[#3C3C3B]">{s.name}</p>
                      <p className="text-[11px] text-[#6E6E6B]">
                        Todo dia {s.billingDay} · {OFFICIAL_CARDS[s.cardId].name}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-[#3C3C3B] tabular-nums">
                      {formatBRL(s.amount, hideBalances)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* DEDICATED OPERATION FORMS */}
      {!pendingConfirmation && !completedReceipt && screen !== 'hub' && screen !== 'history' && screen !== 'recorrentes' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <section className="lg:col-span-8 neo-glass rounded-[28px] p-5 sm:p-6">
            {/* 1. PIX */}
            {screen === 'pix' && (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-1.5 border-b border-[#E0E0E0]/70 pb-3">
                  {(
                    [
                      { id: 'send', label: 'Enviar Pix' },
                      { id: 'receive', label: 'Receber / Gerar QR' },
                      { id: 'scan', label: 'Copia e Cola / Ler QR' },
                      { id: 'keys', label: 'Minhas Chaves' },
                      { id: 'scheduled', label: `Agendado (${scheduledPixItems.length})` },
                      { id: 'history', label: 'Histórico Pix' },
                      { id: 'limits', label: 'Limites Pix' },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setPixTab(t.id);
                        setFormError('');
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer ${
                        pixTab === t.id
                          ? 'bg-[#3C3C3B] text-white'
                          : 'bg-white/75 text-[#6E6E6B]'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {pixTab === 'send' && (
                  <form onSubmit={handlePreparePix} className="space-y-4">
                    <div>
                      <p className="text-xs font-medium text-[#3C3C3B] mb-2">
                        Tipo de chave Pix
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {(
                          [
                            { id: 'cpf_cnpj', label: 'CPF / CNPJ' },
                            { id: 'phone', label: 'Telefone' },
                            { id: 'email', label: 'E-mail' },
                            { id: 'random', label: 'Chave aleatória' },
                          ] as const
                        ).map((kt) => (
                          <button
                            key={kt.id}
                            type="button"
                            onClick={() => setPixKeyType(kt.id)}
                            className={`min-h-[38px] px-3 rounded-xl border text-xs font-medium cursor-pointer ${
                              pixKeyType === kt.id
                                ? 'bg-[#3C3C3B] text-white border-[#3C3C3B]'
                                : 'bg-white/80 text-[#3C3C3B] border-[#E0E0E0]'
                            }`}
                          >
                            {kt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-medium text-[#3C3C3B] mb-1">
                          Chave do destinatário
                        </label>
                        <input
                          type="text"
                          value={pixKey}
                          onChange={(e) => setPixKey(e.target.value)}
                          placeholder={
                            pixKeyType === 'cpf_cnpj'
                              ? '000.000.000-00'
                              : pixKeyType === 'phone'
                              ? '(11) 99999-9999'
                              : pixKeyType === 'email'
                              ? 'nome@email.com'
                              : 'Chave EVP aleatória'
                          }
                          className="w-full min-h-[44px] px-3.5 rounded-xl bg-white/85 border border-[#E0E0E0] text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#3C3C3B] mb-1">
                          Nome do destinatário
                        </label>
                        <input
                          type="text"
                          value={pixRecipient}
                          onChange={(e) => setPixRecipient(e.target.value)}
                          placeholder="Identificação do favorecido"
                          className="w-full min-h-[44px] px-3.5 rounded-xl bg-white/85 border border-[#E0E0E0] text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div>
                        <label className="block text-xs font-medium text-[#3C3C3B] mb-1">
                          Valor (R$)
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={pixAmount}
                          onChange={(e) => setPixAmount(e.target.value)}
                          placeholder="0,00"
                          className="w-full min-h-[44px] px-3.5 rounded-xl bg-white/85 border border-[#E0E0E0] text-sm font-semibold tabular-nums"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#3C3C3B] mb-1">
                          Agendar para (opcional)
                        </label>
                        <input
                          type="date"
                          min={todayISO}
                          value={pixScheduleDate}
                          onChange={(e) => setPixScheduleDate(e.target.value)}
                          className="w-full min-h-[44px] px-3.5 rounded-xl bg-white/85 border border-[#E0E0E0] text-sm tabular-nums"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#3C3C3B] mb-1">
                          Descrição (opcional)
                        </label>
                        <input
                          type="text"
                          value={pixDesc}
                          onChange={(e) => setPixDesc(e.target.value)}
                          placeholder="Ex: Jantar"
                          className="w-full min-h-[44px] px-3.5 rounded-xl bg-white/85 border border-[#E0E0E0] text-sm"
                        />
                      </div>
                    </div>

                    {formError && (
                      <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
                        {formError}
                      </p>
                    )}

                    <button
                      type="submit"
                      className="w-full sm:w-auto min-h-[46px] px-7 rounded-2xl bg-[#3C3C3B] text-white text-sm font-medium cursor-pointer"
                    >
                      Revisar transferência Pix
                    </button>
                  </form>
                )}

                {pixTab === 'receive' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-center">
                    <div className="p-5 rounded-2xl bg-white border border-[#E0E0E0] flex flex-col items-center gap-2">
                      <QrCodeIcon className="w-32 h-32 text-[#3C3C3B]" />
                      <span className="text-xs font-semibold text-[#3C3C3B] tabular-nums">
                        {formatBRL(Number(receiveAmount) || 0)}
                      </span>
                      <span className="text-[11px] text-[#6E6E6B]">QR Code demonstrativo</span>
                    </div>
                    <div className="space-y-3">
                      <label className="block text-xs font-medium text-[#3C3C3B]">
                        Definir valor da cobrança (R$)
                      </label>
                      <input
                        type="number"
                        value={receiveAmount}
                        onChange={(e) => setReceiveAmount(e.target.value)}
                        className="w-full min-h-[44px] px-3.5 rounded-xl bg-white border border-[#E0E0E0] text-sm tabular-nums"
                      />
                      <p className="text-[11px] text-[#6E6E6B] bg-[#F4F4F1] p-3 rounded-xl break-all font-mono">
                        {pixCopiaEColaString.slice(0, 76)}...
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(pixCopiaEColaString);
                          setCopiedPixCode(true);
                          setTimeout(() => setCopiedPixCode(false), 1800);
                        }}
                        className="w-full min-h-[44px] rounded-xl bg-[#7D8A71] text-white text-xs font-medium inline-flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <ClipboardDocumentIcon className="w-4 h-4" />
                        <span>{copiedPixCode ? 'Código copiado!' : 'Copiar Pix Copia e Cola'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {pixTab === 'scan' && (
                  <form onSubmit={handlePrepareCopiaCola} className="space-y-4">
                    <div className="rounded-2xl bg-[#3C3C3B] text-white p-5 flex flex-col items-center justify-center gap-2 text-center">
                      <CameraIcon className="w-8 h-8 text-white/80" />
                      <p className="text-xs font-medium">
                        {qrSimulated
                          ? 'QR Code detectado: Cafeteria Aurora LTDA · R$ 84,50'
                          : 'Leitor de QR Code (simulação segura)'}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setQrSimulated(true);
                          setCopiaColaInput(
                            '00020126580014BR.GOV.BCB.PIX0136cafeteria.aurora@neo.demo520400005303986540584.505802BR'
                          );
                        }}
                        className="min-h-[36px] px-4 rounded-xl bg-white text-[#3C3C3B] text-xs font-medium cursor-pointer"
                      >
                        Simular leitura de QR Code
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#3C3C3B] mb-1">
                        Ou cole o código Pix Copia e Cola
                      </label>
                      <textarea
                        rows={3}
                        value={copiaColaInput}
                        onChange={(e) => setCopiaColaInput(e.target.value)}
                        placeholder="Cole o código EMV / Copia e Cola aqui..."
                        className="w-full p-3.5 rounded-xl bg-white/85 border border-[#E0E0E0] text-xs font-mono"
                      />
                    </div>
                    {formError && (
                      <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
                        {formError}
                      </p>
                    )}
                    <button
                      type="submit"
                      className="min-h-[44px] px-6 rounded-2xl bg-[#3C3C3B] text-white text-xs font-medium cursor-pointer"
                    >
                      Ler e revisar pagamento
                    </button>
                  </form>
                )}

                {pixTab === 'keys' && (
                  <div className="space-y-4">
                    <div className="space-y-2.5">
                      {account.pixKeys.map((k) => (
                        <div
                          key={k}
                          className="flex items-center justify-between rounded-xl bg-white/85 border border-[#E0E0E0] px-4 py-3 text-xs"
                        >
                          <span className="truncate font-medium text-[#3C3C3B]">{k}</span>
                          <div className="flex items-center gap-3 shrink-0 ml-3">
                            <button
                              type="button"
                              onClick={() => navigator.clipboard?.writeText(k)}
                              className="font-medium text-[#7D8A71] cursor-pointer"
                            >
                              Copiar
                            </button>
                            {account.pixKeys.length > 1 && (
                              <button
                                type="button"
                                onClick={() => onRemovePixKey(k)}
                                className="font-medium text-red-600 cursor-pointer"
                              >
                                Remover
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-3 border-t border-[#E0E0E0]/65 flex flex-wrap gap-2">
                      <input
                        type="text"
                        value={newKeyInput}
                        onChange={(e) => setNewKeyInput(e.target.value)}
                        placeholder="Nova chave (e-mail ou celular)"
                        className="flex-1 min-w-[180px] min-h-[42px] px-3.5 rounded-xl bg-white border border-[#E0E0E0] text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newKeyInput.trim()) {
                            onAddPixKey(newKeyInput.trim());
                            setNewKeyInput('');
                          }
                        }}
                        className="min-h-[42px] px-4 rounded-xl bg-white border border-[#E0E0E0] text-xs font-medium text-[#3C3C3B] cursor-pointer"
                      >
                        Cadastrar chave
                      </button>
                      <button
                        type="button"
                        onClick={() => onAddPixKey(generateAuthCode().toLowerCase() + '-evp')}
                        className="min-h-[42px] px-4 rounded-xl bg-[#3C3C3B] text-white text-xs font-medium cursor-pointer"
                      >
                        Gerar aleatória
                      </button>
                    </div>
                  </div>
                )}

                {pixTab === 'scheduled' && (
                  <div className="space-y-2.5">
                    {scheduledPixItems.length === 0 ? (
                      <p className="text-xs text-[#6E6E6B] py-4">
                        Nenhum Pix agendado. Escolha uma data futura na aba Enviar Pix.
                      </p>
                    ) : (
                      scheduledPixItems.map((item) => (
                        <div
                          key={item.id}
                          className="p-3.5 rounded-2xl bg-white/85 border border-[#E0E0E0] flex items-center justify-between"
                        >
                          <div>
                            <p className="text-xs font-semibold text-[#3C3C3B]">{item.title}</p>
                            <p className="text-[11px] text-[#6E6E6B]">
                              Agendado para {formatFullDate(item.dueDateISO)}
                            </p>
                          </div>
                          <span className="text-xs font-bold text-[#3C3C3B] tabular-nums">
                            {formatBRL(item.amount, hideBalances)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {pixTab === 'history' && (
                  <div>
                    {pixHistory.length === 0 ? (
                      <p className="text-xs text-[#6E6E6B] py-4">Nenhuma operação Pix registrada.</p>
                    ) : (
                      pixHistory.map((tx) => (
                        <TransactionRow
                          key={tx.id}
                          transaction={tx}
                          hideBalances={hideBalances}
                          onSelect={onSelectTransaction}
                        />
                      ))
                    )}
                  </div>
                )}

                {pixTab === 'limits' && (
                  <div className="space-y-4">
                    <div className="rounded-2xl bg-white/85 border border-[#E0E0E0] p-4 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="inline-flex items-center gap-1.5 font-medium text-[#3C3C3B]">
                          <ShieldCheckIcon className="w-4 h-4 text-[#7D8A71]" />
                          Limite Diurno (06h–20h)
                        </span>
                        <span className="font-semibold tabular-nums">
                          {formatBRL(account.dayPixLimit, hideBalances)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={500}
                        max={account.tier === 'business' ? 50000 : 15000}
                        step={500}
                        value={account.dayPixLimit}
                        onChange={(e) =>
                          onUpdateLimits(Number(e.target.value), account.nightPixLimit)
                        }
                        className="w-full accent-[#7D8A71] cursor-pointer"
                      />
                    </div>

                    <div className="rounded-2xl bg-white/85 border border-[#E0E0E0] p-4 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="inline-flex items-center gap-1.5 font-medium text-[#3C3C3B]">
                          <ShieldCheckIcon className="w-4 h-4 text-[#7D8A71]" />
                          Limite Noturno (20h–06h)
                        </span>
                        <span className="font-semibold tabular-nums">
                          {formatBRL(account.nightPixLimit, hideBalances)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={200}
                        max={account.tier === 'business' ? 20000 : 5000}
                        step={100}
                        value={account.nightPixLimit}
                        onChange={(e) =>
                          onUpdateLimits(account.dayPixLimit, Number(e.target.value))
                        }
                        className="w-full accent-[#7D8A71] cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. BOLETOS */}
            {screen === 'boleto' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2 border-b border-[#E0E0E0]/70 pb-3">
                  <button
                    type="button"
                    onClick={() => setBoletoTab('pay')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-medium cursor-pointer ${
                      boletoTab === 'pay' ? 'bg-[#3C3C3B] text-white' : 'bg-white/75 text-[#6E6E6B]'
                    }`}
                  >
                    Pagar / Agendar
                  </button>
                  <button
                    type="button"
                    onClick={() => setBoletoTab('pending')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-medium cursor-pointer ${
                      boletoTab === 'pending'
                        ? 'bg-[#3C3C3B] text-white'
                        : 'bg-white/75 text-[#6E6E6B]'
                    }`}
                  >
                    Pendentes ({scheduledBoletoItems.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setBoletoTab('paid')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-medium cursor-pointer ${
                      boletoTab === 'paid'
                        ? 'bg-[#3C3C3B] text-white'
                        : 'bg-white/75 text-[#6E6E6B]'
                    }`}
                  >
                    Pagos ({boletoHistory.length})
                  </button>
                </div>

                {boletoTab === 'pay' && (
                  <form onSubmit={handlePrepareBoleto} className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCameraScanActive((v) => !v);
                          setBoletoCode('23793.38128 60000.000003 00000.000408 1 99120000024590');
                          setBoletoBeneficiary('Enel Distribuição SP');
                          setBoletoAmount('245,90');
                        }}
                        className="min-h-[38px] px-3.5 rounded-xl bg-white border border-[#E0E0E0] text-xs font-medium text-[#3C3C3B] inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <CameraIcon className="w-4 h-4 text-[#7D8A71]" />
                        <span>
                          {cameraScanActive ? 'Código lido pela câmera' : 'Simular leitor de código'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={handleLookupBoleto}
                        className="text-xs font-medium text-[#7D8A71] hover:underline cursor-pointer"
                      >
                        Consultar dados do boleto
                      </button>
                    </div>

                    <input
                      type="text"
                      value={boletoCode}
                      onChange={(e) => setBoletoCode(e.target.value)}
                      placeholder="Digite a linha digitável (47 ou 48 dígitos)"
                      className="w-full min-h-[44px] px-3.5 rounded-xl bg-white/85 border border-[#E0E0E0] text-sm font-mono"
                    />

                    {boletoLookedUp && (
                      <div className="rounded-2xl bg-[#7D8A71]/10 border border-[#7D8A71]/35 p-3.5 text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="font-semibold text-[#3C3C3B]">
                            {boletoLookedUp.beneficiary}
                          </span>
                          <span className="text-[#4B5842] font-medium">{boletoLookedUp.status}</span>
                        </div>
                        <p className="text-[#6E6E6B]">
                          {boletoLookedUp.bank} · Vencimento {formatFullDate(boletoLookedUp.dueDate)} ·{' '}
                          {formatBRL(boletoLookedUp.amount)}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <input
                        type="text"
                        value={boletoBeneficiary}
                        onChange={(e) => setBoletoBeneficiary(e.target.value)}
                        placeholder="Beneficiário"
                        className="min-h-[44px] px-3.5 rounded-xl bg-white/85 border border-[#E0E0E0] text-sm"
                      />
                      <input
                        type="text"
                        inputMode="decimal"
                        value={boletoAmount}
                        onChange={(e) => setBoletoAmount(e.target.value)}
                        placeholder="Valor R$"
                        className="min-h-[44px] px-3.5 rounded-xl bg-white/85 border border-[#E0E0E0] text-sm font-semibold tabular-nums"
                      />
                      <input
                        type="date"
                        min={todayISO}
                        value={boletoScheduleDate}
                        onChange={(e) => setBoletoScheduleDate(e.target.value)}
                        className="min-h-[44px] px-3.5 rounded-xl bg-white/85 border border-[#E0E0E0] text-sm tabular-nums"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setBoletoSource('account')}
                        className={`px-3.5 py-2 rounded-xl text-xs font-medium border cursor-pointer ${
                          boletoSource === 'account'
                            ? 'bg-[#3C3C3B] text-white border-[#3C3C3B]'
                            : 'bg-white/80 text-[#3C3C3B] border-[#E0E0E0]'
                        }`}
                      >
                        Saldo em conta
                      </button>
                      {eligiblePaymentCards.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setBoletoSource(c.id)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-medium border cursor-pointer ${
                            boletoSource === c.id
                              ? 'bg-[#3C3C3B] text-white border-[#3C3C3B]'
                              : 'bg-white/80 text-[#3C3C3B] border-[#E0E0E0]'
                          }`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>

                    {formError && (
                      <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
                        {formError}
                      </p>
                    )}

                    <button
                      type="submit"
                      className="min-h-[46px] px-7 rounded-2xl bg-[#3C3C3B] text-white text-sm font-medium cursor-pointer"
                    >
                      Revisar pagamento de boleto
                    </button>
                  </form>
                )}

                {boletoTab === 'pending' && (
                  <div className="space-y-2.5">
                    {scheduledBoletoItems.length === 0 ? (
                      <p className="text-xs text-[#6E6E6B] py-4">Nenhum boleto pendente.</p>
                    ) : (
                      scheduledBoletoItems.map((sp) => (
                        <div
                          key={sp.id}
                          className="p-3.5 rounded-2xl bg-white/85 border border-[#E0E0E0] flex items-center justify-between gap-3"
                        >
                          <div>
                            <p className="text-xs font-semibold text-[#3C3C3B]">{sp.title}</p>
                            <p className="text-[11px] text-[#6E6E6B]">
                              Vence {formatFullDate(sp.dueDateISO)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setBoletoTab('pay');
                              setBoletoBeneficiary(sp.title);
                              setBoletoAmount(sp.amount.toFixed(2).replace('.', ','));
                              setBoletoCode('237933812860000000003000000004081991200000');
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-[#3C3C3B] text-white text-xs font-medium cursor-pointer"
                          >
                            Pagar {formatBRL(sp.amount)}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {boletoTab === 'paid' && (
                  <div>
                    {boletoHistory.length === 0 ? (
                      <p className="text-xs text-[#6E6E6B] py-4">Nenhum boleto pago ainda.</p>
                    ) : (
                      boletoHistory.map((tx) => (
                        <TransactionRow
                          key={tx.id}
                          transaction={tx}
                          hideBalances={hideBalances}
                          onSelect={onSelectTransaction}
                        />
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 3. TRANSFERÊNCIAS */}
            {screen === 'ted' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-1.5 border-b border-[#E0E0E0]/70 pb-3">
                  {(
                    [
                      { id: 'neo', label: 'Entre contas Neo' },
                      { id: 'ted', label: 'TED outros bancos' },
                      { id: 'saved', label: 'Contatos frequentes' },
                      { id: 'history', label: 'Histórico' },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTransferTab(t.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-medium cursor-pointer ${
                        transferTab === t.id
                          ? 'bg-[#3C3C3B] text-white'
                          : 'bg-white/75 text-[#6E6E6B]'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {(transferTab === 'neo' || transferTab === 'ted') && (
                  <form onSubmit={handlePrepareTransfer} className="space-y-4">
                    {transferTab === 'neo' ? (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <input
                            type="text"
                            value={neoRecipientName}
                            onChange={(e) => setNeoRecipientName(e.target.value)}
                            placeholder="Nome do cliente Neo"
                            className="min-h-[44px] px-3.5 rounded-xl bg-white/85 border border-[#E0E0E0] text-sm"
                          />
                          <input
                            type="text"
                            value={neoAccountTarget}
                            onChange={(e) => setNeoAccountTarget(e.target.value)}
                            placeholder="Agência e conta Neo"
                            className="min-h-[44px] px-3.5 rounded-xl bg-white/85 border border-[#E0E0E0] text-sm tabular-nums"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={neoAmount}
                            onChange={(e) => setNeoAmount(e.target.value)}
                            placeholder="Valor R$"
                            className="min-h-[44px] px-3.5 rounded-xl bg-white/85 border border-[#E0E0E0] text-sm font-semibold tabular-nums"
                          />
                          <input
                            type="date"
                            min={todayISO}
                            value={neoDate}
                            onChange={(e) => setNeoDate(e.target.value)}
                            className="min-h-[44px] px-3.5 rounded-xl bg-white/85 border border-[#E0E0E0] text-sm tabular-nums"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <select
                          value={tedBank}
                          onChange={(e) => setTedBank(e.target.value)}
                          className="w-full min-h-[44px] px-3.5 rounded-xl bg-white/85 border border-[#E0E0E0] text-sm"
                        >
                          {BRAZILIAN_BANKS.map((b) => (
                            <option key={b} value={b}>
                              {b}
                            </option>
                          ))}
                        </select>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <input
                            type="text"
                            value={tedAgency}
                            onChange={(e) => setTedAgency(e.target.value)}
                            placeholder="Agência"
                            className="min-h-[44px] px-3.5 rounded-xl bg-white/85 border border-[#E0E0E0] text-sm tabular-nums"
                          />
                          <input
                            type="text"
                            value={tedAccount}
                            onChange={(e) => setTedAccount(e.target.value)}
                            placeholder="Conta"
                            className="min-h-[44px] px-3.5 rounded-xl bg-white/85 border border-[#E0E0E0] text-sm tabular-nums"
                          />
                          <input
                            type="text"
                            value={tedDoc}
                            onChange={(e) => setTedDoc(e.target.value)}
                            placeholder="CPF / CNPJ"
                            className="col-span-2 min-h-[44px] px-3.5 rounded-xl bg-white/85 border border-[#E0E0E0] text-sm tabular-nums"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                          <input
                            type="text"
                            value={tedName}
                            onChange={(e) => setTedName(e.target.value)}
                            placeholder="Nome do favorecido"
                            className="min-h-[44px] px-3.5 rounded-xl bg-white/85 border border-[#E0E0E0] text-sm"
                          />
                          <input
                            type="text"
                            inputMode="decimal"
                            value={tedAmount}
                            onChange={(e) => setTedAmount(e.target.value)}
                            placeholder="Valor R$"
                            className="min-h-[44px] px-3.5 rounded-xl bg-white/85 border border-[#E0E0E0] text-sm font-semibold tabular-nums"
                          />
                          <input
                            type="date"
                            min={todayISO}
                            value={tedDate}
                            onChange={(e) => setTedDate(e.target.value)}
                            className="min-h-[44px] px-3.5 rounded-xl bg-white/85 border border-[#E0E0E0] text-sm tabular-nums"
                          />
                        </div>
                      </>
                    )}

                    {formError && (
                      <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
                        {formError}
                      </p>
                    )}

                    <button
                      type="submit"
                      className="min-h-[46px] px-7 rounded-2xl bg-[#3C3C3B] text-white text-sm font-medium cursor-pointer"
                    >
                      Revisar transferência
                    </button>
                  </form>
                )}

                {transferTab === 'saved' && (
                  <div className="space-y-2.5">
                    {QUICK_CONTACTS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          if (c.isNeo) {
                            setTransferTab('neo');
                            setNeoRecipientName(c.name);
                          } else {
                            setTransferTab('ted');
                            setTedName(c.name);
                          }
                        }}
                        className="w-full p-3.5 rounded-2xl bg-white/85 border border-[#E0E0E0] flex items-center justify-between text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#7D8A71]/15 text-[#4B5842] font-bold text-xs flex items-center justify-center">
                            {c.initials}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-[#3C3C3B]">{c.name}</p>
                            <p className="text-[11px] text-[#6E6E6B]">{c.bank}</p>
                          </div>
                        </div>
                        <span className="text-xs font-medium text-[#7D8A71]">Selecionar</span>
                      </button>
                    ))}
                  </div>
                )}

                {transferTab === 'history' && (
                  <div>
                    {transferHistory.length === 0 ? (
                      <p className="text-xs text-[#6E6E6B] py-4">Nenhuma transferência ainda.</p>
                    ) : (
                      transferHistory.map((tx) => (
                        <TransactionRow
                          key={tx.id}
                          transaction={tx}
                          hideBalances={hideBalances}
                          onSelect={onSelectTransaction}
                        />
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 4. RECARGA */}
            {screen === 'recarga' && (
              <form onSubmit={handlePrepareRecharge} className="space-y-4">
                <div className="grid grid-cols-4 gap-2">
                  {['Vivo', 'Claro', 'TIM', 'Oi'].map((op) => (
                    <button
                      key={op}
                      type="button"
                      onClick={() => setCarrier(op)}
                      className={`min-h-[42px] rounded-xl text-xs font-semibold border cursor-pointer ${
                        carrier === op
                          ? 'bg-[#3C3C3B] text-white border-[#3C3C3B]'
                          : 'bg-white/85 text-[#3C3C3B] border-[#E0E0E0]'
                      }`}
                    >
                      {op}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={rechargePhone}
                  onChange={(e) => setRechargePhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-white/85 border border-[#E0E0E0] text-sm tabular-nums"
                />
                <div className="grid grid-cols-4 gap-2">
                  {[20, 30, 50, 100].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setRechargeValue(v)}
                      className={`min-h-[42px] rounded-xl text-xs font-semibold border tabular-nums cursor-pointer ${
                        rechargeValue === v
                          ? 'bg-[#7D8A71] text-white border-[#7D8A71]'
                          : 'bg-white/85 text-[#3C3C3B] border-[#E0E0E0]'
                      }`}
                    >
                      R$ {v}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setRechargeSource('account')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-medium border cursor-pointer ${
                      rechargeSource === 'account'
                        ? 'bg-[#3C3C3B] text-white border-[#3C3C3B]'
                        : 'bg-white/80 text-[#3C3C3B] border-[#E0E0E0]'
                    }`}
                  >
                    Saldo em conta
                  </button>
                  {eligiblePaymentCards.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setRechargeSource(c.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-medium border cursor-pointer ${
                        rechargeSource === c.id
                          ? 'bg-[#3C3C3B] text-white border-[#3C3C3B]'
                          : 'bg-white/80 text-[#3C3C3B] border-[#E0E0E0]'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>

                {formError && (
                  <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
                    {formError}
                  </p>
                )}

                <button
                  type="submit"
                  className="min-h-[46px] px-7 rounded-2xl bg-[#3C3C3B] text-white text-sm font-medium cursor-pointer"
                >
                  Revisar recarga
                </button>
              </form>
            )}

            {/* 5. CONTAS DE CONSUMO */}
            {screen === 'consumo' && (
              <form onSubmit={handlePrepareConsumo} className="space-y-4">
                <div className="grid grid-cols-4 gap-2">
                  {(['Luz', 'Água', 'Gás', 'Internet'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setUtilityCategory(cat);
                        setUtilityProvider(UTILITY_PROVIDERS[cat][0]);
                      }}
                      className={`min-h-[42px] rounded-xl text-xs font-semibold border cursor-pointer ${
                        utilityCategory === cat
                          ? 'bg-[#3C3C3B] text-white border-[#3C3C3B]'
                          : 'bg-white/85 text-[#3C3C3B] border-[#E0E0E0]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <select
                  value={utilityProvider}
                  onChange={(e) => setUtilityProvider(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-white/85 border border-[#E0E0E0] text-sm"
                >
                  {UTILITY_PROVIDERS[utilityCategory].map((prov) => (
                    <option key={prov} value={prov}>
                      {prov}
                    </option>
                  ))}
                </select>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <input
                    type="text"
                    value={utilityInstallCode}
                    onChange={(e) => setUtilityInstallCode(e.target.value)}
                    placeholder="Código de instalação / cliente"
                    className="min-h-[44px] px-3.5 rounded-xl bg-white/85 border border-[#E0E0E0] text-sm"
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    value={utilityAmount}
                    onChange={(e) => setUtilityAmount(e.target.value)}
                    placeholder="Valor R$"
                    className="min-h-[44px] px-3.5 rounded-xl bg-white/85 border border-[#E0E0E0] text-sm font-semibold tabular-nums"
                  />
                  <input
                    type="date"
                    min={todayISO}
                    value={utilityDate}
                    onChange={(e) => setUtilityDate(e.target.value)}
                    className="min-h-[44px] px-3.5 rounded-xl bg-white/85 border border-[#E0E0E0] text-sm tabular-nums"
                  />
                </div>

                {formError && (
                  <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
                    {formError}
                  </p>
                )}

                <button
                  type="submit"
                  className="min-h-[46px] px-7 rounded-2xl bg-[#3C3C3B] text-white text-sm font-medium cursor-pointer"
                >
                  Revisar conta de consumo
                </button>
              </form>
            )}

            {/* 6. TRIBUTOS E IMPOSTOS */}
            {screen === 'tributos' && (
              <form onSubmit={handlePrepareTributo} className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {TAX_TYPES.map((tax) => (
                    <button
                      key={tax.id}
                      type="button"
                      onClick={() => setTaxTypeId(tax.id)}
                      className={`min-h-[42px] px-3 rounded-xl text-xs font-semibold border cursor-pointer ${
                        taxTypeId === tax.id
                          ? 'bg-[#3C3C3B] text-white border-[#3C3C3B]'
                          : 'bg-white/85 text-[#3C3C3B] border-[#E0E0E0]'
                      }`}
                    >
                      {tax.id}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  value={taxBarcode}
                  onChange={(e) => setTaxBarcode(e.target.value)}
                  placeholder="Código de barras ou número do documento (DARF/DAS/Renavam)"
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-white/85 border border-[#E0E0E0] text-sm font-mono"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <input
                    type="text"
                    value={taxCompetence}
                    onChange={(e) => setTaxCompetence(e.target.value)}
                    placeholder="Competência (ex: 11/2026)"
                    className="min-h-[44px] px-3.5 rounded-xl bg-white/85 border border-[#E0E0E0] text-sm"
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    value={taxAmount}
                    onChange={(e) => setTaxAmount(e.target.value)}
                    placeholder="Valor R$"
                    className="min-h-[44px] px-3.5 rounded-xl bg-white/85 border border-[#E0E0E0] text-sm font-semibold tabular-nums"
                  />
                </div>

                {formError && (
                  <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
                    {formError}
                  </p>
                )}

                <button
                  type="submit"
                  className="min-h-[46px] px-7 rounded-2xl bg-[#3C3C3B] text-white text-sm font-medium cursor-pointer"
                >
                  Revisar guia de tributo
                </button>
              </form>
            )}
          </section>

          {/* Right Quick Contacts Rail */}
          <aside className="lg:col-span-4 neo-glass rounded-[28px] p-5 space-y-3">
            <h2 className="font-display font-bold text-sm text-[#3C3C3B]">
              Contatos frequentes (demo)
            </h2>
            <div className="space-y-2">
              {QUICK_CONTACTS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setScreen('pix');
                    setPixTab('send');
                    setPixKey(c.pixKey);
                    setPixRecipient(c.name);
                  }}
                  className="w-full p-2.5 rounded-2xl bg-white/80 hover:bg-white border border-[#E0E0E0] flex items-center gap-3 text-left cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-full bg-[#3C3C3B] text-white text-xs font-semibold flex items-center justify-center shrink-0">
                    {c.initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#3C3C3B] truncate">{c.name}</p>
                    <p className="text-[11px] text-[#6E6E6B] truncate">{c.bank}</p>
                  </div>
                </button>
              ))}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};
