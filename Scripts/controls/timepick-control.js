define(['jquery', 'jqueryTimePicker'], function ($) {
    var module = {
        control: function () {
            var self = this;
            //
            self.defaultConfig = {
                'step': 1,
                'timeFormat': 'H:i',
                'show2400': true,
                'orientation': 'l',
                'skipPrettyValue': false //собственный хак, чтобы при клике вне инпута числа не превращались во время
            };
            //
            self.init = function ($container, settings) {
                var d = $.Deferred();
                //
                var config = self.defaultConfig;
                //config.appendTo = $container;
                $.extend(config, settings);
                //
                require(['text!../Templates/TimeControl/TimePickerControl.html'], function (template) {
                    $container.append(template);
                    self.$input = $container.find('.timePickerControl-input');
                    //
                    self.$input.timepicker(config);
                    if (config.time)
                        self.setValue(config.time);
                    //
                    self.$input.on('change', function () {
                        if (config.OnChangeAction)
                            config.OnChangeAction();
                    });
                    //
                    d.resolve();
                });
                //
                return d.promise();
            };
            //
            self.hide = function () {
                if (self.$input)
                    self.$input.timepicker('hide');
            };
            //
            self.show = function () {
                if (self.$input)
                    self.$input.pickmeup('show');
            };
            //
            self.getValue = function () {
                if (self.$input) {
                    var value = self.$input.val();
                    return value;
                }
                return '';
            };
            //
            self.clear = function () {
                if (self.$input)
                    self.$input.timepicker('setTime', null);
            };
            //
            self.setValue = function (utcDate) { // in filters
                if (self.$input) {
                    if (!utcDate)
                        self.$input.timepicker('setTime', null);
                    else {
                        var day, month, year, hour, min;
                        day = utcDate.substr(0, 2);
                        month = utcDate.substr(3, 2);
                        year = utcDate.substr(6, 4);
                        hour = utcDate.substr(11, 2);
                        min = utcDate.substr(14, 2);
                        //
                        var str = year + '-' + month + '-' + day + 'T' + hour + ':' + min + 'Z';
                        var date = new Date(str);
                        self.$input.timepicker('setTime', date);
                    }
                }
            };
            self.setManual = function (hours, minutes) { // in manhours
                if (self.$input) {
                    if (hours == null || minutes == null)
                        self.$input.timepicker('setTime', null);
                    else {
                        hours = hours > 23 ? 23 : hours;
                        hours = hours < 0 ? 0 : hours;
                        //
                        minutes = minutes > 59 ? 59 : minutes;
                        minutes = minutes < 0 ? 0 : minutes;
                        //
                        var date = new Date(2016, 11, 12, hours, minutes, 0, 0);
                        self.$input.timepicker('setTime', date);
                    }
                }
            };
            //
            self.destroy = function () {
                if (self.$input)
                    self.$input.timepicker('remove');
            };
        }
    }
    return module;
});