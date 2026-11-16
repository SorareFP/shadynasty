// Recommended depth chart: Air Raid offense and 3-3-5 Tite defense.
//
// Rostered players carry ratings but no archetype, so each spot is scored from
// the ratings that the scheme videos say matter there. The weights are this
// site's own reading of that advice, not something the game reports.

const RATING_LABELS = {
  PSPD: 'Speed', PACC: 'Acceleration', PAGI: 'Agility', CODR: 'Change of direction', PSTR: 'Strength',
  PAWR: 'Awareness', PJMP: 'Jumping', PCTH: 'Catching', PLCI: 'Catch in traffic', PLSC: 'Spectacular catch',
  PRRS: 'Short routes', PRRM: 'Medium routes', PRRD: 'Deep routes', PLRL: 'Release', PBSG: 'Block shedding',
  PLPM: 'Power moves', PFMS: 'Finesse moves', PTAK: 'Tackle', PLPU: 'Pursuit', PLHT: 'Hit power',
  PLZC: 'Zone coverage', PLMC: 'Man coverage', PLPE: 'Press', PLPR: 'Play recognition', PPBK: 'Pass block',
  PPBF: 'Pass block finesse', PPBP: 'Pass block power', PRBK: 'Run block', PRBP: 'Run block power',
  PLIB: 'Impact block', PTAS: 'Short accuracy', PTAM: 'Medium accuracy', PTAD: 'Deep accuracy',
  PTHP: 'Throw power', PTUP: 'Throw under pressure', PBCV: 'Ball carrier vision', PCAR: 'Carrying',
  PKPR: 'Kick power', PKAC: 'Kick accuracy',
};

const group = (...names) => (p) => names.includes(p.position);
// EA position codes 10 and 11 are the two defensive ends.
const isEdge = (p) => p.position === 'DL' && (p.positionCode === 10 || p.positionCode === 11);

// Extra points for size, where the videos ask for it.
const tall = (inches, from) => Math.max(0, Math.min(6, (inches ?? 0) - from)) * 0.7;
const heavy = (pounds) => ((pounds ?? 0) >= 300 ? 6 : (pounds ?? 0) >= 290 ? 0 : -12);

