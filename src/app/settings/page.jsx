'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, LoaderCircle, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api } from '@/utils/api';
import { Switch } from '@/components/ui/switch';

export default function SettingsPage() {
  const [hls, setHls] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [updated, setUpdated] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    api.getHLSStatus().then(data => { if (active) setHls(Boolean(data.hls_enabled)); })
      .catch(() => { if (active) setError('无法读取播放设置，请检查后端连接。'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);
  async function updateLibrary() {
    if (updating) return;
    setUpdating(true); setUpdated(false);
    try { await api.updateMediaLibrary(); setUpdated(true); toast.success('媒体库更新成功'); }
    catch { toast.error('媒体库更新失败，请稍后重试'); }
    finally { setUpdating(false); }
  }
  async function toggleHLS(value) {
    if (saving) return;
    setSaving(true);
    try { await api.updateHLSStatus(value); setHls(value); toast.success(value ? '已启用 HLS' : '已关闭 HLS'); }
    catch { toast.error('播放设置保存失败，请重试'); }
    finally { setSaving(false); }
  }
  return <div className="settings-page page-width">
    <Link href="/" className="text-link"><ArrowLeft size={16} />返回片库</Link>
    <div className="settings-heading"><h1>系统设置</h1><p>管理媒体库，让播放更适合你的设备。</p></div>
    <section className="settings-section" aria-labelledby="library-settings"><h2 id="library-settings">媒体库</h2><div className="setting-row"><div><h3>更新媒体库</h3><p>扫描媒体目录，更新本地文件索引。</p>{updated && <span className="success-message"><CheckCircle2 size={14} />媒体库已更新</span>}</div><button className="button button-secondary" disabled={updating} onClick={updateLibrary}>{updating ? <LoaderCircle size={17} className="spin" /> : <RefreshCw size={17} />}{updating ? '正在更新…' : '更新媒体库'}</button></div></section>
    <section className="settings-section" aria-labelledby="playback-settings"><h2 id="playback-settings">播放</h2><div className="setting-row"><div><h3><label htmlFor="hls-mode">HLS 流媒体</label></h3><p id="hls-description">转码为浏览器兼容的视频流。MKV 和多音轨文件会自动使用 HLS。</p></div><div className="setting-switch"><span>{loading ? '读取中…' : saving ? '保存中…' : error ? '状态未知' : hls ? '已启用' : '未启用'}</span><Switch id="hls-mode" aria-describedby="hls-description" checked={hls} disabled={loading || saving || !!error} onCheckedChange={toggleHLS} /></div></div>{error && <div className="inline-error" role="alert"><span>{error}</span><button className="text-link" onClick={() => setAttempt(value => value + 1)}>重新加载</button></div>}</section>
    <p className="settings-footnote">DanDan Prime · 收藏和已看标记保存在浏览器，观看进度同时尝试同步到服务器。</p>
  </div>;
}
