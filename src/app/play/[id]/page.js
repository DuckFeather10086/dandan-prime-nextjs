'use client';

import { useState, use, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import VideoPlayer from '@/components/VideoPlayer';

export default function VideoPage() {
  const params = useParams();
  const episodeId = params.id;

  console.log(episodeId)
  const [episode, setEpisode] = useState(1);
  const [loading, setLoading] = useState(true);
  const [videoData, setVideoData] = useState({
    title: "加载中...",
    videoSrc: "",
    posterSrc: "",
    episodeId: episodeId,
    subtitleOptions: [],
    danmakuItems: []
  });
  const [selectedResolution, setSelectedResolution] = useState(1080);
  const [selectedSubtitle, setSelectedSubtitle] = useState(null);
  const [hlsEnabled, setHlsEnabled] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const playerRef = useRef(null);
  const apiHost = process.env.NEXT_PUBLIC_API_HOST || '';

  // 组件加载时获取初始数据
  useEffect(() => {
    async function loadInitialData() {
      setLoading(true);
      try {
        // 获取HLS状态
        const hlsStatus = await fetchHlsEnabled();
        setHlsEnabled(hlsStatus);
        
        // 获取剧集信息
        await fetchEpisodeInfo(episodeId);
        
        // 发送最后观看记录
        await sendLastWatchedData(episodeId);
      } catch (error) {
        console.error('加载初始数据失败:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadInitialData();
  }, [episodeId, episode]);

    // 发送最后观看数据到服务器
  const sendLastWatchedData = async (episodeId) => {
    try {
      const apiHost = process.env.NEXT_PUBLIC_API_HOST;
      const response = await fetch(`${apiHost}/api/last_watched`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: "1",
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

  // 获取HLS状态
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

  // 获取剧集信息
  const fetchEpisodeInfo = async (episodeId) => {
    try {
      // 获取剧集信息
      const response = await fetch(`${apiHost}/api/bangumi/episode/${episodeId}`);
      const data = await response.json();
      
      // 设置视频源
      let videoUrl = `${apiHost}/videos${data.file_path}/${data.file_name}`;
      
      // 如果启用了HLS，使用HLS播放列表URL
      if (hlsEnabled) {
        try {
          await fetch(`${apiHost}/api/playlist/${episodeId}`, {
            method: 'POST'
          });
          videoUrl = `${apiHost}/stream/playlist_${selectedResolution}.m3u8`;
        } catch (error) {
          console.error('调用播放列表 API 错误:', error);
        }
      }
      let subtitleSrc = "";

      if (data.subtitles && data.subtitles.length > 0) {
        subtitleSrc = apiHost + `/subtitles${data.file_path}/${data.subtitles[0]}`;
      }
      const danmakuResponse = await fetch(`${apiHost}/api/bangumi/danmaku/${episodeId}`);
      const danmakuItems = await danmakuResponse.json();

      console.log("danmakuItems fetched", danmakuItems.danmakus);

      // Update video data state
      setVideoData({
        ...videoData,
        title: data.title || "Unknown Title",
        videoSrc: videoUrl,
        posterSrc: data.poster_path ? `${apiHost}/images${data.poster_path}` : "",
        episodeId: episodeId,
        subtitleOptions: data.subtitles || [],
        danmakuItems: danmakuItems.danmakus,
        subtitleSrc: subtitleSrc
      });
      
      
      //
    } catch (error) {
      console.error('获取剧集信息失败:', error);
    }
  };

  const handlePrevEpisode = () => {
    if (episode > 1) {
      setEpisode(episode - 1);
    }
  };

  const handleNextEpisode = () => {
    // 假设最大集数为12
    if (episode < 12) {
      setEpisode(episode + 1);
    }
  };




  return (
    <div className="container mx-auto px-4">
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
                />
    </div>
  );
}