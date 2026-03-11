import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { ensureSeeded, getStoredPosts } from '@/lib/news-storage';
import type { NewsPost } from '@/types/news';

type NewsContextValue = {
  posts: NewsPost[];
  isLoading: boolean;
  refreshPosts: () => Promise<void>;
  getPost: (id: string) => NewsPost | undefined;
};

const NewsContext = createContext<NewsContextValue | null>(null);

export function NewsProvider({ children }: { children: React.ReactNode }) {
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshPosts = useCallback(async () => {
    setIsLoading(true);
    const list = await ensureSeeded();
    setPosts(list);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refreshPosts();
  }, [refreshPosts]);

  const getPost = useCallback(
    (id: string) => posts.find((p) => p.id === id),
    [posts]
  );

  const value: NewsContextValue = {
    posts,
    isLoading,
    refreshPosts,
    getPost,
  };

  return <NewsContext.Provider value={value}>{children}</NewsContext.Provider>;
}

export function useNews(): NewsContextValue {
  const ctx = useContext(NewsContext);
  if (!ctx) throw new Error('useNews must be used inside NewsProvider');
  return ctx;
}
