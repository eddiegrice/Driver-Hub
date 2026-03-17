import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { fetchCmsPosts } from '@/lib/cms-supabase';
import type { CmsPost } from '@/types/cms';

type NewsContextValue = {
  posts: CmsPost[];
  isLoading: boolean;
  error: Error | null;
  refreshPosts: () => Promise<void>;
  getPost: (id: string) => CmsPost | undefined;
};

const NewsContext = createContext<NewsContextValue | null>(null);

export function NewsProvider({ children }: { children: React.ReactNode }) {
  const [posts, setPosts] = useState<CmsPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refreshPosts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const { posts: list, error: err } = await fetchCmsPosts(supabase, 'news');
    setPosts(list);
    setError(err);
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
    error,
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
