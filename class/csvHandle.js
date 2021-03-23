const dns = require('dns')
const fs = require('fs'); 
const Reader = require('@maxmind/geoip2-node').Reader;
const dbBuffer = fs.readFileSync('./geoDatabase/GeoLite2-City.mmdb');
const reader = Reader.openBuffer(dbBuffer);
const parse = require('csv-parse');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

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
        this.writeData = [];
        this.readFilePath = readFilePath;              
        this.parser = parse({columns: true , delimiter: ','});
        console.log(this.writeFilePath)
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

        // 開始讀取檔案處理監聽
        this.parser.on('readable' , async () => {
            let record;
            while (record = this.parser.read()) {
                // if( (dns.getServers()[0] !== record.dns_server) && record.dns_server !== '' ) {
                //     dns.setServers([record.dns_server]);            
                // }
        
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
                
                // 處理資料解析
                let data = await this.dnsReolve(rec);
                this.writeData.push(data);
                console.log(data)
            }
        });

        // 處理結束監聽 然後寫檔
        this.parser.on('end' , () => {   
            setTimeout( () => {
                this.csvWriter.writeRecords(this.writeData).then( () => console.log('wait to output file .... done ' + this.writeFilePath))
            } , 3000)    
        })
    }

    /**
     * 開始Parse 處理
     */
    run(){
        fs.createReadStream(this.readFilePath).pipe(this.parser);
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
                    let location = '';
                    if(geoip?.city?.names['zh-CN'] !== undefined) {
                        location = geoip.city.names['zh-CN'];
                    } else {
                        location = geoip.country.names['zh-CN']
                    }
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

module.exports = csvHandle;