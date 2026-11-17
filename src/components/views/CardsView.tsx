import React, { useMemo, useState } from 'react';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  CreditCardIcon,
  DevicePhoneMobileIcon,
  DocumentTextIcon,
  EyeIcon,
  EyeSlashIcon,
  GlobeAltIcon,
  KeyIcon,
  LockClosedIcon,
  LockOpenIcon,
  MapPinIcon,
  PlusIcon,
  ShieldCheckIcon,
  TruckIcon,
  WifiIcon,
} from '@heroicons/react/24/outline';
import { CARD_TIMELINE_STEPS, OFFICIAL_CARD_ORDER, OFFICIAL_CARDS } from '../../data/neoSeed';
import {
  CardOrder,
  NeoCard,
  OfficialCardId,
  Transaction,
  UserAccount,
} from '../../types/neo';
import { formatBRL, formatFullDate, isCreditAllowed } from '../../utils/formatters';
import { NeoLogo } from '../NeoLogo';
import { OfficialCardVisual } from '../OfficialCardVisual';
import { TransactionRow } from '../TransactionRow';

interface CardsViewProps {
  account: UserAccount;
  hideBalances: boolean;
  onUpdateCard: (cardId: OfficialCardId, patch: Partial<NeoCard>) => void;
  onRequestCardOrder: (cardId: OfficialCardId, deliveryAddress: string) => void;
  onAdvanceOrderStatus: (orderId: string) => void;
  onUnlockCardOrder: (orderId: string) => void;
  onSetDefaultNeoPay: (cardId: OfficialCardId) => void;
  onPayCardInvoice: (cardId: OfficialCardId, amount: number) => boolean;
  onSelectTransaction: (tx: Transaction) => void;
}

