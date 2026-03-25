'use client';

interface BadgeProps {
  label: string;
  variant?: 'default' | 'source' | 'date' | 'severity' | 'tag';
  icon?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export default function Badge({
  label,
  variant = 'default',
  icon,
  size = 'sm',
  className = '',
}: BadgeProps) {
  const sizeClasses = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
  };

  const variantClasses = {
    default:
      'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 border border-gray-300 dark:border-gray-600',
    source:
      'bg-blue-100 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100 border border-blue-300 dark:border-blue-700 hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors',
    date:
      'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-100 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-200 dark:hover:bg-emerald-900/60 transition-colors',
    severity: {
      high: 'bg-red-100 dark:bg-red-900/40 text-red-900 dark:text-red-100 border border-red-300 dark:border-red-700',
      medium: 'bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100 border border-amber-300 dark:border-amber-700',
      low: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-900 dark:text-yellow-100 border border-yellow-300 dark:border-yellow-700',
    },
    tag:
      'bg-purple-100 dark:bg-purple-900/40 text-purple-900 dark:text-purple-100 border border-purple-300 dark:border-purple-700 hover:bg-purple-200 dark:hover:bg-purple-900/60 transition-colors',
  };

  // Handle severity variant
  let finalVariantClass = variantClasses[variant as keyof typeof variantClasses];
  if (variant === 'severity' && typeof finalVariantClass === 'object') {
    const severityLevel = (label.toLowerCase() as 'high' | 'medium' | 'low') || 'medium';
    finalVariantClass = finalVariantClass[severityLevel] || finalVariantClass['medium'];
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap ${sizeClasses[size]} ${finalVariantClass} ${className}`}
    >
      {icon && <span className="text-lg leading-none">{icon}</span>}
      <span>{label}</span>
    </span>
  );
}
