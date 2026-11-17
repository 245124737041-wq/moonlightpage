import {
  Book,
  AuthorProfile,
  RecommendedBookResult,
  ShelfStatus,
  SpoilerLevel,
  SupportedLanguage,
  UserState,
} from '../types.ts';

const TOKEN_KEY = 'vellum_session_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore storage restriction
  }
}

async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export const api = {
  getCatalog: () => apiFetch<{ books: Book[]; authors: AuthorProfile[] }>('/api/catalog'),

  searchGutenberg: (q: string) =>
    apiFetch<{
      results: {
        gutenbergId: number;
        title: string;
        author: string;
        subjects: string[];
        downloadCount: number;
        readUrl: string;
      }[];
    }>(`/api/discover/gutenberg?q=${encodeURIComponent(q)}`),

  getMe: () => apiFetch<{ user: UserState }>('/api/me'),

  register: async (name: string, email: string, password: string) => {
    const res = await apiFetch<{ token: string; user: UserState }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    setStoredToken(res.token);
    return res.user;
  },

  login: async (email: string, password: string) => {
    const res = await apiFetch<{ token: string; user: UserState }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setStoredToken(res.token);
    return res.user;
  },

  logout: async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    setStoredToken(null);
  },

  updatePreferences: (payload: Partial<Pick<UserState, 'name' | 'preferences' | 'privacy' | 'readerSettings'>>) =>
    apiFetch<{ user: UserState }>('/api/me/preferences', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  buildJourney: (payload: {
    experience: string;
    preferredGenres: string[];
    languageDifficulty: string;
    dailyTime: string;
  }) =>
    apiFetch<{ user: UserState }>('/api/me/journey', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateJourneyStage: (level: number, status: string) =>
    apiFetch<{ user: UserState }>('/api/me/journey/stage', {
      method: 'PATCH',
      body: JSON.stringify({ level, status }),
    }),

  updateShelf: (bookId: string, shelf: ShelfStatus, action: 'add' | 'remove') =>
    apiFetch<{ user: UserState }>('/api/me/library', {
      method: 'POST',
      body: JSON.stringify({ bookId, shelf, action }),
    }),

  updateProgress: (payload: {
    bookId: string;
    currentChapterIndex?: number;
    percentComplete?: number;
    minutesDelta?: number;
    pagesDelta?: number;
    chapterCompleted?: boolean;
    bookCompleted?: boolean;
    toggleBookmarkChapter?: number;
    addHighlight?: { chapterIndex: number; text: string };
    rating?: number;
  }) =>
    apiFetch<{ user: UserState; levelUpSuggestion: string | null }>('/api/me/progress', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  saveVocabulary: (item: {
    word: string;
    simpleMeaning: string;
    example: string;
    similarWords: string[];
    difficulty: 'Easy' | 'Medium' | 'Hard';
    translatedMeaning?: string;
    translatedLanguage?: SupportedLanguage;
    simpleEnglishSentence?: string;
    bookTitle: string;
  }) =>
    apiFetch<{ user: UserState }>('/api/me/vocabulary', {
      method: 'POST',
      body: JSON.stringify(item),
    }),

  deleteVocabulary: (id: string) =>
    apiFetch<{ user: UserState }>(`/api/me/vocabulary/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  saveJournal: (entry: {
    bookId: string;
    bookTitle: string;
    chapterTitle: string;
    thought: string;
    favoriteCharacter: string;
    favoriteQuote: string;
    feeling: string;
  }) =>
    apiFetch<{ user: UserState }>('/api/me/journal', {
      method: 'POST',
      body: JSON.stringify(entry),
    }),

  aiRecommend: (payload: {
    query?: string;
    mood?: string;
    timeAvailable?: string;
    overridePreferences?: Partial<UserState['preferences']>;
  }) =>
    apiFetch<{ summaryMessage: string; recommendations: RecommendedBookResult[] }>(
      '/api/ai/recommend',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  aiExplainWord: (payload: {
    word: string;
    sentenceContext: string;
    bookTitle: string;
    language: SupportedLanguage;
  }) =>
    apiFetch<{
      word: string;
      simpleMeaning: string;
      example: string;
      similarWords: string[];
      difficulty: 'Easy' | 'Medium' | 'Hard';
      simpleEnglishSentence: string;
      translatedMeaning: string;
    }>('/api/ai/word-explain', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  aiAssistant: (payload: {
    bookId: string;
    currentChapterIndex: number;
    selectedParagraph?: string;
    question: string;
    spoilerLevel: SpoilerLevel;
    language: SupportedLanguage;
  }) =>
    apiFetch<{ answer: string }>('/api/ai/assistant', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  aiAuthorPath: (payload: { authorName: string; experience: string }) =>
    apiFetch<{
      authorName: string;
      overview: string;
      recommendedStartingBook: string;
      whyStartHere: string;
      commonVocabularyTip: string;
      steps: { stepNumber: number; title: string; guidance: string }[];
      similarAuthorsChain: { name: string; reason: string }[];
    }>('/api/ai/author-path', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  aiPersonality: (answers: { question: string; choice: string }[]) =>
    apiFetch<{
      personalityTitle: string;
      description: string;
      readingTraits: string[];
      matchedBookIds: string[];
      whyItFits: string;
    }>('/api/ai/personality', {
      method: 'POST',
      body: JSON.stringify({ answers }),
    }),
};
