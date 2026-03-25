'use client';

import { useEffect, useRef, useState } from 'react';

interface HistoryItem {
  topic: string;
  timestamp: number;
}

interface SearchHistoryProps {
  onSelect: (topic: string) => void;
  currentTopic?: string;
}

export default function SearchHistory({ onSelect, currentTopic }: SearchHistoryProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load history from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('researchHistory');
    if (stored) {
      try {
        setHistory(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse search history:', e);
      }
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem('researchHistory', JSON.stringify(history));
    }
  }, [history]);

  function addToHistory(topic: string) {
    if (!topic.trim()) return;

    setHistory((prev) => {
      // Remove duplicate if it exists
      const filtered = prev.filter((item) => item.topic.toLowerCase() !== topic.toLowerCase());
      // Add new item at the beginning
      const updated = [{ topic, timestamp: Date.now() }, ...filtered];
      // Keep only last 10 items
      return updated.slice(0, 10);
    });
  }

  function handleSelect(topic: string) {
    addToHistory(topic);
    onSelect(topic);
    setIsOpen(false);
  }

  function clearHistory() {
    setHistory([]);
    localStorage.removeItem('researchHistory');
    setIsOpen(false);
  }

  // Sort by most recent first
  const sortedHistory = [...history].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="mt-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors flex items-center gap-1"
        aria-label="Toggle search history"
      >
        <span>⏱️ Recent</span>
        <span className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-10 min-w-48">
          {sortedHistory.length > 0 ? (
            <>
              <div className="max-h-64 overflow-y-auto">
                {sortedHistory.map((item) => (
                  <button
                    key={item.timestamp}
                    onClick={() => handleSelect(item.topic)}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors border-b border-gray-200 dark:border-gray-600 last:border-b-0 ${
                      currentTopic?.toLowerCase() === item.topic.toLowerCase()
                        ? 'bg-indigo-50 dark:bg-indigo-900/30'
                        : ''
                    }`}
                  >
                    <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                      {item.topic}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(item.timestamp).toLocaleDateString()} at{' '}
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={clearHistory}
                className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border-t border-gray-200 dark:border-gray-600 font-medium"
              >
                🗑️ Clear History
              </button>
            </>
          ) : (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
              No search history yet
            </div>
          )}
        </div>
      )}
    </div>
  );
}