export const SLOTS = [
  // --- Offense: Air Raid ---
  { key: 'QB', side: 'offense', label: 'Quarterback', depth: 2, pool: group('QB'),
    want: 'A pocket passer: accuracy first, then arm strength.',
    weights: { PTAS: 0.3, PTAM: 0.25, PTAD: 0.15, PTHP: 0.15, PTUP: 0.1, PAWR: 0.05 } },
  { key: 'F', side: 'offense', label: 'Running back (F)', depth: 2, pool: group('HB'),
    want: 'A back who catches: hands and routes matter as much as running.',
    weights: { PCTH: 0.25, PSPD: 0.2, PRRS: 0.15, CODR: 0.15, PACC: 0.1, PBCV: 0.1, PCAR: 0.05 } },
  { key: 'Y', side: 'offense', label: 'Inside receiver, right (Y)', depth: 2, pool: group('WR', 'TE'),
    want: 'Your best receiver: routes, hands and catching in traffic over the middle.',
    weights: { PRRS: 0.2, PRRM: 0.2, PCTH: 0.2, PLCI: 0.2, PLRL: 0.1, CODR: 0.1 }, bonus: (p) => tall(p.heightInches, 73) },
  { key: 'X', side: 'offense', label: 'Outside receiver, left (X)', depth: 2, pool: group('WR'),
    want: 'The deep threat: the fastest receiver you have.',
    weights: { PSPD: 0.4, PRRD: 0.2, PACC: 0.15, PCTH: 0.15, PLRL: 0.1 } },
  { key: 'Z', side: 'offense', label: 'Outside receiver, right (Z)', depth: 2, pool: group('WR', 'TE'),
    want: 'The big possession receiver who beats press and wins jump balls.',
    weights: { PLRL: 0.2, PLCI: 0.2, PCTH: 0.15, PRRM: 0.15, PLSC: 0.15, PJMP: 0.15 }, bonus: (p) => tall(p.heightInches, 73) * 1.5 },
  { key: 'H', side: 'offense', label: 'Inside receiver, left (H)', depth: 2, pool: group('WR', 'HB'),
    want: 'The quick slot: short and medium routes, agility and change of direction.',
    weights: { PRRS: 0.25, PRRM: 0.2, PAGI: 0.2, CODR: 0.15, PACC: 0.1, PCTH: 0.1 } },
  { key: 'TE', side: 'offense', label: 'Tight end', depth: 2, pool: group('TE'),
    want: 'Not used in four-receiver Air Raid sets; this is for playbooks with a tight end.',
    weights: { PCTH: 0.3, PRRM: 0.2, PRBK: 0.2, PLCI: 0.15, PSPD: 0.15 } },
  { key: 'LT', side: 'offense', label: 'Left tackle', depth: 2, pool: group('OL'),
    want: 'A pass protector.',
    weights: { PPBK: 0.35, PPBF: 0.2, PPBP: 0.2, PRBK: 0.15, PSTR: 0.1 } },
  { key: 'RT', side: 'offense', label: 'Right tackle', depth: 2, pool: group('OL'),
    want: 'A pass protector.',
    weights: { PPBK: 0.35, PPBF: 0.2, PPBP: 0.2, PRBK: 0.15, PSTR: 0.1 } },
  { key: 'LG', side: 'offense', label: 'Left guard', depth: 2, pool: group('OL'),
    want: 'Well rounded: holds up against power rushers and blocks inside zone.',
    weights: { PPBK: 0.3, PRBK: 0.3, PPBP: 0.15, PRBP: 0.15, PSTR: 0.1 } },
  { key: 'RG', side: 'offense', label: 'Right guard', depth: 2, pool: group('OL'),
    want: 'Well rounded: holds up against power rushers and blocks inside zone.',
    weights: { PPBK: 0.3, PRBK: 0.3, PPBP: 0.15, PRBP: 0.15, PSTR: 0.1 } },
  { key: 'C', side: 'offense', label: 'Center', depth: 2, pool: group('OL'),
    want: 'Raw strength, to take on the nose tackle one-on-one.',
    weights: { PSTR: 0.35, PRBK: 0.25, PPBK: 0.2, PLIB: 0.1, PAWR: 0.1 } },

  // --- Defense: 3-3-5 Tite ---
  // The nose is filled before the other linemen: the defense starts with him.
  { key: 'NT', side: 'defense', label: 'Nose tackle', depth: 2, first: true, pool: group('DL'),
    want: 'A 300-pound space eater who holds the middle against double teams.',
    weights: { PSTR: 0.45, PBSG: 0.35, PLPM: 0.2 }, bonus: (p) => heavy(p.weightPounds) },
  { key: 'DT1', side: 'defense', label: 'Interior tackle (4i)', depth: 2, pool: group('DL'),
    want: 'Sheds blocks and closes the B gap; rotate these to keep them fresh.',
    weights: { PBSG: 0.3, PLPM: 0.25, PSTR: 0.2, PTAK: 0.15, PLPU: 0.1 } },
  { key: 'DT2', side: 'defense', label: 'Interior tackle (4i)', depth: 2, pool: group('DL'),
    want: 'Sheds blocks and closes the B gap; rotate these to keep them fresh.',
    weights: { PBSG: 0.3, PLPM: 0.25, PSTR: 0.2, PTAK: 0.15, PLPU: 0.1 } },
  { key: 'JACK', side: 'defense', label: 'Jack (SAM on the edge)', depth: 2, pool: (p) => group('LB', 'S')(p) || isEdge(p),
    want: 'A thumper who sets the edge, rushes and can drop into zone. A big box safety can play here.',
    weights: { PBSG: 0.2, PLHT: 0.2, PTAK: 0.15, PLPU: 0.15, PLZC: 0.1, PSTR: 0.1, PLPM: 0.1 } },
  { key: 'WILL', side: 'defense', label: 'WILL on the edge', depth: 2, pool: (p) => group('LB')(p) || isEdge(p),
    want: 'The second on-ball linebacker: a thumper who can also drop into coverage.',
    weights: { PBSG: 0.2, PLHT: 0.2, PTAK: 0.15, PLPU: 0.15, PLZC: 0.1, PSTR: 0.1, PLPM: 0.1 } },
  { key: 'MIKE1', side: 'defense', label: 'Mike linebacker', depth: 2, pool: group('LB'),
    want: 'An off-ball coverage linebacker: zone, speed and change of direction.',
    weights: { PLZC: 0.2, PLMC: 0.15, PSPD: 0.15, CODR: 0.15, PLPR: 0.15, PTAK: 0.1, PLPU: 0.1 } },
  { key: 'MIKE2', side: 'defense', label: 'Mike linebacker', depth: 2, pool: group('LB'),
    want: 'An off-ball coverage linebacker: zone, speed and change of direction.',
    weights: { PLZC: 0.2, PLMC: 0.15, PSPD: 0.15, CODR: 0.15, PLPR: 0.15, PTAK: 0.1, PLPU: 0.1 } },
  { key: 'CB1', side: 'defense', label: 'Corner', depth: 2, pool: group('CB'),
    want: 'Man coverage first (it drives match coverage), then zone, change of direction and speed.',
    weights: { PLMC: 0.3, PLZC: 0.15, CODR: 0.2, PSPD: 0.2, PACC: 0.1, PLPE: 0.05 } },
  { key: 'CB2', side: 'defense', label: 'Corner', depth: 2, pool: group('CB'),
    want: 'Man coverage first (it drives match coverage), then zone, change of direction and speed.',
    weights: { PLMC: 0.3, PLZC: 0.15, CODR: 0.2, PSPD: 0.2, PACC: 0.1, PLPE: 0.05 } },
  { key: 'NB', side: 'defense', label: 'Slot corner', depth: 2, pool: group('CB', 'S'),
    want: 'Covers the slot in man and gets off the snap quickly when you blitz him.',
    weights: { PLMC: 0.3, PACC: 0.2, CODR: 0.2, PSPD: 0.15, PLPE: 0.15 } },
  { key: 'FS', side: 'defense', label: 'Free safety', depth: 2, pool: group('S'),
    want: 'A hybrid: covers in man and zone and still fits the run.',
    weights: { PLMC: 0.2, PLZC: 0.2, PSPD: 0.2, PTAK: 0.15, PLPR: 0.15, PLHT: 0.1 } },
  { key: 'SS', side: 'defense', label: 'Strong safety', depth: 2, pool: group('S'),
    want: 'A hybrid who plays nearer the box: coverage plus tackling and hitting.',
    weights: { PLMC: 0.15, PLZC: 0.2, PTAK: 0.2, PLHT: 0.2, PSPD: 0.15, PLPR: 0.1 } },

  // --- Specialists ---
  { key: 'K', side: 'special', label: 'Kicker', depth: 1, pool: group('K'),
    want: 'Leg strength and accuracy.', weights: { PKPR: 0.5, PKAC: 0.5 } },
  { key: 'P', side: 'special', label: 'Punter', depth: 1, pool: group('P'),
    want: 'Leg strength and accuracy.', weights: { PKPR: 0.5, PKAC: 0.5 } },
];

