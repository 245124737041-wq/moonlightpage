import React from 'react';
import { BookOpen, Bookmark, Check, Heart, Scale, X } from 'lucide-react';
import { Book, ShelfStatus, UserState } from '../types.ts';
import { BookCover } from './BookCover.tsx';
import { formatReadingTime } from '../lib/i18n.ts';

interface BookDetailModalProps {
  book: Book | null;
  user: UserState;
  whyRecommended?: string;
  onClose: () => void;
  onStartReading: (bookId: string) => void;
  onUpdateShelf: (bookId: string, shelf: ShelfStatus, action: 'add' | 'remove') => void;
  onCompareBook: (bookId: string) => void;
}

export const BookDetailModal: React.FC<BookDetailModalProps> = ({
  book,
  user,
  whyRecommended,
  onClose,
  onStartReading,
  onUpdateShelf,
  onCompareBook,
}) => {
  if (!book) return null;

  const isFavorite = user.library.favorites.includes(book.id);
  const currentShelf: ShelfStatus | null = user.library.reading.includes(book.id)
    ? 'reading'
    : user.library.want_to_read.includes(book.id)
    ? 'want_to_read'
    : user.library.completed.includes(book.id)
    ? 'completed'
    : user.library.abandoned.includes(book.id)
    ? 'abandoned'
    : null;

  const estTime = formatReadingTime(book.pages, user.stats.avgPagesPerHour);

  const dnaItems = [
    { label: 'Romance', value: book.dna.romance },
    { label: 'Psychology', value: book.dna.psychology },
    { label: 'Comedy', value: book.dna.comedy },
    { label: 'Action', value: book.dna.action },
    { label: 'Philosophy', value: book.dna.philosophy },
    { label: 'Mystery', value: book.dna.mystery },
  ];

  const renderDots = (count: number) => (
    <span className="inline-flex items-center gap-1" aria-label={`${count} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={`w-2 h-2 rounded-full ${
            n <= count
              ? 'bg-[#1E3A8A] dark:bg-blue-400'
              : 'bg-stone-200 dark:bg-zinc-700'
          }`}
        />
      ))}
    </span>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-xs p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={book.title}
    >
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-[#FCFCFA] dark:bg-[#17191E] border border-stone-200 dark:border-zinc-800 rounded-t-2xl sm:rounded-2xl shadow-xl">
        {/* Top bar */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-[#FCFCFA]/95 dark:bg-[#17191E]/95 backdrop-blur-md border-b border-stone-200 dark:border-zinc-800">
          <div className="text-xs text-stone-500 dark:text-zinc-400 flex items-center gap-2">
            <span>{book.author}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{book.year}</span>
            <span aria-hidden="true">·</span>
            <span>{book.country}</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close book details"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 sm:p-8 space-y-8">
          {/* Header split */}
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
            <div className="shrink-0 flex justify-center sm:justify-start">
              <BookCover book={book} size="lg" />
            </div>

            <div className="flex-1 min-w-0 space-y-4">
              <div>
                <div className="text-xs text-stone-500 dark:text-zinc-400 flex flex-wrap items-center gap-2 mb-1.5">
                  <span>{book.genres.slice(0, 3).join(' · ')}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{book.pages} pages</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">Est. {estTime}</span>
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-semibold text-stone-900 dark:text-zinc-100 leading-tight">
                  {book.title}
                </h2>
                <p className="text-sm text-stone-600 dark:text-zinc-400 mt-1">
                  by {book.author}
                  {book.isPublicDomain ? ' · Public Domain Edition' : ' · Guided Companion'}
                </p>
              </div>

              <p className="text-[15px] leading-relaxed text-stone-700 dark:text-zinc-300">
                {book.spoilerFreeIntro}
              </p>

              {whyRecommended && (
                <div className="p-4 rounded-xl bg-stone-100/80 dark:bg-zinc-800/70 border border-stone-200 dark:border-zinc-700">
                  <p className="text-xs font-semibold text-[#1E3A8A] dark:text-blue-300 mb-1">
                    Why we&apos;re recommending this
                  </p>
                  <p className="text-sm text-stone-700 dark:text-zinc-300 leading-relaxed">
                    {whyRecommended}
                  </p>
                </div>
              )}

              {/* Primary Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                {!book.metadataOnly ? (
                  <button
                    onClick={() => {
                      onStartReading(book.id);
                      onClose();
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#1E3A8A] text-white text-sm font-medium hover:bg-[#172D6B] dark:bg-blue-600 dark:hover:bg-blue-500 transition-colors whitespace-nowrap shrink-0"
                  >
                    <BookOpen className="w-4 h-4" />
                    {user.progress[book.id] ? 'Continue Reading' : 'Start Reading'}
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      onUpdateShelf(
                        book.id,
                        currentShelf === 'want_to_read' ? 'reading' : 'want_to_read',
                        'add'
                      )
                    }
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#1E3A8A] text-white text-sm font-medium hover:bg-[#172D6B] dark:bg-blue-600 dark:hover:bg-blue-500 transition-colors whitespace-nowrap shrink-0"
                  >
                    <Bookmark className="w-4 h-4" />
                    Track in Library
                  </button>
                )}

                <button
                  onClick={() =>
                    onUpdateShelf(book.id, 'favorites', isFavorite ? 'remove' : 'add')
                  }
                  className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                    isFavorite
                      ? 'border-[#1E3A8A] text-[#1E3A8A] bg-blue-50/70 dark:border-blue-400 dark:text-blue-300 dark:bg-blue-950/40'
                      : 'border-stone-200 dark:border-zinc-700 text-stone-700 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
                  {isFavorite ? 'Favorited' : 'Favorite'}
                </button>

                <button
                  onClick={() => {
                    onCompareBook(book.id);
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-stone-200 dark:border-zinc-700 text-sm font-medium text-stone-700 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0"
                >
                  <Scale className="w-4 h-4" />
                  Compare
                </button>
              </div>
            </div>
          </div>

          {/* Shelf selector */}
          <div className="pt-4 border-t border-stone-200 dark:border-zinc-800">
            <p className="text-xs font-medium text-stone-500 dark:text-zinc-400 mb-2.5">
              Personal Library Shelf
            </p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { id: 'reading', label: 'Currently Reading' },
                  { id: 'want_to_read', label: 'Want to Read' },
                  { id: 'completed', label: 'Completed' },
                  { id: 'abandoned', label: 'Paused / Abandoned' },
                ] as { id: ShelfStatus; label: string }[]
              ).map((shelf) => {
                const active = currentShelf === shelf.id;
                return (
                  <button
                    key={shelf.id}
                    onClick={() =>
                      onUpdateShelf(book.id, shelf.id, active ? 'remove' : 'add')
                    }
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-stone-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {active && <Check className="w-3.5 h-3.5" />}
                    {shelf.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Difficulty Breakdown + Book DNA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-stone-200 dark:border-zinc-800">
            {/* Reading Difficulty Score */}
            <div className="space-y-4">
              <div className="flex items-baseline justify-between">
                <h3 className="font-display text-lg font-medium text-stone-900 dark:text-zinc-100">
                  Reading Difficulty
                </h3>
                <span className="font-mono text-sm font-medium tabular-nums text-[#1E3A8A] dark:text-blue-400">
                  {book.difficulty.overall} / 5
                </span>
              </div>

              <div className="space-y-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-stone-600 dark:text-zinc-400">Language</span>
                  {renderDots(book.difficulty.language)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-600 dark:text-zinc-400">Story complexity</span>
                  {renderDots(book.difficulty.complexity)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-600 dark:text-zinc-400">Length</span>
                  {renderDots(book.difficulty.length)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-600 dark:text-zinc-400">Vocabulary</span>
                  {renderDots(book.difficulty.vocabulary)}
                </div>
              </div>

              <p className="text-xs leading-relaxed text-stone-600 dark:text-zinc-400 pt-1">
                {book.difficulty.explanation}
              </p>
            </div>

            {/* Book DNA */}
            <div className="space-y-4">
              <div className="flex items-baseline justify-between">
                <h3 className="font-display text-lg font-medium text-stone-900 dark:text-zinc-100">
                  Book DNA
                </h3>
                <span className="text-xs text-stone-500 dark:text-zinc-400">
                  Tone &amp; Balance
                </span>
              </div>

              <div className="space-y-2.5">
                {dnaItems.map((item) => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-stone-600 dark:text-zinc-400">{item.label}</span>
                      <span className="font-mono tabular-nums text-stone-500 dark:text-zinc-400">
                        {item.value}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-stone-200 dark:bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#1E3A8A] dark:bg-blue-500 transition-all duration-300"
                        style={{ width: `${item.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Content Profile & Themes */}
          <div className="pt-4 border-t border-stone-200 dark:border-zinc-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <p className="text-stone-500 dark:text-zinc-400">Emotional Intensity</p>
              <p className="font-medium text-stone-900 dark:text-zinc-100 mt-0.5">
                {book.emotionalIntensity}
              </p>
            </div>
            <div>
              <p className="text-stone-500 dark:text-zinc-400">Romance Level</p>
              <p className="font-medium text-stone-900 dark:text-zinc-100 mt-0.5">
                {book.romanceLevel}
              </p>
            </div>
            <div>
              <p className="text-stone-500 dark:text-zinc-400">Violence Level</p>
              <p className="font-medium text-stone-900 dark:text-zinc-100 mt-0.5">
                {book.violenceLevel}
              </p>
            </div>
            <div>
              <p className="text-stone-500 dark:text-zinc-400">Age Suitability</p>
              <p className="font-medium text-stone-900 dark:text-zinc-100 mt-0.5">
                {book.ageSuitability}
              </p>
            </div>
          </div>

          <div className="text-xs text-stone-500 dark:text-zinc-400">
            Themes: {book.themes.join(' · ')}
          </div>
        </div>
      </div>
    </div>
  );
};
