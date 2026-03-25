'use client';

import { useMemo } from 'react';

interface Article {
  id: number;
  topic: string;
  source_name: string;
  title: string;
  url: string;
  content: string;
  crawl_date: string;
}

interface StatCard {
  icon: string;
  label: string;
  value: string | number;
  subtext?: string;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'rose';
}

interface StatsDashboardProps {
  articles: Article[];
  loading?: boolean;
}

export default function StatsDashboard({ articles, loading }: StatsDashboardProps) {
  const stats = useMemo(() => {
    if (!articles.length) {
      return [];
    }

    // Calculate stats
    const totalArticles = articles.length;
    const uniqueSources = new Set(articles.map((a) => a.source_name)).size;

    // Find last crawl date
    const crawlDates = articles
      .map((a) => new Date(a.crawl_date).getTime())
      .filter((d) => !isNaN(d));
    const lastCrawlDate =
      crawlDates.length > 0 ? new Date(Math.max(...crawlDates)) : null;

    // Calculate average articles per source
    const avgPerSource = uniqueSources > 0 ? (totalArticles / uniqueSources).toFixed(1) : '0';

    // Find most active source
    const sourceCount: Record<string, number> = {};
    articles.forEach((a) => {
      sourceCount[a.source_name] = (sourceCount[a.source_name] || 0) + 1;
    });
    const mostActiveSource = Object.entries(sourceCount).sort(
      ([, a], [, b]) => b - a
    )[0];

    const statCards: StatCard[] = [
      {
        icon: '📄',
        label: 'Total Articles',
        value: totalArticles,
        color: 'blue',
      },
      {
        icon: '📰',
        label: 'Unique Sources',
        value: uniqueSources,
        color: 'green',
      },
      {
        icon: '📈',
        label: 'Avg per Source',
        value: avgPerSource,
        subtext: 'articles',
        color: 'purple',
      },
      {
        icon: '🔄',
        label: 'Last Crawl',
        value: lastCrawlDate ? lastCrawlDate.toLocaleDateString() : 'Never',
        subtext: lastCrawlDate ? lastCrawlDate.toLocaleTimeString() : undefined,
        color: 'orange',
      },
      {
        icon: '⭐',
        label: 'Most Active',
        value: mostActiveSource?.[0] || 'N/A',
        subtext: mostActiveSource ? `${mostActiveSource[1]} articles` : undefined,
        color: 'rose',
      },
    ];

    return statCards;
  }, [articles]);

  const colorClasses: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600 text-blue-100',
    green: 'from-green-500 to-green-600 text-green-100',
    purple: 'from-purple-500 to-purple-600 text-purple-100',
    orange: 'from-orange-500 to-orange-600 text-orange-100',
    rose: 'from-rose-500 to-rose-600 text-rose-100',
  };

  const borderClasses: Record<string, string> = {
    blue: 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20',
    green: 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20',
    purple: 'border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20',
    orange: 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20',
    rose: 'border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20',
  };

  if (loading && !articles.length) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 animate-pulse"
          >
            <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
            <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!articles.length) {
    return null;
  }

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
        <span>📊</span> Research Statistics
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className={`border rounded-lg p-4 transition-transform hover:shadow-lg hover:scale-105 ${
              borderClasses[stat.color]
            }`}
          >
            <div
              className={`inline-block bg-gradient-to-br ${colorClasses[stat.color]} rounded-lg p-2 mb-3 text-lg`}
            >
              {stat.icon}
            </div>
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300">
              {stat.label}
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
              {stat.value}
            </div>
            {stat.subtext && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {stat.subtext}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
