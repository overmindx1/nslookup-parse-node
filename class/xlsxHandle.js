const dns = require('dns')
const fs = require('fs');
const Reader = require('@maxmind/geoip2-node').Reader;
const dbBuffer = fs.readFileSync('./geoDatabase/GeoLite2-City.mmdb');
const reader = Reader.openBuffer(dbBuffer);
const XLSX = require('xlsx');

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
        this.writeData = [];
        this.readFilePath = readFilePath;
        let workbook = XLSX.readFile(this.readFilePath);
        let sheetNames = workbook.SheetNames;
        // 获取第一个workSheet
        this.sheet1 = workbook.Sheets[sheetNames[0]];

        this.range = XLSX.utils.decode_range(this.sheet1['!ref']);
        
    }

    /**
     * 開始Parse 處理
     */
    async run() {

        // 找出最高的列
        for (let R = this.range.s.r; R <= this.range.e.r; ++R) {
            
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
                let parse = rec.domain.toString().split('/');
                if (parse.length > 1) {
                    rec.domain = parse[0];
                } else {
                    rec.domain = rec.domain.toString();
                }
            }

            // 如果這列都沒有資料 就不進去解析
            if( !(rec.domain == '' && rec.id == '' && rec.name == '') ) {
                let data = await this.dnsReolve(rec);
                this.writeData.push(data);
                console.log(data)
            }
            
            // 跑完最高列之後寫檔
            if (this.range.e.r == R) {
                this.writeXlsx()
            }
        }
        
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
    }

    /**
     * 拿來解析 IP 跟拿來處理 GeoIp
     * @param {Object} rec 
     * @return Promise
     */
    dnsReolve(rec) {
        
        return new Promise((resolve , reject) => {            
            let data = {};
            dns.resolve(rec.domain.toString(), (err, res) => {
                if (err) {
                    data = {
                        id: rec.id,
                        name: rec.name,
                        domain: rec.domain,
                        resolve: 'resolve_error',
                        location: 'resolve_error'
                    };
                    resolve(data);
                    return;
                }
                
                try {
                    let geoip = reader.city(res[0]);
                    let location = geoip.country.names['zh-CN'];
                    // if(geoip?.city?.names['zh-CN'] !== undefined) {
                    //     location = geoip.city.names['zh-CN'];
                    // } else {
                    //     location = geoip.country.names['zh-CN']
                    // }
                    data = {
                        id: rec.id,
                        name: rec.name,
                        domain: rec.domain,
                        resolve: res.join(','),
                        location: location,
                        note: res.length > 1 ? 'cdn' : ''
                    };
                    resolve(data);
                } catch (error) {
                    data = {
                        id: rec.id,
                        name: rec.name,
                        domain: rec.domain,
                        resolve: res.join(','),
                        location: 'geoip can\'t resolve location ',
                        note: res.length > 1 ? 'cdn' : ''
                    };
                    resolve(data);
                }
                return;
            })
        })
    }
}

module.exports = xlsxHandle;