export const CardsView: React.FC<CardsViewProps> = ({
  account,
  hideBalances,
  onUpdateCard,
  onRequestCardOrder,
  onAdvanceOrderStatus,
  onUnlockCardOrder,
  onSetDefaultNeoPay,
  onPayCardInvoice,
  onSelectTransaction,
}) => {
  const creditAllowed = isCreditAllowed(account);

  // Main view mode: 'manage' (active cards), 'request' (wizard), 'track' (order timeline), 'unlock' (4-step activation)
  const [screenMode, setScreenMode] = useState<'manage' | 'request' | 'track' | 'unlock'>(
    account.cards.length === 0 && account.cardOrders.length > 0
      ? 'track'
      : account.cards.length === 0
      ? 'request'
      : 'manage'
  );

  // Request wizard state
  const [reqStep, setReqStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [reqCardId, setReqCardId] = useState<OfficialCardId>(
    account.tier === 'teen' ? 'sky' : account.tier === 'business' ? 'aura' : 'sage'
  );
  const [reqAddress, setReqAddress] = useState(account.address || 'Av. Paulista, 1420 · São Paulo, SP');

  // Tracking & Unlocking state
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(
    account.cardOrders[0]?.id || null
  );
  const [unlockStep, setUnlockStep] = useState<1 | 2 | 3 | 4>(1);
  const [unlockLast4, setUnlockLast4] = useState('');
  const [unlockPin, setUnlockPin] = useState('');
  const [unlockError, setUnlockError] = useState('');

  // Active Card Management state
  const [selectedId, setSelectedId] = useState<OfficialCardId | null>(
    account.cards.find((c) => c.isDefaultNeoPay)?.id || account.cards[0]?.id || null
  );
  const [cardVariant, setCardVariant] = useState<'physical' | 'virtual'>('physical');
  const [showSensitiveData, setShowSensitiveData] = useState(false);
  const [pinPromptOpen, setPinPromptOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [inlinePanel, setInlinePanel] = useState<'none' | 'invoice' | 'virtual_cfg'>('none');
  const [invoicePayAmount, setInvoicePayAmount] = useState('');
  const [virtualNicknameDraft, setVirtualNicknameDraft] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const activeCard = useMemo(() => {
    if (account.cards.length === 0) return null;
    return account.cards.find((c) => c.id === selectedId) || account.cards[0];
  }, [account.cards, selectedId]);

  const activeOrder: CardOrder | null = useMemo(
    () =>
      account.cardOrders.find((o) => o.id === selectedOrderId) ||
      account.cardOrders[0] ||
      null,
    [account.cardOrders, selectedOrderId]
  );

  const availableModelsToRequest = useMemo(
    () =>
      OFFICIAL_CARD_ORDER.filter(
        (cid) =>
          !account.cards.some((c) => c.id === cid) &&
          !account.cardOrders.some((o) => o.cardId === cid && o.status !== 'active')
      ),
    [account.cards, account.cardOrders]
  );

  const cardTransactions = useMemo(
    () =>
      activeCard
        ? account.transactions.filter((tx) => tx.cardId === activeCard.id)
        : [],
    [account.transactions, activeCard]
  );

  const handleCopy = (label: string, value: string) => {
    navigator.clipboard?.writeText(value);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 1800);
  };

  const handleConfirmRequestOrder = () => {
    onRequestCardOrder(reqCardId, reqAddress.trim() || 'Endereço cadastrado');
    setReqStep(5);
  };

  const handleVerifyUnlock = (order: CardOrder) => {
    setUnlockError('');
    if (unlockStep === 1) {
      if (unlockLast4.replace(/\D/g, '') !== order.last4Preview) {
        setUnlockError(
          `Informe os 4 últimos dígitos corretos do cartão entregue (${order.last4Preview}).`
        );
        return;
      }
      setUnlockStep(2);
    } else if (unlockStep === 2) {
      setUnlockStep(3);
    } else if (unlockStep === 3) {
      if (unlockPin !== account.pin4) {
        setUnlockError(`PIN de confirmação incorreto. (PIN demo: ${account.pin4})`);
        return;
      }
      onUnlockCardOrder(order.id);
      setSelectedId(order.cardId);
      setUnlockStep(4);
    }
  };

  const handleVerifyPinForData = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput !== account.pin4) {
      setPinError(`PIN inválido. (PIN demo: ${account.pin4})`);
      return;
    }
    setShowSensitiveData(true);
    setPinPromptOpen(false);
    setPinInput('');
    setPinError('');
  };

  const handleInvoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCard || !creditAllowed) return;
    const numeric = Number(invoicePayAmount.replace(',', '.'));
    if (!numeric || numeric <= 0) return;
    const ok = onPayCardInvoice(activeCard.id, numeric);
    if (ok) {
      setFeedbackMsg(
        `Simulação registrada: ${formatBRL(numeric)} aplicado na fatura do ${activeCard.label}.`
      );
      setInvoicePayAmount('');
      setInlinePanel('none');
      setTimeout(() => setFeedbackMsg(''), 3500);
    } else {
      setFeedbackMsg('Saldo demonstrativo insuficiente para este valor.');
    }
  };

  const handleRegenerateVirtual = () => {
    if (!activeCard) return;
    const newLast4 = String(Math.floor(1000 + Math.random() * 9000));
    onUpdateCard(activeCard.id, { virtualLast4: newLast4 });
    setFeedbackMsg(`Novo cartão virtual gerado (•••• ${newLast4}) no modo demonstração.`);
    setTimeout(() => setFeedbackMsg(''), 3000);
  };

  const handleSaveVirtualNickname = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCard) return;
    onUpdateCard(activeCard.id, {
      virtualNickname: virtualNicknameDraft.trim() || 'Virtual NeoPay',
    });
    setFeedbackMsg('Apelido do cartão virtual atualizado.');
    setInlinePanel('none');
    setTimeout(() => setFeedbackMsg(''), 2800);
  };

  return (
    <div className="space-y-5 pt-2">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl text-[#3C3C3B]">Cartões</h1>
          <p className="text-xs text-[#6E6E6B]">
            {creditAllowed
              ? 'Solicitação, acompanhamento, desbloqueio e gestão'
              : 'Cartão de Débito Jovem 14+ · Sem produtos de crédito'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-[#E0E0E0]/55">
          {account.cards.length > 0 && (
            <button
              type="button"
              onClick={() => setScreenMode('manage')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer ${
                screenMode === 'manage'
                  ? 'bg-white text-[#3C3C3B] shadow-sm'
                  : 'text-[#6E6E6B]'
              }`}
            >
              Meus cartões ({account.cards.length})
            </button>
          )}
          {account.cardOrders.length > 0 && (
            <button
              type="button"
              onClick={() => setScreenMode('track')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer ${
                screenMode === 'track' || screenMode === 'unlock'
                  ? 'bg-white text-[#3C3C3B] shadow-sm'
                  : 'text-[#6E6E6B]'
              }`}
            >
              Acompanhar ({account.cardOrders.length})
            </button>
          )}
          {availableModelsToRequest.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setReqCardId(availableModelsToRequest[0]);
                setReqStep(1);
                setScreenMode('request');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium inline-flex items-center gap-1 cursor-pointer ${
                screenMode === 'request'
                  ? 'bg-[#3C3C3B] text-white shadow-sm'
                  : 'text-[#3C3C3B]'
              }`}
            >
              <PlusIcon className="w-3.5 h-3.5" />
              <span>Solicitar cartão</span>
            </button>
          )}
        </div>
      </div>

      {/* SCREEN 1: FULL CARD REQUEST WIZARD */}
      {screenMode === 'request' && (
        <section className="neo-glass rounded-[28px] p-5 sm:p-7 space-y-5">
          <div className="flex items-center justify-between border-b border-[#E0E0E0]/65 pb-4">
            <div>
              <span className="text-[11px] font-medium text-[#7D8A71]">
                Etapa {Math.min(reqStep, 4)} de 4
              </span>
              <h2 className="font-display font-bold text-lg text-[#3C3C3B]">
                Solicitar cartão oficial Neo
              </h2>
            </div>
            {account.cards.length > 0 && (
              <button
                type="button"
                onClick={() => setScreenMode('manage')}
                className="text-xs text-[#6E6E6B] hover:text-[#3C3C3B] cursor-pointer"
              >
                Voltar
              </button>
            )}
          </div>

          {reqStep === 1 && (
            <div className="space-y-4">
              <p className="text-xs text-[#6E6E6B]">
                {creditAllowed
                  ? 'Escolha o modelo de cartão múltiplo (crédito sujeito a análise e débito):'
                  : 'Para contas de 14 a 17 anos, todos os cartões operam exclusivamente na função Débito, sem linha de crédito:'}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {availableModelsToRequest.map((cid) => {
                  const meta = OFFICIAL_CARDS[cid];
                  const selected = reqCardId === cid;
                  return (
                    <button
                      key={cid}
                      type="button"
                      onClick={() => setReqCardId(cid)}
                      className={`p-4 rounded-3xl border text-left flex flex-col items-center gap-3 cursor-pointer transition-all ${
                        selected
                          ? 'bg-white border-[#7D8A71] ring-2 ring-[#7D8A71]/25'
                          : 'bg-white/70 border-[#E0E0E0] hover:bg-white'
                      }`}
                    >
                      <OfficialCardVisual cardId={cid} size="sm" />
                      <div className="text-center">
                        <p className="font-display font-bold text-sm text-[#3C3C3B]">
                          {meta.name}
                        </p>
                        <p className="text-[11px] text-[#7D8A71] font-medium mt-0.5">
                          {creditAllowed ? meta.tierLabel : meta.debitOnlyLabel}
                        </p>
                        <p className="text-[11px] text-[#6E6E6B] mt-1">{meta.subtitle}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setReqStep(2)}
                  className="min-h-[44px] px-6 rounded-xl bg-[#3C3C3B] text-white text-xs font-medium cursor-pointer"
                >
                  Visualizar cartão escolhido
                </button>
              </div>
            </div>
          )}

          {reqStep === 2 && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-5 flex justify-center">
                <OfficialCardVisual cardId={reqCardId} size="lg" />
              </div>
              <div className="md:col-span-7 space-y-4">
                <div>
                  <p className="text-xs text-[#7D8A71] font-medium">Prévia fiel do seu cartão</p>
                  <h3 className="font-display font-bold text-xl text-[#3C3C3B]">
                    {OFFICIAL_CARDS[reqCardId].name}
                  </h3>
                  <p className="text-xs text-[#6E6E6B] mt-1">
                    Titular impresso: <strong>{account.displayName}</strong> · Bandeira Visa
                  </p>
                </div>
                <div className="rounded-2xl bg-white/85 border border-[#E0E0E0] p-4 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#6E6E6B]">Modalidade</span>
                    <span className="font-semibold text-[#3C3C3B]">
                      {creditAllowed ? 'Múltiplo (Débito + Crédito)' : 'Exclusivo Débito (14+)'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6E6E6B]">Anuidade</span>
                    <span className="font-semibold text-[#2E7D32]">Isenta (R$ 0,00)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6E6E6B]">Cartão Virtual</span>
                    <span className="font-medium text-[#3C3C3B]">Liberado após desbloqueio</span>
                  </div>
                </div>
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setReqStep(1)}
                    className="min-h-[44px] px-5 rounded-xl bg-white border border-[#E0E0E0] text-xs font-medium cursor-pointer"
                  >
                    Trocar modelo
                  </button>
                  <button
                    type="button"
                    onClick={() => setReqStep(3)}
                    className="flex-1 min-h-[44px] px-6 rounded-xl bg-[#3C3C3B] text-white text-xs font-medium cursor-pointer"
                  >
                    Informar endereço de entrega
                  </button>
                </div>
              </div>
            </div>
          )}

          {reqStep === 3 && (
            <div className="space-y-4 max-w-xl">
              <div className="flex items-center gap-2 text-xs font-medium text-[#3C3C3B]">
                <MapPinIcon className="w-4 h-4 text-[#7D8A71]" />
                <span>Confirme ou atualize o endereço para envio do cartão físico</span>
              </div>
              <input
                type="text"
                value={reqAddress}
                onChange={(e) => setReqAddress(e.target.value)}
                placeholder="Rua, número, complemento, cidade e UF"
                className="w-full min-h-[46px] px-3.5 rounded-xl bg-white border border-[#E0E0E0] text-sm"
              />
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setReqStep(2)}
                  className="min-h-[44px] px-5 rounded-xl bg-white border border-[#E0E0E0] text-xs font-medium cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={() => setReqStep(4)}
                  className="flex-1 min-h-[44px] px-6 rounded-xl bg-[#3C3C3B] text-white text-xs font-medium cursor-pointer"
                >
                  Conferir dados do pedido
                </button>
              </div>
            </div>
          )}

          {reqStep === 4 && (
            <div className="space-y-4 max-w-xl">
              <div className="rounded-2xl bg-white/85 border border-[#E0E0E0] p-4 space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#6E6E6B]">Cartão solicitado</span>
                  <span className="font-semibold text-[#3C3C3B]">
                    {OFFICIAL_CARDS[reqCardId].name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6E6E6B]">Titular</span>
                  <span className="font-medium text-[#3C3C3B]">{account.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6E6E6B]">Modalidade</span>
                  <span className="font-medium text-[#3C3C3B]">
                    {creditAllowed ? 'Múltiplo (Débito/Crédito)' : 'Débito Exclusivo (Sem crédito)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6E6E6B]">Entrega</span>
                  <span className="font-medium text-[#3C3C3B] text-right">{reqAddress}</span>
                </div>
              </div>

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setReqStep(3)}
                  className="min-h-[44px] px-5 rounded-xl bg-white border border-[#E0E0E0] text-xs font-medium cursor-pointer"
                >
                  Ajustar endereço
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRequestOrder}
                  className="flex-1 min-h-[44px] px-6 rounded-xl bg-[#7D8A71] text-white text-xs font-medium cursor-pointer"
                >
                  Confirmar solicitação
                </button>
              </div>
            </div>
          )}

          {reqStep === 5 && (
            <div className="rounded-3xl bg-white/85 border border-[#7D8A71]/40 p-6 text-center space-y-3">
              <CheckCircleIcon className="w-10 h-10 text-[#4B5842] mx-auto" />
              <h3 className="font-display font-bold text-lg text-[#3C3C3B]">
                Solicitação enviada com sucesso
              </h3>
              <p className="text-xs text-[#6E6E6B] max-w-md mx-auto">
                Seu pedido do cartão {OFFICIAL_CARDS[reqCardId].name} foi registrado. Acompanhe a
                produção, envio e entrega até a liberação para desbloqueio.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedOrderId(account.cardOrders[0]?.id || null);
                  setScreenMode('track');
                }}
                className="min-h-[44px] px-6 rounded-xl bg-[#3C3C3B] text-white text-xs font-medium cursor-pointer"
              >
                Acompanhar entrega do cartão
              </button>
            </div>
          )}
        </section>
      )}

      {/* SCREEN 2: CARD ORDER TRACKING TIMELINE */}
      {screenMode === 'track' && (
        <section className="neo-glass rounded-[28px] p-5 sm:p-7 space-y-5">
          {!activeOrder ? (
            <div className="text-center py-8 space-y-2">
              <TruckIcon className="w-8 h-8 text-[#6E6E6B]/60 mx-auto" />
              <p className="text-sm font-medium text-[#3C3C3B]">
                Nenhuma solicitação de cartão em andamento.
              </p>
              <button
                type="button"
                onClick={() => setScreenMode('request')}
                className="text-xs font-medium text-[#7D8A71] hover:underline cursor-pointer"
              >
                Solicitar cartão agora
              </button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-[#E0E0E0]/65">
                <div className="flex items-center gap-3.5">
                  <OfficialCardVisual cardId={activeOrder.cardId} size="xs" />
                  <div>
                    <p className="text-[11px] text-[#6E6E6B]">
                      Pedido {activeOrder.id} · Solicitado em {formatFullDate(activeOrder.requestedAt)}
                    </p>
                    <h2 className="font-display font-bold text-lg text-[#3C3C3B]">
                      {OFFICIAL_CARDS[activeOrder.cardId].name} (•••• {activeOrder.last4Preview})
                    </h2>
                    <p className="text-xs text-[#6E6E6B]">
                      {activeOrder.variant === 'debit_only'
                        ? 'Cartão de Débito Jovem 14+'
                        : 'Cartão Múltiplo Neo'}
                      {activeOrder.trackingCode ? ` · Rastreio: ${activeOrder.trackingCode}` : ''}
                    </p>
                  </div>
                </div>

                {activeOrder.status === 'ready_to_unlock' || activeOrder.status === 'delivered' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setUnlockStep(1);
                      setUnlockLast4('');
                      setUnlockPin('');
                      setUnlockError('');
                      setScreenMode('unlock');
                    }}
                    className="min-h-[42px] px-5 rounded-xl bg-[#7D8A71] text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <KeyIcon className="w-4 h-4" />
                    <span>Desbloquear cartão</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onAdvanceOrderStatus(activeOrder.id)}
                    className="min-h-[40px] px-4 rounded-xl bg-[#3C3C3B] text-white text-xs font-medium cursor-pointer"
                  >
                    Avançar etapa de entrega (demo)
                  </button>
                )}
              </div>

              {/* 8-Step Visual Timeline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {CARD_TIMELINE_STEPS.map((step, index) => {
                  const timelineItem = activeOrder.timeline[index];
                  const done = timelineItem?.done;
                  const isCurrent = activeOrder.status === step.status;
                  return (
                    <div
                      key={step.status}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isCurrent
                          ? 'bg-white border-[#7D8A71] ring-2 ring-[#7D8A71]/20'
                          : done
                          ? 'bg-white/85 border-[#E0E0E0]'
                          : 'bg-white/40 border-[#E0E0E0]/60 opacity-65'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-semibold text-[#6E6E6B] tabular-nums">
                          0{index + 1}
                        </span>
                        {done && <CheckCircleIcon className="w-4 h-4 text-[#4B5842]" />}
                      </div>
                      <p className="text-xs font-semibold text-[#3C3C3B]">{step.label}</p>
                      <p className="text-[11px] text-[#6E6E6B] mt-0.5">
                        {isCurrent ? 'Status atual' : done ? 'Concluído' : 'Aguardando'}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-2xl bg-white/80 border border-[#E0E0E0] p-4 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-[#6E6E6B]">
                  Entrega prevista: <strong className="text-[#3C3C3B]">{activeOrder.estimatedDelivery}</strong>
                </span>
                <span className="text-[#6E6E6B]">
                  Destino: <strong className="text-[#3C3C3B]">{activeOrder.deliveryAddress}</strong>
                </span>
              </div>
            </>
          )}
        </section>
      )}

      {/* SCREEN 3: CARD UNLOCK SYSTEM */}
      {screenMode === 'unlock' && activeOrder && (
        <section className="neo-glass rounded-[28px] p-5 sm:p-7 space-y-5 max-w-xl mx-auto">
          <div className="flex items-center gap-3 pb-3 border-b border-[#E0E0E0]/65">
            <button
              type="button"
              onClick={() => setScreenMode('track')}
              className="min-h-[38px] min-w-[38px] rounded-xl bg-white border border-[#E0E0E0] flex items-center justify-center cursor-pointer"
            >
              <ArrowLeftIcon className="w-4 h-4" />
            </button>
            <div>
              <h2 className="font-display font-bold text-lg text-[#3C3C3B]">
                Desbloquear cartão · {OFFICIAL_CARDS[activeOrder.cardId].name}
              </h2>
              <p className="text-xs text-[#6E6E6B]">Etapa {unlockStep} de 4</p>
            </div>
          </div>

          {unlockStep === 1 && (
            <div className="space-y-3">
              <p className="text-xs text-[#6E6E6B]">
                Informe os <strong>4 últimos dígitos</strong> impressos no verso do cartão entregue (
                <span className="tabular-nums">{activeOrder.last4Preview}</span>):
              </p>
              <input
                type="text"
                maxLength={4}
                inputMode="numeric"
                value={unlockLast4}
                onChange={(e) => setUnlockLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="Ex: 4821"
                className="w-full min-h-[46px] px-4 rounded-xl bg-white border border-[#E0E0E0] text-sm tracking-widest tabular-nums"
              />
            </div>
          )}

          {unlockStep === 2 && (
            <div className="rounded-2xl bg-white/85 border border-[#E0E0E0] p-4 space-y-2 text-xs">
              <p className="font-semibold text-[#3C3C3B]">Confirme os dados do titular</p>
              <p className="text-[#6E6E6B]">Nome no cartão: {account.displayName}</p>
              <p className="text-[#6E6E6B]">Documento: {account.document}</p>
              <p className="text-[#6E6E6B]">
                Função:{' '}
                {activeOrder.variant === 'debit_only' ? 'Débito Exclusivo' : 'Múltiplo (Débito e Crédito)'}
              </p>
            </div>
          )}

          {unlockStep === 3 && (
            <div className="space-y-3">
              <p className="text-xs text-[#6E6E6B]">
                Confirme seu PIN de segurança de 4 dígitos para ativar o cartão (PIN: {account.pin4}):
              </p>
              <input
                type="password"
                maxLength={4}
                inputMode="numeric"
                value={unlockPin}
                onChange={(e) => setUnlockPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                className="w-full min-h-[46px] px-4 rounded-xl bg-white border border-[#E0E0E0] text-sm tracking-widest tabular-nums"
              />
            </div>
          )}

          {unlockStep === 4 && (
            <div className="text-center space-y-3 py-3">
              <CheckCircleIcon className="w-10 h-10 text-[#4B5842] mx-auto" />
              <h3 className="font-display font-bold text-lg text-[#3C3C3B]">
                Cartão desbloqueado e ativo!
              </h3>
              <p className="text-xs text-[#6E6E6B]">
                Seu {OFFICIAL_CARDS[activeOrder.cardId].name} físico e virtual já estão prontos para uso.
              </p>
              <button
                type="button"
                onClick={() => setScreenMode('manage')}
                className="min-h-[44px] px-6 rounded-xl bg-[#3C3C3B] text-white text-xs font-medium cursor-pointer"
              >
                Gerenciar meu cartão
              </button>
            </div>
          )}

          {unlockError && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
              {unlockError}
            </p>
          )}

          {unlockStep < 4 && (
            <button
              type="button"
              onClick={() => handleVerifyUnlock(activeOrder)}
              className="w-full min-h-[46px] rounded-xl bg-[#3C3C3B] text-white text-xs font-medium cursor-pointer"
            >
              {unlockStep === 3 ? 'Confirmar desbloqueio' : 'Continuar'}
            </button>
          )}
        </section>
      )}

      {/* SCREEN 4: ACTIVE CARDS MANAGEMENT */}
      {screenMode === 'manage' && (
        <>
          {!activeCard ? (
            <section className="neo-glass rounded-[28px] p-8 text-center space-y-3">
              <CreditCardIcon className="w-10 h-10 text-[#6E6E6B]/60 mx-auto" />
              <h2 className="font-display font-bold text-lg text-[#3C3C3B]">
                Você ainda não possui cartão ativo
              </h2>
              <p className="text-xs text-[#6E6E6B] max-w-md mx-auto">
                Contas recém-abertas não emitem cartões automaticamente. Escolha seu modelo oficial Neo ou acompanhe seu pedido em andamento.
              </p>
              <button
                type="button"
                onClick={() => setScreenMode('request')}
                className="min-h-[44px] px-6 rounded-xl bg-[#3C3C3B] text-white text-xs font-medium cursor-pointer"
              >
                Solicitar primeiro cartão
              </button>
            </section>
          ) : (
            <>
              {account.cards.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {account.cards.map((card) => (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(card.id);
                        setShowSensitiveData(false);
                        setPinPromptOpen(false);
                        setInlinePanel('none');
                        setFeedbackMsg('');
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-medium border cursor-pointer shrink-0 ${
                        activeCard.id === card.id
                          ? 'bg-[#3C3C3B] text-white border-[#3C3C3B]'
                          : 'bg-white/80 text-[#3C3C3B] border-[#E0E0E0]'
                      }`}
                    >
                      {card.label}
                    </button>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* Official Card Visual Stage */}
                <section className="lg:col-span-5 neo-glass rounded-[28px] p-5 sm:p-6 flex flex-col items-center">
                  <div className="w-full flex items-center justify-between mb-4">
                    <span className="text-xs font-medium text-[#6E6E6B]">
                      {creditAllowed
                        ? OFFICIAL_CARDS[activeCard.id].tierLabel
                        : OFFICIAL_CARDS[activeCard.id].debitOnlyLabel}
                    </span>
                    <div className="flex items-center gap-1 p-1 rounded-xl bg-[#E0E0E0]/55">
                      <button
                        type="button"
                        onClick={() => setCardVariant('physical')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium cursor-pointer ${
                          cardVariant === 'physical'
                            ? 'bg-white text-[#3C3C3B] shadow-sm'
                            : 'text-[#6E6E6B]'
                        }`}
                      >
                        Físico
                      </button>
                      <button
                        type="button"
                        onClick={() => setCardVariant('virtual')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium cursor-pointer ${
                          cardVariant === 'virtual'
                            ? 'bg-white text-[#3C3C3B] shadow-sm'
                            : 'text-[#6E6E6B]'
                        }`}
                      >
                        Virtual
                      </button>
                    </div>
                  </div>

                  <div className="py-1">
                    <OfficialCardVisual
                      cardId={activeCard.id}
                      size="lg"
                      frozen={activeCard.frozen}
                    />
                  </div>

                  <div className="w-full mt-5 pt-4 border-t border-[#E0E0E0]/65 flex items-center justify-between text-xs">
                    <div className="min-w-0">
                      <p className="font-display font-bold text-sm text-[#3C3C3B] truncate">
                        {activeCard.label}
                      </p>
                      <p className="text-[#6E6E6B] tabular-nums truncate">
                        {cardVariant === 'physical'
                          ? `Físico · Final ${activeCard.last4}`
                          : `${activeCard.virtualNickname || 'Virtual NeoPay'} · Final ${activeCard.virtualLast4}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onSetDefaultNeoPay(activeCard.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-medium cursor-pointer shrink-0 ${
                        activeCard.isDefaultNeoPay
                          ? 'bg-[#7D8A71]/15 text-[#4B5842]'
                          : 'bg-[#3C3C3B] text-white'
                      }`}
                    >
                      {activeCard.isDefaultNeoPay ? 'Principal NeoPay' : 'Definir NeoPay'}
                    </button>
                  </div>

                  {cardVariant === 'virtual' && (
                    <div className="w-full mt-3 pt-3 border-t border-[#E0E0E0]/60 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setVirtualNicknameDraft(activeCard.virtualNickname || 'Virtual NeoPay');
                          setInlinePanel((p) => (p === 'virtual_cfg' ? 'none' : 'virtual_cfg'));
                        }}
                        className="flex-1 min-h-[38px] rounded-xl bg-white/80 border border-[#E0E0E0] text-xs font-medium text-[#3C3C3B] cursor-pointer"
                      >
                        Renomear virtual
                      </button>
                      <button
                        type="button"
                        onClick={handleRegenerateVirtual}
                        className="flex-1 min-h-[38px] rounded-xl bg-[#3C3C3B]/8 text-xs font-medium text-[#3C3C3B] inline-flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <ArrowPathIcon className="w-3.5 h-3.5" />
                        <span>Novo número</span>
                      </button>
                    </div>
                  )}

                  {inlinePanel === 'virtual_cfg' && (
                    <form onSubmit={handleSaveVirtualNickname} className="w-full mt-3 flex gap-2">
                      <input
                        type="text"
                        value={virtualNicknameDraft}
                        onChange={(e) => setVirtualNicknameDraft(e.target.value)}
                        placeholder="Ex: Assinaturas & Apps"
                        className="flex-1 min-h-[40px] px-3 rounded-xl bg-white border border-[#E0E0E0] text-xs"
                      />
                      <button
                        type="submit"
                        className="min-h-[40px] px-3.5 rounded-xl bg-[#7D8A71] text-white text-xs font-medium cursor-pointer"
                      >
                        Salvar
                      </button>
                    </form>
                  )}
                </section>

                {/* Controls, Invoice (Adult/PJ only) & Security */}
                <section className="lg:col-span-7 space-y-5">
                  <div className="neo-glass rounded-[28px] p-5 sm:p-6">
                    {creditAllowed && activeCard.mode === 'credit_debit' ? (
                      <>
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <p className="text-xs text-[#6E6E6B]">Limite disponível (demo)</p>
                            <p className="font-display font-bold text-3xl text-[#3C3C3B] tabular-nums mt-0.5">
                              {formatBRL(Math.max(0, activeCard.limit - activeCard.usedLimit), hideBalances)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-[#6E6E6B]">Fatura atual</p>
                            <p className="text-base font-semibold text-[#3C3C3B] tabular-nums mt-0.5">
                              {formatBRL(activeCard.usedLimit, hideBalances)}
                            </p>
                            <p className="text-[11px] text-[#6E6E6B]">Fecha dia 05 · Vence dia 12</p>
                          </div>
                        </div>

                        <div className="mt-4">
                          <div className="h-2 w-full rounded-full bg-[#E0E0E0]/80 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#7D8A71] transition-all duration-300"
                              style={{
                                width: `${Math.min(
                                  100,
                                  activeCard.limit > 0
                                    ? Math.round((activeCard.usedLimit / activeCard.limit) * 100)
                                    : 0
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs text-[#6E6E6B]">
                            Cartão de Débito Jovem 14+ (Sem crédito)
                          </p>
                          <p className="font-display font-bold text-3xl text-[#3C3C3B] tabular-nums mt-0.5">
                            {formatBRL(account.balance, hideBalances)}
                          </p>
                          <p className="text-[11px] text-[#6E6E6B] mt-1">
                            Compras debitadas diretamente do saldo disponível em conta.
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-[#4B5842]">
                          {activeCard.frozen ? 'Bloqueado' : 'Ativo'}
                        </span>
                      </div>
                    )}

                    <div
                      className={`grid ${
                        creditAllowed ? 'grid-cols-3' : 'grid-cols-2'
                      } gap-2.5 mt-5 pt-5 border-t border-[#E0E0E0]/65`}
                    >
                      {creditAllowed && (
                        <button
                          type="button"
                          onClick={() =>
                            setInlinePanel((prev) => (prev === 'invoice' ? 'none' : 'invoice'))
                          }
                          className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 cursor-pointer ${
                            inlinePanel === 'invoice'
                              ? 'bg-[#3C3C3B] text-white border-[#3C3C3B]'
                              : 'bg-white/80 hover:bg-white border-[#E0E0E0]/80 text-[#3C3C3B]'
                          }`}
                        >
                          <DocumentTextIcon className="w-5 h-5" />
                          <span className="text-[11px] font-medium">Fatura &amp; Pagar</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          if (showSensitiveData) {
                            setShowSensitiveData(false);
                            setPinPromptOpen(false);
                          } else {
                            setPinPromptOpen((p) => !p);
                            setPinInput('');
                            setPinError('');
                          }
                        }}
                        className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 cursor-pointer ${
                          showSensitiveData || pinPromptOpen
                            ? 'bg-[#7D8A71] text-white border-[#7D8A71]'
                            : 'bg-white/80 hover:bg-white border-[#E0E0E0]/80 text-[#3C3C3B]'
                        }`}
                      >
                        {showSensitiveData ? (
                          <EyeSlashIcon className="w-5 h-5" />
                        ) : (
                          <EyeIcon className="w-5 h-5" />
                        )}
                        <span className="text-[11px] font-medium">
                          {showSensitiveData ? 'Ocultar dados' : 'Ver dados'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const next = !activeCard.frozen;
                          onUpdateCard(activeCard.id, { frozen: next });
                          setFeedbackMsg(
                            next
                              ? `${activeCard.label} bloqueado temporariamente.`
                              : `${activeCard.label} desbloqueado.`
                          );
                          setTimeout(() => setFeedbackMsg(''), 3000);
                        }}
                        className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 cursor-pointer ${
                          activeCard.frozen
                            ? 'bg-red-600 text-white border-red-600'
                            : 'bg-white/80 hover:bg-white border-[#E0E0E0]/80 text-[#3C3C3B]'
                        }`}
                      >
                        {activeCard.frozen ? (
                          <LockOpenIcon className="w-5 h-5" />
                        ) : (
                          <LockClosedIcon className="w-5 h-5" />
                        )}
                        <span className="text-[11px] font-medium">
                          {activeCard.frozen ? 'Desbloquear' : 'Bloquear'}
                        </span>
                      </button>
                    </div>

                    {pinPromptOpen && !showSensitiveData && (
                      <form
                        onSubmit={handleVerifyPinForData}
                        className="mt-4 rounded-2xl bg-white/90 border border-[#E0E0E0] p-4 space-y-2.5"
                      >
                        <p className="text-xs font-medium text-[#3C3C3B]">
                          Confirme seu PIN de 4 dígitos para exibir os dados (PIN: {account.pin4})
                        </p>
                        <div className="flex gap-2">
                          <input
                            type="password"
                            maxLength={4}
                            inputMode="numeric"
                            value={pinInput}
                            onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                            placeholder="••••"
                            className="w-32 min-h-[42px] px-3.5 rounded-xl bg-[#F4F4F1] border border-[#E0E0E0] text-sm tracking-widest tabular-nums"
                          />
                          <button
                            type="submit"
                            className="min-h-[42px] px-5 rounded-xl bg-[#3C3C3B] text-white text-xs font-medium cursor-pointer"
                          >
                            Liberar dados
                          </button>
                        </div>
                        {pinError && <p className="text-xs text-red-600">{pinError}</p>}
                      </form>
                    )}

                    {showSensitiveData && (
                      <div className="mt-4 rounded-2xl bg-white/90 border border-[#E0E0E0] p-4 space-y-3">
                        <div className="flex items-center justify-between text-xs text-[#6E6E6B]">
                          <span>
                            {cardVariant === 'physical' ? 'Cartão Físico' : 'Cartão Virtual'}
                          </span>
                          <NeoLogo variant="neopay" size="sm" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                          <div className="sm:col-span-2 flex items-center justify-between bg-[#F4F4F1] rounded-xl px-3.5 py-2.5">
                            <div>
                              <span className="text-[#6E6E6B] block text-[11px]">Número</span>
                              <span className="font-semibold text-[#3C3C3B] tabular-nums text-sm">
                                {cardVariant === 'physical'
                                  ? activeCard.fullNumber
                                  : `4532 9901 4412 ${activeCard.virtualLast4}`}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                handleCopy(
                                  'num',
                                  cardVariant === 'physical'
                                    ? activeCard.fullNumber
                                    : `4532 9901 4412 ${activeCard.virtualLast4}`
                                )
                              }
                              className="min-w-[36px] min-h-[36px] flex items-center justify-center text-[#3C3C3B] cursor-pointer"
                            >
                              {copiedField === 'num' ? (
                                <CheckIcon className="w-4 h-4 text-[#2E7D32]" />
                              ) : (
                                <ClipboardDocumentIcon className="w-4 h-4" />
                              )}
                            </button>
                          </div>

                          <div className="flex items-center justify-between bg-[#F4F4F1] rounded-xl px-3.5 py-2.5">
                            <div>
                              <span className="text-[#6E6E6B] block text-[11px]">Validade · CVV</span>
                              <span className="font-semibold text-[#3C3C3B] tabular-nums text-sm">
                                {activeCard.expiry} · {activeCard.cvv}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {creditAllowed && inlinePanel === 'invoice' && (
                      <div className="mt-4 rounded-2xl bg-white/90 border border-[#E0E0E0] p-4 space-y-3">
                        <div className="flex items-center justify-between border-b border-[#E0E0E0]/65 pb-2.5">
                          <div>
                            <p className="text-xs font-semibold text-[#3C3C3B]">
                              Fatura atual · {activeCard.label}
                            </p>
                            <p className="text-[11px] text-[#6E6E6B]">
                              Fechamento 05/12 · Vencimento 12/12
                            </p>
                          </div>
                          <span className="font-display font-bold text-base text-[#3C3C3B] tabular-nums">
                            {formatBRL(activeCard.usedLimit, hideBalances)}
                          </span>
                        </div>
                        <form onSubmit={handleInvoiceSubmit} className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={invoicePayAmount}
                            onChange={(e) => setInvoicePayAmount(e.target.value)}
                            placeholder={`Ex: ${
                              activeCard.usedLimit > 0 ? activeCard.usedLimit.toFixed(2) : '250.00'
                            }`}
                            className="flex-1 min-h-[42px] px-3.5 rounded-xl bg-[#F4F4F1] border border-[#E0E0E0] text-sm tabular-nums"
                          />
                          <button
                            type="submit"
                            className="min-h-[42px] px-4 rounded-xl bg-[#7D8A71] text-white text-xs font-medium cursor-pointer"
                          >
                            Pagar fatura (demo)
                          </button>
                        </form>
                      </div>
                    )}

                    {feedbackMsg && (
                      <p className="mt-4 text-xs font-medium text-[#3C3C3B] bg-[#7D8A71]/12 rounded-xl px-3.5 py-2.5">
                        {feedbackMsg}
                      </p>
                    )}
                  </div>

                  <div className="neo-glass rounded-[28px] p-5 space-y-4">
                    <h2 className="font-display font-bold text-sm text-[#3C3C3B]">
                      Preferências e segurança do cartão
                    </h2>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <GlobeAltIcon className="w-5 h-5 text-[#3C3C3B]" />
                          <div>
                            <p className="text-xs font-medium text-[#3C3C3B]">Compras online</p>
                            <p className="text-[11px] text-[#6E6E6B]">Sites e aplicativos</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateCard(activeCard.id, {
                              onlinePurchasesEnabled: !activeCard.onlinePurchasesEnabled,
                            })
                          }
                          className={`min-h-[34px] px-3.5 rounded-xl text-xs font-medium cursor-pointer ${
                            activeCard.onlinePurchasesEnabled
                              ? 'bg-[#7D8A71]/15 text-[#4B5842]'
                              : 'bg-[#E0E0E0] text-[#6E6E6B]'
                          }`}
                        >
                          {activeCard.onlinePurchasesEnabled ? 'Ativo' : 'Pausado'}
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-4 pt-3 border-t border-[#E0E0E0]/60">
                        <div className="flex items-center gap-3">
                          <WifiIcon className="w-5 h-5 text-[#3C3C3B]" />
                          <div>
                            <p className="text-xs font-medium text-[#3C3C3B]">Aproximação NFC</p>
                            <p className="text-[11px] text-[#6E6E6B]">Pagamentos presenciais</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateCard(activeCard.id, {
                              contactlessEnabled: !activeCard.contactlessEnabled,
                            })
                          }
                          className={`min-h-[34px] px-3.5 rounded-xl text-xs font-medium cursor-pointer ${
                            activeCard.contactlessEnabled
                              ? 'bg-[#7D8A71]/15 text-[#4B5842]'
                              : 'bg-[#E0E0E0] text-[#6E6E6B]'
                          }`}
                        >
                          {activeCard.contactlessEnabled ? 'Ativo' : 'Pausado'}
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-4 pt-3 border-t border-[#E0E0E0]/60">
                        <div className="flex items-center gap-3">
                          <DevicePhoneMobileIcon className="w-5 h-5 text-[#3C3C3B]" />
                          <div>
                            <p className="text-xs font-medium text-[#3C3C3B]">Carteira Digital</p>
                            <p className="text-[11px] text-[#6E6E6B]">Apple Pay / Google Wallet</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateCard(activeCard.id, { addedToWallet: !activeCard.addedToWallet })
                          }
                          className={`min-h-[34px] px-3.5 rounded-xl text-xs font-medium cursor-pointer ${
                            activeCard.addedToWallet
                              ? 'bg-[#7D8A71]/15 text-[#4B5842]'
                              : 'bg-[#3C3C3B] text-white'
                          }`}
                        >
                          {activeCard.addedToWallet ? 'Ativo' : 'Habilitar'}
                        </button>
                      </div>
                    </div>

                    {creditAllowed && activeCard.mode !== 'debit_only' && (
                      <div className="pt-4 border-t border-[#E0E0E0]/60">
                        <div className="flex items-center justify-between text-xs mb-2">
                          <span className="inline-flex items-center gap-1.5 font-medium text-[#3C3C3B]">
                            <ShieldCheckIcon className="w-4 h-4 text-[#7D8A71]" />
                            Ajuste de limite de crédito (demo)
                          </span>
                          <span className="font-semibold text-[#3C3C3B] tabular-nums">
                            {formatBRL(activeCard.limit, hideBalances)}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={500}
                          max={account.tier === 'business' ? 60000 : 25000}
                          step={500}
                          value={activeCard.limit}
                          onChange={(e) =>
                            onUpdateCard(activeCard.id, { limit: Number(e.target.value) })
                          }
                          className="w-full accent-[#7D8A71] cursor-pointer"
                        />
                      </div>
                    )}
                  </div>
                </section>
              </div>

              <section className="neo-glass rounded-[28px] p-5 sm:p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <OfficialCardVisual cardId={activeCard.id} size="xs" />
                    <div>
                      <h2 className="font-display font-bold text-base text-[#3C3C3B]">
                        Movimentações · {activeCard.label}
                      </h2>
                      <p className="text-xs text-[#6E6E6B]">Toque em uma compra para ver detalhes</p>
                    </div>
                  </div>
                  <span className="text-xs text-[#6E6E6B] tabular-nums">
                    {cardTransactions.length}
                  </span>
                </div>

                {cardTransactions.length === 0 ? (
                  <p className="text-xs text-[#6E6E6B] py-6 text-center">
                    Nenhuma movimentação registrada neste cartão ainda.
                  </p>
                ) : (
                  <div>
                    {cardTransactions.map((tx) => (
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
            </>
          )}
        </>
      )}
    </div>
  );
};
