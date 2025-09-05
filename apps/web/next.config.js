/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    domains: [
      'cdn.myanimelist.net',
      'media.kitsu.io',
      's4.anilist.co',
      'gogocdn.net',
      'img1.ak.crunchyroll.com',
      'artworks.thetvdb.com',
      'image.tmdb.org',
      'uploads.mangadex.org',
      'mangadex.org'
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/proxy/:path*',
        destination: 'https://api.consumet.org/:path*',
      },
    ];
  },
}

module.exports = nextConfig
