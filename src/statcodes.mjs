// EA stat codes used in box scores, from https://dynastyrewired.com/developer/data

export const STAT_LABELS = {
  PSPY: 'Passing yards',
  PSPC: 'Completions',
  PSPA: 'Pass attempts',
  PSPI: 'Interceptions thrown',
  PSPT: 'Passing touchdowns',
  PSRA: 'Carries',
  PSRY: 'Rushing yards',
  PSRT: 'Rushing touchdowns',
  PRRT: 'Receptions',
  PRYD: 'Receiving yards',
  PRTD: 'Receiving touchdowns',
  PSTT: 'Total tackles',
  PTFL: 'Tackles for loss',
  PSDS: 'Sacks',
  PDIT: 'Interceptions',
  PDPD: 'Pass deflections',
  PDFF: 'Forced fumbles',
  PFGM: 'Field goals made',
  PFGA: 'Field goal attempts',
};

export const LEADER_CATEGORIES = [
  { key: 'passYds', label: 'Passing yards', code: 'PSPY' },
  { key: 'passTD', label: 'Passing touchdowns', code: 'PSPT' },
  { key: 'rushYds', label: 'Rushing yards', code: 'PSRY' },
  { key: 'rushTD', label: 'Rushing touchdowns', code: 'PSRT' },
  { key: 'rec', label: 'Receptions', code: 'PRRT' },
  { key: 'recYds', label: 'Receiving yards', code: 'PRYD' },
  { key: 'recTD', label: 'Receiving touchdowns', code: 'PRTD' },
  { key: 'tackles', label: 'Tackles', code: 'PSTT' },
  { key: 'sacks', label: 'Sacks', code: 'PSDS' },
  { key: 'ints', label: 'Interceptions', code: 'PDIT' },
  { key: 'fgm', label: 'Field goals made', code: 'PFGM' },
];

export const DEV_TRAITS = { 0: 'Normal', 1: 'Impact', 2: 'Star', 3: 'Elite' };
