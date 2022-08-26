const fs = require('fs');

// Array.prototype.at = function(n) {
//     // ToInteger() abstract op
// 	n = Math.trunc(n) || 0;
// 	// Allow negative indexing from the end
// 	if (n < 0) n += this.length;
// 	// OOB access is guaranteed to return undefined
// 	if (n < 0 || n >= this.length) return undefined;
// 	// Otherwise, this is just normal property access
// 	return this[n];
// }

hexo.on('deployBefore', () => {
    const gaFilePath = hexo.config['google_analytics']['ga_file_path']
    const gaFileName = gaFilePath.split('/').at(-1)

    const sourceGAFilePath = hexo.base_dir + gaFilePath
    const dstGAFilePath = hexo.public_dir + gaFileName
    fs.copyFile(sourceGAFilePath, dstGAFilePath, (err) => {
        if (err) throw err;
    })
});



