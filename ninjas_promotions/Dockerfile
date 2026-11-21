FROM node:24.13.0-alpine3.23

ARG BUILD_VERSION=0.1.2
ARG BUILD_ARCH
LABEL io.hass.version="${BUILD_VERSION}" \
      io.hass.arch="${BUILD_ARCH}" \
      io.hass.type="app" \
      org.opencontainers.image.title="Ninjas Promotions" \
      org.opencontainers.image.source="https://github.com/noesisaoliveira/ninjas_promotions"

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY src ./src
COPY public ./public
COPY icon.png logo.png ./

ENV NODE_ENV=production HOST=0.0.0.0 PORT=8099 INGRESS_ONLY=true
USER node
EXPOSE 8099
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD node -e "fetch('http://127.0.0.1:8099/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "src/server.js"]