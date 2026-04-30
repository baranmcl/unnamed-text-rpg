// =====================================================================
// Heroic Chronicle — engine type definitions
// =====================================================================
// All identifiers are nominal-typed branded strings so the compiler
// catches "you passed a LocationId where an ItemId was expected".
// =====================================================================

declare const __brand: unique symbol;
type Brand<K, T> = K & { readonly [__brand]: T };

export type LocationId = Brand<string, 'LocationId'>;
export type MonsterId = Brand<string, 'MonsterId'>;
export type ItemId = Brand<string, 'ItemId'>;
export type ClassId = Brand<string, 'ClassId'>;
export type SkillId = Brand<string, 'SkillId'>;
export type BeatId = Brand<string, 'BeatId'>;
export type EncounterId = Brand<string, 'EncounterId'>;
export type NarrativeNodeId = Brand<string, 'NarrativeNodeId'>;
export type QuestId = Brand<string, 'QuestId'>;
export type NpcId = Brand<string, 'NpcId'>;

// Helper constructors used in content files.
export const LocationId = (s: string) => s as LocationId;
export const MonsterId = (s: string) => s as MonsterId;
export const ItemId = (s: string) => s as ItemId;
export const ClassId = (s: string) => s as ClassId;
export const SkillId = (s: string) => s as SkillId;
export const BeatId = (s: string) => s as BeatId;
export const EncounterId = (s: string) => s as EncounterId;
export const NarrativeNodeId = (s: string) => s as NarrativeNodeId;
export const QuestId = (s: string) => s as QuestId;
export const NpcId = (s: string) => s as NpcId;

// =====================================================================
// Acts (hero's-journey stages collapsed to six)
// =====================================================================

export type ActId =
  | 'act_i'
  | 'act_ii'
  | 'act_iii'
  | 'act_iv'
  | 'act_v'
  | 'act_vi';

export const ACT_TITLES: Record<ActId, string> = {
  act_i: 'Act I · The Call to Adventure',
  act_ii: 'Act II · Tests, Allies, and Enemies',
  act_iii: 'Act III · The Approach',
  act_iv: 'Act IV · The Ordeal',
  act_v: 'Act V · The Return',
  act_vi: 'Act VI · Return with the Elixir'
};

// =====================================================================
// Stat block (the four Bs)
// =====================================================================

export type StatBlock = {
  brawn: number;
  brains: number;
  bravado: number;
  bluck: number;
};

export type EquipSlot = 'weapon' | 'armor' | 'trinket';

// =====================================================================
// Status effects
// =====================================================================

export type StatusKind =
  | 'weakness_revealed'      // monster: subsequent player attacks deal +50%
  | 'intimidated'            // monster: skips turn(s)
  | 'guaranteed_crit'        // player: next attack auto-crits, then expires
  | 'next_attack_misses'     // player: next attack auto-misses, then expires
  | 'skip_turn'              // player or monster: skips next turn(s)
  | 'weapon_suspended'       // player: weapon damage = 0 while active
  | 'armor_halved'           // player: armor halved while active
  | 'free_retaliation';      // monster: takes a free attack now, then expires

export type StatusDuration =
  | { kind: 'turns'; remaining: number }
  | { kind: 'until_end_of_fight' }
  | { kind: 'one_shot' }
  | { kind: 'fights_remaining'; n: number }
  | { kind: 'permanent' };

export type Status = {
  id: number;
  kind: StatusKind;
  duration: StatusDuration;
  source: string;
  magnitude?: number;
};

// =====================================================================
// Items, monsters, locations (content-side)
// =====================================================================

export type ItemKind = 'weapon' | 'armor' | 'trinket' | 'consumable' | 'quest';

export type ItemEffect =
  | { kind: 'heal_hp'; amount: number }
  | { kind: 'heal_mp'; amount: number }
  | { kind: 'set_flag'; flag: string; value: boolean | number | string };

export type Item = {
  id: ItemId;
  name: string;
  flavor: string;
  kind: ItemKind;
  slot?: EquipSlot;
  damage?: number;       // weapons only
  armor?: number;        // armor only
  statBonuses?: Partial<StatBlock>;
  effects?: ItemEffect[];
};

export type MonsterAction =
  | { kind: 'attack'; weight: number; flavor: string }
  | { kind: 'special'; weight: number; flavor: string; damageBonus: number }
  | { kind: 'flee_if_low_hp'; weight: number; flavor: string };

export type LootTableEntry = { itemId: ItemId; chance: number };

export type Monster = {
  id: MonsterId;
  name: string;
  flavor: string;
  defeatedFlavor: string;   // log entry shown on victory, before XP/loot
  hp: number;
  brawn: number;
  bravado: number;
  dodge: number;
  armor: number;
  weaponDamage: number;
  actions: MonsterAction[];
  loot: LootTableEntry[];
  noFlee?: boolean;
  currencyDrop?: { min: number; max: number };
};

export type Exit = {
  label: string;
  targetId: LocationId;
  visibleIfFlag?: string;
  visibleIfVisited?: LocationId; // exit only renders if the player has visited this location
  enabledIfFlag?: string;       // if set and not satisfied, exit shows as disabled
  disabledTooltip?: string;     // tooltip text when disabled
};

export type RestSpot = {
  id: string;
  label: string;          // "Rest in the haystack"
  flavor: string;         // narration entry shown when used
};

export type Location = {
  id: LocationId;
  name: string;
  act: ActId;
  description: string;
  reEntryDescription?: string;
  exits: Exit[];
  encounterIds?: EncounterId[];
  npcIds?: NpcId[];
  restSpots?: RestSpot[];
};

