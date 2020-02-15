#!/bin/bash

docker run \
  --rm \
  -e POSTGRES_USER=waldo \
  -e POSTGRES_PASSWORD=hot-under-the-collar-cockatrice \
  -e POSTGRES_DB=waldo \
  -p 5432:5432 \
  -i \
  postgres:latest
