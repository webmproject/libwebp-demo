#!/bin/sh

# script to generate the source WebP files to be decoded
# during the memory test.
#
# Output directory is /tmp/RAM-study by default.
# 'cwebp' needs to be already installed.

out="/tmp/RAM-study"
mkdir ${out}
mkdir ${out}/lossy
mkdir ${out}/lossless

i=0
for f in $*; do
  cwebp $f -noalpha -o ${out}/lossy/${i}.webp -quiet
  cwebp $f -z 6 -o ${out}/lossless/${i}.webp -quiet
  ((i += 1))
done
