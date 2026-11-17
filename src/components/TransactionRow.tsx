import React, { useState } from 'react';
import {
  ArrowDownTrayIcon,
  ArrowsRightLeftIcon,
  BanknotesIcon,
  BuildingLibraryIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClipboardDocumentIcon,
  DocumentTextIcon,
  QrCodeIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { OFFICIAL_CARDS } from '../data/neoSeed';
import { Transaction } from '../types/neo';
import { formatBRL, formatFullDate, formatSignedBRL } from '../utils/formatters';
import { NeoLogo } from './NeoLogo';
import { OfficialCardVisual } from './OfficialCardVisual';

interface TransactionRowProps {
  transaction: Transaction;
  hideBalances: boolean;
  onSelect?: (transaction: Transaction) => void;
}

export const TransactionRow: React.FC<TransactionRowProps> = ({
  transaction,
  hideBalances,
  onSelect,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const isPositive = transaction.amount >= 0;

  const renderLeadingIcon = () => {
    if (transaction.cardId) {
      return (
        <div className="w-11 h-12 flex items-center justify-center shrink-0">
          <OfficialCardVisual cardId={transaction.cardId} size="xs" />
        </div>
      );
    }

    const Icon =
      transaction.type === 'pix'
        ? QrCodeIcon
        : transaction.type === 'boleto'
        ? DocumentTextIcon
        : transaction.type === 'ted'
        ? BuildingLibraryIcon
        : transaction.type === 'cashback'
        ? SparklesIcon
        : transaction.type === 'caixinha'
        ? BanknotesIcon
        : ArrowsRightLeftIcon;

    return (
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
          isPositive
            ? 'bg-[#7D8A71]/14 text-[#4B5842]'
            : 'bg-[#E0E0E0]/55 text-[#3C3C3B]'
        }`}
      >
        <Icon className="w-5 h-5" />
      </div>
    );
  };

  const handleCopyAuth = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(transaction.authCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1800);
  };

  const handleDownloadReceipt = (e: React.MouseEvent) => {
    e.stopPropagation();
    const lines = [
      'COMPROVANTE NEOPAY — BANCO NEO (403)',
      '---------------------------------------',
      `Título: ${transaction.title}`,
      `Favorecido / Origem: ${transaction.counterparty}`,
      `Valor: ${formatSignedBRL(transaction.amount)}`,
      `Data: ${formatFullDate(transaction.dateISO)} (${transaction.timeLabel})`,
      `Categoria: ${transaction.category}`,
      transaction.cardId
        ? `Cartão Oficial: ${OFFICIAL_CARDS[transaction.cardId].name} (${transaction.cardModeLabel || 'Visa'})`
        : `Meio: ${transaction.type.toUpperCase()}`,
      `Status: ${transaction.status}`,
      `Autenticação: ${transaction.authCode}`,
      transaction.notes ? `Observação: ${transaction.notes}` : '',
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

  const handleRowClick = () => {
    if (onSelect) {
      onSelect(transaction);
    } else {
      setExpanded((prev) => !prev);
    }
  };

  return (
    <div className="border-b border-[#E0E0E0]/60 last:border-b-0">
      <button
        type="button"
        onClick={handleRowClick}
        className="w-full py-3.5 px-3 sm:px-4 hover:bg-white/60 rounded-2xl transition-colors flex items-center justify-between gap-3 text-left cursor-pointer"
        aria-expanded={onSelect ? undefined : expanded}
      >
        <div className="flex items-center gap-3.5 min-w-0">
          {renderLeadingIcon()}
          <div className="min-w-0">
            <p className="text-sm font-medium text-[#3C3C3B] truncate">
              {transaction.title}
            </p>
            <p className="text-xs text-[#6E6E6B] truncate mt-0.5">
              {transaction.category}
              <span aria-hidden="true"> · </span>
              {transaction.timeLabel}
              {transaction.cardId && (
                <>
                  <span aria-hidden="true"> · </span>
                  <span className="text-[#3C3C3B]/80">
                    {OFFICIAL_CARDS[transaction.cardId].name}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="text-right">
            <p
              className={`text-sm font-semibold tabular-nums ${
                isPositive ? 'text-[#2E7D32]' : 'text-[#3C3C3B]'
              }`}
            >
              {formatSignedBRL(transaction.amount, hideBalances)}
            </p>
            <p className="text-[11px] text-[#6E6E6B]">{transaction.status}</p>
          </div>
          {onSelect ? (
            <ChevronRightIcon className="w-4 h-4 text-[#6E6E6B]" />
          ) : (
            <ChevronDownIcon
              className={`w-4 h-4 text-[#6E6E6B] transition-transform duration-200 ${
                expanded ? 'rotate-180' : ''
              }`}
            />
          )}
        </div>
      </button>

      {/* Integrated Inline Receipt Fallback */}
      {!onSelect && expanded && (
        <div className="mx-2 sm:mx-4 mb-4 mt-1 rounded-2xl bg-white/85 border border-[#E0E0E0]/85 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#E0E0E0]/60">
            <NeoLogo variant="neopay" size="sm" />
            <span className="text-xs text-[#6E6E6B] tabular-nums">
              {formatFullDate(transaction.dateISO)} · {transaction.timeLabel}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[#6E6E6B] block">Favorecido / Estabelecimento</span>
              <span className="font-medium text-[#3C3C3B]">{transaction.counterparty}</span>
            </div>
            <div>
              <span className="text-[#6E6E6B] block">Valor da operação</span>
              <span className="font-semibold text-[#3C3C3B] tabular-nums">
                {formatBRL(Math.abs(transaction.amount), hideBalances)}
              </span>
            </div>
            <div>
              <span className="text-[#6E6E6B] block">Autenticação NeoPay</span>
              <button
                type="button"
                onClick={handleCopyAuth}
                className="inline-flex items-center gap-1.5 font-medium text-[#3C3C3B] hover:text-[#7D8A71] cursor-pointer mt-0.5"
              >
                <span className="tabular-nums">{transaction.authCode}</span>
                {copiedCode ? (
                  <CheckIcon className="w-3.5 h-3.5 text-[#2E7D32]" />
                ) : (
                  <ClipboardDocumentIcon className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            {transaction.cardId ? (
              <div className="flex items-center gap-2.5">
                <OfficialCardVisual cardId={transaction.cardId} size="xs" />
                <div>
                  <span className="text-[#6E6E6B] block">Cartão oficial utilizado</span>
                  <span className="font-medium text-[#3C3C3B]">
                    {OFFICIAL_CARDS[transaction.cardId].name} ·{' '}
                    {transaction.cardModeLabel || 'Visa'}
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <span className="text-[#6E6E6B] block">Modalidade</span>
                <span className="font-medium text-[#3C3C3B]">
                  {transaction.type.toUpperCase()} · {transaction.status}
                </span>
              </div>
            )}
          </div>

          {transaction.notes && (
            <p className="text-xs text-[#6E6E6B] bg-[#F4F4F1] rounded-xl px-3 py-2">
              {transaction.notes}
            </p>
          )}

          <div className="flex items-center justify-end pt-1">
            <button
              type="button"
              onClick={handleDownloadReceipt}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#3C3C3B]/8 hover:bg-[#3C3C3B]/14 text-xs font-medium text-[#3C3C3B] transition-colors cursor-pointer"
            >
              <ArrowDownTrayIcon className="w-3.5 h-3.5" />
              <span>Baixar comprovante</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
