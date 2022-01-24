import fs from "fs";
import parse from "csv-parse";
import { createObjectCsvWriter } from "csv-writer";
import { StaticPool } from "node-worker-threads-pool";

class csvHandle {
    private writeFilePath: string;
    private readFilePath: string;
    private csvData: Array<any>;
    private writeData: Array<any>;
    private parser: parse.Parser;
    private csvWriter: any;
    private workerPool: any;
    constructor(readFilePath: string, writeFilePath: string | null) {
        if (writeFilePath === null) {
            this.writeFilePath = "./resolve.csv";
        } else {
            this.writeFilePath = writeFilePath;
        }
        this.csvData = [];
        this.writeData = [];
        this.readFilePath = readFilePath;
        this.parser = parse({ columns: true, delimiter: ",", from: 1 });
        this.csvWriter = createObjectCsvWriter({
            path: this.writeFilePath,
            header: [
                { id: "id", title: "id" },
                { id: "name", title: "name" },
                { id: "domain", title: "domain" },
                { id: "resolve", title: "resolve" },
                { id: "location", title: "location" },
                { id: "note", title: "note" },
            ],
        });

        // Worker Pool
        this.workerPool = new StaticPool({
            size: 5,
            task: "./workers/resolveWorker.js",
            workerData: "workerData!",
        });
        console.time("Array initialize");

        this.parser.on("readable", () : void => {
            let record: any;
            while ((record = this.parser.read())) {
                let rec = record;
                // 去除大部分不合法的 domain
                try {
                    rec.domain = new URL(rec.domain).hostname;
                } catch (error) {
                    // 去除網址的 / 然後取得最前面的網域
                    let parse = rec.domain.toString().split("/");
                    if (parse.length > 1) {
                        rec.domain = parse[0];
                    } else {
                        rec.domain = rec.domain.toString();
                    }
                }
                this.csvData.push(rec);
            }
        });

        // 處理結束監聽 然後寫檔
        this.parser.on("end", () : void => {
            // 處理資料解析
            // 看共有多少Row
            let totalRow: Number = this.csvData.length;
            this.csvData.map((rec) => {
                (async () => {
                    let { data } = await this.workerPool.exec({ rec });
                    this.writeData.push(data);
                    if (this.writeData.length == totalRow) {
                        this.writeData.sort((a, b) => {
                            return a.id - b.id;
                        });
                        this.csvWriter
                            .writeRecords(this.writeData)
                            .then(() =>
                                console.log(
                                    "wait to output file .... done " +
                                        this.writeFilePath
                                )
                            );
                        console.timeEnd("Array initialize");
                    }
                })();
            });
        });
    }

    /**
    * 開始Parse 處理
    */
    run(){
       fs.createReadStream(this.readFilePath).pipe(this.parser);
    }
}

module.exports = csvHandle;
