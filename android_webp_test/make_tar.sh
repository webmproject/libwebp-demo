#!/bin/sh

version="004"

echo "****"
echo " DID YOU UPAGE THE VERSION NUMBER TO ${version} IN THE run_me.sh HEADER?"
echo "****"

name="android_webp_test_${version}"
rm -rf ${name} && mkdir ${name}
for d in bin images archives logs; do
  mkdir ${name}/${d}
  touch ${name}/${d}/REMOVE.ME
done

cp images/thomassine.webp ${name}/images
cp run_me.sh 0002-add-dec_speed-test-app.patch ${name}

tar czf ${name}.tar.gz ${name}

echo "${name}.tar.gz : DONE"
