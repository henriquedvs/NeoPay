import React, { useState } from 'react';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BookmarkIcon,
  BuildingOffice2Icon,
  CheckCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  IdentificationIcon,
  QuestionMarkCircleIcon,
  ShieldCheckIcon,
  UserIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import { AnimatePresence, motion } from 'motion/react';
import { createDefaultSettings } from '../data/neoSeed';
import {
  AccountTier,
  OfficialCardId,
  RegistrationDraftNonSensitive,
  UserAccount,
} from '../types/neo';
import {
  calculateAge,
  maskCNPJ,
  maskCPF,
  maskPhone,
} from '../utils/formatters';
import { NeoLogo } from './NeoLogo';

interface AuthFlowProps {
  initialTab?: 'login' | 'register';
  accounts: UserAccount[];
  savedDraft: RegistrationDraftNonSensitive | null;
  onSaveDraft: (draft: RegistrationDraftNonSensitive | null) => void;
  onBackToOnboarding: () => void;
  onLoginSuccess: (account: UserAccount) => void;
  onRegisterSuccess: (newAccount: UserAccount) => void;
}

export const AuthFlow: React.FC<AuthFlowProps> = ({
  initialTab = 'login',
  accounts,
  savedDraft,
  onSaveDraft,
  onBackToOnboarding,
  onLoginSuccess,
  onRegisterSuccess,
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'recovery' | 'help'>(
    initialTab
  );

  // Login states (Exclusive uncluttered page)
  const [docType, setDocType] = useState<'cpf' | 'cnpj'>('cpf');
  const [loginDoc, setLoginDoc] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Recovery states
  const [recoveryDoc, setRecoveryDoc] = useState('');
  const [recoveryDone, setRecoveryDone] = useState(false);

  // Multi-page Registration states (Step 0 = Choose Tier, Steps 1..N per profile)
  const [regStep, setRegStep] = useState<number>(0);
  const [tier, setTier] = useState<AccountTier>(savedDraft?.tier || 'adult');

  // Shared & Profile-specific registration fields (kept in React memory only, never persisted with secrets)
  const [fullName, setFullName] = useState(savedDraft?.displayHint || '');
  const [birthDate, setBirthDate] = useState('1998-06-15');
  const [documentVal, setDocumentVal] = useState('');
  const [nationality, setNationality] = useState('Brasileira');
  const [email, setEmail] = useState(savedDraft?.email || '');
  const [phone, setPhone] = useState('');
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [cityState, setCityState] = useState(savedDraft?.cityState || '');

  // Teen 14–17 Guardian fields
  const [guardianName, setGuardianName] = useState('');
  const [guardianCpf, setGuardianCpf] = useState('');
  const [guardianRelation, setGuardianRelation] = useState('Mãe / Pai');
  const [guardianConsent, setGuardianConsent] = useState(false);

  // Business PJ fields
  const [companyTradeName, setCompanyTradeName] = useState('');
  const [companySize, setCompanySize] = useState('MEI / Microempresa');
  const [repName, setRepName] = useState('');
  const [repCpf, setRepCpf] = useState('');
  const [repRole, setRepRole] = useState('Sócio Administrador');

  // Security & Verification
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [pin4, setPin4] = useState('');
  const [identityVerified, setIdentityVerified] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<OfficialCardId>(
    savedDraft?.selectedCardId || 'sage'
  );
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [regError, setRegError] = useState('');
  const [draftSavedNotice, setDraftSavedNotice] = useState(false);

  const totalStepsForTier = tier === 'adult' ? 7 : 6;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const digitsOnly = loginDoc.replace(/\D/g, '');
    const expectedLen = docType === 'cpf' ? 11 : 14;

    if (digitsOnly.length !== expectedLen) {
      setLoginError(
        docType === 'cpf'
          ? 'Digite um CPF válido com 11 dígitos.'
          : 'Digite um CNPJ válido com 14 dígitos.'
      );
      return;
    }
    if (!loginPassword) {
      setLoginError('Informe sua senha de acesso.');
      return;
    }

    const found = accounts.find((acc) => {
      const accDigits = acc.document.replace(/\D/g, '');
      return accDigits === digitsOnly && acc.password === loginPassword;
    });

    if (!found) {
      setLoginError(
        'Documento ou senha incorretos. Use uma conta demo abaixo para testar.'
      );
      return;
    }

    onLoginSuccess(found);
  };

  const handleSaveProgressAndPause = () => {
    onSaveDraft({
      tier,
      step: Math.max(1, regStep),
      displayHint: fullName || companyTradeName,
      email,
      cityState,
      selectedCardId,
      savedAt: new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    });
    setDraftSavedNotice(true);
    setTimeout(() => {
      setDraftSavedNotice(false);
      setMode('login');
      setRegStep(0);
    }, 1000);
  };

  const handleResumeDraft = () => {
    if (!savedDraft) return;
    setTier(savedDraft.tier);
    setFullName(savedDraft.displayHint);
    setEmail(savedDraft.email);
    setCityState(savedDraft.cityState);
    setSelectedCardId(savedDraft.selectedCardId);
    setRegStep(savedDraft.step);
    setMode('register');
  };

  const handleSelectTier = (chosen: AccountTier) => {
    setTier(chosen);
    setRegError('');
    setDocumentVal('');
    if (chosen === 'teen') {
      setBirthDate('2010-04-10');
      setSelectedCardId('sky');
    } else if (chosen === 'adult') {
      setBirthDate('1998-06-15');
      setSelectedCardId('sage');
    } else {
      setSelectedCardId('aura');
    }
    setRegStep(1);
  };

  const validateAndAdvance = () => {
    setRegError('');

    if (tier === 'adult') {
      if (regStep === 1) {
        if (fullName.trim().length < 3) {
          setRegError('Informe seu nome completo.');
          return;
        }
        const age = calculateAge(birthDate);
        if (age === null || age < 18) {
          setRegError('Para conta adulta é necessário ter 18 anos ou mais.');
          return;
        }
      } else if (regStep === 2) {
        if (documentVal.replace(/\D/g, '').length !== 11) {
          setRegError('Informe um CPF válido com 11 dígitos.');
          return;
        }
      } else if (regStep === 3) {
        if (!email.includes('@') || !email.includes('.')) {
          setRegError('Informe um e-mail válido.');
          return;
        }
        if (phone.replace(/\D/g, '').length < 10) {
          setRegError('Informe um celular válido com DDD.');
          return;
        }
      } else if (regStep === 4) {
        if (street.trim().length < 4 || cityState.trim().length < 3) {
          setRegError('Informe seu endereço residencial e cidade/UF.');
          return;
        }
      } else if (regStep === 5) {
        if (regPassword.length < 6) {
          setRegError('Crie uma senha com pelo menos 6 caracteres.');
          return;
        }
        if (!/^\d{4}$/.test(pin4)) {
          setRegError('Defina um PIN de 4 dígitos numéricos.');
          return;
        }
      } else if (regStep === 6) {
        if (!identityVerified) {
          setRegError('Confirme a etapa demonstrativa de verificação de identidade.');
          return;
        }
      }
    } else if (tier === 'teen') {
      if (regStep === 1) {
        if (fullName.trim().length < 3) {
          setRegError('Informe o nome completo do adolescente.');
          return;
        }
        const age = calculateAge(birthDate);
        if (age === null || age < 14 || age >= 18) {
          setRegError('A conta Neo Jovem atende adolescentes de 14 a 17 anos.');
          return;
        }
      } else if (regStep === 2) {
        if (documentVal.replace(/\D/g, '').length !== 11) {
          setRegError('Informe o CPF válido do adolescente.');
          return;
        }
        if (!email.includes('@') || phone.replace(/\D/g, '').length < 10) {
          setRegError('Informe e-mail e celular válidos.');
          return;
        }
      } else if (regStep === 3) {
        if (guardianName.trim().length < 3 || guardianCpf.replace(/\D/g, '').length !== 11) {
          setRegError('Informe nome completo e CPF válido do responsável legal.');
          return;
        }
      } else if (regStep === 4) {
        if (!guardianConsent) {
          setRegError('Sem o consentimento expresso do responsável não é possível prosseguir.');
          return;
        }
      } else if (regStep === 5) {
        if (regPassword.length < 6 || !/^\d{4}$/.test(pin4)) {
          setRegError('Crie senha (mín. 6) e PIN de 4 dígitos.');
          return;
        }
      }
    } else if (tier === 'business') {
      if (regStep === 1) {
        if (documentVal.replace(/\D/g, '').length !== 14) {
          setRegError('Informe um CNPJ válido com 14 dígitos.');
          return;
        }
      } else if (regStep === 2) {
        if (fullName.trim().length < 3 || companyTradeName.trim().length < 2) {
          setRegError('Informe Razão Social e Nome Fantasia.');
          return;
        }
      } else if (regStep === 3) {
        if (repName.trim().length < 3 || repCpf.replace(/\D/g, '').length !== 11) {
          setRegError('Informe nome e CPF do representante legal.');
          return;
        }
      } else if (regStep === 4) {
        if (street.trim().length < 3 || !email.includes('@')) {
          setRegError('Informe endereço empresarial e e-mail corporativo.');
          return;
        }
      } else if (regStep === 5) {
        if (regPassword.length < 6 || !/^\d{4}$/.test(pin4)) {
          setRegError('Defina senha (mín. 6) e PIN de 4 dígitos.');
          return;
        }
      }
    }

    if (regStep < totalStepsForTier) {
      setRegStep((s) => s + 1);
    } else {
      handleFinishRegistration();
    }
  };

  const handleFinishRegistration = () => {
    if (!acceptedTerms) {
      setRegError('Aceite os termos regulatórios e LGPD para concluir.');
      return;
    }

    const displayShort =
      tier === 'business'
        ? companyTradeName.trim()
        : fullName.trim().split(' ').slice(0, 2).join(' ');

    const newAcc: UserAccount = {
      id: `acc-${Date.now()}`,
      tier,
      isNewAccount: true,
      fullName: fullName.trim(),
      displayName: displayShort,
      companyTradeName: tier === 'business' ? companyTradeName.trim() : undefined,
      document: documentVal,
      email: email.trim().toLowerCase(),
      phone: phone || '(11) 99999-0000',
      birthDate: tier !== 'business' ? birthDate : undefined,
      address: street ? `${street} · ${cityState}` : cityState || 'Brasil',
      guardianName: tier === 'teen' ? guardianName.trim() : undefined,
      guardianCpf: tier === 'teen' ? guardianCpf : undefined,
      agency: '0001',
      accountNumber: `${Math.floor(10000 + Math.random() * 89999)}-${Math.floor(Math.random() * 9)}`,
      pixKeys: [documentVal, email.trim().toLowerCase()],
      balance: 0,
      reservedBalance: 0,
      monthlyIncome: 0,
      monthlyYield: 0,
      nightPixLimit: tier === 'teen' ? 300 : tier === 'business' ? 10000 : 1500,
      dayPixLimit: tier === 'teen' ? 1000 : tier === 'business' ? 80000 : 10000,
      rewardsPoints: 0,
      pendingPoints: 0,
      expiringPoints: 0,
      rewardsLedger: [],
      rewardsRedemptions: [],
      completedMissions: [],
      password: regPassword,
      pin4,
      hideBalancesByDefault: false,
      notificationsEnabled: true,
      shortcuts: ['pix', 'boleto', 'ted', 'cards', 'rewards', 'finance'],
      customCategories: ['Pessoal'],
      shopFavorites: [],
      recentlyViewedShopIds: [],
      shopOrders: [],
      devices: [
        {
          id: 'dev-now',
          deviceName: 'Dispositivo Atual · App Neo',
          location: cityState || 'Brasil',
          lastActive: 'Agora',
          current: true,
        },
      ],
      budgets: [],
      subscriptions: [],
      scheduledPayments: [],
      notifications: [
        {
          id: `n-${Date.now()}`,
          title: 'Conta Neo aberta com sucesso',
          body: `Bem-vindo ao NEO, ${displayShort}. Sua conta está ativa e pronta para solicitar seu primeiro cartão.`,
          timeLabel: 'Agora',
          dateISO: new Date().toISOString().slice(0, 10),
          category: 'Conta',
          importance: 'Normal',
          read: false,
          targetSection: 'cards',
        },
      ],
      cardOrders: [],
      cards: [],
      caixinhas: [],
      transactions: [],
      settings: createDefaultSettings('Dispositivo Atual · App Neo'),
    };

    onSaveDraft(null);
    onRegisterSuccess(newAcc);
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full bg-[#F4F4F1] relative overflow-hidden flex flex-col items-center justify-center sm:p-6">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -top-36 left-1/4 w-[380px] h-[380px] rounded-full bg-[#7D8A71]/12 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed bottom-0 right-10 w-[340px] h-[340px] rounded-full bg-[#5CA5D6]/12 blur-3xl"
      />

      {/* Zero-scroll full-height Auth Shell */}
      <div className="relative z-10 w-full max-w-[480px] h-full sm:h-auto sm:min-h-[590px] sm:max-h-[680px] sm:rounded-[32px] sm:neo-glass flex flex-col justify-between px-5 sm:px-7 pt-safe pb-safe sm:py-6 overflow-hidden">
        {/* Top Bar */}
        <header className="flex items-center justify-between pt-2 shrink-0">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                if (mode === 'recovery' || mode === 'help') {
                  setMode('login');
                } else if (mode === 'register' && regStep > 0) {
                  setRegError('');
                  setRegStep((s) => s - 1);
                } else if (mode === 'register' && regStep === 0) {
                  setMode('login');
                } else {
                  onBackToOnboarding();
                }
              }}
              className="min-h-[40px] min-w-[40px] rounded-xl bg-white/80 border border-[#E0E0E0]/80 flex items-center justify-center text-[#3C3C3B] cursor-pointer"
              aria-label="Voltar"
            >
              <ArrowLeftIcon className="w-4 h-4" />
            </button>
            <NeoLogo variant="neo" size="md" showEmblem />
          </div>

          {mode === 'register' && regStep > 0 ? (
            <button
              type="button"
              onClick={handleSaveProgressAndPause}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#7D8A71] hover:underline cursor-pointer"
            >
              <BookmarkIcon className="w-3.5 h-3.5" />
              <span>{draftSavedNotice ? 'Salvo!' : 'Salvar e sair'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setMode(mode === 'help' ? 'login' : 'help')}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#6E6E6B] hover:text-[#3C3C3B] cursor-pointer min-h-[38px]"
            >
              <QuestionMarkCircleIcon className="w-4 h-4" />
              <span>Ajuda</span>
            </button>
          )}
        </header>

        {/* Central Content (Zero vertical scroll) */}
        <div className="flex-1 min-h-0 flex flex-col justify-center py-2">
          {/* LOGIN EXCLUSIVE PAGE */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <p className="text-xs font-medium text-[#7D8A71]">Olá · Acesso seguro</p>
                <h1 className="font-display font-semibold text-2xl text-[#3C3C3B] mt-0.5">
                  Entrar no aplicativo
                </h1>
              </div>

              {savedDraft && (
                <button
                  type="button"
                  onClick={handleResumeDraft}
                  className="w-full p-2.5 rounded-2xl bg-[#7D8A71]/12 border border-[#7D8A71]/35 flex items-center justify-between text-left cursor-pointer"
                >
                  <span className="text-xs font-medium text-[#3C3C3B] truncate">
                    Continuar cadastro salvo (Etapa {savedDraft.step})
                  </span>
                  <ArrowRightIcon className="w-4 h-4 text-[#7D8A71] shrink-0" />
                </button>
              )}

              {/* CPF vs CNPJ toggle */}
              <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#E0E0E0]/55">
                <button
                  type="button"
                  onClick={() => {
                    setDocType('cpf');
                    setLoginDoc('');
                    setLoginError('');
                  }}
                  className={`min-h-[36px] rounded-lg text-xs font-medium cursor-pointer ${
                    docType === 'cpf' ? 'bg-white text-[#3C3C3B] shadow-sm' : 'text-[#6E6E6B]'
                  }`}
                >
                  CPF (Pessoal / 14+)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDocType('cnpj');
                    setLoginDoc('');
                    setLoginError('');
                  }}
                  className={`min-h-[36px] rounded-lg text-xs font-medium cursor-pointer ${
                    docType === 'cnpj' ? 'bg-white text-[#3C3C3B] shadow-sm' : 'text-[#6E6E6B]'
                  }`}
                >
                  CNPJ (Empresa)
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label htmlFor="auth-doc" className="block text-xs font-medium text-[#3C3C3B] mb-1">
                    {docType === 'cpf' ? 'CPF' : 'CNPJ'}
                  </label>
                  <input
                    id="auth-doc"
                    type="text"
                    inputMode="numeric"
                    value={loginDoc}
                    onChange={(e) => {
                      setLoginError('');
                      setLoginDoc(
                        docType === 'cpf' ? maskCPF(e.target.value) : maskCNPJ(e.target.value)
                      );
                    }}
                    placeholder={docType === 'cpf' ? '000.000.000-00' : '00.000.000/0001-00'}
                    className="w-full min-h-[46px] px-3.5 rounded-2xl bg-white/90 border border-[#E0E0E0] text-sm tabular-nums focus:outline-none focus:border-[#7D8A71]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="auth-pwd" className="text-xs font-medium text-[#3C3C3B]">
                      Senha
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setRecoveryDone(false);
                        setMode('recovery');
                      }}
                      className="text-xs font-medium text-[#7D8A71] hover:underline cursor-pointer"
                    >
                      Esqueci minha senha
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="auth-pwd"
                      type={showLoginPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => {
                        setLoginError('');
                        setLoginPassword(e.target.value);
                      }}
                      placeholder="••••••"
                      className="w-full min-h-[46px] pl-3.5 pr-11 rounded-2xl bg-white/90 border border-[#E0E0E0] text-sm focus:outline-none focus:border-[#7D8A71]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword((s) => !s)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 min-w-[40px] min-h-[40px] flex items-center justify-center text-[#6E6E6B] cursor-pointer"
                      aria-label={showLoginPassword ? 'Ocultar senha' : 'Visualizar senha'}
                    >
                      {showLoginPassword ? (
                        <EyeSlashIcon className="w-4 h-4" />
                      ) : (
                        <EyeIcon className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {loginError && (
                <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  {loginError}
                </p>
              )}

              <button
                type="submit"
                className="w-full min-h-[48px] rounded-2xl bg-[#3C3C3B] text-white text-sm font-medium hover:bg-[#2a2a29] cursor-pointer"
              >
                Entrar
              </button>

              {/* Compact 1-row Demo Access */}
              <div className="pt-2 border-t border-[#E0E0E0]/70">
                <p className="text-[11px] text-[#6E6E6B] mb-1.5">
                  Acesso rápido de demonstração (em memória):
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {accounts.slice(0, 3).map((acc) => (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => onLoginSuccess(acc)}
                      className="min-h-[38px] px-2 rounded-xl bg-white/80 hover:bg-white border border-[#E0E0E0] text-[11px] font-medium text-[#3C3C3B] truncate cursor-pointer"
                    >
                      {acc.tier === 'teen'
                        ? 'Jovem 14+'
                        : acc.tier === 'business'
                        ? 'Empresa PJ'
                        : 'Adulto PF'}
                    </button>
                  ))}
                </div>
              </div>
            </form>
          )}

          {/* INLINE RECOVERY */}
          {mode === 'recovery' && (
            <div className="space-y-4">
              <div>
                <h1 className="font-display font-semibold text-2xl text-[#3C3C3B]">
                  Recuperar senha
                </h1>
                <p className="text-xs text-[#6E6E6B] mt-1">
                  Informe o CPF ou CNPJ cadastrado para simular a redefinição de acesso.
                </p>
              </div>
              <input
                type="text"
                value={recoveryDoc}
                onChange={(e) => setRecoveryDoc(e.target.value)}
                placeholder="CPF, CNPJ ou e-mail"
                className="w-full min-h-[46px] px-3.5 rounded-2xl bg-white/90 border border-[#E0E0E0] text-sm"
              />
              {recoveryDone ? (
                <div className="rounded-2xl bg-[#7D8A71]/15 border border-[#7D8A71]/35 p-4 flex items-center gap-2.5 text-xs text-[#3C3C3B]">
                  <CheckCircleIcon className="w-5 h-5 text-[#4B5842] shrink-0" />
                  <span>Instrução demonstrativa registrada para {recoveryDoc}.</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (recoveryDoc.trim()) setRecoveryDone(true);
                  }}
                  className="w-full min-h-[48px] rounded-2xl bg-[#3C3C3B] text-white text-sm font-medium cursor-pointer"
                >
                  Enviar código de recuperação
                </button>
              )}
            </div>
          )}

          {/* INLINE HELP CENTER */}
          {mode === 'help' && (
            <div className="space-y-3">
              <h1 className="font-display font-semibold text-xl text-[#3C3C3B]">
                Central de Ajuda · Acesso
              </h1>
              <div className="space-y-2 text-xs">
                <div className="rounded-2xl bg-white/85 border border-[#E0E0E0] p-3">
                  <p className="font-semibold text-[#3C3C3B]">Qual senha usar na demonstração?</p>
                  <p className="text-[#6E6E6B] mt-0.5">
                    Use os botões de acesso rápido no login ou crie sua própria conta passo a passo.
                  </p>
                </div>
                <div className="rounded-2xl bg-white/85 border border-[#E0E0E0] p-3">
                  <p className="font-semibold text-[#3C3C3B]">Contas para menores de 18 anos</p>
                  <p className="text-[#6E6E6B] mt-0.5">
                    Adolescentes de 14 a 17 anos precisam dos dados e consentimento do responsável legal.
                  </p>
                </div>
                <div className="rounded-2xl bg-white/85 border border-[#E0E0E0] p-3">
                  <p className="font-semibold text-[#3C3C3B]">Privacidade dos dados</p>
                  <p className="text-[#6E6E6B] mt-0.5">
                    Senhas e documentos não são salvos no armazenamento local do navegador.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* MULTI-PAGE STEP-BY-STEP REGISTRATION */}
          {mode === 'register' && (
            <AnimatePresence mode="wait">
              <motion.div
                key={`reg-${tier}-${regStep}`}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.16 }}
                className="space-y-4"
              >
                {regStep > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-[#6E6E6B]">
                      <span>
                        Etapa {regStep} de {totalStepsForTier}
                      </span>
                      <span>
                        {tier === 'teen'
                          ? 'Adolescente 14+'
                          : tier === 'business'
                          ? 'Pessoa Jurídica'
                          : 'Pessoa Física'}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[#E0E0E0]/80 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#7D8A71] transition-all duration-300"
                        style={{ width: `${(regStep / totalStepsForTier) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* STEP 0: CHOOSE ACCOUNT TYPE */}
                {regStep === 0 && (
                  <div className="space-y-3">
                    <div>
                      <h1 className="font-display font-semibold text-2xl text-[#3C3C3B]">
                        Escolha o tipo de conta
                      </h1>
                      <p className="text-xs text-[#6E6E6B] mt-0.5">
                        Etapas adaptadas ao perfil e exigências legais.
                      </p>
                    </div>
                    <div className="space-y-2.5">
                      {(
                        [
                          {
                            id: 'adult',
                            title: 'Pessoa física adulta',
                            desc: '18+ anos · CPF e verificação de identidade',
                            icon: UserIcon,
                          },
                          {
                            id: 'teen',
                            title: 'Adolescente (14 a 17 anos)',
                            desc: 'Com dados e autorização do responsável legal',
                            icon: UsersIcon,
                          },
                          {
                            id: 'business',
                            title: 'Pessoa jurídica',
                            desc: 'CNPJ, razão social e representante legal',
                            icon: BuildingOffice2Icon,
                          },
                        ] as const
                      ).map((opt) => {
                        const Icon = opt.icon;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => handleSelectTier(opt.id)}
                            className="w-full p-3.5 rounded-2xl bg-white/85 hover:bg-white border border-[#E0E0E0] flex items-center justify-between gap-3 text-left cursor-pointer transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-[#7D8A71]/15 text-[#3C3C3B] flex items-center justify-center shrink-0">
                                <Icon className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="font-display font-semibold text-sm text-[#3C3C3B]">
                                  {opt.title}
                                </p>
                                <p className="text-[11px] text-[#6E6E6B]">{opt.desc}</p>
                              </div>
                            </div>
                            <ArrowRightIcon className="w-4 h-4 text-[#6E6E6B]" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ADULT FLOW (7 Steps) */}
                {tier === 'adult' && regStep === 1 && (
                  <div className="space-y-3">
                    <div>
                      <h2 className="font-display font-semibold text-xl text-[#3C3C3B]">
                        Nome e nascimento
                      </h2>
                      <p className="text-xs text-[#6E6E6B]">Como consta no seu documento oficial.</p>
                    </div>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Nome completo"
                      className="w-full min-h-[46px] px-3.5 rounded-2xl bg-white/90 border border-[#E0E0E0] text-sm"
                    />
                    <input
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full min-h-[46px] px-3.5 rounded-2xl bg-white/90 border border-[#E0E0E0] text-sm tabular-nums"
                    />
                  </div>
                )}

                {tier === 'adult' && regStep === 2 && (
                  <div className="space-y-3">
                    <div>
                      <h2 className="font-display font-semibold text-xl text-[#3C3C3B]">
                        CPF e dados pessoais
                      </h2>
                      <p className="text-xs text-[#6E6E6B]">Validação cadastral para abertura de conta.</p>
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={documentVal}
                      onChange={(e) => setDocumentVal(maskCPF(e.target.value))}
                      placeholder="000.000.000-00"
                      className="w-full min-h-[46px] px-3.5 rounded-2xl bg-white/90 border border-[#E0E0E0] text-sm tabular-nums"
                    />
                    <input
                      type="text"
                      value={nationality}
                      onChange={(e) => setNationality(e.target.value)}
                      placeholder="Nacionalidade"
                      className="w-full min-h-[46px] px-3.5 rounded-2xl bg-white/90 border border-[#E0E0E0] text-sm"
                    />
                  </div>
                )}

                {tier === 'adult' && regStep === 3 && (
                  <div className="space-y-3">
                    <div>
                      <h2 className="font-display font-semibold text-xl text-[#3C3C3B]">
                        E-mail e telefone
                      </h2>
                      <p className="text-xs text-[#6E6E6B]">Para avisos e chaves de contato.</p>
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="w-full min-h-[46px] px-3.5 rounded-2xl bg-white/90 border border-[#E0E0E0] text-sm"
                    />
                    <input
                      type="text"
                      inputMode="tel"
                      value={phone}
                      onChange={(e) => setPhone(maskPhone(e.target.value))}
                      placeholder="(11) 99999-9999"
                      className="w-full min-h-[46px] px-3.5 rounded-2xl bg-white/90 border border-[#E0E0E0] text-sm tabular-nums"
                    />
                  </div>
                )}

                {tier === 'adult' && regStep === 4 && (
                  <div className="space-y-3">
                    <div>
                      <h2 className="font-display font-semibold text-xl text-[#3C3C3B]">
                        Endereço residencial
                      </h2>
                      <p className="text-xs text-[#6E6E6B]">Necessário para envio do cartão físico.</p>
                    </div>
                    <input
                      type="text"
                      value={cep}
                      onChange={(e) => setCep(e.target.value)}
                      placeholder="CEP (ex: 01310-100)"
                      className="w-full min-h-[44px] px-3.5 rounded-2xl bg-white/90 border border-[#E0E0E0] text-sm tabular-nums"
                    />
                    <input
                      type="text"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="Rua e número"
                      className="w-full min-h-[44px] px-3.5 rounded-2xl bg-white/90 border border-[#E0E0E0] text-sm"
                    />
                    <input
                      type="text"
                      value={cityState}
                      onChange={(e) => setCityState(e.target.value)}
                      placeholder="Cidade / UF"
                      className="w-full min-h-[44px] px-3.5 rounded-2xl bg-white/90 border border-[#E0E0E0] text-sm"
                    />
                  </div>
                )}

                {tier === 'adult' && regStep === 5 && (
                  <div className="space-y-3">
                    <div>
                      <h2 className="font-display font-semibold text-xl text-[#3C3C3B]">
                        Criação de senha e PIN
                      </h2>
                      <p className="text-xs text-[#6E6E6B]">Mantidos apenas na sessão atual de demonstração.</p>
                    </div>
                    <div className="relative">
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Senha de acesso (mín. 6)"
                        className="w-full min-h-[46px] pl-3.5 pr-11 rounded-2xl bg-white/90 border border-[#E0E0E0] text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword((s) => !s)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 min-w-[40px] min-h-[40px] flex items-center justify-center text-[#6E6E6B]"
                      >
                        {showRegPassword ? (
                          <EyeSlashIcon className="w-4 h-4" />
                        ) : (
                          <EyeIcon className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <input
                      type="password"
                      maxLength={4}
                      inputMode="numeric"
                      value={pin4}
                      onChange={(e) => setPin4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="PIN transacional de 4 dígitos"
                      className="w-full min-h-[46px] px-3.5 rounded-2xl bg-white/90 border border-[#E0E0E0] text-sm tracking-widest tabular-nums"
                    />
                  </div>
                )}

                {tier === 'adult' && regStep === 6 && (
                  <div className="space-y-3">
                    <div>
                      <h2 className="font-display font-semibold text-xl text-[#3C3C3B]">
                        Verificação de identidade
                      </h2>
                      <p className="text-xs text-[#6E6E6B]">
                        Confirme a etapa de validação para liberar sua conta digital.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIdentityVerified(true)}
                      className={`w-full p-4 rounded-2xl border flex items-center justify-between text-left cursor-pointer ${
                        identityVerified
                          ? 'bg-[#7D8A71]/15 border-[#7D8A71]'
                          : 'bg-white/90 border-[#E0E0E0]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <IdentificationIcon className="w-5 h-5 text-[#3C3C3B]" />
                        <div>
                          <span className="text-xs font-medium text-[#3C3C3B] block">
                            {identityVerified
                              ? 'Identidade validada (demonstração)'
                              : 'Confirmar verificação de documento (demo)'}
                          </span>
                          <span className="text-[11px] text-[#6E6E6B]">
                            Após abrir a conta, você poderá escolher e solicitar seu cartão oficial.
                          </span>
                        </div>
                      </div>
                      {identityVerified && <CheckCircleIcon className="w-5 h-5 text-[#4B5842]" />}
                    </button>
                  </div>
                )}

                {/* TEEN 14-17 FLOW (6 Steps) */}
                {tier === 'teen' && regStep === 1 && (
                  <div className="space-y-3">
                    <div>
                      <h2 className="font-display font-semibold text-xl text-[#3C3C3B]">
                        Dados do adolescente
                      </h2>
                      <p className="text-xs text-[#6E6E6B]">Permitido para jovens de 14 a 17 anos.</p>
                    </div>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Nome completo"
                      className="w-full min-h-[46px] px-3.5 rounded-2xl bg-white/90 border border-[#E0E0E0] text-sm"
                    />
                    <input
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full min-h-[46px] px-3.5 rounded-2xl bg-white/90 border border-[#E0E0E0] text-sm tabular-nums"
                    />
                  </div>
                )}

                {tier === 'teen' && regStep === 2 && (
                  <div className="space-y-3">
                    <div>
                      <h2 className="font-display font-semibold text-xl text-[#3C3C3B]">
                        CPF e contato do jovem
                      </h2>
                      <p className="text-xs text-[#6E6E6B]">Documento próprio para identificação.</p>
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={documentVal}
                      onChange={(e) => setDocumentVal(maskCPF(e.target.value))}
                      placeholder="CPF (000.000.000-00)"
                      className="w-full min-h-[44px] px-3.5 rounded-2xl bg-white/90 border border-[#E0E0E0] text-sm tabular-nums"
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="E-mail"
                      className="w-full min-h-[44px] px-3.5 rounded-2xl bg-white/90 border border-[#E0E0E0] text-sm"
                    />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(maskPhone(e.target.value))}
                      placeholder="Celular"
                      className="w-full min-h-[44px] px-3.5 rounded-2xl bg-white/90 border border-[#E0E0E0] text-sm tabular-nums"
                    />
                  </div>
                )}

                {tier === 'teen' && regStep === 3 && (
                  <div className="space-y-3">
                    <div>
                      <h2 className="font-display font-semibold text-xl text-[#3C3C3B]">
                        Responsável legal
                      </h2>
                      <p className="text-xs text-[#6E6E6B]">Obrigatório conforme normas para 14+.</p>
                    </div>
                    <input
                      type="text"
                      value={guardianName}
                      onChange={(e) => setGuardianName(e.target.value)}
                      placeholder="Nome completo do responsável"
                      className="w-full min-h-[44px] px-3.5 rounded-2xl bg-white/90 border border-[#E0E0E0] text-sm"
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      value={guardianCpf}
                      onChange={(e) => setGuardianCpf(maskCPF(e.target.value))}
                      placeholder="CPF do responsável"
                      className="w-full min-h-[44px] px-3.5 rounded-2xl bg-white/90 border border-[#E0E0E0] text-sm tabular-nums"
                    />
                    <select
                      value={guardianRelation}
                      onChange={(e) => setGuardianRelation(e.target.value)}
                      className="w-full min-h-[44px] px-3.5 rounded-2xl bg-white/90 border border-[#E0E0E0] text-sm"
                    >
                      <option>Mãe / Pai</option>
                      <option>Tutor Legal</option>
                    </select>
                  </div>
                )}

                {tier === 'teen' && regStep === 4 && (
                  <div className="space-y-3">
                    <div>
                      <h2 className="font-display font-semibold text-xl text-[#3C3C3B]">
                        Consentimento do responsável
                      </h2>
                      <p className="text-xs text-[#6E6E6B]">
                        Autorização necessária para prosseguir com a abertura.
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[#7D8A71]/12 border border-[#7D8A71]/30 p-4 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-[#3C3C3B]">
                        <ShieldCheckIcon className="w-4 h-4 text-[#7D8A71]" />
                        <span>Responsável: {guardianName}</span>
                      </div>
                      <label className="flex items-start gap-2.5 text-xs text-[#3C3C3B] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={guardianConsent}
                          onChange={(e) => setGuardianConsent(e.target.checked)}
                          className="mt-0.5 w-4 h-4 accent-[#7D8A71]"
                        />
                        <span>
                          Autorizo a abertura desta conta demonstrativa Neo Jovem 14+ com
                          controle parental e limite exclusivo de débito.
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                {tier === 'teen' && regStep === 5 && (
                  <div className="space-y-3">
                    <div>
                      <h2 className="font-display font-semibold text-xl text-[#3C3C3B]">
                        Senha e PIN de segurança
                      </h2>
                      <p className="text-xs text-[#6E6E6B]">
                        Conta Jovem 14+ opera no débito, sem produtos de crédito.
                      </p>
                    </div>
                    <input
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Senha (mín. 6)"
                      className="w-full min-h-[46px] px-3.5 rounded-2xl bg-white/90 border border-[#E0E0E0] text-sm"
                    />
                    <input
                      type="password"
                      maxLength={4}
                      value={pin4}
                      onChange={(e) => setPin4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="PIN transacional de 4 dígitos"
                      className="w-full min-h-[46px] px-3.5 rounded-2xl bg-white/90 border border-[#E0E0E0] text-sm tracking-widest tabular-nums"
                    />
                  </div>
                )}

                {/* BUSINESS PJ FLOW (6 Steps) */}
                {tier === 'business' && regStep === 1 && (
                  <div className="space-y-3">
                    <div>
                      <h2 className="font-display font-semibold text-xl text-[#3C3C3B]">
                        CNPJ e porte empresarial
                      </h2>
                      <p className="text-xs text-[#6E6E6B]">Abertura para MEI, Ltda e S.A.</p>
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={documentVal}
                      onChange={(e) => setDocumentVal(maskCNPJ(e.target.value))}
                      placeholder="00.000.000/0001-00"
                      className="w-full min-h-[46px] px-3.5 rounded-2xl bg-white/90 border border-[#E0E0E0] text-sm tabular-nums"
                    />
                    <select
                      value={companySize}
                      onChange={(e) => setCompanySize(e.target.value)}
                      className="w-full min-h-[46px] px-3.5 rounded-2xl bg-white/90 border border-[#E0E0E0] text-sm"
                    >
                      <option>MEI / Microempresa</option>
                      <option>Sociedade Limitada (Ltda)</option>
                      <option>Sociedade Anônima (S.A.)</option>
                    </select>
                  </div>
                )}

                {tier === 'business' && regStep === 2 && (
                  <div className="space-y-3">
                    <div>
                      <h2 className="font-display font-semibold text-xl text-[#3C3C3B]">
                        Identificação da empresa
                      </h2>
                      <p className="text-xs text-[#6E6E6B]">Conforme cartão CNPJ da Receita Federal.</p>
                    </div>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Razão Social completa"
                      className="w-full min-h-[46px] px-3.5 rounded-2xl bg-white/90 border border-[#E0E0E0] text-sm"
                    />
                    <input
                      type="text"
                      value={companyTradeName}
                      onChange={(e) => setCompanyTradeName(e.target.value)}
                      placeholder="Nome Fantasia"
                      className="w-full min-h-[46px] px-3.5 rounded-2xl bg-white/90 border border-[#E0E0E0] text-sm"
                    />
                  </div>
                )}

                {tier === 'business' && regStep === 3 && (
                  <div className="space-y-3">
                    <div>
                      <h2 className="font-display font-semibold text-xl text-[#3C3C3B]">
                        Representante legal
                      </h2>
                      <p className="text-xs text-[#6E6E6B]">Sócio administrador autorizado no contrato social.</p>
                    </div>
                    <input
                      type="text"
                      value={repName}
                      onChange={(e) => setRepName(e.target.value)}
                      placeholder="Nome completo do representante"
                      className="w-full min-h-[44px] px-3.5 rounded-2xl bg-white/90 border border-[#E0E0E0] text-sm"
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      value={repCpf}
                      onChange={(e) => setRepCpf(maskCPF(e.target.value))}
                      placeholder="CPF do representante"
                      className="w-full min-h-[44px] px-3.5 rounded-2xl bg-white/90 border border-[#E0E0E0] text-sm tabular-nums"
                    />
                    <input
                      type="text"
                      value={repRole}
                      onChange={(e) => setRepRole(e.target.value)}
                      placeholder="Cargo"
                      className="w-full min-h-[44px] px-3.5 rounded-2xl bg-white/90 border border-[#E0E0E0] text-sm"
                    />
                  </div>
                )}

                {tier === 'business' && regStep === 4 && (
                  <div className="space-y-3">
                    <div>
                      <h2 className="font-display font-semibold text-xl text-[#3C3C3B]">
                        Endereço e contato PJ
                      </h2>
                      <p className="text-xs text-[#6E6E6B]">Sede operacional e e-mail financeiro.</p>
                    </div>
                    <input
                      type="text"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="Endereço comercial"
                      className="w-full min-h-[44px] px-3.5 rounded-2xl bg-white/90 border border-[#E0E0E0] text-sm"
                    />
                    <input
                      type="text"
                      value={cityState}
                      onChange={(e) => setCityState(e.target.value)}
                      placeholder="Cidade / UF"
                      className="w-full min-h-[44px] px-3.5 rounded-2xl bg-white/90 border border-[#E0E0E0] text-sm"
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="E-mail corporativo"
                      className="w-full min-h-[44px] px-3.5 rounded-2xl bg-white/90 border border-[#E0E0E0] text-sm"
                    />
                  </div>
                )}

                {tier === 'business' && regStep === 5 && (
                  <div className="space-y-3">
                    <div>
                      <h2 className="font-display font-semibold text-xl text-[#3C3C3B]">
                        Senha PJ e PIN
                      </h2>
                      <p className="text-xs text-[#6E6E6B]">Segurança de acesso e movimentações empresariais.</p>
                    </div>
                    <input
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Senha corporativa (mín. 6)"
                      className="w-full min-h-[46px] px-3.5 rounded-2xl bg-white/90 border border-[#E0E0E0] text-sm"
                    />
                    <input
                      type="password"
                      maxLength={4}
                      value={pin4}
                      onChange={(e) => setPin4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="PIN transacional de 4 dígitos"
                      className="w-full min-h-[46px] px-3.5 rounded-2xl bg-white/90 border border-[#E0E0E0] text-sm tracking-widest tabular-nums"
                    />
                  </div>
                )}

                {/* FINAL STEP FOR ALL TIERS (Terms & Conclusion) */}
                {regStep === totalStepsForTier && (
                  <div className="space-y-3">
                    <div>
                      <h2 className="font-display font-semibold text-xl text-[#3C3C3B]">
                        Termos e conclusão
                      </h2>
                      <p className="text-xs text-[#6E6E6B]">
                        Sua conta iniciará com saldo R$ 0,00 e sem cartão pré-emitido.
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white/85 border border-[#E0E0E0] p-3.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-display font-semibold text-sm text-[#3C3C3B] truncate">
                          {tier === 'business' ? companyTradeName : fullName}
                        </p>
                        <p className="text-xs text-[#6E6E6B] truncate">
                          {email} · {tier === 'teen' ? 'Modalidade Débito 14+' : tier === 'business' ? 'Conta PJ' : 'Conta Pessoal'}
                        </p>
                      </div>
                      <CheckCircleIcon className="w-5 h-5 text-[#7D8A71] shrink-0" />
                    </div>

                    <label className="flex items-start gap-2.5 text-xs text-[#3C3C3B] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={acceptedTerms}
                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                        className="mt-0.5 w-4 h-4 accent-[#7D8A71]"
                      />
                      <span>
                        Concordo com os Termos de Uso Demonstrativo, política LGPD e regras
                        aplicáveis ao perfil selecionado.
                      </span>
                    </label>
                  </div>
                )}

                {regError && (
                  <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                    {regError}
                  </p>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Bottom Action Footer (Always visible, zero scroll) */}
        <footer className="pt-2 pb-3 sm:pb-0 shrink-0">
          {mode === 'login' && (
            <div className="flex items-center justify-between text-xs pt-2 border-t border-[#E0E0E0]/60">
              <span className="text-[#6E6E6B]">Ainda não tem conta?</span>
              <button
                type="button"
                onClick={() => {
                  setRegStep(0);
                  setMode('register');
                }}
                className="font-semibold text-[#3C3C3B] hover:text-[#7D8A71] cursor-pointer py-1.5"
              >
                Criar uma conta
              </button>
            </div>
          )}

          {mode === 'register' && regStep > 0 && (
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setRegError('');
                  setRegStep((s) => s - 1);
                }}
                className="min-h-[46px] px-4 rounded-2xl bg-white/85 border border-[#E0E0E0] text-xs font-medium text-[#3C3C3B] cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={validateAndAdvance}
                className="flex-1 min-h-[46px] rounded-2xl bg-[#7D8A71] text-white text-sm font-medium flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>
                  {regStep === totalStepsForTier ? 'Concluir abertura' : 'Continuar'}
                </span>
                {regStep === totalStepsForTier ? (
                  <CheckCircleIcon className="w-4 h-4" />
                ) : (
                  <ArrowRightIcon className="w-4 h-4" />
                )}
              </button>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
};
