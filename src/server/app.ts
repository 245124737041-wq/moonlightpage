import 'dotenv/config';
import express from 'express';
import { BOOKS_CATALOG } from '../data/catalog.ts';
import { AUTHOR_PROFILES } from '../data/authors.ts';
import {
  getUserFromToken,
  loginAccount,
  logoutToken,
  registerAccount,
  updateUserState,
} from './store.ts';
import {
  assistReadingWithAI,
  evaluatePersonalityWithAI,
  explainWordWithAI,
  formatGeminiError,
  generateAuthorPathWithAI,
  recommendBooksWithAI,
} from './ai.ts';
import { JourneyStage, ShelfStatus } from '../types.ts';

export const app = express();

app.use(express.json({ limit: '1mb' }));

function extractToken(req: express.Request): string | undefined {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    return auth.slice(7).trim();
  }
  return undefined;
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, runtime: process.env.VERCEL ? 'vercel' : 'node' });
});

// Catalog & Authors
app.get('/api/catalog', (_req, res) => {
  res.json({ books: BOOKS_CATALOG, authors: AUTHOR_PROFILES });
});

// Legal Public-Domain Search via Gutendex API (Project Gutenberg open catalog)
app.get('/api/discover/gutenberg', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) {
      return res.json({ results: [] });
    }
    const url = `https://gutendex.com/books/?search=${encodeURIComponent(q)}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!response.ok) {
      return res.status(502).json({ error: 'Public domain catalog temporarily unavailable.' });
    }
    const data = await response.json();
    const results = (data.results || []).slice(0, 6).map((item: any) => ({
      gutenbergId: item.id,
      title: item.title,
      author: item.authors?.[0]?.name || 'Unknown Author',
      subjects: (item.subjects || []).slice(0, 3),
      downloadCount: item.download_count || 0,
      readUrl:
        item.formats?.['text/html'] ||
        item.formats?.['text/plain; charset=utf-8'] ||
        `https://www.gutenberg.org/ebooks/${item.id}`,
    }));
    res.json({ results });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Search failed' });
  }
});

