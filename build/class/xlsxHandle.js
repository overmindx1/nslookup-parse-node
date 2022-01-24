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
const xlsx_1 = __importDefault(require("xlsx"));
const node_worker_threads_pool_1 = require("node-worker-threads-pool");
class xlsxHandle {
    constructor(readFilePath, writeFilePath = null) {
        if (writeFilePath === null) {
            this.writeFilePath = './resolve.xlsx';
        }
        else {
            this.writeFilePath = writeFilePath;
        }
        this.excelData = [];
        this.writeData = [];
        this.readFilePath = readFilePath;
        let workbook = xlsx_1.default.readFile(this.readFilePath);
        let sheetNames = workbook.SheetNames;
        this.sheet1 = workbook.Sheets[sheetNames[0]];
        this.range = xlsx_1.default.utils.decode_range(this.sheet1['!ref']);
        this.workerPool = new node_worker_threads_pool_1.StaticPool({
            size: 5,
            task: './workers/resolveWorker.js',
            workerData: 'workerData!'
        });
        console.time("Array initialize");
    }
    run() {
        for (let R = this.range.s.r + 1; R <= this.range.e.r; ++R) {
            let rec = {
                id: '',
                name: '',
                domain: ''
            };
            for (let C = this.range.s.c; C <= this.range.e.c; ++C) {
                let cell_address = { c: C, r: R };
                let cell = xlsx_1.default.utils.encode_cell(cell_address);
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
            try {
                rec.domain = new URL(rec.domain).hostname;
            }
            catch (error) {
                if (rec.domain != undefined) {
                    let parse = rec.domain.toString().split('/');
                    if (parse.length > 1) {
                        rec.domain = parse[0];
                    }
                    else {
                        rec.domain = rec.domain.toString();
                    }
                }
            }
            if (!(rec.domain == '' && rec.id == '' && rec.name == '') && rec !== undefined) {
                this.excelData.push(rec);
            }
        }
        let totalRow = this.excelData.length - 1;
        this.excelData.map((rec) => {
            (() => __awaiter(this, void 0, void 0, function* () {
                let { data } = yield this.workerPool.exec({ rec });
                this.writeData.push(data);
                if (this.writeData.length == totalRow) {
                    this.writeData.sort((a, b) => {
                        return a.id - b.id;
                    });
                    this.writeXlsx();
                }
            }))();
        });
    }
    writeXlsx() {
        let jsonWorkSheet = xlsx_1.default.utils.json_to_sheet(this.writeData);
        let workBook = {
            SheetNames: ['jsonWorkSheet'],
            Sheets: {
                'jsonWorkSheet': jsonWorkSheet,
            }
        };
        xlsx_1.default.writeFile(workBook, this.writeFilePath);
        console.log('done to output file .... ' + this.writeFilePath);
        console.timeEnd("Array initialize");
    }
}
module.exports = xlsxHandle;
