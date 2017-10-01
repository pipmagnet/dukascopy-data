
const request = require("request");
const left_pad = require("leftpad");
const util = require("util");
const AWS = require("aws-sdk");
const stream = require("stream");
const lzma = require("lzma-native");
const fs = require("fs");
const streamBuffers = require("stream-buffers");

const bucket = "ticktech-data";

var s3 = new AWS.S3();


function date_to_hour(date)
{
    date.setUTCMinutes(0);
    date.setUTCSeconds(0);
    date.setUTCMilliseconds(0);
}

function mid_date(start, end)
{
    var date = new Date((start.valueOf() + end.valueOf())/ 2);

    date_to_hour(date);

    return date;
}

function dukascopy_url(date)
{
    return util.format("http://dukascopy.com/datafeed/EURUSD/%s/%s/%s/%sh_ticks.bi5",
        left_pad(date.getUTCFullYear(), 4, "0"),
        left_pad(date.getUTCMonth(), 2, "0"),
        left_pad(date.getUTCDate(), 2, "0"),
        left_pad(date.getUTCHours(), 2, "0"));
}

function s3_key(date)
{
    return util.format("dukascopy/EURUSD/%s/%s/%s/%sh_ticks.bin",
        left_pad(date.getUTCFullYear(), 4, "0"),
        left_pad(date.getUTCMonth(), 2, "0"),
        left_pad(date.getUTCDate(), 2, "0"),
        left_pad(date.getUTCHours(), 2, "0"));
}

function s3_exists(key, callback)
{
    s3.headObject({
        "Bucket": bucket,
        "Key": key
    }, function(err, data) {
        if (err == null) {
            callback(null, { exists: true});
        } else {
            if (err.code == "NotFound") {
                callback(null, { exists: false});
            } else {
                callback(err);
            }
        }
    });
}


function bin_search(start, end, callback)
{
    date_to_hour(start);
    date_to_hour(end);

    if (start.getTime() == end.getTime()) {
        callback(null, start);
        return;
    }

    var mid = mid_date(start, end);
    console.log("probe " + mid);

    const key = s3_key(mid);

    s3_exists(key, function(err, data) {
        if (err) callback(err);
        if (data) {
            if (data.exists)
                bin_search(mid, end, callback);
            else
                bin_search(start, mid, callback);
        }
    });
}


function fetch_date(date, callback)
{
    console.log(date);

    const url = dukascopy_url(date);
    const key = s3_key(date);

    var bi5stream = request.get(url);

    bi5stream.on('response', (response) =>  {
            var decomp = null;
            if (response.headers['content-length'] > 0) {
                decomp = lzma.createDecompressor();
            } else {
                decomp = new stream.PassThrough();
            }

            var buffer = new streamBuffers.WritableStreamBuffer({
                initialSize: (100*1024)
            });

            bi5stream
                .pipe(decomp)
                .pipe(buffer)
                .on('error',  callback)
                .on('finish', () => {
                    s3.putObject({
                        "Bucket": bucket,
                        "Key": key,
                        "Body": buffer.size() > 0 ? buffer.getContents() : ""
                    }, callback);
                });
    });
}

function fetch_range(start, end, callback) {
    fetch_date(start, function(err) {
        if (err)
            callback(err)
        else {
            var hours = start.getUTCHours();
            start.setUTCHours(hours + 1);

            if (start > end) {
                callback();
            } else {
                fetch_range(start, end, callback);
            }
        }
    });
}


var start = new Date(Date.UTC(2004, 0, 1));
var end = new Date(Date.now());

bin_search(
    start,
    end,
    function(err, data) {
        if (err) console.log(err);
        if (data) {
            fetch_range(data, end, function(err) {
                if (err) console.log(err);
            });
        }
    }
);
