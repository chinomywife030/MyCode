// 🎨 Empty State Component - 統一的空狀態 UI

interface EmptyStateProps {
  icon?: string; // emoji 圖示
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
}

export default function EmptyState({
  icon = '📦',
  title,
  description,
  actionLabel,
  actionHref,
  className = ''
}: EmptyStateProps) {
  return (
    <div className={`bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100 ${className}`}>
      {/* Icon */}
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <span className="text-5xl opacity-40">{icon}</span>
      </div>

      {/* Title */}
      <h3 className="text-xl font-bold text-gray-900 mb-3">
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto leading-relaxed">
          {description}
        </p>
      )}

      {/* Action Button */}
      {actionLabel && actionHref && (
        <a
          href={actionHref}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-xl hover:from-orange-600 hover:to-orange-700 transition shadow-sm hover:shadow-md"
        >
          {actionLabel}
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </a>
      )}
    </div>
  );
}

























