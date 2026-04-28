FROM oven/bun:1 as build

WORKDIR /app

# Copy package files first (cached layer — only busted if deps change)
COPY package.json bun.lock ./

# Install dependencies
RUN bun install

# CACHEBUST arg — changes every deploy to force a fresh source copy + build
# Passed in from docker-compose as IMAGE_TAG (timestamp), so layer cache is
# always invalidated here even if individual source files look unchanged to Docker.
ARG CACHEBUST=1
RUN echo "Build: $CACHEBUST"

# Copy source code (cache always busted by CACHEBUST above)
COPY . .

# Build the app
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN bun run build

# Production stage with Nginx
FROM nginx:alpine

# Copy built files
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
