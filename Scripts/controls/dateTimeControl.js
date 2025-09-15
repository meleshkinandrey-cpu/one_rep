define(['knockout', 'jquery'], function (ko, $) {
    var module = {
        StringToDate: function (dt) {
            if (dt == null || dt == undefined || dt == '')
                return null;
            //
            //dd.MM.yyyy hh:mm:ss
            var mainParts = dt.toString().split(' ');
            if (mainParts.length == 0)
                return null;
            //
            var dateParts = mainParts[0].split('.');//d.m.y
            if (dateParts.length != 3)
                return null;
            var d = parseInt(dateParts[0]);
            var m = parseInt(dateParts[1]);
            var y = parseInt(dateParts[2]);
            //
            var hh = 0;
            var mm = 0;
            var ss = 0;
            if (mainParts.length > 1) {
                var timeParts = mainParts[1].split(':');//hh.mm.ss
                if (timeParts.length != 3)
                    return null;
                hh = parseInt(timeParts[0]);
                mm = parseInt(timeParts[1]);
                ss = parseInt(timeParts[2]);
            }
            // new Date(year, month [, day [, hours[, minutes[, seconds[, ms]]]]])
            dt = new Date(y, m - 1, d, hh, mm, ss); //months are 0-based
            if (dt.getTime() < 0)
                return null;
            //
            return dt;
        },
        StringIsDate: function (dt) {
            var dt = module.StringToDate(dt);
            //
            return (dt != 'Invalid Date' && !isNaN(dt) && dt != null) ? true : false;
        },
        Date2String: function (dt, onlyDate) {
            if (!dt)
                return '';
            if (onlyDate !== true)
                onlyDate = false;
            //
            var year = dt.getFullYear();
            var month = dt.getMonth() + 1; if (month < 10) month = '0' + month;
            var day = dt.getDate(); if (day < 10) day = '0' + day;
            var hour = dt.getHours(); if (hour < 10) hour = '0' + hour;
            var min = dt.getMinutes(); if (min < 10) min = '0' + min;
            //
            var retval = day + '.' + month + '.' + year + (onlyDate ? "" : (" " + hour + ":" + min));
            return retval;
        },
        GetMillisecondsSince1970: function (dt) {
            if (dt == null)
                return null;
            else
                return dt.getTime();//web to server: ms from 1.1.1970 in utc  
        },
        control: function () {
            var self = this;
            self.$region = null;
            self.$isLoaded = $.Deferred();
            self.divID = 'dateTimeControl_' + ko.getNewID();
            self.Options = null;
            self.dtpControl = '';
            self.stringObservable = null;
            self.headerText = ko.observable('');
            self.classText = ko.observable('');
            //
            self.IsDisabled = ko.observable(false);
            //
            self.CalendarClick = function () {
                if (self.$isLoaded.state() == 'resolved')
                    self.dtpControl.datetimepicker('toggle');
            };
            //
            self.defaultConfig = {
                StringObservable: null,
                ValueDate: null,
                OnSelectDateFunc: null,
                OnSelectTimeFunc: null,
                HeaderText: '',
                ClassText: '',
                OnlyDate: false
            };
            //
            self.init = function ($region, settings) {
                self.$region = $region;
                var config = self.defaultConfig;
                $.extend(config, settings);
                //
                self.Options = config;
                self.stringObservable = self.Options.StringObservable;
                self.headerText(self.Options.HeaderText);
                self.classText(self.Options.ClassText);
                //
                self.$region.append('<div id="' + self.divID + '" style="position:relative" data-bind="template: {name: \'DateTimeControl/DateTimeControl\', afterRender: AfterRender}" ></div>');
                //
                try {
                    ko.applyBindings(self, document.getElementById(self.divID));
                }
                catch (err) {
                    if (document.getElementById(self.divID))
                        throw err;
                }
            };
            //
            self.destroy = function () {
                if (self.dtpControl)
                    self.dtpControl.datetimepicker('destroy');
            };
            //
            self.AfterRender = function () {
                showSpinner(self.$region[0]);
                //
                require(['dateTimePicker'], function () {
                    if (locale && locale.length > 0)
                        $.datetimepicker.setLocale(locale.substring(0, 2));
                    //
                    var allowTimes = []; for (var xh = 0; xh <= 23; xh++) for (var xm = 0; xm < 60; xm++) allowTimes.push(("0" + xh).slice(-2) + ':' + ("0" + xm).slice(-2));
                    var startDate = new Date();
                    //startDate.setMonth(startDate.getMonth());
                    //
                    self.dtpControl = self.$region.find(':input').datetimepicker({
                        startDate: self.Options.ValueDate == null ? startDate : self.Options.ValueDate,
                        closeOnDateSelect: self.Options.OnlyDate === true ? true : false,
                        timepicker: self.Options.OnlyDate === true ? false : true,
                        format: self.Options.OnlyDate ? 'd.m.Y' : 'd.m.Y H:i',
                        mask: self.Options.OnlyDate ? '39.19.9999' : '39.19.9999 29:59',
                        allowTimes: allowTimes,
                        dayOfWeekStart: locale && locale.length > 0 && locale.substring(0, 2) == 'en' ? 0 : 1,
                        value: self.Options.ValueDate,
                        validateOnBlur: true,
                        onSelectDate: function (current_time, $input) {
                            if (self.Options.OnSelectDateFunc)
                                self.Options.OnSelectDateFunc(current_time, $input);
                        },
                        onSelectTime: function (current_time, $input) {
                            if (self.Options.OnSelectTimeFunc)
                                self.Options.OnSelectTimeFunc(current_time, $input);
                        }
                    });
                    //
                    hideSpinner(self.$region[0]);
                    //
                    self.$isLoaded.resolve(self.dtpControl);
                    //
                    if (self.Options.FocusControl)//перефокусируем на нужный нам контрол (IE автоматически фокусирует dataTimeControl)
                        self.Options.FocusControl();
                });
            };
        }
    }
    return module;
});