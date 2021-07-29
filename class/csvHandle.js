const fs = require("fs");
const parse = require('csv-parse');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const { StaticPool } = require('node-worker-threads-pool');
/**
 * csvHandle 使用 csv 的檔案 paser
 */
class csvHandle {

    constructor(readFilePath , writeFilePath = null) {  
        if(writeFilePath === null) {
            this.writeFilePath = './resolve.csv';
        } else {
            this.writeFilePath = writeFilePath;
        }
        this.csvData = [];
        this.writeData = [];
        this.readFilePath = readFilePath;              
        this.parser = parse({columns: true , delimiter: ',' , from : 1}); // 第二行開始
        this.csvWriter = createCsvWriter({
            path: this.writeFilePath,
            header: [
              {id: 'id', title: 'id'},
              {id: 'name', title: 'name'},
              {id: 'domain', title: 'domain'},
              {id: 'resolve', title: 'resolve'},
              {id: 'location', title: 'location'},  
              {id: 'note', title: 'note'},    
            ]
        });

        // Worker Pool
        this.workerPool = new StaticPool({
            size: 5,
            task: './workers/resolveWorker.js',
            workerData: 'workerData!'
        });
        console.time("Array initialize");

        // 開始讀取檔案處理監聽
        this.parser.on('readable' ,  () => {
            let record;
            while (record = this.parser.read()) {
                let rec = record;
                // 去除大部分不合法的 domain 
                try {
                    rec.domain = new URL(rec.domain).hostname
                } catch (error) {
                    // 去除網址的 / 然後取得最前面的網域
                    let parse = rec.domain.toString().split('/');
                    if (parse.length > 1) {
                        rec.domain = parse[0];
                    } else {
                        rec.domain = rec.domain.toString();
                    }
                } 
                this.csvData.push(rec)
            }
        });

        // 處理結束監聽 然後寫檔
        this.parser.on('end' , () => {  
            // 處理資料解析
            // 看共有多少Row
            let totalRow = this.csvData.length;
            this.csvData.map(rec => {
                ( async () => {
                    let {data} = await this.workerPool.exec({rec});
                    this.writeData.push(data);
                    if(this.writeData.length == totalRow) {
                        this.writeData.sort((a , b) => {
                            return a.id - b.id;
                        })
                        this.csvWriter.writeRecords(this.writeData).then( () => console.log('wait to output file .... done ' + this.writeFilePath))
                        console.timeEnd("Array initialize");
                    }
                })();
            });
        })
    }

    /**
     * 開始Parse 處理
     */
    run(){
        fs.createReadStream(this.readFilePath).pipe(this.parser);
    }
}

module.exports = csvHandle;