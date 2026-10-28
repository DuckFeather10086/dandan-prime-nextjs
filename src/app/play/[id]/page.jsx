'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { chooseAudio, chooseSubtitle, playlistURL } from '@/utils/playback';
import { episodeGroups, episodeHref, adjacentEpisodes } from '@/utils/library';
import { readProgress } from '@/utils/progress';
import { useUpdateNavbar } from '@/hooks/useUpdateNavbar';
import PageState from '@/components/PageState';

const VideoPlayer = dynamic(() => import('@/components/VideoPlayer'), { ssr: false, loading: () => <PageState loading title="正在准备播放器" /> });
const apiHost = process.env.NEXT_PUBLIC_API_HOST || '';

export default function VideoPage() {
  const { id: episodeId } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [video, setVideo] = useState(null);
  const [season, setSeason] = useState(null);
  const [seasonId, setSeasonId] = useState('');
  const [attempt, setAttempt] = useState(0);
  useUpdateNavbar({ showBackToSeason: true, seasonId });

  useEffect(() => {
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(45000)]);
    setLoading(true); setError(''); setVideo(null); setSeason(null); setSeasonId('');
    async function json(path) {
      const response = await fetch(`${apiHost}${path}`, { signal });
      if (!response.ok) throw new Error(`读取播放信息失败 (${response.status})`);
      return response.json();
    }
    async function load() {
      try {
        const [episode, media, hls, progress] = await Promise.all([
          json(`/api/bangumi/episode/${episodeId}`), json(`/api/playback/${episodeId}`),
          json('/api/hls/enabled').catch(() => ({ hls_enabled: false })), readProgress(episodeId, signal),
        ]);
        let audioPreference, subtitlePreference;
        try { audioPreference = localStorage.getItem('dandan.audioLanguage'); subtitlePreference = JSON.parse(localStorage.getItem('dandan.subtitlePreference') || 'null'); } catch { /* Preferences are optional. */ }
        const info = { ...media, audio_tracks: media.audio_tracks || [], subtitle_tracks: media.subtitle_tracks || [], chapters: media.chapters || [] };
        const audio = chooseAudio(info, audioPreference);
        const subtitle = chooseSubtitle(info.subtitle_tracks, subtitlePreference);
        const resolution = info.quality_options?.[0] ?? 1080;
        const useHls = hls.hls_enabled || /\.mkv$/i.test(episode.file_name) || info.audio_tracks.length > 1 || /(?:hevc|h265|av1)/i.test(info.video_codec);
        const path = `${episode.file_path}/${episode.file_name}`.split('/').map(encodeURIComponent).join('/');
        const source = useHls ? playlistURL(apiHost, episodeId, audio, resolution) : `${apiHost}/videos${path}`;
        const resolvedSeason = info.season_id || episode.season_id || new URLSearchParams(window.location.search).get('season') || '';
        if (controller.signal.aborted) return;
        setSeasonId(String(resolvedSeason));
        // Navigation metadata and comments must not prevent a working video
        // from opening. Abort both when switching to another episode.
        if (resolvedSeason) json(`/api/bangumi/${resolvedSeason}/contents`).then(data => { if (!controller.signal.aborted) setSeason(data); }).catch(() => {});
        const danmaku = await fetch(`${apiHost}/api/bangumi/danmaku/${episodeId}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(6000)]) })
          .then(response => response.ok ? response.json() : null).catch(() => null);
        if (!controller.signal.aborted) setVideo({ episode, mediaInfo: info, videoSrc: source, initialAudio: audio, initialSubtitle: subtitle, initialResolution: resolution, hlsEnabled: useHls, initialProgress: progress, danmakuItems: Array.isArray(danmaku?.danmakus) ? danmaku.danmakus : [] });
      } catch (cause) { if (!controller.signal.aborted) setError(cause.name === 'TimeoutError' ? '读取媒体超时，请稍后重试。' : cause.message); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    load();
    return () => controller.abort();
  }, [episodeId, attempt]);

  const groups = episodeGroups(season);
  const index = groups.findIndex(([, files]) => files.some(file => String(file.id) === String(episodeId)));
  // Alternative encodes are one episode; extras never become the next main episode.
  const { previous, next } = adjacentEpisodes(season, episodeId);
  const go = file => { if (file) router.push(episodeHref(file.id, seasonId)); };
  return <div className="player-page">
    {video ? <VideoPlayer key={episodeId} {...video} title={video.episode.title || video.episode.file_name} episode={video.episode.episode_no || (index >= 0 && groups[index][0] !== 'unknown' ? Number(groups[index][0]) : null)} episodeId={episodeId} seasonTitle={season?.title} fileName={video.episode.file_name} onPrevEpisode={() => go(previous)} onNextEpisode={() => go(next)} hasPrevEpisode={!!previous} hasNextEpisode={!!next} /> : <PageState loading={loading} title={loading ? '正在读取媒体信息' : '暂时无法播放'} description={loading ? '准备视频、字幕与观看进度…' : error || '没有找到可播放的视频。'} action={loading ? undefined : () => setAttempt(value => value + 1)} />}
  </div>;
}
