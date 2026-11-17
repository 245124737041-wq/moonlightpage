import { Book, Genre, Mood, RecommendedBookResult, UserState } from '../types.ts';
import { formatReadingTime } from './i18n.ts';

export function computeLocalRecommendations(
  books: Book[],
  user: UserState,
  options: {
    selectedGenres?: Genre[];
    selectedMood?: Mood | null;
    maxDifficulty?: number;
    twentyMinutesOnly?: boolean;
    query?: string;
  } = {}
): RecommendedBookResult[] {
  const genres =
    options.selectedGenres && options.selectedGenres.length > 0
      ? options.selectedGenres
      : user.preferences.genres;
  const maxDiff = options.maxDifficulty ?? user.preferences.maxDifficulty;
  const queryLower = (options.query || '').toLowerCase().trim();

  const scored = books
    .filter((b) => b.difficulty.overall <= maxDiff)
    .filter((b) => {
      if (!options.twentyMinutesOnly) return true;
      const firstChapterMin = b.chapters[0]?.estimatedMinutes || 15;
      return b.lengthLabel === 'Short' || firstChapterMin <= 20;
    })
    .map((book) => {
      let score = 45;
      const reasons: string[] = [];

      // Genre match
      const matchingGenres = book.genres.filter((g) => genres.includes(g));
      if (matchingGenres.length > 0) {
        score += matchingGenres.length * 14;
        reasons.push(`matches your interest in ${matchingGenres.slice(0, 2).join(' & ')}`);
      }

      // Mood match
      if (options.selectedMood && book.moods.includes(options.selectedMood)) {
        score += 18;
        reasons.push(`fits a ${options.selectedMood.toLowerCase()} mood`);
      }

      // Author similarity
      if (
        user.preferences.favoriteAuthors.some(
          (a) => a.toLowerCase() === book.author.toLowerCase()
        )
      ) {
        score += 16;
        reasons.push(`written by your favorite author ${book.author}`);
      }

      // Difficulty alignment
      const diffDelta = Math.abs(book.difficulty.overall - maxDiff);
      score += Math.max(0, 12 - diffDelta * 4);

      // Length preference
      if (
        user.preferences.preferredLength !== 'Any' &&
        book.lengthLabel === user.preferences.preferredLength
      ) {
        score += 8;
        reasons.push(`offers a ${book.lengthLabel.toLowerCase()}, approachable length`);
      }

      // Beginner bonus
      if (
        (user.preferences.experience === 'never' ||
          user.preferences.experience === 'very_little') &&
        book.beginnerFriendly
      ) {
        score += 10;
      }

      // Natural query boost
      if (queryLower) {
        const haystack = `${book.title} ${book.author} ${book.genres.join(' ')} ${book.moods.join(
          ' '
        )} ${book.themes.join(' ')} ${book.shortDescription}`.toLowerCase();
        const terms = queryLower.split(/\s+/).filter((t) => t.length > 2);
        const hits = terms.filter((t) => haystack.includes(t));
        score += hits.length * 10;
      }

      // Penalize already completed or abandoned slightly so fresh picks lead
      if (user.library.completed.includes(book.id)) score -= 18;
      if (user.library.abandoned.includes(book.id)) score -= 30;

      const reasonSentence =
        reasons.length > 0
          ? `Recommended because it ${reasons.join(', ')}, and sits comfortably at Difficulty ${book.difficulty.overall}/5.`
          : `Well balanced at Difficulty ${book.difficulty.overall}/5 (${book.pages} pages), offering ${book.themes
              .slice(0, 2)
              .join(' and ')
              .toLowerCase()}.`;

      return {
        bookId: book.id,
        matchScore: Math.min(99, Math.max(52, score)),
        whyRecommended: reasonSentence,
        readingTimeEstimate: formatReadingTime(book.pages, user.stats.avgPagesPerHour),
        beginnerNote: book.beginnerFriendly ? 'Beginner-friendly pacing' : undefined,
      };
    });

  return scored.sort((a, b) => b.matchScore - a.matchScore);
}
