const dns = require('dns')
const Reader = require('@maxmind/geoip2-node').Reader;
const fs = require("fs");
const dbBuffer = fs.readFileSync('./geoDatabase/GeoLite2-City.mmdb');
const reader = Reader.openBuffer(dbBuffer);
const {parentPort, workerData} = require("worker_threads");
interface resData {
    id : string,
    name : string,
    domain : string,
    resolve : string,
    location : string,
    [propName : string] : any
}

function getResDate (rec : any ,location : string, res? : any   , err? : boolean) : resData {
    if(res == undefined) {
        return {
            id: rec.id,
            name: rec.name,
            domain: rec.domain,
            resolve: 'resolve_error',
            location: 'resolve_error'
        }
    } else if (res != undefined && err == true) {
        return {
            id: rec.id,
            name: rec.name,
            domain: rec.domain,
            resolve: res.join(','),
            location: 'geoip can\'t resolve location ',
            note: res.length > 1 ? 'cdn' : ''
        }
    } else {
        return {
            id: rec.id,
            name: rec.name,
            domain: rec.domain,
            resolve: res.join(','),
            location: location,
            note: res.length > 1 ? 'cdn' : ''
        }
    }
} 

parentPort.on( 'message' ,  (dataObj : any) => {
    let data = {};
    let {rec} = dataObj;
    
    dns.resolve(rec.domain.toString(), (err:any, res:any) => {
        if (err) {
            data = getResDate(rec , '');
            parentPort.postMessage({data});
        }
        
        try {
            let geoip = reader.city(res[0]);
            let location = geoip.country.names['zh-CN'];
            // if(geoip?.city?.names['zh-CN'] !== undefined) {
            //     location = geoip.city.names['zh-CN'];
            // } else {
            //     location = geoip.country.names['zh-CN']
            // }
            
            data = getResDate(rec , location , res);
            
            parentPort.postMessage({data});
            
        } catch (error) {
            
            data =getResDate(rec , '' , res , true);
           
            parentPort.postMessage({data });
            
        }
    })
});