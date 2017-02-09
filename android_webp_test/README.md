# android timing test

 Crude script for measuring WebP decoding speed on Android device.

 Version 003 : https://github.com/webmproject/libwebp-demo/raw/master/android_webp_test/android_webp_test_003.tar.gz

 This script will download the released libwebp archives, compile a binary named
 'dec_speed_*' to measure decoding speed, run it on the device and report the
 decoding speed.

## Pre-requisites:
  * android NDK
  * adb
  * wget
  * a writable /data/local/tmp directory on your device

## Installation

  Just download and extract the latest android_webp_test_*.tar.gz archive.
  You should have a `run_me.sh` script along with some directories for
  storing images, binaries, etc.
  The device to test should be plugged and visible when running `adb devices -l`.

## How to run:

  `./run_me.sh images/*.webp` should suffice.

  By default, the script with download, extract and compile the official
  libwebp release archives. It will also transfer the test images on the
  device.
  Subsequently, you can use the `-r` option to only re-do the timing test.
  To only redo the timing test with new images, use the options `-r +t` (in
  this order).

  The pictures you want to use for testing are searched as ./images/*.webp
  by default. You can pass the images list as argument to the script.

  Once the timing is finished (for all release versions to test), the
  results will be stored as logs/LOG_* (and printed).

  There are other options available, as listed by `run_me.sh -h`:

```
   -d ............. don't download archives
   -t ............. don't transfer images to phone
   +t ............. transfer images to phone
   -e ............. don't extract archive (= keep local code modifications)
   -c ............. don't recompile the timing binary
   +c ............. recompile the timing binary
   -r ............. only re-run timing (equivalent to -d -t -e -c)
   -R <string> .... releases to test (e.g. "0.5.0 0.5.2 0.6.0")
   -loops <int> ... number of timing loops to perform
   -arch <string> . target ndk architecture (armeabi-v7a, arm64-v8a, ...)
   -adb <string> .. the device id to use with 'adb'
```

## Advices to get a more stable timing

To reduce the measurement variability:

  * beware of thermal throttling on the device!
  * it is advised to have the device be in 'airplane mode' 
  * try to keep the screen switched on (by regularly swiping, e.g.)
  * don't hesitate to use -loops option to raise the number of loops

But overall, expect at least 2% timing noise!
