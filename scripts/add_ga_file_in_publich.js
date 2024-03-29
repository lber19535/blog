const fs = require('fs');

hexo.on('deployBefore', () => {
    const gaFilePath = hexo.config['google_analytics']['ga_file_path']
    let pathArray = gaFilePath.split('/')
    const gaFileName = pathArray.at(-1)

    const sourceGAFilePath = hexo.base_dir + gaFilePath
    const dstGAFilePath = hexo.public_dir + gaFileName
    fs.copyFile(sourceGAFilePath, dstGAFilePath, (err) => {
        if (err) throw err;
    })
});



