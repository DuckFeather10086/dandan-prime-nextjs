'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight, Heart, Play, Search, X } from 'lucide-react';
import Poster from '@/components/Poster';
import PageState from '@/components/PageState';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import { useLibraryPreferences } from '@/hooks/useLibraryPreferences';
import { episodeHref, yearLabel } from '@/utils/library';
import { Switch } from '@/components/ui/switch';
import { readProgress } from '@/utils/progress';

const apiHost = process.env.NEXT_PUBLIC_API_HOST || '';

export default function Home() {
  const [animeList, setAnimeList] = useState([]);
  const [lastWatched, setLastWatched] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('default');
  const [progress, setProgress] = useState(null);
  const { favorites, watched, toggle } = useLibraryPreferences();

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    async function load() {
      const history = fetch(`${apiHost}/api/last_watched?user_id=1`, { signal: controller.signal })
        .then(response => response.ok ? response.json() : null).catch(() => null);
      try {
        const response = await fetch(`${apiHost}/api/bangumi/list`, { signal: controller.signal });
        if (!response.ok) throw new Error('片库暂时无法加载，请检查后端连接后重试。');
        const data = await response.json();
        if (data !== null && !Array.isArray(data)) throw new Error('片库数据格式异常，请重试。');
        setAnimeList(data || []);
      } catch (cause) { if (!controller.signal.aborted) setError(cause.message); }
      finally { if (!controller.signal.aborted) setLoading(false); }
      const recent = await history;
      if (!controller.signal.aborted) {
        setLastWatched(recent?.last_watched_episode_id ? recent : null);
        if (recent?.last_watched_episode_id) {
          const saved = await readProgress(recent.last_watched_episode_id, controller.signal);
          if (!controller.signal.aborted) setProgress(saved);
        }
      }
    }
    load();
    return () => controller.abort();
  }, [attempt]);

  const filtered = useMemo(() => {
    const list = animeList.filter(anime => String(anime.title || '').toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()) &&
      (filter === 'all' || (filter === 'favorites' ? favorites : watched).includes(String(anime.id))));
    if (sort === 'year') list.sort((a, b) => String(b.air_date || '').localeCompare(String(a.air_date || '')) || String(a.title).localeCompare(String(b.title), 'zh-CN'));
    if (sort === 'score') list.sort((a, b) => (Number(b.rate_score) || 0) - (Number(a.rate_score) || 0));
    if (sort === 'title') list.sort((a, b) => String(a.title).localeCompare(String(b.title), 'zh-CN'));
    return list;
  }, [animeList, query, filter, favorites, watched, sort]);

  const heroSeason = lastWatched?.last_watched_bangumi_id;
  const percent = progress?.duration > 0 ? Math.min(100, progress.position / progress.duration * 100) : null;
  const remainingMinutes = progress?.duration > progress?.position ? Math.ceil((progress.duration - progress.position) / 60) : null;
  const sections = sort === 'year'
    ? Array.from(filtered.reduce((years, anime) => {
      const year = yearLabel(anime.air_date);
      if (!years.has(year)) years.set(year, []);
      years.get(year).push(anime);
      return years;
    }, new Map())).sort(([a], [b]) => a === '年份未知' ? 1 : b === '年份未知' ? -1 : b.localeCompare(a))
    : [['all', filtered]];

  function posterGrid(list) {
    return <div className="poster-grid">{list.map(anime => <ContextMenu key={anime.id}>
      <ContextMenuTrigger asChild>
        <Link href={`/season/${anime.id}`} className="anime-card" aria-label={anime.title || '未命名作品'}>
          <div className="poster-wrap">
            <Poster src={anime.image_url} alt={anime.title || '未命名作品'} />
            <div className="poster-caption"><h3>{anime.title || '未命名作品'}</h3></div>
          </div>
        </Link>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem asChild><Link href={`/season/${anime.id}`}>查看详情</Link></ContextMenuItem>
        <ContextMenuItem onClick={() => toggle('favorites', anime.id)}>{favorites.includes(String(anime.id)) ? '取消收藏' : '添加到收藏'}</ContextMenuItem>
        <ContextMenuItem onClick={() => toggle('watched', anime.id)}>{watched.includes(String(anime.id)) ? '取消已看标记' : '标记为已看'}</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>)}</div>;
  }

  return <div>
    {!loading && !error && lastWatched && (
      <section className="continue-hero" aria-labelledby="continue-title">
        <Poster src={lastWatched.imageUrl || lastWatched.posterUrl} alt="" className="continue-background" priority sizes="100vw" />
        <div className="continue-shade" />
        <div className="continue-content">
          <Poster src={lastWatched.posterUrl || lastWatched.imageUrl} alt={lastWatched.anime_title} className="continue-poster" priority sizes="(max-width: 600px) 100px, 208px" />
          <div className="continue-copy">
            <h1 id="continue-title">{lastWatched.anime_title}</h1>
            <p className="continue-episode">上次看到：{lastWatched.last_watched_episode_no ? `第 ${lastWatched.last_watched_episode_no} 集 · ` : ''}{lastWatched.last_watched_episode_title}</p>
            {percent !== null && <p className="continue-position">已观看 {Math.floor(percent)}%{remainingMinutes !== null && ` · 剩余 ${remainingMinutes} 分钟`}</p>}
            <div className="continue-actions">
              <Link className="button continue-play" href={episodeHref(lastWatched.last_watched_episode_id, heroSeason)}><Play size={18} fill="currentColor" />继续观看</Link>
              <Link className="button continue-details" href={`/season/${heroSeason}`}>详细信息</Link>
              <button className="icon-button continue-favorite" aria-label={favorites.includes(String(heroSeason)) ? '取消收藏' : '收藏这部番剧'} aria-pressed={favorites.includes(String(heroSeason))} onClick={() => toggle('favorites', heroSeason)}><Heart size={20} fill={favorites.includes(String(heroSeason)) ? 'currentColor' : 'none'} /></button>
            </div>
          </div>
        </div>
        {percent !== null && <div className="continue-progress" aria-label={`已观看 ${Math.floor(percent)}%`}><span style={{ width: `${percent}%` }} /></div>}
      </section>
    )}
    <section id="library" className="library-section" aria-label="动画片库">
      <div className="library-toolbar">
        <div className="year-toggle"><Switch id="group-by-year" checked={sort === 'year'} onCheckedChange={checked => setSort(checked ? 'year' : 'default')} /><label htmlFor="group-by-year">按照年份排序</label></div>
        <div className="search-field"><Search size={16} aria-hidden="true" /><input aria-label="搜索动画标题" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索动画标题" />{query && <button aria-label="清除搜索" onClick={() => setQuery('')}><X size={16} /></button>}</div>
        <select className="library-filter" aria-label="筛选片库" value={filter} onChange={event => setFilter(event.target.value)}><option value="all">全部作品</option><option value="favorites">我的收藏</option><option value="watched">已看</option></select>
      </div>
      {filter !== 'all' && <p className="storage-note">收藏和已看标记保存在当前浏览器。</p>}
      {loading ? <div className="poster-grid" role="status" aria-label="正在加载片库">{Array.from({ length: 16 }, (_, i) => <div key={i} className="poster-skeleton skeleton" />)}</div> : error ? <PageState title="片库加载失败" description={error} action={() => setAttempt(value => value + 1)} /> : filtered.length === 0 ? <PageState title={query ? '没有找到匹配的动画' : filter === 'favorites' ? '还没有收藏的动画' : filter === 'watched' ? '还没有标记看过的动画' : '片库还是空的'} description={query ? '试试更短的标题，或清除搜索。' : filter === 'all' ? '前往系统设置，更新媒体库后再回来看看。' : '右键海报或打开详情，可以收藏和标记已看。'}>{query ? <button className="button button-secondary" onClick={() => setQuery('')}>清除搜索</button> : filter === 'all' && <Link className="button button-secondary" href="/settings">前往设置<ArrowRight size={16} /></Link>}</PageState> : sections.map(([year, list]) => <div className="library-group" key={year}>{sort === 'year' && <h2 className="library-year">{year}</h2>}{posterGrid(list)}</div>)}
    </section>
  </div>;
}
