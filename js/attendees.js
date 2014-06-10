$(function () {
    var attendees;

    var tokens = function (obj, fn) {
        var i;
        var data = [];
        var length = obj.length;
        for (i = 0; i < length; i++) {
            data.push(fn(obj[i]));
        }
        return data;
    };


    var typeahead = function (selector, data, fn) {
        // constructs the suggestion engine
        var attendees = new Bloodhound({
            datumTokenizer: Bloodhound.tokenizers.obj.whitespace('value'),
            queryTokenizer: Bloodhound.tokenizers.whitespace,
            // `states` is an array of state names defined in "The Basics"
            local: $.map(data, function (data) {
                return { value: data };
            })
        });

        // kicks off the loading/processing of `local` and `prefetch`
        attendees.initialize();

        $(selector).typeahead('destroy').typeahead({
                hint: true,
                highlight: true,
                minLength: 1
            },
            {
                name: 'attendees',
                displayKey: 'value',
                // `ttAdapter` wraps the suggestion engine in an adapter that
                // is compatible with the typeahead jQuery plugin
                source: attendees.ttAdapter()
            }).unbind('typeahead:selected').on('typeahead:selected', function (e) {
                fn($(this).typeahead('val'));
            });
    };

    var updateForm = function (o) {
        if (!o) {
            return;
        }
        $('form .name').val(o.firstname + ' ' + o.lastname);
        $('form .email').val(o.email);
        $('form .country').val(o.country);
        $('form .title').val(o.title);
        $('form .company').val(o.company);
    };

    var clearForm = function () {
        $('form .rfid').val('');
        $('form .name').val('');
        $('form .email').val('');
        $('form .country').val('');
        $('form .title').val('');
        $('form .company').val('');
    };

    var attendee = function (key, val) {
        var i, length = attendees.length;
        for (i = 0; i < length; i++) {
            if (attendees[i][key] === val) {
                return attendees[i];
            }
        }
        return null;
    };

    $.get('attendees.jag', function (data) {
        attendees = data;
        typeahead('.email', tokens(data, function (o) {
            return o.email;
        }), function (selection) {
            updateForm(attendee('email', selection));
        });
        typeahead('.name', tokens(data, function (o) {
            return o.firstname + ' ' + o.lastname;
        }), function (selection) {
            var i, attn, length = attendees.length;
            for (i = 0; i < length; i++) {
                attn = attendees[i];
                if ((attn.firstname + ' ' + attn.lastname) === selection) {
                    break;
                }
            }
            updateForm(attn);
        });
    });

    var url = function (ws) {
        var base = location.href;
        var end = base.lastIndexOf('/');
        var start = base.indexOf('://') + 3;
        return 'ws://' + base.substring(start, end) + ws;
    };

    var registered = function (rfid) {
        $.get('rfids.jag', function (data) {
            var i, d, length = data.length;
            for (i = 0; i < length; i++) {
                d = data[i];
                if (d.rfid === rfid) {
                    updateForm(attendee('email', d.email));
                    break;
                }
            }
        });
    };

    /*$('form .email').change(function() {
     console.log($(this).val());
     });*/
    var ws = new WebSocket(url('/ws.jag?device=' + deviceId));
    ws.onopen = function () {
        console.log('connected');
    };
    //event handler for the message event in the case of text frames
    ws.onmessage = function (event) {
        console.log('message');
        console.log(event);
        clearForm();
        $('form .rfid').val(event.data);
        registered(event.data);
    };
    ws.onclose = function () {
        console.log('disconnected');
    };

});