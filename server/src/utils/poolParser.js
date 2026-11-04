
const { z } = require('zod');
const { ROLES, NATIONALITIES, REQUIRED_ROLES } = require('../constants');

const rowSchema = z.object({
  name: z.string().trim().min(2).max(40),
  role: z.string().trim().toUpperCase().pipe(z.enum(ROLES)),
  nationality: z.string().trim().toUpperCase().pipe(z.enum(NATIONALITIES)),
  rating: z.coerce.number().int().min(1).max(100),
  basePrice: z.coerce.number().min(0.25).max(30),
});


function parseCsv(text) {
  const rows = [];
  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const cells = [];
    let cur = '';
    let quoted = false;
    for (const ch of line) {
      if (ch === '"') quoted = !quoted;
      else if (ch === ',' && !quoted) { cells.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    cells.push(cur.trim());
    rows.push(cells);
  }
  if (!rows.length) return [];
  const header = rows[0].map((h) => h.toLowerCase());
  const idx = (k) => header.indexOf(k.toLowerCase());
  const cols = ['name', 'role', 'nationality', 'rating', 'basePrice'].map(idx);
  if (cols.some((i) => i < 0)) throw new Error('CSV header must be: name,role,nationality,rating,basePrice');
  return rows.slice(1).map((r) => ({
    name: r[cols[0]], role: r[cols[1]], nationality: r[cols[2]], rating: r[cols[3]], basePrice: r[cols[4]],
  }));
}

/**
 * @returns {{players: object[], errors: string[], warnings: string[]}}
 */
function parsePool({ format, data }) {
  const errors = [];
  let raw;
  try {
    raw = format === 'json' ? (typeof data === 'string' ? JSON.parse(data) : data) : parseCsv(data);
  } catch (e) {
    return { players: [], errors: [`Could not parse ${format}: ${e.message}`], warnings: [] };
  }
  if (!Array.isArray(raw)) return { players: [], errors: ['Pool must be an array of players'], warnings: [] };

  const players = [];
  raw.forEach((row, i) => {
    const res = rowSchema.safeParse(row);
    if (res.success) players.push(res.data);
    else errors.push(`Row ${i + 1}: ${res.error.issues.map((x) => `${x.path.join('.')} ${x.message}`).join('; ')}`);
  });

  const warnings = [];
  if (players.length > 200) errors.push('Pool is limited to 200 players');
  for (const r of REQUIRED_ROLES) {
    if (!players.some((p) => p.role === r)) warnings.push(`Pool has no ${r}: teams cannot complete a legal squad`);
  }
  return { players, errors, warnings };
}

module.exports = { parsePool, parseCsv };
