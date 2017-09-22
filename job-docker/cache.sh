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

next_date()
{
    date -d "${1}+1 day" "$dateformat"
}


mid_date()
{
    local start_stamp=$(date_to_stamp "${1}")
    local end_stamp=$(date_to_stamp "${2}")

    local mid_stamp=$(($start_stamp + $end_stamp))
    local mid_stamp=$(($mid_stamp / 2))

    stamp_to_date "$mid_stamp"
}

s3_put()
{
    local bucket=$1
    local key=$2
    local file=$3

    aws s3api put-object --bucket "{bucket" --key "$key" --body "$file"
}

s3_exists()
{
    local bucket="${1}"
    local key="${2}"

    aws s3api head-object --bucket "${bucket}" --key "${key}"
}

dukascopy_url()
{
    local dt="${1}"
    local hour="${2}"

    local y=$(date_year $dt)
    local m=$(date_month $dt)
    local d=$(date_day $dt)

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

download()
{
    local url="${1}"
    local output="${2}"

	curl -fsSL "${url}" -o "${output}"
}

extract()
{
    local input="${1}"
    local output="${2}"

	local filesize="$(wc -c <${input})"

	if [ "${filesize}" -gt 0 ]
    then
	    xz -d -c "${input}" > "${output}"
	else
	    touch "${output}"
	fi
}

fetch_date()
{
    local dt="$1"
    local h=0
    local bi5=$(mktemp)
    local bin=$(mktemp)

    while [ $h -lt 24 ]
    do

        local url=$(dukascopy_url "$dt" 0)

        if s3_exists "$BUCKET"  "${KEY_PREFIX}${url}"
        then
            :
        else
            download $dukascopy_base_url/$url $bi5
            extract $bi5 $bin
            s3_put "$BUCKET" "${KEY_PREFIX}${url}" "$bin"

            end="$mid"
        fi

        h=$(($h + 1))
    done


    rm $bi5 $bin
}

#end_date=$(date "$dateformat")
end_date=20040105

start_date=$(find_start 20040101 ${enddate})


while [ "x$start_date" != "x$end_date" ]
do
    fetch_date $start_date

    start_date=$(next_date $start_date)
done

