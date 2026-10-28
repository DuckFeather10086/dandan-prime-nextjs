'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

const KEY = 'dandan.libraryPreferences';
const EMPTY = { favorites: [], watched: [] };
function read() {
  const data = JSON.parse(localStorage.getItem(KEY) || 'null');
  return { favorites: Array.isArray(data?.favorites) ? data.favorites : [], watched: Array.isArray(data?.watched) ? data.watched : [] };
}

export function useLibraryPreferences() {
  const [preferences, setPreferences] = useState(EMPTY);
  useEffect(() => {
    const sync = () => { try { setPreferences(read()); } catch { /* Optional browser preferences. */ } };
    sync();
    const onStorage = event => { if (event.key === KEY || event.key === null) sync(); };
    window.addEventListener('storage', onStorage);
    window.addEventListener(KEY, sync);
    return () => { window.removeEventListener('storage', onStorage); window.removeEventListener(KEY, sync); };
  }, []);

  function toggle(kind, id) {
    try {
      const current = read();
      const value = String(id);
      current[kind] = current[kind].includes(value) ? current[kind].filter(item => item !== value) : [...current[kind], value];
      localStorage.setItem(KEY, JSON.stringify(current));
      window.dispatchEvent(new Event(KEY));
    } catch { toast.error('浏览器无法保存，请检查存储权限'); }
  }
  return { ...preferences, toggle };
}
