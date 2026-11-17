import React, { useMemo, useState } from 'react';
import { BookOpen, BookmarkCheck, Feather, Trash2 } from 'lucide-react';
import { Book, ShelfStatus, UserState } from '../types.ts';
import { api } from '../lib/api.ts';
import { computeLocalRecommendations } from '../lib/recommend.ts';
import { formatReadingTime } from '../lib/i18n.ts';
import { BookCover } from './BookCover.tsx';

interface LibraryViewProps {
  books: Book[];
  user: UserState;
  onSelectBook: (book: Book, why?: string) => void;
  onStartReading: (bookId: string) => void;
  onUserUpdated: (user: UserState) => void;
}

type LibraryTab = ShelfStatus | 'recommended' | 'vocabulary' | 'journal';

export const LibraryView: React.FC<LibraryViewProps> = ({
  books,
  user,
  onSelectBook,
  onStartReading,
  onUserUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<LibraryTab>('reading');

  const recommended = useMemo(
    () => computeLocalRecommendations(books, user).slice(0, 6),
    [books, user]
  );

  const shelfBooks = useMemo(() => {
    if (
      activeTab === 'reading' ||
      activeTab === 'want_to_read' ||
      activeTab === 'completed' ||
      activeTab === 'abandoned' ||
      activeTab === 'favorites'
    ) {
      const ids = user.library[activeTab] || [];
      return ids
        .map((id) => books.find((b) => b.id === id))
        .filter((b): b is Book => Boolean(b));
    }
    return [];
  }, [activeTab, books, user.library]);

  const tabs: { id: LibraryTab; label: string; count?: number }[] = [
    { id: 'reading', label: 'Currently Reading', count: user.library.reading.length },
    { id: 'want_to_read', label: 'Want to Read', count: user.library.want_to_read.length },
    { id: 'completed', label: 'Completed', count: user.library.completed.length },
    { id: 'favorites', label: 'Favorites', count: user.library.favorites.length },
    { id: 'abandoned', label: 'Abandoned', count: user.library.abandoned.length },
    { id: 'recommended', label: 'Recommended For Me', count: recommended.length },
    { id: 'vocabulary', label: 'My Vocabulary', count: user.vocabulary.length },
    { id: 'journal', label: 'Reading Journal', count: user.journal.length },
  ];

  const handleDeleteWord = async (id: string) => {
    const res = await api.deleteVocabulary(id);
    onUserUpdated(res.user);
  };

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="font-display text-3xl font-semibold text-stone-900 dark:text-zinc-100">
          Your Personal Library
        </h1>
        <p className="text-sm text-stone-500 dark:text-zinc-400 mt-1">
          Shelves, saved vocabulary, and private chapter reflections in one calm place.
        </p>
      </div>

      {/* Horizontal Scrollable Tabs */}
      <div className="flex items-center gap-1 p-1 bg-stone-100 dark:bg-zinc-900 rounded-xl overflow-x-auto no-scrollbar">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === t.id
                ? 'bg-white dark:bg-zinc-800 text-stone-900 dark:text-white shadow-xs'
                : 'text-stone-600 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-200'
            }`}
          >
            <span>{t.label}</span>
            {typeof t.count === 'number' && (
              <span className="font-mono text-[11px] tabular-nums opacity-65">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Recommended For Me Tab */}
      {activeTab === 'recommended' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recommended.map((rec) => {
            const book = books.find((b) => b.id === rec.bookId);
            if (!book) return null;
            return (
              <div
                key={book.id}
                className="p-5 rounded-2xl bg-white dark:bg-[#17191E] border border-stone-200 dark:border-zinc-800 space-y-4"
              >
                <div className="flex gap-4">
                  <button onClick={() => onSelectBook(book, rec.whyRecommended)} className="shrink-0">
                    <BookCover book={book} size="sm" className="w-20 h-28" />
                  </button>
                  <div className="min-w-0 space-y-1">
                    <button
                      onClick={() => onSelectBook(book, rec.whyRecommended)}
                      className="font-display text-lg font-semibold text-stone-900 dark:text-zinc-100 text-left hover:text-[#1E3A8A] dark:hover:text-blue-400"
                    >
                      {book.title}
                    </button>
                    <p className="text-xs text-stone-500 dark:text-zinc-400">{book.author}</p>
                    <p className="text-xs text-stone-500 dark:text-zinc-400 tabular-nums">
                      Difficulty {book.difficulty.overall}/5 · {rec.readingTimeEstimate}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-stone-600 dark:text-zinc-300 leading-relaxed">
                  {rec.whyRecommended}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* My Vocabulary Tab */}
      {activeTab === 'vocabulary' && (
        <div className="space-y-4">
          {user.vocabulary.length === 0 ? (
            <div className="p-8 rounded-2xl bg-white dark:bg-[#17191E] border border-stone-200 dark:border-zinc-800 text-center space-y-2">
              <p className="text-sm font-medium text-stone-900 dark:text-zinc-100">
                No saved vocabulary words yet
              </p>
              <p className="text-xs text-stone-500 dark:text-zinc-400">
                Tap any word while reading a novel to see its simple meaning and save it here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {user.vocabulary.map((item) => (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl bg-white dark:bg-[#17191E] border border-stone-200 dark:border-zinc-800 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-xl font-semibold text-stone-900 dark:text-zinc-100">
                        {item.word}
                      </h3>
                      <p className="text-xs text-stone-500 dark:text-zinc-400 mt-0.5">
                        {item.difficulty} · from {item.bookTitle}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteWord(item.id)}
                      aria-label={`Remove ${item.word}`}
                      className="p-2 rounded-lg text-stone-400 hover:text-red-600 hover:bg-stone-100 dark:hover:bg-zinc-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-sm text-stone-700 dark:text-zinc-200 leading-relaxed">
                    {item.simpleMeaning}
                  </p>
                  {item.translatedMeaning && (
                    <p className="text-xs text-[#1E3A8A] dark:text-blue-400">
                      {item.translatedLanguage ? `${item.translatedLanguage}: ` : ''}
                      {item.translatedMeaning}
                    </p>
                  )}
                  <p className="text-xs italic text-stone-600 dark:text-zinc-400">
                    &ldquo;{item.example}&rdquo;
                  </p>
                  {item.similarWords.length > 0 && (
                    <p className="text-xs text-stone-500 dark:text-zinc-400">
                      Similar: {item.similarWords.join(', ')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reading Journal Tab */}
      {activeTab === 'journal' && (
        <div className="space-y-4">
          {user.journal.length === 0 ? (
            <div className="p-8 rounded-2xl bg-white dark:bg-[#17191E] border border-stone-200 dark:border-zinc-800 text-center space-y-2">
              <p className="text-sm font-medium text-stone-900 dark:text-zinc-100">
                Your Reading Journal is empty
              </p>
              <p className="text-xs text-stone-500 dark:text-zinc-400">
                After completing any chapter in the Reader, you can jot down your reflections, favorite characters, and quotes.
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-w-3xl">
              {user.journal.map((entry) => (
                <article
                  key={entry.id}
                  className="p-6 rounded-2xl bg-white dark:bg-[#17191E] border border-stone-200 dark:border-zinc-800 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-zinc-400">
                      <Feather className="w-3.5 h-3.5 text-[#1E3A8A] dark:text-blue-400" />
                      <span className="font-medium text-stone-800 dark:text-zinc-200">
                        {entry.bookTitle}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{entry.chapterTitle}</span>
                    </div>
                    <span className="text-xs font-mono tabular-nums text-stone-400">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {entry.thought && (
                    <p className="text-sm text-stone-700 dark:text-zinc-200 leading-relaxed">
                      {entry.thought}
                    </p>
                  )}

                  {entry.favoriteQuote && (
                    <blockquote className="py-2 px-4 rounded-xl bg-stone-50 dark:bg-zinc-900/60 border border-stone-200 dark:border-zinc-800 font-display italic text-sm text-stone-700 dark:text-zinc-300">
                      &ldquo;{entry.favoriteQuote}&rdquo;
                    </blockquote>
                  )}

                  <div className="flex flex-wrap gap-4 text-xs text-stone-500 dark:text-zinc-400 pt-1">
                    {entry.favoriteCharacter && (
                      <span>Favorite character: {entry.favoriteCharacter}</span>
                    )}
                    {entry.feeling && <span>Mood felt: {entry.feeling}</span>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Standard Shelves */}
      {activeTab !== 'recommended' &&
        activeTab !== 'vocabulary' &&
        activeTab !== 'journal' && (
          <div>
            {shelfBooks.length === 0 ? (
              <div className="p-10 rounded-2xl bg-white dark:bg-[#17191E] border border-stone-200 dark:border-zinc-800 text-center space-y-2">
                <BookmarkCheck className="w-6 h-6 mx-auto text-stone-400" />
                <p className="text-sm font-medium text-stone-900 dark:text-zinc-100">
                  No books on this shelf yet
                </p>
                <p className="text-xs text-stone-500 dark:text-zinc-400">
                  Open any book card to add it to this shelf.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {shelfBooks.map((book) => {
                  const prog = user.progress[book.id];
                  return (
                    <div
                      key={book.id}
                      className="p-5 rounded-2xl bg-white dark:bg-[#17191E] border border-stone-200 dark:border-zinc-800 flex flex-col justify-between space-y-4"
                    >
                      <div className="flex gap-4">
                        <button onClick={() => onSelectBook(book)} className="shrink-0">
                          <BookCover book={book} size="sm" className="w-20 h-28" />
                        </button>
                        <div className="min-w-0 flex-1 space-y-1">
                          <button
                            onClick={() => onSelectBook(book)}
                            className="font-display text-lg font-semibold text-stone-900 dark:text-zinc-100 text-left hover:text-[#1E3A8A] dark:hover:text-blue-400"
                          >
                            {book.title}
                          </button>
                          <p className="text-xs text-stone-500 dark:text-zinc-400">{book.author}</p>
                          <p className="text-xs text-stone-500 dark:text-zinc-400 tabular-nums">
                            Difficulty {book.difficulty.overall}/5 · Est.{' '}
                            {formatReadingTime(book.pages, user.stats.avgPagesPerHour)}
                          </p>
                          {prog && (
                            <div className="pt-2 space-y-1">
                              <div className="h-1.5 w-full rounded-full bg-stone-100 dark:bg-zinc-800 overflow-hidden">
                                <div
                                  className="h-full bg-[#1E3A8A] dark:bg-blue-500 rounded-full"
                                  style={{ width: `${prog.percentComplete}%` }}
                                />
                              </div>
                              <p className="text-[11px] font-mono tabular-nums text-stone-500 dark:text-zinc-400">
                                {prog.percentComplete}% read
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-stone-100 dark:border-zinc-800">
                        <button
                          onClick={() => onSelectBook(book)}
                          className="text-xs font-medium text-stone-600 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-white"
                        >
                          Details
                        </button>
                        {!book.metadataOnly && (
                          <button
                            onClick={() => onStartReading(book.id)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1E3A8A] dark:text-blue-400 hover:underline"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            {prog ? 'Continue Reading' : 'Start Reading'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
    </div>
  );
};
