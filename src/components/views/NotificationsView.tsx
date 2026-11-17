import React, { useMemo, useState } from 'react';
import {
  ArrowLeftIcon,
  BellIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import {
  AppNotification,
  AppSection,
  NotificationCategory,
  NotificationImportance,
  UserAccount,
} from '../../types/neo';
import { formatFullDate } from '../../utils/formatters';

interface NotificationsViewProps {
  account: UserAccount;
  onBack: () => void;
  onMarkAllRead: () => void;
  onToggleRead: (notifId: string) => void;
  onNavigate: (section: AppSection) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  account,
  onBack,
  onMarkAllRead,
  onToggleRead,
  onNavigate,
}) => {
  const [catFilter, setCatFilter] = useState<'Todas' | NotificationCategory>('Todas');
  const [impFilter, setImpFilter] = useState<'Todas' | NotificationImportance>('Todas');

  const unreadCount = account.notifications.filter((n) => !n.read).length;

  const filtered = useMemo(() => {
    return account.notifications.filter((n) => {
      if (catFilter !== 'Todas' && n.category !== catFilter) return false;
      if (impFilter !== 'Todas' && n.importance !== impFilter) return false;
      return true;
    });
  }, [account.notifications, catFilter, impFilter]);

  const groupedByDate = useMemo(() => {
    const groups: Record<string, AppNotification[]> = {};
    filtered.forEach((n) => {
      const key = n.dateISO || 'Recentes';
      if (!groups[key]) groups[key] = [];
      groups[key].push(n);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

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
            <h1 className="font-display font-bold text-2xl text-[#3C3C3B]">
              Central de Notificações
            </h1>
            <p className="text-xs text-[#6E6E6B]">
              {unreadCount > 0
                ? `${unreadCount} alerta(s) não lido(s)`
                : 'Todas as notificações lidas'}
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="min-h-[38px] px-4 rounded-xl bg-[#3C3C3B] text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
          >
            <CheckIcon className="w-4 h-4" />
            <span>Marcar todas como lidas</span>
          </button>
        )}
      </header>

      {/* Filters by Category & Importance */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar p-1 rounded-2xl bg-[#E0E0E0]/55">
          {(['Todas', 'Pagamentos', 'Cartões', 'Segurança', 'Conta'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCatFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap cursor-pointer ${
                catFilter === cat ? 'bg-white text-[#3C3C3B] shadow-sm' : 'text-[#6E6E6B]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <select
          value={impFilter}
          onChange={(e) => setImpFilter(e.target.value as 'Todas' | NotificationImportance)}
          className="min-h-[38px] px-3 rounded-xl bg-white/85 border border-[#E0E0E0] text-xs"
        >
          <option value="Todas">Importância: Todas</option>
          <option value="Alta">Importância: Alta</option>
          <option value="Média">Importância: Média</option>
          <option value="Normal">Importância: Normal</option>
        </select>
      </div>

      {/* Grouped Notifications */}
      {groupedByDate.length === 0 ? (
        <div className="neo-glass rounded-3xl p-8 text-center space-y-2">
          <BellIcon className="w-8 h-8 text-[#6E6E6B]/60 mx-auto" />
          <p className="text-sm font-medium text-[#3C3C3B]">
            Nenhuma notificação com os filtros selecionados.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedByDate.map(([dateKey, items]) => (
            <section key={dateKey} className="space-y-2">
              <h2 className="font-display font-bold text-xs text-[#6E6E6B] px-1">
                {dateKey.includes('-') ? formatFullDate(dateKey) : dateKey}
              </h2>
              <div className="space-y-2">
                {items.map((notif) => (
                  <div
                    key={notif.id}
                    className={`neo-glass rounded-2xl p-4 flex flex-wrap items-start justify-between gap-3 ${
                      notif.read ? 'opacity-80' : 'border-[#7D8A71]/45'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (!notif.read) onToggleRead(notif.id);
                        if (notif.targetSection) onNavigate(notif.targetSection);
                      }}
                      className="flex-1 min-w-0 text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2 text-[11px] text-[#6E6E6B]">
                        <span className="font-medium text-[#7D8A71]">{notif.category}</span>
                        <span>·</span>
                        <span>Importância {notif.importance}</span>
                        <span>·</span>
                        <span>{notif.timeLabel}</span>
                      </div>
                      <p className="font-display font-bold text-sm text-[#3C3C3B] mt-0.5">
                        {notif.title}
                      </p>
                      <p className="text-xs text-[#6E6E6B] mt-0.5">{notif.body}</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => onToggleRead(notif.id)}
                      className="text-[11px] font-medium text-[#7D8A71] hover:underline cursor-pointer shrink-0"
                    >
                      {notif.read ? 'Marcar não lida' : 'Marcar lida'}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};
