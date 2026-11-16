// Notes attached to prospects, from what the pool exposes: stars, national
// rank, position and pipeline region. The odds summarise Dominate CFB Dynasty's
// published testing; they are their findings, not something the game reports.

const SPEED_REGIONS = new Set(['South Florida', 'North Florida', 'Louisiana']);
const STRENGTH_REGIONS = new Set(['Minnesota', 'Wisconsin', 'Hawaii', 'Michigan']);
const TRENCH_AND_LB = new Set(['LT', 'LG', 'C', 'RG', 'RT', 'DT', 'LEDG', 'REDG', 'MIKE', 'WILL', 'SAM']);
const SCARCE = new Set(['SS', 'FS', 'CB', 'DT', 'C', 'LG', 'RG']);
const PLENTIFUL = new Set(['QB', 'WR', 'HB']);

export const FLAGS = [
  { key: 'fake5-high', label: '5★ at risk', detail: 'Five-star ranked 26 or lower, or a five-star center: more likely than not a four-star in disguise.' },
  { key: 'fake5-some', label: '5★ check', detail: 'Five-star ranked 17 to 25: roughly 1 in 12 to 1 in 4 are four-stars in disguise. Scout before spending.' },
  { key: 'interior5', label: '5★ interior', detail: 'Five-star guards and centers reach star or elite development far less often than other five-stars.' },
  { key: 'hidden5', label: 'Maybe 5★', detail: 'Four-star ranked 33 to 40: some classes hide a true five-star here at a four-star price. Scout him.' },
  { key: 'low-ceiling', label: 'Low ceiling', detail: 'One and two stars almost never have star or elite development.' },
  { key: 'speed', label: 'Speed region', detail: 'South Florida, North Florida and Louisiana produce the fastest prospects at a given star level.' },
  { key: 'strength', label: 'Strength region', detail: 'Minnesota, Wisconsin, Hawaii and Michigan linemen and linebackers arrive slightly stronger.' },
  { key: 'scarce', label: 'Scarce spot', detail: 'Few good ones per class at safety, corner, defensive tackle, guard and center: move early.' },
  { key: 'wait', label: 'Can wait', detail: 'Quarterbacks, receivers and backs are plentiful: good ones sit unoffered and the portal has more.' },
];

// Flag keys for a prospect. Expects { stars, rank, position, pipeline }.
export function flagsFor(r) {
  const out = [];
  const stars = r.stars ?? 0;
  const rank = r.rank ?? Infinity;
  if (stars === 5) {
    if (r.position === 'C' || rank >= 26) out.push('fake5-high');
    else if (rank >= 17) out.push('fake5-some');
    if (['LG', 'RG', 'C'].includes(r.position)) out.push('interior5');
  }
  if (stars === 4 && rank >= 33 && rank <= 40) out.push('hidden5');
  if (stars > 0 && stars <= 2) out.push('low-ceiling');
  if (SPEED_REGIONS.has(r.pipeline)) out.push('speed');
  if (STRENGTH_REGIONS.has(r.pipeline) && TRENCH_AND_LB.has(r.position)) out.push('strength');
  if (stars >= 3 && SCARCE.has(r.position)) out.push('scarce');
  if (stars >= 3 && PLENTIFUL.has(r.position)) out.push('wait');
  return out;
}

export const RULES = [
  {
    title: 'Where to spend first',
    source: { label: 'Dominate CFB Dynasty, "The Only CFB 27 Dynasty Scouting System You Need"', url: 'https://www.youtube.com/watch?v=3R7-T7BUNUU' },
    points: [
      'Go early on scarce positions: safety, corner, defensive tackle, guard and center. Wait on quarterback, receiver and running back, where good players sit unoffered and the portal restocks every year.',
      'Fill your board cheapest first: your pipelines, then prospects already interested in you, then regions no big school owns (New Mexico, Big Sky, Nebraska, Colorado).',
      'Split the board three ways: a few long shots, priority targets that get most of your hours, and foundation players you are confident of landing. For a top program that means five-stars are priority targets and four-stars are the foundation.',
      'Scout priority and foundation targets, not long shots. Check gem or bust first, then speed and strength, which are the costliest things to fix later.',
    ],
  },
  {
    title: 'Development odds',
    source: { label: 'Dominate CFB Dynasty, "I Studied 400,000 Recruits in CFB 27"', url: 'https://www.youtube.com/watch?v=VMeibTNRWX8' },
    points: [
      'Only two things predict a development trait: star rating and the gem or bust tag. A gem is never Normal; a bust is never Elite.',
      'Skip one and two stars: fewer than 1 in 400 turn out star or elite.',
      'A development trait says nothing about how good a player is on day one. Overall rating follows archetype, position and stars.',
      'Five-star guards and centers hit star or elite about 27% of the time, against about 63% for other five-stars. If you want one five-star lineman, take a tackle.',
    ],
  },
  {
    title: 'Fake and hidden five-stars',
    source: { label: 'Dominate CFB Dynasty, "The Hidden 5-Star Rule EA Never Told You About"', url: 'https://www.youtube.com/watch?v=jc0qnT35R8U' },
    points: [
      'Every class labels exactly 32 five-stars, whether or not 32 exist. Ranks 1 to 11 are safe; by ranks 26 to 32 more than half are four-stars in disguise. A five-star center is always one.',
      'Once scouted: four or more physical abilities means he is real; no mental abilities means he is not.',
      'It works in reverse. A four-star ranked 33 to 40 is sometimes a true five-star at a four-star price, so those are worth a scout.',
    ],
  },
  {
    title: 'Price and the portal',
    source: { label: 'Dominate CFB Dynasty, "5 New CFB 27 Recruiting Secrets Hidden in the Data"', url: 'https://www.youtube.com/watch?v=k08qeIc7-pI' },
    points: [
      'The asking price follows national rank and position, not ability. Between two prospects of the same stars and position, the cheaper one costs you nothing in quality.',
      'Junior college prospects are no better than high school ones of the same stars and have fewer years to develop.',
      'In the portal, count a player\'s capped skill blocks: fewer than 8 means star or elite about two times in three; more than 26, about 1 in 20.',
    ],
  },
  {
    title: 'Building players for match coverage',
    source: { label: 'Dominate CFB Dynasty, "We Tested CFB 27 Dynasty for 650 Hours"', url: 'https://www.youtube.com/watch?v=xoDhKQsoD_Y' },
    points: [
      'Match coverage runs on the man coverage rating far more than zone coverage, so put defensive back upgrades there.',
      'Buy the offseason progression staff upgrade before facilities: it gave about twice the skill points for half the cost in their testing.',
    ],
  },
];
