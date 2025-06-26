'use client';

import { useEffect, useRef } from 'react';

export default function ClientDPlayer({
  videoSrc, episodeId
}) {
  const playerRef = useRef(null);

  useEffect(() => {
    let dp;
    (async () => {
      const DPlayer = (await import('dplayer')).default;
      const apiHost = process.env.NEXT_PUBLIC_API_HOST;
      dp = new DPlayer({
        container: playerRef.current,
        video: { url: videoSrc },
        danmaku: {
          id: episodeId,
          api: `${apiHost}/api/bangumi/dplayer/danmaku/`,
        },
      });
    })();
    return () => dp?.destroy();
  }, [videoSrc, episodeId]);

  return <div ref={playerRef} className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vh]" />;
}
