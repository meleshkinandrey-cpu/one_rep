define(['knockout', 'jquery', 'ajax', 'models/SDForms/SDForm.ManhoursWorkList', 'dateTimeControl'], function (ko, $, ajaxLib, listWorkLib, dtLib) {
    var module = {
        ViewModel: function (manhour, work, regionID) {
            var self = this;
            self.LoadD = $.Deferred();
            //
            self.$region = $('#' + regionID);
            self.Manhour = manhour;
            self.Work = work;
            self.ForseClose = undefined;//задается в формхелпере
            //
            if (self.Manhour != null && self.Manhour.ID)
                self.ID = ko.observable(self.Manhour.ID);
            else self.ID = ko.observable(null);
            //
            if (self.Manhour != null && self.Manhour.Value)
                self.Value = ko.observable(self.Manhour.Value);
            else self.Value = ko.observable(null);
            //
            if (self.Manhour != null && self.Manhour.StartDate)
                self.StartDate = ko.observable(self.Manhour.StartDate);
            else self.StartDate = ko.observable(null);
            //
            self.controlValue = null;
            //
            self.controlDate = '';
            self.StartDateString = ko.observable('');//отображаемое значение даты (редактируемое поле ввода / контрол выбора даты)
            self.StartDateString.subscribe(function (newValue) {
                if (self.controlDate.$isLoaded.state() != 'resolved')
                    return;
                //
                var dt = self.controlDate.dtpControl.length > 0 ? self.controlDate.dtpControl.datetimepicker('getValue') : null;
                //
                if (!newValue || newValue.length == 0)
                    self.StartDate(null);//clear field => reset value
                else if (dtLib.Date2String(dt) != newValue) {
                    self.StartDate(null);//value incorrect => reset value
                    self.StartDateString('');
                }
                else
                    self.StartDate(dt);
            });
            //
            self.SetStartDate = function (utcValue) {
                var stringIsDate = function (dt) {
                    if (dt == null)
                        return false;
                    return (new Date(dt) != 'Invalid Date' && !isNaN(new Date(dt))) ? true : false;
                };
                self.StartDate(stringIsDate(utcValue) ? new Date(getUtcDate(utcValue)) : null);//always dateTime, auto convert serverUtcDateString to jsLocalTime
                if (self.controlDate.dtpControl.length > 0 && self.StartDate())
                    self.controlDate.dtpControl.datetimepicker('setOptions', { startDate: self.StartDate(), value: self.StartDate() });
                self.StartDateString(dtLib.Date2String(self.StartDate()));//always local string
            };
            //
            self.CheckValues = function () {
                var retD = $.Deferred();
                var valid = true;
                var errorMessage = '';
                var tempValue = 0;
                //
                var manhValue =  self.controlValue ? self.controlValue.getValue() : null;
                if (manhValue != null && manhValue != '') {
                    var separatorIndex = manhValue.indexOf(':');
                    if (separatorIndex == -1) {//число = минуты
                        var val = parseInt(manhValue);
                        if (!isNaN(val) && isFinite(val)) {
                            if (val > 0 && val <= 1440)//24*60
                                tempValue = val;
                            else {
                                valid = false;
                                errorMessage += '\n' + getTextResource('ManhourErrorSize');
                                self.controlValue.clear();
                            }
                        }
                        else {
                            valid = false;
                            errorMessage += '\n' + getTextResource('ManhourErrorBadSymbols');
                            self.controlValue.clear();
                        }
                    }
                    else if (separatorIndex < manhValue.length - 1) {//ожидаем формат ч:м
                        var hoursStr = manhValue.substring(0, separatorIndex);
                        var minutesStr = manhValue.substring(separatorIndex + 1);
                        //
                        var hours = parseInt(hoursStr);
                        var minutes = parseInt(minutesStr);
                        if (!isNaN(hours) && isFinite(hours) && !isNaN(minutes) && isFinite(minutes)) {
                            if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60)
                                tempValue = hours * 60 + minutes;
                            else {
                                valid = false;
                                errorMessage += '\n' + getTextResource('ManhourErrorSize');
                                self.controlValue.clear();
                            }
                        }
                        else {
                            valid = false;
                            errorMessage += '\n' + getTextResource('ManhourErrorBadSymbols');
                            self.controlValue.clear();
                        }
                    }
                }
                else {
                    valid = false;
                    errorMessage += '\n' + getTextResource('ManhourErrorEmptyValue');
                }
                //
                if (!self.StartDate() || self.StartDateString().length <= 0) {
                    valid = false;
                    errorMessage += '\n' + getTextResource('ManhourErrorEmptyDate');
                }
                //
                if (valid) {
                    self.Value(tempValue);
                    //                    
                    retD.resolve(true);
                }
                else {
                    require(['sweetAlert'], function () {
                        swal(getTextResource('ManhourDataNotValidCaption'), getTextResource('ManhourDataNotValid') + errorMessage, 'warning');
                        retD.resolve(false);
                    });
                }
                //
                return retD.promise();
            };
            //
            self.AfterRender = function () {
                self.LoadD.resolve();
            };
            //
            self.Initialize = function () {
                var $dtp = self.$region.find('.manhours-editor-date');
                //
                self.controlDate = new dtLib.control();
                self.controlDate.init($dtp, {
                    StringObservable: self.StartDateString,
                    ValueDate: self.StartDate(),
                    OnSelectDateFunc: function (current_time, $input) {
                        self.StartDate(current_time);
                        self.StartDateString(dtLib.Date2String(current_time));
                    },
                    OnSelectTimeFunc: function (current_time, $input) {
                        self.StartDate(current_time);
                        self.StartDateString(dtLib.Date2String(current_time));
                    },
                    HeaderText: getTextResource('ManhoursEditorEnterDate'),
                    ClassText: 'manhours-editor-caption'
                });
                //
                var valueD = $.Deferred();
                require(['timePickerControl'], function (tpLib) {
                    self.controlValue = new tpLib.control();
                    var options = { 'show2400': false, 'wrapHours': false, 'typeaheadHighlight': false, 'skipPrettyValue': true };
                    $.when(self.controlValue.init(self.$region.find('.manhours-value-input'), options)).done(function () {
                        valueD.resolve();
                    });
                });
                //
                $.when(valueD, self.controlDate.$isLoaded).done(function () {
                    if (self.Value()) {
                        var obj = getLocaleHourMinObject(self.Value());
                        self.controlValue.setManual(obj.h, obj.m);
                    }
                    self.StartDateString(dtLib.Date2String(self.StartDate()));
                });
                //
                $(document).unbind('objectDeleted', self.onObjectModified).bind('objectDeleted', self.onObjectModified);
            };
            //
            self.ajaxControl_edit = new ajaxLib.control();
            self.Save = function () {
                var retD = $.Deferred();
                if (self.ID()) {
                    require(['sweetAlert'], function (swal) {
                        self.ajaxControl_edit.Ajax(self.$region,
                            {
                                dataType: 'json',
                                url: 'sdApi/EditManhours',
                                method: 'POST',
                                data: {
                                    Operation: 0, //edit
                                    ID: self.ID(),
                                    WorkID: self.Work.ID,
                                    ObjectID: self.Work.ObjectID,
                                    ObjectClassID: self.Work.ObjectClassID,
                                    Value: self.Value(),
                                    UtcDateMilliseconds: dtLib.GetMillisecondsSince1970(self.StartDate()),
                                    UtcDate: null
                                }
                            },
                        function (ans) {
                            if (ans) {
                                var response = ans.Response;
                                if (response) {
                                    var result = response.Result;
                                    if (result !== 0) {
                                        if (result == 1)
                                            swal(getTextResource('EditManhoursCaption'), getTextResource('NullParamsError') + '\n[SDForm.ManhourEditor.js, Save]', 'error');
                                        else if (result == 2)
                                            swal(getTextResource('EditManhoursCaption'), getTextResource('BadParamsError') + '\n[SDForm.ManhourEditor.js, Save]', 'error');
                                        else if (result == 3)
                                            swal(getTextResource('EditManhoursCaption'), getTextResource('AccessError'), 'error');
                                        else if (result == 4)
                                            swal(getTextResource('EditManhoursCaption'), getTextResource('GlobalError') + '\n[SDForm.ManhourEditor.js, Save]', 'error');
                                        else if (result == 5)
                                            swal(getTextResource('EditManhoursCaption'), getTextResource('ConcurrencyErrorWithoutQuestion'), 'error');
                                        else if (result == 6) {
                                            swal(getTextResource('EditManhoursCaption'), getTextResource('ObjectDeleted') + '\n' + getTextResource('WeNeedCloseForm'), 'error');
                                            //
                                            if (self.ForseClose != undefined) {
                                                self.ForseClose();
                                                $(document).trigger('local_objectDeleted', [0, self.ID(), self.Work.ID]);
                                            }
                                        }
                                        else if (result == 7)
                                            swal(getTextResource('EditManhoursCaption'), (response.Message ? response.Message : getTextResource('TM_ObjectInUse')), 'warning');
                                        else if (result == 8)
                                            swal(getTextResource('EditManhoursCaption'), (response.Message ? response.Message : getTextResource('ValidationError')), 'warning');
                                        else
                                            swal(getTextResource('EditManhoursCaption'), (response.Message ? response.Message : getTextResource('AjaxError')) + '\n[SDForm.ManhourEditor.js, Save]', 'error');
                                        //
                                        retD.resolve(null);
                                    }
                                    else {
                                        retD.resolve({
                                            ID: self.ID(),
                                            WorkID: self.Work.ID,
                                            Value: self.Value(),
                                            UtcDate: ans.UtcDate
                                        });
                                    }
                                }
                            }
                            else {
                                swal(getTextResource('EditManhoursCaption'), getTextResource('AjaxError') + '\n[SDForm.ManhourEditor.js, Save]', 'error');
                                retD.resolve(null);
                            }
                        });
                    });
                }
                else {
                    require(['sweetAlert'], function (swal) {
                        self.ajaxControl_edit.Ajax(self.$region,
                            {
                                dataType: 'json',
                                url: 'sdApi/EditManhours',
                                method: 'POST',
                                data: {
                                    Operation: 1, //create
                                    ID: null,
                                    WorkID: self.Work.ID,
                                    ObjectID: self.Work.ObjectID,
                                    ObjectClassID: self.Work.ObjectClassID,
                                    Value: self.Value(),
                                    UtcDateMilliseconds: dtLib.GetMillisecondsSince1970(self.StartDate()),
                                    UtcDate: null
                                }
                            },
                        function (ans) {
                            if (ans) {
                                var response = ans.Response;
                                if (response) {
                                    var result = response.Result;
                                    if (result !== 0) {
                                        if (result == 1)
                                            swal(getTextResource('EditManhoursCaption'), getTextResource('NullParamsError') + '\n[SDForm.ManhourEditor.js, Save]', 'error');
                                        else if (result == 2)
                                            swal(getTextResource('EditManhoursCaption'), getTextResource('BadParamsError') + '\n[SDForm.ManhourEditor.js, Save]', 'error');
                                        else if (result == 3)
                                            swal(getTextResource('EditManhoursCaption'), getTextResource('AccessError'), 'error');
                                        else if (result == 4)
                                            swal(getTextResource('EditManhoursCaption'), getTextResource('GlobalError') + '\n[SDForm.ManhourEditor.js, Save]', 'error');
                                        else if (result == 5)
                                            swal(getTextResource('EditManhoursCaption'), getTextResource('ConcurrencyErrorWithoutQuestion'), 'error');
                                        else if (result == 6) {
                                            swal(getTextResource('EditManhoursCaption'), getTextResource('ObjectDeleted') + '\n' + getTextResource('WeNeedCloseForm'), 'error');
                                            //
                                            if (self.ForseClose != undefined)
                                                self.ForseClose();
                                        }
                                        else if (result == 7)
                                            swal(getTextResource('EditManhoursCaption'), (response.Message ? response.Message : getTextResource('TM_ObjectInUse')), 'warning');
                                        else if (result == 8)
                                            swal(getTextResource('EditManhoursCaption'), (response.Message ? response.Message : getTextResource('ValidationError')), 'warning');
                                        else
                                            swal(getTextResource('EditManhoursCaption'), (response.Message ? response.Message : getTextResource('AjaxError')) + '\n[SDForm.ManhourEditor.js, Save]', 'error');
                                        //
                                        retD.resolve(null);
                                    }
                                    else {
                                        self.ID(ans.ID);
                                        retD.resolve({
                                            ID: self.ID(),
                                            WorkID: self.Work.ID,
                                            Value: self.Value(),
                                            UtcDate: ans.UtcDate
                                        });
                                    }
                                }
                            }
                            else {
                                swal(getTextResource('EditManhoursCaption'), getTextResource('AjaxError') + '\n[SDForm.ManhourEditor.js, Save]', 'error');
                                retD.resolve(null);
                            }
                        });
                    });
                }
                //
                return retD.promise();
            };
            //
            self.Unload = function () {
                $(document).unbind('objectDeleted', self.onObjectModified);
            };
            self.onObjectModified = function (e, objectClassID, objectID, parentObjectID) {//ловим всё
                if (objectClassID == 18) {//OBJ_ManhoursWork
                    if (self.Work.ID == objectID) {
                        if (e.type == 'objectDeleted')
                        {
                            if (self.ForseClose != undefined)
                                self.ForseClose();
                        }
                    }
                }
                //
                if (objectClassID == 0) {
                    if (self.ID() && objectID == self.ID() && e.type == 'objectDeleted') {
                        swal(getTextResource('ManhoursWasDeleted'), getTextResource('WeNeedCloseForm'), 'info');
                            //
                            if (self.ForseClose != undefined)
                                self.ForseClose();
                    }
                }
                
            };
        }
    };
    return module;
});