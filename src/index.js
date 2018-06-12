
const request = require("request");
const left_pad = require("leftpad");
const util = require("util");
const lzma = require("lzma-native");
const fs = require("fs");
const minimist = require("minimist");
const moment = require("moment");

const s3store = require("./s3.js");

const args = minimist(process.argv.slice(2));

if (args._.length < 3 || args._.length > 4) {
    process.exitCode = 1;
    console.log("Invalid arguments");
    return;
}

const instrument = args._[0];
const store = new s3store.store(args._[1]);
const startdate = moment.utc(args._[2]);
const enddate = moment.utc(args._[3]); // if e is undefined then we get the current time
const full_sweep = args.f;


function floor_to_hour(date)
{
    date.minutes(0);
    date.seconds(0);
    date.milliseconds(0);
}

function mid_date(start, end)
{
    const middate = start.clone();
    const diff = moment.duration(end.diff(start) / 2);
    middate.add(diff);

    floor_to_hour(middate);

    return middate;
}

function dukascopy_url(date)
{
    return util.format("http://dukascopy.com/datafeed/%s/%s/%s/%s/%sh_ticks.bi5",
        instrument,
        left_pad(date.year(), 4, "0"),
        left_pad(date.month(), 2, "0"),
        left_pad(date.date(), 2, "0"),
        left_pad(date.hour(), 2, "0"));
}

function s3_key(date)
{
    return util.format("dukascopy/%s/%s/%s/%s/%sh_ticks.bin",
        instrument,
        left_pad(date.year(), 4, "0"),
        left_pad(date.month(), 2, "0"),
        left_pad(date.date(), 2, "0"),
        left_pad(date.hour(), 2, "0"));
}


function bin_search(start, end, callback)
{
    floor_to_hour(start);
    floor_to_hour(end);

    if (end.diff(start) <= 1000 * 60 * 60) {
        const key = s3_key(start);
        /* check if start exists, if not then start should returned
         * otherwise end */
        return store.exists(key)
        .then(function(does_exist) {
            if (does_exist)
                return end.clone();
            else
                return start.clone();
        })
        return;
    }

    var mid = mid_date(start, end);
    console.log("probe " + mid.format());

    const key = s3_key(mid);

    return store.exists(key)
    .then(function(does_exist) {
        if (does_exist)
            return bin_search(mid, end, callback);
        else
            return bin_search(start, mid, callback);
    });
}


function fetch_date(date, key)
{
    const url = dukascopy_url(date);

    return new Promise(function(resolve, reject) {
        console.log("Requesting " + url + " ...");

        request({
            "url": url,
            "encoding": null
        }, function(err, response, body) {
            console.log(response.statusCode);
            if (err)
                reject(err);
            else if (response.statusCode / 100 != 2)
                reject(Error("HTTP error " + response.statusCode));
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
        if (tickdata.length % 20 != 0)
            throw Error("Invalid dukascopy tickfile");
        else
            return store.put(key, tickdata);
    });
}

function fetch_range(start, end, overwrite) {
    const key = s3_key(start);

    return new Promise(function(resolve, reject) {
        if (!overwrite) {
            console.log("check " + key);
            store.exists(key)
            .then(resolve)
            .catch(reject);
        } else {
            resolve(false);
        }
    })
    .then(function(exists) {
        if (!exists)
            return fetch_date(start, key);
    })
    .then(function() {

        start.add(1, "hours");

        if (!start.isAfter(end))
            return fetch_range(start, end, overwrite);
    });
}


/* substract one hour, because an hour must be passed completely before we can fetch it */
enddate.subtract(1, "hours");

if (full_sweep) {
    fetch_range(startdate, enddate, false).
        catch(console.log);
} else {
    bin_search(startdate, enddate)
        .then(function(start_date) {
            return fetch_range(start_date, enddate, true);
        })
    .catch(console.log);
}
