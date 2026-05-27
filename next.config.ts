import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
    output: "standalone",
    transpilePackages: ["bcrypt"],
    experimental: {
        // Skip type checking during build (we run tsc --noEmit separately)
        typedRoutes: false,
    },
    // Prevent webpack from bundling node-only modules in server components
    webpack: (config, { isServer }) => {
        if (isServer) {
            config.module = config.module || {};
            config.module.rules = config.module.rules || [];
            config.module.rules.push({
                test: /node-pre-gyp/,
                loader: 'null-loader',
            });
        }
        return config;
    },
};

export default withNextIntl(nextConfig);
