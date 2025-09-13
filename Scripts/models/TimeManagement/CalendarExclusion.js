define(['knockout', 'jquery', 'ajax', 'usualForms', 'dateTimeControl', 'comboBox'], function (ko, $, ajaxLib, fhModule, dtLib) {
    var module = {
        ViewModel: function (obj) {
            var self = this;
            //
            self.exclusion = obj;
            //
            self.isWorkingKO = ko.observable(obj.IsWorkPeriod);
            //
            self.IsWorking = function (item) {
                self.isWorkingKO(!(self.isWorkingKO()));
                return true;
            };
            //
            self.mainRegionID = null;
            self.comboItems = ko.observableArray([]);
            self.getComboItems = function () {
                return {
                    data: self.comboItems(),
                    totalCount: self.comboItems().length
                };
            };
            self.selectedComboItem = ko.observable(null);
            //
            self.periodStart = ko.observable(isNaN(obj.UtcPeriodStartDT()) ? null : obj.UtcPeriodStartDT());//always local string
            self.periodStart.subscribe(function (newValue) {
                if (self.controlStart().$isLoaded.state() != 'resolved')
                    return;
                //
                var dt = self.controlStart().dtpControl.length > 0 ? self.controlStart().dtpControl.datetimepicker('getValue') : null;
                //
                if (!newValue || newValue.length == 0)
                    self.periodStartDateTime(null);//clear field => reset value
                else if (dtLib.Date2String(dt) != newValue) {
                    self.periodStartDateTime(null);//value incorrect => reset value
                    self.periodStart('');
                }
                else
                    self.periodStartDateTime(dt);
            });
            self.periodStartDateTime = ko.observable(self.periodStart() ? self.periodStart() : null);//always dateTime, auto convert serverUtcDateString to jsLocalTime
            //
            self.periodEnd = ko.observable(isNaN(obj.UtcPeriodEndDT()) ? null : obj.UtcPeriodEndDT());//always local string
            self.periodEnd.subscribe(function (newValue) {
                if (self.controlEnd().$isLoaded.state() != 'resolved')
                    return;
                //
                var dt = self.controlEnd().dtpControl.length > 0 ? self.controlEnd().dtpControl.datetimepicker('getValue') : null;
                //
                if (!newValue || newValue.length == 0)
                    self.periodEndDateTime(null);//clear field => reset value
                else if (dtLib.Date2String(dt) != newValue) {
                    self.periodEndDateTime(null);//value incorrect => reset value
                    self.periodEnd('');
                }
                else
                    self.periodEndDateTime(dt);
            });
            self.periodEndDateTime = ko.observable(self.periodEnd() ? self.periodEnd() : null);//always dateTime, auto convert serverUtcDateString to jsLocalTime
            //
            self.objectID = obj.ObjectID;
            //
            self.ajaxControl = new ajaxLib.control();
            //
            self.GetParentDIV = function () {
                return $('#' + self.MainRegionID);
            }
            //
            self.controlStart = ko.observable(null);
            self.controlEnd = ko.observable(null);
            //
            self.InitDtp = function (dtpClass, dateTimeStr, dateTime, control) {
                var parent = self.GetParentDIV();
                //
                var dtp = parent.find(dtpClass);
                //
                var ctrl = new dtLib.control();
                ctrl.init(dtp, {
                    StringObservable: dtLib.Date2String(dateTimeStr()),
                    ValueDate: dateTime(),
                    OnSelectDateFunc: function (current_time, $input) {
                        dateTime(current_time);
                        dateTimeStr(dtLib.Date2String(current_time));
                    },
                    OnSelectTimeFunc: function (current_time, $input) {
                        dateTime(current_time);
                        dateTimeStr(dtLib.Date2String(current_time));
                    },
                    HeaderText: ''
                });
                control(ctrl);
            };
            self.Save = function () {
                var retvalD = $.Deferred();
                //
                var data = {
                    ID: self.exclusion.ID,
                    StartPeriod: dtLib.GetMillisecondsSince1970(self.periodStartDateTime()),
                    EndPeriod: dtLib.GetMillisecondsSince1970(self.periodEndDateTime()),
                    IsWorking: self.isWorkingKO(),
                    ExclusionID: self.selectedComboItem() ? self.selectedComboItem().ID : null,
                    ObjectID: self.objectID
                };
                if (data.StartPeriod == null || data.EndPeriod == null || data.ExclusionID == null) {
                    require(['sweetAlert'], function () {
                        swal(getTextResource('TM_CalendarExclusion_InvalidFields'));
                    });
                    retvalD.resolve(false);
                    return;
                }
                ///
                self.ajaxControl.Ajax(self.GetParentDIV(),
                    {
                        dataType: "json",
                        method: 'POST',
                        data: data,
                        url: 'sdApi/SaveCalendarExclusion'
                    },
                    function (result) {
                        if (result != 0)
                            require(['sweetAlert'], function () {
                                if (result == 7)//operationError
                                    swal(getTextResource('TM_ObjectInUse'));
                                else if (result == 8)//validationError
                                    swal(getTextResource('TM_CalendarExclusionIntersect'));
                                else
                                    swal(getTextResource('SaveError'), getTextResource('GlobalError'), 'error');
                            });
                        //
                        retvalD.resolve(result === 0);
                    },
                    function (err) {
                        retvalD.resolve(false);
                    });
                return retvalD.promise();
            };

            self.GetExclusionList = function () {
                self.ajaxControl.Ajax(self.GetParentDIV().find('.combobox'),
                   {
                       dataType: "json",
                       method: 'GET',
                       url: 'sdApi/GetExclusionList'
                   },
                   function (result) {
                       if (result && result.List) {
                           var selEl = null;
                           result.List.forEach(function (el) {

                               self.comboItems().push(el);
                               if (self.exclusion.ExclusionName === el.Name)
                                   selEl = el;
                           });
                           self.comboItems.valueHasMutated();
                           self.selectedComboItem(selEl);
                       }
                   });
            }

            self.AfterRender = function () {
                self.InitDtp('.calendar-exclusion-date-start', self.periodStart, self.periodStartDateTime, self.controlStart);
                self.InitDtp('.calendar-exclusion-date-end', self.periodEnd, self.periodEndDateTime, self.controlEnd);
                self.GetExclusionList();
            };
        }
    }
    return module;
});