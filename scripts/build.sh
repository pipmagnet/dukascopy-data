#!/bin/sh -e

TAG=$(git rev-parse --short HEAD)


docker build -t ${DOCKER_IMAGE}:${TAG} job-docker

`aws ecr get-login`

docker push ${DOCKER_IMAGE}:${TAG}
