define(['knockout', 'jquery', 'ajax', 'selectControl', 'dateTimeControl'], function (ko, $, ajaxLib, scLib, dtLib) {
    var module = {
        OperationEmpty: { ID: -100500, Name: getTextResource('FilterElementIsEmpty') },
        ViewModel: function (obj) {
            var self = this;
            self.$region = null;
            self.$isLoaded = $.Deferred();
            //
            self.Type = obj.Type;
            self.PropertyName = obj.PropertyName;
            self.LocaleName = obj.LocaleName;
            self.IsEmpty = obj.IsEmpty;
            self.Operation = obj.Operation;
            self.OnlyDate = obj.OnlyDate === true ? true : false;
            //
            self.StartDate = ko.observable(null);
            self.StartDateString = ko.observable('');
            self.StartDateString.subscribe(function (newValue) {
                if (self.StartDateControl.$isLoaded.state() != 'resolved')
                    return;
                //
                var dt = self.StartDateControl.dtpControl.length > 0 ? self.StartDateControl.dtpControl.datetimepicker('getValue') : null;
                //
                if (!newValue || newValue.length == 0)
                    self.StartDate(null);//clear field => reset value
                else if (dtLib.Date2String(dt, self.OnlyDate) != newValue) {
                    self.StartDate(null);//value incorrect => reset value
                    self.StartDateString('');
                }
                else
                    self.StartDate(dt);
            });
            self.SetStartDate = function (utcValue) {
                if (self.StartDateControl.$isLoaded.state() != 'resolved')
                    return;
                //
                self.StartDate(dtLib.StringIsDate(utcValue) || isDate(utcValue) ? new Date(getUtcDate(utcValue)) : null);//always dateTime, auto convert serverUtcDateString to jsLocalTime
                if (self.StartDateControl.dtpControl.length > 0 && self.StartDate())
                    self.StartDateControl.dtpControl.datetimepicker('setOptions', { startDate: self.StartDate(), value: self.StartDate() });
                self.StartDateString(dtLib.Date2String(self.StartDate(), self.OnlyDate));//always local string
            };
            self.StartDateControl = '';
            //
            self.FinishDate = ko.observable(null);
            self.FinishDateString = ko.observable('');
            self.FinishDateString.subscribe(function (newValue) {
                if (self.FinishDateControl.$isLoaded.state() != 'resolved')
                    return;
                //
                var dt = self.FinishDateControl.dtpControl.length > 0 ? self.FinishDateControl.dtpControl.datetimepicker('getValue') : null;
                //
                if (!newValue || newValue.length == 0)
                    self.FinishDate(null);//clear field => reset value
                else if (dtLib.Date2String(dt, self.OnlyDate) != newValue) {
                    self.FinishDate(null);//value incorrect => reset value
                    self.FinishDateString('');
                }
                else
                    self.FinishDate(dt);
            });
            self.SetFinishDate = function (utcValue) {
                if (self.FinishDateControl.$isLoaded.state() != 'resolved')
                    return;
                //
                self.FinishDate(dtLib.StringIsDate(utcValue) || isDate(utcValue) ? new Date(getUtcDate(utcValue)) : null);//always dateTime, auto convert serverUtcDateString to jsLocalTime
                if (self.FinishDateControl.dtpControl.length > 0 && self.FinishDate())
                    self.FinishDateControl.dtpControl.datetimepicker('setOptions', { startDate: self.FinishDate(), value: self.FinishDate() });
                self.FinishDateString(dtLib.Date2String(self.FinishDate(), self.OnlyDate));//always local string
            };
            self.FinishDateControl = '';
            //
            self.SetNewValues = function (newFilterElement) {
                if (self.Type != newFilterElement.Type || self.PropertyName != newFilterElement.PropertyName)
                    return;
                //
                self.IsEmpty = newFilterElement.IsEmpty;
                self.Operation = newFilterElement.Operation;
                //
                if (self.controlSelectOperations) {
                    if (self.IsEmpty !== 1) {
                        self.controlSelectOperations.SetItemSelectedByID(self.Operation);
                        self.CheckVisibilityDateControls(self.Operation);
                    }
                    else {
                        self.controlSelectOperations.SetItemSelectedByID(module.OperationEmpty.ID);
                        self.CheckVisibilityDateControls(module.OperationEmpty.ID);
                    }                    
                }
                //
                self.SetStartDate(newFilterElement.StartDate);
                self.SetFinishDate(newFilterElement.FinishDate);
            };
            self.GetDataToSave = function () {
                if (!self.controlSelectOperations)
                    return null;
                //
                var currentOperation = self.controlSelectOperations.GetSelectedItems();
                if (currentOperation == null)
                    return null;
                //
                var retval = {};
                //
                retval.Type = self.Type;
                retval.PropertyName = self.PropertyName;
                retval.LocaleName = self.LocaleName;
                retval.OnlyDate = self.OnlyDate;
                //
                if (self.IsEmpty == 0)//FilterEmptyState CantEmpty
                {
                    retval.IsEmpty = 0;
                    retval.Operation = currentOperation.ID;
                }
                else if (currentOperation.ID == module.OperationEmpty.ID) {
                    retval.IsEmpty = 1;//Checked
                    retval.Operation = null;
                }
                else {
                    retval.IsEmpty = 2;//Unchecked
                    retval.Operation = currentOperation.ID;
                }
                //
                retval.StartDate = dtLib.GetMillisecondsSince1970(self.StartDate());
                retval.FinishDate = dtLib.GetMillisecondsSince1970(self.FinishDate());
                //
                return retval;
            };
            //
            self.AfterRender = function (htmlNodes) {
                if (htmlNodes && htmlNodes.length > 0)
                    self.$region = $(htmlNodes[0]).parent();
                //                
                var oPromise = self.InitializeOperationControl(self.$region.find('.datePickFilter-operations'));
                var fdPromise = self.InititalizeFirstDateControl(self.$region.find('.datePickFilter-firstDate'));
                var sdPromise = self.InititalizeSecondDateControl(self.$region.find('.datePickFilter-secondDate'));
                //
                $.when(oPromise, fdPromise, sdPromise).done(function () {
                    self.$isLoaded.resolve();
                });
            };
            //
            self.controlSelectOperations = null;
            self.FirstDateFieldVisible = ko.observable(false);
            self.SecondDateFieldVisible = ko.observable(false);
            //
            self.ajaxControl_loadOperations = new ajaxLib.control();
            self.InitializeOperationControl = function ($regionOperations) {
                var retD = $.Deferred();
                //
                $regionOperations.empty();
                var deffered = $.Deferred();
                self.controlSelectOperations = new scLib.control();
                self.controlSelectOperations.init($regionOperations,
                    {
                        Title: getTextResource('FilterChooseOperation'),
                        TitleStyle: 'filterElementOperationsHeader',
                        IsSelectMultiple: false,
                        AllowDeselect: false,
                        OnSelect: function (item) {
                            if (item)
                                self.CheckVisibilityDateControls(item.ID);
                        }
                    }, deffered.promise());
                //
                var param = {
                    filterType: self.Type,
                };
                //
                self.ajaxControl_loadOperations.Ajax($regionOperations,
                    {
                        dataType: "json",
                        method: 'GET',
                        url: 'filterApi/GetFilterOperationList?' + $.param(param)
                    },
                    function (newData) {
                        if (newData != null) {
                            var retval = [];
                            //
                            if (self.IsEmpty != 0)//FilterEmptyState CantEmpty
                            {
                                retval.push({
                                    ID: module.OperationEmpty.ID,
                                    Name: module.OperationEmpty.Name,
                                    Checked: self.IsEmpty == 1 //Checked
                                });
                            }
                            //
                            newData.forEach(function (el) {
                                retval.push({
                                    ID: el.ID,
                                    Name: el.Name,
                                    Checked: el.ID == self.Operation
                                });
                            });
                            //
                            var currentOperation = ko.utils.arrayFirst(retval, function (el) { return el.Checked == true });
                            self.CheckVisibilityDateControls(currentOperation ? currentOperation.ID : null);
                            //
                            deffered.resolve(retval);
                        }
                        else deffered.resolve();
                        //
                        $.when(self.controlSelectOperations.$initializeCompleted).done(function () {
                            retD.resolve();
                        });
                    });
                //
                return retD.promise();
            };
            //
            self.InititalizeFirstDateControl = function ($regionFirstDate) {
                var retD = $.Deferred();
                //
                self.StartDateControl = new dtLib.control();
                self.StartDateControl.init($regionFirstDate, {
                    StringObservable: self.StartDateString,
                    ValueDate: self.StartDate(),
                    OnSelectDateFunc: function (current_time, $input) {
                        self.StartDate(current_time);
                        self.StartDateString(dtLib.Date2String(current_time, self.OnlyDate));
                    },
                    OnSelectTimeFunc: function (current_time, $input) {
                        self.StartDate(current_time);
                        self.StartDateString(dtLib.Date2String(current_time, self.OnlyDate));
                    },
                    HeaderText: '',
                    OnlyDate: self.OnlyDate
                });
                //
                $.when(self.StartDateControl.$isLoaded).done(function () {
                    self.SetStartDate(obj.StartDate);
                    retD.resolve();
                });
                //
                return retD.promise();
            };
            self.InititalizeSecondDateControl = function ($regionSecondDate) {
                var retD = $.Deferred();
                //
                self.FinishDateControl = new dtLib.control();
                self.FinishDateControl.init($regionSecondDate, {
                    StringObservable: self.FinishDateString,
                    ValueDate: self.FinishDate(),
                    OnSelectDateFunc: function (current_time, $input) {
                        self.FinishDate(current_time);
                        self.FinishDateString(dtLib.Date2String(current_time, self.OnlyDate));
                    },
                    OnSelectTimeFunc: function (current_time, $input) {
                        self.FinishDate(current_time);
                        self.FinishDateString(dtLib.Date2String(current_time, self.OnlyDate));
                    },
                    HeaderText: '',
                    OnlyDate: self.OnlyDate
                });
                //
                $.when(self.FinishDateControl.$isLoaded).done(function () {
                    self.FinishDate(obj.FinishDate);
                    retD.resolve();
                });
                return retD.promise();
            };
            self.CheckVisibilityDateControls = function (currentOperationID) {
                if (currentOperationID === null || currentOperationID == module.OperationEmpty.ID || currentOperationID >= 5)//DateRanges
                {
                    self.FirstDateFieldVisible(false);
                    self.SecondDateFieldVisible(false);
                    return;
                }
                //
                if (currentOperationID == 0 || currentOperationID == 1 || currentOperationID == 2)//Equal or Before or After
                {
                    self.FirstDateFieldVisible(true);
                    self.SecondDateFieldVisible(false);
                    return;
                }
                //
                if (currentOperationID == 3 || currentOperationID == 4)//Between or Except
                {
                    self.FirstDateFieldVisible(true);
                    self.SecondDateFieldVisible(true);
                    return;
                }
            };
        }
    }
    return module;
});