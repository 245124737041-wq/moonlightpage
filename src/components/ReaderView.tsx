import React, { useEffect, useMemo, useState } from 'react';
import {
  Bookmark,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Highlighter,
  MessageSquare,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { Book, ReaderSettings, SpoilerLevel, UserState } from '../types.ts';
import { api } from '../lib/api.ts';

interface ReaderViewProps {
  books: Book[];
  user: UserState;
  activeBookId: string;
  onSelectBookId: (bookId: string) => void;
  onUserUpdated: (user: UserState) => void;
}

interface WordLookupResult {
  word: string;
  simpleMeaning: string;
  example: string;
  similarWords: string[];
  difficulty: 'Easy' | 'Medium' | 'Hard';
  simpleEnglishSentence: string;
  translatedMeaning: string;
}

export const ReaderView: React.FC<ReaderViewProps> = ({
  books,
  user,
  activeBookId,
  onSelectBookId,
  onUserUpdated,
}) => {
  const readableBooks = useMemo(
    () => books.filter((b) => !b.metadataOnly && b.chapters.length > 0),
    [books]
  );

  const book = useMemo(
    () =>
      readableBooks.find((b) => b.id === activeBookId) ||
      readableBooks[0],
    [readableBooks, activeBookId]
  );

  const bookProgress = user.progress[book.id];
  const [chapterIdx, setChapterIdx] = useState<number>(
    Math.min(bookProgress?.currentChapterIndex ?? 0, Math.max(0, book.chapters.length - 1))
  );

  useEffect(() => {
    const saved = user.progress[book.id]?.currentChapterIndex ?? 0;
    setChapterIdx(Math.min(saved, Math.max(0, book.chapters.length - 1)));
  }, [book.id, book.chapters.length]);

  const chapter = book.chapters[chapterIdx] || book.chapters[0];

  // Distraction-free reading controls
  const [showSettings, setShowSettings] = useState(false);
  const [showAssistant, setShowAssistant] = useState(false);

  // Word lookup drawer
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [wordLookup, setWordLookup] = useState<WordLookupResult | null>(null);
  const [wordLookupError, setWordLookupError] = useState<string | null>(null);
  const [wordLoading, setWordLoading] = useState(false);
  const [wordSaved, setWordSaved] = useState(false);

  // AI Assistant state
  const [spoilerLevel, setSpoilerLevel] = useState<SpoilerLevel>('no_spoilers');
  const [selectedParagraph, setSelectedParagraph] = useState<string>('');
  const [assistantQuestion, setAssistantQuestion] = useState('');
  const [assistantChat, setAssistantChat] = useState<
    { role: 'user' | 'assistant'; text: string; spoilerLevel?: SpoilerLevel }[]
  >([]);
  const [assistantLoading, setAssistantLoading] = useState(false);

  // Chapter Reflection Journal Modal & Difficulty Progression Prompt
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [completedChapterTitle, setCompletedChapterTitle] = useState('');
  const [journalThought, setJournalThought] = useState('');
  const [journalCharacter, setJournalCharacter] = useState('');
  const [journalQuote, setJournalQuote] = useState('');
  const [journalFeeling, setJournalFeeling] = useState('');
  const [levelUpBanner, setLevelUpBanner] = useState<string | null>(null);

  const settings = user.readerSettings;

  // Reading session timer (increments reading time gently every 60s while viewing Reader)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await api.updateProgress({
          bookId: book.id,
          currentChapterIndex: chapterIdx,
          minutesDelta: 1,
          pagesDelta: 1,
        });
        onUserUpdated(res.user);
      } catch {
        // silent background tick
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [book.id, chapterIdx]);

  const updateReaderSettings = async (patch: Partial<ReaderSettings>) => {
    const res = await api.updatePreferences({
      readerSettings: { ...settings, ...patch },
    });
    onUserUpdated(res.user);
  };

  const handleTapWord = async (rawToken: string, paragraphText: string) => {
    const cleaned = rawToken.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '');
    if (!cleaned || cleaned.length < 2) return;

    setSelectedWord(cleaned);
    setWordLookup(null);
    setWordLookupError(null);
    setWordSaved(false);
    setWordLoading(true);
    try {
      const data = await api.aiExplainWord({
        word: cleaned,
        sentenceContext: paragraphText,
        bookTitle: book.title,
        language: user.preferences.appLanguage,
      });
      setWordLookup(data);
    } catch (err: any) {
      setWordLookupError(
        err.message || 'Could not reach the dictionary service right now. Please try again.'
      );
    } finally {
      setWordLoading(false);
    }
  };

  const handleSaveVocabulary = async () => {
    if (!wordLookup || wordLookupError) return;
    try {
      const res = await api.saveVocabulary({
        ...wordLookup,
        translatedLanguage: user.preferences.appLanguage,
        bookTitle: book.title,
      });
      onUserUpdated(res.user);
      setWordSaved(true);
    } catch {
      // ignore duplicate or transient save error
    }
  };

  const handleAskAssistant = async (questionText: string, paragraphOverride?: string) => {
    const q = questionText.trim();
    if (!q) return;
    setShowAssistant(true);
    setAssistantChat((prev) => [...prev, { role: 'user', text: q, spoilerLevel }]);
    setAssistantQuestion('');
    setAssistantLoading(true);
    try {
      const res = await api.aiAssistant({
        bookId: book.id,
        currentChapterIndex: chapterIdx,
        selectedParagraph: paragraphOverride ?? (selectedParagraph || undefined),
        question: q,
        spoilerLevel,
        language: user.preferences.appLanguage,
      });
      setAssistantChat((prev) => [
        ...prev,
        { role: 'assistant', text: res.answer, spoilerLevel },
      ]);
    } catch (err: any) {
      setAssistantChat((prev) => [
        ...prev,
        { role: 'assistant', text: err.message || 'Unable to answer right now.' },
      ]);
    } finally {
      setAssistantLoading(false);
    }
  };

  const handleCompleteChapter = async () => {
    const finishedTitle = chapter.title;
    const nextIdx = Math.min(book.chapters.length - 1, chapterIdx + 1);
    const isLast = chapterIdx >= book.chapters.length - 1;
    const pct = isLast
      ? 100
      : Math.round(((chapterIdx + 1) / book.chapters.length) * 100);
    const estPagesInChapter = Math.max(8, Math.round(book.pages / book.chapters.length));

    const res = await api.updateProgress({
      bookId: book.id,
      currentChapterIndex: nextIdx,
      percentComplete: pct,
      minutesDelta: chapter.estimatedMinutes,
      pagesDelta: estPagesInChapter,
      chapterCompleted: true,
      bookCompleted: isLast,
    });
    onUserUpdated(res.user);
    if (res.levelUpSuggestion) {
      setLevelUpBanner(res.levelUpSuggestion);
    }
    setCompletedChapterTitle(finishedTitle);
    setShowJournalModal(true);
    if (!isLast) {
      setChapterIdx(nextIdx);
    }
  };

  const handleSaveJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.saveJournal({
      bookId: book.id,
      bookTitle: book.title,
      chapterTitle: completedChapterTitle || chapter.title,
      thought: journalThought,
      favoriteCharacter: journalCharacter,
      favoriteQuote: journalQuote,
      feeling: journalFeeling,
    });
    onUserUpdated(res.user);
    setJournalThought('');
    setJournalCharacter('');
    setJournalQuote('');
    setJournalFeeling('');
    setShowJournalModal(false);
  };

  const isBookmarked = (bookProgress?.bookmarks || []).includes(chapterIdx);
  const highlightedTexts = new Set(
    (bookProgress?.highlights || [])
      .filter((h) => h.chapterIndex === chapterIdx)
      .map((h) => h.text)
  );

  // Reader paper theme styling
  const paperThemeClasses =
    settings.theme === 'dark'
      ? 'bg-[#121418] text-[#E4E6EB] border-zinc-800'
      : settings.theme === 'sepia'
      ? 'bg-[#F5EFE4] text-[#2A231B] border-[#E3D8C5]'
      : 'bg-[#FFFFFF] text-[#1C1917] border-stone-200';

  const lineHeightClass =
    settings.lineSpacing === 'normal'
      ? 'leading-relaxed'
      : settings.lineSpacing === 'loose'
      ? 'leading-[2.05]'
      : 'leading-[1.82]';

  const fontFamilyClass =
    settings.fontFamily === 'serif' ? 'font-serif' : 'font-sans';

  return (
    <div className="space-y-6 pb-16">
      {/* Level-Up Difficulty Progression Banner */}
      {levelUpBanner && (
        <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-[#1E3A8A]/30 dark:border-blue-500/40 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-stone-800 dark:text-zinc-200">{levelUpBanner}</p>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                const res = await api.updatePreferences({
                  preferences: { ...user.preferences, maxDifficulty: 3, languageDifficulty: 'Medium' },
                });
                onUserUpdated(res.user);
                setLevelUpBanner(null);
              }}
              className="px-3.5 py-1.5 rounded-lg bg-[#1E3A8A] text-white text-xs font-medium dark:bg-blue-600"
            >
              Try Level 3
            </button>
            <button
              onClick={() => setLevelUpBanner(null)}
              className="px-3.5 py-1.5 rounded-lg border border-stone-200 dark:border-zinc-700 text-xs text-stone-600 dark:text-zinc-300"
            >
              Stay Here
            </button>
          </div>
        </div>
      )}

      {/* Compact Reader Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-stone-200 dark:border-zinc-800">
        <div className="flex items-center gap-3 min-w-0">
          <select
            aria-label="Switch reading book"
            value={book.id}
            onChange={(e) => onSelectBookId(e.target.value)}
            className="h-10 px-3 rounded-lg bg-white dark:bg-[#17191E] border border-stone-200 dark:border-zinc-800 text-xs sm:text-sm font-medium max-w-[230px] truncate"
          >
            {readableBooks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
              </option>
            ))}
          </select>
          <span className="hidden sm:inline text-xs text-stone-500 dark:text-zinc-400">
            Tap any word for instant meaning
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              const res = await api.updateProgress({
                bookId: book.id,
                toggleBookmarkChapter: chapterIdx,
              });
              onUserUpdated(res.user);
            }}
            aria-label="Toggle chapter bookmark"
            className={`min-h-[40px] px-3 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
              isBookmarked
                ? 'border-[#1E3A8A] text-[#1E3A8A] bg-blue-50/60 dark:border-blue-400 dark:text-blue-300 dark:bg-blue-950/30'
                : 'border-stone-200 dark:border-zinc-800 text-stone-600 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
            <span className="hidden sm:inline">{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
          </button>

          <button
            onClick={() => setShowSettings((v) => !v)}
            aria-label="Typography settings"
            className="min-h-[40px] px-3 rounded-lg border border-stone-200 dark:border-zinc-800 text-xs font-medium text-stone-600 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-800 inline-flex items-center gap-1.5"
          >
            <Settings2 className="w-4 h-4" />
            <span className="hidden sm:inline">Display</span>
          </button>

          <button
            onClick={() => setShowAssistant((v) => !v)}
            className={`min-h-[40px] px-3.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
              showAssistant
                ? 'bg-[#1E3A8A] text-white dark:bg-blue-600'
                : 'border border-stone-200 dark:border-zinc-800 text-stone-700 dark:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-800'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>AI Companion</span>
          </button>
        </div>
      </div>

      {/* Typography & Theme Controls Popover */}
      {showSettings && (
        <div className="p-4 rounded-xl bg-white dark:bg-[#17191E] border border-stone-200 dark:border-zinc-800 grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
          <div className="space-y-1.5">
            <p className="text-stone-500 dark:text-zinc-400 font-medium">Paper Theme</p>
            <div className="flex gap-1.5">
              {(['light', 'sepia', 'dark'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => updateReaderSettings({ theme: t })}
                  className={`flex-1 py-1.5 rounded-md capitalize border ${
                    settings.theme === t
                      ? 'border-[#1E3A8A] font-semibold text-[#1E3A8A] dark:border-blue-400 dark:text-blue-300'
                      : 'border-stone-200 dark:border-zinc-700'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-stone-500 dark:text-zinc-400 font-medium">
              Font Size ({settings.fontSize}px)
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateReaderSettings({ fontSize: Math.max(15, settings.fontSize - 1) })}
                className="px-3 py-1.5 rounded-md border border-stone-200 dark:border-zinc-700"
              >
                A-
              </button>
              <button
                onClick={() => updateReaderSettings({ fontSize: Math.min(24, settings.fontSize + 1) })}
                className="px-3 py-1.5 rounded-md border border-stone-200 dark:border-zinc-700"
              >
                A+
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-stone-500 dark:text-zinc-400 font-medium">Handwriting &amp; Style</p>
            <div className="flex gap-1.5">
              {(
                [
                  { id: 'serif', label: 'Old School' },
                  { id: 'sans', label: 'Modern' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  onClick={() => updateReaderSettings({ fontFamily: f.id })}
                  className={`flex-1 py-1.5 rounded-md border ${
                    settings.fontFamily === f.id
                      ? 'border-[#1E3A8A] font-semibold text-[#1E3A8A] dark:border-blue-400 dark:text-blue-300'
                      : 'border-stone-200 dark:border-zinc-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-stone-500 dark:text-zinc-400 font-medium">Line Spacing</p>
            <div className="flex gap-1.5">
              {(['normal', 'relaxed', 'loose'] as const).map((ls) => (
                <button
                  key={ls}
                  onClick={() => updateReaderSettings({ lineSpacing: ls })}
                  className={`flex-1 py-1.5 rounded-md capitalize border ${
                    settings.lineSpacing === ls
                      ? 'border-[#1E3A8A] font-semibold text-[#1E3A8A] dark:border-blue-400 dark:text-blue-300'
                      : 'border-stone-200 dark:border-zinc-700'
                  }`}
                >
                  {ls}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Layout: Distraction-Free Reading Column + Optional Side AI Assistant */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className={showAssistant ? 'lg:col-span-7' : 'lg:col-span-12'}>
          <article
            className={`max-w-2xl mx-auto p-6 sm:p-10 rounded-2xl border transition-colors ${paperThemeClasses}`}
          >
            {/* Chapter Header */}
            <header className="pb-6 mb-6 border-b border-current/10 space-y-2">
              <div className="flex items-center justify-between text-xs opacity-65">
                <span>
                  {book.title} · Chapter {chapter.number} of {book.chapters.length}
                </span>
                <span className="font-mono tabular-nums">~{chapter.estimatedMinutes}m read</span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-semibold leading-snug">
                {chapter.title}
              </h1>
            </header>

            {/* Interactive Tap-Any-Word Prose */}
            <div
              style={{ fontSize: `${settings.fontSize}px` }}
              className={`space-y-6 ${fontFamilyClass} ${lineHeightClass}`}
            >
              {chapter.paragraphs.map((para, pIdx) => {
                const isHighlighted = highlightedTexts.has(para);
                const tokens = para.split(/(\s+)/);
                return (
                  <div key={pIdx} className="group relative">
                    <p
                      className={`rounded-lg transition-colors ${
                        isHighlighted
                          ? 'bg-amber-200/45 dark:bg-amber-500/20 px-2 py-1 -mx-2'
                          : ''
                      }`}
                    >
                      {tokens.map((tok, tIdx) => {
                        if (/^\s+$/.test(tok)) return tok;
                        return (
                          <span
                            key={tIdx}
                            onClick={() => handleTapWord(tok, para)}
                            className="cursor-pointer hover:bg-[#1E3A8A]/12 dark:hover:bg-blue-400/20 rounded-xs transition-colors"
                          >
                            {tok}
                          </span>
                        );
                      })}
                    </p>

                    {/* Subtle per-paragraph hover actions */}
                    <div className="mt-1.5 flex items-center gap-3 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-xs font-sans">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedParagraph(para);
                          handleAskAssistant('Explain this paragraph in simple English.', para);
                        }}
                        className="inline-flex items-center gap-1 text-[#1E3A8A] dark:text-blue-400 hover:underline"
                      >
                        <Sparkles className="w-3 h-3" />
                        Explain paragraph
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const res = await api.updateProgress({
                            bookId: book.id,
                            addHighlight: { chapterIndex: chapterIdx, text: para },
                          });
                          onUserUpdated(res.user);
                        }}
                        className="inline-flex items-center gap-1 opacity-75 hover:opacity-100"
                      >
                        <Highlighter className="w-3 h-3" />
                        Highlight
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Chapter Footer Navigation */}
            <footer className="mt-10 pt-6 border-t border-current/10 flex flex-wrap items-center justify-between gap-4 font-sans">
              <button
                onClick={() => setChapterIdx((i) => Math.max(0, i - 1))}
                disabled={chapterIdx === 0}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-current/15 text-xs font-medium disabled:opacity-35"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              <button
                onClick={handleCompleteChapter}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#1E3A8A] text-white text-xs font-medium hover:bg-[#172D6B] dark:bg-blue-600"
              >
                <CheckCircle2 className="w-4 h-4" />
                {chapterIdx >= book.chapters.length - 1
                  ? 'Finish Book & Reflect'
                  : 'Complete Chapter & Continue'}
              </button>

              <button
                onClick={() =>
                  setChapterIdx((i) => Math.min(book.chapters.length - 1, i + 1))
                }
                disabled={chapterIdx >= book.chapters.length - 1}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-current/15 text-xs font-medium disabled:opacity-35"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </footer>
          </article>
        </div>

        {/* AI Reading Companion Drawer / Column */}
        {showAssistant && (
          <aside className="lg:col-span-5 rounded-2xl bg-white dark:bg-[#17191E] border border-stone-200 dark:border-zinc-800 p-5 space-y-4 lg:sticky lg:top-20">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-zinc-100">
                  AI Reading Assistant
                </h2>
                <p className="text-xs text-stone-500 dark:text-zinc-400">
                  Anchored to Chapter {chapter.number} ({book.title})
                </p>
              </div>
              <button
                onClick={() => setShowAssistant(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 dark:hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 3-Level Spoiler Protection */}
            <div className="p-3 rounded-xl bg-stone-50 dark:bg-zinc-900/60 border border-stone-200 dark:border-zinc-800 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-stone-700 dark:text-zinc-300">
                <ShieldCheck className="w-4 h-4 text-[#1E3A8A] dark:text-blue-400" />
                Spoiler Protection
              </div>
              <div className="grid grid-cols-3 gap-1">
                {(
                  [
                    { id: 'no_spoilers', label: 'No Spoilers' },
                    { id: 'mild_spoilers', label: 'Mild' },
                    { id: 'full_explanation', label: 'Full' },
                  ] as { id: SpoilerLevel; label: string }[]
                ).map((lvl) => (
                  <button
                    key={lvl.id}
                    onClick={() => setSpoilerLevel(lvl.id)}
                    className={`py-1.5 rounded-md text-xs font-medium transition-colors ${
                      spoilerLevel === lvl.id
                        ? 'bg-[#1E3A8A] text-white dark:bg-blue-600'
                        : 'text-stone-600 dark:text-zinc-400 hover:bg-stone-200/70 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {lvl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Reader Questions */}
            <div className="flex flex-wrap gap-1.5">
              {[
                'Explain this chapter in simple English',
                'Who are the main characters so far?',
                'What happened in the previous chapter?',
                'Why did the main character behave like this?',
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => handleAskAssistant(q)}
                  className="px-2.5 py-1.5 rounded-lg bg-stone-100 dark:bg-zinc-800 text-xs text-stone-700 dark:text-zinc-300 hover:bg-stone-200 dark:hover:bg-zinc-700 text-left"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Conversation History */}
            <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
              {assistantChat.length === 0 && (
                <p className="text-xs text-stone-500 dark:text-zinc-400 leading-relaxed">
                  Ask anything about a character, motif, or difficult sentence. In{' '}
                  <strong>No Spoilers</strong> mode, Moonlight Pages strictly avoids revealing events beyond Chapter {chapter.number}.
                </p>
              )}
              {assistantChat.map((msg, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-xl text-xs leading-relaxed whitespace-pre-line ${
                    msg.role === 'user'
                      ? 'bg-[#1E3A8A] text-white ml-6 dark:bg-blue-600'
                      : 'bg-stone-100 dark:bg-zinc-900 text-stone-800 dark:text-zinc-200 mr-4'
                  }`}
                >
                  {msg.text}
                </div>
              ))}
              {assistantLoading && (
                <p className="text-xs text-stone-500 dark:text-zinc-400">Thinking carefully...</p>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAskAssistant(assistantQuestion);
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={assistantQuestion}
                onChange={(e) => setAssistantQuestion(e.target.value)}
                placeholder="Ask about this chapter..."
                className="flex-1 h-10 px-3 rounded-lg bg-stone-50 dark:bg-zinc-900 border border-stone-200 dark:border-zinc-700 text-xs"
              />
              <button
                type="submit"
                disabled={assistantLoading}
                aria-label="Send question"
                className="px-3.5 h-10 rounded-lg bg-[#1E3A8A] text-white dark:bg-blue-600 flex items-center justify-center"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </aside>
        )}
      </div>

      {/* Tap-Any-Word Vocabulary Popover / Bottom Sheet */}
      {selectedWord && (
        <div className="fixed inset-x-0 bottom-16 md:bottom-6 z-40 flex justify-center px-4 pointer-events-none">
          <div className="w-full max-w-lg bg-[#FCFCFA] dark:bg-[#17191E] border border-stone-200 dark:border-zinc-700 rounded-2xl shadow-xl p-5 space-y-3 pointer-events-auto">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium text-[#1E3A8A] dark:text-blue-400">
                  Vocabulary Learning Mode
                </p>
                <h3 className="font-display text-xl font-semibold text-stone-900 dark:text-zinc-100">
                  {wordLookup?.word || selectedWord}
                </h3>
              </div>
              <button
                onClick={() => setSelectedWord(null)}
                className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 dark:hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {wordLoading ? (
              <p className="text-xs text-stone-500 dark:text-zinc-400">
                Looking up simple definition and example...
              </p>
            ) : wordLookupError ? (
              <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed">
                {wordLookupError}
              </p>
            ) : (
              wordLookup && (
                <div className="space-y-2.5 text-xs">
                  <p className="text-sm text-stone-800 dark:text-zinc-100">
                    <span className="font-semibold">Simple meaning:</span> {wordLookup.simpleMeaning}
                  </p>
                  {wordLookup.translatedMeaning && (
                    <p className="text-xs text-[#1E3A8A] dark:text-blue-300">
                      <span className="font-semibold">{user.preferences.appLanguage} note:</span>{' '}
                      {wordLookup.translatedMeaning}
                    </p>
                  )}
                  {wordLookup.example && (
                    <p className="text-stone-600 dark:text-zinc-300">
                      <span className="font-semibold">Example:</span> &ldquo;{wordLookup.example}&rdquo;
                    </p>
                  )}
                  {wordLookup.simpleEnglishSentence && (
                    <p className="text-stone-500 dark:text-zinc-400">
                      <span className="font-semibold">Simple English sentence:</span>{' '}
                      {wordLookup.simpleEnglishSentence}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-200 dark:border-zinc-800">
                    <span className="text-stone-500 dark:text-zinc-400">
                      Similar: {wordLookup.similarWords.join(', ')} · {wordLookup.difficulty}
                    </span>
                    <button
                      onClick={handleSaveVocabulary}
                      disabled={wordSaved}
                      className="px-3.5 py-2 rounded-lg bg-[#1E3A8A] text-white font-medium disabled:opacity-60 dark:bg-blue-600"
                    >
                      {wordSaved ? 'Saved to My Vocabulary' : 'Save to My Vocabulary'}
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* Optional Post-Chapter Reading Journal Modal */}
      {showJournalModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleSaveJournal}
            className="w-full max-w-lg bg-[#FCFCFA] dark:bg-[#17191E] border border-stone-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4 shadow-xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-[#1E3A8A] dark:text-blue-400">
                  Chapter Complete · Reading Journal
                </p>
                <h3 className="font-display text-xl font-semibold text-stone-900 dark:text-zinc-100 mt-0.5">
                  Save a quiet reflection?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowJournalModal(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 dark:hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-600 dark:text-zinc-400 mb-1">
                  What did you think about this chapter?
                </label>
                <textarea
                  rows={2}
                  value={journalThought}
                  onChange={(e) => setJournalThought(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-700 text-sm"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-600 dark:text-zinc-400 mb-1">
                    Which character stood out?
                  </label>
                  <input
                    type="text"
                    value={journalCharacter}
                    onChange={(e) => setJournalCharacter(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-700 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 dark:text-zinc-400 mb-1">
                    How did it make you feel?
                  </label>
                  <input
                    type="text"
                    value={journalFeeling}
                    onChange={(e) => setJournalFeeling(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-700 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-stone-600 dark:text-zinc-400 mb-1">
                  Favorite quote (optional)
                </label>
                <input
                  type="text"
                  value={journalQuote}
                  onChange={(e) => setJournalQuote(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-700 text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowJournalModal(false)}
                className="px-4 py-2 rounded-lg border border-stone-200 dark:border-zinc-700 text-xs font-medium"
              >
                Skip for now
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[#1E3A8A] text-white text-xs font-medium dark:bg-blue-600"
              >
                Save to Journal
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
