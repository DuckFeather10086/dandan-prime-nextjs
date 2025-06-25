'use client';

import { useState, useRef, useEffect } from 'react';
import Artplayer from 'artplayer';
import Hls from 'hls.js';
import artplayerPluginDanmuku from 'artplayer-plugin-danmuku';
import artplayerPluginLibass from 'artplayer-plugin-libass';



export default function VideoPlayer({
  videoSrc,
  posterSrc,
  subtitleSrc,
  title,
  episode,
  onPrevEpisode,
  onNextEpisode,
  hasPrevEpisode = true,
  hasNextEpisode = true,
  episodeId,
  danmakuItems = [],
  hlsEnabled = false
}) {
  const artRef = useRef();
  const assRef = useRef(null);
  const playerRef = useRef(null);
  const assInstanceRef = useRef(null);
  const [showNextEpisode, setShowNextEpisode] = useState(false);
  const [selectedResolution, setSelectedResolution] = useState(1080);
  const [hlsInstance, setHlsInstance] = useState(null);
  const apiHost = process.env.NEXT_PUBLIC_API_HOST || '';

  

  useEffect(() => {
    let art = null;
    let hls = null;

    // Ensure the container exists before initializing
    if (!artRef.current) {
      console.warn('ArtPlayer container not found');
      return;
    }

    if (!subtitleSrc || !artRef.current) {
      console.warn('ArtPlayer container or subtitleSrc not ready');
      return;
    }

    try {
      console.log('subtitleSrc', subtitleSrc);

      art = new Artplayer({
        subtitle: {
          url:subtitleSrc,
        },

        container: artRef.current,
        url: videoSrc,
        poster: posterSrc,
        title: `${title} 第${episode}话`,
        volume: 0.5,
        isLive: false,
        muted: false,
        autoplay: false,
        pip: true,
        screenshot: true,
        setting: true,
        loop: false,
        flip: true,
        playbackRate: true,
        aspectRatio: true,
        fullscreen: true,
        fullscreenWeb: true,
        subtitleOffset: true,
        miniProgressBar: true,
        mutex: true,
        backdrop: true,
        playsInline: true,
        autoPlayback: true,
        airplay: true,
        theme: '#23ade5',
        lang: navigator.language.toLowerCase(),
        whitelist: ['*'],
        settings: [{
          html: '清晰度',
          icon: '<svg>...</svg>',
          selector: [
            {
              html: '1080P',
              value: 1080,
              default: selectedResolution === 1080,
            },
            {
              html: '720P',
              value: 720,
              default: selectedResolution === 720,
            },
            {
              html: '480P',
              value: 480,
              default: selectedResolution === 480,
            },
          ],
          onSelect: function (item) {
            setSelectedResolution(item.value);
            handleResolutionChange(item.value);
          },
        }],
        
        customType: {
          m3u8: function (video, url) {
            if (Hls.isSupported() && hlsEnabled) {
              hls = new Hls({
                maxBufferLength: 100,
                maxMaxBufferLength: 200,
              });
              setHlsInstance(hls);
              hls.loadSource(url);
              hls.attachMedia(video);
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
            }
          },
        },

        plugins: [
          artplayerPluginDanmuku({
              danmuku: danmakuItems,
              speed: 5, // 弹幕持续时间，范围在[1 ~ 10]
              margin: [10, '25%'], // 弹幕上下边距，支持像素数字和百分比
              opacity: 1, // 弹幕透明度，范围在[0 ~ 1]
              color: '#FFFFFF', // 默认弹幕颜色，可以被单独弹幕项覆盖
              mode: 0, // 默认弹幕模式: 0: 滚动，1: 顶部，2: 底部
              modes: [0, 1, 2], // 弹幕可见的模式
              fontSize: 25, // 弹幕字体大小，支持像素数字和百分比
              antiOverlap: true, // 弹幕是否防重叠
              synchronousPlayback: false, // 是否同步播放速度
              mount: undefined, // 弹幕发射器挂载点, 默认为播放器控制栏中部
              heatmap: true, // 是否开启热力图
              width: 512, // 当播放器宽度小于此值时，弹幕发射器置于播放器底部
              points: [], // 热力图数据
              filter: (danmu) => danmu.text.length <= 100, // 弹幕载入前的过滤器
              beforeVisible: () => true, // 弹幕显示前的过滤器，返回 true 则可以发送
              visible: true, // 弹幕层是否可见
              emitter: true, // 是否开启弹幕发射器
              maxLength: 200, // 弹幕输入框最大长度, 范围在[1 ~ 1000]
              lockTime: 5, // 输入框锁定时间，范围在[1 ~ 60]
              theme: 'dark', // 弹幕主题，支持 dark 和 light，只在自定义挂载时生效
              OPACITY: {}, // 不透明度配置项
              FONT_SIZE: {}, // 弹幕字号配置项
              MARGIN: {}, // 显示区域配置项
              SPEED: {}, // 弹幕速度配置项
              COLOR: [], // 颜色列表配置项
          }),
          artplayerPluginLibass({
            workerUrl: 'http://100.115.247.103:3000/assets/wasm/subtitles-octopus-worker.js',
            wasmUrl: 'http://100.115.247.103:3000/assets/wasm/subtitles-octopus-worker.wasm',
            fallbackFont: 'http://100.115.247.103:3000/assets/fonts/SourceHanSansCN-Bold.woff2'
          }),
        ],
      });

      // init
      art.on('artplayerPluginLibass:init', (adapter) => {
        console.info('artplayerPluginLibass:init', adapter);
      });

      // subtitle switch
      art.on('artplayerPluginLibass:switch', (url) => {
        console.info('artplayerPluginLibass:switch', url);
      })

      // subtitle visible
      art.on('artplayerPluginLibass:visible', (visible) => {
        console.info('artplayerPluginLibass:visible', visible);
      })

      // subtitle timeOffset
      art.on('artplayerPluginLibass:timeOffset', (timeOffset) => {
        console.info('artplayerPluginLibass:timeOffset', timeOffset);
      })

      // destroy
      art.on('artplayerPluginLibass:destroy', () => {
        console.info('artplayerPluginLibass:destroy');
      })

      // Store the player instance
      playerRef.current = art;

      // Load ASS subtitles
      const loadSubtitles = async () => {
        if (typeof window === 'undefined' || !subtitleSrc) return;
        
        try {
          // Clean up existing instance if it exists
          if (assInstanceRef.current) {
            assInstanceRef.current.destroy();
            assInstanceRef.current = null;
          }

          const { default: ASS } = await import('assjs');
          const response = await fetch(subtitleSrc);
          const text = await response.text();
          
          assInstanceRef.current = new ASS(text, art.template.$video, {
            container: assRef.current,
          });
          
          assInstanceRef.current.show();
        } catch (error) {
          console.error('Error loading subtitles:', error);
        }
      };

      // Initial subtitle load
      //loadSubtitles();
      
      // art.on('fullscreenWeb', loadSubtitles);
      // art.on('fullscreen', loadSubtitles);
      //art.on('fullscreenExit', loadSubtitles);

      art.on('video:timeupdate', () => {
        const duration = art.duration;
        const currentTime = art.currentTime;

        if (duration && duration - currentTime <= 30) {
          setShowNextEpisode(true);
        } else {
          setShowNextEpisode(false);
        }
      });

      // Cleanup function
      return () => {
        if (assInstanceRef.current) {
          assInstanceRef.current.destroy();
          assInstanceRef.current = null;
        }

        if (art) {
          art.off('resize');
          art.off('fullscreen');
          art.off('fullscreenWeb');
          art.destroy();
        }
        if (hls) {
          hls.destroy();
        }
      };
    } catch (error) {
      console.error('初始化播放器失败:', error);
    }
  }, [
    videoSrc,
    posterSrc,
    title,
    episode,
    selectedResolution,
    subtitleSrc,
    hlsEnabled,
    danmakuItems,
    apiHost,
    episodeId,
  ]);

  const handleResolutionChange = async (resolution) => {
    setSelectedResolution(resolution);
    const currentTime = playerRef.current?.currentTime || 0;

    try {
      await fetch(`${apiHost}/api/playlist/${episodeId}`, {
        method: 'POST',
      });

      if (hlsInstanceRef.current) {
        hlsInstanceRef.current.loadSource(`${apiHost}/stream/playlist_${resolution}.m3u8`);
        playerRef.current.currentTime = currentTime;
        playerRef.current.play();
      }
    } catch (error) {
      console.error('切换清晰度失败:', error);
    }
  };

  return (
    <div className="flex flex-col items-center my-8 w-full mx-auto">
      <h1 className="text-2xl font-bold mb-4">{title}</h1>

      <div className="w-full aspect-video bg-black rounded-lg overflow-hidden relative">
        <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden" style={{ position: 'relative', width: '100%', height: '100%' }}>
          <div ref={artRef} className="w-full h-full" />
          <div
            ref={assRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              zIndex: 10,
              pointerEvents: 'none',
              contain: 'layout',
              overflow: 'hidden',
            }}
          />
        </div>

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