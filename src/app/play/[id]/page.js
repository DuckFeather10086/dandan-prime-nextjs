'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Hls from 'hls.js';

const Dplayer = dynamic(() => import('@/components/Dplayer'), { ssr: false });
const VideoPlayer = dynamic(() => import('@/components/VideoPlayer'), { ssr: false });

export default function VideoPage() {
  const params = useParams();
  const episodeId = params.id;

  const [episode, setEpisode] = useState(1);
  const [loading, setLoading] = useState(true);
  const [videoData, setVideoData] = useState(null); // 👈 初始为 null
  const [selectedResolution, setSelectedResolution] = useState(1080);
  const playerRef = useRef(null);
  const apiHost = process.env.NEXT_PUBLIC_API_HOST || '';

  // 组件加载时获取初始数据
  useEffect(() => {
    async function loadInitialData() {
      setLoading(true);
      try {
        const hlsStatus = await fetchHlsEnabled();
        const episodeData = await fetchEpisodeInfo(episodeId, hlsStatus);
        await sendLastWatchedData(episodeId);
        setVideoData(episodeData); // 👈 所有字段准备好之后再设定
      } catch (error) {
        console.error('加载初始数据失败:', error);
      } finally {
        setLoading(false);
      }
    }

    loadInitialData();
  }, [episodeId, episode]);

  const sendLastWatchedData = async (episodeId) => {
    try {
      const response = await fetch(`${apiHost}/api/last_watched`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: '1',
          last_watched_episode_id: episodeId,
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error sending last watched data:', error);
    }
  };

  const fetchHlsEnabled = async () => {
    try {
      const response = await fetch(`${apiHost}/api/hls/enabled`);
      const data = await response.json();
      return data.hls_enabled;
    } catch (error) {
      console.error('获取HLS状态失败:', error);
      return false;
    }
  };

  const fetchEpisodeInfo = async (episodeId, hlsStatus) => {
    try {
      const response = await fetch(`${apiHost}/api/bangumi/episode/${episodeId}`);
      const data = await response.json();

      let videoUrl = `${apiHost}/videos${data.file_path}/${data.file_name}`;
      if (hlsStatus) {
        try {
          await fetch(`${apiHost}/api/playlist/${episodeId}`, { method: 'POST' });
          videoUrl = `${apiHost}/stream/playlist_${selectedResolution}.m3u8`;
        } catch (error) {
          console.error('调用播放列表 API 错误:', error);
        }
      }

      const subtitleSrc = (data.subtitles?.length > 0)
        ? `${apiHost}/subtitles${data.file_path}/${data.subtitles[0]}`
        : null;

      const danmakuResponse = await fetch(`${apiHost}/api/bangumi/danmaku/${episodeId}`);
      const danmakuItems = await danmakuResponse.json();

      return {
        title: data.title || 'Unknown Title',
        videoSrc: videoUrl,
        posterSrc: data.poster_path ? `${apiHost}/images${data.poster_path}` : '',
        episodeId,
        subtitleOptions: data.subtitles || [],
        danmakuItems: danmakuItems.danmakus,
        subtitleSrc,
        hlsEnabled: hlsStatus,
      };
    } catch (error) {
      console.error('获取剧集信息失败:', error);
      return null;
    }
  };

  const handlePrevEpisode = () => {
    if (episode > 1) {
      setEpisode(episode - 1);
    }
  };

  const handleNextEpisode = () => {
    if (episode < 12) {
      setEpisode(episode + 1);
    }
  };

  return (
    <div className="container mx-auto px-4">
      {videoData ? (
        <VideoPlayer
          videoSrc={videoData.videoSrc}
          posterSrc={videoData.posterSrc}
          subtitleSrc={videoData.subtitleSrc}
          title={videoData.title}
          episode={episode}
          episodeId={episodeId}
          onPrevEpisode={handlePrevEpisode}
          onNextEpisode={handleNextEpisode}
          hasPrevEpisode={episode > 1}
          hasNextEpisode={episode < 12}
          subtitleOptions={videoData.subtitleOptions}
          danmakuItems={videoData.danmakuItems}
          hlsEnabled={videoData.hlsEnabled}
          hasSubtitle={!!videoData.subtitleSrc} // 👈 明确告诉 VideoPlayer 是否有字幕
        />
      ) : (
        <div className="text-center text-gray-500 py-10">加载中……</div>
      )}
    </div>
  );
}
