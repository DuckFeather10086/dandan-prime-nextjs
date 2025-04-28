'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

export default function AnimeHomePage() {
  const router = useRouter();
  const [showTitles, setShowTitles] = useState(false);
  const [animeList, setAnimeList] = useState([]);
  const [lastWatched, setLastWatched] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuX, setContextMenuX] = useState(0);
  const [contextMenuY, setContextMenuY] = useState(0);
  const [selectedAnimeId, setSelectedAnimeId] = useState(null);

  useEffect(() => {
    fetchAnime();
    fetchLastWatched();
    document.addEventListener('click', hideContextMenu);
    return () => {
      document.removeEventListener('click', hideContextMenu);
    };
  }, []);

  const fetchAnime = async () => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_HOST}/api/bangumi/list`);
      setAnimeList(response.data);
    } catch (error) {
      console.error('Error fetching anime:', error);
    }
  };

  const fetchLastWatched = async () => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_HOST}/api/last_watched?user_id=1`);
      setLastWatched(response.data);
    } catch (error) {
      console.error('Error fetching last watched:', error);
    }
  };

  const filteredAnimeList = searchQuery
    ? animeList.filter(anime =>
        anime.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : animeList;

  const groupedAnimeList = () => {
    const grouped = filteredAnimeList.reduce((acc, anime) => {
      const year = anime.air_date?.slice(0, 4) || 'Unknown Year';
      if (!acc[year]) acc[year] = [];
      acc[year].push(anime);
      return acc;
    }, {});

    Object.keys(grouped).forEach(year => {
      grouped[year].sort((a, b) => {
        const titleA = String(a.title || '');
        const titleB = String(b.title || '');
        return titleA.localeCompare(titleB, 'zh-CN');
      });
    });

    return Object.fromEntries(
      Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0]))
    );
  };

  const navigateToSeasonInfo = (animeId) => {
    router.push(`/season/${animeId}`);
  };

  const navigateToEpisodeInfo = (episodeID) => {
    router.push(`/play/${episodeID}`);
  };

  const showContextMenu = (event, animeId) => {
    event.preventDefault();
    setSelectedAnimeId(animeId);
    setContextMenuX(event.clientX);
    setContextMenuY(event.clientY);
    setContextMenuVisible(true);
  };

  const confirmDelete = (animeId) => {
    if (confirm("您确定要删除这个动画吗？")) {
      deleteAnime(animeId);
    }
  };

  const deleteAnime = async (animeId) => {
    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_API_HOST}/api/bangumi/${animeId}`, {
        headers: {
          'User-Agent': 'sai/dandan-prime'
        }
      });
    } catch (error) {
      console.error('Error deleting anime:', error);
    }
  };

  const hideContextMenu = () => {
    setContextMenuVisible(false);
  };

  return (
    <div className="anime-homepage">
      {/* Move your JSX here from page.js */}
      showTitles,
      setShowTitles,
      lastWatched,
      searchQuery,
      setSearchQuery,
      groupedAnimeList: groupedAnimeList(),
      filteredAnimeList,
      contextMenuVisible,
      contextMenuX,
      contextMenuY,
      selectedAnimeId,
      navigateToSeasonInfo,
      navigateToEpisodeInfo,
      showContextMenu,
      confirmDelete
    </div>
  );
}