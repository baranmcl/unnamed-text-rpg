import { type Location, type LocationId } from '../../engine/types';
import { family_farm } from './family_farm';
import { dusty_crossroads } from './dusty_crossroads';

export const locations: Record<LocationId, Location> = {
  [family_farm.id]: family_farm,
  [dusty_crossroads.id]: dusty_crossroads
};
