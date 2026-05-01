import type {
  GameState, LogEntry, QuestReward
} from './types';
import { MAX_LOG_ENTRIES } from './types';
import { content } from '../content';
import { evalPredicate } from './story';
import { awardXp } from './progression';

function appendLog(state: GameState, entry: Omit<LogEntry, 'id'>): GameState {
  const id = state.log.length === 0 ? 1 : state.log[state.log.length - 1]!.id + 1;
  const merged = [...state.log, { id, ...entry }];
  return { ...state, log: merged.length > MAX_LOG_ENTRIES ? merged.slice(-MAX_LOG_ENTRIES) : merged };
}

function applyQuestReward(state: GameState, reward: QuestReward): GameState {
  switch (reward.kind) {
    case 'currency':
      return {
        ...state,
        character: { ...state.character, currency: state.character.currency + reward.amount }
      };
    case 'xp':
      return awardXp(state, reward.amount);
    case 'grant_skill':
      if (state.character.knownSkills.includes(reward.skillId)) return state;
      return {
        ...state,
        character: { ...state.character, knownSkills: [...state.character.knownSkills, reward.skillId] }
      };
  }
}

function formatReward(reward: QuestReward): string {
  switch (reward.kind) {
    case 'currency':    return `+${reward.amount} ${reward.amount === 1 ? 'leaf' : 'leaves'}`;
    case 'xp':          return `+${reward.amount} experience`;
    case 'grant_skill': return `learned a new skill`;
  }
}

export function checkQuests(state: GameState): GameState {
  let s = state;
  let changed = true;
  let iters = 0;
  while (changed && iters < 8) {
    changed = false;
    iters++;
    for (const quest of Object.values(content.quests)) {
      const isActive = s.story.activeQuests.includes(quest.id);
      const isCompleted = s.story.completedQuests.includes(quest.id);

      // 1. Activate inactive quests whose activatePredicate is met.
      if (!isActive && !isCompleted) {
        if (quest.activatePredicate.every((p) => evalPredicate(s, p))) {
          s = {
            ...s,
            story: {
              ...s.story,
              activeQuests: [...s.story.activeQuests, quest.id],
              questLogActivityCount: s.story.questLogActivityCount + 1,
            }
          };
          changed = true;
        }
      }

      // 2. Complete the next objective if its predicate is met.
      if (s.story.activeQuests.includes(quest.id)) {
        const done = s.story.completedObjectives[quest.id] ?? [];
        const next = quest.objectives.find((o) => !done.includes(o.id));
        if (next && next.completePredicate.every((p) => evalPredicate(s, p))) {
          s = {
            ...s,
            story: {
              ...s.story,
              completedObjectives: {
                ...s.story.completedObjectives,
                [quest.id]: [...done, next.id]
              },
              questLogActivityCount: s.story.questLogActivityCount + 1,
            }
          };
          changed = true;
        }
      }

      // 3. Complete the quest if all objectives are done; apply rewards.
      if (s.story.activeQuests.includes(quest.id)) {
        const done = s.story.completedObjectives[quest.id] ?? [];
        if (done.length === quest.objectives.length) {
          s = {
            ...s,
            story: {
              ...s.story,
              activeQuests: s.story.activeQuests.filter((id) => id !== quest.id),
              completedQuests: [...s.story.completedQuests, quest.id]
            }
          };
          for (const reward of quest.rewards ?? []) {
            s = applyQuestReward(s, reward);
          }
          s = appendLog(s, { kind: 'system', systemLabel: 'QUEST', text: `Quest complete: ${quest.title}.` });
          if (quest.rewards && quest.rewards.length > 0) {
            const summary = quest.rewards.map(formatReward).join(', ');
            s = appendLog(s, { kind: 'system', systemLabel: 'REWARD', text: summary });
          }
          changed = true;
        }
      }
    }
  }
  return s;
}
