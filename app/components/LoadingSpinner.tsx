'use client';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export default function LoadingSpinner({ size = 'md', text = 'Loading' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <div className={`${sizeClasses[size]} relative`}>
        {/* Outer gradient ring */}
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 border-r-indigo-500 border-b-purple-500 border-l-blue-400 animate-spin dark:border-t-blue-400 dark:border-r-indigo-400 dark:border-b-purple-400 dark:border-l-blue-300"></div>
        
        {/* Inner shimmer effect */}
        <div className="absolute inset-1 rounded-full bg-gradient-to-r from-blue-400/20 via-indigo-400/20 to-purple-400/20 dark:from-blue-500/30 dark:via-indigo-500/30 dark:to-purple-500/30 animate-pulse"></div>
      </div>
      
      {text && (
        <p className={`mt-3 ${textSizeClasses[size]} text-gray-600 dark:text-gray-300 font-medium`}>
          {text}
        </p>
      )}
    </div>
  );
}
