// Recruiting targets by scheme. Each role says which prospects fit it, using
// only what the prospect pool exposes: position, archetype, height and weight.
// The rules summarise the advice in the linked videos; they are a starting
// point, not something the game itself reports.

const pos = (r, ...list) => list.includes(r.position);
const arch = (r, ...list) => list.includes(r.archetype);

export const SCHEMES = [
  {
    key: 'tite',
    label: '3-3-5 Tite defense',
    source: { label: 'Mills, "The CFB 27 3-3-5 Tite Masterclass"', url: 'https://www.youtube.com/watch?v=W1p9CemZ09I' },
    roles: [
      { key: 'tite-nose', label: 'Nose tackle', short: 'Nose', want: 'Gap Specialist DT, 300 lb or more. Carry two.', test: (r) => pos(r, 'DT') && arch(r, 'Gap Specialist') && r.weight >= 300 },
      { key: 'tite-dt', label: 'Interior tackle (4i)', short: '4i DT', want: 'Pure Power DT first, Gap Specialist second. Carry four and rotate.', test: (r) => pos(r, 'DT') && arch(r, 'Pure Power', 'Gap Specialist') },
      { key: 'tite-olb', label: 'On-ball linebacker / Jack', short: 'Jack', want: 'Thumper at SAM or WILL, or a Box Specialist safety to move down to SAM.', test: (r) => (pos(r, 'SAM', 'WILL') && arch(r, 'Thumper')) || (pos(r, 'FS', 'SS') && arch(r, 'Box Specialist')) },
      { key: 'tite-mike', label: 'Mike and sub linebacker', short: 'Mike', want: 'Lurker, or a Signal Caller at MIKE with Lurkers as the sub linebackers.', test: (r) => (pos(r, 'MIKE', 'WILL', 'SAM', 'ATH') && arch(r, 'Lurker')) || (pos(r, 'MIKE') && arch(r, 'Signal Caller')) },
      { key: 'tite-cb', label: 'Corner', short: 'CB', want: 'Field corner (man and zone for match coverage); Bump and Run also works. Avoid Zone corners.', test: (r) => pos(r, 'CB') && arch(r, 'Field', 'Bump and Run') },
      { key: 'tite-slot', label: 'Slot blitzer', short: 'Slot', want: 'Boundary corner, only if you call sim pressures from the slot.', test: (r) => pos(r, 'CB') && arch(r, 'Boundary') },
      { key: 'tite-s', label: 'Safety', short: 'S', want: 'Hybrid safety, because safeties carry run fits in quarters and cover 3.', test: (r) => pos(r, 'FS', 'SS') && arch(r, 'Hybrid') },
    ],
  },
  {
    key: 'raid',
    label: 'Air Raid offense',
    source: { label: 'Coach TWILL, "The Ultimate Air Raid Recruiting Guide"', url: 'https://www.youtube.com/watch?v=PckbWSx28mM' },
    roles: [
      { key: 'raid-qb', label: 'Quarterback', short: 'QB', want: 'Pocket Passer.', test: (r) => pos(r, 'QB') && arch(r, 'Pocket Passer') },
      { key: 'raid-f', label: 'F (running back)', short: 'F', want: 'Backfield Threat; East/West Playmaker as the fallback.', test: (r) => pos(r, 'HB', 'ATH') && arch(r, 'Backfield Threat', 'East/West Playmaker') },
      { key: 'raid-x', label: 'X receiver (deep threat)', short: 'X', want: 'Speedster, ideally 95+ speed once scouted.', test: (r) => pos(r, 'WR') && arch(r, 'Speedster') },
      { key: 'raid-zy', label: 'Z and Y receivers', short: 'Z/Y', want: "Physical Route Runner, 6'3\" or taller. Your best receiver plays Y.", test: (r) => pos(r, 'WR', 'ATH') && arch(r, 'Physical Route Runner') && r.height >= 75 },
      { key: 'raid-h', label: 'H receiver (slot)', short: 'H', want: 'Route Artist.', test: (r) => pos(r, 'WR') && arch(r, 'Route Artist') },
      { key: 'raid-t', label: 'Tackle', short: 'OT', want: 'Pass Protector at both tackles.', test: (r) => pos(r, 'LT', 'RT') && arch(r, 'Pass Protector') },
      { key: 'raid-g', label: 'Guard', short: 'OG', want: 'Well Rounded; Pass Protector as the fallback.', test: (r) => pos(r, 'LG', 'RG') && arch(r, 'Well Rounded') },
      { key: 'raid-c', label: 'Center', short: 'C', want: 'Raw Strength; a Raw Strength guard or tackle can move to center.', test: (r) => arch(r, 'Raw Strength') && pos(r, 'C', 'LG', 'RG') },
    ],
  },
  {
    key: 'best',
    label: 'Best archetypes in any scheme',
    source: { label: 'Dominate CFB Dynasty, "We Ranked Every Archetype in CFB 27"', url: 'https://www.youtube.com/watch?v=h10BE8IsrQ8' },
    roles: [
      { key: 'best-fieldcb', label: 'Field corner', short: 'S-tier', want: 'Value pick: a three-star plays faster than his speed on pass plays.', test: (r) => pos(r, 'CB') && arch(r, 'Field') },
      { key: 'best-bumpcb', label: 'Bump and Run corner', short: 'S-tier', want: 'Your top corner target when you can land one with elite speed.', test: (r) => pos(r, 'CB') && arch(r, 'Bump and Run') },
      { key: 'best-covs', label: 'Coverage Specialist safety', short: 'S-tier', want: 'Strong in coverage; build up his run stopping.', test: (r) => pos(r, 'FS', 'SS') && arch(r, 'Coverage Specialist') },
      { key: 'best-lurker', label: 'Lurker linebacker', short: 'S-tier', want: 'Off-ball coverage linebacker. Look at outside linebackers first.', test: (r) => pos(r, 'MIKE', 'WILL', 'SAM', 'ATH') && arch(r, 'Lurker') },
      { key: 'best-prr', label: 'Physical Route Runner receiver', short: 'S-tier', want: 'The receiver built to beat press-man coverage.', test: (r) => pos(r, 'WR', 'ATH') && arch(r, 'Physical Route Runner') },
      { key: 'best-ew', label: 'East/West Playmaker back', short: 'S-tier', want: 'Shifty back who also catches.', test: (r) => pos(r, 'HB') && arch(r, 'East/West Playmaker') },
      { key: 'best-wrol', label: 'Well Rounded lineman', short: 'S-tier', want: 'Best ability set on the line. Leave him at the position he arrives at.', test: (r) => pos(r, 'LT', 'LG', 'C', 'RG', 'RT') && arch(r, 'Well Rounded') },
      { key: 'best-athol', label: 'Athlete Agile lineman', short: 'S-tier', want: 'Cheapest lineman to develop; can play anywhere on the line or defensive tackle.', test: (r) => pos(r, 'ATH') && arch(r, 'Agile') },
    ],
  },
];

export const ROLES = SCHEMES.flatMap((s) => s.roles.map((role) => ({ ...role, scheme: s.key })));

// Role keys a prospect fits. Expects { position, archetype, height, weight }.
export function rolesFor(recruit) {
  return ROLES.filter((role) => role.test(recruit)).map((role) => role.key);
}
