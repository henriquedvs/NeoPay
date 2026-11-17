import React, { useState } from 'react';
import {
  ArrowLeftIcon,
  BanknotesIcon,
  BuildingOffice2Icon,
  CalendarDaysIcon,
  CheckCircleIcon,
  CreditCardIcon,
  GiftIcon,
  LightBulbIcon,
  PlusIcon,
  SparklesIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import { OFFICIAL_CARDS } from '../../data/neoSeed';
import { Caixinha, EcosystemTab, UserAccount } from '../../types/neo';
import { formatBRL, formatFullDate, isCreditAllowed } from '../../utils/formatters';
import { OfficialCardVisual } from '../OfficialCardVisual';

interface EcosystemViewProps {
  account: UserAccount;
  initialTab: EcosystemTab;
  hideBalances: boolean;
  onBack: () => void;
  onOpenRewards: () => void;
  onCreateCaixinha: (name: string, goalAmount: number) => void;
  onMoveCaixinha: (
    caixinhaId: string,
    amount: number,
    direction: 'deposit' | 'withdraw'
  ) => boolean;
  onRedeemRewards: (pointsCost: number, cashCredit: number) => boolean;
  onToggleSubscription: (subId: string) => void;
  onPayScheduled: (schId: string) => boolean;
  onScheduleNew: (title: string, counterparty: string, amount: number, dueDateISO: string) => void;
  onUpdateAllowanceLimit: (limit: number) => void;
}

export const EcosystemView: React.FC<EcosystemViewProps> = ({
  account,
  initialTab,
  hideBalances,
  onBack,
  onOpenRewards,
  onCreateCaixinha,
  onMoveCaixinha,
  onRedeemRewards,
  onToggleSubscription,
  onPayScheduled,
  onScheduleNew,
  onUpdateAllowanceLimit,
}) => {
  const [tab, setTab] = useState<EcosystemTab>(initialTab);
  const [feedback, setFeedback] = useState('');

  // Cofrinhos state
  const [newCxName, setNewCxName] = useState('');
  const [newCxGoal, setNewCxGoal] = useState('');
  const [activeCxId, setActiveCxId] = useState<string | null>(null);
  const [cxAmount, setCxAmount] = useState('');
  const [cxDir, setCxDir] = useState<'deposit' | 'withdraw'>('deposit');

  // Agenda new payment
  const [schTitle, setSchTitle] = useState('');
  const [schParty, setSchParty] = useState('');
  const [schAmount, setSchAmount] = useState('');
  const [schDate, setSchDate] = useState('2026-11-30');

  // Teen allowance slider
  const [allowanceVal, setAllowanceVal] = useState(
    account.teenMonthlyAllowanceLimit || 500
  );

  // Business Pix Cobrança
  const [bizChargeAmount, setBizChargeAmount] = useState('1200');
  const [bizChargeCreated, setBizChargeCreated] = useState(false);

  const creditAllowed = isCreditAllowed(account);

  const notify = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 3500);
  };

  const tabsList: {
    id: EcosystemTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'cofrinhos', label: 'Cofrinhos', icon: BanknotesIcon },
    { id: 'rewards', label: 'Rewards', icon: GiftIcon },
    { id: 'assinaturas', label: 'Assinaturas', icon: CreditCardIcon },
    { id: 'agenda', label: 'Agenda', icon: CalendarDaysIcon },
    { id: 'insights', label: 'Insights', icon: LightBulbIcon },
    { id: 'familia', label: 'Família', icon: UsersIcon },
    { id: 'empresas', label: 'Empresas', icon: BuildingOffice2Icon },
  ];

  const handleMoveCx = (e: React.FormEvent, cx: Caixinha) => {
    e.preventDefault();
    const val = Number(cxAmount.replace(',', '.'));
    if (!val || val <= 0) return;
    const ok = onMoveCaixinha(cx.id, val, cxDir);
    if (!ok) {
      notify('Saldo insuficiente para esta movimentação demonstrativa.');
      return;
    }
    setActiveCxId(null);
    setCxAmount('');
    notify(
      cxDir === 'deposit'
        ? `${formatBRL(val)} guardado em ${cx.name}.`
        : `${formatBRL(val)} resgatado de ${cx.name}.`
    );
  };

  const totalSpent = account.transactions
    .filter((t) => t.amount < 0)
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  const activeDefaultCard = account.cards.find((c) => c.isDefaultNeoPay) || account.cards[0];

  return (
    <div className="space-y-5 pt-2">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="min-h-[42px] min-w-[42px] rounded-xl bg-white/85 border border-[#E0E0E0] flex items-center justify-center text-[#3C3C3B] cursor-pointer"
            aria-label="Voltar"
          >
            <ArrowLeftIcon className="w-4 h-4" />
          </button>
          <div>
            <h1 className="font-display font-bold text-2xl text-[#3C3C3B]">
              Ecossistema NEO
            </h1>
            <p className="text-xs text-[#6E6E6B]">Serviços integrados (demonstração)</p>
          </div>
        </div>
      </header>

      <div className="flex gap-1.5 overflow-x-auto no-scrollbar p-1.5 rounded-2xl bg-[#E0E0E0]/55">
        {tabsList.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`px-3 py-2 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-all ${
                active ? 'bg-white text-[#3C3C3B] shadow-sm' : 'text-[#6E6E6B] hover:text-[#3C3C3B]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {feedback && (
        <div className="rounded-2xl bg-[#7D8A71]/15 border border-[#7D8A71]/35 px-4 py-3 text-xs font-medium text-[#3C3C3B] flex items-center gap-2">
          <CheckCircleIcon className="w-4 h-4 text-[#4B5842]" />
          <span>{feedback}</span>
        </div>
      )}

      {/* 1. NEO COFRINHOS */}
      {tab === 'cofrinhos' && (
        <section className="space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const g = Number(newCxGoal);
              if (newCxName.trim() && g > 0) {
                onCreateCaixinha(newCxName.trim(), g);
                setNewCxName('');
                setNewCxGoal('');
                notify('Novo Cofrinho criado.');
              }
            }}
            className="neo-glass rounded-[28px] p-5 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end"
          >
            <input
              type="text"
              value={newCxName}
              onChange={(e) => setNewCxName(e.target.value)}
              placeholder="Nome do Cofrinho (ex: Viagem)"
              className="min-h-[44px] px-3.5 rounded-xl bg-white/85 border border-[#E0E0E0] text-sm"
            />
            <input
              type="number"
              value={newCxGoal}
              onChange={(e) => setNewCxGoal(e.target.value)}
              placeholder="Meta em R$"
              className="min-h-[44px] px-3.5 rounded-xl bg-white/85 border border-[#E0E0E0] text-sm tabular-nums"
            />
            <button
              type="submit"
              className="min-h-[44px] rounded-xl bg-[#3C3C3B] text-white text-xs font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Criar Cofrinho</span>
            </button>
          </form>

          {account.caixinhas.length === 0 ? (
            <div className="neo-glass rounded-[28px] p-6 text-center space-y-2">
              <p className="font-display font-bold text-sm text-[#3C3C3B]">
                Nenhum Cofrinho criado ainda
              </p>
              <p className="text-xs text-[#6E6E6B]">
                Crie sua primeira meta financeira acima para separar saldo com rendimento demonstrativo de 104% CDI.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {account.caixinhas.map((cx) => {
                const pct = Math.min(
                  100,
                  cx.goalAmount > 0 ? Math.round((cx.currentAmount / cx.goalAmount) * 100) : 0
                );
                const editing = activeCxId === cx.id;
                return (
                  <div key={cx.id} className="neo-glass rounded-[28px] p-5 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[11px] text-[#6E6E6B]">{cx.categoryLabel}</p>
                        <h2 className="font-display font-bold text-base text-[#3C3C3B]">
                          {cx.name}
                        </h2>
                      </div>
                      <span className="text-xs font-semibold text-[#7D8A71] tabular-nums">
                        {pct}%
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="font-display font-bold text-2xl text-[#3C3C3B] tabular-nums">
                        {formatBRL(cx.currentAmount, hideBalances)}
                      </span>
                      <span className="text-xs text-[#6E6E6B] tabular-nums">
                        Meta: {formatBRL(cx.goalAmount, hideBalances)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-[#E0E0E0]/75 overflow-hidden">
                      <div className="h-full bg-[#7D8A71] rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    {!editing ? (
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveCxId(cx.id);
                            setCxDir('deposit');
                          }}
                          className="flex-1 min-h-[40px] rounded-xl bg-[#3C3C3B] text-white text-xs font-medium cursor-pointer"
                        >
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveCxId(cx.id);
                            setCxDir('withdraw');
                          }}
                          className="flex-1 min-h-[40px] rounded-xl bg-white/80 border border-[#E0E0E0] text-xs font-medium cursor-pointer"
                        >
                          Resgatar
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={(e) => handleMoveCx(e, cx)} className="flex gap-2">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={cxAmount}
                          onChange={(e) => setCxAmount(e.target.value)}
                          placeholder="Valor R$"
                          className="flex-1 min-h-[40px] px-3 rounded-xl bg-white border border-[#E0E0E0] text-sm tabular-nums"
                        />
                        <button
                          type="submit"
                          className="min-h-[40px] px-4 rounded-xl bg-[#7D8A71] text-white text-xs font-medium cursor-pointer"
                        >
                          OK
                        </button>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* 2. NEO REWARDS */}
      {tab === 'rewards' && (
        <section className="neo-glass rounded-[28px] p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs text-[#7D8A71] font-medium">Programa de Pontos Neo</p>
              <p className="font-display font-bold text-3xl text-[#3C3C3B] tabular-nums mt-1">
                {account.rewardsPoints.toLocaleString('pt-BR')} pts
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenRewards}
              className="min-h-[42px] px-4 rounded-xl bg-[#3C3C3B] text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
            >
              <SparklesIcon className="w-4 h-4" />
              <span>Abrir página completa NeoRewards</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { title: 'Cashback R$ 25 na conta', pts: 1000, cash: 25 },
              { title: 'Cashback R$ 100 na conta', pts: 3800, cash: 100 },
            ].map((rw) => (
              <div
                key={rw.title}
                className="rounded-2xl bg-white/85 border border-[#E0E0E0] p-4 flex items-center justify-between gap-3"
              >
                <div>
                  <p className="font-display font-bold text-sm text-[#3C3C3B]">
                    {rw.title}
                  </p>
                  <p className="text-xs text-[#6E6E6B] tabular-nums">{rw.pts} pontos</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const ok = onRedeemRewards(rw.pts, rw.cash);
                    notify(
                      ok
                        ? `Resgate demonstrativo de ${formatBRL(rw.cash)} creditado!`
                        : 'Pontos insuficientes.'
                    );
                  }}
                  className="min-h-[40px] px-4 rounded-xl bg-[#3C3C3B] text-white text-xs font-medium cursor-pointer shrink-0"
                >
                  Resgatar
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. NEO ASSINATURAS */}
      {tab === 'assinaturas' && (
        <section className="neo-glass rounded-[28px] p-6 space-y-4">
          <h2 className="font-display font-bold text-base text-[#3C3C3B]">
            Serviços recorrentes vinculados aos seus cartões
          </h2>
          {account.subscriptions.length === 0 ? (
            <p className="text-xs text-[#6E6E6B]">Nenhuma assinatura cadastrada nesta conta.</p>
          ) : (
            <div className="space-y-2.5">
              {account.subscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className="rounded-2xl bg-white/85 border border-[#E0E0E0] p-4 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <OfficialCardVisual cardId={sub.cardId} size="xs" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#3C3C3B] truncate">{sub.name}</p>
                      <p className="text-xs text-[#6E6E6B]">
                        Todo dia {sub.billingDay} · {OFFICIAL_CARDS[sub.cardId].name}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-semibold text-[#3C3C3B] tabular-nums">
                      {formatBRL(sub.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onToggleSubscription(sub.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer ${
                        sub.active
                          ? 'bg-[#7D8A71]/15 text-[#4B5842]'
                          : 'bg-[#E0E0E0] text-[#6E6E6B]'
                      }`}
                    >
                      {sub.active ? 'Ativa' : 'Pausada'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 4. NEO AGENDA */}
      {tab === 'agenda' && (
        <section className="space-y-4">
          <div className="neo-glass rounded-[28px] p-5 space-y-3">
            <h2 className="font-display font-bold text-base text-[#3C3C3B]">
              Próximos vencimentos e agendamentos
            </h2>
            {account.scheduledPayments.length === 0 ? (
              <p className="text-xs text-[#6E6E6B]">Nenhum compromisso agendado ainda.</p>
            ) : (
              account.scheduledPayments.map((sp) => (
                <div
                  key={sp.id}
                  className="rounded-2xl bg-white/85 border border-[#E0E0E0] p-4 flex flex-wrap items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-[#3C3C3B]">{sp.title}</p>
                    <p className="text-xs text-[#6E6E6B]">
                      {sp.counterparty} · Vence em {formatFullDate(sp.dueDateISO)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-[#3C3C3B] tabular-nums">
                      {formatBRL(sp.amount)}
                    </span>
                    {sp.paid ? (
                      <span className="text-xs font-medium text-[#2E7D32]">Pago (demo)</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          const ok = onPayScheduled(sp.id);
                          notify(ok ? 'Pagamento agendado simulado.' : 'Saldo insuficiente.');
                        }}
                        className="min-h-[38px] px-3.5 rounded-xl bg-[#3C3C3B] text-white text-xs font-medium cursor-pointer"
                      >
                        Simular baixa
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const val = Number(schAmount);
              if (schTitle.trim() && val > 0) {
                onScheduleNew(schTitle.trim(), schParty.trim() || 'Beneficiário', val, schDate);
                setSchTitle('');
                setSchParty('');
                setSchAmount('');
                notify('Compromisso adicionado na Neo Agenda.');
              }
            }}
            className="neo-glass rounded-[28px] p-5 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
          >
            <input
              type="text"
              value={schTitle}
              onChange={(e) => setSchTitle(e.target.value)}
              placeholder="Conta ou compromisso"
              className="min-h-[42px] px-3 rounded-xl bg-white/85 border border-[#E0E0E0] text-xs"
            />
            <input
              type="number"
              value={schAmount}
              onChange={(e) => setSchAmount(e.target.value)}
              placeholder="Valor R$"
              className="min-h-[42px] px-3 rounded-xl bg-white/85 border border-[#E0E0E0] text-xs tabular-nums"
            />
            <input
              type="date"
              value={schDate}
              onChange={(e) => setSchDate(e.target.value)}
              className="min-h-[42px] px-3 rounded-xl bg-white/85 border border-[#E0E0E0] text-xs tabular-nums"
            />
            <button
              type="submit"
              className="min-h-[42px] rounded-xl bg-[#7D8A71] text-white text-xs font-medium cursor-pointer"
            >
              Agendar
            </button>
          </form>
        </section>
      )}

      {/* 5. NEO INSIGHTS */}
      {tab === 'insights' && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="neo-glass rounded-[28px] p-5 space-y-2">
            <p className="text-xs font-medium text-[#7D8A71]">Taxa de poupança</p>
            <h3 className="font-display font-bold text-lg text-[#3C3C3B]">
              Saldo vs. Gastos do ciclo
            </h3>
            <p className="text-xs text-[#6E6E6B] leading-relaxed">
              Você movimentou {formatBRL(totalSpent, hideBalances)} em saídas e mantém{' '}
              {formatBRL(account.balance, hideBalances)} livres em conta demonstrativa.
            </p>
          </div>
          <div className="neo-glass rounded-[28px] p-5 space-y-2">
            <p className="text-xs font-medium text-[#7D8A71]">Uso dos cartões</p>
            <h3 className="font-display font-bold text-lg text-[#3C3C3B]">
              {activeDefaultCard
                ? `Cartão ativo principal: ${activeDefaultCard.label}`
                : 'Nenhum cartão ativo ainda'}
            </h3>
            <p className="text-xs text-[#6E6E6B] leading-relaxed">
              {creditAllowed
                ? 'Concentrar compras no seu cartão principal facilita o acúmulo de pontos no NeoRewards.'
                : 'Na conta Jovem 14+, suas compras acontecem exclusivamente no débito, sem crédito ou faturas.'}
            </p>
          </div>
        </section>
      )}

      {/* 6. NEO FAMÍLIA */}
      {tab === 'familia' && (
        <section className="neo-glass rounded-[28px] p-6 space-y-4">
          <h2 className="font-display font-bold text-base text-[#3C3C3B]">
            Neo Família · Gestão Jovem 14+
          </h2>
          <p className="text-xs text-[#6E6E6B]">
            {account.guardianName
              ? `Conta vinculada ao responsável legal: ${account.guardianName}.`
              : 'Configure o limite mensal sugerido de mesada ou gastos para perfis familiares 14+.'}
          </p>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-[#3C3C3B]">Teto mensal familiar / mesada</span>
              <span className="font-semibold text-[#3C3C3B] tabular-nums">
                {formatBRL(allowanceVal, hideBalances)}
              </span>
            </div>
            <input
              type="range"
              min={100}
              max={2000}
              step={50}
              value={allowanceVal}
              onChange={(e) => {
                const v = Number(e.target.value);
                setAllowanceVal(v);
                onUpdateAllowanceLimit(v);
              }}
              className="w-full accent-[#7D8A71] cursor-pointer"
            />
          </div>
        </section>
      )}

      {/* 7. NEO EMPRESAS */}
      {tab === 'empresas' && (
        <section className="neo-glass rounded-[28px] p-6 space-y-4">
          <h2 className="font-display font-bold text-base text-[#3C3C3B]">
            Neo Empresas · Gestão PJ
          </h2>
          <p className="text-xs text-[#6E6E6B]">
            Ferramentas empresariais para emissão rápida de cobrança Pix demonstrativa e acompanhamento de fluxo PJ.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="number"
              value={bizChargeAmount}
              onChange={(e) => {
                setBizChargeAmount(e.target.value);
                setBizChargeCreated(false);
              }}
              placeholder="Valor da cobrança R$"
              className="flex-1 min-h-[44px] px-3.5 rounded-xl bg-white/85 border border-[#E0E0E0] text-sm tabular-nums"
            />
            <button
              type="button"
              onClick={() => setBizChargeCreated(true)}
              className="min-h-[44px] px-5 rounded-xl bg-[#3C3C3B] text-white text-xs font-medium cursor-pointer"
            >
              Gerar Pix Cobrança (demo)
            </button>
          </div>
          {bizChargeCreated && (
            <div className="rounded-2xl bg-[#7D8A71]/12 border border-[#7D8A71]/30 p-3.5 text-xs text-[#3C3C3B]">
              Link demonstrativo gerado para {formatBRL(Number(bizChargeAmount) || 0)} · Chave{' '}
              {account.pixKeys[0] || account.email}.
            </div>
          )}
        </section>
      )}
    </div>
  );
};
