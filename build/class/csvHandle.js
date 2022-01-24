"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const csv_parse_1 = __importDefault(require("csv-parse"));
const csv_writer_1 = require("csv-writer");
const node_worker_threads_pool_1 = require("node-worker-threads-pool");
class csvHandle {
    constructor(readFilePath, writeFilePath) {
        if (writeFilePath === null) {
            this.writeFilePath = "./resolve.csv";
        }
        else {
            this.writeFilePath = writeFilePath;
        }
        this.csvData = [];
        this.writeData = [];
        this.readFilePath = readFilePath;
        this.parser = (0, csv_parse_1.default)({ columns: true, delimiter: ",", from: 1 });
        this.csvWriter = (0, csv_writer_1.createObjectCsvWriter)({
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
        this.workerPool = new node_worker_threads_pool_1.StaticPool({
            size: 5,
            task: "./workers/resolveWorker.js",
            workerData: "workerData!",
        });
        console.time("Array initialize");
        this.parser.on("readable", () => {
            let record;
            while ((record = this.parser.read())) {
                let rec = record;
                try {
                    rec.domain = new URL(rec.domain).hostname;
                }
                catch (error) {
                    let parse = rec.domain.toString().split("/");
                    if (parse.length > 1) {
                        rec.domain = parse[0];
                    }
                    else {
                        rec.domain = rec.domain.toString();
                    }
                }
                this.csvData.push(rec);
            }
        });
        this.parser.on("end", () => {
            let totalRow = this.csvData.length;
            this.csvData.map((rec) => {
                (() => __awaiter(this, void 0, void 0, function* () {
                    let { data } = yield this.workerPool.exec({ rec });
                    this.writeData.push(data);
                    if (this.writeData.length == totalRow) {
                        this.writeData.sort((a, b) => {
                            return a.id - b.id;
                        });
                        this.csvWriter
                            .writeRecords(this.writeData)
                            .then(() => console.log("wait to output file .... done " +
                            this.writeFilePath));
                        console.timeEnd("Array initialize");
                    }
                }))();
            });
        });
    }
    run() {
        fs_1.default.createReadStream(this.readFilePath).pipe(this.parser);
    }
}
module.exports = csvHandle;
