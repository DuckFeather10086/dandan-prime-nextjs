'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';

import { Card } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react"; // 导入搜索图标

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"


import axios from 'axios';
import Image from 'next/image';

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);  // 添加这行
  const [orderWithReleaseYear, setorderWithReleaseYear] = useState(false);
  const [animeList, setAnimeList] = useState([]);
  const [lastWatched, setLastWatched] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuX, setContextMenuX] = useState(0);
  const [contextMenuY, setContextMenuY] = useState(0);
  const [selectedAnimeId, setSelectedAnimeId] = useState(null);

  // 对应Vue中的mounted生命周期
  useEffect(() => {
    fetchAnime();
    fetchLastWatched();

    // 点击页面其他地方隐藏上下文菜单
    document.addEventListener('click', hideContextMenu);

    // 清理事件监听器
    return () => {
      document.removeEventListener('click', hideContextMenu);
    };
  }, []);

  // 对应Vue中的computed: filteredAnimeList
  const filteredAnimeList = searchQuery
    ? animeList.filter(anime =>
      anime.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : animeList;

  // 对应Vue中的computed: groupedAnimeList
  const groupedAnimeList = useMemo(() => {
    const grouped = filteredAnimeList.reduce((acc, anime) => {
      const year = anime.air_date?.slice(0, 4) || 'Unknown Year';
      if (!acc[year]) {
        acc[year] = [];
      }
      acc[year].push(anime);
      return acc;
    }, {});

    // 排序每年内的动画
    Object.keys(grouped).forEach(year => {
      grouped[year].sort((a, b) => {
        const titleA = String(a.title || '');
        const titleB = String(b.title || '');
        return titleA.localeCompare(titleB, 'zh-CN');
      });
    });

    // 按年份降序排序
    return Object.fromEntries(
      Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0]))
    );
  }, [filteredAnimeList]);

  // 获取动画列表
  const fetchAnime = useCallback(async () => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_HOST}/api/bangumi/list`);
      setAnimeList(response.data);
    } catch (error) {
      console.error('Error fetching anime:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchLastWatched = useCallback(async () => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_HOST}/api/last_watched?user_id=1`);
      setLastWatched(response.data);
    } catch (error) {
      console.error('Error fetching last watched:', error);
    }
  }, []);

  // 导航到季度信息页面
  const navigateToSeasonInfo = useCallback((animeId) => {
    router.push(`/season/${animeId}`);
  }, [router]);

  // 导航到播放页面
  const navigateToEpisodeInfo = useCallback((episodeId) => {
    router.push(`/play/${episodeId}`);
  }, [router]);

  // 显示上下文菜单
  const showContextMenu = useCallback((event, animeId) => {
    event.preventDefault(); // 阻止默认右键菜单
    setSelectedAnimeId(animeId);
    setContextMenuX(event.clientX);
    setContextMenuY(event.clientY);
    setContextMenuVisible(true);
  }, []);

  // 确认删除
  const confirmDelete = useCallback((animeId) => {
    const confirmed = window.confirm("您确定要删除这个动画吗？");
    if (confirmed) {
      deleteAnime(animeId);
    }
  }, []);

  // 删除动画
  const deleteAnime = useCallback(async (animeId) => {
    try {
      const apiHost = process.env.NEXT_PUBLIC_API_HOST;
      await axios.delete(`${apiHost}/api/bangumi/${animeId}`, {
        headers: {
          'User-Agent': 'sai/dandan-prime'
        }
      });
      // 删除成功后刷新列表
      fetchAnime();
    } catch (error) {
      console.error('Error deleting anime:', error);
    }
  }, [fetchAnime]);

  // 隐藏上下文菜单
  const hideContextMenu = useCallback(() => {
    setContextMenuVisible(false);
  }, []);

  return (
    <div className="anime-homepage">
      {isLoading ? (
        <>
          {/* 上次观看区域的骨架屏 */}
          <div className="relative w-full h-[75vh] bg-gray-900">
            <div className="relative h-full flex items-end px-20 pb-20">
              <div className="w-52 flex-shrink-0 mr-10">
                <Skeleton className="h-[312px] w-[208px]" />
              </div>
              <div className="flex-grow max-w-3xl">
                <Skeleton className="h-6 w-24 mb-3" />
                <Skeleton className="h-12 w-96 mb-3" />
                <Skeleton className="h-8 w-72 mb-8" />
                <div className="flex items-center space-x-5">
                  <Skeleton className="h-12 w-32" />
                  <Skeleton className="h-12 w-32" />
                </div>
              </div>
            </div>
          </div>

          {/* 海报墙的骨架屏 */}
          <div className="p-4">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {[...Array(16)].map((_, index) => (
                <div key={index} className="aspect-[2/3] relative">
                  <Skeleton className="absolute inset-0 rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* 原有的内容 */}
          {lastWatched && (
            <div className="relative w-full h-[75vh] overflow-hidden">
              {/* 背景图片带渐变遮罩 */}
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${lastWatched.imageUrl})` }}
              >
                {/* 多层渐变遮罩 */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/25-transparent"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 o-transparent"></div>
                <div className="absolute inset-0 bg-black/20"></div>
              </div>

              {/* 内容区域 */}
              <div className="relative h-full flex items-end px-20 pb-20">
                {/* 海报图片 */}
                <div className="w-52 flex-shrink-0 mr-10 shadow-2xl transform transition-transform duration-300 hover:scale-105">
                  <Image
                    src={lastWatched.posterUrl}
                    alt={lastWatched.anime_title}
                    width={208}
                    height={312}
                    className="rounded-md"
                    style={{ boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)' }}
                  />
                </div>

                {/* 信息和按钮区域 */}
                <div className="flex-grow max-w-3xl">
                  {/* 上次观看标识 - 加粗 */}
                  <div className="text-sky-300/90 font-bold text-base tracking-wider uppercase mb-3 ml-0.5">上次看到</div>

                  {/* 标题区域 - 加粗 */}
                  <div className="mb-6">
                    <h1 className="text-5xl font-bold text-amber-50/95 mb-3 tracking-tight leading-tight">
                      {lastWatched.anime_title}
                    </h1>
                    <p className="text-gray-200 text-xl font-medium mb-1 tracking-wide">
                      {lastWatched.last_watched_episode_title}
                    </p>
                  </div>

                  {/* 额外信息 - 加粗 */}
                  <div className="flex items-center space-x-4 text-gray-300/90 text-base font-bold mb-8">
                    <span>已观看 45%</span>
                    <span className="w-1 h-1 rounded-full bg-gray-400"></span>
                    <span>剩余 24分钟</span>
                  </div>

                  {/* 按钮区域 */}
                  <div className="flex items-center space-x-5 mt-6">
                    <button
                      className="bg-white/90 hover:bg-white text-zinc-900 rounded-full px-8 py-3 flex items-center font-bold text-sm transition-all duration-300 ease-in-out"
                      onClick={() => navigateToEpisodeInfo(lastWatched.last_watched_episode_id)}
                    >
                      <span className="mr-2 text-base">▶</span>
                      <span className="text-xl font-bold">继续观看</span>
                    </button>

                    <button
                      className="bg-zinc-800/80 hover:bg-zinc-700/90 text-zinc-100 border border-zinc-600/40 rounded-full px-7 py-3 font-medium text-sm transition-all duration-300 ease-in-out"
                      onClick={() => navigateToSeasonInfo(lastWatched.last_watched_bangumi_id)}
                    >
                      <span className="text-xl font-bold">详细信息</span>
                    </button>

                    {/* 添加一个喜欢按钮 */}
                    <button className="w-10 h-10 rounded-full flex items-center justify-center bg-zinc-800/70 hover:bg-zinc-700/80 border border-zinc-600/30 transition-all duration-300 ease-in-out">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-zinc-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* 进度条 */}
              <div className="absolute bottom-0 left-0 w-full h-1 bg-zinc-800/70">
                <div className="h-full bg-sky-400/70 w-[45%]"></div>
              </div>
            </div>
          )}
          
          {/* 原有的海报墙内容 */}
          <div className="anime-section">
            <div className="flex items-center gap-4 p-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="show-titles"
                  checked={orderWithReleaseYear}
                  onCheckedChange={setorderWithReleaseYear}
                />
                <Label htmlFor="show-titles">按照年份排序</Label>
              </div>

              <div className="relative w-64">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索动画标题"
                  className="pl-8"
                />
              </div>
            </div>

            {orderWithReleaseYear ? (
              Object.entries(groupedAnimeList).map(([year, animeList]) => (
                <div key={year} className="mb-8">
                  <h3 className="text-xl font-bold mb-4 px-4">{year}</h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 px-4">
                    {animeList.map((anime) => (
                      <ContextMenu key={anime.title}>
                        <ContextMenuTrigger>
                          <div
                            className="group relative rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300 cursor-pointer"
                            onClick={() => navigateToSeasonInfo(anime.id)}
                          >
                            <div className="relative aspect-[2/3]">
                              <Image
                                src={anime.image_url}
                                alt={anime.title}
                                fill
                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end">
                                <h3 className="text-white font-medium p-3 text-sm truncate w-full">{anime.title}</h3>
                              </div>
                            </div>
                          </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                          <ContextMenuItem onClick={() => navigateToSeasonInfo(anime.id)}>
                            查看详情
                          </ContextMenuItem>
                          <ContextMenuItem>添加到收藏</ContextMenuItem>
                          <ContextMenuItem>标记为已看</ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              filteredAnimeList.length === 0 ? (
                <p>没有找到匹配的动画</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 p-4">
                  {filteredAnimeList.map((anime) => (
                    <ContextMenu key={anime.title}>
                      <ContextMenuTrigger>
                        <div
                          className="group relative rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300 cursor-pointer"
                          onClick={() => navigateToSeasonInfo(anime.id)}
                        >
                          <div className="relative aspect-[2/3]">
                            <Image
                              src={anime.image_url}
                              alt={anime.title}
                              fill
                              className="object-cover transition-transform duration-300 group-hover:scale-105"
                              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end">
                              <h3 className="text-white font-medium p-3 text-sm truncate w-full">{anime.title}</h3>
                            </div>
                          </div>
                        </div>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem onClick={() => navigateToSeasonInfo(anime.id)}>
                          查看详情
                        </ContextMenuItem>
                        <ContextMenuItem>添加到收藏</ContextMenuItem>
                        <ContextMenuItem>标记为已看</ContextMenuItem>
                        {/* 可以根据需要添加更多菜单项 */}
                      </ContextMenuContent>
                    </ContextMenu>
                  ))}
                </div>
              )
            )}

            {/* 右键菜单 */}
            {contextMenuVisible && (
              <div
                className="context-menu"
                style={{ top: contextMenuY, left: contextMenuX }}
              >
                <button onClick={() => confirmDelete(selectedAnimeId)}>
                  删除
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
