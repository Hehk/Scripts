# Not the at all "small" but it works :P
FROM node:17
RUN apt-get update && apt-get install -y chromium
ENV CHROME_LOC=/usr/bin/chromium
ENV ANKI_URI=http://host.docker.internal:8765
WORKDIR /app
COPY . .
