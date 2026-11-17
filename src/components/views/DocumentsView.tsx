import React, { useState } from 'react';
import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  DocumentCheckIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { Transaction, UserAccount } from '../../types/neo';
import { formatBRL, formatFullDate, formatSignedBRL, tierDisplayLabel } from '../../utils/formatters';

interface DocumentsViewProps {
  account: UserAccount;
  hideBalances: boolean;
  onBack: () => void;
  onSelectTransaction: (tx: Transaction) => void;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  account,
  hideBalances,
  onBack,
  onSelectTransaction,
}) => {
  const [downloadedDoc, setDownloadedDoc] = useState('');

  const downloadTextFile = (filename: string, lines: string[], label: string) => {
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setDownloadedDoc(label);
    setTimeout(() => setDownloadedDoc(''), 3000);
  };

  const handleDownloadStatement = () => {
    const lines = [
      'EXTRATO MENSAL DEMONSTRATIVO — BANCO NEO (403)',
      `Titular: ${account.fullName} (${account.document})`,
      `Agência: ${account.agency} · Conta: ${account.accountNumber}`,
      `Saldo atual: ${formatBRL(account.balance)}`,
      '--------------------------------------------------',
      ...(account.transactions.length === 0
        ? ['Nenhuma movimentação registrada no período.']
        : account.transactions.map(
            (t) =>
              `${formatFullDate(t.dateISO)} | ${t.title} | ${formatSignedBRL(t.amount)} | ${t.authCode}`
          )),
    ];
    downloadTextFile('extrato-mensal-neo.txt', lines, 'Extrato mensal consolidado');
  };

  const handleDownloadAccountProof = () => {
    const lines = [
      'COMPROVANTE DE CONTA DIGITAL — BANCO NEO (403)',
      `Perfil: ${tierDisplayLabel(account.tier)}`,
      `Titular: ${account.fullName}`,
      `Documento: ${account.document}`,
      `Agência: ${account.agency}`,
      `Conta Corrente: ${account.accountNumber}`,
      `Chaves Pix: ${account.pixKeys.join(', ')}`,
    ];
    downloadTextFile('comprovante-conta-neo.txt', lines, 'Comprovante de conta');
  };

  const handleDownloadIncomeReport = () => {
    const lines = [
      'INFORME DEMONSTRATIVO DE RENDIMENTOS & SALDOS — NEO',
      `Titular: ${account.fullName} · ${account.document}`,
      `Saldo em conta: ${formatBRL(account.balance)}`,
      `Saldo reservado em Cofrinhos: ${formatBRL(account.reservedBalance)}`,
      `Rendimento mensal demonstrativo: ${formatBRL(account.monthlyYield)}`,
    ];
    downloadTextFile('informe-rendimentos-neo.txt', lines, 'Informe de rendimentos');
  };

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
        <div>
          <h1 className="font-display font-bold text-2xl text-[#3C3C3B]">
            Central de Documentos
          </h1>
          <p className="text-xs text-[#6E6E6B]">
            Comprovantes, extratos mensais, informe e arquivos da conta
          </p>
        </div>
      </header>

      {downloadedDoc && (
        <div className="rounded-2xl bg-[#7D8A71]/15 border border-[#7D8A71]/35 px-4 py-3 text-xs font-medium text-[#3C3C3B] flex items-center gap-2">
          <CheckCircleIcon className="w-4 h-4 text-[#4B5842]" />
          <span>Download demonstrativo iniciado: {downloadedDoc}.</span>
        </div>
      )}

      {/* Primary Official Documents */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="neo-glass rounded-3xl p-5 flex flex-col justify-between gap-4">
          <div>
            <DocumentTextIcon className="w-6 h-6 text-[#7D8A71]" />
            <h2 className="font-display font-bold text-base text-[#3C3C3B] mt-2">
              Extrato mensal consolidado
            </h2>
            <p className="text-xs text-[#6E6E6B] mt-1">
              Movimentações completas e saldo de {formatBRL(account.balance, hideBalances)}.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownloadStatement}
            className="min-h-[40px] px-4 rounded-xl bg-[#3C3C3B] text-white text-xs font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            <span>Baixar extrato</span>
          </button>
        </div>

        <div className="neo-glass rounded-3xl p-5 flex flex-col justify-between gap-4">
          <div>
            <DocumentCheckIcon className="w-6 h-6 text-[#7D8A71]" />
            <h2 className="font-display font-bold text-base text-[#3C3C3B] mt-2">
              Comprovante de conta
            </h2>
            <p className="text-xs text-[#6E6E6B] mt-1">
              Declaração de titularidade com agência {account.agency} e conta {account.accountNumber}.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownloadAccountProof}
            className="min-h-[40px] px-4 rounded-xl bg-white border border-[#E0E0E0] text-xs font-medium text-[#3C3C3B] inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            <span>Baixar comprovante</span>
          </button>
        </div>

        <div className="neo-glass rounded-3xl p-5 flex flex-col justify-between gap-4">
          <div>
            <DocumentTextIcon className="w-6 h-6 text-[#7D8A71]" />
            <h2 className="font-display font-bold text-base text-[#3C3C3B] mt-2">
              Informe de rendimentos
            </h2>
            <p className="text-xs text-[#6E6E6B] mt-1">
              Resumo demonstrativo de saldos, reservas e rendimentos.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownloadIncomeReport}
            className="min-h-[40px] px-4 rounded-xl bg-white border border-[#E0E0E0] text-xs font-medium text-[#3C3C3B] inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            <span>Baixar informe</span>
          </button>
        </div>
      </div>

      {/* Transaction Receipts */}
      <section className="neo-glass rounded-[28px] p-5 sm:p-6 space-y-3">
        <h2 className="font-display font-bold text-base text-[#3C3C3B]">
          Comprovantes individuais de transações ({account.transactions.length})
        </h2>
        {account.transactions.length === 0 ? (
          <p className="text-xs text-[#6E6E6B] py-4">
            Nenhum comprovante emitido ainda nesta conta.
          </p>
        ) : (
          <div className="divide-y divide-[#E0E0E0]/60">
            {account.transactions.slice(0, 10).map((tx) => (
              <div
                key={tx.id}
                className="py-3 flex items-center justify-between gap-3 text-xs"
              >
                <button
                  type="button"
                  onClick={() => onSelectTransaction(tx)}
                  className="text-left min-w-0 flex-1 cursor-pointer"
                >
                  <p className="font-semibold text-[#3C3C3B] truncate">{tx.title}</p>
                  <p className="text-[11px] text-[#6E6E6B]">
                    {formatFullDate(tx.dateISO)} · {tx.authCode}
                  </p>
                </button>
                <span className="font-semibold text-[#3C3C3B] tabular-nums shrink-0">
                  {formatSignedBRL(tx.amount, hideBalances)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
