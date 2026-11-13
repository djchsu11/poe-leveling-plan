export type PrimaryAttr = "strength" | "dexterity" | "intelligence" | "none" | string;

export interface QuestReward {
  quest: string;
  act: string | number;
  classes: string[];
}

export interface VendorReward {
  npc: string;
  quest: string;
  act: string | number;
  classes: string[];
}

export interface GemInfo {
  name: string;
  required_level: string | number;
  primary_attr: PrimaryAttr;
  quest_rewards: QuestReward[];
  vendor_rewards: VendorReward[];
}

export interface GemDatabase {
  gems: GemInfo[];
}

export type AcquisitionKind = "quest" | "vendor";

export interface GemAcquisition {
  kind: AcquisitionKind;
  act: number;
  quest: string;
  npc?: string;
  gemName: string;
  primaryAttr: PrimaryAttr;
  requiredLevel: number;
}

export type SocketColor = "R" | "G" | "B" | "W";

export function attrToColor(attr: PrimaryAttr): SocketColor {
  switch (String(attr).toLowerCase()) {
    case "strength":
    case "str":
      return "R";
    case "dexterity":
    case "dex":
      return "G";
    case "intelligence":
    case "int":
      return "B";
    default:
      return "W";
  }
}
