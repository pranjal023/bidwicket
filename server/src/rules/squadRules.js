
const { REQUIRED_ROLES, ROLE_LABELS } = require('../constants');
const { round2 } = require('../utils/helpers');


function roleCounts(squad) {
  const counts = { WK: 0, BAT: 0, BOWL: 0, AR: 0 };
  for (const p of squad) if (counts[p.role] !== undefined) counts[p.role] += 1;
  return counts;
}


function missingRoles(squad) {
  const c = roleCounts(squad);
  return REQUIRED_ROLES.filter((r) => c[r] === 0);
}

const slotsLeft = (squad, squadSize) => Math.max(0, squadSize - squad.length);


function maxAffordableBid(purse, squad, settings) {
  const left = slotsLeft(squad, settings.squadSize);
  if (left <= 0) return 0;
  return round2(Math.max(0, purse - (left - 1) * settings.minSlotPrice));
}

function needLabel(roles) {
  return `Need a ${roles.map((r) => ROLE_LABELS[r]).join(' / ')}`;
}

function checkBidEligibility(team, player, amount, settings) {
  const { squad, purse } = team;
  const left = slotsLeft(squad, settings.squadSize);

  if (left <= 0) return { allowed: false, code: 'SQUAD_FULL', reason: 'Squad is full' };

  const slotsAfter = left - 1;
  const stillMissing = missingRoles(squad).filter((r) => r !== player.role);
  if (stillMissing.length > slotsAfter) {
    return { allowed: false, code: 'ROLE_NEEDED', reason: needLabel(missingRoles(squad)) };
  }

  const remainingAfter = round2(purse - amount);
  if (remainingAfter < round2(slotsAfter * settings.minSlotPrice) || remainingAfter < 0) {
    return { allowed: false, code: 'PURSE_TOO_LOW', reason: 'Purse too low' };
  }

  return { allowed: true, code: null, reason: null };
}


function evaluateSquad(squad, settings) {
  const flags = [];
  const size = squad.length;
  if (size < settings.squadSize) flags.push(`Incomplete squad (${size}/${settings.squadSize})`);
  for (const r of missingRoles(squad)) flags.push(`No ${ROLE_LABELS[r]}`);
  return { complete: flags.length === 0, size, missingRoles: missingRoles(squad), flags };
}


function isAuctionOver(teams, queueIndex, queueLength, settings) {
  const allFull = teams.every((t) => t.squad.length >= settings.squadSize);
  return allFull || queueIndex >= queueLength;
}

module.exports = {
  roleCounts, missingRoles, slotsLeft, maxAffordableBid,
  checkBidEligibility, evaluateSquad, isAuctionOver,
};
