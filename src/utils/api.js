const apiHost = process.env.NEXT_PUBLIC_API_HOST || '';

async function request(path, options) {
  const response = await fetch(`${apiHost}${path}`, options);
  if (!response.ok) throw new Error(`请求失败 (${response.status})`);
  return response;
}

export const api = {
  async getHLSStatus() { return (await request('/api/hls/enabled')).json(); },
  async updateHLSStatus(enable) { await request(`/api/hls_enable?enable=${enable}`, { method: 'PUT' }); return true; },
  async updateMediaLibrary() { await request('/api/bangumi/media-library', { method: 'POST' }); return true; },
};
export default api;
