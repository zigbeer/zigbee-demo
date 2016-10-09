/* jshint node: true */
'use strict';

var _ = require('busyman'),
    express = require('express'),
    http = require('http'),
    Server = require('socket.io');

function IoServer () {
    var self = this;

    this._server = null;
    this._clients = [];

    this._reqHdlrs = {};

    this._onConnection = function (socket) {
        self._initClient(socket);
    };
}

var ioServer = new IoServer();

/***********************************************************************/
/*** Public Methods                                                  ***/
/***********************************************************************/
IoServer.prototype.isRunning = function () {
    return !_.isNull(this._server);
};

IoServer.prototype.start = function (server) {
    var startSuccess = true;

    if (!server || !_.isObject(server))
        throw new Error('server must be given in object');

    if (this.isRunning())
        return startSuccess;

    this._server = Server(server);
    this._server.on('connection', this._onConnection);

    return startSuccess;
};

IoServer.prototype.stop = function () {
    var stopSuccess = true;

    if (!this.isRunning)
        return stopSuccess;

    this._server.close();
    this._server.removeListener('connection', this._onConnection);

    this._server = null;
    this._clients = [];

    return stopSuccess;
};

IoServer.prototype.sendInd = function (indType, data) {
    if (!_.isString(indType))
        throw new TypeError('indType must be a string');
    if (!_.isPlainObject(data))
        throw new TypeError('data must be an object');

    this._sendInd(indType, data);

    return this;
};

IoServer.prototype.regReqHdlr = function (reqType, handler) {
    if (!_.isString(reqType))
        throw new TypeError('reqType must be a string');
    if (!_.isFunction(handler))
        throw new TypeError('handler must be a function');

    this._reqHdlrs[reqType] = handler;

    return this;
};

/***********************************************************************/
/*** Protected Methods                                               ***/
/***********************************************************************/
IoServer.prototype._registerClient = function (socket, listeners) {
    var regSuccess = true,
        isThere = this._clients.find(function (c) {
            return c.client === socket;
        });

    if (!isThere) {
        this._clients.push({
            client: socket,
            listeners: listeners
        });
    } else {
        regSuccess = false;
    }

    return regSuccess;
};

IoServer.prototype._unregisterClient = function (socket) {
    var removed,
        removedClient;

    removed = _.remove(this._clients, function (c) {
        return c.client === socket;
    });

    if (removed.length) {
        removedClient = removed[0];
        _.forEach(removedClient.listeners, function (lsn, evt) {
            if (_.isFunction(lsn))
                removedClient.client.removeListener(evt, lsn);
        });
    }

    return removed.length ? true : false;   // unregSuccess
};

IoServer.prototype._initClient = function (socket) {
    var self = this,
        regSuccess = false,
        clientLsns = {
            error: null,
            disconnect: null,
            req: null
        };

    clientLsns.error = function (err) {
        console.log('ioClient error: ' + err.message);
    };

    clientLsns.close = function () {
        console.log('client is closed');
        self._unregisterClient(socket);   // remove client and it listeners
    };

    clientLsns.req = function (msg) {
        var wsApi = self._reqHdlrs[msg.cmd];

        if (!_.isFunction(wsApi)) 
            self._sendRsp(socket, msg, 1);
        else
            wsApi(msg.args, function (err, result) {
                if (err)
                    self._sendRsp(socket, msg, 1);
                else
                    self._sendRsp(socket, msg, 0, result);
            });
    };

    regSuccess = this._registerClient(socket, clientLsns);

    if (regSuccess) {
        // attach listeners
        _.forEach(clientLsns, function (lsn, evt) {
            if (_.isFunction(lsn))
                socket.on(evt, lsn);
        });
    }
};

IoServer.prototype._sendRsp = function (socket, reqMsg, rspStatus, rspData) {
    var rspMsg = {
            seq: reqMsg.seq,
            cmd: reqMsg.cmd,
            status: rspStatus,
            data: rspData
        };

    socket.emit('rsp', rspMsg);
};

IoServer.prototype._sendInd = function (evtName, data) {
    var indMsg = {
            type: evtName,
            data: data
        };

    if (!this.isRunning()) {
        this._server.emit('error', new Error('isServer is stopped.'));
    } else {
        this._server.sockets.emit('ind', indMsg);
    }
};

module.exports = ioServer;
