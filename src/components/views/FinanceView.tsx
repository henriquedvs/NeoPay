import React, { useMemo, useState } from 'react';
import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ChartBarIcon,
  LightBulbIcon,
  PlusIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { EcosystemTab, UserAccount } from '../../types/neo';
import { formatBRL, isCreditAllowed } from '../../utils/formatters';

interface FinanceViewProps {
  account: UserAccount;
  hideBalances: boolean;
  onBack: () => void;
  onAddCustomCategory: (name: string) => void;
  onSaveBudget: (category: string, limitAmount: number) => void;
  onOpenEcosystem: (tab: EcosystemTab) => void;
}

export const FinanceView: React.FC<FinanceViewProps> = ({
  account,
  hideBalances,
  onBack,
  onAddCustomCategory,
  onSaveBudget,
  onOpenEcosystem,
}) => {
  const [newCategory, setNewCategory] = useState('');
  const [budgetCat, setBudgetCat] = useState('Compras');
  const [budgetLimit, setBudgetLimit] = useState('');

  const creditAllowed = isCreditAllowed(account);

  const metrics = useMemo(() => {
    let entries = 0;
    let exits = 0;
    const byCategory: Record<string, number> = {};

    account.transactions.forEach((tx) => {
      if (tx.amount >= 0) {
        entries += tx.amount;
      } else {
        const abs = Math.abs(tx.amount);
        exits += abs;
        byCategory[tx.category] = (byCategory[tx.category] || 0) + abs;
      }
    });

    const sortedCats = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
    const activeSubsTotal = account.subscriptions
      .filter((s) => s.active)
      .reduce((sum, s) => sum + s.amount, 0);

    return { entries, exits, net: entries - exits, sortedCats, activeSubsTotal, byCategory };
  }, [account.transactions, account.subscriptions]);

  const hasComparisonData =
    account.transactions.length > 0 || account.monthlyIncome > 0;

  const monthComparison = [
    {
      month: 'Set',
      inVal: Math.round(account.monthlyIncome * 0.88),
      outVal: Math.round(metrics.exits * 0.92),
    },
    {
      month: 'Out',
      inVal: Math.round(account.monthlyIncome * 0.95),
      outVal: Math.round(metrics.exits * 1.08),
    },
    {
      month: 'Nov',
      inVal: Math.round(metrics.entries || account.monthlyIncome),
      outVal: Math.round(metrics.exits),
    },
  ];
  const maxBar = Math.max(
    1,
    ...monthComparison.flatMap((m) => [m.inVal, m.outVal])
  );

  const handleExportReport = () => {
    const report = {
      conta: account.displayName,
      modalidade: creditAllowed ? 'Padrão' : 'Jovem 14+ (somente débito)',
      periodo: 'Novembro 2026',
      entradas: metrics.entries,
      saidas: metrics.exits,
      saldoLiquidoPeriodo: metrics.net,
      assinaturasMensais: metrics.activeSubsTotal,
      gastosPorCategoria: metrics.byCategory,
      metasOrcamento: account.budgets,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-financeiro-neo.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5 pt-2">
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
            <h1 className="font-display font-bold text-2xl text-[#3C3C3B]">Financeiro</h1>
            <p className="text-xs text-[#6E6E6B]">
              {creditAllowed
                ? 'Relatórios, metas, assinaturas e Neo Insights'
                : 'Controle de gastos no débito, metas e educação financeira 14+'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleExportReport}
          className="min-h-[40px] px-3.5 rounded-xl bg-white/85 border border-[#E0E0E0] text-xs font-medium text-[#3C3C3B] inline-flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowDownTrayIcon className="w-4 h-4" />
          <span>Exportar relatório</span>
        </button>
      </header>

      {/* Top 3 KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="neo-glass rounded-3xl p-5">
          <p className="text-xs text-[#6E6E6B]">Entradas registradas</p>
          <p className="font-display font-bold text-2xl text-[#2E7D32] tabular-nums mt-1">
            {formatBRL(metrics.entries, hideBalances)}
          </p>
        </div>
        <div className="neo-glass rounded-3xl p-5">
          <p className="text-xs text-[#6E6E6B]">Saídas registradas</p>
          <p className="font-display font-bold text-2xl text-[#3C3C3B] tabular-nums mt-1">
            {formatBRL(metrics.exits, hideBalances)}
          </p>
        </div>
        <div className="neo-glass rounded-3xl p-5">
          <p className="text-xs text-[#6E6E6B]">Assinaturas ativas / mês</p>
          <p className="font-display font-bold text-2xl text-[#7D8A71] tabular-nums mt-1">
            {formatBRL(metrics.activeSubsTotal, hideBalances)}
          </p>
        </div>
      </div>

      {/* Month Comparison + Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <section className="lg:col-span-6 neo-glass rounded-[28px] p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ChartBarIcon className="w-5 h-5 text-[#7D8A71]" />
            <h2 className="font-display font-bold text-base text-[#3C3C3B]">
              Comparação entre meses
            </h2>
          </div>

          {!hasComparisonData ? (
            <p className="text-xs text-[#6E6E6B] py-4">
              Ainda não há entradas ou saídas suficientes para comparar meses anteriores.
            </p>
          ) : (
            <div className="space-y-4 pt-2">
              {monthComparison.map((m) => (
                <div key={m.month} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#3C3C3B]">{m.month} 2026</span>
                    <span className="text-[#6E6E6B] tabular-nums">
                      +{formatBRL(m.inVal, hideBalances)} / -{formatBRL(m.outVal, hideBalances)}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="h-2 rounded-full bg-[#E0E0E0]/60 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#7D8A71]"
                        style={{ width: `${Math.round((m.inVal / maxBar) * 100)}%` }}
                      />
                    </div>
                    <div className="h-2 rounded-full bg-[#E0E0E0]/60 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#3C3C3B]"
                        style={{ width: `${Math.round((m.outVal / maxBar) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="lg:col-span-6 neo-glass rounded-[28px] p-5 sm:p-6 space-y-4">
          <h2 className="font-display font-bold text-base text-[#3C3C3B]">
            Gastos por categoria
          </h2>
          {metrics.sortedCats.length === 0 ? (
            <p className="text-xs text-[#6E6E6B]">Sem gastos registrados.</p>
          ) : (
            <div className="space-y-3">
              {metrics.sortedCats.map(([cat, val]) => {
                const pct = metrics.exits > 0 ? Math.round((val / metrics.exits) * 100) : 0;
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[#3C3C3B]">{cat}</span>
                      <span className="text-[#6E6E6B] tabular-nums">
                        {formatBRL(val, hideBalances)} · {pct}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-[#E0E0E0]/70 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#7D8A71]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Planning & Budgets + Custom Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <section className="lg:col-span-7 neo-glass rounded-[28px] p-5 sm:p-6 space-y-4">
          <h2 className="font-display font-bold text-base text-[#3C3C3B]">
            Planejamento e metas por categoria
          </h2>

          {account.budgets.length === 0 ? (
            <p className="text-xs text-[#6E6E6B]">
              Nenhuma meta definida ainda. Crie um teto mensal abaixo para acompanhar seus gastos.
            </p>
          ) : (
            <div className="space-y-3">
              {account.budgets.map((b) => {
                const spent = metrics.byCategory[b.category] || 0;
                const pct = Math.min(
                  100,
                  b.limitAmount > 0 ? Math.round((spent / b.limitAmount) * 100) : 0
                );
                const over = spent > b.limitAmount;
                return (
                  <div
                    key={b.id}
                    className="rounded-2xl bg-white/80 border border-[#E0E0E0]/80 p-3.5 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#3C3C3B]">{b.category}</span>
                      <span
                        className={`tabular-nums font-medium ${
                          over ? 'text-red-700' : 'text-[#6E6E6B]'
                        }`}
                      >
                        {formatBRL(spent, hideBalances)} de {formatBRL(b.limitAmount, hideBalances)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-[#E0E0E0]/70 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${over ? 'bg-red-600' : 'bg-[#7D8A71]'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const val = Number(budgetLimit);
              if (val > 0) {
                onSaveBudget(budgetCat, val);
                setBudgetLimit('');
              }
            }}
            className="flex flex-wrap gap-2 pt-2 border-t border-[#E0E0E0]/60"
          >
            <select
              value={budgetCat}
              onChange={(e) => setBudgetCat(e.target.value)}
              className="min-h-[40px] px-3 rounded-xl bg-white/85 border border-[#E0E0E0] text-xs"
            >
              {['Compras', 'Alimentação', 'Transporte', 'Assinaturas', ...account.customCategories].map(
                (c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                )
              )}
            </select>
            <input
              type="number"
              value={budgetLimit}
              onChange={(e) => setBudgetLimit(e.target.value)}
              placeholder="Teto mensal R$"
              className="flex-1 min-w-[120px] min-h-[40px] px-3 rounded-xl bg-white/85 border border-[#E0E0E0] text-xs tabular-nums"
            />
            <button
              type="submit"
              className="min-h-[40px] px-4 rounded-xl bg-[#3C3C3B] text-white text-xs font-medium cursor-pointer"
            >
              Definir meta
            </button>
          </form>
        </section>

        {/* Custom Categories + Neo Insights + Subscriptions Shortcut */}
        <section className="lg:col-span-5 space-y-5">
          <div className="neo-glass rounded-[28px] p-5 space-y-3">
            <div className="flex items-center gap-2">
              <LightBulbIcon className="w-5 h-5 text-[#7D8A71]" />
              <h2 className="font-display font-bold text-sm text-[#3C3C3B]">
                Neo Insights
              </h2>
            </div>
            <p className="text-xs text-[#6E6E6B] leading-relaxed">
              {metrics.sortedCats[0]
                ? `Sua maior categoria de gasto neste ciclo é ${metrics.sortedCats[0][0]} (${formatBRL(metrics.sortedCats[0][1], hideBalances)}).`
                : 'Seus gastos estão zerados ou equilibrados neste período.'}
            </p>
            <button
              type="button"
              onClick={() => onOpenEcosystem('assinaturas')}
              className="w-full min-h-[42px] rounded-xl bg-[#3C3C3B] text-white text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <SparklesIcon className="w-4 h-4" />
              <span>Gerenciar Neo Assinaturas</span>
            </button>
          </div>

          <div className="neo-glass rounded-[28px] p-5 space-y-3">
            <h2 className="font-display font-bold text-sm text-[#3C3C3B]">
              Categorias personalizadas
            </h2>
            <div className="flex flex-wrap gap-2">
              {account.customCategories.map((c) => (
                <span
                  key={c}
                  className="text-xs font-medium text-[#3C3C3B] bg-white/85 border border-[#E0E0E0] px-3 py-1.5 rounded-xl"
                >
                  {c}
                </span>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newCategory.trim()) {
                  onAddCustomCategory(newCategory.trim());
                  setNewCategory('');
                }
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Nova categoria..."
                className="flex-1 min-h-[40px] px-3 rounded-xl bg-white/85 border border-[#E0E0E0] text-xs"
              />
              <button
                type="submit"
                className="min-h-[40px] px-3.5 rounded-xl bg-[#7D8A71] text-white text-xs font-medium inline-flex items-center gap-1 cursor-pointer"
              >
                <PlusIcon className="w-4 h-4" />
                <span>Criar</span>
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
};
