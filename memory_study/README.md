# Study of memory usage during WebP decoding

 * Goal:
  Evaluate the memory consumption when decoding a WebP file to an external buffer
 * Non-goal: encoding isn’t measured, nor speed.
 
## Key result:
   * Lossy:       RAM used in bytes = <b>127. * width</b>
   * Lossless:    RAM using in bytes = <b>4.1 * width * height</b>
 
## Setup & methodology:
  <a href="https://github.com/webmproject/libwebp/archive/v0.6.0.tar.gz">libwebp</a> has a built-in mechanism
  for tracking memory traffic (cf src/utils/utils.c).
  We patch the libwebp 0.6.0 tree to export the high-water memory mark variable.
  We compile a very simple program (ram_test.c) to incrementally decode some WebP bitstreams
  to an external RGBA buffer.

```
  wget https://github.com/webmproject/libwebp/archive/v0.6.0.tar.gz
  tar xzf v0.6.0.tar.gz
  cd libwebp-0.6.0/
  patch -p1 < ../0001-RAM-study-patch.patch
  make -j -f makefile.unix examples/ram_test
  cp examples/ram_test ..
  cd ..
```

  Using ./ram_test, we then record the memory used for the decoding process (only!)
  and correlate this data to the image dimensions.
 
## Corpus

  We used crawled images from the web (JPEG and PNG), transcoded with default parameters.
  These images are converted to WebP (lossy and lossless) using the 'generate_webp.sh' script.
  Altogether, this represents 5194 files in each categories.

## Results: 

   * Some statistics about the width distribution of the input corpus:

![width distribution](https://github.com/webmproject/libwebp-demo/blob/master/memory_study/width_distrib.png)

   * Log-scale size distribution:

![size distribution](https://github.com/webmproject/libwebp-demo/blob/master/memory_study/size_distrib.png)
 
   * Memory usage as function of number of pixels for lossless mode:

![memory vs size lossless](https://github.com/webmproject/libwebp-demo/blob/master/memory_study/memory_vs_size_lossless.png)
 
   * Memory usage as function of width for lossy mode:

![memory vs width lossy](https://github.com/webmproject/libwebp-demo/blob/master/memory_study/memory_vs_width_lossy.png)

Note that few lossless images scale with the width only (or, at, least with much less memory than the total size).
This corresponds to a very special case and combination of coding tools.
 

## Conclusion:

Lossy decoding scales with the width of the image (by design). Approximately: memory_bytes ~= width * 127

Lossless decoding scales with the total number of pixels as: memory_bytes ~= 4.1 * width * height
