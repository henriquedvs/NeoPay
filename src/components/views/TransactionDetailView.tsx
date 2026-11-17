import React, { useState } from 'react';
import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import { OFFICIAL_CARDS } from '../../data/neoSeed';
import { Transaction } from '../../types/neo';
import { formatBRL, formatFullDate, formatSignedBRL } from '../../utils/formatters';
import { NeoLogo } from '../NeoLogo';
import { OfficialCardVisual } from '../OfficialCardVisual';

interface TransactionDetailViewProps {
  transaction: Transaction;
  availableCategories: string[];
  hideBalances: boolean;
  onUpdateCategory: (txId: string, nextCategory: string) => void;
  onBack: () => void;
}

export const TransactionDetailView: React.FC<TransactionDetailViewProps> = ({
  transaction,
  availableCategories,
  hideBalances,
  onUpdateCategory,
  onBack,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);

  const isPositive = transaction.amount >= 0;

  const handleCopyAuth = () => {
    navigator.clipboard?.writeText(transaction.authCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1800);
  };

  const handleDownloadReceipt = () => {
    const lines = [
      'COMPROVANTE DEMONSTRATIVO NEOPAY — NEO',
      '---------------------------------------',
      `Título: ${transaction.title}`,
      `Contraparte: ${transaction.counterparty}`,
      `Valor: ${formatSignedBRL(transaction.amount)}`,
      `Data: ${formatFullDate(transaction.dateISO)} (${transaction.timeLabel})`,
      `Categoria: ${transaction.category}`,
      transaction.cardId
        ? `Cartão: ${OFFICIAL_CARDS[transaction.cardId].name} (${transaction.cardModeLabel || 'Visa'})`
        : `Operação: ${transaction.type.toUpperCase()}`,
      `Status: ${transaction.status}`,
      `Autenticação: ${transaction.authCode}`,
      transaction.notes ? `Descrição: ${transaction.notes}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comprovante-${transaction.authCode}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
            <h1 className="font-display font-semibold text-xl text-[#3C3C3B]">
              Detalhes da movimentação
            </h1>
            <p className="text-xs text-[#6E6E6B]">Comprovante integrado</p>
          </div>
        </div>
        <NeoLogo variant="neopay" size="sm" />
      </header>

      {/* Main Detail Card */}
      <section className="neo-glass rounded-[28px] p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[#E0E0E0]/65">
          <div>
            <p className="text-xs text-[#6E6E6B]">
              {formatFullDate(transaction.dateISO)} · {transaction.timeLabel}
            </p>
            <h2 className="font-display font-semibold text-xl sm:text-2xl text-[#3C3C3B] mt-1">
              {transaction.title}
            </h2>
            <p
              className={`font-display font-bold text-3xl tabular-nums mt-2 ${
                isPositive ? 'text-[#2E7D32]' : 'text-[#3C3C3B]'
              }`}
            >
              {formatSignedBRL(transaction.amount, hideBalances)}
            </p>
          </div>

          {transaction.cardId && (
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/80 border border-[#E0E0E0]/80">
              <OfficialCardVisual cardId={transaction.cardId} size="sm" />
              <div className="text-xs">
                <p className="font-display font-semibold text-[#3C3C3B]">
                  {OFFICIAL_CARDS[transaction.cardId].name}
                </p>
                <p className="text-[#6E6E6B]">{transaction.cardModeLabel || 'Visa'}</p>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="rounded-2xl bg-white/75 border border-[#E0E0E0]/75 p-4">
            <span className="text-[#6E6E6B] block">Origem / Destinatário</span>
            <span className="font-semibold text-sm text-[#3C3C3B] mt-0.5 block">
              {transaction.counterparty}
            </span>
          </div>

          <div className="rounded-2xl bg-white/75 border border-[#E0E0E0]/75 p-4">
            <span className="text-[#6E6E6B] block">Status e modalidade</span>
            <span className="font-semibold text-sm text-[#3C3C3B] mt-0.5 block">
              {transaction.status} · {transaction.type.toUpperCase()}
            </span>
          </div>

          <div className="rounded-2xl bg-white/75 border border-[#E0E0E0]/75 p-4">
            <span className="text-[#6E6E6B] block">Valor absoluto</span>
            <span className="font-semibold text-sm text-[#3C3C3B] tabular-nums mt-0.5 block">
              {formatBRL(Math.abs(transaction.amount), hideBalances)}
            </span>
          </div>

          <div className="rounded-2xl bg-white/75 border border-[#E0E0E0]/75 p-4 flex items-center justify-between">
            <div>
              <span className="text-[#6E6E6B] block">Código de autenticação</span>
              <span className="font-semibold text-sm text-[#3C3C3B] tabular-nums mt-0.5 block">
                {transaction.authCode}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyAuth}
              className="min-w-[40px] min-h-[40px] rounded-xl bg-[#F4F4F1] flex items-center justify-center text-[#3C3C3B] cursor-pointer"
              aria-label="Copiar código"
            >
              {copiedCode ? (
                <CheckIcon className="w-4 h-4 text-[#2E7D32]" />
              ) : (
                <ClipboardDocumentIcon className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Category Re-tagging */}
        <div className="rounded-2xl bg-white/75 border border-[#E0E0E0]/75 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-medium text-[#3C3C3B]">
            <TagIcon className="w-4 h-4 text-[#7D8A71]" />
            <span>Categoria financeira:</span>
          </div>
          <select
            value={transaction.category}
            onChange={(e) => onUpdateCategory(transaction.id, e.target.value)}
            className="min-h-[40px] px-3 rounded-xl bg-[#F4F4F1] border border-[#E0E0E0] text-xs font-medium text-[#3C3C3B] cursor-pointer"
          >
            {availableCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {transaction.notes && (
          <div className="rounded-2xl bg-[#F4F4F1] p-4 text-xs text-[#6E6E6B]">
            <span className="font-medium text-[#3C3C3B] block mb-0.5">Observações</span>
            {transaction.notes}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleDownloadReceipt}
            className="min-h-[44px] px-5 rounded-2xl bg-[#3C3C3B] text-white text-xs font-medium inline-flex items-center gap-2 cursor-pointer"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            <span>Exportar comprovante</span>
          </button>
        </div>
      </section>
    </div>
  );
};
