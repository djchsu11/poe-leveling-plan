import { strFromU8, unzlibSync } from "fflate";
import { XMLParser } from "fast-xml-parser";

export function decodePobImportCode(importCode: string): string {
  const trimmed = importCode.trim().replace(/\s+/g, "");
  if (!trimmed) {
    throw new Error("Import code is empty");
  }

  const base64 = trimmed.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);

  let binary: string;
  try {
    binary = atob(padded);
  } catch {
    throw new Error("Import code is not valid Base64");
  }

  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));

  try {
    return strFromU8(unzlibSync(bytes));
  } catch {
    throw new Error("Failed to decompress PoB import code");
  }
}

export function parsePobXml(xml: string): Record<string, unknown> {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    isArray: (name) =>
      [
        "Skill",
        "SkillSet",
        "Gem",
        "Item",
        "Spec",
        "Socket",
        "ModRange",
      ].includes(name),
  });

  const parsed = parser.parse(xml);
  if (!parsed?.PathOfBuilding) {
    throw new Error("XML is not a Path of Building document");
  }
  return parsed.PathOfBuilding as Record<string, unknown>;
}

export function loadPobDocument(importCode: string): Record<string, unknown> {
  return parsePobXml(decodePobImportCode(importCode));
}
