import React, { useState } from 'react';
import { Award, Flame, Globe, Lock, LogOut, Moon, Sun, UserPlus } from 'lucide-react';
import { SupportedLanguage, UserState } from '../types.ts';
import { api } from '../lib/api.ts';

interface ProfileViewProps {
  user: UserState;
  appTheme: 'light' | 'dark';
  onToggleTheme: () => void;
  onUserUpdated: (user: UserState) => void;
}

const SEVEN_DAY_CHALLENGE = [
  { day: 1, target: 10 },
  { day: 2, target: 10 },
  { day: 3, target: 15 },
  { day: 4, target: 15 },
  { day: 5, target: 20 },
  { day: 6, target: 20 },
  { day: 7, target: 25 },
];

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  appTheme,
  onToggleTheme,
  onUserUpdated,
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    try {
      const updatedUser =
        authMode === 'register'
          ? await api.register(name, email, password)
          : await api.login(email, password);
      onUserUpdated(updatedUser);
      setPassword('');
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await api.logout();
    const res = await api.getMe();
    onUserUpdated(res.user);
  };

  const hours = Math.floor(user.stats.totalMinutesRead / 60);
  const mins = user.stats.totalMinutesRead % 60;

  const achievements = [
    {
      title: 'First Book Completed',
      unlocked: user.stats.booksCompleted >= 1,
      detail: `${user.stats.booksCompleted}/1 book`,
    },
    {
      title: '100 Pages Read',
      unlocked: user.stats.pagesRead >= 100,
      detail: `${user.stats.pagesRead}/100 pages`,
    },
    {
      title: '500 Pages Read',
      unlocked: user.stats.pagesRead >= 500,
      detail: `${user.stats.pagesRead}/500 pages`,
    },
    {
      title: '100 New Words',
      unlocked: user.vocabulary.length >= 100,
      detail: `${user.vocabulary.length}/100 words`,
    },
    {
      title: '7-Day Reading Streak',
      unlocked: user.stats.streakDays >= 7,
      detail: `${user.stats.streakDays}/7 days`,
    },
    {
      title: '30-Day Reading Streak',
      unlocked: user.stats.streakDays >= 30,
      detail: `${user.stats.streakDays}/30 days`,
    },
  ];

  return (
    <div className="space-y-10 pb-12 max-w-5xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-stone-900 dark:text-zinc-100">
            {user.name}
          </h1>
          <p className="text-sm text-stone-500 dark:text-zinc-400 mt-1">
            {user.isGuest ? 'Guest Reading Profile' : user.email}
            {user.preferences.personalityTitle
              ? ` · ${user.preferences.personalityTitle}`
              : ''}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onToggleTheme}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-stone-200 dark:border-zinc-800 bg-white dark:bg-[#17191E] text-xs font-medium text-stone-700 dark:text-zinc-200"
          >
            {appTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {appTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
          {!user.isGuest && (
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-stone-200 dark:border-zinc-800 text-xs font-medium text-stone-600 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-800"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          )}
        </div>
      </div>

      {/* Reading Statistics Grid */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Reading Streak', value: `${user.stats.streakDays} days` },
          { label: 'Pages Read', value: `${user.stats.pagesRead}` },
          { label: 'Books Done', value: `${user.stats.booksCompleted}` },
          { label: 'Reading Time', value: `${hours}h ${mins}m` },
          { label: 'Words Learned', value: `${user.vocabulary.length}` },
          { label: 'Reading Speed', value: `${user.stats.avgPagesPerHour} p/hr` },
        ].map((stat) => (
          <div
            key={stat.label}
            className="p-4 rounded-xl bg-white dark:bg-[#17191E] border border-stone-200 dark:border-zinc-800 space-y-1"
          >
            <p className="text-xs text-stone-500 dark:text-zinc-400">{stat.label}</p>
            <p className="font-mono text-xl font-semibold tabular-nums text-stone-900 dark:text-zinc-100">
              {stat.value}
            </p>
          </div>
        ))}
      </section>

      {/* Account Registration / Login if Guest */}
      {user.isGuest && (
        <section className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#17191E] border border-stone-200 dark:border-zinc-800 space-y-5 max-w-2xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#1E3A8A] dark:text-blue-400" />
              <h2 className="font-display text-xl font-semibold text-stone-900 dark:text-zinc-100">
                Save Your Reading Account
              </h2>
            </div>
            <div className="flex gap-1 p-1 bg-stone-100 dark:bg-zinc-900 rounded-lg text-xs">
              <button
                onClick={() => setAuthMode('register')}
                className={`px-3 py-1 rounded-md font-medium ${
                  authMode === 'register'
                    ? 'bg-white dark:bg-zinc-800 text-stone-900 dark:text-white'
                    : 'text-stone-500'
                }`}
              >
                Register
              </button>
              <button
                onClick={() => setAuthMode('login')}
                className={`px-3 py-1 rounded-md font-medium ${
                  authMode === 'login'
                    ? 'bg-white dark:bg-zinc-800 text-stone-900 dark:text-white'
                    : 'text-stone-500'
                }`}
              >
                Sign In
              </button>
            </div>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-3">
            {authMode === 'register' && (
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full h-11 px-3.5 rounded-lg bg-stone-50 dark:bg-zinc-900 border border-stone-200 dark:border-zinc-700 text-sm"
              />
            )}
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full h-11 px-3.5 rounded-lg bg-stone-50 dark:bg-zinc-900 border border-stone-200 dark:border-zinc-700 text-sm"
            />
            <input
              type="password"
              placeholder="Password (min. 4 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full h-11 px-3.5 rounded-lg bg-stone-50 dark:bg-zinc-900 border border-stone-200 dark:border-zinc-700 text-sm"
            />
            {authError && <p className="text-xs text-red-600 dark:text-red-400">{authError}</p>}
            <button
              type="submit"
              disabled={authLoading}
              className="px-5 py-2.5 rounded-lg bg-[#1E3A8A] text-white text-xs font-medium hover:bg-[#172D6B] dark:bg-blue-600"
            >
              {authLoading
                ? 'Please wait...'
                : authMode === 'register'
                ? 'Create Account'
                : 'Sign In'}
            </button>
          </form>
        </section>
      )}

      {/* Language Support + 7-Day Beginner Challenge */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Language Support */}
        <section className="p-6 rounded-2xl bg-white dark:bg-[#17191E] border border-stone-200 dark:border-zinc-800 space-y-4">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#1E3A8A] dark:text-blue-400" />
            <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-zinc-100">
              Language &amp; English Learner Support
            </h2>
          </div>
          <p className="text-xs text-stone-500 dark:text-zinc-400 leading-relaxed">
            Choose your preferred explanation language. When Hindi or Telugu is selected, vocabulary lookups and AI explanations provide Original → Simple English → Translated meaning.
          </p>
          <div className="flex gap-2">
            {(['English', 'Hindi', 'Telugu'] as SupportedLanguage[]).map((lang) => (
              <button
                key={lang}
                onClick={async () => {
                  const res = await api.updatePreferences({
                    preferences: { ...user.preferences, appLanguage: lang },
                  });
                  onUserUpdated(res.user);
                }}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                  user.preferences.appLanguage === lang
                    ? 'bg-[#1E3A8A] text-white dark:bg-blue-600'
                    : 'bg-stone-100 text-stone-700 dark:bg-zinc-800 dark:text-zinc-300'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        </section>

        {/* 7-Day Beginner Challenge */}
        <section className="p-6 rounded-2xl bg-white dark:bg-[#17191E] border border-stone-200 dark:border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-zinc-100">
                7-Day Gentle Reading Challenge
              </h2>
            </div>
            <span className="text-xs font-mono tabular-nums text-stone-500 dark:text-zinc-400">
              Day {user.stats.challengeDay}/7
            </span>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {SEVEN_DAY_CHALLENGE.map((d) => {
              const done = d.day < user.stats.challengeDay;
              const current = d.day === user.stats.challengeDay;
              return (
                <div
                  key={d.day}
                  className={`p-2 rounded-xl border text-center space-y-0.5 ${
                    current
                      ? 'border-[#1E3A8A] bg-blue-50/60 dark:border-blue-500 dark:bg-blue-950/30'
                      : done
                      ? 'border-stone-200 bg-stone-100 dark:border-zinc-700 dark:bg-zinc-800'
                      : 'border-stone-200 dark:border-zinc-800 opacity-65'
                  }`}
                >
                  <p className="text-[10px] font-mono text-stone-500 dark:text-zinc-400">
                    D{d.day}
                  </p>
                  <p className="text-xs font-semibold tabular-nums text-stone-900 dark:text-zinc-100">
                    {d.target}p
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Achievements & Milestones */}
      <section className="p-6 rounded-2xl bg-white dark:bg-[#17191E] border border-stone-200 dark:border-zinc-800 space-y-4">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-[#1E3A8A] dark:text-blue-400" />
          <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-zinc-100">
            Calm Reading Milestones
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {achievements.map((a) => (
            <div
              key={a.title}
              className={`p-4 rounded-xl border flex items-center justify-between ${
                a.unlocked
                  ? 'border-[#1E3A8A]/40 bg-blue-50/40 dark:border-blue-500/40 dark:bg-blue-950/20'
                  : 'border-stone-200 dark:border-zinc-800 opacity-70'
              }`}
            >
              <div>
                <p className="text-sm font-medium text-stone-900 dark:text-zinc-100">{a.title}</p>
                <p className="text-xs font-mono tabular-nums text-stone-500 dark:text-zinc-400">
                  {a.detail}
                </p>
              </div>
              <span className="text-xs font-medium text-[#1E3A8A] dark:text-blue-400">
                {a.unlocked ? 'Earned' : 'In progress'}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Privacy Controls */}
      <section className="p-6 rounded-2xl bg-white dark:bg-[#17191E] border border-stone-200 dark:border-zinc-800 space-y-4">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-[#1E3A8A] dark:text-blue-400" />
          <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-zinc-100">
            Privacy Controls
          </h2>
        </div>
        <div className="divide-y divide-stone-100 dark:divide-zinc-800">
          {(
            [
              {
                key: 'privateJournal',
                label: 'Keep Reading Journal strictly private',
                desc: 'Journal reflections remain visible only to you.',
              },
              {
                key: 'saveAiConversations',
                label: 'Use reading position for spoiler-safe AI answers',
                desc: 'Allows the companion to lock answers to your current chapter.',
              },
              {
                key: 'personalizedRecommendations',
                label: 'Evolving book-to-book recommendations',
                desc: 'Use your finished books and difficulty slider to personalize picks.',
              },
              {
                key: 'publicProfile',
                label: 'Public reading profile',
                desc: 'Allow others to view your shelves (off by default).',
              },
            ] as const
          ).map((item) => {
            const enabled = user.privacy[item.key];
            return (
              <div key={item.key} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-stone-900 dark:text-zinc-100">
                    {item.label}
                  </p>
                  <p className="text-xs text-stone-500 dark:text-zinc-400">{item.desc}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  onClick={async () => {
                    const res = await api.updatePreferences({
                      privacy: { ...user.privacy, [item.key]: !enabled },
                    });
                    onUserUpdated(res.user);
                  }}
                  className={`w-11 h-6 rounded-full transition-colors p-0.5 shrink-0 ${
                    enabled ? 'bg-[#1E3A8A] dark:bg-blue-600' : 'bg-stone-300 dark:bg-zinc-700'
                  }`}
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                      enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
