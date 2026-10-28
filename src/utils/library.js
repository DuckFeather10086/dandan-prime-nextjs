export function episodeGroups(season) {
  const groups = Object.entries(season?.episodes || {}).filter(([, files]) => Array.isArray(files) && files.length);
  if (season?.unknown_episodes?.length && !groups.some(([key]) => key === 'unknown')) groups.push(['unknown', season.unknown_episodes]);
  return groups.sort(([a], [b]) => a === b ? 0 : a === 'unknown' ? 1 : b === 'unknown' ? -1 : Number(a) - Number(b));
}

export function episodeHref(id, seasonId) {
  return `/play/${id}${seasonId ? `?season=${encodeURIComponent(seasonId)}` : ''}`;
}

export function adjacentEpisodes(season, episodeId) {
  const groups = episodeGroups(season).filter(([key]) => key !== 'unknown');
  const index = groups.findIndex(([, files]) => files.some(file => String(file.id) === String(episodeId)));
  return {
    previous: index > 0 ? groups[index - 1][1][0] : null,
    next: index >= 0 && index < groups.length - 1 ? groups[index + 1][1][0] : null,
  };
}

export function scoreLabel(value) {
  const score = Number(value);
  return Number.isFinite(score) && score > 0 ? score.toFixed(1) : null;
}

export function yearLabel(date) {
  return /^\d{4}/.test(date || '') ? date.slice(0, 4) : '年份未知';
}
