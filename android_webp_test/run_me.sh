#!/bin/sh

# Crude script for measuring WebP decoding speed on Android device.
#
# Version 004
#
# This script will download the released liwebp archives, patch them, compile
# a binary named 'dec_speed_*' to measure decoding speed, run it on the device
# and report the numbers.
#
# Pre-requisites:
#   android NDK
#   adb
#   wget
#   a writable /data/local/tmp directory on your device
#
# How to run:
#  By default, the script with download, extract and compile the official
#  libwebp release archives. It will also transfer the images to test on the
#  phone.
#  Subsequently, you can use the '-r' option to only re-do the timing test.
#  To only redo the timing test with new images, use the options "-r +t" (in
#  this order).
#
#  The pictures you want to use for testing are searched as ./images/*.webp
#  by default. You can pass the images list as argument to the script.
#
#  Once the timing is finished (for all release versions to test), the
#  results will be stored as logs/LOG_* (and printed).
#
#  There are other options available, as listed by `run_me.sh -h`:
#
#  Beware of thermal throttling on the device! It is advised to have the device
#  be in 'airplane mode' and with screen on, to avoid measurement variability.
#
#  -> Overall, expect at least 2% timing noise!

set -e
home=`pwd`

################################################################################
# Customizable section:

# the libwebp releases to test
releases="0.4.1 0.4.2 0.4.3 0.4.4 0.5.0 0.5.1 0.5.2 0.6.0"

# "yes" or "no"
download_tgz="yes"
transfer_images="yes"
extract="yes"
compile="yes"

# parameters
adb='adb'
ndk_build='ndk-build'
arch="armeabi-v7a"
num_loops="2"    # number of decoding loops to perform for timing

# command-line arguments and list of pictures to test
usage() {
  echo "usage: run_me.sh [options] webp_file [webp_files...]"
  echo "options:"
  echo "  -d ............. don't download archives"
  echo "  -t ............. don't transfer images to phone"
  echo "  +t ............. transfer images to phone"
  echo "  -e ............. don't extract archive (= keep local code modifications)"
  echo "  +e ............. extract archive (= erase local code modifications)"
  echo "  -c ............. don't recompile the timing binary"
  echo "  +c ............. recompile the timing binary"
  echo "  -r ............. only re-run timing (equivalent to -d -t -e -c)"
  echo "  -R <string> .... releases to test (e.g. \"0.5.0 0.5.2 0.6.0\")"
  echo "  -loops <int> ... number of timing loops to perform"
  echo "  -arch <string> . target ndk architecture (armeabi-v7a, arm64-v8a, ...)"
  echo "  -adb <string> .. the device id to use with 'adb'"
  echo "  -h ............. this help"
  echo
  echo " Example: \'./run_me.sh -r +t images/some_new*.webp\' will transfer some "
  echo "          new picture files and redo the timing without recompilation."
  exit 0
}

test_images=""
if [ ! -z "$1" ]; then
  while [[ $# -gt 0 ]]
  do
    arg="$1"
    case ${arg} in
      -t) transfer_images="no";;
      +t) transfer_images="yes";;
      -d) download_tgz="no";;
      -e) extract="no";;
      +e) extract="no";;
      -c) compile="no";;
      +c) compile="yes";;
      -r|--rerun)
        transfer_images="no"
        download_tgz="no"
        extract="no"
        compile="no"
      ;;
      -loops) shift; num_loops=$1;;
      -adb) shift; adb="adb -s $1";;
      -arch) shift; arch=$1;;
      -R) shift; releases=$1;;
      -h|--help) usage;;
      *) test_images="${test_images} ${arg}";;
    esac
    shift
  done
else
  test_images=`ls ./images/*.webp`
fi

# directories
device_base_dir="/data/local/tmp"
device_dir="${device_base_dir}/test"
images_dir="${device_base_dir}/images"

################################################################################
# download archives

if [ x"${download_tgz}" = "xyes" ]; then
 echo "downloading archives ${releases}..."
 if [ ! -e archives ]; then mkdir archives; fi
 for v in ${releases}; do
    archive=libwebp-${v}.tar.gz
    echo "  ... ${archive}"
    if [ ! -e archives/${archive} ]; then
      wget -q https://storage.googleapis.com/downloads.webmproject.org/releases/webp/${archive}
      mv ${archive} archives
      echo "   downloaded OK."
    fi
 done
fi

################################################################################
# transfer images

if [ x"${transfer_images}" == "xyes" ]; then
  echo "Transfering test images to ${images_dir}"
  i=0
  ${adb} shell "if [ ! -e ${images_dir} ]; then mkdir ${images_dir}; fi"
  for f in ${test_images}; do
    [ ! -e ${f} ] && echo "WebP image file $f not found" && exit
    ${adb} push $f ${images_dir} &> /dev/null
    (( i += 1 ))
  done
  echo "  done. Transferred ${i} files."
fi

images_list=""
for x in ${test_images}; do
  images_list="${images_list} ${images_dir}/${x##*/}"
done

################################################################################
# create testing directory

echo "creating fresh directory ${device_dir} on phone"
${adb} shell "rm -rf ${device_dir} && mkdir ${device_dir}"

# because the list of images to test can be quite long, we need a simple script
# on the device instead of using 'adb shell' ...
cat << EOF > go_timing
#!/bin/sh
./\$1 -${num_loops} ${images_list}
EOF
${adb} push go_timing ${device_dir}

################################################################################
# run the test

echo "Testing ${arch}..."
for version in ${releases}; do
  archive=libwebp-${version}
  bin_name="dec_speed_${arch}_${version}"

  # extract the archive
  if [ x"${extract}" == "xyes" ]; then
    # extract
    rm -rf ${archive}
    tar xzf archives/${archive}.tar.gz
    # patch
    cd ${home}/${archive}
    patch -p1 < ${home}/0002-add-dec_speed-test-app.patch
    cd ${home}
  fi

  # build test binary and push to device
  if [ x"${compile}" == "xyes" ]; then
    # clean up past builds
    rm -rf obj libs jni
    ln -s ${archive} jni
    # build
    ${ndk_build} -s APP_ABI=${arch} -j APP_CFLAGS=-fPIE APP_LDFLAGS=-pie > /dev/null
    mv ./libs/${arch}/dec_speed ./bin/${bin_name}
    echo " ... ${arch}_${version} compiled OK."
  fi

  ${adb} push ./bin/${bin_name} ${device_dir} &> /dev/null

  # perform timing
  log_file="LOG_${arch}_${version}"
  ${adb} shell "cd ${device_dir} && sh ./go_timing ${bin_name} > ${log_file}"

  # retrieve logs
  ${adb} pull ${device_dir}/${log_file} &> /dev/null
  result=`cat ${log_file}`
  echo " version ${version}  ${result}"
  mv ${log_file} logs
done
