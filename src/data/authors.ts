import { AuthorProfile } from '../types.ts';

export const AUTHOR_PROFILES: AuthorProfile[] = [
  {
    id: 'dostoevsky',
    name: 'Fyodor Dostoevsky',
    lifespan: '1821–1881',
    nationality: 'Russian',
    biography:
      'One of the finest psychological novelists in world literature, Dostoevsky explored the depths of human conscience, loneliness, faith, and redemption in 19th-century Saint Petersburg.',
    writingStyle:
      'Intense emotional immediacy, feverish inner monologues, philosophical dialogue, and deep compassion for outsiders and dreamers.',
    difficultyLevel: 'Medium to Advanced (starts gentle with White Nights)',
    themes: ['Loneliness', 'Conscience & Guilt', 'Redemption', 'Human Connection', 'Urban Isolation'],
    majorWorks: ['White Nights', 'Notes from Underground', 'Crime and Punishment', 'The Idiot', 'The Brothers Karamazov'],
    recommendedStartingBookId: 'white-nights',
    recommendedStartingNote:
      'Begin with White Nights — a lyrical, four-night novella under 100 pages that introduces Dostoevsky’s tenderness and longing without heavy philosophical complexity.',
    similarAuthors: [
      { name: 'Leo Tolstoy', reason: 'Shares sweeping moral depth and rich portraits of Russian emotional life.' },
      { name: 'Ivan Turgenev', reason: 'Explores quiet yearning, social change, and delicate human relationships.' },
      { name: 'Anton Chekhov', reason: 'Captures everyday melancholy and subtle psychological truths in brief forms.' },
      { name: 'Albert Camus', reason: 'Carries forward existential questioning of isolation, freedom, and absurdism.' },
      { name: 'Franz Kafka', reason: 'Deepens the sense of alienation and inner psychological tension.' },
    ],
    readingOrder: [
      { title: 'White Nights', level: 'Level 1 · Entry', note: 'Short, romantic, emotionally immediate.' },
      { title: 'Poor Folk', level: 'Level 2 · Gentle Classic', note: 'Epistolary portrait of empathy and dignity.' },
      { title: 'Notes from Underground', level: 'Level 3 · Intermediate', note: 'Short philosophical monologue.' },
      { title: 'Crime and Punishment', level: 'Level 4 · Major Novel', note: 'Gripping psychological thriller of guilt.' },
      { title: 'The Brothers Karamazov', level: 'Level 5 · Masterwork', note: 'Monumental synthesis of love, doubt, and family.' },
    ],
  },
  {
    id: 'austen',
    name: 'Jane Austen',
    lifespan: '1775–1817',
    nationality: 'British',
    biography:
      'Jane Austen reshaped English fiction with sharp social irony, memorable dialogue, and deeply relatable heroines navigating family expectations, class, and love.',
    writingStyle:
      'Sparkling wit, free indirect discourse, warm irony, and finely observed social comedy.',
    difficultyLevel: 'Medium (Regency phrasing becomes effortless after Chapter 1)',
    themes: ['First Impressions', 'Wit & Courtship', 'Family Dynamics', 'Self-Knowledge', 'Social Class'],
    majorWorks: ['Pride and Prejudice', 'Sense and Sensibility', 'Emma', 'Persuasion'],
    recommendedStartingBookId: 'pride-and-prejudice',
    recommendedStartingNote:
      'Start with Pride and Prejudice — brisk, funny from its very first sentence, and driven by lively banter.',
    similarAuthors: [
      { name: 'Charlotte Brontë', reason: 'Offers fierce emotional interiority and independent heroines.' },
      { name: 'Elizabeth Gaskell', reason: 'Combines social observation with warm community portraits.' },
      { name: 'Oscar Wilde', reason: 'Shares razor-sharp wit and playful critique of polite society.' },
    ],
    readingOrder: [
      { title: 'Northanger Abbey', level: 'Level 1 · Entry', note: 'Playful satire of gothic novels.' },
      { title: 'Pride and Prejudice', level: 'Level 2 · Signature', note: 'Her liveliest romance and social comedy.' },
      { title: 'Sense and Sensibility', level: 'Level 3 · Reflective', note: 'Balances heartache with sisterhood.' },
      { title: 'Persuasion', level: 'Level 4 · Mature', note: 'Tender second-chance romance.' },
    ],
  },
  {
    id: 'doyle',
    name: 'Arthur Conan Doyle',
    lifespan: '1859–1930',
    nationality: 'Scottish',
    biography:
      'Physician turned storyteller, Arthur Conan Doyle created Sherlock Holmes and perfected the brisk, atmospheric detective narrative.',
    writingStyle:
      'Crisp, brisk pacing, observant details, logical puzzles, and vivid fog-lit Victorian atmosphere.',
    difficultyLevel: 'Easy to Medium (fast-moving and beginner friendly)',
    themes: ['Observation & Deduction', 'Justice', 'Friendship', 'Victorian London', 'Hidden Motives'],
    majorWorks: ['A Study in Scarlet', 'The Sign of the Four', 'The Adventures of Sherlock Holmes', 'The Hound of the Baskervilles'],
    recommendedStartingBookId: 'study-in-scarlet',
    recommendedStartingNote:
      'Begin with A Study in Scarlet — the very first meeting between Watson and Sherlock Holmes, full of curiosity and mystery.',
    similarAuthors: [
      { name: 'Wilkie Collins', reason: 'Pioneer of Victorian mystery with layered puzzles.' },
      { name: 'Robert Louis Stevenson', reason: 'Shares atmospheric London tension and dual identities.' },
      { name: 'Agatha Christie', reason: 'Inherits the clean clue-by-clue deductive tradition.' },
    ],
    readingOrder: [
      { title: 'A Study in Scarlet', level: 'Level 1 · Entry', note: 'Where Holmes and Watson first meet.' },
      { title: 'The Adventures of Sherlock Holmes', level: 'Level 2 · Short Stories', note: 'Twelve brisk standalone mysteries.' },
      { title: 'The Hound of the Baskervilles', level: 'Level 3 · Gothic Mystery', note: 'Atmospheric masterpiece on the moors.' },
    ],
  },
  {
    id: 'kafka',
    name: 'Franz Kafka',
    lifespan: '1883–1924',
    nationality: 'Bohemian / German-language',
    biography:
      'Writing in Prague, Franz Kafka captured the quiet absurdity of modern life, family duty, and bureaucratic anxiety in unforgettable dreamlike stories.',
    writingStyle:
      'Deceptively plain, matter-of-fact sentences describing extraordinary, surreal situations.',
    difficultyLevel: 'Easy-Medium prose, Medium-High thematic depth',
    themes: ['Alienation', 'Family Pressure', 'Identity', 'Bureaucracy', 'Absurdity'],
    majorWorks: ['The Metamorphosis', 'The Trial', 'The Castle', 'In the Penal Colony'],
    recommendedStartingBookId: 'metamorphosis',
    recommendedStartingNote:
      'Start with The Metamorphosis — short, haunting, and written in crystal-clear sentences you can finish in two evenings.',
    similarAuthors: [
      { name: 'Albert Camus', reason: 'Explores absurdism and human dignity with spare clarity.' },
      { name: 'Fyodor Dostoevsky', reason: 'Pioneered psychological torment and inner alienation.' },
      { name: 'Charlotte Perkins Gilman', reason: 'Uses domestic claustrophobia to reflect inner tension.' },
    ],
    readingOrder: [
      { title: 'The Metamorphosis', level: 'Level 1 · Entry', note: 'Compact novella with unforgettable opening line.' },
      { title: 'A Hunger Artist', level: 'Level 2 · Short Story', note: 'Bite-sized parable on art and misunderstanding.' },
      { title: 'The Trial', level: 'Level 3 · Major Novel', note: 'Haunting labyrinth of guilt and law.' },
    ],
  },
  {
    id: 'shakespeare',
    name: 'William Shakespeare',
    lifespan: '1564–1616',
    nationality: 'English',
    biography:
      'Playwright and poet whose comedies, romances, and tragedies continue to define how stories explore ambition, wit, disguise, and the human heart.',
    writingStyle:
      'Musical imagery, quick banter, dramatic irony, and richly expressive dialogue.',
    difficultyLevel: 'Challenging for beginners — best approached with scene context',
    themes: ['Disguise & Identity', 'Love & Misunderstanding', 'Ambition', 'Forgiveness'],
    majorWorks: ['Twelfth Night', 'Romeo and Juliet', 'Macbeth', 'The Tempest', 'Hamlet'],
    recommendedStartingBookId: 'twelfth-night',
    recommendedStartingNote:
      'For beginners, start with Twelfth Night — playful, romantic, fast-paced, and supported by plain-English scene notes in Moonlight Pages.',
    similarAuthors: [
      { name: 'Oscar Wilde', reason: 'Echoes Shakespeare’s love of witty misunderstanding and sparkling dialogue.' },
      { name: 'Jane Austen', reason: 'Shares keen observation of romantic folly and social manners.' },
    ],
    readingOrder: [
      { title: 'Twelfth Night (Annotated)', level: 'Level 1 · Entry Comedy', note: 'Mistaken identities and warm humor.' },
      { title: 'Macbeth', level: 'Level 2 · Short Tragedy', note: 'Shakespeare’s fastest, tightest tragedy.' },
      { title: 'Romeo and Juliet', level: 'Level 3 · Lyrical Drama', note: 'Iconic poetry of youthful passion.' },
      { title: 'The Tempest', level: 'Level 4 · Romance', note: 'Magical island reflection on forgiveness.' },
      { title: 'Hamlet', level: 'Level 5 · Masterwork', note: 'Philosophical drama of doubt and memory.' },
    ],
  },
  {
    id: 'tagore',
    name: 'Rabindranath Tagore',
    lifespan: '1861–1941',
    nationality: 'Indian (Bengali)',
    biography:
      'Nobel laureate poet, novelist, and short story master whose prose illuminates ordinary village life, quiet affection, and the dignity of human emotion.',
    writingStyle:
      'Gentle, lyrical, compassionate, and deeply attuned to nature and everyday tenderness.',
    difficultyLevel: 'Very Easy to Easy (warm, accessible, ideal for new readers)',
    themes: ['Human Affection', 'Home & Longing', 'Childhood Wonder', 'Empathy', 'Quiet Sacrifice'],
    majorWorks: ['The Postmaster', 'Kabuliwala', 'The Home and the World', 'Gora'],
    recommendedStartingBookId: 'tagore-stories',
    recommendedStartingNote:
      'Begin with The Postmaster & Kabuliwala — two timeless, moving short stories you can read in 15–20 minutes.',
    similarAuthors: [
      { name: 'Anton Chekhov', reason: 'Shares quiet emotional realism and deep tenderness for everyday people.' },
      { name: 'O. Henry', reason: 'Crafted compact, heartfelt stories centered on human generosity.' },
    ],
    readingOrder: [
      { title: 'The Postmaster & Kabuliwala', level: 'Level 1 · Short Stories', note: 'Warm, luminous, and unforgettable.' },
      { title: 'Chokher Bali', level: 'Level 2 · Domestic Novel', note: 'Psychological depth in family relationships.' },
      { title: 'The Home and the World', level: 'Level 3 · Classic Novel', note: 'Intimate ideals meet turbulent times.' },
    ],
  },
];
