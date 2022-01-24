"use strict";
var argv = require('minimist')(process.argv.slice(2));
if (argv.h != undefined) {
    console.info('使用方式 -i 檔案位置 , -o 檔案輸出位置 , -f 檔案格式');
    process.exit();
}
if (argv.i == undefined) {
    console.error('沒有輸入的檔案! -i ./import.csv  or  import.xlxs');
    console.info('使用方式 -i 檔案位置 , -o 檔案輸出位置 , -f 檔案格式');
    process.exit();
}
if (argv.f == undefined) {
    console.error('沒有輸入的格式 -f xlsx  or  -f csv!');
    console.info('使用方式 -i 檔案位置 , -o 檔案輸出位置 , -f 檔案格式');
    process.exit();
}
if (argv.o == undefined) {
    console.error('沒有輸出的檔案 -o output.xlsx  or  -o putput.csv!');
    console.info('使用方式 -i 檔案位置 , -o 檔案輸出位置 , -f 檔案格式');
    process.exit();
}
let csvHandle = require('./class/csvHandle.js');
let xlsxHandle = require('./class/xlsxHandle.js');
let handle = argv.f == 'xlsx' ? new xlsxHandle(argv.i, argv.o) : new csvHandle(argv.i, argv.o);
handle.run();
