/** @type {import('next').NextConfig} */

// 后端地址只在服务端使用（rewrites 在 Node 侧求值），不会打进浏览器 bundle。
// 浏览器一律走同源路径，从哪个 IP / 域名访问都能用。
const backendOrigin = process.env.BACKEND_ORIGIN || 'http://127.0.0.1:1234';

// 需要转发给 Go 后端的路径前缀
const proxiedPrefixes = ['api', 'videos', 'subtitles', 'stream', 'segment', 'images'];

const nextConfig = {
  distDir: process.env.DANDAN_BUILD_DIR || '.next',
  reactStrictMode: true,
  basePath: '', // 确保 basePath 为空，或者正确设置
  trailingSlash: false, // 确保符合你预期的路由格式
  // Add the images configuration here
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'api.bgm.tv', pathname: '/v0/subjects/**' }],
  },
  // 保证这个变量在 bundle 里总是有定义。有几处代码是 `${process.env.NEXT_PUBLIC_API_HOST}`
  // 裸用没有兜底，变量缺失会被内联成字符串 "undefined"。
  // 默认空串 = 浏览器走同源相对路径，由下面的 rewrites 转发到后端。
  env: {
    NEXT_PUBLIC_API_HOST: process.env.NEXT_PUBLIC_API_HOST || '',
  },
  async rewrites() {
    return proxiedPrefixes.map((prefix) => ({
      source: `/${prefix}/:path*`,
      destination: `${backendOrigin}/${prefix}/:path*`,
    }));
  },
}

module.exports = nextConfig
