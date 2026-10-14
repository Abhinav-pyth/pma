export function Skeleton({ className = "" }: { className?: string }) { return <div className={`animate-pulse rounded bg-slate-200 dark:bg-slate-800 ${className}`} />; }
export function EmptyState({ icon, title, description, action }: { icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
      {icon}
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</p>
      {description && <p className="max-w-sm text-xs text-slate-500">{description}</p>}
      {action}
    </div>
  );
}
export function Progress({ value, className = "" }: { value: number; className?: string }) {
  return (
    <div role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} className={`h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800 ${className}`}>
      <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
export function Spinner() { return <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" aria-label="Loading" />; }
