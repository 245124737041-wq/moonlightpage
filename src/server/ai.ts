import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { BOOKS_CATALOG } from '../data/catalog.ts';
import {
  RecommendedBookResult,
  SpoilerLevel,
  SupportedLanguage,
  UserPreferences,
} from '../types.ts';

function getAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in Settings > Secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export function formatGeminiError(error: any): { status: number; message: string } {
  const raw = String(error?.message || error || '');
  const code = Number(error?.status || error?.code || 0);

  if (
    code === 403 ||
    raw.includes('PERMISSION_DENIED') ||
    raw.includes('free tier is not available')
  ) {
    return {
      status: 403,
      message:
        'The Gemini API key for this project requires billing or a paid-tier API key. Please check or select a billing-enabled key in Settings > Secrets.',
    };
  }
  if (code === 400 || raw.includes('API_KEY_INVALID')) {
    return {
      status: 400,
      message:
        'The Gemini API key appears invalid or missing. Please verify your key in Settings > Secrets.',
    };
  }
  if (code === 429 || raw.includes('RESOURCE_EXHAUSTED')) {
    return {
      status: 429,
      message:
        'Gemini API quota or rate limit exceeded. Please wait a moment or select a billing-enabled API key in Settings > Secrets.',
    };
  }
  if (code === 404 || raw.includes('NOT_FOUND')) {
    return {
      status: 404,
      message: 'The configured Gemini model could not be found.',
    };
  }
  return {
    status: 500,
    message: raw || 'The AI companion could not complete this request.',
  };
}

function summarizeCatalogForAI() {
  return BOOKS_CATALOG.map((b) => ({
    id: b.id,
    title: b.title,
    author: b.author,
    genres: b.genres,
    moods: b.moods,
    themes: b.themes,
    pages: b.pages,
    lengthLabel: b.lengthLabel,
    difficultyOverall: b.difficulty.overall,
    beginnerFriendly: b.beginnerFriendly,
    emotionalIntensity: b.emotionalIntensity,
    romanceLevel: b.romanceLevel,
    violenceLevel: b.violenceLevel,
    shortDescription: b.shortDescription,
  }));
}

export async function recommendBooksWithAI(params: {
  query?: string;
  mood?: string;
  timeAvailable?: string;
  preferences: UserPreferences;
  completedIds: string[];
  abandonedIds: string[];
  avgPagesPerHour: number;
}): Promise<{
  summaryMessage: string;
  recommendations: RecommendedBookResult[];
}> {
  const ai = getAIClient();
  const catalogSummary = summarizeCatalogForAI();

  const prompt = `
You are Moonlight Pages, a thoughtful, calm literary discovery companion whose motto is:
"Don't just recommend a book. Help the user discover the right book and become a better reader."

USER CONTEXT:
- Natural-language search / request: ${params.query || 'None (general personalized pick)'}
- Current Mood: ${params.mood || 'Any'}
- Available Reading Time Tonight: ${params.timeAvailable || params.preferences.dailyTime}
- Preferred Genres: ${params.preferences.genres.join(', ') || 'Open'}
- Favorite Authors: ${params.preferences.favoriteAuthors.join(', ') || 'None yet'}
- Experience Level: ${params.preferences.experience}
- Preferred Language Difficulty: ${params.preferences.languageDifficulty}
- Max Difficulty Slider (1-5): ${params.preferences.maxDifficulty}
- Preferred Length: ${params.preferences.preferredLength}
- Age Group: ${params.preferences.ageGroup}
- Completed Book IDs: ${params.completedIds.join(', ') || 'None'}
- Abandoned Book IDs: ${params.abandonedIds.join(', ') || 'None'}
- User Average Reading Speed: ${params.avgPagesPerHour} pages/hour
- Output Language: ${params.preferences.appLanguage}

AVAILABLE CATALOG (ONLY recommend bookIds from this exact list):
${JSON.stringify(catalogSummary)}

INSTRUCTIONS:
1. Rank and select 4 to 6 best-matching books from the catalog. Strongly honor the user's Max Difficulty Slider (${params.preferences.maxDifficulty}/5) and any natural-language constraint (like "short", "easy English", "sad ending", "not violent", "20 minutes").
2. Write a warm, encouraging 1-sentence summaryMessage tailored to the request.
3. For each book, write a specific "whyRecommended" explanation referencing BOTH the user's request/history AND the book's actual qualities (never say generic "You may like this").
4. Calculate a personalized "readingTimeEstimate" using pages / ${params.avgPagesPerHour} pages/hour (e.g. "~2h 25m" or "~45m").
5. Provide an optional short "beginnerNote" if the user is a beginner or chose a short time window.
6. Respond in ${params.preferences.appLanguage} (or keep titles in English and explain warmly in ${params.preferences.appLanguage}).
`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summaryMessage: { type: Type.STRING },
          recommendations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                bookId: { type: Type.STRING },
                matchScore: { type: Type.INTEGER },
                whyRecommended: { type: Type.STRING },
                readingTimeEstimate: { type: Type.STRING },
                beginnerNote: { type: Type.STRING },
              },
              required: ['bookId', 'matchScore', 'whyRecommended', 'readingTimeEstimate'],
            },
          },
        },
        required: ['summaryMessage', 'recommendations'],
      },
    },
  });

  const parsed = JSON.parse((response.text ?? '{}').trim());
  const validIds = new Set(BOOKS_CATALOG.map((b) => b.id));
  const cleaned = (parsed.recommendations || []).filter((r: RecommendedBookResult) =>
    validIds.has(r.bookId)
  );
  return {
    summaryMessage:
      parsed.summaryMessage || 'Here are calm, well-matched reads selected for your pace.',
    recommendations: cleaned,
  };
}

