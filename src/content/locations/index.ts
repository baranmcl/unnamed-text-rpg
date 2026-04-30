import { type Location, type LocationId } from '../../engine/types';
import { family_farm } from './family_farm';
import { dusty_crossroads } from './dusty_crossroads';
import { quartermasters_yard } from './quartermasters_yard';
import { burning_library } from './burning_library';

export const locations: Record<LocationId, Location> = {
  [family_farm.id]: family_farm,
  [dusty_crossroads.id]: dusty_crossroads,
  [quartermasters_yard.id]: quartermasters_yard,
  [burning_library.id]: burning_library
};