// How well a player suits a spot, on roughly a 0-99 scale. 0 when he has no ratings.
export function slotScore(slot, player) {
  const ratings = player?.ratings ?? {};
  let total = 0;
  let seen = 0;
  for (const [code, weight] of Object.entries(slot.weights)) {
    const v = Number(ratings[code]);
    if (Number.isFinite(v)) {
      total += v * weight;
      seen += weight;
    }
  }
  if (!seen) return 0;
  const raw = total / seen + (slot.bonus ? slot.bonus(player) : 0);
  return Math.max(0, Math.min(99, Math.round(raw * 10) / 10));
}

const isSenior = (player) => String(player.year ?? '').startsWith('SR');

function describe(slot, player, abilities) {
  const keys = Object.entries(slot.weights)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([code]) => ({ label: RATING_LABELS[code] ?? code, value: player.ratings?.[code] ?? null }));
  return {
    playerId: player.playerId,
    name: player.name,
    position: player.position,
    year: player.year ?? null,
    leaving: isSenior(player),
    overall: player.overall ?? null,
    height: player.heightInches ?? null,
    weight: player.weightPounds ?? null,
    score: slotScore(slot, player),
    keys,
    abilities: abilities.get(player.playerId) ?? [],
  };
}

// Fills every spot one string at a time. Within a string, the best remaining
// player-and-spot pairing is taken first, so nobody is listed twice.
export function depthChart(roster) {
  const players = roster?.players ?? [];
  const abilities = new Map();
  for (const a of roster?.abilities ?? []) {
    if (!abilities.has(a.playerId)) abilities.set(a.playerId, []);
    abilities.get(a.playerId).push(`${a.name} (${a.tier})`);
  }

  const filled = new Map(SLOTS.map((s) => [s.key, []]));
  const used = new Set();
  const maxDepth = Math.max(...SLOTS.map((s) => s.depth));

  for (let string = 0; string < maxDepth; string++) {
    const open = SLOTS.filter((s) => s.depth > string);
    const pairs = [];
    for (const slot of open) {
      for (const p of players) {
        if (used.has(p.playerId) || !slot.pool(p)) continue;
        const score = slotScore(slot, p);
        if (score > 0) pairs.push({ slot, p, score });
      }
    }
    pairs.sort((a, b) => (b.slot.first ? 1 : 0) - (a.slot.first ? 1 : 0)
      || b.score - a.score || (b.p.overall ?? 0) - (a.p.overall ?? 0));
    const taken = new Set();
    for (const { slot, p } of pairs) {
      if (taken.has(slot.key) || used.has(p.playerId)) continue;
      taken.add(slot.key);
      used.add(p.playerId);
      filled.get(slot.key).push(describe(slot, p, abilities));
    }
  }

  return {
    slots: SLOTS.map((s) => ({ key: s.key, side: s.side, label: s.label, want: s.want, players: filled.get(s.key) })),
    unused: players.filter((p) => !used.has(p.playerId)).length,
  };
}