export async function explainWordWithAI(params: {
  word: string;
  sentenceContext: string;
  bookTitle: string;
  language: SupportedLanguage;
}) {
  const ai = getAIClient();

  const prompt = `
Explain the word "${params.word}" as it appears in the novel "${params.bookTitle}".
Sentence context: "${params.sentenceContext}"
Target learner language: ${params.language}

Provide:
- word: clean capitalized headword
- simpleMeaning: plain, beginner-friendly English definition (1 short sentence)
- example: an everyday modern example sentence using the word
- similarWords: 3 to 4 simple synonyms
- difficulty: "Easy", "Medium", or "Hard"
- simpleEnglishSentence: rewrite the sentenceContext in very clear, simple modern English
- translatedMeaning: if target language is Hindi or Telugu, provide the accurate meaning and simple explanation of the word in ${params.language} script alongside English; if English, provide a brief helpful usage nuance note.
`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          word: { type: Type.STRING },
          simpleMeaning: { type: Type.STRING },
          example: { type: Type.STRING },
          similarWords: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          difficulty: { type: Type.STRING },
          simpleEnglishSentence: { type: Type.STRING },
          translatedMeaning: { type: Type.STRING },
        },
        required: [
          'word',
          'simpleMeaning',
          'example',
          'similarWords',
          'difficulty',
          'simpleEnglishSentence',
          'translatedMeaning',
        ],
      },
    },
  });

  return JSON.parse((response.text ?? '{}').trim());
}

