# KISSC
A small, simple, and easy-to-use JavaScript compression library. Supports Unicode strings.

### Usage
The `kissc.compress` function takes two arguments, first the string to be compressed, second an optional encoding parameter. An encoding value of 6 (default) will produce a BASE64 string that is safe in pretty much any context. An encoding value of 15 will produce a BASE32768 string that is safe to use in JavaScript and LocalStorage, is legal Unicode, and contain no code points below 256.

The `kissc.decompress` function takes two arguments, first the compressed string, second an optional maximum length. The encoding is detected automatically. If the string is found to be invalid, or would produce an output longer than the maximum length, `false` is returned instead of the decompressed string. If no maximum length is specified, a rogue compressed string could be used to crash the browser by producing a too large string.

    var compressedString = kissc.compress("String to be compressed.");
    var originalString = kissc.decompress(compressedString);
    
    var compressedString2 = kissc.compress("Another string to be compressed.",15);
    var originalString2 = kissc.decompress(compressedString2,100000);

### Bullet points
* Very small library, 9 kB without minification or compression, no dependencies.
* Handles around 2.5 MB/s in modern desktop browsers.
* Can deal with over 100 MB data in modern desktop browsers.
* Very high compression ratio for very repetitive strings.
* Reasonable compression for somewhat repetitive strings.