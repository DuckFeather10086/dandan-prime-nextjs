'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import axios from 'axios';

export default function SeasonDetail({ seasonData: initialSeasonData, lastWatchedEpisode: initialLastWatchedEpisode, isLoading: initialIsLoading }) {
  const router = useRouter();
  const [seasonData, setSeasonData] = useState(initialSeasonData);
  const [lastWatchedEpisode, setLastWatchedEpisode] = useState(initialLastWatchedEpisode);
  const [isLoading, setIsLoading] = useState(initialIsLoading !== false);
  // 改为使用自定义展开状态
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const summaryRef = useRef(null);

  // 获取季度和最后观看的剧集信息
  const fetchSeasonInfo = useCallback(async (animeId) => {
    if (!animeId) return;

    console.log('Fetching season info for anime ID:', animeId);
    try {
      const apiHost = process.env.NEXT_PUBLIC_API_HOST;
      // 获取动画季度内容
      const response_anime = await axios.get(`${apiHost}/api/bangumi/${animeId}/contents`);
      setSeasonData(response_anime.data);

      // 如果存在最后观看的剧集ID，获取该剧集信息
      if (response_anime.data.last_watched_episode_id) {
        const response_episode = await axios.get(`${apiHost}/api/bangumi/episode/${response_anime.data.last_watched_episode_id}`);
        setLastWatchedEpisode(response_episode.data);
      }
    } catch (error) {
      console.error('Error fetching season info:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 如果 props 中没有传入数据，但有 animeId 时自己获取数据
  useEffect(() => {
    if (!initialSeasonData && !initialLastWatchedEpisode && window.location.pathname) {
      const pathParts = window.location.pathname.split('/');
      const animeId = pathParts[pathParts.length - 1];
      if (animeId) {
        fetchSeasonInfo(animeId);
      }
    }
  }, [initialSeasonData, initialLastWatchedEpisode, fetchSeasonInfo]);

  // 导航到播放页面
  const navigateToEpisodeInfo = (episodeId) => {
    router.push(`/play/${episodeId}`);
  };

  // 处理摘要展开/收起
  const toggleSummary = () => {
    setSummaryExpanded(!summaryExpanded);
  };

  // 计算是否需要截断
  const isSummaryTruncated = (summary) => {
    // 检查摘要的长度是否超过200个字符
    return summary && summary.length > 200;
  };

  // 获取摘要内容
  const getSummaryContent = (summary) => {
    if (!summary) return '';
    if (!isSummaryTruncated(summary) || summaryExpanded) {
      return summary;
    }
    return summary.substring(0, 200) + '...';
  };

  // 监听折叠状态变化，展开时自动滚动
  useEffect(() => {
    if (summaryExpanded && summaryRef.current) {
      // 使用 setTimeout 确保在 DOM 更新后滚动
      setTimeout(() => {
        summaryRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [summaryExpanded]);

  return (
    <div className="season-detail-page min-h-screen flex flex-col bg-[#0f171e] text-white font-sans">
      {isLoading || !seasonData ? (
        <div className="flex justify-center items-center min-h-screen">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : (
        <>
          {/* 英雄横幅 - 根据摘要展开状态动态调整高度 */}
          <div className={`hero-banner relative ${summaryExpanded ? 'h-[100vh]' : 'h-[80vh]'} transition-all duration-500 ease-in-out`}>
 
            <div className="absolute inset-0 overflow-hidden">
              <div className="relative w-full h-full">
                <Image
                  src={seasonData.image_url}
                  alt={seasonData.title}
                  fill
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/60 to-black"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent"></div>
              </div>
            </div> 

            {/* Content Section - Left-aligned like Prime */}
            <div className="banner-content absolute inset-0 flex flex-col justify-center px-24 md:px-16 sm:px-8">
              <div className="max-w-[50%] md:max-w-[70%] sm:max-w-[90%] ml-8">
                {/* 标题和摘要区域，用自定义的展开收起逻辑替代collapse */}
                <div className="mb-6" ref={summaryRef}>
                  <h1 className="text-5xl md:text-4xl sm:text-3xl font-bold mb-2 text-left">{seasonData.title}</h1>
                  
                  <div 
                    className={`summary-container ${summaryExpanded ? 'max-h-80 overflow-y-auto' : 'max-h-24 overflow-hidden'} transition-all duration-500 ease-in-out`} 
                    onClick={toggleSummary}
                    style={{cursor: isSummaryTruncated(seasonData.summary) ? 'pointer' : 'default'}}
                  >
                    <p className="text-gray-200 text-lg md:text-base sm:text-sm max-w-[90%] transition-opacity duration-300">
                      {getSummaryContent(seasonData.summary)}
                    </p>
                    
                    {isSummaryTruncated(seasonData.summary) && !summaryExpanded && (
                      <span className="text-primary text-sm ml-1 transition-opacity duration-300">点击展开</span>
                    )}
                    
                    {summaryExpanded && (
                      <span className="text-primary text-sm block mt-2 transition-opacity duration-300">点击收起</span>
                    )}
                  </div>
                </div>
                
                {/* Ratings and Metadata - horizontal layout */}
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <div className="flex items-center">
                    {/* 使用星星图标替代原来的灰色方块，支持半星评分 */}
                    <div className="flex items-center">
                      {[...Array(5)].map((_, index) => {
                        const starValue = index + 1;
                        const score = seasonData.rate_score / 2.0;
                        console.log(score)
                        return (
                          <div key={index} className="relative text-gray-400">
                            {/* 背景星星 */}
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            {/* 前景星星（根据评分显示全星或半星） */}
                            <div 
                              className="absolute top-0 left-0 overflow-hidden text-yellow-400" 
                              style={{ width: `${Math.min(100, Math.max(0, (score - index) * 100))}%` }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <span className="text-sm ml-2 text-gray-300">
                      ({seasonData.rate_score.toFixed(1)})
                    </span>
                  </div>

                  <span className="text-gray-300">|</span>

                  <span className="text-gray-300">
                    {seasonData.air_date}
                  </span>

                  <span className="text-gray-300">|</span>

                  <span className="text-gray-300">
                    {seasonData.total_episodes} エピソード
                  </span>
                </div>

                {/* Last watched episode */}
                {lastWatchedEpisode && (
                  <div className="mb-6">
                    <span className="text-primary font-medium">
                      上次看到: 第 {lastWatchedEpisode.episode_no} 集 {lastWatchedEpisode.title}
                    </span>
                  </div>
                )}

                {/* Action buttons - similar to Prime's layout */}
                <div className="flex items-center gap-4 mt-4">
                  <button className="btn btn-primary flex items-center gap-2 px-6">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                    エピソード1 続けて観る
                  </button>

                </div>
              </div>
            </div>
          </div>

          {/* 剧集列表 */}
          <div className="episode-list p-12 flex-1 sm:p-4 bg-black">

            {seasonData.episodes && Object.entries(seasonData.episodes).map(([dandanplayEpisodeId, episodeGroup]) => (
              <div key={dandanplayEpisodeId} className="episode-group  mb-6">
                <div className="card p-4 bg-white/5 rounded-lg w-[90%] mx-auto">
                  <h3 className="text-xl mb-4">{episodeGroup[0].title}</h3>

                  {episodeGroup[0].thumbnail && (
                    <div className="episode-details mb-4 flex">
                      <div className="relative w-48 h-28 rounded-lg overflow-hidden mr-4">
                        <Image
                          src={episodeGroup[0].thumbnail}
                          alt={episodeGroup[0].title}
                          fill
                          className="object-contain"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    {episodeGroup.map((episode) => (
                      <div key={episode.id} className="episode-item flex justify-between items-center p-2 bg-white/5 rounded h-8">
                        <p className="episode-filename truncate flex-1 text-white text-base mr-4 leading-5">{episode.file_name}</p>
                        <button
                          className="play-btn text-[#00a8e1] hover:text-[#0082b0] transition-colors duration-300"
                          onClick={() => navigateToEpisodeInfo(episode.id)}
                        >
                          ▶
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}