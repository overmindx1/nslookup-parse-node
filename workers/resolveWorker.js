const dns = require('dns')
const Reader = require('@maxmind/geoip2-node').Reader;
const fs = require("fs");
const dbBuffer = fs.readFileSync('./geoDatabase/GeoLite2-City.mmdb');
const reader = Reader.openBuffer(dbBuffer);
const {parentPort, workerData} = require("worker_threads");

parentPort.on( 'message' ,  dataObj => {
    let data = {};
    let {rec} = dataObj;
    
    dns.resolve(rec.domain.toString(), (err, res) => {
        if (err) {
            data = {
                id: rec.id,
                name: rec.name,
                domain: rec.domain,
                resolve: 'resolve_error',
                location: 'resolve_error'
            };
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
            
            data = {
                id: rec.id,
                name: rec.name,
                domain: rec.domain,
                resolve: res.join(','),
                location: location,
                note: res.length > 1 ? 'cdn' : ''
            };
            
            parentPort.postMessage({data});
            
        } catch (error) {
            
            data = {
                id: rec.id,
                name: rec.name,
                domain: rec.domain,
                resolve: res.join(','),
                location: 'geoip can\'t resolve location ',
                note: res.length > 1 ? 'cdn' : ''
            };
           
            parentPort.postMessage({data });
            
        }
    })
});
