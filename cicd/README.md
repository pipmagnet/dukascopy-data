# CI/CD Pipeline

The CI/CD pipeline is fully implemented in AWS using Code Pipeline and Code
Build. The pipeline consists of the following stages:
* GitHub commit notifications. The pipeline is triggered for each commit.
* Build dukascopy-data docker image
* Push the docker image to an EC2 Container Registry.

## Setup

`pipeline.yml` is the cloudformation template to set up the full pipeline. It
comes with one parameter:
* **GitHubOAuthToken**: This is a GitHub Personal Access Token and must include
  the `admin:repo_hook` scope.

Deploy the pipeline using the aws cli:

  aws cloudformation create-stack --stack-name dukascopy-data-pipeline --template-body file://template.yml --capabilities CAPABILITY\_IAM --parameters ParameterKey=GitHubOAuthToken,ParameterValue=<GitHub-OAuthToken>
