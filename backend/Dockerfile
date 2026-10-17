# Build from the backend folder: docker build -t ellie-backend .
FROM node:22-alpine
WORKDIR /srv
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY scripts ./scripts
COPY prompts ./prompts
COPY data ./data
ENV NODE_ENV=production PORT=8080
USER node
EXPOSE 8080
CMD ["node", "src/index.js"]
