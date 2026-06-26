FROM node:22-bookworm-slim

RUN apt-get update \
	&& apt-get install -y --no-install-recommends unzip \
	&& rm -rf /var/lib/apt/lists/*

WORKDIR /app/adminpanel

COPY src/frontend/adminpanel/package.json src/frontend/adminpanel/package-lock.json ./
RUN npm ci

COPY src/frontend/adminpanel/ ./

RUN npm run build && \
    find .next/standalone -name 'server.js' -not -path '*/node_modules/*' | head -1 | xargs dirname | xargs -I{} ln -sfn /app/adminpanel/public {}/public

EXPOSE 3001

ENV PORT=3001
ENV HOSTNAME=0.0.0.0
# standalone: находим server.js автоматически по любому вложенному пути
CMD ["sh", "-c", "srv=$(find .next/standalone -name 'server.js' -not -path '*/node_modules/*' | head -1); if [ -n \"$srv\" ]; then exec node \"$srv\"; else exec npx next start -p 3001; fi"]

