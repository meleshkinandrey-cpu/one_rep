define(['knockout', 'jquery', 'ajax', 'ttControl', 'urlManager'], function (ko, $, ajaxLib, tclib, urlManager) {
    var module = {
        getDaysInFebruary: function (year) {
            if (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0))
                return 29;// Leap year
            else
                return 28;// Not a leap year                
        },
        getDayOfYear: function (date) {
            var feb = module.getDaysInFebruary(date.getFullYear());
            var aggregateMonths = [0, // January
                                   31, // February
                                   31 + feb, // March
                                   31 + feb + 31, // April
                                   31 + feb + 31 + 30, // May
                                   31 + feb + 31 + 30 + 31, // June
                                   31 + feb + 31 + 30 + 31 + 30, // July
                                   31 + feb + 31 + 30 + 31 + 30 + 31, // August
                                   31 + feb + 31 + 30 + 31 + 30 + 31 + 31, // September
                                   31 + feb + 31 + 30 + 31 + 30 + 31 + 31 + 30, // October
                                   31 + feb + 31 + 30 + 31 + 30 + 31 + 31 + 30 + 31, // November
                                   31 + feb + 31 + 30 + 31 + 30 + 31 + 31 + 30 + 31 + 30, // December
            ];
            return aggregateMonths[date.getMonth()] + date.getDate();
        },
        stringIsDate: function (dt) {
            if (dt == null)
                return false;
            return (new Date(dt) != 'Invalid Date' && !isNaN(new Date(dt))) ? true : false;
        },
        parseDate: function (str) {
            return new Date(parseFloat(str));
        },
        dateToString: function (date) {
            return module.padString(date.getDate().toString()) + '.' + module.padString((date.getMonth() + 1).toString()) + '.' + date.getFullYear().toString();
        },
        padString: function (s, size) {
            while (s.length < (size || 2)) { s = "0" + s; }
            return s;
        },
        getDatePaddedString: function (val) {
            var h = val > 0 ? Math.floor(val / 60) : Math.ceil(val / 60);
            //var h = Math.trunc(val / 60); //IE not work
            return module.padString(h.toString()) + ':' + module.padString((val - h * 60).toString());
        },
        addDaysToDate: function (date, count) {
            var retval = new Date(date);
            retval.setDate(retval.getDate() + count);
            return retval;
        },
        setParameters: function (values, raiseEvent) {//values - is object, сохранение в историю браузера значения url и изменение параметров url
            if (!values)
                return;
            //
            var params = urlManager.getQueryParams();
            var isChanged = false;
            for (var key in values) {
                var paramName = key;
                var paramValue = values[key];
                //
                if (params[paramName] != paramValue) {
                    params[paramName] = paramValue;
                    isChanged = true;
                }
            }
            //
            if (isChanged == true) {
                window.history.pushState(null, null, 'SD/TimeManagement' + urlManager.toQueryString(params));
                if (raiseEvent == undefined || raiseEvent == true)
                    $(document).trigger('tm_urlChanged', []);
            }
        },
        formatNumberForCircle: function (value) {
                if (value == undefined || value == null || value == 0)
                    return '';
                else if (value > 0 && value <= 9)
                    return value.toString();
                else
                    return '9+';
        },
        //
        modes: {// режимы: работы, отображения
            none: 'none',
            timeSheet: 'timeSheet',//мой табель
            calendar: 'calendar',//мой календарь (отклонения)
            timeSheetTotal: 'timeSheetTotal'//сводный табель сотрудников
        },
        param_mode: 'mode',
        param_timeSheetID: 'timeSheetID',
        param_userID: 'userID',
        param_year: 'year',
        param_dayOfYear: 'dayOfYear',
        param_filterStateID: 't_filterStateID',
        param_minRow: 't_minRow',
        param_maxRow: 't_maxRow',
        //
        UserInfo: function (timeManagementModule, obj) {//BLL.TimeManagement\UserInfo - пользователь моего подразделения
            var self = this;
            //
            self.ID = obj.ID;
            self.FullName = obj.FullName;
            self.PositionName = obj.PositionName;
            self.SubdivisionName = obj.SubdivisionFullName;
        },
        //
        ManhoursWorkShowModeD: $.Deferred(), //настройка отображение трудозатрат на карточках работы
        ManhoursInClosedD: $.Deferred(), //настройка добавления трудозатрат в закрытые объекты
        //
        ViewModel: function () {
            var self = this;
            //
            self.modes = module.modes;
            self.TimeSheet = ko.observable(null);//модель табеля
            self.Calendar = ko.observable(null);//модель календаря
            self.TimeSheetTotal = ko.observable(null);//модель сводного табеля
            //
            self.ViewTemplateName = ko.observable('');//шаблон контента (справа)            
            //
            self.SelectedViewMode = ko.observable(module.modes.none);//выбранное представление по умолчанию
            self.SelectedViewMode.subscribe(function (newValue) {
                var params = {};
                params[module.param_mode] = newValue;
                module.setParameters(params, false);
                //
                self.CheckData();
            });
            self.CheckMode = function () {//распознавание режима
                var mode = urlManager.getUrlParam(module.param_mode);
                var currentMode = self.SelectedViewMode().toLowerCase();
                //
                if (mode == module.modes.timeSheet.toLowerCase())
                    self.SelectedViewMode(module.modes.timeSheet);
                else if (mode == module.modes.calendar.toLowerCase())
                    self.SelectedViewMode(module.modes.calendar);
                else if (mode == module.modes.timeSheetTotal.toLowerCase())
                    self.SelectedViewMode(module.modes.timeSheetTotal);
                else
                    self.SelectedViewMode(module.modes.timeSheet);
                //
                return (mode != currentMode);
            };
            //
            self.CheckData = function () {//загрузка / перезагрузка вкладки
                var activeMode = self.SelectedViewMode();
                var ss = function () { showSpinner($('.tmModule')[0]); };
                var hs = function () { hideSpinner($('.tmModule')[0]); };
                //
                if (activeMode == module.modes.timeSheet) {
                    if (self.TimeSheet() == null) {
                        ss();
                        
                            require(['models/TimeManagement/TimeSheet'], function (vm) {
                                var mod = new vm.ViewModel(module, self.CheckData);
                                mod.CheckData();
                                self.TimeSheet(mod);
                                //
                                self.ViewTemplateName('TimeManagement/TimeSheet');
                                hs();
                            });
                    }
                    else {
                        self.ViewTemplateName('TimeManagement/TimeSheet');
                        self.TimeSheet().CheckData();
                    }
                }
                else if (activeMode == module.modes.calendar) {
                    if (self.Calendar() == null) {
                        ss();
                            require(['models/TimeManagement/Calendar'], function (vm) {
                                var mod = new vm.ViewModel(module);
                                self.Calendar(mod);
                                mod.CheckData();
                                mod.OnChangeForTimesheet = self.CheckChangeInCalendarForTimeSheet;
                                //
                                self.ViewTemplateName('TimeManagement/Calendar');
                                hs();
                            });
                    }
                    else {
                        self.ViewTemplateName('TimeManagement/Calendar');
                        self.Calendar().CheckData();
                    }
                }
                else if (activeMode == module.modes.timeSheetTotal) {
                    if (self.TimeSheetTotal() == null) {
                        ss();                        
                            require(['models/TimeManagement/TimeSheetTotal'], function (vm) {
                                var mod = new vm.ViewModel(module);
                                self.TimeSheetTotal(mod);
                                mod.CheckData();
                                //
                                self.ViewTemplateName('TimeManagement/TimeSheetTotal');
                                hs();
                            });
                    }
                    else {
                        self.ViewTemplateName('TimeManagement/TimeSheetTotal');
                        self.TimeSheetTotal().CheckData();
                    }
                }
                else
                    self.ViewTemplateName('');
            };
            //
            self.CheckChangeInCalendarForTimeSheet = function (startDateCal, finishDateCal) {
                if (self.TimeSheet() && self.TimeSheet().IsObsoleteData == false && self.TimeSheet().IsDatesCrossing(startDateCal, finishDateCal)) {
                    self.TimeSheet().IsObsoleteData = true;
                }
            };
            //
            self.NotificationConverter = function (value) {
                return module.formatNumberForCircle(value);
            };
            //
            self.TimesheetNoteCount = ko.observable(0);
            self.TimesheetNoteCountString = ko.computed(function () {
                return self.NotificationConverter(self.TimesheetNoteCount());
            });
            self.OnLocalMessageReaded = function (e, messageID, timesheetID, ownerTimesheetID, authorID) {
                var timeSheetTotal = self.TimeSheetTotal();
                if (timeSheetTotal != null)
                    timeSheetTotal.OnLocalMessageReaded(e, messageID, timesheetID, ownerTimesheetID, authorID);
                //
                $.when(userD).done(function (user) {
                    if (user.UserID == ownerTimesheetID && self.TimesheetNoteCount && self.TimesheetNoteCount() > 0)
                        self.TimesheetNoteCount(self.TimesheetNoteCount() - 1);
                    else if (user.UserID != ownerTimesheetID && self.TimesheetTotalNoteCount && self.TimesheetTotalNoteCount() > 0)
                        self.TimesheetTotalNoteCount(self.TimesheetTotalNoteCount() - 1);
                });
            };
            //
            self.OnMessageAdded = function (e, messageID, timesheetID, ownerTimesheetID, authorID) {
                var timeSheet = self.TimeSheet();
                if (timeSheet != null)
                    timeSheet.OnMessageAdded(e, messageID, timesheetID, ownerTimesheetID, authorID);
                //
                var timeSheetTotal = self.TimeSheetTotal();
                if (timeSheetTotal != null)
                    timeSheetTotal.OnMessageAdded(e, messageID, timesheetID, ownerTimesheetID, authorID);
                //
                $.when(userD).done(function (user) {
                    if (user.UserID == ownerTimesheetID && user.UserID != authorID)
                        self.TimesheetNoteCount(self.TimesheetNoteCount() + 1);
                });
            };
            $(document).bind('local_messageReaded', self.OnLocalMessageReaded);
            $(document).bind('tsMessageInserted', self.OnMessageAdded);
            //
            self.ShowMyTimeSheet = function () {
                var userID = urlManager.getUrlParam(module.param_userID);
                if (userID != null) {//предыдущий табель не мой скорее всего
                    var params = {};
                    params[module.param_timeSheetID] = undefined;
                    params[module.param_userID] = undefined;
                    module.setParameters(params);
                }
                self.SelectedViewMode(module.modes.timeSheet);
            };
            self.IsTimeSheetActive = ko.computed(function () {
                return self.SelectedViewMode() == module.modes.timeSheet;
            });
            //
            self.ShowMyCalendar = function () {
                var userID = urlManager.getUrlParam(module.param_userID);
                if (userID != null) {//предыдущий календарь не мой скорее всего
                    var params = {};
                    params[module.param_userID] = undefined;
                    //остальные поля (день года и год) сбрасывать нет нужны
                    module.setParameters(params);
                }
                self.SelectedViewMode(module.modes.calendar);
            };
            self.IsCalendarActive = ko.computed(function () {
                return self.SelectedViewMode() == module.modes.calendar;
            });
            //
            self.TimesheetTotalNoteCount = ko.observable(0);
            self.TimesheetTotalNoteCountFromTab = ko.computed(function () {
                if (self.TimeSheetTotal() != null && self.TimeSheetTotal().TotalUnreadedMessages != null) { //информация, что кто-то что-то выложил или прокоментил
                    return self.TimeSheetTotal().TotalUnreadedMessages();
                }
                else return 0;
            });
            self.TimesheetTotalNoteCountComputed = ko.computed(function () {
                if (self.TimeSheetTotal() == null)
                    return self.TimesheetTotalNoteCount();
                else return self.TimesheetTotalNoteCountFromTab();
            });
            self.TimesheetTotalNoteCountString = ko.computed(function () {
                return self.NotificationConverter(self.TimesheetTotalNoteCountComputed());
            });
            //
            self.ShowTimeSheetTotal = function () {
                self.SelectedViewMode(module.modes.timeSheetTotal);
            };
            self.IsTotalTimeSheetActive = ko.computed(function () {
                return self.SelectedViewMode() == module.modes.timeSheetTotal;
            });
            //            
            self.AfterRenderMode = function () {
                showSpinner($('.tm-views')[0]);
                //
                $.when(userD).done(function (user) {
                    $('#modeTimeSheet').css('display', 'block');
                    $('#modeTimeSheetText').css('display', 'block');
                    //
                    if (user.HasRoles) {
                        $.when(
                            operationIsGrantedD(675)//OPERATION_Exclusion_Properties
                            ).done(function (exclusion_properties) {
                                if (exclusion_properties == true) {
                                    $('#modeCalendar').css('display', 'block');
                                    $('#modeCalendarText').css('display', 'block');
                                }
                                else {
                                    $('#modeCalendar').remove();
                                    $('#modeCalendarText').remove();
                                }
                            });
                        //
                        $.when(
                            operationIsGrantedD(597),//OPERATION_Call_ShowCallsForITSubdivisionInWeb
                            operationIsGrantedD(599),//OPERATION_WorkOrder_ShowWorkOrdersForITSubdivisionInWeb
                            operationIsGrantedD(598)//OPERATION_Problem_ShowProblemsForITSubdivisionInWeb                           
                            ).done(function (seeCallIT, seeWorkOrderIT, seeProblemIT) {
                                if (seeCallIT == true || seeWorkOrderIT == true || seeProblemIT == true) {
                                    $('#modeTimeSheetTotal').css('display', 'block');
                                    $('#modeTimeSheetTotalText').css('display', 'block');
                                }
                                else {
                                    $('#modeTimeSheetTotal').remove();
                                    $('#modeTimeSheetTotalText').remove();
                                }
                            });
                    }
                    else {
                        $('#modeCalendar').remove();
                        $('#modeTimeSheetTotal').remove();
                    }
                    //
                    hideSpinner($('.tm-views')[0]);
                    self.CheckMode();
                });
                //                
                self.onResize();
                $(window).resize(self.onResize);
                $('.tm-main').click(function (e) {//контекстные команды могут отобразится после клика на чекбоксе
                    if ($(e.target).is('input'))
                        self.onResize();
                });
            };
            //
            self.ajaxControl_loadGlobalInfo = new ajaxLib.control();
            self.Load = function () {//грузит глобальную информацию - сколько непрочитанных сообщений в сводном табеле и сколько сообщений в твоих табелях
                var loadD = $.Deferred();
                //
                self.ajaxControl_loadGlobalInfo.Ajax(null,
                {
                    url: 'sdApi/getTimesheetGlobalInfo',
                    method: 'GET',
                    dataType: "json"
                },
                function (outModel) {
                    if (outModel && outModel.Result === 0) {
                        self.TimesheetTotalNoteCount(outModel.UnreadedMessagesInTotalTimesheet);
                        self.TimesheetNoteCount(outModel.UnreadedMessagesInMyTimesheets);
                        loadD.resolve(true);
                    }
                    else if (outModel && outModel.Result === 1)//NullParamsError
                        require(['sweetAlert'], function () {
                            swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[TimeManagement.js, Load]', 'error');
                        });
                    else if (outModel && outModel.Result === 3)//AccessError
                        require(['sweetAlert'], function () {
                            swal(getTextResource('ErrorCaption'), getTextResource('AccessError'), 'error');
                        });
                    else
                        require(['sweetAlert'], function () {
                            swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[TimeManagement.js, Load]', 'error');
                        });
                    //
                    loadD.resolve(false);
                });
                //
                return loadD.promise();
            };
            //
            //прокидываем событие во все вкладки
            self.onObjectInserted = function (e, objectClassID, objectID, parentObjectID) {
                var timeSheet = self.TimeSheet();
                if (timeSheet != null)
                    timeSheet.OnObjectInserted(e, objectClassID, objectID, parentObjectID);
                //
                var calendar = self.Calendar();
                if (calendar != null)
                    calendar.OnObjectInserted(e, objectClassID, objectID, parentObjectID);
                //
                var timeSheetTotal = self.TimeSheetTotal();
                if (timeSheetTotal != null)
                    timeSheetTotal.OnObjectInserted(e, objectClassID, objectID, parentObjectID);
                //
                self.CheckData();
            };
            self.onObjectModified = function (e, objectClassID, objectID, parentObjectID) {
                var timeSheet = self.TimeSheet();
                if (timeSheet != null)
                    timeSheet.OnObjectModified(e, objectClassID, objectID, parentObjectID);
                //
                var calendar = self.Calendar();
                if (calendar != null)
                    calendar.OnObjectModified(e, objectClassID, objectID, parentObjectID);
                //
                var timeSheetTotal = self.TimeSheetTotal();
                if (timeSheetTotal != null)
                    timeSheetTotal.OnObjectModified(e, objectClassID, objectID, parentObjectID);
                //
                self.CheckData();
            };
            self.onObjectDeleted = function (e, objectClassID, objectID, parentObjectID) {
                var timeSheet = self.TimeSheet();
                if (timeSheet != null)
                    timeSheet.OnObjectDeleted(e, objectClassID, objectID, parentObjectID);
                //
                var calendar = self.Calendar();
                if (calendar != null)
                    calendar.OnObjectDeleted(e, objectClassID, objectID, parentObjectID);
                //
                var timeSheetTotal = self.TimeSheetTotal();
                if (timeSheetTotal != null)
                    timeSheetTotal.OnObjectDeleted(e, objectClassID, objectID, parentObjectID);
                //
                self.CheckData();
            };
            //
            self.onResize = function (e) {
                var timeSheet = self.TimeSheet();
                if (timeSheet != null)
                    timeSheet.OnResize(e);
                //
                var calendar = self.Calendar();
                if (calendar != null)
                    calendar.OnResize(e);
                //
                var timeSheetTotal = self.TimeSheetTotal();
                if (timeSheetTotal != null)
                    timeSheetTotal.OnResize(e);
            };
            //
            //отписываться не будем
            $(document).bind('objectInserted', self.onObjectInserted);
            $(document).bind('local_objectInserted', self.onObjectInserted);
            $(document).bind('objectUpdated', self.onObjectModified);
            $(document).bind('local_objectUpdated', self.onObjectModified);
            $(document).bind('objectDeleted', self.onObjectDeleted);
            $(document).bind('local_objectDeleted', self.onObjectDeleted);
            //
            $(window).bind('popstate', function () {//поменяется url (кнопки браузера вперед/назад)
                if (self.CheckMode() == false)
                    self.CheckData();
            });
            $(window).bind('tm_urlChanged', function () {//поменяется url (изменили режимы в модуле, ткнули куда-либо)
                if (self.CheckMode() == false)
                    self.CheckData();
            });
            //
            //
            self.ajaxControl_loadSettings = new ajaxLib.control();
            self.ajaxControl_loadSettings.Ajax(null,
                {
                    url: 'configApi/manhoursSettings',
                    method: 'GET',
                    dataType: "json"
                },
                function (retval) {
                    module.ManhoursWorkShowModeD.resolve(retval.ShowMode);
                    module.ManhoursInClosedD.resolve(retval.AllowInClosed);
                });
        }
    }
    return module;
});
