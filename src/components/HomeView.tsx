import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Clock,
  Compass,
  Flame,
  Search,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { QUICK_MOODS } from '../data/catalog.ts';
import { Book, Mood, RecommendedBookResult, UserState } from '../types.ts';
import { api } from '../lib/api.ts';
import { formatReadingTime, getGreeting, UI_LABELS } from '../lib/i18n.ts';
import { computeLocalRecommendations } from '../lib/recommend.ts';
import { BookCover } from './BookCover.tsx';

interface HomeViewProps {
  books: Book[];
  user: UserState;
  onSelectBook: (book: Book, why?: string) => void;
  onStartReading: (bookId: string) => void;
  onOpenStartMode: () => void;
  onOpenTonightsPick: () => void;
  onChangeMaxDifficulty: (val: number) => void;
  onNavigateDiscover: () => void;
}

const EXAMPLE_PROMPTS = [
  'I want a short romantic story with easy English and a bittersweet ending.',
  'I want a beginner-friendly classic under 150 pages.',
  'I want a psychological thriller that is not extremely violent.',
];

export const HomeView: React.FC<HomeViewProps> = ({
  books,
  user,
  onSelectBook,
  onStartReading,
  onOpenStartMode,
  onOpenTonightsPick,
  onChangeMaxDifficulty,
  onNavigateDiscover,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [twentyMinOnly, setTwentyMinOnly] = useState(false);
  const [aiResults, setAiResults] = useState<{
    summaryMessage: string;
    recommendations: RecommendedBookResult[];
  } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const labels = UI_LABELS[user.preferences.appLanguage] || UI_LABELS.English;

  const currentBook = useMemo(() => {
    const id = user.currentBookId || user.library.reading[0];
    return books.find((b) => b.id === id) || books[0];
  }, [books, user]);

  const currentProgress = user.progress[currentBook.id];

  const tenMinutePick = useMemo(() => {
    return (
      books.find((b) => b.id === 'tagore-stories') ||
      books.find((b) => b.beginnerFriendly && b.lengthLabel === 'Short') ||
      books[0]
    );
  }, [books]);

  const displayedRecommendations = useMemo(() => {
    if (aiResults && aiResults.recommendations.length > 0 && !selectedMood && !twentyMinOnly) {
      return aiResults.recommendations;
    }
    return computeLocalRecommendations(books, user, {
      selectedMood,
      twentyMinutesOnly: twentyMinOnly,
      maxDifficulty: user.preferences.maxDifficulty,
      query: searchQuery,
    }).slice(0, 6);
  }, [aiResults, books, user, selectedMood, twentyMinOnly, searchQuery]);

  const runSmartSearch = async (queryText?: string) => {
    const activeQuery = (queryText ?? searchQuery).trim();
    if (queryText !== undefined) setSearchQuery(queryText);

    setAiLoading(true);
    setAiError(null);
    try {
      const data = await api.aiRecommend({
        query: activeQuery || 'Recommend the best next reads for my current profile.',
        mood: selectedMood || undefined,
        timeAvailable: twentyMinOnly ? '20 minutes' : user.preferences.dailyTime,
      });
      setAiResults(data);
    } catch (err: any) {
      setAiError(err.message || 'Smart search failed.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    runSmartSearch();
  };

  return (
    <div className="space-y-12 pb-12">
      {/* Editorial Hero Split */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch pt-2">
        <div className="lg:col-span-7 flex flex-col justify-between space-y-6 py-2">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500 dark:text-zinc-400">
              <span>{getGreeting()}, {user.name}</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 tabular-nums text-stone-700 dark:text-zinc-300 font-medium">
                <Flame className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                {user.stats.streakDays}-day reading streak
              </span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{user.vocabulary.length} words learned</span>
            </div>

            <h1 className="font-display text-3xl sm:text-4xl lg:text-[2.65rem] font-semibold text-stone-900 dark:text-zinc-100 leading-[1.15] tracking-tight max-w-2xl">
              {labels.heroLead}
            </h1>
            <p className="text-[15px] text-stone-600 dark:text-zinc-400 leading-relaxed max-w-xl">
              Describe a mood, length, or kind of story in plain words. Moonlight Pages matches you to the right difficulty—and helps you read every page with confidence.
            </p>
          </div>

          {/* Natural-Language Smart Search */}
          <div className="space-y-3">
            <form onSubmit={handleSubmitSearch} className="relative flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (!e.target.value.trim()) setAiResults(null);
                  }}
                  placeholder={labels.searchPlaceholder}
                  className="w-full h-12 pl-10 pr-4 rounded-xl bg-white dark:bg-[#191C22] border border-stone-200 dark:border-zinc-800 text-sm text-stone-900 dark:text-zinc-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/30 dark:focus:ring-blue-500/40"
                />
              </div>
              <button
                type="submit"
                disabled={aiLoading}
                className="h-12 px-5 rounded-xl bg-[#1E3A8A] text-white text-sm font-medium hover:bg-[#172D6B] disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500 transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
              >
                <Sparkles className="w-4 h-4" />
                {aiLoading ? 'Matching...' : 'Ask Companion'}
              </button>
            </form>

            {/* Quick Smart Search Example Prompts */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-stone-500 dark:text-zinc-400">
              <span>Try:</span>
              {EXAMPLE_PROMPTS.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => runSmartSearch(ex)}
                  className="text-left underline decoration-stone-300 dark:decoration-zinc-700 underline-offset-4 hover:text-[#1E3A8A] dark:hover:text-blue-400 transition-colors"
                >
                  &ldquo;{ex}&rdquo;
                </button>
              ))}
            </div>
          </div>

          {/* Quick Mood Filter Buttons */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-stone-500 dark:text-zinc-400">
                What do you feel like reading?
              </p>
              {selectedMood && (
                <button
                  onClick={() => setSelectedMood(null)}
                  className="text-xs text-[#1E3A8A] dark:text-blue-400 hover:underline"
                >
                  Clear mood
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {QUICK_MOODS.map((m) => {
                const active = selectedMood === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMood(active ? null : (m.id as Mood))}
                    className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-[#1E3A8A] text-white dark:bg-blue-600'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-zinc-800/90 dark:text-zinc-300 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Hero Image */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="relative flex-1 min-h-[240px] lg:min-h-[340px] rounded-2xl overflow-hidden border border-stone-200 dark:border-zinc-800 bg-stone-100 dark:bg-zinc-900">
            <img
              src="/src/assets/images/hero_reading_atelier_1794938600320.jpg"
              alt="Calm sunlit library reading desk with an open hardcover novel"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white">
              <p className="text-xs text-white/80">New to novels?</p>
              <div className="flex items-center justify-between gap-4 mt-1">
                <p className="font-display text-lg font-medium leading-snug">
                  Start Reading Mode builds your 5-step path
                </p>
                <button
                  onClick={onOpenStartMode}
                  className="px-3.5 py-2 rounded-lg bg-white text-stone-900 text-xs font-medium hover:bg-stone-100 transition-colors whitespace-nowrap shrink-0"
                >
                  Start Path
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Search Feedback */}
      {aiError && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-sm text-red-700 dark:text-red-300">
          {aiError}
        </div>
      )}

      {aiResults && (
        <div className="p-4 rounded-xl bg-stone-100/70 dark:bg-zinc-900/70 border border-stone-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-[#1E3A8A] dark:text-blue-400">
              Moonlight Pages Match
            </p>
            <p className="text-sm text-stone-800 dark:text-zinc-200">{aiResults.summaryMessage}</p>
          </div>
          <button
            onClick={() => {
              setAiResults(null);
              setSearchQuery('');
            }}
            className="text-xs text-stone-500 hover:text-stone-900 dark:text-zinc-400 dark:hover:text-white underline"
          >
            Reset search
          </button>
        </div>
      )}

      {/* Continue Reading + Rescue / 10-Min Quick Actions */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 p-6 rounded-2xl bg-white dark:bg-[#17191E] border border-stone-200 dark:border-zinc-800 flex flex-col sm:flex-row gap-6 items-start">
          <BookCover book={currentBook} size="md" className="w-28 sm:w-32 shrink-0" />
          <div className="flex-1 min-w-0 flex flex-col justify-between space-y-4 w-full">
            <div>
              <p className="text-xs font-medium text-[#1E3A8A] dark:text-blue-400">
                {labels.continueReading}
              </p>
              <h2 className="font-display text-2xl font-semibold text-stone-900 dark:text-zinc-100 mt-1">
                {currentBook.title}
              </h2>
              <p className="text-xs text-stone-500 dark:text-zinc-400 mt-1">
                {currentBook.author} · Difficulty {currentBook.difficulty.overall}/5 · Est.{' '}
                {formatReadingTime(currentBook.pages, user.stats.avgPagesPerHour)} total
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-stone-600 dark:text-zinc-400">
                <span>
                  Chapter {(currentProgress?.currentChapterIndex ?? 0) + 1} of{' '}
                  {Math.max(1, currentBook.chapters.length)}
                </span>
                <span className="font-mono tabular-nums">
                  {currentProgress?.percentComplete ?? 0}% complete
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-stone-100 dark:bg-zinc-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#1E3A8A] dark:bg-blue-500 transition-all"
                  style={{ width: `${currentProgress?.percentComplete ?? 0}%` }}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => onStartReading(currentBook.id)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1E3A8A] text-white text-xs font-medium hover:bg-[#172D6B] dark:bg-blue-600 dark:hover:bg-blue-500 transition-colors whitespace-nowrap shrink-0"
              >
                <BookOpen className="w-4 h-4" />
                Resume Reading
              </button>
              <button
                onClick={() => onSelectBook(currentBook)}
                className="px-4 py-2.5 rounded-lg border border-stone-200 dark:border-zinc-700 text-xs font-medium text-stone-700 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0"
              >
                Book DNA &amp; Details
              </button>
            </div>
          </div>
        </div>

        {/* Today's 10-Minute Pick & Gentle Session Restart */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-stone-100/65 dark:bg-[#17191E] border border-stone-200 dark:border-zinc-800 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-stone-500 dark:text-zinc-400">
                {labels.tenMinPick}
              </p>
              <span className="text-xs font-mono tabular-nums text-stone-500 dark:text-zinc-400">
                ~10m session
              </span>
            </div>
            <h3 className="font-display text-xl font-semibold text-stone-900 dark:text-zinc-100">
              {tenMinutePick.title}
            </h3>
            <p className="text-xs text-stone-500 dark:text-zinc-400">
              {tenMinutePick.author} · Difficulty {tenMinutePick.difficulty.overall}/5 · Gentle prose
            </p>
            <p className="text-sm text-stone-600 dark:text-zinc-300 leading-relaxed line-clamp-2">
              {tenMinutePick.shortDescription}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-200/80 dark:border-zinc-800">
            <button
              onClick={() => onStartReading(tenMinutePick.id)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1E3A8A] dark:text-blue-400 hover:underline"
            >
              Read a 10-minute chapter <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onOpenTonightsPick}
              className="text-xs font-medium text-stone-600 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-white"
            >
              Tonight&apos;s Pick →
            </button>
          </div>
        </div>
      </section>

      {/* Recommended For You + "Don't Give Me a Difficult Book" Slider */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-stone-200 dark:border-zinc-800">
          <div>
            <h2 className="font-display text-2xl font-semibold text-stone-900 dark:text-zinc-100">
              {labels.recommendedForYou}
            </h2>
            <p className="text-sm text-stone-500 dark:text-zinc-400 mt-1">
              Curated for your pace ({user.stats.avgPagesPerHour} pages/hr) with transparent explanations.
            </p>
          </div>

          {/* Difficulty Slider & 20-Min Toggle */}
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={() => setTwentyMinOnly((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                twentyMinOnly
                  ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] dark:bg-blue-600 dark:border-blue-600'
                  : 'bg-white dark:bg-[#17191E] text-stone-700 dark:text-zinc-300 border-stone-200 dark:border-zinc-700 hover:bg-stone-50 dark:hover:bg-zinc-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              I have only 20 minutes
            </button>

            <div className="flex items-center gap-3 px-3.5 py-2 rounded-lg bg-white dark:bg-[#17191E] border border-stone-200 dark:border-zinc-800">
              <SlidersHorizontal className="w-3.5 h-3.5 text-stone-500 dark:text-zinc-400 shrink-0" />
              <label
                htmlFor="home-difficulty-slider"
                className="text-xs text-stone-600 dark:text-zinc-300 whitespace-nowrap"
              >
                Max Difficulty: <strong className="font-mono tabular-nums">{user.preferences.maxDifficulty}/5</strong>
              </label>
              <input
                id="home-difficulty-slider"
                type="range"
                min={1}
                max={5}
                step={1}
                value={user.preferences.maxDifficulty}
                onChange={(e) => onChangeMaxDifficulty(Number(e.target.value))}
                className="w-24 accent-[#1E3A8A] dark:accent-blue-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {displayedRecommendations.length === 0 ? (
          <div className="p-8 rounded-2xl border border-stone-200 dark:border-zinc-800 text-center space-y-3">
            <p className="text-sm text-stone-600 dark:text-zinc-400">
              No books match that strict combination right now. Try raising the difficulty slider or clearing the 20-minute filter.
            </p>
            <button
              onClick={() => {
                setSelectedMood(null);
                setTwentyMinOnly(false);
                onChangeMaxDifficulty(5);
              }}
              className="px-4 py-2 rounded-lg bg-stone-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-medium"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedRecommendations.map((rec) => {
              const book = books.find((b) => b.id === rec.bookId);
              if (!book) return null;
              return (
                <article
                  key={book.id}
                  className="group p-5 rounded-2xl bg-white dark:bg-[#17191E] border border-stone-200 dark:border-zinc-800 flex flex-col justify-between space-y-4 hover:border-stone-300 dark:hover:border-zinc-700 transition-colors"
                >
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => onSelectBook(book, rec.whyRecommended)}
                      className="shrink-0 focus:outline-none"
                    >
                      <BookCover book={book} size="sm" className="w-20 h-28" />
                    </button>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <button
                        type="button"
                        onClick={() => onSelectBook(book, rec.whyRecommended)}
                        className="text-left block w-full"
                      >
                        <h3 className="font-display text-lg font-semibold text-stone-900 dark:text-zinc-100 group-hover:text-[#1E3A8A] dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                          {book.title}
                        </h3>
                      </button>
                      <p className="text-xs text-stone-500 dark:text-zinc-400 truncate">
                        {book.author}
                      </p>
                      <p className="text-xs text-stone-500 dark:text-zinc-400 tabular-nums">
                        Difficulty {book.difficulty.overall}/5 · {book.pages}p · {rec.readingTimeEstimate}
                      </p>
                      <p className="text-xs text-stone-500 dark:text-zinc-400 truncate">
                        {book.genres.slice(0, 2).join(' · ')}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-stone-100 dark:border-zinc-800/80 space-y-3">
                    <div>
                      <p className="text-[11px] font-semibold text-[#1E3A8A] dark:text-blue-400 mb-0.5">
                        {labels.whyRecommended}
                      </p>
                      <p className="text-xs text-stone-600 dark:text-zinc-300 leading-relaxed line-clamp-3">
                        {rec.whyRecommended}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => onSelectBook(book, rec.whyRecommended)}
                        className="text-xs font-medium text-stone-600 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-white"
                      >
                        Book DNA &amp; Summary
                      </button>
                      {!book.metadataOnly && (
                        <button
                          onClick={() => onStartReading(book.id)}
                          className="text-xs font-semibold text-[#1E3A8A] dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                        >
                          Read <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Your Reading Journey Strip */}
      <section className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#17191E] border border-stone-200 dark:border-zinc-800 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold text-stone-900 dark:text-zinc-100">
              {labels.yourJourney}
            </h2>
            <p className="text-sm text-stone-500 dark:text-zinc-400 mt-1">
              Gradually build literary fluency—from gentle short stories to ambitious masterworks.
            </p>
          </div>
          <button
            onClick={onNavigateDiscover}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1E3A8A] dark:text-blue-400 hover:underline whitespace-nowrap shrink-0"
          >
            <Compass className="w-4 h-4" />
            Customize Reading Path
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {user.journey.map((stage) => {
            const book = books.find((b) => b.id === stage.bookId);
            const isCurrent = stage.status === 'current';
            const isDone = stage.status === 'completed';
            return (
              <div
                key={stage.level}
                className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 ${
                  isCurrent
                    ? 'border-[#1E3A8A] bg-blue-50/40 dark:border-blue-500/70 dark:bg-blue-950/20'
                    : 'border-stone-200 dark:border-zinc-800 bg-stone-50/60 dark:bg-zinc-900/40'
                }`}
              >
                <div className="space-y-1">
                  <p className="text-[11px] font-mono tabular-nums text-stone-500 dark:text-zinc-400">
                    Level {stage.level} · {isDone ? 'Completed' : isCurrent ? 'Current' : 'Next'}
                  </p>
                  <h3 className="text-sm font-semibold text-stone-900 dark:text-zinc-100 leading-snug">
                    {stage.label.replace(/^Level \d+ — /, '')}
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-zinc-400 leading-relaxed">
                    {stage.description}
                  </p>
                </div>

                {book && (
                  <button
                    onClick={() => onSelectBook(book)}
                    className="text-left pt-2 border-t border-stone-200/80 dark:border-zinc-800 group"
                  >
                    <p className="text-xs font-medium text-[#1E3A8A] dark:text-blue-400 group-hover:underline truncate">
                      {book.title}
                    </p>
                    <p className="text-[11px] text-stone-500 dark:text-zinc-400 truncate">
                      {book.author}
                    </p>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
