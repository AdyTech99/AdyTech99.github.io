# .devcontainer/Dockerfile

FROM node:14

# Install any required dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user and switch to it
RUN useradd -ms /bin/bash node
USER node

# Set the working directory
WORKDIR /workspace

# Copy the current directory contents into the container
COPY . .

# Install npm packages
RUN npm install
