import React from 'react';
import { clsx } from 'clsx';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const norm = (status || '').toUpperCase();

  const getStyle = () => {
    switch (norm) {
      case 'ACTIVE':
      case 'CURRENT':
        return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 dark:border-emerald-500/20';
      case 'INACTIVE':
        return 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-300 dark:border-slate-500/20';
      case 'MAINTENANCE':
      case 'DUE_SOON':
      case 'DUE SOON':
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 dark:border-amber-500/20';
      case 'DECOMMISSIONED':
      case 'DISABLED':
      case 'EXPIRED':
      case 'OVERDUE':
        return 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30 dark:border-rose-500/20';
      default:
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30 dark:border-blue-500/20';
    }
  };

  const getLabel = () => {
    switch (norm) {
      case 'DUE_SOON':
        return 'DUE SOON';
      default:
        return norm;
    }
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border',
        getStyle(),
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-80" />
      {getLabel()}
    </span>
  );
};
