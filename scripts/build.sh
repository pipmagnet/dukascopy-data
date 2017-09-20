#!/bin/sh -e

TAG=$(git rev-parse --short HEAD)

docker build -t ${DOCKER_IMAGE}:${TAG} job-docker

`aws ecr get-login --registry-ids ${AWS_ACCOUNT_ID} --no-include-email`

docker push ${DOCKER_IMAGE}:${TAG}
