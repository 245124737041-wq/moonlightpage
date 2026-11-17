import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  JourneyStage,
  PrivacySettings,
  ReaderSettings,
  ReadingProgressItem,
  ShelfStatus,
  UserPreferences,
  UserState,
  VocabularyItem,
  JournalEntry,
} from '../types.ts';

interface StoredAccount {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  salt: string;
  state: UserState;
}

interface DataFileSchema {
  accounts: Record<string, StoredAccount>;
  sessions: Record<string, string>; // token -> accountId
}

const DATA_FILE = path.resolve(process.cwd(), '.vellum-store.json');

function createDefaultJourney(): JourneyStage[] {
  return [
    {
      level: 1,
      label: 'Level 1 — Short & Gentle Stories',
      description: 'Warm, accessible classics you can finish in 10–15 minutes a session.',
      bookId: 'tagore-stories',
      status: 'current',
    },
    {
      level: 2,
      label: 'Level 2 — Easy Modern & Adventure Fiction',
      description: 'Fast-moving plots and clear language that build steady reading momentum.',
      bookId: 'study-in-scarlet',
      status: 'upcoming',
    },
    {
      level: 3,
      label: 'Level 3 — Accessible Classics',
      description: 'Compact emotional and psychological novellas with richer vocabulary.',
      bookId: 'white-nights',
      status: 'upcoming',
    },
    {
      level: 4,
      label: 'Level 4 — Deep Literary Novels',
      description: 'Layered character studies and philosophical debates.',
      bookId: 'dorian-gray',
      status: 'upcoming',
    },
    {
      level: 5,
      label: 'Level 5 — Masterworks',
      description: 'Monumental classics tackled with full confidence and pace.',
      bookId: 'crime-and-punishment',
      status: 'upcoming',
    },
  ];
}

export function createDefaultUserState(id: string, name: string, email: string, isGuest: boolean): UserState {
  const today = new Date().toISOString().slice(0, 10);
  const defaultPreferences: UserPreferences = {
    genres: ['Romance', 'Mystery', 'Classic Literature'],
    favoriteAuthors: ['Fyodor Dostoevsky'],
    experience: 'very_little',
    languageDifficulty: 'Easy',
    maxDifficulty: 3,
    dailyTime: '20 minutes',
    preferredLength: 'Short',
    ageGroup: 'Adult',
    appLanguage: 'English',
  };

  const defaultPrivacy: PrivacySettings = {
    shareReadingHistory: true,
    saveAiConversations: true,
    privateJournal: true,
    personalizedRecommendations: true,
    publicProfile: false,
  };

  const defaultReaderSettings: ReaderSettings = {
    theme: 'light',
    fontSize: 19,
    fontFamily: 'serif',
    lineSpacing: 'relaxed',
  };

  return {
    id,
    name,
    email,
    isGuest,
    preferences: defaultPreferences,
    privacy: defaultPrivacy,
    readerSettings: defaultReaderSettings,
    library: {
      reading: ['white-nights'],
      want_to_read: ['tagore-stories', 'study-in-scarlet', 'time-machine'],
      completed: ['o-henry-stories'],
      abandoned: [],
      favorites: ['white-nights', 'o-henry-stories'],
    },
    progress: {
      'white-nights': {
        bookId: 'white-nights',
        currentChapterIndex: 0,
        currentPage: 28,
        percentComplete: 34,
        minutesRead: 42,
        bookmarks: [0],
        highlights: [
          {
            chapterIndex: 0,
            text: 'this midnight bridge felt less lonely simply because she stood beside me.',
          },
        ],
        lastReadAt: new Date().toISOString(),
      },
      'o-henry-stories': {
        bookId: 'o-henry-stories',
        currentChapterIndex: 1,
        currentPage: 64,
        percentComplete: 100,
        minutesRead: 85,
        bookmarks: [],
        highlights: [],
        rating: 5,
        lastReadAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
    },
    currentBookId: 'white-nights',
    vocabulary: [
      {
        id: 'vocab-seed-1',
        word: 'Admonition',
        simpleMeaning: 'Gentle advice or a firm warning about someone’s behavior.',
        example: 'The teacher gave him a quiet admonition before class began.',
        similarWords: ['warning', 'counsel', 'reprimand'],
        difficulty: 'Medium',
        bookTitle: 'White Nights',
        savedAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: 'vocab-seed-2',
        word: 'Candidly',
        simpleMeaning: 'Speaking openly, honestly, and without hiding feelings.',
        example: 'She confessed candidly that she had never finished a novel before.',
        similarWords: ['honestly', 'frankly', 'openly'],
        difficulty: 'Easy',
        bookTitle: 'White Nights',
        savedAt: new Date().toISOString(),
      },
    ],
    journal: [
      {
        id: 'journal-seed-1',
        bookId: 'o-henry-stories',
        bookTitle: 'The Gift of the Magi & Short Stories',
        chapterTitle: 'The Quiet Exchange',
        thought: 'Short, warm, and surprisingly moving—it made classic fiction feel effortless.',
        favoriteCharacter: 'Della',
        favoriteQuote: 'Their foolish, generous exchange revealed a wiser devotion.',
        feeling: 'Warm and hopeful',
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
    ],
    journey: createDefaultJourney(),
    stats: {
      pagesRead: 92,
      chaptersCompleted: 3,
      totalMinutesRead: 127,
      booksCompleted: 1,
      streakDays: 4,
      lastActiveDate: today,
      avgPagesPerHour: 34,
      challengeDay: 3,
      challengePagesToday: 12,
    },
  };
}

const GUEST_ID = 'guest-reader';
const GUEST_EMAIL = 'reader@moonlightpages.app';
const GUEST_NAME = 'Evening Reader';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toFiniteNumber(value: unknown, fallback: number, min = 0): number {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, num);
}

function toStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return [...fallback];
  return Array.from(
    new Set(value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0))
  );
}

