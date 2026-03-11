import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Poll, PollResponse, PollResults } from '@/types/polls';
import { isPollClosed } from '@/types/polls';

const POLLS_KEY = '@driverhub_polls';
const RESPONSES_KEY = '@driverhub_poll_responses';
const SEED_KEY = '@driverhub_polls_seeded';

export async function getStoredPolls(): Promise<Poll[]> {
  try {
    const raw = await AsyncStorage.getItem(POLLS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function setStoredPolls(polls: Poll[]): Promise<void> {
  await AsyncStorage.setItem(POLLS_KEY, JSON.stringify(polls));
}

export async function getStoredResponses(): Promise<PollResponse[]> {
  try {
    const raw = await AsyncStorage.getItem(RESPONSES_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function addResponse(response: PollResponse): Promise<void> {
  const list = await getStoredResponses();
  const filtered = list.filter((r) => r.pollId !== response.pollId);
  filtered.push(response);
  await AsyncStorage.setItem(RESPONSES_KEY, JSON.stringify(filtered));
}

export async function getMyResponse(pollId: string): Promise<PollResponse | null> {
  const list = await getStoredResponses();
  return list.find((r) => r.pollId === pollId) ?? null;
}

/** Stored results for closed polls (device-only: seeded; with backend this comes from API) */
const RESULTS_KEY = '@driverhub_poll_results';

export async function getStoredResults(pollId: string): Promise<PollResults | null> {
  try {
    const raw = await AsyncStorage.getItem(`${RESULTS_KEY}_${pollId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function setStoredResults(pollId: string, results: PollResults): Promise<void> {
  await AsyncStorage.setItem(`${RESULTS_KEY}_${pollId}`, JSON.stringify(results));
}

/** Seed one open and one closed poll so members have something to try */
export async function ensurePollsSeeded(): Promise<Poll[]> {
  const seeded = await AsyncStorage.getItem(SEED_KEY);
  if (seeded === '1') return getStoredPolls();

  const now = new Date();
  const inOneWeek = new Date(now.getTime() + 7 * 86400000);
  const lastWeek = new Date(now.getTime() - 7 * 86400000);

  const openPoll: Poll = {
    id: 'poll-open-1',
    title: 'Preferred meeting format',
    description: 'Help us decide how to run club meetings going forward.',
    startsAt: now.toISOString(),
    endsAt: inOneWeek.toISOString(),
    isAnonymous: true,
    questions: [
      {
        id: 'q1',
        questionText: 'How would you prefer club meetings to be run?',
        type: 'single',
        options: [
          { id: 'opt1', text: 'In person only' },
          { id: 'opt2', text: 'Online only' },
          { id: 'opt3', text: 'Hybrid (in person + online)' },
        ],
      },
    ],
  };

  const closedPoll: Poll = {
    id: 'poll-closed-1',
    title: 'Top priority for the club (sample)',
    description: 'This poll has closed. Results are visible below.',
    startsAt: lastWeek.toISOString(),
    endsAt: lastWeek.toISOString(),
    isAnonymous: true,
    questions: [
      {
        id: 'q1',
        questionText: 'What should the club prioritise next?',
        type: 'single',
        options: [
          { id: 'opt1', text: 'Licensing support' },
          { id: 'opt2', text: 'Training events' },
          { id: 'opt3', text: 'Social events' },
        ],
      },
    ],
  };

  await setStoredPolls([openPoll, closedPoll]);
  await AsyncStorage.setItem(SEED_KEY, '1');

  const closedResults: PollResults = {
    pollId: closedPoll.id,
    totalResponses: 24,
    questionResults: {
      q1: [
        { optionId: 'opt1', count: 12 },
        { optionId: 'opt2', count: 7 },
        { optionId: 'opt3', count: 5 },
      ],
    },
  };
  await setStoredResults(closedPoll.id, closedResults);

  return getStoredPolls();
}
