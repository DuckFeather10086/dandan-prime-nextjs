'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { api } from '@/utils/api';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function SettingsPage() {
  const [hlsEnabled, setHlsEnabled] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHLSStatus = async () => {
      try {
        const data = await api.getHLSStatus();
        setHlsEnabled(data.hls_enabled);
      } catch (error) {
        console.error('获取HLS状态失败:', error);
        toast.error('获取HLS状态失败');
      } finally {
        setIsLoading(false);
      }
    };

    fetchHLSStatus();
  }, []);

  const handleUpdateMediaLibrary = async () => {
    setIsUpdating(true);
    try {
      await api.updateMediaLibrary();
      toast.success('媒体库更新成功');
    } catch (error) {
      console.error('更新媒体库失败:', error);
      toast.error('更新媒体库失败，请重试');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleHLS = async () => {
    const newStatus = !hlsEnabled;
    setHlsEnabled(newStatus);
    try {
      const success = await api.updateHLSStatus(newStatus);
      if (!success) {
        throw new Error('API call failed');
      }
      toast.success(`HLS ${newStatus ? '启用' : '禁用'}成功`);
    } catch (error) {
      console.error('切换HLS状态失败:', error);
      toast.error('切换HLS状态失败');
      // Revert the toggle if the API call fails
      setHlsEnabled(!newStatus);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-2xl font-bold mb-6">系统设置</h2>
          
          <div className="divider my-2"></div>
          
          <div className="flex flex-col gap-6">
            {/* Media Library Update */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 bg-base-200 rounded-lg">
              <div>
                <h3 className="font-semibold text-lg">媒体库更新</h3>
                <p className="text-sm opacity-70">更新您的媒体文件索引</p>
              </div>
              <button
                className={`btn ${isUpdating ? 'btn-disabled' : 'btn-primary'}`}
                onClick={handleUpdateMediaLibrary}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    更新中...
                  </>
                ) : (
                  '更新媒体库'
                )}
              </button>
            </div>

            {/* HLS Streaming */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 bg-base-200 rounded-lg">
              <div>
                <h3 className="font-semibold text-lg">HLS 流媒体</h3>
                <p className="text-sm opacity-70">启用 HLS 推流（兼容性更强）</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">{hlsEnabled ? '已启用' : '未启用'}</span>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="hls-toggle"
                    checked={hlsEnabled}
                    onCheckedChange={handleToggleHLS}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