function sanitizeUserState(
  rawState: unknown,
  fallbackId: string,
  fallbackName: string,
  fallbackEmail: string,
  fallbackIsGuest: boolean
): UserState {
  const defaults = createDefaultUserState(fallbackId, fallbackName, fallbackEmail, fallbackIsGuest);
  if (!isPlainObject(rawState)) {
    return defaults;
  }

  const rawPrefs = isPlainObject(rawState.preferences) ? rawState.preferences : {};
  const rawPrivacy = isPlainObject(rawState.privacy) ? rawState.privacy : {};
  const rawReader = isPlainObject(rawState.readerSettings) ? rawState.readerSettings : {};
  const rawLibrary = isPlainObject(rawState.library) ? rawState.library : {};
  const rawStats = isPlainObject(rawState.stats) ? rawState.stats : {};
  const rawProgress = isPlainObject(rawState.progress) ? rawState.progress : {};

  const sanitizedLibrary: Record<ShelfStatus, string[]> = {
    reading: toStringArray(rawLibrary.reading, defaults.library.reading),
    want_to_read: toStringArray(rawLibrary.want_to_read, defaults.library.want_to_read),
    completed: toStringArray(rawLibrary.completed, defaults.library.completed),
    abandoned: toStringArray(rawLibrary.abandoned, defaults.library.abandoned),
    favorites: toStringArray(rawLibrary.favorites, defaults.library.favorites),
  };

  const sanitizedProgress: Record<string, ReadingProgressItem> = {};
  for (const [bookId, entry] of Object.entries(rawProgress)) {
    if (!isPlainObject(entry)) continue;
    const bookmarks = Array.isArray(entry.bookmarks)
      ? Array.from(
          new Set(
            entry.bookmarks.filter(
              (b): b is number => typeof b === 'number' && Number.isInteger(b) && b >= 0
            )
          )
        )
      : [];
    const highlights = Array.isArray(entry.highlights)
      ? entry.highlights
          .filter(
            (h): h is { chapterIndex: number; text: string } =>
              isPlainObject(h) &&
              typeof h.chapterIndex === 'number' &&
              Number.isInteger(h.chapterIndex) &&
              typeof h.text === 'string'
          )
          .map((h) => ({ chapterIndex: Math.max(0, h.chapterIndex), text: h.text }))
      : [];

    sanitizedProgress[bookId] = {
      bookId: typeof entry.bookId === 'string' && entry.bookId ? entry.bookId : bookId,
      currentChapterIndex: Math.floor(toFiniteNumber(entry.currentChapterIndex, 0)),
      currentPage: Math.floor(toFiniteNumber(entry.currentPage, 1, 1)),
      percentComplete: Math.min(100, Math.round(toFiniteNumber(entry.percentComplete, 0))),
      minutesRead: Math.round(toFiniteNumber(entry.minutesRead, 0)),
      bookmarks,
      highlights,
      rating: typeof entry.rating === 'number' && Number.isFinite(entry.rating) ? entry.rating : undefined,
      lastReadAt:
        typeof entry.lastReadAt === 'string' && entry.lastReadAt
          ? entry.lastReadAt
          : new Date().toISOString(),
    };
  }

  const sanitizedVocabulary: VocabularyItem[] = Array.isArray(rawState.vocabulary)
    ? rawState.vocabulary
        .filter((v): v is VocabularyItem => isPlainObject(v) && typeof v.word === 'string' && v.word.length > 0)
        .map((v, idx) => ({
          id: typeof v.id === 'string' && v.id ? v.id : `vocab-${idx}`,
          word: v.word,
          simpleMeaning: typeof v.simpleMeaning === 'string' ? v.simpleMeaning : '',
          example: typeof v.example === 'string' ? v.example : '',
          similarWords: toStringArray(v.similarWords, []),
          difficulty: v.difficulty === 'Easy' || v.difficulty === 'Medium' || v.difficulty === 'Hard' ? v.difficulty : 'Medium',
          translatedMeaning: typeof v.translatedMeaning === 'string' ? v.translatedMeaning : undefined,
          translatedLanguage:
            v.translatedLanguage === 'English' ||
            v.translatedLanguage === 'Hindi' ||
            v.translatedLanguage === 'Telugu'
              ? v.translatedLanguage
              : undefined,
          simpleEnglishSentence:
            typeof v.simpleEnglishSentence === 'string' ? v.simpleEnglishSentence : undefined,
          bookTitle: typeof v.bookTitle === 'string' && v.bookTitle ? v.bookTitle : 'Reading',
          savedAt: typeof v.savedAt === 'string' && v.savedAt ? v.savedAt : new Date().toISOString(),
        }))
    : defaults.vocabulary;

  const sanitizedJournal: JournalEntry[] = Array.isArray(rawState.journal)
    ? rawState.journal
        .filter((j): j is JournalEntry => isPlainObject(j))
        .map((j, idx) => ({
          id: typeof j.id === 'string' && j.id ? j.id : `journal-${idx}`,
          bookId: typeof j.bookId === 'string' ? j.bookId : '',
          bookTitle: typeof j.bookTitle === 'string' && j.bookTitle ? j.bookTitle : 'Novel',
          chapterTitle: typeof j.chapterTitle === 'string' && j.chapterTitle ? j.chapterTitle : 'Reflection',
          thought: typeof j.thought === 'string' ? j.thought : '',
          favoriteCharacter: typeof j.favoriteCharacter === 'string' ? j.favoriteCharacter : '',
          favoriteQuote: typeof j.favoriteQuote === 'string' ? j.favoriteQuote : '',
          feeling: typeof j.feeling === 'string' ? j.feeling : '',
          createdAt: typeof j.createdAt === 'string' && j.createdAt ? j.createdAt : new Date().toISOString(),
        }))
    : defaults.journal;

  const sanitizedJourney: JourneyStage[] =
    Array.isArray(rawState.journey) && rawState.journey.length > 0
      ? rawState.journey
          .filter((stage): stage is JourneyStage => isPlainObject(stage) && typeof stage.level === 'number')
          .map((stage) => ({
            level: (stage.level >= 1 && stage.level <= 5 ? stage.level : 1) as 1 | 2 | 3 | 4 | 5,
            label: typeof stage.label === 'string' ? stage.label : `Level ${stage.level}`,
            description: typeof stage.description === 'string' ? stage.description : '',
            bookId: typeof stage.bookId === 'string' ? stage.bookId : 'tagore-stories',
            status:
              stage.status === 'completed' ||
              stage.status === 'current' ||
              stage.status === 'upcoming' ||
              stage.status === 'skipped'
                ? stage.status
                : 'upcoming',
          }))
      : defaults.journey;

  const isGuest = typeof rawState.isGuest === 'boolean' ? rawState.isGuest : fallbackIsGuest;
  const rawEmail = typeof rawState.email === 'string' && rawState.email ? rawState.email : fallbackEmail;
  const email = isGuest && rawEmail === 'reader@vellum.app' ? GUEST_EMAIL : rawEmail;

  return {
    id: typeof rawState.id === 'string' && rawState.id ? rawState.id : fallbackId,
    name: typeof rawState.name === 'string' && rawState.name ? rawState.name : fallbackName,
    email,
    isGuest,
    preferences: {
      ...defaults.preferences,
      ...(rawPrefs as Partial<UserPreferences>),
      genres: Array.isArray(rawPrefs.genres)
        ? (toStringArray(rawPrefs.genres, defaults.preferences.genres) as UserPreferences['genres'])
        : defaults.preferences.genres,
      favoriteAuthors: toStringArray(rawPrefs.favoriteAuthors, defaults.preferences.favoriteAuthors),
      maxDifficulty: Math.min(
        5,
        Math.max(1, Math.round(toFiniteNumber(rawPrefs.maxDifficulty, defaults.preferences.maxDifficulty, 1)))
      ),
    },
    privacy: {
      ...defaults.privacy,
      ...(rawPrivacy as Partial<PrivacySettings>),
    },
    readerSettings: {
      ...defaults.readerSettings,
      ...(rawReader as Partial<ReaderSettings>),
      fontSize: Math.min(
        24,
        Math.max(15, Math.round(toFiniteNumber(rawReader.fontSize, defaults.readerSettings.fontSize, 15)))
      ),
    },
    library: sanitizedLibrary,
    progress: sanitizedProgress,
    currentBookId:
      typeof rawState.currentBookId === 'string' || rawState.currentBookId === null
        ? rawState.currentBookId
        : defaults.currentBookId,
    vocabulary: sanitizedVocabulary,
    journal: sanitizedJournal,
    journey: sanitizedJourney,
    stats: {
      pagesRead: Math.round(toFiniteNumber(rawStats.pagesRead, defaults.stats.pagesRead)),
      chaptersCompleted: Math.round(
        toFiniteNumber(rawStats.chaptersCompleted, defaults.stats.chaptersCompleted)
      ),
      totalMinutesRead: Math.round(
        toFiniteNumber(rawStats.totalMinutesRead, defaults.stats.totalMinutesRead)
      ),
      booksCompleted: Math.round(toFiniteNumber(rawStats.booksCompleted, defaults.stats.booksCompleted)),
      streakDays: Math.round(toFiniteNumber(rawStats.streakDays, defaults.stats.streakDays, 1)),
      lastActiveDate:
        typeof rawStats.lastActiveDate === 'string' && rawStats.lastActiveDate
          ? rawStats.lastActiveDate
          : defaults.stats.lastActiveDate,
      avgPagesPerHour: Math.min(
        100,
        Math.max(10, Math.round(toFiniteNumber(rawStats.avgPagesPerHour, defaults.stats.avgPagesPerHour, 10)))
      ),
      challengeDay: Math.min(
        7,
        Math.max(1, Math.round(toFiniteNumber(rawStats.challengeDay, defaults.stats.challengeDay, 1)))
      ),
      challengePagesToday: Math.round(
        toFiniteNumber(rawStats.challengePagesToday, defaults.stats.challengePagesToday)
      ),
    },
  };
}

