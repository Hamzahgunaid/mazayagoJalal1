const fs = require('node:fs');
const path = require('node:path');

const roots = ['src'];
const bad = [];

function hasMergeMarker(text) {
  return text.split(/\r?\n/).some((line) => /^(<<<<<<<|=======|>>>>>>>)$/.test(line.trim()));
}

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      walk(full);
      continue;
    }

    if (!/\.(ts|tsx|js|jsx|css|md|json)$/i.test(ent.name)) continue;
    const txt = fs.readFileSync(full, 'utf8');
    if (hasMergeMarker(txt)) bad.push(full);
  }
}

for (const root of roots) {
  if (fs.existsSync(root)) walk(root);
}

if (bad.length) {
  console.error(`Merge markers found:\n${bad.join('\n')}`);
  process.exit(1);
}
