import { type Location, type LocationId } from '../../engine/types';
import { family_farm } from './family_farm';
import { dusty_crossroads } from './dusty_crossroads';
import { quartermasters_yard } from './quartermasters_yard';
import { burning_library } from './burning_library';
import { tavern_dressing_room } from './tavern_dressing_room';
import { the_old_road } from './the_old_road';
import { the_threshold } from './the_threshold';

export const locations: Record<LocationId, Location> = {
  [family_farm.id]: family_farm,
  [dusty_crossroads.id]: dusty_crossroads,
  [quartermasters_yard.id]: quartermasters_yard,
  [burning_library.id]: burning_library,
  [tavern_dressing_room.id]: tavern_dressing_room,
  [the_old_road.id]: the_old_road,
  [the_threshold.id]: the_threshold,
};
