import React, { useMemo, useState } from 'react';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
  GiftIcon,
  InformationCircleIcon,
  SparklesIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline';
import {
  REWARDS_CATALOG,
  REWARDS_MISSIONS,
  REWARDS_TIERS,
} from '../../data/neoSeed';
import {
  RewardCatalogItem,
  RewardCategory,
  RewardMission,
  UserAccount,
} from '../../types/neo';
import { formatBRL, formatFullDate, isCreditAllowed } from '../../utils/formatters';

interface RewardsViewProps {
  account: UserAccount;
  onBack: () => void;
  onRedeemRewardItem: (item: RewardCatalogItem) => { ok: boolean; error?: string };
  onClaimMission: (mission: RewardMission) => { ok: boolean; error?: string };
  onToggleRedemptionUsed: (redemptionId: string) => void;
}

const REWARD_CATEGORIES: RewardCategory[] = [
  'Cashback',
  'Descontos',
  'Cupons',
  'Produtos',
  'Gift cards',
  'Experiências',
  'Benefícios exclusivos',
];

export const RewardsView: React.FC<RewardsViewProps> = ({
  account,
  onBack,
  onRedeemRewardItem,
  onClaimMission,
  onToggleRedemptionUsed,
}) => {
  const creditAllowed = isCreditAllowed(account);
  const [tab, setTab] = useState<'vitrine' | 'missions' | 'ledger' | 'redemptions'>('vitrine');
  const [selectedCategory, setSelectedCategory] = useState<'Todas' | RewardCategory>('Todas');
  const [pendingItem, setPendingItem] = useState<RewardCatalogItem | null>(null);
  const [feedback, setFeedback] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Ensure points are never negative
  const safeAvailablePoints = Math.max(0, account.rewardsPoints);

  const currentTierIdx = useMemo(() => {
    let idx = 0;
    for (let i = 0; i < REWARDS_TIERS.length; i++) {
      if (safeAvailablePoints >= REWARDS_TIERS[i].minPoints) idx = i;
    }
    return idx;
  }, [safeAvailablePoints]);

  const currentTier = REWARDS_TIERS[currentTierIdx];
  const nextTier = REWARDS_TIERS[currentTierIdx + 1] || null;
  const tierProgressPct = nextTier
    ? Math.min(
        100,
        Math.round(
          ((safeAvailablePoints - currentTier.minPoints) /
            Math.max(1, nextTier.minPoints - currentTier.minPoints)) *
            100
        )
      )
    : 100;

  const eligibleCatalog = useMemo(() => {
    return REWARDS_CATALOG.filter((item) => {
      if (!creditAllowed && !item.teenEligible) return false;
      if (selectedCategory !== 'Todas' && item.category !== selectedCategory) return false;
      return true;
    });
  }, [creditAllowed, selectedCategory]);

  const missionProgressCheck = (missionId: string): boolean => {
    if (missionId === 'mis-pix') return account.pixKeys.length >= 2;
    if (missionId === 'mis-cofrinho') return account.caixinhas.length >= 1;
    if (missionId === 'mis-2fa') return account.settings.twoFactorEnabled;
    return false;
  };

  const handleConfirmRedeem = () => {
    if (!pendingItem) return;
    setErrorMsg('');
    const res = onRedeemRewardItem(pendingItem);
    if (!res.ok) {
      setErrorMsg(res.error || 'Não foi possível resgatar.');
      return;
    }
    setFeedback(`Resgate confirmado: "${pendingItem.title}". Disponível em Meus resgates.`);
    setPendingItem(null);
    setTab('redemptions');
    setTimeout(() => setFeedback(''), 3500);
  };

  const handleClaim = (mission: RewardMission) => {
    setErrorMsg('');
    const res = onClaimMission(mission);
    if (!res.ok) {
      setErrorMsg(res.error || 'Missão ainda não elegível ou já resgatada.');
      return;
    }
    setFeedback(`+${mission.rewardPoints} pontos creditados da missão "${mission.title}".`);
    setTimeout(() => setFeedback(''), 3500);
  };

  return (
    <div className="space-y-5 pt-2">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3">
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
            <h1 className="font-display font-bold text-2xl text-[#3C3C3B]">NeoRewards</h1>
            <p className="text-xs text-[#6E6E6B]">
              Programa de pontos, níveis e benefícios demonstrativos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#E0E0E0]/55 overflow-x-auto no-scrollbar">
          {(
            [
              { id: 'vitrine', label: 'Vitrine' },
              { id: 'missions', label: 'Missões' },
              { id: 'ledger', label: 'Extrato' },
              { id: 'redemptions', label: `Meus resgates (${account.rewardsRedemptions.length})` },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id);
                setPendingItem(null);
                setErrorMsg('');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap cursor-pointer ${
                tab === t.id ? 'bg-white text-[#3C3C3B] shadow-sm' : 'text-[#6E6E6B]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* Honest Rules & Teen Protection Note */}
      <div className="rounded-2xl bg-white/75 border border-[#E0E0E0]/85 px-4 py-2.5 flex items-center gap-2.5 text-xs text-[#6E6E6B]">
        <InformationCircleIcon className="w-4 h-4 text-[#7D8A71] shrink-0" />
        <span>
          Pontos nunca ficam negativos, possuem origem identificada no extrato e não são duplicados
          após o resgate de missões.
        </span>
      </div>

      {feedback && (
        <div className="rounded-2xl bg-[#7D8A71]/15 border border-[#7D8A71]/35 px-4 py-3 text-xs font-medium text-[#3C3C3B] flex items-center gap-2">
          <CheckCircleIcon className="w-4 h-4 text-[#4B5842] shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700">
          {errorMsg}
        </div>
      )}

      {/* Points Summary & Tier Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <section className="lg:col-span-6 neo-glass rounded-[28px] p-5 sm:p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-[#7D8A71] font-medium">Saldo disponível de pontos</p>
              <p className="font-display font-bold text-4xl text-[#3C3C3B] tabular-nums mt-1">
                {safeAvailablePoints.toLocaleString('pt-BR')} pts
              </p>
            </div>
            <GiftIcon className="w-8 h-8 text-[#7D8A71]" />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#E0E0E0]/65 text-xs">
            <div>
              <span className="text-[#6E6E6B] block">Pontos pendentes</span>
              <span className="font-semibold text-[#3C3C3B] tabular-nums">
                {Math.max(0, account.pendingPoints).toLocaleString('pt-BR')} pts
              </span>
            </div>
            <div>
              <span className="text-[#6E6E6B] block">A expirar em 30 dias</span>
              <span className="font-semibold text-[#3C3C3B] tabular-nums">
                {Math.max(0, account.expiringPoints).toLocaleString('pt-BR')} pts
              </span>
            </div>
          </div>
        </section>

        <section className="lg:col-span-6 neo-glass rounded-[28px] p-5 sm:p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-[#6E6E6B]">Nível atual</p>
              <h2 className="font-display font-bold text-xl text-[#3C3C3B] mt-0.5">
                {currentTier.name}
              </h2>
            </div>
            <TrophyIcon className="w-7 h-7 text-[#7D8A71]" />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] text-[#6E6E6B] tabular-nums">
              <span>Progresso de nível</span>
              <span>
                {nextTier
                  ? `Faltam ${Math.max(0, nextTier.minPoints - safeAvailablePoints).toLocaleString(
                      'pt-BR'
                    )} pts para ${nextTier.name}`
                  : 'Nível máximo atingido'}
              </span>
            </div>
            <div className="h-2 rounded-full bg-[#E0E0E0]/75 overflow-hidden">
              <div
                className="h-full bg-[#7D8A71] rounded-full transition-all duration-300"
                style={{ width: `${tierProgressPct}%` }}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#6E6E6B]">
            {currentTier.perks.map((perk) => (
              <span key={perk}>· {perk}</span>
            ))}
          </div>
        </section>
      </div>

      {/* REDEMPTION CONFIRMATION SCREEN */}
      {pendingItem && (
        <section className="neo-glass rounded-[28px] p-5 sm:p-6 border border-[#3C3C3B]/20 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E0E0E0]/65">
            <div>
              <h2 className="font-display font-bold text-lg text-[#3C3C3B]">
                Confirmar resgate no NeoRewards
              </h2>
              <p className="text-xs text-[#6E6E6B]">Revise o uso dos seus pontos</p>
            </div>
            <button
              type="button"
              onClick={() => setPendingItem(null)}
              className="text-xs font-medium text-[#6E6E6B] hover:text-[#3C3C3B] cursor-pointer"
            >
              Cancelar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs bg-white/85 rounded-2xl p-4 border border-[#E0E0E0]">
            <div>
              <span className="text-[#6E6E6B] block">Benefício</span>
              <span className="font-semibold text-[#3C3C3B]">{pendingItem.title}</span>
              <span className="block text-[11px] text-[#6E6E6B] mt-0.5">{pendingItem.category}</span>
            </div>
            <div>
              <span className="text-[#6E6E6B] block">Custo em pontos</span>
              <span className="font-display font-bold text-base text-[#3C3C3B] tabular-nums">
                {pendingItem.pointsCost.toLocaleString('pt-BR')} pts
              </span>
            </div>
            <div>
              <span className="text-[#6E6E6B] block">Saldo restante após resgate</span>
              <span className="font-display font-bold text-base text-[#4B5842] tabular-nums">
                {Math.max(0, safeAvailablePoints - pendingItem.pointsCost).toLocaleString('pt-BR')}{' '}
                pts
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setPendingItem(null)}
              className="min-h-[42px] px-5 rounded-xl bg-white border border-[#E0E0E0] text-xs font-medium cursor-pointer"
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={handleConfirmRedeem}
              className="min-h-[42px] px-6 rounded-xl bg-[#3C3C3B] text-white text-xs font-medium cursor-pointer"
            >
              Confirmar resgate
            </button>
          </div>
        </section>
      )}

      {/* TAB 1: VITRINE DE RESGATES (7 CATEGORIES) */}
      {!pendingItem && tab === 'vitrine' && (
        <section className="space-y-4">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar p-1 rounded-2xl bg-[#E0E0E0]/55">
            {(['Todas', ...REWARD_CATEGORIES] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-white text-[#3C3C3B] shadow-sm'
                    : 'text-[#6E6E6B]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {eligibleCatalog.map((item) => {
              const affordable = safeAvailablePoints >= item.pointsCost;
              return (
                <article
                  key={item.id}
                  className="neo-glass rounded-3xl p-5 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-medium text-[#7D8A71]">{item.category}</p>
                    <h3 className="font-display font-bold text-base text-[#3C3C3B]">
                      {item.title}
                    </h3>
                    <p className="text-xs text-[#6E6E6B] leading-relaxed">{item.description}</p>
                  </div>

                  <div className="pt-3 border-t border-[#E0E0E0]/65 flex items-center justify-between gap-2">
                    <div>
                      <p className="font-display font-bold text-lg text-[#3C3C3B] tabular-nums">
                        {item.pointsCost.toLocaleString('pt-BR')} pts
                      </p>
                      {item.cashValue && (
                        <p className="text-[11px] text-[#2E7D32] tabular-nums">
                          Equivale a {formatBRL(item.cashValue)}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={!affordable}
                      onClick={() => setPendingItem(item)}
                      className={`min-h-[40px] px-4 rounded-xl text-xs font-medium cursor-pointer ${
                        affordable
                          ? 'bg-[#3C3C3B] text-white'
                          : 'bg-[#E0E0E0] text-[#6E6E6B] cursor-not-allowed'
                      }`}
                    >
                      {affordable ? 'Resgatar' : 'Pontos insuficientes'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* TAB 2: MISSÕES & DESAFIOS */}
      {!pendingItem && tab === 'missions' && (
        <section className="space-y-3">
          {REWARDS_MISSIONS.filter((m) => creditAllowed || m.teenEligible).map((mission) => {
            const alreadyClaimed = account.completedMissions.includes(mission.id);
            const eligible = missionProgressCheck(mission.id);
            return (
              <div
                key={mission.id}
                className="neo-glass rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#7D8A71]/15 text-[#4B5842] flex items-center justify-center shrink-0">
                    <SparklesIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-display font-bold text-sm text-[#3C3C3B]">{mission.title}</p>
                    <p className="text-xs text-[#6E6E6B] mt-0.5">{mission.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm font-display font-bold text-[#7D8A71] tabular-nums">
                    +{mission.rewardPoints} pts
                  </span>
                  {alreadyClaimed ? (
                    <span className="text-xs font-semibold text-[#4B5842] inline-flex items-center gap-1">
                      <CheckCircleIcon className="w-4 h-4" />
                      Resgatada
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={!eligible}
                      onClick={() => handleClaim(mission)}
                      className={`min-h-[38px] px-4 rounded-xl text-xs font-medium cursor-pointer ${
                        eligible
                          ? 'bg-[#3C3C3B] text-white'
                          : 'bg-[#E0E0E0] text-[#6E6E6B] cursor-not-allowed'
                      }`}
                    >
                      {eligible ? 'Resgatar pontos' : 'Em andamento'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* TAB 3: EXTRATO DE PONTOS */}
      {!pendingItem && tab === 'ledger' && (
        <section className="neo-glass rounded-[28px] p-5 sm:p-6 space-y-3">
          <h2 className="font-display font-bold text-base text-[#3C3C3B]">
            Extrato detalhado de pontuação
          </h2>
          {account.rewardsLedger.length === 0 ? (
            <p className="text-xs text-[#6E6E6B] py-4">
              Nenhuma movimentação de pontos registrada ainda. Conclua missões ou faça compras
              elegíveis para pontuar.
            </p>
          ) : (
            <div className="divide-y divide-[#E0E0E0]/60">
              {account.rewardsLedger.map((entry) => (
                <div
                  key={entry.id}
                  className="py-3 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <p className="font-semibold text-[#3C3C3B]">{entry.title}</p>
                    <p className="text-[11px] text-[#6E6E6B]">
                      {entry.origin} · {formatFullDate(entry.dateISO)} · {entry.status}
                    </p>
                  </div>
                  <span
                    className={`font-display font-bold tabular-nums ${
                      entry.kind === 'earn' ? 'text-[#2E7D32]' : 'text-[#3C3C3B]'
                    }`}
                  >
                    {entry.kind === 'earn' ? '+' : '-'}
                    {entry.points.toLocaleString('pt-BR')} pts
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* TAB 4: MEUS RESGATES */}
      {!pendingItem && tab === 'redemptions' && (
        <section className="neo-glass rounded-[28px] p-5 sm:p-6 space-y-3">
          <h2 className="font-display font-bold text-base text-[#3C3C3B]">Meus resgates</h2>
          {account.rewardsRedemptions.length === 0 ? (
            <p className="text-xs text-[#6E6E6B] py-4">
              Você ainda não resgatou benefícios no NeoRewards.
            </p>
          ) : (
            <div className="space-y-3">
              {account.rewardsRedemptions.map((red) => (
                <div
                  key={red.id}
                  className="p-4 rounded-2xl bg-white/85 border border-[#E0E0E0] flex flex-wrap items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-[#3C3C3B]">{red.title}</p>
                    <p className="text-xs text-[#6E6E6B]">
                      {red.category} · {formatFullDate(red.dateISO)} · -{red.pointsCost} pts
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => navigator.clipboard?.writeText(red.codeOrValue)}
                      className="min-h-[34px] px-3 rounded-lg bg-[#F4F4F1] text-xs font-mono text-[#3C3C3B] inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <ClipboardDocumentIcon className="w-3.5 h-3.5" />
                      <span>{red.codeOrValue}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleRedemptionUsed(red.id)}
                      className={`min-h-[34px] px-3 rounded-lg text-xs font-medium cursor-pointer ${
                        red.status === 'Disponível'
                          ? 'bg-[#7D8A71]/15 text-[#4B5842]'
                          : 'bg-[#E0E0E0] text-[#6E6E6B]'
                      }`}
                    >
                      {red.status}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
