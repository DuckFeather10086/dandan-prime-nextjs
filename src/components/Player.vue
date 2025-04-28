<template>
  <div class="video-player-container">
    <div ref="playerContainer" class="player-container" id="player-container">
      <div
        style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center;">
        <div id="ass-container" style="position: absolute; top: 0; left: 0;"></div>
      </div>
      <div v-if="showNextEpisode" class="next-episode-container">
        <button @click="playNextEpisode" class="next-episode-button">
          播放下一集
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, onMounted, onBeforeUnmount, ref } from 'vue';
import Hls from 'hls.js'
import { useRoute, useRouter } from 'vue-router'
import Player from 'nplayer';
import Danmaku from '@nplayer/danmaku';
import axios from 'axios';

export default defineComponent({
  name: 'PlayerPage',
  data() {
    return {
      episodeId: null,
      currentSegmentIndex: 0,
      currentLoadOffset: 0
    }
  },
  props: {
    paramEpisodeId: {
      required: true
    },
  },
  created() {
    this.initializePlayer()
  },
  methods: {
    initializePlayer() {
      this.episodeId = this.$route.params.episodeId
      console.log('Fetching season info for episode ID:', this.episodeId)
    },
    async fetchEpisodeInfo() {
    }
  },
  setup(props) {
    const playerContainer = ref(null);
    const subtitleContainer = ref(null);
    const videoSrc = ref('');
    const route = useRoute()
    const router = useRouter()
    var subtitleSrc = "";
    let player = null;
    let hls = null;
    let renderer = null;

    const danmakuItems = ref([]);
    const showNextEpisode = ref(false);

    const fetchDanmakuItems = async (episodeId) => {
      try {
        const apiHost = process.env.VUE_APP_API_HOST;
        const response = await fetch(apiHost + `/api/bangumi/danmaku/${episodeId}`);
        const data = await response.json();
        danmakuItems.value = data.danmakus;
        console.log('Fetched danmaku items len:', data.danmakus.length);
      } catch (error) {
        console.error('Failed to fetch danmaku items:', error);
      }
    };

    const fetchEpisodeInfo = async () => {
      try {
        const episodeId = route.params.episodeId;

        // Fetch episode info
        const apiHost = process.env.VUE_APP_API_HOST;
        const response = await fetch(apiHost + `/api/bangumi/episode/${episodeId}`);
        const data = await response.json();

        videoSrc.value = apiHost + `/videos${data.file_path}/${data.file_name}`;
        if (data.subtitles && data.subtitles.length > 0) {
          subtitleSrc = apiHost + `/subtitles${data.file_path}/${data.subtitles[0]}`;
        }

        // Fetch danmaku items
        await fetchDanmakuItems(episodeId);
      } catch (error) {
        console.error('Failed to fetch episode info:', error);
      }
    };

    const initializeSubtitles = async (subtitleSrc) => {
      console.log('Initializing subtitles1', props.subtitleSrc);
      console.log('Initializing subtitles2', subtitleSrc);
      if (subtitleSrc) {
        try {
          const [ASS, response] = await Promise.all([
            import('assjs'),
            fetch(subtitleSrc)
          ]);

          const subtitleText = await response.text();
          console.log('Subtitle text:', subtitleText);
          const ass = new ASS.default(subtitleText, player.video,);
          ass.show();

          console.info(player.video);


          player.on('timeupdate', () => {
            renderer.render(player.currentTime);
          });
        } catch (error) {
          console.error('Failed to load or parse subtitle:', error);
        }
      }
    };

    const initializeHls = async (hls, res) => {
      hls.attachMedia(player.video)
      hls.on(Hls.Events.MEDIA_ATTACHED, async function () {
        try {
          const apiHost = process.env.VUE_APP_API_HOST;
          const episodeID = route.params.episodeId
          const response = await axios.post(apiHost + '/api/playlist/' + episodeID);
          console.log('Playlist API response:', response.data);
          hls.loadSource(apiHost + '/stream/playlist_' + res + '.m3u8');
        } catch (error) {
          console.error('Error calling playlist API:', error);
        }
      })

      hls.on(Hls.Events.BUFFER_STALLED_ERROR, function () {
        console.warn('Buffer stalled. Requesting new segments...');
        const currentTime = player.video.currentTime;
        console.log(currentTime, currentTime + 30); // 请求接下来30秒的内容
        hls.recoverMediaError();
      });

      hls.on(Hls.Events.FRAG_LOADING, function (event, data) {
        console.log('Loading fragment:', data.frag.url);
        data.frag.startLoadTime = performance.now();
      });

      hls.on(Hls.Events.FRAG_LOADED, function (event, data) {
        const loadTime = performance.now() - data.frag.startLoadTime;
        console.log('Loaded fragment:', data.frag.url);
        console.log('Loading time:', loadTime, 'ms');
        console.log('Fragment loaded:', data.frag.sn);
        this.currentSegmentIndex = data.frag.sn;
      });

      hls.on(Hls.Events.ERROR, function (event, data) {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (data.response && data.response.code === 404) {
                hls.startLoad()
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError()
              console.error('媒体错误:', data.details);
              break;
            default:
              console.error('未知错误:', data.details);
              break;
          }
        }
        console.log("error data:", data)
        if (data.details === Hls.ErrorDetails.BUFFER_STALLED_ERROR) {
          const nextFragmentStart = hls.streamController.nextLoadPosition;
          console.log('404_ERROR', "next fragment start: " + nextFragmentStart);
        }
      });
    }

    const sendLastWatchedData = async () => {
      try {
        const episodeId = route.params.episodeId;
        const apiHost = process.env.VUE_APP_API_HOST;
        const response = await fetch(apiHost + '/api/last_watched', {
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

    const fetchHlsEnabled = async () => {
      try {
        const apiHost = process.env.VUE_APP_API_HOST;
        const response = await fetch(apiHost + '/api/hls/enabled');
        const data = await response.json();
        return data.hls_enabled;
      } catch (error) {
        console.error('Failed to fetch HLS enabled status:', error);
        return false; // Default to false if there's an error
      }
    };

    const playNextEpisode = async () => {
      try {
        const episodeId = route.params.episodeId;
        const apiHost = process.env.VUE_APP_API_HOST;

        // 获取下一集信息
        const response = await fetch(apiHost + `/api/bangumi/next-episode/${episodeId}`);
        const data = await response.json();

        if (data.next_episode_id) {
          // 跳转到下一集
          router.push(`/watch/${data.next_episode_id}`);
        } else {
          console.log('没有下一集了');
        }
      } catch (error) {
        console.error('获取下一集信息失败:', error);
      }
    };

    onMounted(async () => {
      await sendLastWatchedData();
      await fetchEpisodeInfo();

      const danmaku = new Danmaku({
        items: danmakuItems.value,
      });
      console.log(danmaku)

      const resolutionSettingItem = {
        html: '清晰度',
        type: 'select',
        value: 1080,
        options: [
          { value: 480, html: '480P' },
          { value: 720, html: '720P' },
          { value: 1080, html: '1080P' },
        ],
        init(player) {
          player.playbackRate = 1;
        },
        change(value) {
          const currentTime = player.video.currentTime;
          console.log(currentTime)
          console.log(player)
          console.log("114514")

          if (hls) {
            hls.destroy();
          }
          var config = {
            maxBufferLength: 30,
            maxMaxBufferLength: 60,
          };
          hls = new Hls(config)

          initializeHls(hls, value).then(() => {
            // Pause the player at the saved time after initializeHls is done
            console.log(currentTime)
            player.video.currentTime = currentTime;
            player.video.play();
          });
        },
      }

      const MyPIP = {
        html: 'turn off subtitle',
        init() {
          this.invisible = !('pictureInPictureEnabled' in document);
          // 初始化是判断浏览器是否不支持，不支持则隐藏自己
        },
        click(player) {
          if (player.video.readyState < 3) return; // 视频还没加载成功
          if (document.pictureInPictureElement !== player.video) {
            player.video.requestPictureInPicture()
          } else {
            document.exitPictureInPicture()
          }
        }
      }
      console.log(videoSrc.value)
      player = new Player({
        src: videoSrc.value,
        controls: [
          [
            "play",
            "volume",
            "time",
            "spacer",
            "airplay",
            "settings",
            "web-fullscreen",
            "fullscreen"
          ],
          ["progress"]
        ],
        plugins: [danmaku],
        settings: [resolutionSettingItem, "speed"],
        bpControls: {},
        contextMenus: ['loop', 'pip', MyPIP, 'version'],
        contextMenuToggle: true,
      });

      player.mount(playerContainer.value);

      var config = {
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
      };
      hls = new Hls(config)

      // Initialize subtitles after player is mounted
      await initializeSubtitles(subtitleSrc);

      const useHls = await fetchHlsEnabled();

      if (useHls == true) {
        await initializeHls(hls, 1080);
      }

      document.addEventListener("fullscreenerror", (event) => {
        console.error("全屏错误可能是由于iframe没有全屏权限导致的");
        console.log(event);
      });

      player.on('timeupdate', () => {
        const duration = player.video.duration;
        const currentTime = player.video.currentTime;

        // 当视频播放到倒数30秒时显示下一集按钮
        if (duration - currentTime <= 30) {
          showNextEpisode.value = true;
        } else {
          showNextEpisode.value = false;
        }
      });
    });

    onBeforeUnmount(() => {
      if (renderer) {
        renderer.destroy();
      }
    });

    return {
      playerContainer,
      subtitleContainer,
      videoSrc,
      subtitleSrc,
      danmakuItems,
      showNextEpisode,
      playNextEpisode
    };
  }
});
</script>

<style scoped>
.video-player-container {
  width: 100%;
  padding: 3px 3px;
  max-width: 1200px;
  margin: 0 auto;
  margin-top: 10vh;
  background-color: #1e1e1e;
  color: white;
}

.player-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #000;
}

.next-episode-container {
  position: absolute;
  right: 40px;
  bottom: 80px;
  z-index: 2;
}

.next-episode-button {
  background-color: rgba(255, 255, 255, 0.9);
  color: #000;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
}

.next-episode-button:hover {
  background-color: rgba(255, 255, 255, 1);
  transform: scale(1.05);
}
</style>