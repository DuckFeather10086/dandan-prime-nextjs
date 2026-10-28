'use client';

import { useState, useRef, useEffect } from 'react';
import Artplayer from 'artplayer';
import Hls from 'hls.js';
import artplayerPluginDanmuku from 'artplayer-plugin-danmuku';
import chapterTimeline from '@/components/player/chapters';
import { formatTime, playlistURL, trackLabel, qualityLabel } from '@/utils/playback';
import { saveProgress, localProgress } from '@/utils/progress';
import { createBitmapSubtitle } from '@/components/player/bitmap';
import { ArrowLeft, ArrowRight } from 'lucide-react';

const EMPTY_DANMAKU = [];
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

export default function VideoPlayer({
  videoSrc, posterSrc = '', title, episode, onPrevEpisode, onNextEpisode,
  hasPrevEpisode = true, hasNextEpisode = true, episodeId,
  danmakuItems = EMPTY_DANMAKU, hlsEnabled = false,
  mediaInfo, initialAudio, initialSubtitle, initialResolution = 0, initialProgress, seasonTitle, fileName,
}) {
  const artRef = useRef(null);
  const actionsRef = useRef({});
  const [audio, setAudio] = useState(initialAudio);
  const [subtitle, setSubtitle] = useState(initialSubtitle);
  const [resolution, setResolution] = useState(initialResolution);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState('');
  const [showNextEpisode, setShowNextEpisode] = useState(false);
  const [progressStatus, setProgressStatus] = useState('播放后自动保存进度');
  const apiHost = process.env.NEXT_PUBLIC_API_HOST || '';

  useEffect(() => {
    let art, hls, ass, bitmap, disposed = false, busy = false;
    let hasPlayed = false, recordedVisit = false, lastLocalSave = 0, lastRemoteSave = 0;
    let selectedAudio = initialAudio, selectedResolution = initialResolution;
    const abort = new AbortController();
    const audioTracks = mediaInfo.audio_tracks;
    const subtitleTracks = mediaInfo.subtitle_tracks;
    const chapters = mediaInfo.chapters;
    const qualities = mediaInfo.quality_options || [1080, 720, 480];
    const destroyOverlays = () => { destroyASS(); bitmap?.dispose(); bitmap = null; };
    function persistProgress(remote = true, keepalive = false) {
      if (disposed || busy || !art || !hasPlayed || !(art.duration > 0)) return;
      const position = art.currentTime, duration = art.duration;
      saveProgress(episodeId, position, duration, { remote, keepalive }).then(ok => {
        if (!disposed && remote) setProgressStatus(ok ? '观看进度已同步' : localProgress(episodeId)?.position === Math.min(position, duration) ? '进度已保存到此浏览器 · 服务器同步暂不可用' : '观看进度保存失败，请检查连接与浏览器存储权限');
      });
    }
    const flushProgress = () => persistProgress(true, true);
    const onVisibility = () => { if (document.visibilityState === 'hidden') flushProgress(); };
    const reportError = message => {
      if (!disposed) { setError(message); if (art) art.notice.show = message; }
    };
    const persist = (key, value) => {
      try { localStorage.setItem(key, value); } catch { /* Optional preference. */ }
    };
    const destroyASS = () => { ass?.dispose(); ass = null; };
    const menu = (name, value, label) => {
      const option = art.setting.find(name);
      if (option) art.setting.update({ name, tooltip: escapeHTML(label), selector: option.selector.map(item => ({ ...item, default: item.value === value })) });
    };

    async function changeStream(nextAudio, nextResolution) {
      if (busy || disposed || (nextAudio === selectedAudio && nextResolution === selectedResolution)) return;
      busy = true; setSwitching(true); setError('');
      try {
        const url = playlistURL(apiHost, episodeId, nextAudio, nextResolution);
        // Check before replacing the working stream, so a rejected track leaves playback intact.
        const response = await fetch(url, { signal: abort.signal });
        if (!response.ok) throw new Error('准备播放流失败');
        if (disposed) return;
        await art.switchQuality(url);
        if (disposed) return;
        selectedAudio = nextAudio; selectedResolution = nextResolution;
        setAudio(nextAudio); setResolution(nextResolution);
        const track = audioTracks.find(item => item.index === nextAudio);
        if (track) {
          persist('dandan.audioLanguage', track.language);
          menu('audio-track', nextAudio, trackLabel(track));
        }
        menu('resolution', nextResolution, qualityLabel(nextResolution, mediaInfo));
      } catch (cause) {
        if (!disposed) reportError(`切换播放流失败：${cause.message}`);
      } finally {
        busy = false; if (!disposed) setSwitching(false);
      }
    }

    async function changeSubtitle(id, remember = true) {
      if (busy || disposed) return;
      busy = true; setSwitching(true); setError('');
      const track = subtitleTracks.find(item => item.id === id);
      try {
        if (track) {
          if (!track.supported) throw new Error('暂不支持这条图形字幕');
          const url = `${apiHost}${track.url}`;
          const response = await fetch(url, { signal: abort.signal });
          if (!response.ok) throw new Error('读取字幕失败');
          if (track.format === 'sup' || track.format === 'mks') {
            const data = await response.arrayBuffer();
            if (disposed) return;
            const nextBitmap = await createBitmapSubtitle({ video: art.video, container: art.template.$video.parentElement, track, data, signal: abort.signal, onError: () => reportError('图片字幕渲染失败，请尝试其他字幕') });
            if (disposed) { nextBitmap.dispose(); return; }
            destroyOverlays(); bitmap = nextBitmap; art.subtitle.show = false;
          } else if (track.format === 'ass') {
            const text = await response.text();
            if (disposed) return;
            const { default: SubtitlesOctopus } = await import('libass-wasm');
            if (disposed) return;
            destroyOverlays();
            art.subtitle.show = false;
            ass = new SubtitlesOctopus({
              video: art.video, subContent: text,
              workerUrl: new URL('/assets/wasm/subtitles-octopus-worker.js', location.href).href,
              fallbackFont: new URL('/assets/fonts/SourceHanSansCN-Bold.woff2', location.href).href,
              onError: () => reportError('ASS 字幕渲染失败，请尝试其他字幕'),
            });
            ass.canvasParent.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:20';
          } else {
            const text = await response.text();
            if (disposed) return;
            const blobURL = URL.createObjectURL(new Blob([text], { type: 'text/vtt' }));
            try { await art.subtitle.switch(blobURL, { type: 'vtt' }); }
            finally { URL.revokeObjectURL(blobURL); }
            if (disposed) return;
            destroyOverlays();
            art.subtitle.show = true;
          }
        } else {
          destroyOverlays(); art.subtitle.show = false;
        }
        if (disposed) return;
        setSubtitle(id);
        menu('subtitle-track', id, track ? trackLabel(track) : '关闭');
        if (remember) persist('dandan.subtitlePreference', JSON.stringify(track ? {
          source: track.source, language: track.language, title: track.title, forced: track.forced,
        } : { off: true }));
      } catch (cause) {
        if (!disposed) reportError(`切换字幕失败：${cause.message}`);
      } finally {
        busy = false; if (!disposed) setSwitching(false);
      }
    }

    const jumpChapter = index => {
      if (chapters[index] && art) art.seek = chapters[index].start;
    };
    const settings = [];
    if (audioTracks.length) settings.push({
      name: 'audio-track', html: '音轨', width: 360,
      tooltip: escapeHTML(trackLabel(audioTracks.find(track => track.index === initialAudio) || audioTracks[0])),
      selector: audioTracks.map(track => ({ html: escapeHTML(trackLabel(track)), value: track.index, default: track.index === initialAudio })),
      onSelect: async item => { await changeStream(item.value, selectedResolution); return escapeHTML(trackLabel(audioTracks.find(track => track.index === selectedAudio))); },
    });
    settings.push({
      name: 'subtitle-track', html: '字幕', width: 360,
      tooltip: escapeHTML(subtitleTracks.find(track => track.id === initialSubtitle) ? trackLabel(subtitleTracks.find(track => track.id === initialSubtitle)) : '关闭'),
      selector: [{ html: '关闭', value: '', default: !initialSubtitle }, ...subtitleTracks.filter(track => track.supported).map(track => ({ html: escapeHTML(trackLabel(track)), value: track.id, default: track.id === initialSubtitle }))],
      onSelect: async item => { await changeSubtitle(item.value); },
    });
    if (hlsEnabled) settings.push({
      name: 'resolution', html: '清晰度', tooltip: qualityLabel(initialResolution, mediaInfo),
      selector: qualities.map(value => ({ html: qualityLabel(value, mediaInfo), value, default: value === initialResolution })),
      onSelect: async item => { await changeStream(selectedAudio, item.value); return qualityLabel(selectedResolution, mediaInfo); },
    });
    if (chapters.length) settings.push({
      name: 'chapters', html: '章节', width: 320,
      selector: chapters.map((chapter, index) => ({ html: escapeHTML(`${formatTime(chapter.start)} ${chapter.title}`), value: index })),
      onSelect: item => { jumpChapter(item.value); return item.html; },
    });

    try {
      art = new Artplayer({
        container: artRef.current, url: videoSrc, type: hlsEnabled ? 'm3u8' : '',
        poster: posterSrc, title: title, volume: 0.5,
        autoplay: false, pip: true, screenshot: true, setting: true,
        playbackRate: true, aspectRatio: true, fullscreen: true, fullscreenWeb: true,
        miniProgressBar: true, mutex: true, backdrop: true, playsInline: true, subtitleOffset: true,
        autoPlayback: false, airplay: true, theme: '#23ade5',
        lang: navigator.language.toLowerCase(), whitelist: ['*'], settings,
        customType: {
          m3u8(video, url) {
            hls?.destroy();
            if (Hls.isSupported()) {
              const instance = new Hls({ maxBufferLength: 30, maxMaxBufferLength: 60 });
              hls = instance;
              instance.loadSource(url); instance.attachMedia(video);
              instance.on(Hls.Events.ERROR, (_, data) => {
                if (!data.fatal || disposed) return;
                if (data.type === Hls.ErrorTypes.MEDIA_ERROR) instance.recoverMediaError();
                else reportError('视频流加载失败，请刷新重试');
              });
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) video.src = url;
            else reportError('当前浏览器不支持 HLS 播放');
          },
        },
        plugins: [...(chapters.length ? [chapterTimeline(chapters)] : []), artplayerPluginDanmuku({
          danmuku: danmakuItems, speed: 5, margin: [10, '25%'], opacity: 1,
          fontSize: 25, antiOverlap: true, heatmap: true, width: 512,
          filter: danmu => danmu.text.length <= 100, theme: 'dark',
        })],
      });
      actionsRef.current = {
        audio: value => changeStream(Number(value), selectedResolution),
        resolution: value => changeStream(selectedAudio, Number(value)),
        subtitle: changeSubtitle, chapter: jumpChapter,
      };
      setAudio(initialAudio); setSubtitle(initialSubtitle); setResolution(initialResolution);
      setError(''); setSwitching(false); setShowNextEpisode(false);
      art.on('subtitleOffset', offset => { if (ass) ass.timeOffset = offset; if (bitmap) bitmap.timeOffset = offset; });
      art.once('video:loadedmetadata', () => {
        if (initialProgress?.position >= 5 && initialProgress.position < art.duration - Math.min(10, art.duration * .02)) {
          art.seek = initialProgress.position;
          setProgressStatus(`已恢复到 ${formatTime(initialProgress.position)}`);
        }
      });
      art.on('video:playing', () => {
        hasPlayed = true;
        if (!recordedVisit) {
          recordedVisit = true;
          fetch(`${apiHost}/api/last_watched`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: '1', last_watched_episode_id: String(episodeId) }) }).catch(() => {});
          persistProgress();
        }
      });
      art.on('video:pause', flushProgress);
      art.on('video:ended', flushProgress);
      art.on('video:seeked', flushProgress);
      window.addEventListener('pagehide', flushProgress);
      document.addEventListener('visibilitychange', onVisibility);
      art.on('video:timeupdate', () => {
        setShowNextEpisode(art.duration > 0 && art.duration - art.currentTime <= Math.min(30, art.duration * .1));
        const now = Date.now();
        if (now - lastLocalSave >= 1000) { persistProgress(false); lastLocalSave = now; }
        if (now - lastRemoteSave >= 10000) { persistProgress(true); lastRemoteSave = now; }
      });
      if (initialSubtitle) changeSubtitle(initialSubtitle, false);
    } catch (cause) { reportError(`初始化播放器失败：${cause.message}`); }

    return () => {
      flushProgress();
      disposed = true; abort.abort(); actionsRef.current = {};
      window.removeEventListener('pagehide', flushProgress);
      document.removeEventListener('visibilitychange', onVisibility);
      destroyOverlays(); hls?.destroy(); art?.destroy();
    };
  }, [videoSrc, posterSrc, title, episode, hlsEnabled, danmakuItems, apiHost, episodeId, mediaInfo, initialAudio, initialSubtitle, initialResolution, initialProgress]);

  return (
    <div>
      <div className="player-header"><div><h1>{title}</h1><p>{[seasonTitle, episode ? `第 ${episode} 集` : '特典与其他'].filter(Boolean).join(' · ')}</p></div></div>
      <div className="w-full aspect-video bg-black rounded-lg overflow-hidden relative">
        <div ref={artRef} className="w-full h-full" />
        {showNextEpisode && hasNextEpisode && <button onClick={onNextEpisode} className="absolute right-4 bottom-20 z-30 button button-primary">播放下一集<ArrowRight size={16} /></button>}
      </div>
      <div className="player-controls" aria-busy={switching}>
        <label>音轨<select aria-label="音轨" value={audio ?? ''} disabled={switching || !mediaInfo.audio_tracks.length} onChange={event => actionsRef.current.audio?.(event.target.value)}>
          {!mediaInfo.audio_tracks.length && <option value="">无音轨</option>}
          {mediaInfo.audio_tracks.map(track => <option key={track.id} value={track.index}>{trackLabel(track)}</option>)}
        </select></label>
        <label>字幕<select aria-label="字幕" value={subtitle || ''} disabled={switching} onChange={event => actionsRef.current.subtitle?.(event.target.value)}>
          <option value="">关闭</option>
          {mediaInfo.subtitle_tracks.map(track => <option key={track.id} value={track.id} disabled={!track.supported}>{trackLabel(track)}</option>)}
        </select></label>
        {hlsEnabled && <label>清晰度<select aria-label="清晰度" value={resolution} disabled={switching} onChange={event => actionsRef.current.resolution?.(event.target.value)}>
          {(mediaInfo.quality_options || [1080, 720, 480]).map(value => <option key={value} value={value}>{qualityLabel(value, mediaInfo)}</option>)}
        </select></label>}
        {switching && <span role="status" className="text-sm text-muted-foreground">正在切换…</span>}
      </div>
      {error && <p role="alert" className="text-red-300 mt-3">{error}</p>}
      <div className="player-footer">
        <button onClick={onPrevEpisode} disabled={!hasPrevEpisode} className="button button-secondary"><ArrowLeft size={16} />上一集</button>
        <span className="progress-status" role="status">{progressStatus}</span>
        <button onClick={onNextEpisode} disabled={!hasNextEpisode} className="button button-secondary">下一集<ArrowRight size={16} /></button>
      </div>
      <p className="player-source">{[mediaInfo.width && mediaInfo.height ? `${mediaInfo.width} × ${mediaInfo.height}` : '', mediaInfo.video_codec?.toUpperCase(), mediaInfo.bit_rate > 0 ? `${(mediaInfo.bit_rate / 1e6).toFixed(1)} Mbps` : '', fileName].filter(Boolean).join(' · ')}</p>
    </div>
  );
}
