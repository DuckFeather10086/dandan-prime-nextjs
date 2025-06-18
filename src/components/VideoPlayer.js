'use client';

import { useState, useRef, useEffect } from 'react';
import Artplayer from 'artplayer';
import Hls from 'hls.js';



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
  subtitleOptions = [],
  episodeId
}) {
  const artRef = useRef();
  const assRef = useRef(null);
  const playerRef = useRef(null);
  const [showNextEpisode, setShowNextEpisode] = useState(false);
  const [selectedResolution, setSelectedResolution] = useState(1080);
  const [hlsInstance, setHlsInstance] = useState(null);
  const apiHost = process.env.NEXT_PUBLIC_API_HOST || '';

  useEffect(() => {
    let art = null;
    let hls = null;
    let assInstance = null;


      try {
        // 获取剧集信息


        art = new Artplayer({
          container: artRef.current,
          url: videoSrc,
          poster: posterSrc,
          title: `${title} 第${episode}话`,
          volume: 0.5,
          isLive: false,
          muted: false,
          autoplay: false,
          pip: true,
          autoSize: true,
          autoMini: true,
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
                  maxBufferLength: 30,
                  maxMaxBufferLength: 60,
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
        });

        playerRef.current = art;

        if (typeof window !== 'undefined') {
          (async () => {
            const { default: ASS } = await import('assjs');
            
            try {
              const response = await fetch(subtitleSrc);
              const text = await response.text();
              
              assInstance = new ASS(text, art.template.$video, {
                container: assRef.current,
              });
              
              assInstance.show();
            } catch (error) {
              console.error('Error loading subtitles:', error);
            }
          })();
        }

        art.on('video:timeupdate', () => {
          const duration = art.duration;
          const currentTime = art.currentTime;

          if (duration && duration - currentTime <= 30) {
            setShowNextEpisode(true);
          } else {
            setShowNextEpisode(false);
          }
        });
      } catch (error) {
        console.error('初始化播放器失败:', error);
      }



    return () => {
      if (playerRef.current) {
        playerRef.current.destroy(false);
        playerRef.current = null;
      }
      if (hls) {
        hls.destroy();
      }
    };
  }, [episodeId, videoSrc, posterSrc, title, episode, selectedResolution, subtitleOptions, apiHost]);

  const handleResolutionChange = async (resolution) => {
    setSelectedResolution(resolution);
    const currentTime = playerRef.current?.currentTime || 0;

    try {
      await fetch(`${apiHost}/api/playlist/${episodeId}`, {
        method: 'POST'
      });

      if (hlsInstance) {
        hlsInstance.loadSource(`${apiHost}/stream/playlist_${resolution}.m3u8`);
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
        <div className="relative w-full aspect-video">
          {/* Artplayer 容器 */}
          <div ref={artRef} className="w-full h-full" />

          {/* ASS 容器 - 绝对定位在 Artplayer 上层 */}
          <div
            ref={assRef}
            className="absolute inset-0 z-10 pointer-events-none"
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