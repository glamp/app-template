#!/bin/bash

docker run \
  --rm \
  -p 6379:6379 \
  -i redis