function createDefaultGuestAccount(): StoredAccount {
  return {
    id: GUEST_ID,
    email: GUEST_EMAIL,
    name: GUEST_NAME,
    passwordHash: '',
    salt: '',
    state: createDefaultUserState(GUEST_ID, GUEST_NAME, GUEST_EMAIL, true),
  };
}

function sanitizeStore(parsed: unknown): DataFileSchema {
  const accounts: Record<string, StoredAccount> = {};
  const sessions: Record<string, string> = {};

  if (isPlainObject(parsed)) {
    if (isPlainObject(parsed.accounts)) {
      for (const [key, acc] of Object.entries(parsed.accounts)) {
        if (!isPlainObject(acc)) continue;
        const id = typeof acc.id === 'string' && acc.id ? acc.id : key;
        const isGuest = id === GUEST_ID || (isPlainObject(acc.state) && acc.state.isGuest === true);
        const rawEmail = typeof acc.email === 'string' && acc.email ? acc.email : GUEST_EMAIL;
        const email = isGuest && rawEmail === 'reader@vellum.app' ? GUEST_EMAIL : rawEmail;
        const name = typeof acc.name === 'string' && acc.name ? acc.name : GUEST_NAME;

        accounts[id] = {
          id,
          email,
          name,
          passwordHash: typeof acc.passwordHash === 'string' ? acc.passwordHash : '',
          salt: typeof acc.salt === 'string' ? acc.salt : '',
          state: sanitizeUserState(acc.state, id, name, email, isGuest),
        };
      }
    }

    if (isPlainObject(parsed.sessions)) {
      for (const [token, accountId] of Object.entries(parsed.sessions)) {
        if (typeof accountId === 'string' && accounts[accountId]) {
          sessions[token] = accountId;
        }
      }
    }
  }

  if (!accounts[GUEST_ID]) {
    accounts[GUEST_ID] = createDefaultGuestAccount();
  }

  return { accounts, sessions };
}