export async function assistReadingWithAI(params: {
  bookTitle: string;
  author: string;
  currentChapterNumber: number;
  currentChapterTitle: string;
  chapterSummaryUpToHere: string;
  selectedParagraph?: string;
  question: string;
  spoilerLevel: SpoilerLevel;
  language: SupportedLanguage;
}) {
  const ai = getAIClient();

  const spoilerDirective =
    params.spoilerLevel === 'no_spoilers'
      ? `STRICT NO SPOILERS: The reader is ONLY at Chapter ${params.currentChapterNumber} ("${params.currentChapterTitle}"). Summary so far: "${params.chapterSummaryUpToHere}". You MUST NOT reveal, hint at, or foreshadow ANY plot twist, ending, character fate, or event occurring after Chapter ${params.currentChapterNumber}. If the answer lies later in the book, say warmly: "That becomes clearer in later chapters—staying spoiler-free up to Chapter ${params.currentChapterNumber}, here is what we know so far..."`
      : params.spoilerLevel === 'mild_spoilers'
      ? `MILD SPOILERS ALLOWED: The reader is at Chapter ${params.currentChapterNumber} ("${params.currentChapterTitle}"). You may offer gentle thematic hints about upcoming developments without giving away the final ending.`
      : `FULL EXPLANATION ALLOWED: The reader explicitly requested complete literary analysis including later plot context and ending if relevant to their question.`;

  const systemInstruction = `
You are Moonlight Pages's AI Reading Companion—calm, literary, encouraging, and crystal-clear for beginners and English learners.
Book: "${params.bookTitle}" by ${params.author}.
${spoilerDirective}
Respond in ${params.language} (for Hindi or Telugu, provide the explanation clearly in ${params.language} with key character names preserved, and if explaining a paragraph, show Simple English + ${params.language} meaning).
Keep answers concise, warm, structured in short readable paragraphs.
`;

  const userPrompt = params.selectedParagraph
    ? `Selected passage from the chapter:\n"${params.selectedParagraph}"\n\nReader's question: ${params.question}`
    : `Reader's question: ${params.question}`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: userPrompt,
    config: {
      systemInstruction,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    },
  });

  return {
    answer:
      response.text?.trim() ||
      'I could not generate an explanation right now. Please try rephrasing your question.',
  };
}

export async function generateAuthorPathWithAI(params: {
  authorName: string;
  experience: string;
  language: SupportedLanguage;
}) {
  const ai = getAIClient();

  const prompt = `
A reader with experience level "${params.experience}" says: "I want to read ${params.authorName}, where should I start?"
Create a personalized "Start With This Author" guide in ${params.language}.
Include:
- authorName
- overview: 2 sentences capturing their style and why they matter
- recommendedStartingBook: best entry point for this reader's level
- whyStartHere: personalized explanation
- steps: 5 progressive steps (Step 1 easier work -> Step 5 major work), each with stepNumber, title, and guidance
- commonVocabularyTip: 1 practical tip for getting comfortable with this author's language/style
- similarAuthorsChain: 4 related authors in a progression chain with brief reason
`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          authorName: { type: Type.STRING },
          overview: { type: Type.STRING },
          recommendedStartingBook: { type: Type.STRING },
          whyStartHere: { type: Type.STRING },
          commonVocabularyTip: { type: Type.STRING },
          steps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                stepNumber: { type: Type.INTEGER },
                title: { type: Type.STRING },
                guidance: { type: Type.STRING },
              },
              required: ['stepNumber', 'title', 'guidance'],
            },
          },
          similarAuthorsChain: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                reason: { type: Type.STRING },
              },
              required: ['name', 'reason'],
            },
          },
        },
        required: [
          'authorName',
          'overview',
          'recommendedStartingBook',
          'whyStartHere',
          'commonVocabularyTip',
          'steps',
          'similarAuthorsChain',
        ],
      },
    },
  });

  return JSON.parse((response.text ?? '{}').trim());
}

export async function evaluatePersonalityWithAI(params: {
  answers: { question: string; choice: string }[];
  language: SupportedLanguage;
}) {
  const ai = getAIClient();
  const catalogSummary = summarizeCatalogForAI();

  const prompt = `
Based on these Book Personality quiz answers, determine the user's Reading Personality archetype (e.g., "The Emotional Explorer", "The Midnight Detective", "The Quiet Philosopher", "The Romantic Dreamer", "The Witty Realist") and match 3 books from the catalog.
Answers:
${JSON.stringify(params.answers)}

Catalog:
${JSON.stringify(catalogSummary)}

Respond in ${params.language}.
`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          personalityTitle: { type: Type.STRING },
          description: { type: Type.STRING },
          readingTraits: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          matchedBookIds: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          whyItFits: { type: Type.STRING },
        },
        required: [
          'personalityTitle',
          'description',
          'readingTraits',
          'matchedBookIds',
          'whyItFits',
        ],
      },
    },
  });

  return JSON.parse((response.text ?? '{}').trim());
}
