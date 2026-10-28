'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import SeasonDetail from '@/app/components/SeasonDetail';
import PageState from '@/components/PageState';
import { episodeGroups } from '@/utils/library';

export default function SeasonPage() {
  const { id } = useParams();
  const [season, setSeason] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setSeason(null);
    fetch(`${process.env.NEXT_PUBLIC_API_HOST || ''}/api/bangumi/${encodeURIComponent(id)}/contents`, { signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error('无法读取番剧信息，请检查后端连接后重试。'); const data = await response.json(); if (!data?.id) throw new Error('没有找到这部作品的媒体文件。'); return data; })
      .then(setSeason).catch(cause => { if (!controller.signal.aborted) setError(cause.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, attempt]);
  if (loading) return <PageState loading title="正在加载番剧" description="读取作品信息与本地剧集…" />;
  if (error) return <PageState title="番剧加载失败" description={error} action={() => setAttempt(value => value + 1)} />;
  const last = episodeGroups(season).flatMap(([, files]) => files).find(file => file.id === season?.last_watched_episode_id);
  return <SeasonDetail key={id} seasonData={season} lastWatchedEpisode={last} />;
}
