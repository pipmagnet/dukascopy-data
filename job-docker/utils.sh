#!/bin/bash -e

#date=${1}
#
#bucket=${S3_BUCKET}
#key_prefix=${S3_KEY_PREFIX}
#instrument=${INSTRUMENT}
#
#tmp_dlfile=$(mktemp)
#tmp_unpackfile=$(mktemp)

make_date()
{
    local year="${1}"
    local month="${2}"
    local day="${3}"

    echo "${year}${month}${day}"
}

date_stamp()
{
    date 


}


date_year()
{
    echo "${1}" | cut -b1-4
}

date_month()
{
    echo "${1}" | cut -b5-6
}

date_day()
{
    echo "${1}" | cut -b7-8
}

prev_date()
{
    date '+%Y%m%d' -d "${1}-1 day"
}

next_date()
{
    date '+%Y%m%d' -d "${1}+1 day"
}

date_range()
{
    local current="${1}"
    local end="${2}"

    while [ "${current}" != "${end}" ]
    do
        echo "${current}"

        current="$(next_date "${current}")"
    done
}

dukascopy_url()
{
    local instrument="${1}"
    local date="${2}"
    local hour="${3}"

    local y="$(date_year "${date}")"
    local m="$(date_year "${date}")"
    local d="$(date_year "${date}")"

    if [ $hour -lt 10 ]
    then
        hour="0$hour"
    fi

    echo "http://dukascopy.com/datafeed/${instrument}/${y}/${m}/${d}/${hour}h_ticks.bi5"
}

download()
{
    local url="${1}"
    local output="${2}"

	curl -sSL "${output}" -o "${url}"
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


s3_exists()
{
    local bucket="${1}"
    local key="${2}"

    aws s3api head-object --bucket "${bucket}" --key "${key}"
}

get_tick_file()
{
    local d="${1}"
    local hour="${2}"

    local url="$(dukascopy_url EURUSD "${d}" 0)"

    local bi5="$(mktemp)"
    download "${url}" "${bi5}"

    local bin="$(mktemp)"
    extract "${bi5}" "${bin}"

}


date_range 20040101 20050101