// Auth routes
app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!email || !password || String(password).length < 4) {
      return res.status(400).json({ error: 'Please enter a valid email and a password of at least 4 characters.' });
    }
    const result = registerAccount(String(name || 'Reader'), String(email), String(password));
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Registration failed' });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const result = loginAccount(String(email), String(password));
    res.json(result);
  } catch (error: any) {
    res.status(401).json({ error: error.message || 'Login failed' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  logoutToken(extractToken(req));
  res.json({ ok: true });
});

// User State
app.get('/api/me', (req, res) => {
  const user = getUserFromToken(extractToken(req));
  res.json({ user });
});

app.patch('/api/me/preferences', (req, res) => {
  const token = extractToken(req);
  const { name, preferences, privacy, readerSettings } = req.body || {};
  const isObj = (v: unknown): v is Record<string, unknown> =>
    typeof v === 'object' && v !== null && !Array.isArray(v);
  const user = updateUserState(token, (state) => ({
    ...state,
    name: typeof name === 'string' && name.trim() ? name.trim() : state.name,
    preferences: isObj(preferences)
      ? { ...state.preferences, ...preferences }
      : state.preferences,
    privacy: isObj(privacy) ? { ...state.privacy, ...privacy } : state.privacy,
    readerSettings: isObj(readerSettings)
      ? { ...state.readerSettings, ...readerSettings }
      : state.readerSettings,
  }));
  res.json({ user });
});

// Build or update personalized 5-level Reading Journey
app.post('/api/me/journey', (req, res) => {
  const token = extractToken(req);
  const { experience, preferredGenres, languageDifficulty, dailyTime } = req.body || {};
  const user = updateUserState(token, (state) => {
    const genres = Array.isArray(preferredGenres) && preferredGenres.length > 0
      ? preferredGenres
      : state.preferences.genres;

    const pickForLevel = (level: 1 | 2 | 3 | 4 | 5, fallbackId: string) => {
      const candidates = BOOKS_CATALOG.filter((b) => b.journeyLevel === level);
      const matched = candidates.find((b) => b.genres.some((g) => genres.includes(g)));
      return matched?.id || candidates[0]?.id || fallbackId;
    };

    const startLevel: number =
      experience === 'never' || experience === 'very_little'
        ? 1
        : experience === 'occasionally'
        ? 2
        : experience === 'regular'
        ? 3
        : languageDifficulty === 'Advanced'
        ? 5
        : 4;

    const journey: JourneyStage[] = [
      {
        level: 1,
        label: 'Level 1 — Short & Gentle Stories',
        description: 'Warm, clear prose under 70 pages to build confidence.',
        bookId: pickForLevel(1, 'tagore-stories'),
        status: startLevel > 1 ? 'completed' : 'current',
      },
      {
        level: 2,
        label: 'Level 2 — Easy Engaging Novels',
        description: 'Page-turning plots with accessible everyday vocabulary.',
        bookId: pickForLevel(2, 'study-in-scarlet'),
        status: startLevel === 2 ? 'current' : startLevel > 2 ? 'completed' : 'upcoming',
      },
      {
        level: 3,
        label: 'Level 3 — Accessible Classics',
        description: 'Emotional depth and richer style in compact length.',
        bookId: pickForLevel(3, 'white-nights'),
        status: startLevel === 3 ? 'current' : startLevel > 3 ? 'completed' : 'upcoming',
      },
      {
        level: 4,
        label: 'Level 4 — Layered Literature',
        description: 'Nuanced ideas, classic elegance, and deeper themes.',
        bookId: pickForLevel(4, 'dorian-gray'),
        status: startLevel === 4 ? 'current' : startLevel > 4 ? 'completed' : 'upcoming',
      },
      {
        level: 5,
        label: 'Level 5 — Masterworks',
        description: 'Ambitious literary epics approached with ease.',
        bookId: pickForLevel(5, 'crime-and-punishment'),
        status: startLevel === 5 ? 'current' : 'upcoming',
      },
    ];

    const maxDiffMap: Record<string, number> = {
      'Very Easy': 1,
      Easy: 2,
      Medium: 3,
      Difficult: 4,
      Advanced: 5,
    };

    return {
      ...state,
      preferences: {
        ...state.preferences,
        experience: experience || state.preferences.experience,
        genres,
        languageDifficulty: languageDifficulty || state.preferences.languageDifficulty,
        maxDifficulty: maxDiffMap[languageDifficulty] || state.preferences.maxDifficulty,
        dailyTime: dailyTime || state.preferences.dailyTime,
      },
      journey,
    };
  });
  res.json({ user });
});

app.patch('/api/me/journey/stage', (req, res) => {
  const token = extractToken(req);
  const { level, status } = req.body || {};
  const validStatuses = ['completed', 'current', 'upcoming', 'skipped'];
  if (typeof level !== 'number' || !validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid journey level or status.' });
  }
  const user = updateUserState(token, (state) => ({
    ...state,
    journey: state.journey.map((stage) =>
      stage.level === level ? { ...stage, status } : stage
    ),
  }));
  res.json({ user });
});

// Library Shelf management
app.post('/api/me/library', (req, res) => {
  const token = extractToken(req);
  const { bookId, shelf, action } = req.body as {
    bookId?: string;
    shelf?: ShelfStatus;
    action?: 'add' | 'remove';
  };
  const validShelves: ShelfStatus[] = ['reading', 'want_to_read', 'completed', 'abandoned', 'favorites'];
  if (
    typeof bookId !== 'string' ||
    !bookId ||
    !shelf ||
    !validShelves.includes(shelf) ||
    (action !== 'add' && action !== 'remove')
  ) {
    return res.status(400).json({ error: 'Invalid library shelf update request.' });
  }

  const user = updateUserState(token, (state) => {
    const nextLibrary = { ...state.library };
    if (shelf === 'favorites') {
      const list = new Set(nextLibrary.favorites);
      if (action === 'add') list.add(bookId);
      else list.delete(bookId);
      nextLibrary.favorites = Array.from(list);
    } else {
      const mutuallyExclusive: ShelfStatus[] = ['reading', 'want_to_read', 'completed', 'abandoned'];
      for (const s of mutuallyExclusive) {
        nextLibrary[s] = nextLibrary[s].filter((id) => id !== bookId);
      }
      if (action === 'add') {
        nextLibrary[shelf] = [bookId, ...nextLibrary[shelf]];
      }
    }
    return {
      ...state,
      library: nextLibrary,
      currentBookId: shelf === 'reading' && action === 'add' ? bookId : state.currentBookId,
    };
  });
  res.json({ user });
});

// Reading progress & session tracking
app.post('/api/me/progress', (req, res) => {
  const token = extractToken(req);
  const {
    bookId,
    currentChapterIndex,
    percentComplete,
    minutesDelta = 0,
    pagesDelta = 0,
    chapterCompleted = false,
    bookCompleted = false,
    toggleBookmarkChapter,
    addHighlight,
    rating,
  } = req.body || {};

  const book = BOOKS_CATALOG.find((b) => b.id === bookId);
  if (!book) {
    return res.status(404).json({ error: 'Book not found.' });
  }

  const safeMinutes = Number.isFinite(Number(minutesDelta)) ? Math.max(0, Number(minutesDelta)) : 0;
  const safePages = Number.isFinite(Number(pagesDelta)) ? Math.max(0, Number(pagesDelta)) : 0;

  let levelUpSuggestion: string | null = null;

  const user = updateUserState(token, (state) => {
    const prev = state.progress[bookId] || {
      bookId,
      currentChapterIndex: 0,
      currentPage: 1,
      percentComplete: 0,
      minutesRead: 0,
      bookmarks: [],
      highlights: [],
      lastReadAt: new Date().toISOString(),
    };

    const nextBookmarks = [...prev.bookmarks];
    if (typeof toggleBookmarkChapter === 'number' && Number.isInteger(toggleBookmarkChapter) && toggleBookmarkChapter >= 0) {
      const idx = nextBookmarks.indexOf(toggleBookmarkChapter);
      if (idx >= 0) nextBookmarks.splice(idx, 1);
      else nextBookmarks.push(toggleBookmarkChapter);
    }

    const nextHighlights = [...prev.highlights];
    if (addHighlight && typeof addHighlight.text === 'string' && addHighlight.text.trim()) {
      nextHighlights.unshift({
        chapterIndex:
          typeof addHighlight.chapterIndex === 'number' && Number.isInteger(addHighlight.chapterIndex)
            ? Math.max(0, addHighlight.chapterIndex)
            : prev.currentChapterIndex,
        text: String(addHighlight.text).slice(0, 400),
      });
    }

    const computedPercent =
      typeof percentComplete === 'number' && Number.isFinite(percentComplete)
        ? Math.min(100, Math.max(0, Math.round(percentComplete)))
        : prev.percentComplete;
    const computedPage = Math.max(1, Math.round((computedPercent / 100) * book.pages));

    const updatedProgress = {
      ...prev,
      currentChapterIndex:
        typeof currentChapterIndex === 'number' && Number.isInteger(currentChapterIndex) && currentChapterIndex >= 0
          ? currentChapterIndex
          : prev.currentChapterIndex,
      currentPage: computedPage,
      percentComplete: computedPercent,
      minutesRead: prev.minutesRead + safeMinutes,
      bookmarks: nextBookmarks,
      highlights: nextHighlights,
      rating: typeof rating === 'number' && Number.isFinite(rating) ? rating : prev.rating,
      lastReadAt: new Date().toISOString(),
    };

    const today = new Date().toISOString().slice(0, 10);
    const sameDay = state.stats.lastActiveDate === today;
    const newTotalMinutes = state.stats.totalMinutesRead + safeMinutes;
    const newPagesRead = state.stats.pagesRead + safePages;
    const avgPagesPerHour =
      newTotalMinutes >= 15
        ? Math.max(15, Math.min(80, Math.round((newPagesRead / newTotalMinutes) * 60)))
        : state.stats.avgPagesPerHour;

    const nextLibrary = { ...state.library };
    let booksCompleted = state.stats.booksCompleted;
    if (bookCompleted && !nextLibrary.completed.includes(bookId)) {
      nextLibrary.reading = nextLibrary.reading.filter((id) => id !== bookId);
      nextLibrary.completed = [bookId, ...nextLibrary.completed];
      booksCompleted += 1;
      if (book.difficulty.overall <= 2 && state.preferences.maxDifficulty <= 2) {
        levelUpSuggestion =
          'Your reading comfort has grown! Would you like to raise your Reading Difficulty to Level 3 (Intermediate)?';
      }
    }

    return {
      ...state,
      currentBookId: bookId,
      library: nextLibrary,
      progress: {
        ...state.progress,
        [bookId]: updatedProgress,
      },
      stats: {
        ...state.stats,
        pagesRead: newPagesRead,
        chaptersCompleted: state.stats.chaptersCompleted + (chapterCompleted ? 1 : 0),
        totalMinutesRead: newTotalMinutes,
        booksCompleted,
        streakDays: sameDay ? state.stats.streakDays : state.stats.streakDays + 1,
        lastActiveDate: today,
        avgPagesPerHour,
        challengePagesToday: sameDay
          ? state.stats.challengePagesToday + safePages
          : safePages,
      },
    };
  });

  res.json({ user, levelUpSuggestion });
});

// Vocabulary list
app.post('/api/me/vocabulary', (req, res) => {
  const token = extractToken(req);
  const item = req.body;
  if (!item?.word) {
    return res.status(400).json({ error: 'Word is required.' });
  }
  const user = updateUserState(token, (state) => {
    const exists = state.vocabulary.some(
      (v) => v.word.toLowerCase() === String(item.word).toLowerCase()
    );
    if (exists) return state;
    const newEntry = {
      id: `vocab-${Date.now()}`,
      word: String(item.word),
      simpleMeaning: String(item.simpleMeaning || ''),
      example: String(item.example || ''),
      similarWords: Array.isArray(item.similarWords) ? item.similarWords : [],
      difficulty: item.difficulty || 'Medium',
      translatedMeaning: item.translatedMeaning,
      translatedLanguage: item.translatedLanguage,
      simpleEnglishSentence: item.simpleEnglishSentence,
      bookTitle: String(item.bookTitle || 'Reading'),
      savedAt: new Date().toISOString(),
    };
    return {
      ...state,
      vocabulary: [newEntry, ...state.vocabulary],
    };
  });
  res.json({ user });
});

app.delete('/api/me/vocabulary/:id', (req, res) => {
  const token = extractToken(req);
  const user = updateUserState(token, (state) => ({
    ...state,
    vocabulary: state.vocabulary.filter((v) => v.id !== req.params.id),
  }));
  res.json({ user });
});

// Reading Journal
app.post('/api/me/journal', (req, res) => {
  const token = extractToken(req);
  const { bookId, bookTitle, chapterTitle, thought, favoriteCharacter, favoriteQuote, feeling } =
    req.body || {};
  const user = updateUserState(token, (state) => ({
    ...state,
    journal: [
      {
        id: `journal-${Date.now()}`,
        bookId: String(bookId || ''),
        bookTitle: String(bookTitle || 'Novel'),
        chapterTitle: String(chapterTitle || 'Reflection'),
        thought: String(thought || ''),
        favoriteCharacter: String(favoriteCharacter || ''),
        favoriteQuote: String(favoriteQuote || ''),
        feeling: String(feeling || ''),
        createdAt: new Date().toISOString(),
      },
      ...state.journal,
    ],
  }));
  res.json({ user });
});

// AI Endpoints
app.post('/api/ai/recommend', async (req, res) => {
  try {
    const token = extractToken(req);
    const user = getUserFromToken(token);
    const { query, mood, timeAvailable, overridePreferences } = req.body || {};
    const result = await recommendBooksWithAI({
      query,
      mood,
      timeAvailable,
      preferences: overridePreferences
        ? { ...user.preferences, ...overridePreferences }
        : user.preferences,
      completedIds: user.library.completed,
      abandonedIds: user.library.abandoned,
      avgPagesPerHour: user.stats.avgPagesPerHour,
    });
    res.json(result);
  } catch (error: any) {
    const formatted = formatGeminiError(error);
    res.status(formatted.status).json({ error: formatted.message });
  }
});

app.post('/api/ai/word-explain', async (req, res) => {
  try {
    const token = extractToken(req);
    const user = getUserFromToken(token);
    const { word, sentenceContext, bookTitle, language } = req.body || {};
    if (!word) {
      return res.status(400).json({ error: 'Word is required.' });
    }
    const result = await explainWordWithAI({
      word: String(word),
      sentenceContext: String(sentenceContext || ''),
      bookTitle: String(bookTitle || 'Novel'),
      language: language || user.preferences.appLanguage,
    });
    res.json(result);
  } catch (error: any) {
    const formatted = formatGeminiError(error);
    res.status(formatted.status).json({ error: formatted.message });
  }
});

app.post('/api/ai/assistant', async (req, res) => {
  try {
    const token = extractToken(req);
    const user = getUserFromToken(token);
    const {
      bookId,
      currentChapterIndex = 0,
      selectedParagraph,
      question,
      spoilerLevel = 'no_spoilers',
      language,
    } = req.body || {};
    const book = BOOKS_CATALOG.find((b) => b.id === bookId);
    if (!book) {
      return res.status(404).json({ error: 'Book not found.' });
    }
    const ch = book.chapters[currentChapterIndex] || book.chapters[0];
    const result = await assistReadingWithAI({
      bookTitle: book.title,
      author: book.author,
      currentChapterNumber: ch ? ch.number : 1,
      currentChapterTitle: ch ? ch.title : 'Opening',
      chapterSummaryUpToHere: ch ? ch.summaryUpToHere : book.spoilerFreeIntro,
      selectedParagraph,
      question: String(question || 'Explain what is happening so far.'),
      spoilerLevel,
      language: language || user.preferences.appLanguage,
    });
    res.json(result);
  } catch (error: any) {
    const formatted = formatGeminiError(error);
    res.status(formatted.status).json({ error: formatted.message });
  }
});

app.post('/api/ai/author-path', async (req, res) => {
  try {
    const token = extractToken(req);
    const user = getUserFromToken(token);
    const { authorName, experience } = req.body || {};
    if (!authorName) {
      return res.status(400).json({ error: 'Author name is required.' });
    }
    const result = await generateAuthorPathWithAI({
      authorName: String(authorName),
      experience: String(experience || user.preferences.experience),
      language: user.preferences.appLanguage,
    });
    res.json(result);
  } catch (error: any) {
    const formatted = formatGeminiError(error);
    res.status(formatted.status).json({ error: formatted.message });
  }
});

app.post('/api/ai/personality', async (req, res) => {
  try {
    const token = extractToken(req);
    const user = getUserFromToken(token);
    const { answers } = req.body || {};
    const result = await evaluatePersonalityWithAI({
      answers: Array.isArray(answers) ? answers : [],
      language: user.preferences.appLanguage,
    });
    updateUserState(token, (state) => ({
      ...state,
      preferences: {
        ...state.preferences,
        personalityTitle: result.personalityTitle,
        personalityDescription: result.description,
      },
    }));
    res.json(result);
  } catch (error: any) {
    const formatted = formatGeminiError(error);
    res.status(formatted.status).json({ error: formatted.message });
  }
});

export default app;
