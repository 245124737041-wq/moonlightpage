import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  Compass,
  Globe,
  Scale,
  Search,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { ALL_GENRES } from '../data/catalog.ts';
import {
  AuthorProfile,
  Book,
  DailyReadingTime,
  Genre,
  LanguageDifficulty,
  ReadingExperience,
  UserState,
} from '../types.ts';
import { api } from '../lib/api.ts';
import { computeLocalRecommendations } from '../lib/recommend.ts';
import { BookCover } from './BookCover.tsx';

interface DiscoverViewProps {
  books: Book[];
  authors: AuthorProfile[];
  user: UserState;
  initialSubTab?: DiscoverTab;
  initialCompareBookId?: string | null;
  onSelectBook: (book: Book, why?: string) => void;
  onStartReading: (bookId: string) => void;
  onUserUpdated: (user: UserState) => void;
}

export type DiscoverTab = 'genres' | 'start_mode' | 'authors' | 'personality' | 'compare';

const PERSONALITY_QUESTIONS = [
  {
    q: 'Would you rather read about:',
    a: 'A mysterious murder',
    b: 'A complicated relationship',
  },
  {
    q: 'Do you prefer:',
    a: 'Fast action and plot twists',
    b: 'Deep conversations and inner thoughts',
  },
  {
    q: 'Do you prefer:',
    a: 'Happy or hopeful endings',
    b: 'Bittersweet or haunting endings',
  },
  {
    q: 'Which setting draws you in faster?',
    a: 'A foggy Victorian city street',
    b: 'A quiet sunlit countryside village',
  },
  {
    q: 'What kind of protagonist fascinates you?',
    a: 'A sharp-witted observer solving puzzles',
    b: 'A sensitive dreamer searching for meaning',
  },
  {
    q: 'When picking a book length:',
    a: 'Short stories I can finish in one evening',
    b: 'A multi-week world I can sink into',
  },
  {
    q: 'Which theme moves you most?',
    a: 'Justice, conscience, and human choices',
    b: 'Love, forgiveness, and memory',
  },
  {
    q: 'How should the prose feel?',
    a: 'Crisp, clear, and conversational',
    b: 'Poetic, atmospheric, and reflective',
  },
  {
    q: 'What keeps you turning pages at midnight?',
    a: 'Uncovering a hidden secret',
    b: 'Seeing whether two people truly understand each other',
  },
  {
    q: 'Pick a weekend companion:',
    a: 'A clever comedy of manners',
    b: 'A philosophical journey across unfamiliar places',
  },
];

