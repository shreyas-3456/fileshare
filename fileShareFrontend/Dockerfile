# Use an official Node runtime as a parent image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy project files
COPY . .

# Copy certificate files into the container

# Expose port 3000
EXPOSE 3000

# Run the development server with HTTPS
CMD ["npm", "run", "start"]