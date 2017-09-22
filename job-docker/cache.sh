#!/bin/bash -xe

BUCKET="ticktech-data"
KEY_PREFIX="dukascopy/EURUSD/"


dateformat="+%Y%m%d"
dukascopy_base_url="http://dukascopy.com/datafeed/EURUSD/"


date_year()
{
    date --date "$1" "+%Y"
}

date_month()
{
    date --date "$1" "+%m"
}

date_day()
{
    date --date "$1" "+%d"
}

date_to_stamp()
{
    date --date "${1}" "+%s"
}

stamp_to_date()
{
    date --date "@${1}"  "${dateformat}"
}


mid_date()
{
    local start_stamp=$(date_to_stamp "${1}")
    local end_stamp=$(date_to_stamp "${2}")

    local mid_stamp=$(($start_stamp + $end_stamp))
    local mid_stamp=$(($mid_stamp / 2))

    stamp_to_date "$mid_stamp"
}

s3_exists()
{
    local bucket="${1}"
    local key="${2}"

    aws s3api head-object --bucket "${bucket}" --key "${key}"
}

dukascopy_url()
{
    local instrument="${1}"
    local date="${2}"
    local hour="${3}"

    local y="$(date_year "$date")"
    local m="$(date_month "$date")"
    local d="$(date_day "$date")"

    if [ $hour -lt 10 ]
    then
        hour="0$hour"
    fi

    echo "${y}/${m}/${d}/${hour}h_ticks.bi5"
}


find_start()
{
    local begin="$1"
    local end="$2"

    while true
    do 
        local mid=$(mid_date "$begin" "$end")

        if [ "x$mid" == "x$begin" -o "x$mid" == "x$end" ]
        then
            break
        fi

        local url=$(dukascopy_url "$mid" 0)
        if s3_exists "$BUCKET"  "${KEY_PREFIX}${url}"
        then
            begin="$mid"
        else
            end="$mid"
        fi
    done

    echo "$begin"
}

find_start 20040101 $(date "$dateformat")
