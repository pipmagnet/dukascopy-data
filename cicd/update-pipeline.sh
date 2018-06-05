#!/bin/sh

aws cloudformation update-stack --stack-name dukascopy-data-pipeline --template-body file://pipeline.yml --capabilities CAPABILITY_IAM --parameters ParameterKey=GitHubOAuthToken,UsePreviousValue=true
