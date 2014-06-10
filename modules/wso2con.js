var app = require('/configs/app.json');

var base64 = require('/modules/base64.js');

var log = new Log();

var attendees = function () {
    //this is to skip concurrent requests to some extend
    if (application.get('updating-attendees')) {
        var i, count = 25;
        for (i = 0; i < count; i++) {
            java.lang.Thread.sleep(200);
            if (!application.get('updating-attendees')) {
                break;
            }
        }
    } else {
        application.put('updating', true);
        var e4x = require('/modules/e4x.js');
        var data = get(app.customerService).data;
        data = e4x.toJSON(new XML(data)).customer;
        application.put('attendees', data);
        application.remove('updating-attendees');
    }
    return application.get('attendees');
};

var token = function () {
    var obj = application.get('rfidToken');
    if (obj && (obj.expires > new Date().getTime())) {
        return obj;
    }
    obj = post(app.rfidService.tokenUrl, {
        grant_type: 'client_credentials',
        scope: 'PRODUCTION'
    }, {
        'Authorization': 'Basic ' + base64.encode(app.rfidService.consumerKey + ':' + app.rfidService.consumerSecret),
        'Content-Type': 'application/x-www-form-urlencoded'
    });
    if (obj.xhr.status !== 200) {
        log.error('Error while generating the token. Using a dummy token');
        obj = {
            expires_in: 100000,
            access_token: 'abcdefghijkl'
        };
    } else {
        obj = JSON.parse(obj.data);
    }
    obj.expires = new Date().getTime() + obj.expires_in * 1000 - 10000;
    application.put('rfidToken', obj);
    return obj;
};

var auth = function (headers) {
    var tk = token().access_token;
    headers = headers || {};
    headers['Authorization'] = 'Bearer ' + tk;
    return headers;
};


var users = function () {
    var obj = get(app.rfidService.endpoint + '/users', null, auth(), 'json');
    return obj.data;
};

var rfids = function () {
    //this is to skip concurrent requests to some extend
    if (application.get('updating-rfids')) {
        var i, count = 25;
        for (i = 0; i < count; i++) {
            java.lang.Thread.sleep(200);
            if (!application.get('updating-rfids')) {
                break;
            }
        }
    } else {
        application.put('updating', true);
        var obj = get(app.rfidService.endpoint + '/conferences/' + app.conId + '/iot/users/rfid', null, auth());
        if (obj.xhr.status !== 200) {
            log.error('Error while generating the token. Using a dummy token');
            obj = [];
        } else {
            obj = JSON.parse(obj.data);
        }
        application.put('rfids', obj);
        application.remove('updating-rfids');
    }
    return application.get('rfids');
};

var rfid = function (o) {
    var obj = post(app.rfidService.endpoint + '/conferences/' + app.conId + '/iot/users/rfid', JSON.stringify(o), auth({
        'Content-Type': 'application/json'
    }));
    var ids = application.get('rfids');
    ids.push(o);
    return obj.data;
};