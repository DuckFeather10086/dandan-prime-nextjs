'use client';

import { useState, useRef, useEffect } from 'react';
import Hls from 'hls.js';
import {
  MediaPlayer,
  MediaProvider,
  Poster,
  Track,
  MediaPlayerInstance
} from '@vidstack/react';
import {
  DefaultAudioLayout,
  defaultLayoutIcons,
  DefaultVideoLayout,
} from '@vidstack/react/player/layouts/default';
import { useRouter } from 'next/navigation';
import '@vidstack/react/player/styles/base.css';
import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';

export default function VideoPlayer({ 
  videoSrc, 
  posterSrc, 
  title, 
  episode, 
  onPrevEpisode, 
  onNextEpisode, 
  hasPrevEpisode = true, 
  hasNextEpisode = true,
  subtitleOptions = [],
  episodeId
}) {
  const playerRef = useRef(null);
  const playerContainerRef = useRef(null);
  const [showControls, setShowControls] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [showNextEpisode, setShowNextEpisode] = useState(false);
  const [selectedResolution, setSelectedResolution] = useState(1080);
  const [selectedSubtitle, setSelectedSubtitle] = useState(
    subtitleOptions.length > 0 ? subtitleOptions[0].id : null
  );
  const [danmakuItems, setDanmakuItems] = useState([]);
  const [hlsInstance, setHlsInstance] = useState(null);
  const router = useRouter();
  const apiHost = process.env.NEXT_PUBLIC_API_HOST || '';

  // 相当于 Vue 的 onMounted
  useEffect(() => {
    // 初始化播放器和发送最后观看记录
    const initPlayer = async () => {

      await fetchEpisodeInfo();
      const hlsEnabled = await fetchHlsEnabled();
      
      if (hlsEnabled && Hls.isSupported()) {
        initializeHls(selectedResolution);
      }
    };
    
    initPlayer();
    
    // 设置全屏错误监听器
    document.addEventListener("fullscreenerror", handleFullscreenError);
    
    // 清理函数 (相当于 onBeforeUnmount)
    return () => {
      if (hlsInstance) {
        hlsInstance.destroy();
      }
      document.removeEventListener("fullscreenerror", handleFullscreenError);
    };
  }, [episodeId]);

  // 监听播放进度
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    const handleTimeUpdate = () => {
      const duration = player.duration;
      const currentTime = player.currentTime;
      setCurrentTime(currentTime);
      
      // 显示下一集按钮
      if (duration && duration - currentTime <= 30) {
        setShowNextEpisode(true);
      } else {
        setShowNextEpisode(false);
      }
    };
    
    player.addEventListener('timeupdate', handleTimeUpdate);
    
    return () => {
      player.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [playerRef.current]);

  // 获取弹幕数据
  const fetchDanmakuItems = async (episodeId) => {
    try {
      const response = await fetch(`${apiHost}/api/bangumi/danmaku/${episodeId}`);
      const data = await response.json();
      setDanmakuItems(data.danmakus);
      // console.log('获取到弹幕数量:', data.danmakus.length);
    } catch (error) {
      console.error('获取弹幕失败:', error);
    }
  };

  // 获取剧集信息
  const fetchEpisodeInfo = async () => {
    try {
      // 获取剧集信息
      const response = await fetch(`${apiHost}/api/bangumi/episode/${episodeId}`);
      const data = await response.json();
      
      // 设置视频源
      const videoUrl = `${apiHost}/videos${data.file_path}/${data.file_name}`;
      
      // 设置字幕
      if (data.subtitles && data.subtitles.length > 0) {
        const subtitleUrl = `${apiHost}/subtitles${data.file_path}/${data.subtitles[0]}`;
        loadSubtitles(subtitleUrl);
      }

      // 获取弹幕数据
      await fetchDanmakuItems(episodeId);
    } catch (error) {
      console.error('获取剧集信息失败:', error);
    }
  };

  // 加载字幕
  const loadSubtitles = async (subtitleUrl) => {
    if (!subtitleUrl) return;
    
    try {
      const response = await fetch(subtitleUrl);
      const subtitleText = await response.text();
      
      // 在 vidstack 中添加字幕轨道
      // 注意：Vidstack 支持 WebVTT 格式，如果原始字幕是 ASS 格式，需要转换
      // 这里简化处理，实际应用中可能需要 ASS 到 VTT 的转换库
      const player = playerRef.current;
      if (player) {
        // 创建字幕轨道
        const track = document.createElement('track');
        track.kind = 'subtitles';
        track.label = '字幕';
        track.default = true;
        
        // 这里需要将 ASS 内容转换为 WebVTT 或者使用第三方库显示
        // 此处代码仅作示例，实际实现可能更复杂
      }
    } catch (error) {
      console.error('加载或解析字幕失败:', error);
    }
  };

  // 初始化 HLS
  const initializeHls = (resolution) => {
    if (!Hls.isSupported() || !playerRef.current) return;
    
    // 销毁已有的 HLS 实例
    if (hlsInstance) {
      hlsInstance.destroy();
    }
    
    // 创建新的 HLS 实例
    const config = {
      maxBufferLength: 30,
      maxMaxBufferLength: 60,
    };
    
    const hls = new Hls(config);
    setHlsInstance(hls);
    
    hls.attachMedia(playerRef.current.media);
    
    hls.on(Hls.Events.MEDIA_ATTACHED, async () => {
      try {
        const response = await fetch(`${apiHost}/api/playlist/${episodeId}`, {
          method: 'POST'
        });
        console.log('Playlist API 响应:', await response.json());
        hls.loadSource(`${apiHost}/stream/playlist_${resolution}.m3u8`);
      } catch (error) {
        console.error('调用播放列表 API 错误:', error);
      }
    });
    
    // 添加其他 HLS 事件处理
    hls.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            if (data.response && data.response.code === 404) {
              hls.startLoad();
            }
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            hls.recoverMediaError();
            console.error('媒体错误:', data.details);
            break;
          default:
            console.error('未知错误:', data.details);
            break;
        }
      }
    });
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

  // 处理全屏错误
  const handleFullscreenError = (event) => {
    console.error("全屏错误可能是由于iframe没有全屏权限导致的");
    console.log(event);
  };

  // 处理清晰度变更
  const handleResolutionChange = (resolution) => {
    setSelectedResolution(resolution);
    
    // 获取当前播放时间
    const currentTime = playerRef.current?.currentTime || 0;
    
    // 使用新清晰度初始化HLS
    initializeHls(resolution);
    
    // 在播放器准备好后设置时间并播放
    playerRef.current.addEventListener('canplay', () => {
      playerRef.current.currentTime = currentTime;
      playerRef.current.play();
    }, { once: true });
  };

  // 处理字幕变更
  const handleSubtitleChange = (id) => {
    setSelectedSubtitle(id);
    // 这里可以添加切换字幕的逻辑
  };

  return (
    <div className="flex flex-col items-center my-8 w-full mx-auto"> {/* Removed max-w-5xl */}
      {/* 标题栏 */}
      <h1 className="text-2xl font-bold mb-4">{title} </h1>

      {/* 视频播放器 */}
      <div ref={playerContainerRef} className="w-full aspect-video bg-black rounded-lg overflow-hidden relative">
        <MediaPlayer
          ref={playerRef}
          className="w-full h-full"
          title={`${title} 第${episode}话`}
          src={videoSrc}
          aspectRatio={16/9}
          crossorigin="anonymous"
        >  <MediaProvider />
          <DefaultVideoLayout
            icons={defaultLayoutIcons}
            slots={{
              // 这里可以自定义播放器UI
              beforeControls: (
                <>
                  {/* 弹幕容器 - 实际应用中需要额外的弹幕渲染逻辑 */}
                  <div className="absolute inset-0 pointer-events-none">
                    {/* {danmakuItems.map((item, index) => (
                      // 渲染弹幕，这里仅作示例
                      <div key={index} className="absolute"></div>
                    ))} */}
                  </div>
                </>
              ),
              // 添加清晰度选择菜单
              settingsMenu: (props) => {
                // The original `menu` prop likely contains the default settings items.
                // You should render it alongside your custom items.
                const { menu } = props;
                // Add console logs to debug
                console.log('Rendering settingsMenu, props:', props);
                console.log('Rendering settingsMenu, menu prop:', menu);
                return (
                  <div className="vds-menu-items">
                    {/* Render the default menu items passed via props */}
                    {menu}
                    {/* Your custom resolution menu item */}
                    <div className="vds-menu-item" role="menuitem">
                      <div className="vds-menu-button">清晰度</div>
                      <div className="vds-menu">
                        <div className="vds-menu-items">
                          <button
                            className={`vds-menu-item ${selectedResolution === 480 ? 'vds-active' : ''}`}
                            onClick={() => handleResolutionChange(480)}
                          >
                            480P
                          </button>
                          <button
                            className={`vds-menu-item ${selectedResolution === 720 ? 'vds-active' : ''}`}
                            onClick={() => handleResolutionChange(720)}
                          >
                            720P
                          </button>
                          <button
                            className={`vds-menu-item ${selectedResolution === 1080 ? 'vds-active' : ''}`}
                            onClick={() => handleResolutionChange(1080)}
                          >
                            1080P
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              },
            }}
          />
          
          {/* 字幕轨道 */}
          {subtitleOptions.map((option) => (
            <Track
              key={option.id}
              kind="subtitles"
              label={option.name}
              src={option.url}
              srcLang={option.lang || 'zh'}
              default={option.id === selectedSubtitle}
            />
          ))}
          
          <Poster className="absolute inset-0 z-0" src={posterSrc} alt={title} />
        </MediaPlayer>
        
        {/* 下一集按钮 */}
        {showNextEpisode && (
          <div className="absolute right-10 bottom-20 z-20">
            <button 
              onClick={onNextEpisode} 
              className="bg-white bg-opacity-90 text-black px-5 py-2.5 rounded font-medium hover:bg-opacity-100 transform hover:scale-105 transition duration-300"
            >
              播放下一集
            </button>
          </div>
        )}
      </div>

      {/* 上下集按钮 */}
      <div className="flex justify-between w-full mt-4">
        <button 
          onClick={onPrevEpisode} 
          className={`px-5 py-2 rounded ${hasPrevEpisode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}`}
          disabled={!hasPrevEpisode}
        >
          上一集
        </button>
        <button 
          onClick={onNextEpisode} 
          className={`px-5 py-2 rounded ${hasNextEpisode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}`}
          disabled={!hasNextEpisode}
        >
          下一集
        </button>
      </div>

    </div>
  );
}