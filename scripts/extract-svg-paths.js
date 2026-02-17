const fs = require('fs');
const content = fs.readFileSync('docs/examples/muscleGroupsMap/musclegroupbody.tsx', 'utf-8');

// Remove comment prefixes
const clean = content.replace(/^\/\/\s?/gm, '');

// Extract groups with their IDs
const groupRegex = /<g id="([^"]+)"[^>]*>([\s\S]*?)<\/g>/g;
let match;
const allGroups = [];

while ((match = groupRegex.exec(clean)) !== null) {
  const id = match[1];
  const body = match[2];

  const pathRegex = /<path\s+([\s\S]*?)\/>/g;
  let pathMatch;
  const fillPaths = [];
  const strokeOnlyPaths = [];
  const outlineFills = [];
  const outlineStrokes = [];
  let muscleKey = null;

  while ((pathMatch = pathRegex.exec(body)) !== null) {
    const attrs = pathMatch[1];
    const dMatch = attrs.match(/d="([^"]+)"/);
    if (!dMatch) continue;
    const d = dMatch[1];

    const hasFillColor = attrs.includes('getMuscleColor');
    const hasFill464 = attrs.includes('fill="#464646"');
    const hasStroke = attrs.includes('stroke="black"');
    const hasStrokeWidth = attrs.includes('strokeWidth');

    const keyMatch = attrs.match(/getMuscleColor\("([^"]+)"/);
    if (keyMatch) muscleKey = keyMatch[1];

    if (hasFillColor) {
      fillPaths.push(d);
    } else if (hasFill464) {
      outlineFills.push(d);
    } else if (hasStroke && hasStrokeWidth) {
      outlineStrokes.push(d);
    } else if (hasStroke) {
      strokeOnlyPaths.push(d);
    }
  }

  allGroups.push({ id, muscleKey: muscleKey || id, fillPaths, strokeOnlyPaths, outlineFills, outlineStrokes });
}

// Manually extract outline-front which gets skipped by the global regex
const outlineFrontMatch = clean.match(/<g id="outline-front"[^>]*>([\s\S]*?)<\/g>/);
if (outlineFrontMatch) {
  const body = outlineFrontMatch[1];
  const pathRegex2 = /<path\s+([\s\S]*?)\/>/g;
  let pm;
  const fills = [];
  const strokes = [];
  while ((pm = pathRegex2.exec(body)) !== null) {
    const attrs = pm[1];
    const dMatch = attrs.match(/d="([^"]+)"/);
    if (!dMatch) continue;
    const d = dMatch[1];
    if (attrs.includes('fill="#464646"')) fills.push(d);
    else if (attrs.includes('stroke=')) strokes.push(d);
  }
  allGroups.push({ id: 'outline-front', muscleKey: 'outline-front', fillPaths: [], strokeOnlyPaths: strokes, outlineFills: fills, outlineStrokes: [] });
}

// Combine muscle groups by muscleKey
const muscleData = {};
const frontOutlineFills = [];
const frontOutlineStrokes = [];
const backOutlineFills = [];
const backOutlineStrokes = [];

for (const g of allGroups) {
  // Skip container groups
  if (g.id === 'body-front-back') continue;

  // Handle outlines
  if (g.id === 'outline-front' || g.id === 'front-outline-body') {
    frontOutlineFills.push(...g.outlineFills);
    frontOutlineStrokes.push(...g.outlineStrokes, ...g.strokeOnlyPaths);
    continue;
  }
  if (g.id === 'outline-back' || g.id === 'back-outline-body') {
    backOutlineFills.push(...g.outlineFills);
    backOutlineStrokes.push(...g.outlineStrokes, ...g.strokeOnlyPaths);
    continue;
  }

  // Muscle groups
  if (g.fillPaths.length > 0) {
    const key = g.muscleKey;
    if (!muscleData[key]) {
      muscleData[key] = { fillPaths: [], strokePaths: [] };
    }
    muscleData[key].fillPaths.push(...g.fillPaths);
    muscleData[key].strokePaths.push(...g.strokeOnlyPaths);
  }
}

// Generate TypeScript file
let output = `/**
 * SVG Path Data for Muscle Group Body Map
 *
 * Auto-generated from docs/examples/muscleGroupsMap/musclegroupbody.tsx
 * DO NOT EDIT MANUALLY
 */

`;

function pathArray(paths, varName) {
  if (paths.length === 0) return `export const ${varName}: string[] = []\n`;
  let s = `export const ${varName}: string[] = [\n`;
  for (const p of paths) {
    s += `  '${p.replace(/'/g, "\\'")}',\n`;
  }
  s += `]\n`;
  return s;
}

output += pathArray(frontOutlineFills, 'FRONT_BODY_OUTLINE');
output += '\n';
output += pathArray(frontOutlineStrokes, 'FRONT_OUTLINE_STROKES');
output += '\n';
output += pathArray(backOutlineFills, 'BACK_BODY_OUTLINE');
output += '\n';
output += pathArray(backOutlineStrokes, 'BACK_OUTLINE_STROKES');
output += '\n';

// Muscle paths record
output += `interface MusclePathData {\n  fillPaths: string[]\n  strokePaths: string[]\n}\n\n`;
output += `export const MUSCLE_PATHS: Record<string, MusclePathData> = {\n`;

const keyOrder = [
  'shins', 'calves', 'quads', 'adductors', 'abductors',
  'core', 'chest', 'traps', 'front-delts', 'side-delts',
  'biceps', 'forearms', 'hamstrings', 'glutes', 'lower-back',
  'triceps', 'lats', 'upper-back', 'rear-delts',
];

for (const key of keyOrder) {
  const data = muscleData[key];
  if (!data) {
    console.error(`WARNING: No data for muscle key: ${key}`);
    continue;
  }
  output += `  '${key}': {\n`;
  output += `    fillPaths: [\n`;
  for (const p of data.fillPaths) {
    output += `      '${p.replace(/'/g, "\\'")}',\n`;
  }
  output += `    ],\n`;
  output += `    strokePaths: [\n`;
  for (const p of data.strokePaths) {
    output += `      '${p.replace(/'/g, "\\'")}',\n`;
  }
  output += `    ],\n`;
  output += `  },\n`;
}

output += `}\n`;

// Print summary
console.log('Front outline fills:', frontOutlineFills.length);
console.log('Front outline strokes:', frontOutlineStrokes.length);
console.log('Back outline fills:', backOutlineFills.length);
console.log('Back outline strokes:', backOutlineStrokes.length);
console.log('\nMuscle groups:');
for (const key of keyOrder) {
  const data = muscleData[key];
  if (data) {
    console.log(`  ${key}: ${data.fillPaths.length} fills, ${data.strokePaths.length} strokes`);
  }
}

fs.writeFileSync('src/components/features/workouts/MuscleGroupBodyPaths.tsx', output);
console.log('\nWritten to src/components/features/workouts/MuscleGroupBodyPaths.tsx');
