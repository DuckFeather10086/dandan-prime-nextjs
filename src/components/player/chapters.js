import artplayerPluginChapter from 'artplayer-plugin-chapter';
import './chapters.css';

// Keep the source titles. Trim overlapping chapter ends and fill untitled gaps
// so progress previews always describe the interval beneath the pointer.
function timelineChapters(source, duration) {
  if (!Number.isFinite(duration) || duration <= 0) return [];
  const chapters = source
    .filter(chapter => Number.isFinite(chapter.start) && Number.isFinite(chapter.end) && chapter.end > chapter.start && chapter.start >= 0 && chapter.start < duration)
    .map(chapter => ({ ...chapter, end: Math.min(chapter.end, duration), title: chapter.title?.trim() || '未命名章节' }))
    .sort((a, b) => a.start - b.start);
  const result = [];
  let position = 0;
  chapters.forEach((chapter, index) => {
    const end = Math.min(chapter.end, chapters[index + 1]?.start ?? duration);
    if (end <= chapter.start) return;
    if (chapter.start > position) result.push({ start: position, end: chapter.start, title: '未命名章节' });
    result.push({ ...chapter, end });
    position = end;
  });
  if (result.length && position < duration) result.push({ start: position, end: duration, title: '未命名章节' });
  return result;
}

export default function chapterTimeline(source) {
  return art => {
    const plugin = artplayerPluginChapter({ chapters: [] })(art);
    const { $player, $progress, $bottom } = art.template;
    const label = document.createElement('button');
    label.type = 'button';
    label.hidden = true;
    label.className = 'dandan-current-chapter';
    label.setAttribute('aria-haspopup', 'true');
    label.setAttribute('aria-label', '打开章节列表');
    const prefix = document.createElement('span');
    prefix.className = 'dandan-chapter-prefix';
    prefix.textContent = '当前章节';
    const title = document.createElement('span');
    title.className = 'dandan-current-chapter-name';
    const arrow = document.createElement('span');
    arrow.textContent = '›';
    arrow.setAttribute('aria-hidden', 'true');
    label.append(prefix, title, arrow);
    art.controls.add({ name: 'chapter-title', position: 'top', index: 5, html: label });
    // Keep touch coordinates and the danmaku heatmap tied to the seek bar.
    $bottom.insertBefore(art.controls['chapter-title'], $progress);
    let chapters = [];

    function updateCurrentChapter() {
      const chapter = chapters.find(item => art.currentTime >= item.start && art.currentTime < item.end) ||
        (art.currentTime >= art.duration ? chapters.at(-1) : null);
      label.hidden = !chapter;
      if (chapter) {
        title.textContent = chapter.title;
        label.title = chapter.title;
        label.setAttribute('aria-label', `当前章节：${chapter.title}，打开章节列表`);
        const setting = art.setting.find('chapters');
        if (setting) setting.tooltip = art.constructor.utils.escape(chapter.title);
      }
    }

    function updateTimeline() {
      chapters = timelineChapters(source, art.duration);
      // The upstream plugin mutates the list while filling gaps.
      plugin.update({ chapters: chapters.map(chapter => ({ ...chapter })) });
      $progress.querySelectorAll('.art-chapter').forEach(segment => {
        segment.title = segment.dataset.title;
      });
      updateCurrentChapter();
    }

    function hidePreview() { $player.classList.remove('dandan-chapter-hover'); }
    art.proxy(label, 'click', event => {
      event.stopPropagation();
      const setting = art.setting.find('chapters');
      if (setting) {
        art.setting.render(setting.selector);
        art.setting.show = true;
        art.controls.show = true;
      }
    });
    // ArtPlayer 5.2's progress bar predates the upstream plugin's hover class.
    // Its setBar event supplies both mouse previews and mobile drag positions.
    art.on('setBar', (type, percentage, event) => {
      if (type === 'hover') $player.classList.toggle('dandan-chapter-hover', !!event);
      if (type === 'played' && event?.touches?.length) art.emit('setBar', 'hover', percentage, event);
    });
    art.proxy($progress, 'mouseleave', hidePreview);
    art.proxy($progress, 'touchend', hidePreview);
    art.proxy($progress, 'touchcancel', hidePreview);
    art.on('video:loadedmetadata', updateTimeline);
    art.on('video:durationchange', updateTimeline);
    art.on('video:timeupdate', updateCurrentChapter);
    art.on('video:seeking', updateCurrentChapter);
    return plugin;
  };
}
