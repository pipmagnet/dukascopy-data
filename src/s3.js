
const AWS = require("aws-sdk");
const s3 = new AWS.S3();

exports.store = function(bucket)
{
    this.bucket_name = bucket;
}

exports.store.prototype.exists = function(key)
{
    return s3.headObject({
        "Bucket": this.bucket_name,
        "Key": key,
    }).promise()
    .then(function() {
        return true;
    })
    .catch(function(error) {
        if (error.code == "NotFound")
            return false;
        else
            throw error;
    });
}

exports.store.prototype.put = function(key, body)
{
    return s3.putObject({
        "Bucket": this.bucket_name,
        "Key": key,
        "Body": body
    }).promise();
}
