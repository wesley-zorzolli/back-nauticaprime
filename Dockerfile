FROM mcr.microsoft.com/playwright:focal

# Workdir
WORKDIR /app

# Copy package files and install dependencies (including dev so ts-node-dev is available)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy app source
COPY . ./

# Expose port
EXPOSE 3000

# Default env - override with docker-compose or env_file
ENV NODE_ENV=development

# Use a volume for venom profile (can be overridden by env VENOM_PROFILE_DIR)
VOLUME ["/data"]

# Start dev server
CMD ["npm", "run", "dev"]
