
const AWS = require("aws-sdk");
const s3 = new AWS.S3();

exports.store = function(bucket)
{
    this.bucket_name = bucket;

}

exports.store.prototype.exists = function(key, callback)
{
    s3.headObject({
        "Bucket": this.bucket_name,
        "Key": key,
    }, function(err, data) {
        if (err == null)
            callback(null, true);
        else if (err.code == "NotFound")
            callback(null, false);
        else
            callback(err);
    });
}

exports.store.prototype.put = function(key, body, callback)
{
    s3.putObject({
        "Bucket": this.bucket_name,
        "Key": key,
        "Body": body
    }, callback);
}
