import AsyncStorage from '@react-native-async-storage/async-storage';

import type { NewsPost } from '@/types/news';

const STORAGE_KEY = '@driverhub_news';

export async function getStoredPosts(): Promise<NewsPost[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function setStoredPosts(posts: NewsPost[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
}

/** One-time seed so the list isn't empty on first run */
const SEED_KEY = '@driverhub_news_seeded';

export async function ensureSeeded(): Promise<NewsPost[]> {
  const seeded = await AsyncStorage.getItem(SEED_KEY);
  if (seeded === '1') return getStoredPosts();
  const seed: NewsPost[] = [
    {
      id: 'seed-1',
      title: 'Welcome to PHD Matrix',
      body: 'This is your club app for news, casework and member services. Check back here for trade and licensing updates. You can also open a casework request from the Casework tab if you need support.\n\nUseful link: https://www.gov.uk/private-hire-licensing',
      publishedAt: new Date().toISOString(),
      authorName: 'PHD Matrix',
    },
    {
      id: 'seed-2',
      title: 'Licensing round-up',
      body: 'Local authorities are reviewing fee structures this quarter. If you have questions about your licence or vehicle plate, get in touch via Casework. We have also published a short guide on our website: https://example.com/guide',
      publishedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      authorName: 'PHD Matrix',
    },
  ];
  await setStoredPosts(seed);
  await AsyncStorage.setItem(SEED_KEY, '1');
  return seed;
}
