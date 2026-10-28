'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Check, Heart, Play, Star } from 'lucide-react';
import Poster from '@/components/Poster';
import PageState from '@/components/PageState';
import { useLibraryPreferences } from '@/hooks/useLibraryPreferences';
import { episodeGroups, episodeHref, scoreLabel } from '@/utils/library';

export default function SeasonDetail({ seasonData, lastWatchedEpisode }) {
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const summaryRef = useRef(null);
  const [metadata, setMetadata] = useState(null);
  const [metadataError, setMetadataError] = useState(false);
  const [metadataAttempt, setMetadataAttempt] = useState(0);
  const { favorites, watched, toggle } = useLibraryPreferences();
  const groups = episodeGroups(seasonData);
  const playable = groups.find(([key]) => key !== 'unknown')?.[1]?.[0] || groups[0]?.[1]?.[0];
  const resume = lastWatchedEpisode || playable;
  const favorite = favorites.includes(String(seasonData.id));
  const seen = watched.includes(String(seasonData.id));
  const summary = seasonData.summary || metadata?.summary || '';
  const canExpand = summary.length > 200;
  const summaryContent = canExpand && !summaryExpanded ? summary.slice(0, 200) + '...' : summary;

  useEffect(() => {
    if (!summaryExpanded || !summaryRef.current) return;
    const timer = setTimeout(() => {
      summaryRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' });
    }, 100);
    return () => clearTimeout(timer);
  }, [summaryExpanded]);

  function toggleSummary() { if (canExpand) setSummaryExpanded(value => !value); }
  function onSummaryKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggleSummary(); }
  }

  useEffect(() => {
    const controller = new AbortController();
    setMetadataError(false);
    fetch(`/metadata/${seasonData.id}`, { signal: controller.signal }).then(response => {
      if (!response.ok) throw new Error('metadata unavailable');
      return response.json();
    }).then(setMetadata).catch(() => { if (!controller.signal.aborted) setMetadataError(true); });
    return () => controller.abort();
  }, [seasonData.id, metadataAttempt]);

  return <div className="season-detail-page">
    <section className={`season-hero hero-banner${summaryExpanded ? ' summary-expanded' : ''}`} aria-labelledby="season-title">
      <Poster src={seasonData.image_url} alt="" className="season-background" priority sizes="100vw" />
      <div className="season-shade" />
      <div className="banner-content">
        <div className="season-copy">
          <div className="season-summary-group" ref={summaryRef}>
            <h1 id="season-title">{seasonData.title}</h1>
            {metadata?.name && metadata.name !== seasonData.title && <p className="original-title">{metadata.name}</p>}
            <div
              id="season-summary"
              className={`summary-container${summaryExpanded ? ' is-expanded' : ''}`}
              role={canExpand ? 'button' : undefined}
              tabIndex={canExpand ? 0 : undefined}
              aria-label={canExpand ? summaryExpanded ? '收起简介' : '展开简介' : undefined}
              aria-expanded={canExpand ? summaryExpanded : undefined}
              onClick={toggleSummary}
              onKeyDown={canExpand ? onSummaryKeyDown : undefined}
            >
              <p>{summaryContent || '这部作品暂时没有简介。'}</p>
              {canExpand && <span className="summary-hint">{summaryExpanded ? '点击收起' : '点击展开'}</span>}
            </div>
          </div>
          <div className="media-meta">
            {scoreLabel(seasonData.rate_score) && <span className="season-rating" aria-label={`评分 ${scoreLabel(seasonData.rate_score)}`}>
              <span className="rating-stars" aria-hidden="true">{Array.from({ length: 5 }, (_, index) => <span className="rating-star" key={index}><Star size={18} fill="currentColor" /><span style={{ width: `${Math.min(100, Math.max(0, (Number(seasonData.rate_score) / 2 - index) * 100))}%` }}><Star size={18} fill="currentColor" /></span></span>)}</span>
              <span>({scoreLabel(seasonData.rate_score)})</span>
            </span>}
            {seasonData.air_date && <><span aria-hidden="true">|</span><span>{seasonData.air_date}</span></>}
            {seasonData.total_episodes > 0 && <><span aria-hidden="true">|</span><span>{seasonData.total_episodes} 集</span></>}
          </div>
          {lastWatchedEpisode && <p className="season-last-watched">上次看到：第 {lastWatchedEpisode.episode_no || ''} 集 {lastWatchedEpisode.title}</p>}
          <div className="season-actions">
            {resume && <Link className="btn btn-primary" href={episodeHref(resume.id, seasonData.id)}><Play size={18} fill="currentColor" />{lastWatchedEpisode ? `继续第 ${resume.episode_no || ''} 集` : '开始观看'}</Link>}
            <button className="button button-secondary" aria-pressed={favorite} onClick={() => toggle('favorites', seasonData.id)}><Heart size={18} fill={favorite ? 'currentColor' : 'none'} />{favorite ? '已收藏' : '收藏'}</button>
            <button className="icon-button" aria-label={seen ? '取消已看标记' : '标记为已看'} aria-pressed={seen} onClick={() => toggle('watched', seasonData.id)}><Check size={20} /></button>
          </div>
        </div>
      </div>
    </section>
    <div className="season-episodes-surface">
    <div className="season-body">

      <section className="episode-section" aria-labelledby="episodes-heading">
        <h2 id="episodes-heading" className="sr-only">剧集</h2>
        {groups.length === 0 ? <PageState title="还没有可播放的剧集" description="更新媒体库后，再回来看看。" /> : <div className="episode-list">{groups.map(([number, files]) => <article className="episode-row" key={number}>
          <div className="episode-info"><h3><span className="episode-number">{number === 'unknown' ? 'SP' : number.padStart(2, '0')}</span>{number === 'unknown' ? '特典・その他' : files[0].title || `第 ${number} 集`}</h3>
            {files[0].thumbnail && <Poster src={files[0].thumbnail} alt={files[0].title || ''} className="episode-thumbnail" sizes="192px" />}
            <div className="episode-files">{files.map(file => <Link key={file.id} href={episodeHref(file.id, seasonData.id)} className="episode-file"><span className="episode-file-name">{file.file_name || file.title || '播放剧集'}</span>{file.id === lastWatchedEpisode?.id && <span className="resume-label">上次观看</span>}<span className="episode-file-play"><Play size={15} fill="currentColor" /><span>播放</span></span></Link>)}</div>
          </div>
        </article>)}</div>}
      </section>
      <aside className="metadata-section" aria-labelledby="metadata-heading"><h2 id="metadata-heading">关于作品</h2>
        <dl className="metadata-list"><div><dt>首播</dt><dd>{seasonData.air_date || '暂无信息'}</dd></div><div><dt>类型</dt><dd>{seasonData.platform || '暂无信息'}</dd></div><div><dt>集数</dt><dd>{seasonData.total_episodes > 0 ? `${seasonData.total_episodes} 集` : '暂无信息'}</dd></div>
          {metadata?.infobox?.filter(item => ['导演', '原作', '动画制作', '音乐', '人物设定', '脚本', '系列构成', '单集片长'].includes(item.key)).map((item, i) => <div key={`${item.key}-${i}`}><dt>{item.key}</dt><dd>{typeof item.value === 'string' ? item.value : Array.isArray(item.value) ? item.value.map(value => value.v).filter(Boolean).join('、') : '暂无信息'}</dd></div>)}
        </dl>
        {metadata?.tags?.length > 0 && <div className="tag-list">{metadata.tags.slice(0, 8).map(tag => <span key={tag.name}>{tag.name}</span>)}</div>}
        {metadataError && <p className="storage-note">扩展资料暂时无法加载。<button className="text-link" onClick={() => setMetadataAttempt(value => value + 1)}>重试</button></p>}
        <a className="text-link metadata-source" href={`https://bgm.tv/subject/${seasonData.id}`} target="_blank" rel="noopener noreferrer">在 Bangumi 查看<ArrowUpRight size={15} /></a>
      </aside>
    </div>
    </div>
  </div>;
}
