var _ = require('busyman'),
    Ziee = require('ziee'),
    Device = require('../../node_modules/zigbee-shepherd/lib/model/device'),
    Endpoint = require('../../node_modules/zigbee-shepherd/lib/model/endpoint');

var weatherDevInfo = {
        type: 'EndDevice',
        ieeeAddr: '0x00124b0001ce1001',
        nwkAddr: 1,
        manufId: 0,
        epList: [ 1, 2 ],
        endpoints: {
            1: {    // temperature
                profId: 0x0104, epId: 1, devId: 770, inClusterList: [ 1026 ], outClusterList: [],
                clusters: { msTemperatureMeasurement: { dir: 1, attrs: { measuredValue: 0 } } }
            },
            2: {    // humidity
                profId: 0x0104, epId: 2, devId: 770, inClusterList: [ 1029 ], outClusterList: [],
                clusters: { msRelativeHumidity : { dir: 1, attrs: { measuredValue: 0 } } }
            }
        }
    };

var sensorDevInfo = {
        type: 'EndDevice',
        ieeeAddr: '0x00124b0001ce1002',
        nwkAddr: 2,
        manufId: 0,
        epList: [ 1, 2, 3 ],
        endpoints: {
            1: {    // illuminance
                profId: 0x0104, epId: 1, devId: 12, inClusterList: [ 1024 ], outClusterList: [],
                clusters: { msIlluminanceMeasurement: { dir: 1, attrs: { measuredValue: 85 } } }
            },
            2: {    // flame
                profId: 0x0104, epId: 2, devId: 1026, inClusterList: [ 15 ], outClusterList: [],
                clusters: { genBinaryInput : { dir: 1, attrs: { description: 'flame', presentValue: 0 } } }
            },
            3: {    // pir 
                profId: 0x0104, epId: 3, devId: 1026, inClusterList: [ 1030 ], outClusterList: [],
                clusters: { msOccupancySensing : { dir: 1, attrs: { occupancy: 0 } } }
            }
        }
    };

var ctrlDevInfo = {
        type: 'EndDevice',
        ieeeAddr: '0x00124b0001ce1003',
        nwkAddr: 3,
        manufId: 0,
        epList: [ 1, 2, 3 ],
        endpoints: {
            1: {    // buzzer
                profId: 0x0104, epId: 1, devId: 1027, inClusterList: [ 15 ], outClusterList: [],
                clusters: { genBinaryInput: { dir: 1, attrs: { description: 'buzzer', presentValue: 0 } } }
            },
            2: {    // light
                profId: 0x0104, epId: 2, devId: 256, inClusterList: [ 6 ], outClusterList: [],
                clusters: { genOnOff : { dir: 1, attrs: { onOff: 0 } } }
            },
            3: {    // switch
                profId: 0x0104, epId: 3, devId: 0, inClusterList: [], outClusterList: [6],
                clusters: { genOnOff : { dir: 2, attrs: { onOff: 0 } } }
            }
        }
    };

var id = 1;

function fakeFunctional (cId, cmd, zclData, callback) {
    return true;
}

function createDev (devInfo) {
    var dev = new Device(devInfo);

    dev._setId(++id);
    dev.update({ status: 'online' });

    _.forEach(devInfo.endpoints, function (simpleDesc) {
        ep = new Endpoint(dev, simpleDesc);
        ep.functional = fakeFunctional;
        ep.clusters = new Ziee();

        _.forEach(simpleDesc.clusters, function (cInfo, cid) {
            ep.clusters.init(cid, 'dir', { value: cInfo.dir });
            ep.clusters.init(cid, 'attrs', cInfo.attrs);
        });

        dev.endpoints[ep.getEpId()] = ep;
    });

    return dev;
}

module.exports = {
    functional: fakeFunctional,
    weatherDev: createDev(weatherDevInfo),
    sensorDev: createDev(sensorDevInfo),
    ctrlDev: createDev(ctrlDevInfo)
};
