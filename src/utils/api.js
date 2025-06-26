const apiHost = process.env.NEXT_PUBLIC_API_HOST || '';

export const api = {
  async getHLSStatus() {
    try {
      const response = await fetch(`${apiHost}/api/hls/enabled`);
      const data = await response.json();
      if (!response.ok) throw new Error('Failed to fetch HLS status');
      return data;
    } catch (error) {
      console.error('Failed to fetch HLS status:', error);
      return false;
    }
  },

  async updateHLSStatus(enable) {
    try {   
      const response = await fetch(`${apiHost}/api/hls_enable?enable=${enable}`, {
        method: 'PUT',
      });
      if (!response.ok) throw new Error('Failed to update HLS status');
      return true;
    } catch (error) {
      console.error('Failed to update HLS status:', error);
      return false;
    }
  },

  async updateMediaLibrary() {
    try {
      const response = await fetch(`${apiHost}/api/bangumi/media-library`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to update media library');
      return true;
    } catch (error) {
      console.error('Failed to update media library:', error);
      return false;
    }
  },
};

export default api;
