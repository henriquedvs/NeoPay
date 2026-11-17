import React, { useMemo, useState } from 'react';
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { SHOP_ITEMS } from '../../data/neoSeed';
import {
  AccountSubMode,
  AppSection,
  EcosystemTab,
  PaymentSubMode,
  Transaction,
  UserAccount,
} from '../../types/neo';
import { formatBRL, formatSignedBRL } from '../../utils/formatters';

interface GlobalSearchViewProps {
  account: UserAccount;
  hideBalances: boolean;
  onBack: () => void;
  onNavigate: (
    section: AppSection,
    paymentSubMode?: PaymentSubMode,
    accountSubMode?: AccountSubMode
  ) => void;
  onOpenEcosystem: (tab: EcosystemTab) => void;
  onSelectTransaction: (tx: Transaction) => void;
}

export const GlobalSearchView: React.FC<GlobalSearchViewProps> = ({
  account,
  hideBalances,
  onBack,
  onNavigate,
  onOpenEcosystem,
  onSelectTransaction,
}) => {
  const [query, setQuery] = useState('');

  const quickIndex = useMemo(
    () => [
      { title: 'Enviar Pix', group: 'Pagamentos', action: () => onNavigate('payments', 'pix') },
      { title: 'Pagar Boleto', group: 'Pagamentos', action: () => onNavigate('payments', 'boleto') },
      { title: 'Transferências TED / Entre Neo', group: 'Pagamentos', action: () => onNavigate('payments', 'ted') },
      { title: 'Contas de consumo (Água/Luz/Gás/Internet)', group: 'Pagamentos', action: () => onNavigate('payments', 'consumo') },
      { title: 'Tributos e impostos (DAS/DARF/IPVA)', group: 'Pagamentos', action: () => onNavigate('payments', 'tributos') },
      { title: 'Recarga de celular', group: 'Pagamentos', action: () => onNavigate('payments', 'recarga') },
      { title: 'Meus cartões e solicitação', group: 'Cartões', action: () => onNavigate('cards') },
      { title: 'NeoRewards · Pontos e resgates', group: 'Benefícios', action: () => onNavigate('rewards') },
      { title: 'Neo Cofrinhos', group: 'Ecossistema', action: () => onOpenEcosystem('cofrinhos') },
      { title: 'Neo Agenda', group: 'Ecossistema', action: () => onOpenEcosystem('agenda') },
      { title: 'Central de Documentos', group: 'Documentos', action: () => onNavigate('documents') },
      { title: 'Central Financeira', group: 'Financeiro', action: () => onNavigate('finance') },
      { title: 'Segurança, senha e PIN', group: 'Configurações', action: () => onNavigate('account', undefined, 'security') },
      { title: 'Aparência (Claro / Escuro)', group: 'Configurações', action: () => onNavigate('account', undefined, 'appearance') },
      { title: 'Notificações da conta', group: 'Alertas', action: () => onNavigate('notifications') },
      { title: 'Suporte e Chat Neo', group: 'Configurações', action: () => onNavigate('account', undefined, 'help') },
    ],
    [onNavigate, onOpenEcosystem]
  );

  const q = query.trim().toLowerCase();

  const matchingFeatures = useMemo(() => {
    if (!q) return quickIndex.slice(0, 6);
    return quickIndex.filter((it) => `${it.title} ${it.group}`.toLowerCase().includes(q));
  }, [quickIndex, q]);

  const matchingTx = useMemo(() => {
    if (!q) return [];
    return account.transactions
      .filter((t) => `${t.title} ${t.counterparty} ${t.category}`.toLowerCase().includes(q))
      .slice(0, 5);
  }, [account.transactions, q]);

  const matchingShop = useMemo(() => {
    if (!q) return [];
    return SHOP_ITEMS.filter((s) =>
      `${s.title} ${s.brand} ${s.category}`.toLowerCase().includes(q)
    ).slice(0, 4);
  }, [q]);

  const matchingCards = useMemo(() => {
    if (!q) return [];
    return account.cards.filter((c) => `${c.label} ${c.last4}`.toLowerCase().includes(q));
  }, [account.cards, q]);

  return (
    <div className="space-y-5 pt-2">
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="min-h-[42px] min-w-[42px] rounded-xl bg-white/85 border border-[#E0E0E0] flex items-center justify-center text-[#3C3C3B] cursor-pointer"
          aria-label="Voltar"
        >
          <ArrowLeftIcon className="w-4 h-4" />
        </button>
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="w-4 h-4 text-[#6E6E6B] absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar em todo o NEO (Pix, configurações, transações, Shop, cartões...)"
            className="w-full min-h-[46px] pl-11 pr-4 rounded-2xl bg-white/90 border border-[#E0E0E0] text-sm"
          />
        </div>
      </header>

      <div className="space-y-5">
        {matchingFeatures.length > 0 && (
          <section className="neo-glass rounded-[28px] p-4 sm:p-5 space-y-2">
            <h2 className="font-display font-bold text-xs text-[#6E6E6B] px-1">
              {q ? 'Serviços e configurações' : 'Sugestões rápidas'}
            </h2>
            <div className="divide-y divide-[#E0E0E0]/60">
              {matchingFeatures.map((item) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={item.action}
                  className="w-full py-3 px-2 flex items-center justify-between text-left hover:bg-white/60 rounded-xl cursor-pointer"
                >
                  <div>
                    <p className="text-sm font-semibold text-[#3C3C3B]">{item.title}</p>
                    <p className="text-[11px] text-[#7D8A71]">{item.group}</p>
                  </div>
                  <ChevronRightIcon className="w-4 h-4 text-[#6E6E6B]" />
                </button>
              ))}
            </div>
          </section>
        )}

        {matchingCards.length > 0 && (
          <section className="neo-glass rounded-[28px] p-4 sm:p-5 space-y-2">
            <h2 className="font-display font-bold text-xs text-[#6E6E6B] px-1">Cartões</h2>
            {matchingCards.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onNavigate('cards')}
                className="w-full py-2.5 px-2 flex items-center justify-between text-left hover:bg-white/60 rounded-xl cursor-pointer"
              >
                <span className="text-sm font-semibold text-[#3C3C3B]">
                  {c.label} · Final {c.last4}
                </span>
                <ChevronRightIcon className="w-4 h-4 text-[#6E6E6B]" />
              </button>
            ))}
          </section>
        )}

        {matchingTx.length > 0 && (
          <section className="neo-glass rounded-[28px] p-4 sm:p-5 space-y-2">
            <h2 className="font-display font-bold text-xs text-[#6E6E6B] px-1">Transações</h2>
            {matchingTx.map((tx) => (
              <button
                key={tx.id}
                type="button"
                onClick={() => onSelectTransaction(tx)}
                className="w-full py-2.5 px-2 flex items-center justify-between text-left hover:bg-white/60 rounded-xl cursor-pointer text-xs"
              >
                <div>
                  <p className="font-semibold text-[#3C3C3B]">{tx.title}</p>
                  <p className="text-[11px] text-[#6E6E6B]">{tx.counterparty}</p>
                </div>
                <span className="font-bold text-[#3C3C3B] tabular-nums">
                  {formatSignedBRL(tx.amount, hideBalances)}
                </span>
              </button>
            ))}
          </section>
        )}

        {matchingShop.length > 0 && (
          <section className="neo-glass rounded-[28px] p-4 sm:p-5 space-y-2">
            <h2 className="font-display font-bold text-xs text-[#6E6E6B] px-1">Neo Shop</h2>
            {matchingShop.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onNavigate('shop')}
                className="w-full py-2.5 px-2 flex items-center justify-between text-left hover:bg-white/60 rounded-xl cursor-pointer text-xs"
              >
                <div>
                  <p className="font-semibold text-[#3C3C3B]">{s.title}</p>
                  <p className="text-[11px] text-[#6E6E6B]">{s.brand}</p>
                </div>
                <span className="font-bold text-[#3C3C3B] tabular-nums">
                  {formatBRL(s.price)}
                </span>
              </button>
            ))}
          </section>
        )}
      </div>
    </div>
  );
};
