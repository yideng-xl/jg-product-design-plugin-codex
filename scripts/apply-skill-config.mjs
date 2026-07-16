#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const configPath = path.join(root, "skill-load.config.json");
const skillsRoot = path.join(root, "skills");

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const skills = config.skills || {};

for (const [name, enabled] of Object.entries(skills)) {
  const dir = path.join(skillsRoot, name);
  const active = path.join(dir, "SKILL.md");
  const disabled = path.join(dir, "SKILL.disabled.md");

  if (!fs.existsSync(dir)) {
    throw new Error(`Skill directory not found: ${name}`);
  }

  if (enabled) {
    if (!fs.existsSync(active) && fs.existsSync(disabled)) {
      fs.renameSync(disabled, active);
      console.log(`enabled  ${name}`);
    } else if (fs.existsSync(active)) {
      console.log(`enabled  ${name} (already)`);
    } else {
      throw new Error(`Missing skill file for enabled skill: ${name}`);
    }
    continue;
  }

  if (fs.existsSync(active)) {
    fs.renameSync(active, disabled);
    console.log(`disabled ${name}`);
  } else if (fs.existsSync(disabled)) {
    console.log(`disabled ${name} (already)`);
  } else {
    throw new Error(`Missing skill file for disabled skill: ${name}`);
  }
}
