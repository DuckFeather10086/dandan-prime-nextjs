'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import SeasonDetail from '@/app/components/SeasonDetail';
import { use } from 'react';

export default function SeasonPage() {
  const params = useParams();
  const animeId = params.id;
  console.log(animeId);
  const [seasonData, setSeasonData] = useState(null);
  const [lastWatchedEpisode, setLastWatchedEpisode] = useState(null);
  const [isLoading, setIsLoading] = useState(true);


  
  useEffect(() => {
    // 获取季度详细信息
    const fetchSeasonInfo = async () => {
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
    };

    if (animeId) {
      fetchSeasonInfo();
    }
  }, [animeId]);



  return <SeasonDetail seasonData={seasonData} lastWatchedEpisode={lastWatchedEpisode} isLoading={isLoading} />;
}