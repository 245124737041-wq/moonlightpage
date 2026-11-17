export type Genre =
  | 'Romance'
  | 'Mystery'
  | 'Thriller'
  | 'Horror'
  | 'Fantasy'
  | 'Adventure'
  | 'Comedy'
  | 'Historical Fiction'
  | 'Science Fiction'
  | 'Crime'
  | 'Psychological'
  | 'Drama'
  | 'Coming-of-age'
  | 'Philosophy'
  | 'Literary Fiction'
  | 'Classic Literature'
  | 'Short Stories';

export type Mood =
  | 'Romantic'
  | 'Funny'
  | 'Mystery'
  | 'Scary'
  | 'Psychological'
  | 'Calm'
  | 'Emotional'
  | 'Fast-paced'
  | 'Happy'
  | 'Sad'
  | 'Excited'
  | 'Curious'
  | 'Thoughtful'
  | 'Relaxed';

export type ReadingExperience =
  | 'never'
  | 'very_little'
  | 'occasionally'
  | 'regular'
  | 'advanced';

export type LanguageDifficulty =
  | 'Very Easy'
  | 'Easy'
  | 'Medium'
  | 'Difficult'
  | 'Advanced';

export type DailyReadingTime =
  | '10 minutes'
  | '20 minutes'
  | '30 minutes'
  | '1 hour'
  | 'More than 1 hour';

export type SupportedLanguage = 'English' | 'Hindi' | 'Telugu';

export type SpoilerLevel = 'no_spoilers' | 'mild_spoilers' | 'full_explanation';

export type ShelfStatus =
  | 'reading'
  | 'want_to_read'
  | 'completed'
  | 'abandoned'
  | 'favorites';

export interface DifficultyBreakdown {
  language: number; // 1-5
  complexity: number; // 1-5
  length: number; // 1-5
  vocabulary: number; // 1-5
  overall: number; // 1-5
  explanation: string;
}

export interface BookDNA {
  romance: number; // 0-100
  psychology: number;
  comedy: number;
  action: number;
  philosophy: number;
  mystery: number;
}

export interface BookChapter {
  id: string;
  number: number;
  title: string;
  estimatedMinutes: number;
  summaryUpToHere: string;
  paragraphs: string[];
}

export interface Book {
  id: string;
  title: string;
  author: string;
  year: number;
  country: string;
  isPublicDomain: boolean;
  metadataOnly?: boolean;
  coverImage: string | null;
  coverPalette: {
    bg: string;
    accent: string;
    text: string;
  };
  genres: Genre[];
  moods: Mood[];
  themes: string[];
  pages: number;
  lengthLabel: 'Short' | 'Medium' | 'Long';
  journeyLevel: 1 | 2 | 3 | 4 | 5;
  beginnerFriendly: boolean;
  difficulty: DifficultyBreakdown;
  dna: BookDNA;
  shortDescription: string;
  spoilerFreeIntro: string;
  emotionalIntensity: 'Low' | 'Medium' | 'High';
  romanceLevel: 'None' | 'Low' | 'Medium' | 'High';
  violenceLevel: 'None' | 'Low' | 'Medium' | 'High';
  ageSuitability: string;
  becauseYouLikedIds?: { bookId: string; reason: string }[];
  chapters: BookChapter[];
}

export interface AuthorProfile {
  id: string;
  name: string;
  lifespan: string;
  nationality: string;
  biography: string;
  writingStyle: string;
  difficultyLevel: string;
  themes: string[];
  majorWorks: string[];
  recommendedStartingBookId: string;
  recommendedStartingNote: string;
  similarAuthors: { name: string; reason: string }[];
  readingOrder: { title: string; level: string; note: string }[];
}

export interface VocabularyItem {
  id: string;
  word: string;
  simpleMeaning: string;
  example: string;
  similarWords: string[];
  difficulty: 'Easy' | 'Medium' | 'Hard';
  translatedMeaning?: string;
  translatedLanguage?: SupportedLanguage;
  simpleEnglishSentence?: string;
  bookTitle: string;
  savedAt: string;
}

export interface JournalEntry {
  id: string;
  bookId: string;
  bookTitle: string;
  chapterTitle: string;
  thought: string;
  favoriteCharacter: string;
  favoriteQuote: string;
  feeling: string;
  createdAt: string;
}

export interface ReadingProgressItem {
  bookId: string;
  currentChapterIndex: number;
  currentPage: number;
  percentComplete: number;
  minutesRead: number;
  bookmarks: number[]; // chapter indexes
  highlights: { chapterIndex: number; text: string }[];
  rating?: number;
  lastReadAt: string;
}

export interface JourneyStage {
  level: 1 | 2 | 3 | 4 | 5;
  label: string;
  description: string;
  bookId: string;
  status: 'completed' | 'current' | 'upcoming' | 'skipped';
}

export interface UserPreferences {
  genres: Genre[];
  favoriteAuthors: string[];
  experience: ReadingExperience;
  languageDifficulty: LanguageDifficulty;
  maxDifficulty: number; // 1-5 slider ("Don't Give Me a Difficult Book")
  dailyTime: DailyReadingTime;
  preferredLength: 'Short' | 'Medium' | 'Long' | 'Any';
  ageGroup: 'Teen' | 'Young Adult' | 'Adult' | 'All Ages';
  appLanguage: SupportedLanguage;
  personalityTitle?: string;
  personalityDescription?: string;
}

export interface PrivacySettings {
  shareReadingHistory: boolean;
  saveAiConversations: boolean;
  privateJournal: boolean;
  personalizedRecommendations: boolean;
  publicProfile: boolean;
}

export interface ReaderSettings {
  theme: 'light' | 'sepia' | 'dark';
  fontSize: number; // 16-24
  fontFamily: 'serif' | 'sans';
  lineSpacing: 'normal' | 'relaxed' | 'loose';
}

export interface UserState {
  id: string;
  name: string;
  email: string;
  isGuest: boolean;
  preferences: UserPreferences;
  privacy: PrivacySettings;
  readerSettings: ReaderSettings;
  library: Record<ShelfStatus, string[]>;
  progress: Record<string, ReadingProgressItem>;
  currentBookId: string | null;
  vocabulary: VocabularyItem[];
  journal: JournalEntry[];
  journey: JourneyStage[];
  stats: {
    pagesRead: number;
    chaptersCompleted: number;
    totalMinutesRead: number;
    booksCompleted: number;
    streakDays: number;
    lastActiveDate: string;
    avgPagesPerHour: number;
    challengeDay: number; // 1-7 for 7-Day Beginner Challenge
    challengePagesToday: number;
  };
}

export interface RecommendedBookResult {
  bookId: string;
  matchScore: number;
  whyRecommended: string;
  readingTimeEstimate: string;
  beginnerNote?: string;
}
