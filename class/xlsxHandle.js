const XLSX = require('xlsx');
const { StaticPool } = require('node-worker-threads-pool');
/**
 * xlsx Handle 使用 Xlsx 的檔案 paser
 */
class xlsxHandle {


    /**
     * 建構子
     * @param {String} readFilePath 讀取檔案路徑
     * @param {String} writeFilePath 寫入檔案路徑
     */
    constructor(readFilePath, writeFilePath = null) {
        if (writeFilePath === null) {
            this.writeFilePath = './resolve.xlsx';
        } else {
            this.writeFilePath = writeFilePath;
        }
        // 放下要待轉換的資料
        this.excelData = [];
        // 要輸出的資料
        this.writeData = [];
        this.readFilePath = readFilePath;
        let workbook = XLSX.readFile(this.readFilePath);
        let sheetNames = workbook.SheetNames;
        // 获取第一个workSheet
        this.sheet1 = workbook.Sheets[sheetNames[0]];

        this.range = XLSX.utils.decode_range(this.sheet1['!ref']);
        // Worker Pool
        this.workerPool = new StaticPool({
            size: 5,
            task: './workers/resolveWorker.js',
            workerData: 'workerData!'
        });
        console.time("Array initialize");
    }

    /**
     * 開始Parse 處理
     */
    run() {
        // 找出最高的列 - 第一列不管
        for (let R = this.range.s.r + 1; R <= this.range.e.r; ++R) {
            let rec = {};
            // 找出最多的行
            for (let C = this.range.s.c; C <= this.range.e.c; ++C) {
                let cell_address = { c: C, r: R };               
                let cell = XLSX.utils.encode_cell(cell_address); 
               
                switch (C) {
                    case 0:
                        rec.id = this.sheet1[cell] !== undefined ? this.sheet1[cell].v : '';
                        break;
                    case 1:
                        rec.name = this.sheet1[cell] !== undefined ? this.sheet1[cell].v : '';
                        break;
                    case 2:
                        rec.domain = this.sheet1[cell] !== undefined ? this.sheet1[cell].v : '';
                        break;
                }
            }
            // 去除大部分不合法的 domain 
            try {
                rec.domain = new URL(rec.domain).hostname
            } catch (error) {
                // 去除網址的 / 然後取得最前面的網域
                if(rec.domain != undefined) {
                    let parse = rec.domain.toString().split('/');
                    if (parse.length > 1) {
                        rec.domain = parse[0];
                    } else {
                        rec.domain = rec.domain.toString();
                    }
                }
            }
            // 正常的資料在寫入 待轉換陣列
            if( !(rec.domain == '' && rec.id == '' && rec.name == '') && rec !== undefined) {
                this.excelData.push(rec)
            }
        }
        // 看共有多少Row
        let totalRow = this.excelData.length - 1;
        // 丟進 Worker Pool 去跑資料
        this.excelData.map( (rec) => {
            ( async () => {
                let {data} = await this.workerPool.exec({rec});
                this.writeData.push(data);
                if(this.writeData.length == totalRow) {
                    this.writeData.sort((a , b) => {
                        return a.id - b.id;
                    })
                    this.writeXlsx();
                }
            })()
        });
    }

    /**
     * 寫入xlsx 檔案
     */
    writeXlsx() {        
        let jsonWorkSheet = XLSX.utils.json_to_sheet(this.writeData);
        let workBook = {
            SheetNames: ['jsonWorkSheet'],
            Sheets: {
                'jsonWorkSheet': jsonWorkSheet,
            }
        };
        XLSX.writeFile(workBook, this.writeFilePath);
        console.log('done to output file .... ' + this.writeFilePath)
        console.timeEnd("Array initialize");
    }
}

module.exports = xlsxHandle;