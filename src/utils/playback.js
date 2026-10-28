const languages = {
  ja: '日语', jpn: '日语', zh: '中文', zho: '中文', chi: '中文',
  en: '英语', eng: '英语', fr: '法语', fre: '法语', fra: '法语',
  de: '德语', ger: '德语', deu: '德语', ko: '韩语', kor: '韩语',
  es: '西班牙语', spa: '西班牙语', it: '意大利语', ita: '意大利语',
  ru: '俄语', rus: '俄语', pt: '葡萄牙语', por: '葡萄牙语', und: '未标注语言',
};

export function trackLabel(track) {
  return [
    track.source === 'external' ? '外挂' : languages[track.language] || track.language || '未标注语言',
    track.title,
    track.codec?.toUpperCase(),
    track.channels ? `${track.channels} 声道` : '',
    track.forced ? '强制字幕' : '',
    track.source === 'embedded' ? `轨道 ${track.index}` : '',
    track.format === 'sup' ? 'PGS 图片字幕' : track.format === 'mks' ? 'VobSub 图片字幕' : '',
    track.supported === false ? '暂不支持' : '',
  ].filter(Boolean).join(' · ');
}

export function playlistURL(apiHost, episodeId, audio, resolution = 0) {
  const query = new URLSearchParams({ resolution: String(resolution) });
  if (audio !== null && audio !== undefined) query.set('audio', String(audio));
  return `${apiHost}/api/playback/${episodeId}/playlist.m3u8?${query}`;
}

export function chooseAudio(info, language) {
  return info.audio_tracks.find(track => track.language === language)?.index ?? info.default_audio;
}

export function chooseSubtitle(tracks, preference) {
  const supported = tracks.filter(track => track.supported);
  if (preference?.off) return '';
  if (preference) {
    const match = supported.find(track => track.source === preference.source &&
      (track.source === 'external'
        ? track.title === preference.title
        : track.language === preference.language && track.forced === preference.forced));
    if (match) return match.id;
  }
  return supported.find(track => /^(zh|zho|chi)$/.test(track.language) ||
    /(?:简体|繁体|简中|繁中|中文|chs|cht|sc&tc)/i.test(track.title))?.id ||
    supported.find(track => track.source === 'external')?.id || '';
}

export function formatTime(seconds) {
  const value = Math.max(0, Math.floor(Number(seconds) || 0));
  const parts = [Math.floor(value / 60) % 60, value % 60].map(part => String(part).padStart(2, '0'));
  if (value >= 3600) parts.unshift(String(Math.floor(value / 3600)));
  return parts.join(':');
}

export function qualityLabel(resolution, info) {
  return resolution === 0 ? `源分辨率${info?.height ? ` · ${info.width}×${info.height}` : ''}` : `${resolution}p`;
}
