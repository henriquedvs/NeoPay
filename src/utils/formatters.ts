export function formatBRL(value: number, hide = false): string {
  if (hide) return 'R$ •••••';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatSignedBRL(value: number, hide = false): string {
  if (hide) return 'R$ •••••';
  const abs = Math.abs(value);
  const formatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(abs);
  return value >= 0 ? `+ ${formatted}` : `- ${formatted}`;
}

export function maskCPF(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function maskCNPJ(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export function maskDocumentAuto(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length <= 11) return maskCPF(digits);
  return maskCNPJ(digits);
}

export function maskPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function calculateAge(birthDateStr: string): number | null {
  if (!birthDateStr) return null;
  const birth = new Date(birthDateStr + 'T00:00:00');
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export function formatShortDate(dateISO: string): string {
  const d = new Date(dateISO);
  if (Number.isNaN(d.getTime())) return dateISO;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export function formatFullDate(dateISO: string): string {
  const d = new Date(dateISO);
  if (Number.isNaN(d.getTime())) return dateISO;
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function generateAuthCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = 'NEO-';
  for (let i = 0; i < 8; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export function getGreetingByHour(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function tierDisplayLabel(tier: 'teen' | 'adult' | 'business'): string {
  if (tier === 'teen') return 'Neo Jovem 14+';
  if (tier === 'business') return 'Neo Empresas PJ';
  return 'Neo Pessoal';
}

/**
 * Permanent business rule: accounts for teens (14-17) cannot access or hold credit products.
 */
export function isCreditAllowed(account: {
  tier: 'teen' | 'adult' | 'business';
  birthDate?: string;
}): boolean {
  if (account.tier === 'teen') return false;
  if (account.tier === 'adult' && account.birthDate) {
    const age = calculateAge(account.birthDate);
    if (age !== null && age < 18) return false;
  }
  return true;
}