function loadStore(): DataFileSchema {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8').trim();
      if (raw) {
        const parsed = JSON.parse(raw);
        return sanitizeStore(parsed);
      }
    }
  } catch (err) {
    console.error('Failed to read store file, initializing fresh store:', err);
  }
  const fresh: DataFileSchema = {
    accounts: {
      [GUEST_ID]: createDefaultGuestAccount(),
    },
    sessions: {},
  };
  saveStore(fresh);
  return fresh;
}

function saveStore(data: DataFileSchema) {
  const tempFile = `${DATA_FILE}.tmp`;
  try {
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DATA_FILE);
  } catch (err) {
    console.error('Failed to save store file:', err);
    try {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    } catch {
      // ignore cleanup error
    }
  }
}

let store: DataFileSchema = loadStore();

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

export function registerAccount(name: string, email: string, password: string): { token: string; user: UserState } {
  const normalizedEmail = email.trim().toLowerCase();
  const existing = Object.values(store.accounts).find(
    (acc) => !acc.state.isGuest && acc.email.toLowerCase() === normalizedEmail
  );
  if (existing) {
    throw new Error('An account with this email already exists.');
  }

  const id = `user-${crypto.randomUUID()}`;
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(password, salt);
  const state = createDefaultUserState(id, name.trim() || 'Reader', normalizedEmail, false);

  store.accounts[id] = {
    id,
    email: normalizedEmail,
    name: state.name,
    passwordHash,
    salt,
    state,
  };

  const token = crypto.randomBytes(32).toString('hex');
  store.sessions[token] = id;
  saveStore(store);

  return { token, user: state };
}

