import { type Location, type LocationId } from '../../engine/types';
import { family_farm } from './family_farm';
import { dusty_crossroads } from './dusty_crossroads';
import { quartermasters_yard } from './quartermasters_yard';
import { burning_library } from './burning_library';
import { tavern_dressing_room } from './tavern_dressing_room';
import { the_old_road } from './the_old_road';
import { the_threshold } from './the_threshold';
import { veterans_chapel } from './veterans_chapel';
import { quiet_tower } from './quiet_tower';
import { laureates_salon } from './laureates_salon';
import { hedgerow_lane } from './hedgerow_lane';
import { back_field } from './back_field';
import { chicken_coop } from './chicken_coop';
import { old_well } from './old_well';
import { family_kitchen } from './family_kitchen';

export const locations: Record<LocationId, Location> = {
  [family_farm.id]: family_farm,
  [dusty_crossroads.id]: dusty_crossroads,
  [quartermasters_yard.id]: quartermasters_yard,
  [burning_library.id]: burning_library,
  [tavern_dressing_room.id]: tavern_dressing_room,
  [the_old_road.id]: the_old_road,
  [the_threshold.id]: the_threshold,
  [veterans_chapel.id]: veterans_chapel,
  [quiet_tower.id]: quiet_tower,
  [laureates_salon.id]: laureates_salon,
  [hedgerow_lane.id]: hedgerow_lane,
  [back_field.id]: back_field,
  [chicken_coop.id]: chicken_coop,
  [old_well.id]: old_well,
  [family_kitchen.id]: family_kitchen,
};
