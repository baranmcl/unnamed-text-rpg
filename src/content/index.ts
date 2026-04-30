import type {
  CharacterClass, ClassId,
  Encounter, EncounterId,
  Item, ItemId,
  Location, LocationId,
  Monster, MonsterId,
  NarrativeNode, NarrativeNodeId,
  NarrativeResolver, NarrativeResolverId,
  Skill, SkillId,
  StoryBeat, BeatId
} from '../engine/types';

// Each per-type file exports a single object literal keyed by id.
// We re-export them aggregated here for the engine to consume.

import { items } from './items';
import { monsters } from './monsters';
import { encounters } from './encounters';
import { locations } from './locations';
import { classes } from './classes';
import { skills } from './skills';
import { beats } from './story/beats';
import { narrativeNodes } from './narrative/nodes';
import { narrativeResolvers } from './narrative/resolvers';
import { skillResolvers } from './skills/resolvers';

export const content = {
  items: items as Record<ItemId, Item>,
  monsters: monsters as Record<MonsterId, Monster>,
  encounters: encounters as Record<EncounterId, Encounter>,
  locations: locations as Record<LocationId, Location>,
  classes: classes as Record<ClassId, CharacterClass>,
  skills: skills as Record<SkillId, Skill>,
  beats: beats as Record<BeatId, StoryBeat>,
  narrativeNodes: narrativeNodes as Record<NarrativeNodeId, NarrativeNode>,
  narrativeResolvers: narrativeResolvers as Record<NarrativeResolverId, NarrativeResolver>
};

export class ContentValidationError extends Error {}

export function validateContent(): void {
  const errors: string[] = [];

  // Every monster's loot must reference real items.
  for (const monster of Object.values(content.monsters)) {
    for (const entry of monster.loot) {
      if (!(entry.itemId in content.items)) {
        errors.push(`Monster ${monster.id} loot references unknown item ${entry.itemId}.`);
      }
    }
  }

  // Every combat encounter must reference a real monster.
  for (const enc of Object.values(content.encounters)) {
    if (enc.kind === 'combat' && !(enc.monsterId in content.monsters)) {
      errors.push(`Encounter ${enc.id} references unknown monster ${enc.monsterId}.`);
    }
  }

  // Every location's exits and encounters must resolve.
  for (const loc of Object.values(content.locations)) {
    for (const exit of loc.exits) {
      if (!(exit.targetId in content.locations)) {
        // Exits to unimplemented locations are allowed if they are gated
        // off by a flag (Plan 5 will fill in the rest of the world).
        if (!exit.visibleIfFlag) {
          errors.push(`Location ${loc.id} exit "${exit.label}" → unknown ${exit.targetId} (and not flag-gated).`);
        }
      }
    }
    for (const encId of loc.encounterIds ?? []) {
      if (!(encId in content.encounters)) {
        errors.push(`Location ${loc.id} encounter list references unknown ${encId}.`);
      }
    }
  }

  // Every class must reference a real opening location and have valid starting items.
  for (const cls of Object.values(content.classes)) {
    if (!(cls.openingLocationId in content.locations)) {
      errors.push(`Class ${cls.id} openingLocationId references unknown ${cls.openingLocationId}.`);
    }
    if (!(cls.signatureMove in content.skills)) {
      errors.push(`Class ${cls.id} signatureMove references unknown skill ${cls.signatureMove}.`);
    }
    if (!(cls.openingNarrativeNodeId in content.narrativeNodes)) {
      errors.push(`Class ${cls.id} openingNarrativeNodeId references unknown ${cls.openingNarrativeNodeId}.`);
    }
    for (const startItem of cls.startingItems) {
      if (!(startItem.itemId in content.items)) {
        errors.push(`Class ${cls.id} startingItems references unknown ${startItem.itemId}.`);
      }
    }
  }

  // Every Skill's resolverId must be registered.
  for (const skill of Object.values(content.skills)) {
    if (!(skill.resolverId in skillResolvers)) {
      errors.push(`Skill ${skill.id} resolverId ${skill.resolverId} is not registered.`);
    }
  }

  if (errors.length > 0) {
    if (import.meta.env.MODE === 'development') {
      throw new ContentValidationError(`Content validation failed:\n  - ${errors.join('\n  - ')}`);
    } else {
      // eslint-disable-next-line no-console
      console.warn(`Content validation warnings:\n  - ${errors.join('\n  - ')}`);
    }
  }
}
