import React, { useMemo, useState } from 'react';
import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ChartBarIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import { OFFICIAL_CARD_ORDER, OFFICIAL_CARDS } from '../../data/neoSeed';
import { OfficialCardId, Transaction, TransactionType, UserAccount } from '../../types/neo';
import { formatBRL } from '../../utils/formatters';
import { OfficialCardVisual } from '../OfficialCardVisual';
import { TransactionRow } from '../TransactionRow';

interface TransactionsViewProps {
  account: UserAccount;
  hideBalances: boolean;
  onBack?: () => void;
  onSelectTransaction: (tx: Transaction) => void;
  onOpenFinance: () => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  account,
  hideBalances,
  onBack,
  onSelectTransaction,
  onOpenFinance,
}) => {
  const [search, setSearch] = useState('');
  const [flowFilter, setFlowFilter] = useState<'all' | 'in' | 'out'>('all');
  const [periodFilter, setPeriodFilter] = useState<'all' | '7d' | 'month'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [cardFilter, setCardFilter] = useState<'all' | OfficialCardId>('all');

  const allCategories = useMemo(() => {
    const set = new Set<string>(account.customCategories);
    account.transactions.forEach((t) => set.add(t.category));
    return Array.from(set);
  }, [account.customCategories, account.transactions]);

  const filtered = useMemo(() => {
    const now = new Date('2026-11-16T23:59:59');
    return account.transactions.filter((tx) => {
      if (flowFilter === 'in' && tx.amount < 0) return false;
      if (flowFilter === 'out' && tx.amount >= 0) return false;
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      if (categoryFilter !== 'all' && tx.category !== categoryFilter) return false;
      if (cardFilter !== 'all' && tx.cardId !== cardFilter) return false;

      if (periodFilter !== 'all') {
        const txDate = new Date(tx.dateISO + 'T12:00:00');
        const diffDays = Math.abs((now.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24));
        if (periodFilter === '7d' && diffDays > 7) return false;
        if (periodFilter === 'month' && tx.dateISO.slice(0, 7) !== '2026-11') return false;
      }

      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = `${tx.title} ${tx.counterparty} ${tx.category} ${tx.authCode}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    account.transactions,
    flowFilter,
    periodFilter,
    typeFilter,
    categoryFilter,
    cardFilter,
    search,
  ]);

  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;
    const categoryTotals: Record<string, number> = {};

    filtered.forEach((tx) => {
      if (tx.amount >= 0) {
        income += tx.amount;
      } else {
        const abs = Math.abs(tx.amount);
        expense += abs;
        categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + abs;
      }
    });

    const categories = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return { income, expense, net: income - expense, categories };
  }, [filtered]);

  const handleExportCSV = () => {
    const header = 'Data,Horario,Titulo,Contraparte,Categoria,Tipo,Cartao,Valor,Autenticacao\n';
    const rows = filtered
      .map((t) =>
        [
          t.dateISO,
          `"${t.timeLabel}"`,
          `"${t.title}"`,
          `"${t.counterparty}"`,
          t.category,
          t.type,
          t.cardId ? OFFICIAL_CARDS[t.cardId].name : '-',
          t.amount.toFixed(2),
          t.authCode,
        ].join(',')
      )
      .join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `extrato-neo-${account.accountNumber}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5 pt-2">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="min-h-[42px] min-w-[42px] rounded-xl bg-white/80 border border-[#E0E0E0]/85 flex items-center justify-center text-[#3C3C3B] hover:bg-white cursor-pointer"
              aria-label="Voltar ao início"
            >
              <ArrowLeftIcon className="w-4 h-4" />
            </button>
          )}
          <div>
            <h1 className="font-display font-semibold text-2xl text-[#3C3C3B]">Histórico</h1>
            <p className="text-xs text-[#6E6E6B]">
              Toque em uma movimentação para abrir os detalhes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenFinance}
            className="min-h-[40px] px-3.5 rounded-xl bg-[#7D8A71]/15 text-[#4B5842] text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
          >
            <ChartBarIcon className="w-4 h-4" />
            <span>Financeiro</span>
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="min-h-[40px] px-3.5 rounded-xl bg-white/85 hover:bg-white border border-[#E0E0E0] text-xs font-medium text-[#3C3C3B] inline-flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Period Summary & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <section className="lg:col-span-5 neo-glass rounded-[28px] p-5 flex flex-col justify-between space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-[#6E6E6B]">Entradas</p>
              <p className="font-display font-bold text-xl text-[#2E7D32] tabular-nums mt-0.5">
                {formatBRL(summary.income, hideBalances)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#6E6E6B]">Saídas</p>
              <p className="font-display font-bold text-xl text-[#3C3C3B] tabular-nums mt-0.5">
                {formatBRL(summary.expense, hideBalances)}
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-[#E0E0E0]/65 flex items-center justify-between">
            <span className="text-xs text-[#6E6E6B]">Resultado filtrado</span>
            <span
              className={`font-display font-semibold text-base tabular-nums ${
                summary.net >= 0 ? 'text-[#2E7D32]' : 'text-[#3C3C3B]'
              }`}
            >
              {formatBRL(summary.net, hideBalances)}
            </span>
          </div>
        </section>

        <section className="lg:col-span-7 neo-glass rounded-[28px] p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-semibold text-sm text-[#3C3C3B]">
              Distribuição por categoria
            </h2>
            <span className="text-xs text-[#6E6E6B] tabular-nums">
              {filtered.length} itens
            </span>
          </div>

          {summary.categories.length === 0 ? (
            <p className="text-xs text-[#6E6E6B] py-3">
              Sem saídas no filtro atual.
            </p>
          ) : (
            <div className="space-y-2.5">
              {summary.categories.map(([cat, val]) => {
                const pct = summary.expense > 0 ? Math.round((val / summary.expense) * 100) : 0;
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[#3C3C3B]">{cat}</span>
                      <span className="text-[#6E6E6B] tabular-nums">
                        {formatBRL(val, hideBalances)} · {pct}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[#E0E0E0]/75 overflow-hidden">
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

      {/* Filters + List */}
      <section className="neo-glass rounded-[28px] p-5 space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="w-4 h-4 text-[#6E6E6B] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar movimentação..."
              className="w-full min-h-[44px] pl-10 pr-4 rounded-xl bg-white/85 border border-[#E0E0E0] text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[#E0E0E0]/55">
              {(
                [
                  { id: 'all', label: 'Tudo' },
                  { id: 'in', label: 'Entradas' },
                  { id: 'out', label: 'Saídas' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFlowFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                    flowFilter === f.id
                      ? 'bg-white text-[#3C3C3B] shadow-sm'
                      : 'text-[#6E6E6B]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 p-1 rounded-xl bg-[#E0E0E0]/55">
              {(
                [
                  { id: 'all', label: 'Todo período' },
                  { id: '7d', label: '7 dias' },
                  { id: 'month', label: 'Este mês' },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriodFilter(p.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                    periodFilter === p.id
                      ? 'bg-white text-[#3C3C3B] shadow-sm'
                      : 'text-[#6E6E6B]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 border border-[#E0E0E0]">
              <FunnelIcon className="w-3.5 h-3.5 text-[#6E6E6B]" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as 'all' | TransactionType)}
                className="text-xs font-medium text-[#3C3C3B] bg-transparent focus:outline-none cursor-pointer"
                aria-label="Filtrar por meio"
              >
                <option value="all">Todos os meios</option>
                <option value="card">Cartões Neo</option>
                <option value="pix">Pix</option>
                <option value="boleto">Boletos</option>
                <option value="ted">TED</option>
                <option value="recarga">Recarga</option>
                <option value="cashback">Cashback</option>
                <option value="caixinha">Cofrinhos</option>
              </select>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 border border-[#E0E0E0]">
              <TagIcon className="w-3.5 h-3.5 text-[#6E6E6B]" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs font-medium text-[#3C3C3B] bg-transparent focus:outline-none cursor-pointer"
                aria-label="Filtrar por categoria"
              >
                <option value="all">Todas categorias</option>
                {allCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-[#6E6E6B] mr-1">Cartão:</span>
          <button
            type="button"
            onClick={() => setCardFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border cursor-pointer ${
              cardFilter === 'all'
                ? 'bg-[#3C3C3B] text-white border-[#3C3C3B]'
                : 'bg-white/75 text-[#3C3C3B] border-[#E0E0E0]'
            }`}
          >
            Todos
          </button>
          {OFFICIAL_CARD_ORDER.map((cid) => (
            <button
              key={cid}
              type="button"
              onClick={() => setCardFilter(cid)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border inline-flex items-center gap-2 cursor-pointer ${
                cardFilter === cid
                  ? 'bg-white border-[#7D8A71] ring-2 ring-[#7D8A71]/20 text-[#3C3C3B]'
                  : 'bg-white/75 border-[#E0E0E0] text-[#6E6E6B]'
              }`}
            >
              <OfficialCardVisual cardId={cid} size="xs" />
              <span>{OFFICIAL_CARDS[cid].name}</span>
            </button>
          ))}
        </div>

        <div>
          {filtered.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <p className="text-sm font-medium text-[#3C3C3B]">
                Nenhuma movimentação encontrada.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setFlowFilter('all');
                  setPeriodFilter('all');
                  setTypeFilter('all');
                  setCategoryFilter('all');
                  setCardFilter('all');
                }}
                className="text-xs font-medium text-[#7D8A71] hover:underline cursor-pointer"
              >
                Limpar filtros
              </button>
            </div>
          ) : (
            filtered.map((tx) => (
              <TransactionRow
                key={tx.id}
                transaction={tx}
                hideBalances={hideBalances}
                onSelect={onSelectTransaction}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
};