export const DiscoverView: React.FC<DiscoverViewProps> = ({
  books,
  authors,
  user,
  initialSubTab = 'genres',
  initialCompareBookId,
  onSelectBook,
  onStartReading,
  onUserUpdated,
}) => {
  const [tab, setTab] = useState<DiscoverTab>(initialSubTab);

  useEffect(() => {
    setTab(initialSubTab);
  }, [initialSubTab]);

  // Multi-Genre & Public Domain Search state
  const [selectedGenres, setSelectedGenres] = useState<Genre[]>(user.preferences.genres);
  const [maxDiff, setMaxDiff] = useState<number>(user.preferences.maxDifficulty);
  const [gutenbergQuery, setGutenbergQuery] = useState('');
  const [gutenbergResults, setGutenbergResults] = useState<
    { gutenbergId: number; title: string; author: string; subjects: string[]; readUrl: string }[]
  >([]);
  const [gutenbergLoading, setGutenbergLoading] = useState(false);

  // Start Reading Mode wizard
  const [experience, setExperience] = useState<ReadingExperience>(user.preferences.experience);
  const [wizardGenres, setWizardGenres] = useState<Genre[]>(user.preferences.genres);
  const [langDifficulty, setLangDifficulty] = useState<LanguageDifficulty>(
    user.preferences.languageDifficulty
  );
  const [dailyTime, setDailyTime] = useState<DailyReadingTime>(user.preferences.dailyTime);
  const [journeySaving, setJourneySaving] = useState(false);
  const [journeySavedMsg, setJourneySavedMsg] = useState<string | null>(null);

  // Author Discovery
  const [selectedAuthorId, setSelectedAuthorId] = useState<string>(authors[0]?.id || 'dostoevsky');
  const [customAuthorName, setCustomAuthorName] = useState('');
  const [aiAuthorGuide, setAiAuthorGuide] = useState<{
    authorName: string;
    overview: string;
    recommendedStartingBook: string;
    whyStartHere: string;
    commonVocabularyTip: string;
    steps: { stepNumber: number; title: string; guidance: string }[];
    similarAuthorsChain: { name: string; reason: string }[];
  } | null>(null);
  const [authorLoading, setAuthorLoading] = useState(false);
  const [authorError, setAuthorError] = useState<string | null>(null);

  // Personality Quiz
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [personalityResult, setPersonalityResult] = useState<{
    personalityTitle: string;
    description: string;
    readingTraits: string[];
    matchedBookIds: string[];
    whyItFits: string;
  } | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);

  // Comparison & Because You Liked
  const [compareBookA, setCompareBookA] = useState<string>(
    initialCompareBookId || 'white-nights'
  );

  useEffect(() => {
    if (initialCompareBookId) {
      setCompareBookA(initialCompareBookId);
    }
  }, [initialCompareBookId]);
  const [compareBookB, setCompareBookB] = useState<string>('tagore-stories');
  const [likedBookId, setLikedBookId] = useState<string>('alchemist');

  const multiGenreResults = useMemo(
    () =>
      computeLocalRecommendations(books, user, {
        selectedGenres,
        maxDifficulty: maxDiff,
      }),
    [books, user, selectedGenres, maxDiff]
  );

  const toggleGenre = (genre: Genre) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const handleGutenbergSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gutenbergQuery.trim()) return;
    setGutenbergLoading(true);
    try {
      const res = await api.searchGutenberg(gutenbergQuery);
      setGutenbergResults(res.results);
    } catch {
      setGutenbergResults([]);
    } finally {
      setGutenbergLoading(false);
    }
  };

  const handleCreateJourney = async () => {
    setJourneySaving(true);
    setJourneySavedMsg(null);
    try {
      const res = await api.buildJourney({
        experience,
        preferredGenres: wizardGenres,
        languageDifficulty: langDifficulty,
        dailyTime,
      });
      onUserUpdated(res.user);
      setJourneySavedMsg(
        'Your personal 5-level Reading Journey has been tailored and saved to your Home & Profile.'
      );
    } finally {
      setJourneySaving(false);
    }
  };

  const selectedAuthor = authors.find((a) => a.id === selectedAuthorId) || authors[0];

  const handleGenerateAuthorPath = async (name: string) => {
    setAuthorLoading(true);
    setAuthorError(null);
    try {
      const data = await api.aiAuthorPath({
        authorName: name,
        experience: user.preferences.experience,
      });
      setAiAuthorGuide(data);
    } catch (err: any) {
      setAuthorError(err.message || 'Could not generate author reading path.');
    } finally {
      setAuthorLoading(false);
    }
  };

  const handleEvaluatePersonality = async () => {
    const formatted = PERSONALITY_QUESTIONS.map((item, idx) => ({
      question: item.q,
      choice: quizAnswers[idx] || item.a,
    }));
    setQuizLoading(true);
    setQuizError(null);
    try {
      const result = await api.aiPersonality(formatted);
      setPersonalityResult(result);
      const me = await api.getMe();
      onUserUpdated(me.user);
    } catch (err: any) {
      setQuizError(err.message || 'Could not analyze reading personality.');
    } finally {
      setQuizLoading(false);
    }
  };

  const bookA = books.find((b) => b.id === compareBookA) || books[0];
  const bookB = books.find((b) => b.id === compareBookB) || books[1];
  const likedBook = books.find((b) => b.id === likedBookId) || books[0];

  return (
    <div className="space-y-8 pb-12">
      {/* Header + Segmented Navigation */}
      <div className="space-y-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-stone-900 dark:text-zinc-100">
            Discover Your Next Story
          </h1>
          <p className="text-sm text-stone-500 dark:text-zinc-400 mt-1">
            Combine genres, build a beginner roadmap, explore authors, or compare novels side by side.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-stone-100 dark:bg-zinc-900 rounded-xl overflow-x-auto no-scrollbar">
          {(
            [
              { id: 'genres', label: 'Genre & Catalog' },
              { id: 'start_mode', label: 'Start Reading Mode' },
              { id: 'authors', label: 'Choose by Author' },
              { id: 'personality', label: 'Book Personality' },
              { id: 'compare', label: 'Compare & Chains' },
            ] as { id: DiscoverTab; label: string }[]
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                tab === item.id
                  ? 'bg-white dark:bg-zinc-800 text-stone-900 dark:text-white shadow-xs'
                  : 'text-stone-600 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: Multi-Genre Matcher & Open Public Domain Search */}
      {tab === 'genres' && (
        <div className="space-y-8">
          <div className="p-6 rounded-2xl bg-white dark:bg-[#17191E] border border-stone-200 dark:border-zinc-800 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-zinc-100">
                  Combine Multiple Genres
                </h2>
                <p className="text-xs text-stone-500 dark:text-zinc-400">
                  Select multiple genres (for example: Romance + Mystery + Comedy) to blend your match.
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-stone-600 dark:text-zinc-400">
                  Max Difficulty: <strong className="font-mono tabular-nums">{maxDiff}/5</strong>
                </span>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={maxDiff}
                  onChange={(e) => setMaxDiff(Number(e.target.value))}
                  className="w-28 accent-[#1E3A8A] dark:accent-blue-500"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {ALL_GENRES.map((g) => {
                const active = selectedGenres.includes(g as Genre);
                return (
                  <button
                    key={g}
                    onClick={() => toggleGenre(g as Genre)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-[#1E3A8A] text-white dark:bg-blue-600'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {multiGenreResults.map((rec) => {
              const book = books.find((b) => b.id === rec.bookId);
              if (!book) return null;
              return (
                <article
                  key={book.id}
                  className="p-5 rounded-2xl bg-white dark:bg-[#17191E] border border-stone-200 dark:border-zinc-800 flex flex-col justify-between space-y-4"
                >
                  <div className="flex gap-4">
                    <button onClick={() => onSelectBook(book, rec.whyRecommended)} className="shrink-0">
                      <BookCover book={book} size="sm" className="w-20 h-28" />
                    </button>
                    <div className="min-w-0 space-y-1">
                      <button
                        onClick={() => onSelectBook(book, rec.whyRecommended)}
                        className="text-left font-display text-lg font-semibold text-stone-900 dark:text-zinc-100 hover:text-[#1E3A8A] dark:hover:text-blue-400"
                      >
                        {book.title}
                      </button>
                      <p className="text-xs text-stone-500 dark:text-zinc-400">{book.author}</p>
                      <p className="text-xs text-stone-500 dark:text-zinc-400 tabular-nums">
                        Match {rec.matchScore}% · Diff {book.difficulty.overall}/5 · {rec.readingTimeEstimate}
                      </p>
                      <p className="text-xs text-stone-500 dark:text-zinc-400">
                        {book.genres.slice(0, 3).join(' · ')}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-stone-600 dark:text-zinc-300 leading-relaxed">
                    {rec.whyRecommended}
                  </p>
                  <div className="flex items-center justify-between pt-2 border-t border-stone-100 dark:border-zinc-800">
                    <button
                      onClick={() => onSelectBook(book, rec.whyRecommended)}
                      className="text-xs font-medium text-stone-600 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-white"
                    >
                      View Details
                    </button>
                    {!book.metadataOnly && (
                      <button
                        onClick={() => onStartReading(book.id)}
                        className="text-xs font-semibold text-[#1E3A8A] dark:text-blue-400 hover:underline"
                      >
                        Read Now →
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          {/* Legal Public Domain Library Search via Project Gutenberg / Gutendex */}
          <div className="p-6 rounded-2xl bg-stone-100/70 dark:bg-[#17191E] border border-stone-200 dark:border-zinc-800 space-y-4">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#1E3A8A] dark:text-blue-400" />
              <h3 className="font-display text-lg font-semibold text-stone-900 dark:text-zinc-100">
                Explore Legal Public-Domain Classics (Project Gutenberg)
              </h3>
            </div>
            <form onSubmit={handleGutenbergSearch} className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={gutenbergQuery}
                  onChange={(e) => setGutenbergQuery(e.target.value)}
                  placeholder="Search open public-domain books (e.g. Jane Eyre, Little Women, Tolstoy)..."
                  className="w-full h-10 pl-9 pr-3 rounded-lg bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-700 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={gutenbergLoading}
                className="px-4 h-10 rounded-lg bg-stone-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-medium whitespace-nowrap shrink-0"
              >
                {gutenbergLoading ? 'Searching...' : 'Search Public Archive'}
              </button>
            </form>
            {gutenbergResults.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                {gutenbergResults.map((item) => (
                  <div
                    key={item.gutenbergId}
                    className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 space-y-1.5"
                  >
                    <p className="text-sm font-medium text-stone-900 dark:text-zinc-100 line-clamp-1">
                      {item.title}
                    </p>
                    <p className="text-xs text-stone-500 dark:text-zinc-400 truncate">
                      {item.author}
                    </p>
                    <p className="text-[11px] text-[#1E3A8A] dark:text-blue-400">
                      Gutenberg #{item.gutenbergId} · Public Domain
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Beginner Reader "Start Reading" Mode */}
      {tab === 'start_mode' && (
        <div className="max-w-3xl space-y-8">
          <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#17191E] border border-stone-200 dark:border-zinc-800 space-y-6">
            <div>
              <p className="text-xs font-medium text-[#1E3A8A] dark:text-blue-400">
                Start Reading Mode
              </p>
              <h2 className="font-display text-2xl font-semibold text-stone-900 dark:text-zinc-100 mt-1">
                Build Your Personal Reading Path
              </h2>
              <p className="text-sm text-stone-500 dark:text-zinc-400 mt-1">
                Answer four gentle questions and Moonlight Pages will sequence 5 progressive levels tailored to your pace.
              </p>
            </div>

            {/* Step 1 */}
            <div className="space-y-2.5">
              <p className="text-sm font-medium text-stone-900 dark:text-zinc-100">
                1. Have you read novels before?
              </p>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { id: 'never', label: 'Never' },
                    { id: 'very_little', label: 'Very little' },
                    { id: 'occasionally', label: 'Occasionally' },
                    { id: 'regular', label: 'Regular reader' },
                    { id: 'advanced', label: 'Advanced reader' },
                  ] as { id: ReadingExperience; label: string }[]
                ).map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setExperience(opt.id)}
                    className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                      experience === opt.id
                        ? 'bg-[#1E3A8A] text-white dark:bg-blue-600'
                        : 'bg-stone-100 text-stone-700 dark:bg-zinc-800 dark:text-zinc-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2 */}
            <div className="space-y-2.5">
              <p className="text-sm font-medium text-stone-900 dark:text-zinc-100">
                2. What type of stories interest you?
              </p>
              <div className="flex flex-wrap gap-2">
                {ALL_GENRES.slice(0, 10).map((g) => {
                  const active = wizardGenres.includes(g as Genre);
                  return (
                    <button
                      key={g}
                      onClick={() =>
                        setWizardGenres((prev) =>
                          prev.includes(g as Genre)
                            ? prev.filter((x) => x !== g)
                            : [...prev, g as Genre]
                        )
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        active
                          ? 'bg-stone-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                          : 'bg-stone-100 text-stone-700 dark:bg-zinc-800 dark:text-zinc-300'
                      }`}
                    >
                      {g}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 3 */}
            <div className="space-y-2.5">
              <p className="text-sm font-medium text-stone-900 dark:text-zinc-100">
                3. How difficult should the language be?
              </p>
              <div className="flex flex-wrap gap-2">
                {(['Very Easy', 'Easy', 'Medium', 'Difficult', 'Advanced'] as LanguageDifficulty[]).map(
                  (lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setLangDifficulty(lvl)}
                      className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                        langDifficulty === lvl
                          ? 'bg-[#1E3A8A] text-white dark:bg-blue-600'
                          : 'bg-stone-100 text-stone-700 dark:bg-zinc-800 dark:text-zinc-300'
                      }`}
                    >
                      {lvl}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Step 4 */}
            <div className="space-y-2.5">
              <p className="text-sm font-medium text-stone-900 dark:text-zinc-100">
                4. How much time can you read every day?
              </p>
              <div className="flex flex-wrap gap-2">
                {(
                  ['10 minutes', '20 minutes', '30 minutes', '1 hour', 'More than 1 hour'] as DailyReadingTime[]
                ).map((t) => (
                  <button
                    key={t}
                    onClick={() => setDailyTime(t)}
                    className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                      dailyTime === t
                        ? 'bg-[#1E3A8A] text-white dark:bg-blue-600'
                        : 'bg-stone-100 text-stone-700 dark:bg-zinc-800 dark:text-zinc-300'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleCreateJourney}
              disabled={journeySaving}
              className="px-5 py-3 rounded-xl bg-[#1E3A8A] text-white text-sm font-medium hover:bg-[#172D6B] dark:bg-blue-600 dark:hover:bg-blue-500 transition-colors inline-flex items-center gap-2"
            >
              <Compass className="w-4 h-4" />
              {journeySaving ? 'Generating Reading Path...' : 'Create My Reading Journey'}
            </button>

            {journeySavedMsg && (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-sm text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                {journeySavedMsg}
              </div>
            )}
          </div>

          {/* Current 5-Level Roadmap with Skip/Revisit controls */}
          <div className="space-y-3">
            <h3 className="font-display text-xl font-semibold text-stone-900 dark:text-zinc-100">
              Your 5-Level Progression
            </h3>
            <div className="space-y-3">
              {user.journey.map((stage) => {
                const book = books.find((b) => b.id === stage.bookId);
                return (
                  <div
                    key={stage.level}
                    className="p-4 rounded-xl bg-white dark:bg-[#17191E] border border-stone-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <p className="text-xs font-mono text-stone-500 dark:text-zinc-400">
                        {stage.label} · Status: {stage.status}
                      </p>
                      {book && (
                        <button
                          onClick={() => onSelectBook(book)}
                          className="font-display text-lg font-medium text-stone-900 dark:text-zinc-100 hover:text-[#1E3A8A] dark:hover:text-blue-400"
                        >
                          {book.title} — {book.author}
                        </button>
                      )}
                      <p className="text-xs text-stone-500 dark:text-zinc-400">{stage.description}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={async () => {
                          const res = await api.updateJourneyStage(
                            stage.level,
                            stage.status === 'skipped' ? 'current' : 'skipped'
                          );
                          onUserUpdated(res.user);
                        }}
                        className="px-3 py-1.5 rounded-lg border border-stone-200 dark:border-zinc-700 text-xs text-stone-600 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-800"
                      >
                        {stage.status === 'skipped' ? 'Restore' : 'Skip Level'}
                      </button>
                      {book && !book.metadataOnly && (
                        <button
                          onClick={() => onStartReading(book.id)}
                          className="px-3.5 py-1.5 rounded-lg bg-[#1E3A8A] text-white text-xs font-medium dark:bg-blue-600"
                        >
                          Read
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Author Discovery & "Start With This Author" */}
      {tab === 'authors' && (
        <div className="space-y-8">
          <div className="flex flex-wrap items-center gap-2">
            {authors.map((a) => (
              <button
                key={a.id}
                onClick={() => {
                  setSelectedAuthorId(a.id);
                  setAiAuthorGuide(null);
                }}
                className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  selectedAuthorId === a.id
                    ? 'bg-[#1E3A8A] text-white dark:bg-blue-600'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                }`}
              >
                {a.name}
              </button>
            ))}
          </div>

          {/* Ask AI for ANY author path */}
          <div className="p-4 rounded-xl bg-stone-100/70 dark:bg-zinc-900/70 border border-stone-200 dark:border-zinc-800 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <input
              type="text"
              value={customAuthorName}
              onChange={(e) => setCustomAuthorName(e.target.value)}
              placeholder="Ask about any author (e.g. 'I want to read Shakespeare or Agatha Christie as a beginner')..."
              className="flex-1 h-10 px-3.5 rounded-lg bg-white dark:bg-zinc-950 border border-stone-200 dark:border-zinc-800 text-sm"
            />
            <button
              onClick={() => handleGenerateAuthorPath(customAuthorName || selectedAuthor.name)}
              disabled={authorLoading}
              className="px-4 h-10 rounded-lg bg-[#1E3A8A] text-white text-xs font-medium dark:bg-blue-600 inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {authorLoading ? 'Building Guide...' : 'Where Should I Start?'}
            </button>
          </div>

          {authorError && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-sm text-red-700 dark:text-red-300">
              {authorError}
            </div>
          )}

          {aiAuthorGuide ? (
            <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#17191E] border border-stone-200 dark:border-zinc-800 space-y-6">
              <div>
                <p className="text-xs font-medium text-[#1E3A8A] dark:text-blue-400">
                  Personalized Author Path
                </p>
                <h2 className="font-display text-2xl font-semibold text-stone-900 dark:text-zinc-100 mt-1">
                  Start With {aiAuthorGuide.authorName}
                </h2>
                <p className="text-sm text-stone-600 dark:text-zinc-300 mt-2 leading-relaxed">
                  {aiAuthorGuide.overview}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-stone-50 dark:bg-zinc-900/60 border border-stone-200 dark:border-zinc-800 space-y-1">
                <p className="text-xs font-semibold text-[#1E3A8A] dark:text-blue-400">
                  Recommended Starting Book: {aiAuthorGuide.recommendedStartingBook}
                </p>
                <p className="text-sm text-stone-700 dark:text-zinc-300">{aiAuthorGuide.whyStartHere}</p>
                <p className="text-xs text-stone-500 dark:text-zinc-400 pt-1">
                  Vocabulary tip: {aiAuthorGuide.commonVocabularyTip}
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-display text-lg font-medium text-stone-900 dark:text-zinc-100">
                  5-Step Progression
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  {aiAuthorGuide.steps.map((s) => (
                    <div
                      key={s.stepNumber}
                      className="p-3.5 rounded-xl border border-stone-200 dark:border-zinc-800 space-y-1"
                    >
                      <p className="text-[11px] font-mono text-stone-500 dark:text-zinc-400">
                        Step {s.stepNumber}
                      </p>
                      <p className="text-sm font-semibold text-stone-900 dark:text-zinc-100">
                        {s.title}
                      </p>
                      <p className="text-xs text-stone-600 dark:text-zinc-400 leading-relaxed">
                        {s.guidance}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-stone-900 dark:text-zinc-100">
                  Similar Authors Chain
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {aiAuthorGuide.similarAuthorsChain.map((sa) => (
                    <div
                      key={sa.name}
                      className="p-3 rounded-xl bg-stone-50 dark:bg-zinc-900/50 border border-stone-200 dark:border-zinc-800"
                    >
                      <p className="text-sm font-medium text-stone-900 dark:text-zinc-100">
                        {sa.name}
                      </p>
                      <p className="text-xs text-stone-600 dark:text-zinc-400 mt-0.5">{sa.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            selectedAuthor && (
              <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#17191E] border border-stone-200 dark:border-zinc-800 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-xs text-stone-500 dark:text-zinc-400">
                      {selectedAuthor.nationality} · {selectedAuthor.lifespan}
                    </p>
                    <h2 className="font-display text-2xl sm:text-3xl font-semibold text-stone-900 dark:text-zinc-100 mt-1">
                      {selectedAuthor.name}
                    </h2>
                  </div>
                  <button
                    onClick={() => handleGenerateAuthorPath(selectedAuthor.name)}
                    disabled={authorLoading}
                    className="px-4 py-2.5 rounded-lg bg-[#1E3A8A] text-white text-xs font-medium dark:bg-blue-600 whitespace-nowrap shrink-0"
                  >
                    {authorLoading ? 'Personalizing...' : 'Personalize Starting Plan'}
                  </button>
                </div>

                <p className="text-sm text-stone-700 dark:text-zinc-300 leading-relaxed">
                  {selectedAuthor.biography}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-stone-500 dark:text-zinc-400">
                      Writing Style
                    </p>
                    <p className="text-stone-700 dark:text-zinc-300 leading-relaxed">
                      {selectedAuthor.writingStyle}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-stone-500 dark:text-zinc-400">
                      Where Should I Start?
                    </p>
                    <p className="text-stone-700 dark:text-zinc-300 leading-relaxed">
                      {selectedAuthor.recommendedStartingNote}
                    </p>
                    <button
                      onClick={() => {
                        const starter = books.find(
                          (b) => b.id === selectedAuthor.recommendedStartingBookId
                        );
                        if (starter) onSelectBook(starter, selectedAuthor.recommendedStartingNote);
                      }}
                      className="text-xs font-semibold text-[#1E3A8A] dark:text-blue-400 hover:underline pt-1 inline-flex items-center gap-1"
                    >
                      Inspect starting book <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-stone-200 dark:border-zinc-800">
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-stone-900 dark:text-zinc-100">
                      Suggested Reading Order
                    </h3>
                    <div className="space-y-2">
                      {selectedAuthor.readingOrder.map((step) => (
                        <div
                          key={step.title}
                          className="p-3 rounded-xl bg-stone-50 dark:bg-zinc-900/50 border border-stone-200 dark:border-zinc-800"
                        >
                          <p className="text-[11px] font-mono text-stone-500 dark:text-zinc-400">
                            {step.level}
                          </p>
                          <p className="text-sm font-medium text-stone-900 dark:text-zinc-100">
                            {step.title}
                          </p>
                          <p className="text-xs text-stone-600 dark:text-zinc-400">{step.note}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-stone-900 dark:text-zinc-100">
                      Similar Authors Progression
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-zinc-400">
                      {selectedAuthor.name} →{' '}
                      {selectedAuthor.similarAuthors.map((s) => s.name).join(' → ')}
                    </p>
                    <div className="space-y-2">
                      {selectedAuthor.similarAuthors.map((sim) => (
                        <div
                          key={sim.name}
                          className="p-3 rounded-xl bg-stone-50 dark:bg-zinc-900/50 border border-stone-200 dark:border-zinc-800"
                        >
                          <p className="text-sm font-medium text-stone-900 dark:text-zinc-100">
                            {sim.name}
                          </p>
                          <p className="text-xs text-stone-600 dark:text-zinc-400">{sim.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* TAB 4: Book Personality Quiz */}
      {tab === 'personality' && (
        <div className="max-w-3xl space-y-6">
          <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#17191E] border border-stone-200 dark:border-zinc-800 space-y-6">
            <div>
              <p className="text-xs font-medium text-[#1E3A8A] dark:text-blue-400">
                10-Question Literary Portrait
              </p>
              <h2 className="font-display text-2xl font-semibold text-stone-900 dark:text-zinc-100 mt-1">
                Find My Book Personality
              </h2>
            </div>

            <div className="space-y-5">
              {PERSONALITY_QUESTIONS.map((item, idx) => (
                <div
                  key={idx}
                  className="pb-4 border-b border-stone-100 dark:border-zinc-800 last:border-none space-y-2.5"
                >
                  <p className="text-sm font-medium text-stone-900 dark:text-zinc-100">
                    {idx + 1}. {item.q}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[item.a, item.b].map((opt) => {
                      const active = (quizAnswers[idx] || '') === opt;
                      return (
                        <button
                          key={opt}
                          onClick={() => setQuizAnswers((prev) => ({ ...prev, [idx]: opt }))}
                          className={`p-3 rounded-xl text-left text-xs font-medium border transition-colors ${
                            active
                              ? 'border-[#1E3A8A] bg-blue-50/50 text-[#1E3A8A] dark:border-blue-500 dark:bg-blue-950/30 dark:text-blue-300'
                              : 'border-stone-200 dark:border-zinc-800 text-stone-700 dark:text-zinc-300 hover:bg-stone-50 dark:hover:bg-zinc-900'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleEvaluatePersonality}
              disabled={quizLoading}
              className="px-5 py-3 rounded-xl bg-[#1E3A8A] text-white text-sm font-medium hover:bg-[#172D6B] dark:bg-blue-600 inline-flex items-center gap-2"
            >
              <UserCheck className="w-4 h-4" />
              {quizLoading ? 'Revealing Your Personality...' : 'Reveal My Book Personality'}
            </button>

            {quizError && (
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-sm text-red-700 dark:text-red-300">
                {quizError}
              </div>
            )}
          </div>

          {(personalityResult || user.preferences.personalityTitle) && (
            <div className="p-6 sm:p-8 rounded-2xl bg-stone-50 dark:bg-[#17191E] border border-[#1E3A8A]/30 dark:border-blue-500/40 space-y-4">
              <p className="text-xs font-medium text-[#1E3A8A] dark:text-blue-400">
                Your Reading Personality
              </p>
              <h3 className="font-display text-2xl font-semibold text-stone-900 dark:text-zinc-100">
                {personalityResult?.personalityTitle || user.preferences.personalityTitle}
              </h3>
              <p className="text-sm text-stone-700 dark:text-zinc-300 leading-relaxed">
                {personalityResult?.description || user.preferences.personalityDescription}
              </p>
              {personalityResult?.whyItFits && (
                <p className="text-xs text-stone-600 dark:text-zinc-400 leading-relaxed">
                  {personalityResult.whyItFits}
                </p>
              )}
              {personalityResult?.matchedBookIds && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  {personalityResult.matchedBookIds.map((bid) => {
                    const b = books.find((x) => x.id === bid);
                    if (!b) return null;
                    return (
                      <button
                        key={b.id}
                        onClick={() => onSelectBook(b, personalityResult.whyItFits)}
                        className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 text-left space-y-2"
                      >
                        <p className="font-display text-sm font-semibold text-stone-900 dark:text-zinc-100">
                          {b.title}
                        </p>
                        <p className="text-xs text-stone-500 dark:text-zinc-400">{b.author}</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: Novel Comparison & "Because You Liked..." */}
      {tab === 'compare' && (
        <div className="space-y-10">
          {/* Novel Comparison Table */}
          <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#17191E] border border-stone-200 dark:border-zinc-800 space-y-6">
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-[#1E3A8A] dark:text-blue-400" />
              <h2 className="font-display text-2xl font-semibold text-stone-900 dark:text-zinc-100">
                Novel Comparison
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <select
                value={compareBookA}
                onChange={(e) => setCompareBookA(e.target.value)}
                className="h-11 px-3.5 rounded-lg bg-stone-50 dark:bg-zinc-900 border border-stone-200 dark:border-zinc-700 text-sm"
              >
                {books.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title} — {b.author}
                  </option>
                ))}
              </select>
              <select
                value={compareBookB}
                onChange={(e) => setCompareBookB(e.target.value)}
                className="h-11 px-3.5 rounded-lg bg-stone-50 dark:bg-zinc-900 border border-stone-200 dark:border-zinc-700 text-sm"
              >
                {books.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title} — {b.author}
                  </option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-stone-200 dark:border-zinc-800 text-left">
                    <th className="py-3 pr-4 text-xs font-medium text-stone-500 dark:text-zinc-400">
                      Feature
                    </th>
                    <th className="py-3 px-4 font-display text-base font-semibold text-stone-900 dark:text-zinc-100">
                      {bookA.title}
                    </th>
                    <th className="py-3 pl-4 font-display text-base font-semibold text-stone-900 dark:text-zinc-100">
                      {bookB.title}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-zinc-800/80">
                  <tr>
                    <td className="py-3 pr-4 text-stone-500 dark:text-zinc-400">Difficulty</td>
                    <td className="py-3 px-4 tabular-nums font-medium">{bookA.difficulty.overall}/5</td>
                    <td className="py-3 pl-4 tabular-nums font-medium">{bookB.difficulty.overall}/5</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 text-stone-500 dark:text-zinc-400">Length</td>
                    <td className="py-3 px-4 tabular-nums">
                      {bookA.lengthLabel} ({bookA.pages} pages)
                    </td>
                    <td className="py-3 pl-4 tabular-nums">
                      {bookB.lengthLabel} ({bookB.pages} pages)
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 text-stone-500 dark:text-zinc-400">Romance</td>
                    <td className="py-3 px-4">{bookA.romanceLevel}</td>
                    <td className="py-3 pl-4">{bookB.romanceLevel}</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 text-stone-500 dark:text-zinc-400">Philosophy</td>
                    <td className="py-3 px-4 tabular-nums">{bookA.dna.philosophy}%</td>
                    <td className="py-3 pl-4 tabular-nums">{bookB.dna.philosophy}%</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 text-stone-500 dark:text-zinc-400">Vocabulary</td>
                    <td className="py-3 px-4 tabular-nums">{bookA.difficulty.vocabulary}/5</td>
                    <td className="py-3 pl-4 tabular-nums">{bookB.difficulty.vocabulary}/5</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 text-stone-500 dark:text-zinc-400">Beginner friendly</td>
                    <td className="py-3 px-4">{bookA.beginnerFriendly ? 'Yes' : 'Recommended after Level 3'}</td>
                    <td className="py-3 pl-4">{bookB.beginnerFriendly ? 'Yes' : 'Recommended after Level 3'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Because You Liked... */}
          <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#17191E] border border-stone-200 dark:border-zinc-800 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-semibold text-stone-900 dark:text-zinc-100">
                  Because You Liked…
                </h2>
                <p className="text-xs text-stone-500 dark:text-zinc-400 mt-1">
                  Explore curated literary bridges from a favorite title.
                </p>
              </div>
              <select
                value={likedBookId}
                onChange={(e) => setLikedBookId(e.target.value)}
                className="h-10 px-3.5 rounded-lg bg-stone-50 dark:bg-zinc-900 border border-stone-200 dark:border-zinc-700 text-sm"
              >
                {books
                  .filter((b) => (b.becauseYouLikedIds?.length || 0) > 0)
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title}
                    </option>
                  ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(likedBook.becauseYouLikedIds || []).map((link) => {
                const target = books.find((b) => b.id === link.bookId);
                if (!target) return null;
                return (
                  <button
                    key={target.id}
                    onClick={() => onSelectBook(target, link.reason)}
                    className="p-4 rounded-xl bg-stone-50 dark:bg-zinc-900/50 border border-stone-200 dark:border-zinc-800 text-left space-y-2 hover:border-[#1E3A8A]/50 transition-colors"
                  >
                    <p className="font-display text-base font-semibold text-stone-900 dark:text-zinc-100">
                      {target.title}
                    </p>
                    <p className="text-xs text-stone-500 dark:text-zinc-400">{target.author}</p>
                    <p className="text-xs text-stone-600 dark:text-zinc-300 leading-relaxed">
                      {link.reason}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
