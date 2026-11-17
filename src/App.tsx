/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { BookOpen, Compass, Home, Library, Sparkles, User } from 'lucide-react';
import { AuthorProfile, Book, ShelfStatus, UserState } from './types.ts';
import { api } from './lib/api.ts';
import { UI_LABELS } from './lib/i18n.ts';
import { HomeView } from './components/HomeView.tsx';
import { DiscoverTab, DiscoverView } from './components/DiscoverView.tsx';
import { LibraryView } from './components/LibraryView.tsx';
import { ReaderView } from './components/ReaderView.tsx';
import { ProfileView } from './components/ProfileView.tsx';
import { BookDetailModal } from './components/BookDetailModal.tsx';
import { TonightsPickModal } from './components/TonightsPickModal.tsx';

type NavSection = 'home' | 'discover' | 'library' | 'read' | 'profile';

export default function App() {
  const [section, setSection] = useState<NavSection>('home');
  const [discoverSubTab, setDiscoverSubTab] = useState<DiscoverTab>('genres');
  const [compareBookId, setCompareBookId] = useState<string | null>(null);

  const [books, setBooks] = useState<Book[]>([]);
  const [authors, setAuthors] = useState<AuthorProfile[]>([]);
  const [user, setUser] = useState<UserState | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [detailModal, setDetailModal] = useState<{ book: Book; why?: string } | null>(null);
  const [tonightsPickOpen, setTonightsPickOpen] = useState(false);
  const [activeReaderBookId, setActiveReaderBookId] = useState<string>('white-nights');
  const [appTheme, setAppTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const root = document.documentElement;
    if (appTheme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  }, [appTheme]);

  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const [catalogRes, meRes] = await Promise.all([api.getCatalog(), api.getMe()]);
        if (!mounted) return;
        setBooks(catalogRes.books);
        setAuthors(catalogRes.authors);
        setUser(meRes.user);
        if (meRes.user.currentBookId) {
          setActiveReaderBookId(meRes.user.currentBookId);
        }
      } catch (err: any) {
        if (!mounted) return;
        setLoadError(err.message || 'Unable to load Moonlight Pages.');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    init();
    return () => {
      mounted = false;
    };
  }, []);

  const handleStartReading = async (bookId: string) => {
    setActiveReaderBookId(bookId);
    setSection('read');
    try {
      const res = await api.updateShelf(bookId, 'reading', 'add');
      setUser(res.user);
    } catch {
      // ignore non-blocking shelf sync error
    }
  };

  const handleUpdateShelf = async (bookId: string, shelf: ShelfStatus, action: 'add' | 'remove') => {
    const res = await api.updateShelf(bookId, shelf, action);
    setUser(res.user);
  };

  const handleChangeMaxDifficulty = async (val: number) => {
    if (!user) return;
    const optimistic = {
      ...user,
      preferences: { ...user.preferences, maxDifficulty: val },
    };
    setUser(optimistic);
    const res = await api.updatePreferences({
      preferences: optimistic.preferences,
    });
    setUser(res.user);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FCFCFA] dark:bg-[#111317] text-stone-600 dark:text-zinc-400">
        <p className="font-display text-lg">Opening your reading room...</p>
      </div>
    );
  }

  if (loadError || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FCFCFA] dark:bg-[#111317] p-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="font-display text-2xl font-semibold text-stone-900 dark:text-zinc-100">
            Moonlight Pages
          </h1>
          <p className="text-sm text-stone-600 dark:text-zinc-400">
            {loadError || 'Unable to load your profile.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg bg-[#1E3A8A] text-white text-xs font-medium"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }

  const labels = UI_LABELS[user.preferences.appLanguage] || UI_LABELS.English;

  const navItems: { id: NavSection; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'home', label: labels.home, icon: Home },
    { id: 'discover', label: labels.discover, icon: Compass },
    { id: 'library', label: labels.library, icon: Library },
    { id: 'read', label: labels.read, icon: BookOpen },
    { id: 'profile', label: labels.profile, icon: User },
  ];

  return (
    <div className="min-h-screen bg-[#FCFCFA] dark:bg-[#111317] text-[#111827] dark:text-[#E5E7EB] flex flex-col">
      {/* Desktop Top Bar (Strictly 3 zones: Wordmark — 5 nav links — 1 Primary CTA) */}
      <header className="sticky top-0 z-30 h-14 sm:h-16 bg-[#FCFCFA]/90 dark:bg-[#111317]/90 backdrop-blur-md border-b border-stone-200 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => setSection('home')}
            className="font-display italic text-2xl font-semibold tracking-tight text-stone-900 dark:text-zinc-100 whitespace-nowrap shrink-0"
          >
            Moonlight Pages
          </button>

          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-stone-600 dark:text-zinc-400"
          >
            {navItems.map((item) => {
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setSection(item.id)}
                  className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                    active
                      ? 'text-stone-900 dark:text-white border-[#1E3A8A] dark:border-blue-400'
                      : 'border-transparent hover:text-stone-900 dark:hover:text-zinc-200'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <button
            onClick={() => setTonightsPickOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1E3A8A] text-white text-xs font-medium hover:bg-[#172D6B] dark:bg-blue-600 dark:hover:bg-blue-500 transition-colors whitespace-nowrap shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {labels.tonightsPick}
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-24 md:pb-12">
        {section === 'home' && (
          <HomeView
            books={books}
            user={user}
            onSelectBook={(book, why) => setDetailModal({ book, why })}
            onStartReading={handleStartReading}
            onOpenStartMode={() => {
              setDiscoverSubTab('start_mode');
              setSection('discover');
            }}
            onOpenTonightsPick={() => setTonightsPickOpen(true)}
            onChangeMaxDifficulty={handleChangeMaxDifficulty}
            onNavigateDiscover={() => {
              setDiscoverSubTab('start_mode');
              setSection('discover');
            }}
          />
        )}

        {section === 'discover' && (
          <DiscoverView
            books={books}
            authors={authors}
            user={user}
            initialSubTab={discoverSubTab}
            initialCompareBookId={compareBookId}
            onSelectBook={(book, why) => setDetailModal({ book, why })}
            onStartReading={handleStartReading}
            onUserUpdated={setUser}
          />
        )}

        {section === 'library' && (
          <LibraryView
            books={books}
            user={user}
            onSelectBook={(book, why) => setDetailModal({ book, why })}
            onStartReading={handleStartReading}
            onUserUpdated={setUser}
          />
        )}

        {section === 'read' && (
          <ReaderView
            books={books}
            user={user}
            activeBookId={activeReaderBookId}
            onSelectBookId={setActiveReaderBookId}
            onUserUpdated={setUser}
          />
        )}

        {section === 'profile' && (
          <ProfileView
            user={user}
            appTheme={appTheme}
            onToggleTheme={() => setAppTheme((t) => (t === 'light' ? 'dark' : 'light'))}
            onUserUpdated={setUser}
          />
        )}
      </main>

      {/* Mobile Fixed Bottom Navigation (5 sections, compact <=15% total sticky viewport cap) */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-30 h-14 bg-[#FCFCFA]/95 dark:bg-[#111317]/95 backdrop-blur-md border-t border-stone-200 dark:border-zinc-800 grid grid-cols-5 items-center"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = section === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              className={`h-full flex flex-col items-center justify-center gap-0.5 transition-colors ${
                active
                  ? 'text-[#1E3A8A] dark:text-blue-400 font-semibold'
                  : 'text-stone-500 dark:text-zinc-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] leading-none">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Book Detail Modal */}
      <BookDetailModal
        book={detailModal?.book || null}
        whyRecommended={detailModal?.why}
        user={user}
        onClose={() => setDetailModal(null)}
        onStartReading={handleStartReading}
        onUpdateShelf={handleUpdateShelf}
        onCompareBook={(bookId) => {
          setCompareBookId(bookId);
          setDiscoverSubTab('compare');
          setSection('discover');
        }}
      />

      {/* Tonight's Pick Modal */}
      <TonightsPickModal
        open={tonightsPickOpen}
        books={books}
        user={user}
        onClose={() => setTonightsPickOpen(false)}
        onSelectBook={(book, why) => setDetailModal({ book, why })}
        onStartReading={handleStartReading}
      />
    </div>
  );
}
