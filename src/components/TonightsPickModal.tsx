import React, { useState } from 'react';
import { BookOpen, Clock, Sparkles, X } from 'lucide-react';
import { Book, RecommendedBookResult, UserState } from '../types.ts';
import { api } from '../lib/api.ts';
import { BookCover } from './BookCover.tsx';

interface TonightsPickModalProps {
  open: boolean;
  books: Book[];
  user: UserState;
  onClose: () => void;
  onSelectBook: (book: Book, why?: string) => void;
  onStartReading: (bookId: string) => void;
}

const MOODS = [
  'Happy',
  'Sad',
  'Romantic',
  'Excited',
  'Curious',
  'Scared',
  'Thoughtful',
  'Relaxed',
];

const TIMES = ['10 minutes', '30 minutes', '1 hour', '2+ hours'];

export const TonightsPickModal: React.FC<TonightsPickModalProps> = ({
  open,
  books,
  user,
  onClose,
  onSelectBook,
  onStartReading,
}) => {
  const [mood, setMood] = useState('Thoughtful');
  const [time, setTime] = useState('30 minutes');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    summaryMessage: string;
    recommendations: RecommendedBookResult[];
  } | null>(null);

  if (!open) return null;

  const handleFind = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.aiRecommend({
        mood,
        timeAvailable: time,
        query: `Quick evening pick for a ${mood.toLowerCase()} mood with ${time} available tonight.`,
      });
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Could not load a recommendation right now.');
    } finally {
      setLoading(false);
    }
  };

  const topPick = result?.recommendations[0];
  const topBook = topPick ? books.find((b) => b.id === topPick.bookId) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-xs p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="What should I read tonight?"
    >
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-[#FCFCFA] dark:bg-[#17191E] border border-stone-200 dark:border-zinc-800 rounded-t-2xl sm:rounded-2xl shadow-xl p-6 sm:p-8 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-[#1E3A8A] dark:text-blue-400">
              Quick Evening Match
            </p>
            <h2 className="font-display text-2xl font-semibold text-stone-900 dark:text-zinc-100 mt-1">
              What should I read tonight?
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close tonight's pick"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-stone-600 dark:text-zinc-400 mb-2">
              How are you feeling tonight?
            </label>
            <div className="flex flex-wrap gap-2">
              {MOODS.map((m) => (
                <button
                  key={m}
                  onClick={() => setMood(m)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    mood === m
                      ? 'bg-[#1E3A8A] text-white dark:bg-blue-600'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-600 dark:text-zinc-400 mb-2">
              How much time do you have?
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TIMES.map((t) => (
                <button
                  key={t}
                  onClick={() => setTime(t)}
                  className={`px-3 py-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                    time === t
                      ? 'bg-stone-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  {t}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleFind}
            disabled={loading}
            className="w-full py-3 px-4 rounded-lg bg-[#1E3A8A] text-white text-sm font-medium hover:bg-[#172D6B] disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500 transition-colors flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {loading ? 'Finding your evening read...' : 'Find Tonight’s Book'}
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg p-3">
            {error}
          </p>
        )}

        {topBook && topPick && (
          <div className="pt-4 border-t border-stone-200 dark:border-zinc-800 space-y-4">
            <p className="text-sm text-stone-600 dark:text-zinc-300">{result?.summaryMessage}</p>
            <div className="flex gap-4 items-start p-4 rounded-xl bg-stone-50 dark:bg-zinc-900/60 border border-stone-200 dark:border-zinc-800">
              <BookCover book={topBook} size="sm" className="shrink-0" />
              <div className="flex-1 min-w-0 space-y-2">
                <div>
                  <h3 className="font-display text-lg font-semibold text-stone-900 dark:text-zinc-100">
                    {topBook.title}
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-zinc-400">
                    {topBook.author} · Difficulty {topBook.difficulty.overall}/5 · Est.{' '}
                    {topPick.readingTimeEstimate}
                  </p>
                </div>
                <p className="text-sm text-stone-700 dark:text-zinc-300 leading-relaxed">
                  {topPick.whyRecommended}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {!topBook.metadataOnly && (
                    <button
                      onClick={() => {
                        onStartReading(topBook.id);
                        onClose();
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1E3A8A] text-white text-xs font-medium hover:bg-[#172D6B] dark:bg-blue-600"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      Read Now
                    </button>
                  )}
                  <button
                    onClick={() => {
                      onSelectBook(topBook, topPick.whyRecommended);
                      onClose();
                    }}
                    className="px-4 py-2 rounded-lg border border-stone-200 dark:border-zinc-700 text-xs font-medium text-stone-700 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-800"
                  >
                    View Book Details
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
