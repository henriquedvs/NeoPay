import React, { useEffect, useState } from 'react';
import {
  ArrowLeftIcon,
  ArrowRightOnRectangleIcon,
  BanknotesIcon,
  BellIcon,
  BuildingLibraryIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  CheckIcon,
  ChevronRightIcon,
  ClipboardDocumentIcon,
  CreditCardIcon,
  DevicePhoneMobileIcon,
  DocumentCheckIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  EyeSlashIcon,
  LockClosedIcon,
  PaintBrushIcon,
  PaperAirplaneIcon,
  QuestionMarkCircleIcon,
  ShieldCheckIcon,
  SunIcon,
  TrashIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import {
  AccountSettings,
  AccountSubMode,
  EcosystemTab,
  OfficialCardId,
  NeoCard,
  UserAccount,
} from '../../types/neo';
import {
  formatBRL,
  isCreditAllowed,
  maskPhone,
  tierDisplayLabel,
} from '../../utils/formatters';
import { OfficialCardVisual } from '../OfficialCardVisual';

interface AccountViewProps {
  account: UserAccount;
  allAccounts: UserAccount[];
  hideBalances: boolean;
  initialSubMode?: AccountSubMode;
  onDepositToAccount: (amount: number) => void;
  onUpdateProfile: (patch: Partial<UserAccount>) => void;
  onUpdateSettings: (patch: Partial<AccountSettings>) => void;
  onUpdateCard: (cardId: OfficialCardId, patch: Partial<NeoCard>) => void;
  onCreateSupportTicket: (subject: string) => void;
  onRevokeDevice: (deviceId: string) => void;
  onSwitchAccount: (target: UserAccount) => void;
  onCloseAccount: () => void;
  onOpenFinance: () => void;
  onOpenDocuments: () => void;
  onOpenEcosystem: (tab: EcosystemTab) => void;
  onLogout: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'support';
  text: string;
  time: string;
}

const FAQ_ITEMS = [
  {
    q: 'Como funciona o ambiente demonstrativo do Neo?',
    a: 'Todas as transações, cartões, solicitações de entrega, Cofrinhos e compras no Neo Shop operam em memória para simulação fiel da experiência bancária sem movimentar dinheiro real.',
  },
  {
    q: 'Quais as regras para a conta Adolescente (14+)?',
    a: 'A conta para jovens de 14 a 17 anos exige CPF válido, dados do responsável legal e opera exclusivamente no modo débito, sem cartões de crédito, limites ou empréstimos.',
  },
  {
    q: 'Como solicitar e desbloquear meu cartão físico?',
    a: 'Acesse a aba Cartões, escolha um modelo oficial Neo, informe seu endereço de entrega, acompanhe as 8 etapas do envio e conclua o desbloqueio em 4 passos.',
  },
];

export const AccountView: React.FC<AccountViewProps> = ({
  account,
  allAccounts,
  hideBalances,
  initialSubMode = 'hub',
  onDepositToAccount,
  onUpdateProfile,
  onUpdateSettings,
  onUpdateCard,
  onCreateSupportTicket,
  onRevokeDevice,
  onSwitchAccount,
  onCloseAccount,
  onOpenFinance,
  onOpenDocuments,
  onOpenEcosystem,
  onLogout,
}) => {
  const creditAllowed = isCreditAllowed(account);
  const [subTab, setSubTab] = useState<AccountSubMode>(initialSubMode);
  const [copiedBank, setCopiedBank] = useState(false);
  const [depositInput, setDepositInput] = useState('');

  // Editable Profile fields
  const [displayName, setDisplayName] = useState(account.displayName);
  const [email, setEmail] = useState(account.email);
  const [phone, setPhone] = useState(account.phone);
  const [address, setAddress] = useState(account.address || '');
  const [pin4, setPin4] = useState(account.pin4);
  const [newPassword, setNewPassword] = useState('');
  const [feedback, setFeedback] = useState('');

  // Support Chat & Tickets
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);
  const [chatInput, setChatInput] = useState('');
  const [ticketSubject, setTicketSubject] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      sender: 'support',
      text: `Olá, ${account.displayName}! Sou o canal de atendimento Neo. Como posso ajudar você hoje?`,
      time: 'Agora',
    },
  ]);

  // Closure flow
  const [closureStep, setClosureStep] = useState<0 | 1 | 2>(0);
  const [closureReason, setClosureReason] = useState('Apenas testando a plataforma');
  const [closurePin, setClosurePin] = useState('');
  const [closureError, setClosureError] = useState('');

  useEffect(() => {
    setSubTab(initialSubMode);
  }, [initialSubMode]);

  useEffect(() => {
    setDisplayName(account.displayName);
    setEmail(account.email);
    setPhone(account.phone);
    setAddress(account.address || '');
    setPin4(account.pin4);
    setClosureStep(0);
  }, [account]);

  const totalCaixinhas = account.caixinhas.reduce((sum, c) => sum + c.currentAmount, 0);

  const initials = account.displayName
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const notify = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 3200);
  };

  const handleCopyBankData = () => {
    const txt = `Banco 403 - Neo | Ag: ${account.agency} | Conta: ${account.accountNumber} | Titular: ${account.fullName} | Doc: ${account.document}`;
    navigator.clipboard?.writeText(txt);
    setCopiedBank(true);
    setTimeout(() => setCopiedBank(false), 1800);
  };

  const handleAddDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    const numeric = Number(depositInput.replace(',', '.'));
    if (!numeric || numeric <= 0) return;
    onDepositToAccount(numeric);
    setDepositInput('');
    notify(`Crédito demonstrativo de ${formatBRL(numeric)} adicionado.`);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      displayName: displayName.trim() || account.displayName,
      email: email.trim() || account.email,
      phone: phone.trim() || account.phone,
      address: address.trim() || account.address,
    });
    notify('Dados pessoais atualizados com sucesso.');
  };

  const handleSaveSecurity = (e: React.FormEvent) => {
    e.preventDefault();
    const patch: Partial<UserAccount> = {};
    if (/^\d{4}$/.test(pin4)) patch.pin4 = pin4;
    if (newPassword.trim().length >= 6) patch.password = newPassword.trim();
    onUpdateProfile(patch);
    setNewPassword('');
    notify('Credenciais de segurança atualizadas.');
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;

    const nowTime = new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text,
      time: nowTime,
    };

    const lower = text.toLowerCase();
    let reply =
      'Entendido! Registrei sua dúvida no protocolo demonstrativo #NEO-403. Você pode consultar sua solicitação abaixo ou na Central de Ajuda.';
    if (lower.includes('pix')) {
      reply =
        'Para transferir via Pix, acesse Pagamentos > Enviar Pix. Lá você também configura limites diurno e noturno.';
    } else if (lower.includes('cart')) {
      reply =
        'Na aba Cartões você solicita novos cartões oficiais, acompanha o envio em 8 etapas e desbloqueia após o recebimento.';
    } else if (lower.includes('pin') || lower.includes('senha')) {
      reply = 'Você pode atualizar seu PIN de 4 dígitos ou senha em Conta > Segurança.';
    }

    const supportMsg: ChatMessage = {
      id: `s-${Date.now() + 1}`,
      sender: 'support',
      text: reply,
      time: nowTime,
    };

    setChatMessages((prev) => [...prev, userMsg, supportMsg]);
    setChatInput('');
  };

  const handleConfirmClosure = (e: React.FormEvent) => {
    e.preventDefault();
    if (closurePin !== account.pin4) {
      setClosureError(`PIN incorreto. (PIN demo: ${account.pin4})`);
      return;
    }
    onCloseAccount();
  };

  const settingsCategories: {
    id: AccountSubMode;
    title: string;
    subtitle: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      id: 'overview',
      title: 'Minha conta',
      subtitle: 'Dados pessoais, bancários, endereço e depósito demo',
      icon: UserCircleIcon,
    },
    {
      id: 'security',
      title: 'Segurança',
      subtitle: 'Senha, PIN, biometria, 2FA, dispositivos e acessos',
      icon: ShieldCheckIcon,
    },
    {
      id: 'cards_prefs',
      title: 'Cartões',
      subtitle: creditAllowed
        ? 'Preferências, online, NFC, limites e bloqueio'
        : 'Preferências de débito, online, NFC e bloqueio',
      icon: CreditCardIcon,
    },
    {
      id: 'notifications_prefs',
      title: 'Notificações',
      subtitle: 'Pix, compras, transferências, pagamentos e segurança',
      icon: BellIcon,
    },
    {
      id: 'appearance',
      title: 'Aparência',
      subtitle: 'Tema claro/escuro/auto, modo compacto e animações',
      icon: PaintBrushIcon,
    },
    {
      id: 'privacy',
      title: 'Privacidade e conta',
      subtitle: 'Consentimentos LGPD, termos, perfis e encerramento',
      icon: LockClosedIcon,
    },
    {
      id: 'help',
      title: 'Suporte',
      subtitle: 'Central de ajuda, FAQ, chat e solicitações abertas',
      icon: QuestionMarkCircleIcon,
    },
    {
      id: 'documents',
      title: 'Documentos',
      subtitle: 'Verificação cadastral e documentos enviados',
      icon: DocumentCheckIcon,
    },
  ];

  const subTitles: Record<AccountSubMode, string> = {
    hub: account.displayName,
    overview: 'Minha conta',
    security: 'Segurança e dispositivos',
    cards_prefs: 'Preferências de cartões',
    notifications_prefs: 'Notificações',
    appearance: 'Aparência',
    privacy: 'Privacidade e termos',
    help: 'Suporte e atendimento',
    documents: 'Documentação da conta',
    terms: 'Privacidade e termos',
  };

  return (
    <div className="space-y-5 pt-2">
      {/* Header */}
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {subTab !== 'hub' ? (
            <button
              type="button"
              onClick={() => setSubTab('hub')}
              className="min-h-[42px] min-w-[42px] rounded-xl bg-white/85 border border-[#E0E0E0] flex items-center justify-center text-[#3C3C3B] cursor-pointer shrink-0"
              aria-label="Voltar para Configurações"
            >
              <ArrowLeftIcon className="w-4 h-4" />
            </button>
          ) : (
            <div className="w-12 h-12 rounded-full bg-[#3C3C3B] text-white font-display font-bold text-base flex items-center justify-center shrink-0">
              {initials}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="font-display font-bold text-xl sm:text-2xl text-[#3C3C3B] truncate">
              {subTitles[subTab]}
            </h1>
            <p className="text-xs text-[#6E6E6B] truncate">
              {tierDisplayLabel(account.tier)} · Ag {account.agency} · CC {account.accountNumber}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="min-h-[42px] px-3.5 rounded-xl bg-white/85 hover:bg-white border border-[#E0E0E0] text-xs font-medium text-[#3C3C3B] inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
        >
          <ArrowRightOnRectangleIcon className="w-4 h-4" />
          <span>Sair</span>
        </button>
      </header>

      {feedback && (
        <div className="rounded-2xl bg-[#7D8A71]/15 border border-[#7D8A71]/35 px-4 py-3 text-xs font-medium text-[#3C3C3B] flex items-center gap-2">
          <CheckCircleIcon className="w-4 h-4 text-[#4B5842] shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* SETTINGS HUB (CATEGORIZED SUB-SCREENS) */}
      {subTab === 'hub' && (
        <div className="space-y-5">
          {/* Quick Shortcuts Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={onOpenDocuments}
              className="neo-glass rounded-2xl p-4 flex items-center gap-3 text-left hover:bg-white/95 cursor-pointer"
            >
              <DocumentTextIcon className="w-5 h-5 text-[#7D8A71] shrink-0" />
              <div>
                <p className="font-display font-bold text-xs text-[#3C3C3B]">Central de Documentos</p>
                <p className="text-[11px] text-[#6E6E6B]">Extratos, informes e recibos</p>
              </div>
            </button>
            <button
              type="button"
              onClick={onOpenFinance}
              className="neo-glass rounded-2xl p-4 flex items-center gap-3 text-left hover:bg-white/95 cursor-pointer"
            >
              <ChartBarIcon className="w-5 h-5 text-[#7D8A71] shrink-0" />
              <div>
                <p className="font-display font-bold text-xs text-[#3C3C3B]">Central Financeira</p>
                <p className="text-[11px] text-[#6E6E6B]">Orçamentos e relatórios</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => onOpenEcosystem('cofrinhos')}
              className="neo-glass rounded-2xl p-4 flex items-center gap-3 text-left hover:bg-white/95 cursor-pointer"
            >
              <BanknotesIcon className="w-5 h-5 text-[#7D8A71] shrink-0" />
              <div>
                <p className="font-display font-bold text-xs text-[#3C3C3B]">Neo Cofrinhos</p>
                <p className="text-[11px] text-[#6E6E6B] tabular-nums">
                  {formatBRL(totalCaixinhas, hideBalances)}
                </p>
              </div>
            </button>
          </div>

          {/* 8 Organized Settings Categories */}
          <section className="neo-glass rounded-[28px] divide-y divide-[#E0E0E0]/60 overflow-hidden">
            {settingsCategories.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSubTab(cat.id)}
                  className="w-full p-4 sm:px-6 flex items-center justify-between gap-3 text-left hover:bg-white/60 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#7D8A71]/12 text-[#4B5842] flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-display font-bold text-sm text-[#3C3C3B]">{cat.title}</p>
                      <p className="text-xs text-[#6E6E6B] truncate">{cat.subtitle}</p>
                    </div>
                  </div>
                  <ChevronRightIcon className="w-4 h-4 text-[#6E6E6B] shrink-0" />
                </button>
              );
            })}
          </section>
        </div>
      )}

      {/* SUB-SCREEN 1: MINHA CONTA */}
      {subTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <section className="lg:col-span-6 neo-glass rounded-[28px] p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#3C3C3B]/8 flex items-center justify-center text-[#3C3C3B]">
                  <BuildingLibraryIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-base text-[#3C3C3B]">Dados bancários</h2>
                  <p className="text-xs text-[#6E6E6B]">Banco 403 · Neo Pagamentos S.A.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyBankData}
                className="min-h-[38px] px-3 rounded-xl bg-white/85 border border-[#E0E0E0] text-xs font-medium text-[#3C3C3B] inline-flex items-center gap-1.5 cursor-pointer"
              >
                {copiedBank ? (
                  <CheckIcon className="w-4 h-4 text-[#2E7D32]" />
                ) : (
                  <ClipboardDocumentIcon className="w-4 h-4" />
                )}
                <span>{copiedBank ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-[#E0E0E0]/65 text-xs">
              <div>
                <span className="text-[#6E6E6B] block">Titular</span>
                <span className="font-medium text-[#3C3C3B]">{account.fullName}</span>
              </div>
              <div>
                <span className="text-[#6E6E6B] block">
                  {account.tier === 'business' ? 'CNPJ' : 'CPF'}
                </span>
                <span className="font-medium text-[#3C3C3B] tabular-nums">{account.document}</span>
              </div>
              <div>
                <span className="text-[#6E6E6B] block">Agência</span>
                <span className="font-semibold text-[#3C3C3B] tabular-nums">{account.agency}</span>
              </div>
              <div>
                <span className="text-[#6E6E6B] block">Conta corrente</span>
                <span className="font-semibold text-[#3C3C3B] tabular-nums">
                  {account.accountNumber}
                </span>
              </div>
              {account.guardianName && (
                <div className="col-span-2 rounded-xl bg-[#7D8A71]/10 p-3">
                  <span className="text-[#6E6E6B] block">Responsável legal (14+)</span>
                  <span className="font-medium text-[#3C3C3B]">
                    {account.guardianName} · CPF {account.guardianCpf}
                  </span>
                </div>
              )}
            </div>

            <form
              onSubmit={handleAddDeposit}
              className="pt-4 border-t border-[#E0E0E0]/65 space-y-2.5"
            >
              <p className="text-xs font-medium text-[#3C3C3B]">
                Adicionar saldo demonstrativo na conta
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  value={depositInput}
                  onChange={(e) => setDepositInput(e.target.value)}
                  placeholder="Ex: 500,00"
                  className="flex-1 min-h-[42px] px-3.5 rounded-xl bg-white/85 border border-[#E0E0E0] text-sm tabular-nums"
                />
                <button
                  type="submit"
                  className="min-h-[42px] px-4 rounded-xl bg-[#3C3C3B] text-white text-xs font-medium cursor-pointer"
                >
                  Depositar
                </button>
              </div>
            </form>
          </section>

          <section className="lg:col-span-6 neo-glass rounded-[28px] p-5 sm:p-6 space-y-4">
            <h2 className="font-display font-bold text-base text-[#3C3C3B]">
              Dados pessoais, contato e preferências
            </h2>
            <form onSubmit={handleSaveProfile} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#3C3C3B] mb-1">
                    Nome exibido
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full min-h-[42px] px-3.5 rounded-xl bg-white/85 border border-[#E0E0E0] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#3C3C3B] mb-1">
                    Celular
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(maskPhone(e.target.value))}
                    className="w-full min-h-[42px] px-3.5 rounded-xl bg-white/85 border border-[#E0E0E0] text-sm tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#3C3C3B] mb-1">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full min-h-[42px] px-3.5 rounded-xl bg-white/85 border border-[#E0E0E0] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#3C3C3B] mb-1">Endereço</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Rua, número, cidade e UF"
                  className="w-full min-h-[42px] px-3.5 rounded-xl bg-white/85 border border-[#E0E0E0] text-sm"
                />
              </div>

              <label className="flex items-center justify-between gap-3 pt-2 cursor-pointer">
                <div>
                  <p className="text-xs font-medium text-[#3C3C3B]">Ocultar saldos ao entrar</p>
                  <p className="text-[11px] text-[#6E6E6B]">Inicia a conta no modo discreto</p>
                </div>
                <input
                  type="checkbox"
                  checked={account.hideBalancesByDefault}
                  onChange={(e) => onUpdateProfile({ hideBalancesByDefault: e.target.checked })}
                  className="w-5 h-5 accent-[#7D8A71]"
                />
              </label>

              <button
                type="submit"
                className="min-h-[42px] px-6 rounded-xl bg-[#3C3C3B] text-white text-xs font-medium cursor-pointer"
              >
                Salvar alterações
              </button>
            </form>
          </section>
        </div>
      )}

      {/* SUB-SCREEN 2: SEGURANÇA */}
      {subTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <section className="lg:col-span-6 neo-glass rounded-[28px] p-5 sm:p-6 space-y-4">
            <h2 className="font-display font-bold text-base text-[#3C3C3B]">
              Credenciais, Biometria &amp; 2FA
            </h2>

            <form onSubmit={handleSaveSecurity} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#3C3C3B] mb-1">
                    PIN NeoPay (4 dígitos)
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    inputMode="numeric"
                    value={pin4}
                    onChange={(e) => setPin4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-full min-h-[42px] px-3.5 rounded-xl bg-white/85 border border-[#E0E0E0] text-sm tracking-widest tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#3C3C3B] mb-1">
                    Nova senha (opcional)
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full min-h-[42px] px-3.5 rounded-xl bg-white/85 border border-[#E0E0E0] text-sm"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="min-h-[40px] px-5 rounded-xl bg-[#3C3C3B] text-white text-xs font-medium cursor-pointer"
              >
                Atualizar senha e PIN
              </button>
            </form>

            <div className="pt-3 border-t border-[#E0E0E0]/65 space-y-2.5">
              <label className="flex items-center justify-between gap-3 py-1 cursor-pointer">
                <div>
                  <p className="text-xs font-semibold text-[#3C3C3B]">Autenticação em 2 etapas (2FA)</p>
                  <p className="text-[11px] text-[#6E6E6B]">Proteção extra em novos acessos</p>
                </div>
                <input
                  type="checkbox"
                  checked={account.settings.twoFactorEnabled}
                  onChange={(e) => onUpdateSettings({ twoFactorEnabled: e.target.checked })}
                  className="w-5 h-5 accent-[#7D8A71]"
                />
              </label>

              <label className="flex items-center justify-between gap-3 py-1 border-t border-[#E0E0E0]/60 cursor-pointer">
                <div>
                  <p className="text-xs font-semibold text-[#3C3C3B]">Biometria (Face ID / Digital)</p>
                  <p className="text-[11px] text-[#6E6E6B]">Confirmação rápida neste dispositivo</p>
                </div>
                <input
                  type="checkbox"
                  checked={account.settings.biometricsEnabled}
                  onChange={(e) => onUpdateSettings({ biometricsEnabled: e.target.checked })}
                  className="w-5 h-5 accent-[#7D8A71]"
                />
              </label>

              <div className="pt-2 border-t border-[#E0E0E0]/60 space-y-2">
                <p className="text-xs font-semibold text-[#3C3C3B]">Permissões do aplicativo</p>
                {(
                  [
                    { key: 'camera', label: 'Câmera (Leitura de QR e boletos)' },
                    { key: 'location', label: 'Localização (Prevenção antifraude)' },
                    { key: 'contacts', label: 'Contatos (Sugestão rápida Pix)' },
                  ] as const
                ).map((perm) => (
                  <label key={perm.key} className="flex items-center justify-between text-xs cursor-pointer">
                    <span className="text-[#6E6E6B]">{perm.label}</span>
                    <input
                      type="checkbox"
                      checked={account.settings.permissions[perm.key]}
                      onChange={(e) =>
                        onUpdateSettings({
                          permissions: {
                            ...account.settings.permissions,
                            [perm.key]: e.target.checked,
                          },
                        })
                      }
                      className="w-4 h-4 accent-[#7D8A71]"
                    />
                  </label>
                ))}
              </div>
            </div>
          </section>

          <section className="lg:col-span-6 space-y-5">
            <div className="neo-glass rounded-[28px] p-5 sm:p-6 space-y-3">
              <div className="flex items-center gap-2.5">
                <DevicePhoneMobileIcon className="w-5 h-5 text-[#3C3C3B]" />
                <h2 className="font-display font-bold text-base text-[#3C3C3B]">
                  Dispositivos conectados &amp; Sessões ativas
                </h2>
              </div>
              <div className="space-y-2.5">
                {account.devices.map((dev) => (
                  <div
                    key={dev.id}
                    className="p-3.5 rounded-2xl bg-white/85 border border-[#E0E0E0] flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#3C3C3B] truncate">
                        {dev.deviceName}
                      </p>
                      <p className="text-[11px] text-[#6E6E6B]">
                        {dev.location} · {dev.lastActive}
                      </p>
                    </div>
                    {dev.current ? (
                      <span className="text-[11px] font-medium text-[#4B5842] shrink-0">Atual</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onRevokeDevice(dev.id)}
                        className="min-h-[32px] px-3 rounded-lg bg-red-50 text-red-700 text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                        <span>Encerrar</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="neo-glass rounded-[28px] p-5 sm:p-6 space-y-3">
              <h2 className="font-display font-bold text-base text-[#3C3C3B]">
                Histórico de acessos
              </h2>
              <div className="space-y-2">
                {account.settings.accessHistory.map((h) => (
                  <div
                    key={h.id}
                    className="p-3 rounded-xl bg-white/80 border border-[#E0E0E0] flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-medium text-[#3C3C3B]">{h.event}</p>
                      <p className="text-[11px] text-[#6E6E6B]">{h.device}</p>
                    </div>
                    <span className="text-[11px] text-[#6E6E6B]">{h.dateLabel}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}

      {/* SUB-SCREEN 3: CARTÕES SETTINGS */}
      {subTab === 'cards_prefs' && (
        <section className="neo-glass rounded-[28px] p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display font-bold text-base text-[#3C3C3B]">
                Preferências e segurança por cartão
              </h2>
              <p className="text-xs text-[#6E6E6B]">
                {creditAllowed
                  ? 'Compras online, aproximação NFC, limites e bloqueio temporário'
                  : 'Contas Jovem 14+ operam somente no débito, sem limites de crédito'}
              </p>
            </div>
          </div>

          {account.cards.length === 0 ? (
            <p className="text-xs text-[#6E6E6B] py-4">
              Nenhum cartão ativo ainda. Solicite seu primeiro cartão na aba Cartões.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {account.cards.map((card) => (
                <div
                  key={card.id}
                  className="rounded-2xl bg-white/85 border border-[#E0E0E0] p-4 space-y-3"
                >
                  <div className="flex items-center gap-3 pb-3 border-b border-[#E0E0E0]/60">
                    <OfficialCardVisual cardId={card.id} size="xs" frozen={card.frozen} />
                    <div>
                      <p className="font-display font-bold text-sm text-[#3C3C3B]">{card.label}</p>
                      <p className="text-[11px] text-[#6E6E6B]">
                        Final {card.last4} · {card.mode === 'debit_only' ? 'Débito 14+' : 'Múltiplo'}
                      </p>
                    </div>
                  </div>

                  <label className="flex items-center justify-between text-xs cursor-pointer">
                    <span>Compras online</span>
                    <input
                      type="checkbox"
                      checked={card.onlinePurchasesEnabled}
                      onChange={(e) =>
                        onUpdateCard(card.id, { onlinePurchasesEnabled: e.target.checked })
                      }
                      className="w-4 h-4 accent-[#7D8A71]"
                    />
                  </label>
                  <label className="flex items-center justify-between text-xs cursor-pointer">
                    <span>Pagamento por aproximação (NFC)</span>
                    <input
                      type="checkbox"
                      checked={card.contactlessEnabled}
                      onChange={(e) =>
                        onUpdateCard(card.id, { contactlessEnabled: e.target.checked })
                      }
                      className="w-4 h-4 accent-[#7D8A71]"
                    />
                  </label>
                  <label className="flex items-center justify-between text-xs cursor-pointer">
                    <span>Bloqueio temporário</span>
                    <input
                      type="checkbox"
                      checked={card.frozen}
                      onChange={(e) => onUpdateCard(card.id, { frozen: e.target.checked })}
                      className="w-4 h-4 accent-red-600"
                    />
                  </label>

                  {creditAllowed && card.mode === 'credit_debit' && (
                    <div className="pt-2 border-t border-[#E0E0E0]/60 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-[#6E6E6B]">Limite configurado</span>
                        <span className="font-semibold tabular-nums">
                          {formatBRL(card.limit, hideBalances)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={500}
                        max={account.tier === 'business' ? 50000 : 25000}
                        step={500}
                        value={card.limit}
                        onChange={(e) => onUpdateCard(card.id, { limit: Number(e.target.value) })}
                        className="w-full accent-[#7D8A71] cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* SUB-SCREEN 4: NOTIFICAÇÕES */}
      {subTab === 'notifications_prefs' && (
        <section className="neo-glass rounded-[28px] p-5 sm:p-6 space-y-3 max-w-2xl">
          <h2 className="font-display font-bold text-base text-[#3C3C3B]">
            Alertas e notificações em tempo real
          </h2>
          {(
            [
              { key: 'pix', label: 'Pix enviado e recebido', desc: 'Confirmação instantânea de chaves' },
              { key: 'purchases', label: 'Compras no cartão', desc: 'Alertas de débito e crédito' },
              { key: 'transfers', label: 'Transferências TED e Neo', desc: 'Liquidação e agendamentos' },
              { key: 'payments', label: 'Boletos, contas e vencimentos', desc: 'Avisos da Neo Agenda' },
              { key: 'security', label: 'Alertas de segurança', desc: 'Logins em novos dispositivos e PIN' },
              { key: 'news', label: 'Comunicados e novidades Neo', desc: 'Benefícios Neo Shop e Rewards' },
            ] as const
          ).map((item) => (
            <label
              key={item.key}
              className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-white/85 border border-[#E0E0E0] cursor-pointer"
            >
              <div>
                <p className="text-xs font-semibold text-[#3C3C3B]">{item.label}</p>
                <p className="text-[11px] text-[#6E6E6B]">{item.desc}</p>
              </div>
              <input
                type="checkbox"
                checked={account.settings.notifications[item.key]}
                onChange={(e) =>
                  onUpdateSettings({
                    notifications: {
                      ...account.settings.notifications,
                      [item.key]: e.target.checked,
                    },
                  })
                }
                className="w-5 h-5 accent-[#7D8A71]"
              />
            </label>
          ))}
        </section>
      )}

      {/* SUB-SCREEN 5: APARÊNCIA */}
      {subTab === 'appearance' && (
        <section className="neo-glass rounded-[28px] p-5 sm:p-6 space-y-5 max-w-2xl">
          <div>
            <h2 className="font-display font-bold text-base text-[#3C3C3B]">Tema do aplicativo</h2>
            <p className="text-xs text-[#6E6E6B] mt-0.5">
              Personalize a interface mantendo o minimalismo do NEO
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {(
              [
                { id: 'light', label: 'Claro' },
                { id: 'dark', label: 'Escuro' },
                { id: 'auto', label: 'Automático' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() =>
                  onUpdateSettings({
                    appearance: { ...account.settings.appearance, theme: opt.id },
                  })
                }
                className={`p-4 rounded-2xl border flex flex-col items-center gap-2 cursor-pointer ${
                  account.settings.appearance.theme === opt.id
                    ? 'bg-[#3C3C3B] text-white border-[#3C3C3B]'
                    : 'bg-white/85 text-[#3C3C3B] border-[#E0E0E0]'
                }`}
              >
                <SunIcon className="w-5 h-5" />
                <span className="text-xs font-semibold">{opt.label}</span>
              </button>
            ))}
          </div>

          <div className="space-y-2.5 pt-2 border-t border-[#E0E0E0]/65">
            <label className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-white/85 border border-[#E0E0E0] cursor-pointer">
              <div>
                <p className="text-xs font-semibold text-[#3C3C3B]">Modo compacto</p>
                <p className="text-[11px] text-[#6E6E6B]">Espaçamentos reduzidos em listas</p>
              </div>
              <input
                type="checkbox"
                checked={account.settings.appearance.compactMode}
                onChange={(e) =>
                  onUpdateSettings({
                    appearance: { ...account.settings.appearance, compactMode: e.target.checked },
                  })
                }
                className="w-5 h-5 accent-[#7D8A71]"
              />
            </label>
            <label className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-white/85 border border-[#E0E0E0] cursor-pointer">
              <div>
                <p className="text-xs font-semibold text-[#3C3C3B]">Reduzir animações</p>
                <p className="text-[11px] text-[#6E6E6B]">Transições imediatas entre telas</p>
              </div>
              <input
                type="checkbox"
                checked={account.settings.appearance.reduceMotion}
                onChange={(e) =>
                  onUpdateSettings({
                    appearance: { ...account.settings.appearance, reduceMotion: e.target.checked },
                  })
                }
                className="w-5 h-5 accent-[#7D8A71]"
              />
            </label>
          </div>
        </section>
      )}

      {/* SUB-SCREEN 6: DOCUMENTOS CADASTRAIS */}
      {subTab === 'documents' && (
        <section className="neo-glass rounded-[28px] p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display font-bold text-base text-[#3C3C3B]">
                Verificação cadastral e documentos
              </h2>
              <p className="text-xs text-[#6E6E6B]">
                Status demonstrativo da documentação do perfil {tierDisplayLabel(account.tier)}
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenDocuments}
              className="min-h-[38px] px-4 rounded-xl bg-[#3C3C3B] text-white text-xs font-medium cursor-pointer"
            >
              Abrir Central de Documentos
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {[
              {
                title:
                  account.tier === 'business'
                    ? 'Cartão CNPJ & Contrato Social'
                    : 'Documento de Identidade (RG/CNH)',
                status: 'Validado (demo)',
              },
              {
                title:
                  account.tier === 'teen'
                    ? 'Autorização do Responsável Legal'
                    : 'Biometria Facial (Selfie)',
                status: 'Verificada (demo)',
              },
              {
                title: 'Comprovante de Endereço',
                status: account.address ? 'Atualizado' : 'Padrão demo',
              },
            ].map((doc) => (
              <div
                key={doc.title}
                className="p-4 rounded-2xl bg-white/85 border border-[#E0E0E0] space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <CheckCircleIcon className="w-5 h-5 text-[#2E7D32]" />
                  <span className="text-[11px] font-medium text-[#2E7D32]">{doc.status}</span>
                </div>
                <p className="text-xs font-semibold text-[#3C3C3B] pt-1">{doc.title}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SUB-SCREEN 7: SUPORTE */}
      {subTab === 'help' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <section className="lg:col-span-5 space-y-4">
            <div className="neo-glass rounded-[28px] p-5 space-y-3">
              <h2 className="font-display font-bold text-base text-[#3C3C3B]">Perguntas frequentes</h2>
              {FAQ_ITEMS.map((item, idx) => (
                <div
                  key={item.q}
                  className="rounded-2xl bg-white/85 border border-[#E0E0E0] overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIdx(openFaqIdx === idx ? null : idx)}
                    className="w-full p-3.5 text-left text-xs font-semibold text-[#3C3C3B] cursor-pointer"
                  >
                    {item.q}
                  </button>
                  {openFaqIdx === idx && (
                    <p className="px-3.5 pb-3.5 text-xs text-[#6E6E6B] leading-relaxed border-t border-[#E0E0E0]/60 pt-2.5">
                      {item.a}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="neo-glass rounded-[28px] p-5 space-y-3">
              <h2 className="font-display font-bold text-sm text-[#3C3C3B]">
                Solicitações abertas ({account.settings.supportTickets.length})
              </h2>
              <div className="space-y-2">
                {account.settings.supportTickets.map((tk) => (
                  <div
                    key={tk.id}
                    className="p-3 rounded-xl bg-white/85 border border-[#E0E0E0] text-xs flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-[#3C3C3B] truncate">{tk.subject}</p>
                      <p className="text-[11px] text-[#6E6E6B]">
                        {tk.id} · {tk.dateLabel}
                      </p>
                    </div>
                    <span className="text-[11px] font-medium text-[#4B5842] shrink-0">
                      {tk.status}
                    </span>
                  </div>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (ticketSubject.trim()) {
                    onCreateSupportTicket(ticketSubject.trim());
                    setTicketSubject('');
                    notify('Nova solicitação de suporte registrada.');
                  }
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  placeholder="Abrir novo chamado..."
                  className="flex-1 min-h-[38px] px-3 rounded-xl bg-white border border-[#E0E0E0] text-xs"
                />
                <button
                  type="submit"
                  className="min-h-[38px] px-3.5 rounded-xl bg-[#3C3C3B] text-white text-xs font-medium cursor-pointer"
                >
                  Abrir
                </button>
              </form>
            </div>
          </section>

          <section className="lg:col-span-7 neo-glass rounded-[28px] p-5 sm:p-6 flex flex-col justify-between space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#E0E0E0]/65">
              <ChatBubbleLeftRightIcon className="w-5 h-5 text-[#7D8A71]" />
              <div>
                <h2 className="font-display font-bold text-base text-[#3C3C3B]">
                  Chat de Atendimento Neo
                </h2>
                <p className="text-[11px] text-[#6E6E6B]">Canal integrado de suporte</p>
              </div>
            </div>

            <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
              {chatMessages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                      m.sender === 'user'
                        ? 'bg-[#3C3C3B] text-white'
                        : 'bg-white border border-[#E0E0E0] text-[#3C3C3B]'
                    }`}
                  >
                    {m.text}
                  </div>
                  <span className="text-[10px] text-[#6E6E6B] mt-1 px-1">{m.time}</span>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendChat} className="flex gap-2 pt-2 border-t border-[#E0E0E0]/65">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Digite sua dúvida (ex: Pix, Cartões, PIN)..."
                className="flex-1 min-h-[42px] px-3.5 rounded-xl bg-white border border-[#E0E0E0] text-xs"
              />
              <button
                type="submit"
                className="min-h-[42px] px-4 rounded-xl bg-[#7D8A71] text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
              >
                <PaperAirplaneIcon className="w-4 h-4" />
                <span>Enviar</span>
              </button>
            </form>
          </section>
        </div>
      )}

      {/* SUB-SCREEN 8: PRIVACIDADE, PERFIS & ENCERRAMENTO */}
      {(subTab === 'privacy' || subTab === 'terms') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <section className="lg:col-span-6 neo-glass rounded-[28px] p-5 sm:p-6 space-y-4">
            <h2 className="font-display font-bold text-base text-[#3C3C3B]">
              Gerenciamento de dados e consentimentos (LGPD)
            </h2>
            {(
              [
                {
                  key: 'analyticsConsent',
                  label: 'Análises de navegação no aplicativo',
                  desc: 'Ajuda a melhorar a fluidez das telas',
                },
                {
                  key: 'partnerOffersConsent',
                  label: 'Ofertas de parceiros no Neo Shop',
                  desc: 'Personalização opcional de descontos',
                },
                {
                  key: 'personalizedTips',
                  label: 'Sugestões financeiras no Neo Insights',
                  desc: 'Diagnósticos com base no seu saldo',
                },
              ] as const
            ).map((c) => (
              <label
                key={c.key}
                className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-white/85 border border-[#E0E0E0] cursor-pointer"
              >
                <div>
                  <p className="text-xs font-semibold text-[#3C3C3B]">{c.label}</p>
                  <p className="text-[11px] text-[#6E6E6B]">{c.desc}</p>
                </div>
                <input
                  type="checkbox"
                  checked={account.settings.privacy[c.key]}
                  onChange={(e) =>
                    onUpdateSettings({
                      privacy: {
                        ...account.settings.privacy,
                        [c.key]: e.target.checked,
                      },
                    })
                  }
                  className="w-5 h-5 accent-[#7D8A71]"
                />
              </label>
            ))}

            <div className="pt-2 border-t border-[#E0E0E0]/65 space-y-2">
              <p className="text-xs font-semibold text-[#3C3C3B]">
                Alternar perfil de demonstração
              </p>
              {allAccounts.map((acc) => {
                const isCurrent = acc.id === account.id;
                return (
                  <button
                    key={acc.id}
                    type="button"
                    disabled={isCurrent}
                    onClick={() => onSwitchAccount(acc)}
                    className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between ${
                      isCurrent
                        ? 'bg-[#7D8A71]/12 border-[#7D8A71]/40 cursor-default'
                        : 'bg-white/75 hover:bg-white border-[#E0E0E0] cursor-pointer'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#3C3C3B] truncate">
                        {acc.displayName}
                      </p>
                      <p className="text-[11px] text-[#6E6E6B] truncate">
                        {tierDisplayLabel(acc.tier)}
                      </p>
                    </div>
                    <span className="text-[11px] font-medium text-[#7D8A71] ml-2">
                      {isCurrent ? 'Ativa' : 'Trocar'}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="lg:col-span-6 neo-glass rounded-[28px] p-5 sm:p-6 space-y-4">
            <div>
              <h2 className="font-display font-bold text-base text-[#3C3C3B]">
                Termos, Políticas &amp; Encerramento
              </h2>
              <p className="text-xs text-[#6E6E6B] mt-1 leading-relaxed">
                O Neo opera em conformidade demonstrativa com a LGPD (Lei 13.709/2018). Nenhum
                dado sensível de senha, PIN ou documento é gravado fora da sessão atual.
              </p>
            </div>

            <div className="pt-3 border-t border-[#E0E0E0]/65 space-y-3">
              {closureStep === 0 && (
                <button
                  type="button"
                  onClick={() => setClosureStep(1)}
                  className="min-h-[42px] px-4 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-700 inline-flex items-center gap-2 cursor-pointer"
                >
                  <ExclamationTriangleIcon className="w-4 h-4" />
                  <span>Solicitar encerramento de conta</span>
                </button>
              )}

              {closureStep === 1 && (
                <div className="rounded-2xl bg-white/90 border border-red-200 p-4 space-y-3">
                  <p className="text-xs font-semibold text-[#3C3C3B]">
                    Etapa 1 de 2 · Informe o motivo do encerramento
                  </p>
                  <select
                    value={closureReason}
                    onChange={(e) => setClosureReason(e.target.value)}
                    className="w-full min-h-[40px] px-3 rounded-xl bg-[#F4F4F1] border border-[#E0E0E0] text-xs"
                  >
                    <option value="Apenas testando a plataforma">
                      Apenas testando a plataforma
                    </option>
                    <option value="Migração para outro perfil">Migração para outro perfil</option>
                    <option value="Encerramento temporário">Encerramento temporário</option>
                  </select>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setClosureStep(0)}
                      className="min-h-[38px] px-4 rounded-xl bg-[#F4F4F1] text-xs font-medium text-[#3C3C3B] cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => setClosureStep(2)}
                      className="min-h-[38px] px-4 rounded-xl bg-red-600 text-white text-xs font-medium cursor-pointer"
                    >
                      Continuar
                    </button>
                  </div>
                </div>
              )}

              {closureStep === 2 && (
                <form
                  onSubmit={handleConfirmClosure}
                  className="rounded-2xl bg-white/90 border border-red-200 p-4 space-y-3"
                >
                  <p className="text-xs font-semibold text-red-700">
                    Etapa 2 de 2 · Confirme com seu PIN ({account.pin4})
                  </p>
                  <input
                    type="password"
                    maxLength={4}
                    inputMode="numeric"
                    value={closurePin}
                    onChange={(e) => setClosurePin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="PIN de 4 dígitos"
                    className="w-full min-h-[40px] px-3.5 rounded-xl bg-[#F4F4F1] border border-[#E0E0E0] text-sm tracking-widest tabular-nums"
                  />
                  {closureError && <p className="text-xs text-red-600">{closureError}</p>}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setClosureStep(0)}
                      className="min-h-[38px] px-4 rounded-xl bg-[#F4F4F1] text-xs font-medium text-[#3C3C3B] cursor-pointer"
                    >
                      Voltar
                    </button>
                    <button
                      type="submit"
                      className="min-h-[38px] px-4 rounded-xl bg-red-600 text-white text-xs font-medium cursor-pointer"
                    >
                      Encerrar conta demo
                    </button>
                  </div>
                </form>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