export function loginAccount(email: string, password: string): { token: string; user: UserState } {
  const normalizedEmail = email.trim().toLowerCase();
  const account = Object.values(store.accounts).find(
    (acc) => !acc.state.isGuest && acc.email.toLowerCase() === normalizedEmail
  );
  if (!account) {
    throw new Error('No account found with this email.');
  }
  if (!account.salt || !account.passwordHash) {
    throw new Error('Account credentials are invalid. Please register again.');
  }
  const computed = hashPassword(password, account.salt);
  const computedBuf = Buffer.from(computed, 'hex');
  const storedBuf = Buffer.from(account.passwordHash, 'hex');
  if (computedBuf.length !== storedBuf.length || !crypto.timingSafeEqual(computedBuf, storedBuf)) {
    throw new Error('Incorrect password.');
  }

  const token = crypto.randomBytes(32).toString('hex');
  store.sessions[token] = account.id;
  saveStore(store);
  return { token, user: account.state };
}

export function getUserFromToken(token?: string): UserState {
  if (token && store.sessions[token]) {
    const accountId = store.sessions[token];
    const acc = store.accounts[accountId];
    if (acc) return acc.state;
  }
  if (!store.accounts[GUEST_ID]) {
    store.accounts[GUEST_ID] = createDefaultGuestAccount();
    saveStore(store);
  }
  return store.accounts[GUEST_ID].state;
}

export function updateUserState(token: string | undefined, updater: (state: UserState) => UserState): UserState {
  const current = getUserFromToken(token);
  const updated = updater(current);
  if (store.accounts[updated.id]) {
    store.accounts[updated.id].name = updated.name;
    store.accounts[updated.id].state = updated;
    saveStore(store);
  }
  return updated;
}

export function logoutToken(token?: string) {
  if (token && store.sessions[token]) {
    delete store.sessions[token];
    saveStore(store);
  }
}

export type { ReadingProgressItem, ShelfStatus, VocabularyItem, JournalEntry };