export type CharacterClass = {
  id: ClassId;
  name: string;
  epithet: string;
  startingStats: StatBlock;
  baseHp: number;
  baseMp: number;
  startingItems: Array<{ itemId: ItemId; equipped?: boolean; qty?: number }>;
  signatureMove: SkillId;
  openingLocationId: LocationId;
  openingNarrativeNodeId: NarrativeNodeId;
};

// =====================================================================
// Skills
// =====================================================================

export type SkillResolverId = string;

export type Skill = {
  id: SkillId;
  name: string;                  // "Tempt Fate"
  description: string;           // tooltip text
  mpCost: number;
  scalingStat: keyof StatBlock;  // 'bluck'
  unlockLevel: number;           // 3 in v1
  resolverId: SkillResolverId;
};

export type SkillResolver = (state: GameState) => GameState;

// =====================================================================
// Encounters
// =====================================================================

export type CombatEncounter = {
  id: EncounterId;
  kind: 'combat';
  monsterId: MonsterId;
  noFlee?: boolean;
  xpReward: number;
  repeatable?: boolean;
  endsByReasoning?: boolean;   // NEW: Out-Think It auto-resolves the fight as victory
};

// =====================================================================
// Narrative encounters (Plan 3)
// =====================================================================

export type NarrativeResolverId = string;

export type NarrativeChoice = {
  label: string;
  visible?: Predicate;
  disabledIfFlag?: string;       // if this flag is truthy, choice renders disabled
  disabledTooltip?: string;      // tooltip shown when disabled
  resolve: NarrativeResolverId;
};

export type NarrativeNode = {
  id: NarrativeNodeId;
  speaker?: string;          // small-caps speaker attribution above prose
  prose: string;
  choices: NarrativeChoice[];
};

export type NarrativeEncounter = {
  id: EncounterId;
  kind: 'narrative';
  rootNodeId: NarrativeNodeId;
  noFlee?: boolean;
};

export type NarrativeResolver = (state: GameState) => { state: GameState; next: NarrativeNodeId | null };

export type Encounter = CombatEncounter | NarrativeEncounter;

// =====================================================================
// Combat helpers
// =====================================================================

export type CombatActionResult = {
  hit: boolean;
  crit: boolean;
  damage: number;
};

// =====================================================================
// State
// =====================================================================

export type LogEntryKind =
  | 'narration'
  | 'dialogue'
  | 'system'
  | 'combat'
  | 'loot'
  | 'scene-divider'
  | 'act-banner';

export type LogEntry = {
  id: number;            // monotonically increasing
  kind: LogEntryKind;
  text: string;
  speaker?: string;      // dialogue only
  systemLabel?: string;  // system only (e.g. "EXP.", "OFFERED")
};

export type CombatState =
  | TurnBasedCombatState
  | NarrativeCombatState;

export type TurnBasedCombatState = {
  kind: 'turn-based';
  encounterId: EncounterId;
  combatants: Array<{
    id: 'player' | string;
    kind: 'player' | 'monster';
    hp: number;
    initiative: number;
    statuses: Status[];        // NEW
  }>;
  turnIndex: number;
  round: number;
};

export type NarrativeCombatState = {
  kind: 'narrative';
  encounterId: EncounterId;
  currentNodeId: NarrativeNodeId;
};

export type GameState = {
  version: number;
  rng: { seed: number; step: number };
  character: {
    name: string;
    classId: ClassId;
    level: number;
    xp: number;
    hp: { current: number; max: number };
    mp: { current: number; max: number };
    stats: StatBlock;
    equipment: { weapon?: ItemId; armor?: ItemId; trinket?: ItemId };
    inventory: Array<{ itemId: ItemId; qty: number }>;
    knownSkills: SkillId[];
    currency: number;
    statuses: Status[];        // NEW: world-scoped statuses only
  };
  world: {
    currentLocation: LocationId;
    visited: LocationId[]; // sorted; in-memory representation matches save format
    flags: Record<string, boolean | number | string>;
  };
  story: {
    stage: ActId;
    currentBeat: BeatId | null;
    completedBeats: BeatId[];
    activeQuests: QuestId[];
  };
  combat: CombatState | null;
  log: LogEntry[]; // capped at MAX_LOG_ENTRIES
  settings: {
    theme: 'parchment' | 'moonlit';
    textSize: 'small' | 'medium' | 'large';
    autoSave: boolean;
  };
};

export const MAX_LOG_ENTRIES = 200;
export const SAVE_VERSION = 2;

// =====================================================================
// Story beats (Plan 3)
// =====================================================================

export type Predicate =
  | { kind: 'flag'; flag: string; equals?: boolean | number | string }
  | { kind: 'visited'; locationId: LocationId }
  | { kind: 'beat_completed'; beatId: BeatId }
  | { kind: 'stage'; stage: ActId };

export type BeatEffect =
  | { kind: 'set_flag'; flag: string; value: boolean | number | string }
  | { kind: 'grant_item'; itemId: ItemId; qty?: number }
  | { kind: 'advance_stage'; stage: ActId }
  | { kind: 'log'; entry: Omit<LogEntry, 'id'> }
  | { kind: 'trigger_encounter'; encounterId: EncounterId };

export type StoryBeat = {
  id: BeatId;
  stage: ActId;
  preconditions: Predicate[];   // ALL must be true for the beat to fire
  onTrigger: BeatEffect[];
  transitionAnim?: 'actMarker' | 'giltUnfurl' | 'refusalRewind';
};
