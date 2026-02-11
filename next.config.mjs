/** @type {import('next').NextConfig} */
// Always allow ImageKit host used by project images
const domains = ['ik.imagekit.io'];
try {
    if (process.env.IMAGEKIT_URL_ENDPOINT) {
        const u = new URL(process.env.IMAGEKIT_URL_ENDPOINT);
        if (!domains.includes(u.hostname)) domains.push(u.hostname);
    }
    if (process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT) {
        const u2 = new URL(process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT);
        if (!domains.includes(u2.hostname)) domains.push(u2.hostname);
    }
} catch {}

// Allow Clerk hosted images (avatars, icons)
// Include common Clerk hosts to avoid runtime errors when rendering user images
['img.clerk.com', 'img.clerkstage.dev', 'img.lclclerk.com', 'images.clerk.dev'].forEach((host) => {
    if (!domains.includes(host)) domains.push(host);
});

const nextConfig = {
    images: {
        unoptimized: false,
        domains,
        // Allow the same hosts via remotePatterns for fine-grained control
        remotePatterns: domains.map((host) => ({ protocol: 'https', hostname: host, pathname: '/:path*' })),
        formats: ['image/avif', 'image/webp'],
        deviceSizes: [320, 420, 640, 768, 1024, 1280, 1536, 1920],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384]
    },

    // Skip static generation for authenticated routes
    async headers() {
        return [
            {
                source: '/store/:path*',
                headers: [
                    {
                        key: 'X-Robots-Tag',
                        value: 'noindex',
                    },
                ],
            },
            {
                source: '/admin/:path*',
                headers: [
                    {
                        key: 'X-Robots-Tag',
                        value: 'noindex',
                    },
                ],
            },
        ];
    },
};

export default nextConfig;
