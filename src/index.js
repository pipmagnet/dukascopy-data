
const request = require("request");
const left_pad = require("leftpad");
const util = require("util");
const stream = require("stream");
const lzma = require("lzma-native");
const fs = require("fs");
const streamBuffers = require("stream-buffers");
const minimist = require("minimist");

const s3store = require("./s3.js");

const bucket = "ticktech-data";

const args = minimist(process.argv.slice(2), {
    default: {
        i: "EURUSD"
    }
});

const instrument = args.i;

const store = new s3store.store(bucket);

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
    return util.format("http://dukascopy.com/datafeed/%s/%s/%s/%s/%sh_ticks.bi5",
        instrument,
        left_pad(date.getUTCFullYear(), 4, "0"),
        left_pad(date.getUTCMonth(), 2, "0"),
        left_pad(date.getUTCDate(), 2, "0"),
        left_pad(date.getUTCHours(), 2, "0"));
}

function s3_key(date)
{
    return util.format("dukascopy/%s/%s/%s/%s/%sh_ticks.bin",
        instrument,
        left_pad(date.getUTCFullYear(), 4, "0"),
        left_pad(date.getUTCMonth(), 2, "0"),
        left_pad(date.getUTCDate(), 2, "0"),
        left_pad(date.getUTCHours(), 2, "0"));
}


function bin_search(start, end, callback)
{
    date_to_hour(start);
    date_to_hour(end);

    if (end.getTime() - start.getTime() <= 1000 * 60 * 60) {
        const key = s3_key(start);
        /* check if start exists, if not then start should returned
         * otherwise end */
        store.exists(key, function(err, exists) {
            if (err)
                callback(err);
            else if (exists)
                callback(null, end);
            else
                callback(null, start);
        });
        return;
    }

    var mid = mid_date(start, end);
    console.log("probe " + mid);

    const key = s3_key(mid);

    store.exists(key, function(err, exists) {
        if (err)
            callback(err);
        else if (exists)
            bin_search(mid, end, callback);
        else
            bin_search(start, mid, callback);
    });
}


function fetch_date(date, callback)
{
    const url = dukascopy_url(date);
    const key = s3_key(date);

    new Promise(function(resolve, reject) {
        console.log("Requesting " + url + " ...");

        request({
            "url": url,
            "encoding": null
        }, function(err, response, body) {
            console.log(response.statusCode);
            if (err)
                reject(err);
            else if (response.statusCode / 100 != 2)
                reject("HTTP error " + response.statusCode);
            else
                resolve(body);
        });
    })
    .then(function(body) {
        if (body.length == 0)
            return body
        else
            return lzma.decompress(body);
    })
    .then(function(tickdata) {
        return new Promise(function(resolve, reject) {

            function cb(err) {
                if (err == null)
                    resolve();
                else
                    reject(err);
            }

            if (tickdata.length % 20 != 0)
                reject("invalid dukascopy tickfile");
            else
                store.put(key, tickdata, cb);
        });
    })
    .then(function() { callback() })
    .catch(function(err) {
        if (err)
            callback(err);
        else
            callback(Error("Failed download tickdata"));
    });
}

function fetch_range(start, end, callback) {
    fetch_date(start, function(err) {
        if (err)
            callback(err)
        else {
            var hours = start.getUTCHours();
            start.setUTCHours(hours + 1);

            //if (start > end) {
                //callback();
            //} else {
                fetch_range(start, end, callback);
            //}
        }
    });
}


var start = new Date(Date.UTC(2004, 0, 1));
var end = new Date(Date.now());
/* substract one hour, an hour must be passed completely before we can fetch it */
end.setHours(end.getHours() - 1);

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
