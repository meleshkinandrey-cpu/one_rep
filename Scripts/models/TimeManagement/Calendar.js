define(['knockout', 'jquery', 'ajax', 'urlManager'], function (ko, $, ajaxLib, urlManager) {
    var module = {
        ViewModel: function (timeManagementModule) {//общая модель представления календарь
            var self = this;
            //            
            self.IsObsoleteData = true;//данные устарели, пора обновлять
            self.OnChangeForTimesheet = null;//устанавливается в тайм менеджменте, чтобы отслеживать для таймшита, передаем дату начала и конца
            //
            self.WaitUserInfoAndCheckSize = function (calendar) {
                var handler = null;
                handler = calendar.UserInfo.subscribe(function () {
                    handler.dispose();
                    setTimeout(self.OnResize, 500);
                });
            };
            //
            self.Model = ko.observable(null);//module.Calendar
            self.Model.subscribe(function (newValue) {
                self.WaitUserInfoAndCheckSize(newValue);
            });
            self.ModelAfterRender = function () {
                self.OnResize();
                self.ScrollToFirstWorkTime();
            };
            //
            self.TimezoneOffsetInMinutes = new Date().getTimezoneOffset(); //для учета всех расчетов на стороне серера
            //
            self.ajaxControl_load = new ajaxLib.control();
            self.Load = function (year, dayOfYear, forward) {//загрузка/создание данных по отчетному периоду
                self.IsObsoleteData = false;
                //
                var now = new Date();
                var model = self.Model();
                if (year != null && year != undefined &&
                    dayOfYear != null && dayOfYear != undefined) {
                    var tmp = new Date(year, 0);
                    now = new Date(tmp.setDate(dayOfYear));
                }
                else if (model != null) {
                    if (forward == false) //previous period
                        now = timeManagementModule.addDaysToDate(model.StartDate(), -1);
                    else if (forward == true) //next period
                        now = timeManagementModule.addDaysToDate(model.FinishDate(), +1);
                }
                //
                var param = {
                    year: now.getFullYear(),
                    dayOfYear: timeManagementModule.getDayOfYear(now),
                    timezoneOffsetInMinutes: self.TimezoneOffsetInMinutes,
                    userID: urlManager.getUrlParam(timeManagementModule.param_userID)
                };
                //
                self.ajaxControl_load.Ajax($('.tmModule'),
                    {
                        dataType: "json",
                        method: 'GET',
                        url: 'sdApi/GetUserCalendar?' + $.param(param)
                    },
                    function (outModel) {
                        if (outModel && outModel.Result === 0) {
                            var calendar = outModel.Value;
                            if (calendar) {
                                var vm = new module.Calendar(timeManagementModule, calendar);
                                if (model == null) {
                                    self.Model(vm);
                                    vm.LoadUserInfo();
                                }
                                else if (model.Merge(vm) == false) {
                                    self.Model(vm);
                                    vm.LoadUserInfo();
                                }
                                else {
                                    self.WaitUserInfoAndCheckSize(model);
                                    model.LoadUserInfo();
                                }
                                //
                                if (self.Model() != null) {
                                    var startDate = self.Model().StartDate();
                                    var params = {};
                                    params[timeManagementModule.param_year] = startDate.getFullYear();
                                    params[timeManagementModule.param_dayOfYear] = timeManagementModule.getDayOfYear(startDate);
                                    timeManagementModule.setParameters(params, false);
                                }
                            }
                            else {
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('TM_CalendarNotCreatedByPeriod'));
                                });
                            }
                        }
                        else if (outModel && outModel.Result === 1)//NullParamsError
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[TimeManagement.Calendar.js, Load]', 'error');
                            });
                        else if (outModel && outModel.Result === 3)//AccessError
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('AccessError'), 'error');
                            });
                        else if (outModel && outModel.Result === 4)//GlobalError
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[TimeManagement.Calendar.js, Load]', 'error');
                            });
                        else
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[TimeManagement.Calendar.js, Load]', 'error');
                            });
                    });
            };
            //
            self.NextCalendarClick = function () {//следующий отчетный период
                var vm = self.Model();
                if (vm) {
                    self.Abort();
                    self.Load(null, null, true);
                }
            };
            self.PreviousCalendarClick = function () {//предыдущий отчетный период
                var vm = self.Model();
                if (vm) {
                    self.Abort();
                    self.Load(null, null, false);
                }
            };
            self.ShowExclusionForm = function (exclusion) {
                showSpinner();
                require(['usualForms'], function (lib) {
                    var fvm = new lib.formHelper(true);
                    fvm.ShowCalendarExclusion(exclusion, function () {
                        if (self.OnChangeForTimesheet && self.Model())
                            self.OnChangeForTimesheet(self.Model().StartDate(), self.Model().FinishDate());
                    });
                });
            };
            //
            self.Abort = function () {//прерываение предыдущих загрузок
                self.ajaxControl_load.Abort();
                var vm = self.Model();
                if (vm != null)
                    vm.Abort();
            };
            //
            self.cellSelectionStart = ko.observable(null);
            self.CellMouseDown = function (vm, e) {//vm is CalendarItemDay
                var calendar = self.Model();
                if (calendar == null)
                    return;
                //
                self.cellSelectionStart(vm);
                calendar.SelectRange(vm, vm);
            };
            self.CellMouseUp = function (vm, e) {//vm is CalendarItemDay                               
                if (self.cellSelectionStart() == vm && vm.Checked() == true && vm.Exclusion() != null) {
                    var calendar = self.Model();
                    if (calendar != null)
                        calendar.SelectExclusion(vm.Exclusion().ID);
                    //
                    self.ShowExclusionForm(vm.Exclusion());
                }
                //
                self.cellSelectionStart(null);
            };
            self.CellMouseOver = function (vm, e) {//vm is CalendarItemDay
                var calendar = self.Model();
                if (calendar == null || self.cellSelectionStart() == null)
                    return;
                //
                calendar.SelectRange(self.cellSelectionStart(), vm);
            };
            //
            self.BackToTimeSheetTotalClick = function () {//назад к сводному табелю руководителя
                var params = {};
                params[timeManagementModule.param_mode] = timeManagementModule.modes.timeSheetTotal;
                params[timeManagementModule.param_year] = undefined;
                params[timeManagementModule.param_dayOfYear] = undefined;
                params[timeManagementModule.param_userID] = undefined;
                timeManagementModule.setParameters(params);//raise tm_urlChanged event (mode parameter)
            };
            //
            self.CheckData = function () {//вызывается извне, сообщает, что пора обновлять/загружать данные
                $.when(userD).done(function (user) {
                    var startDate = self.Model() == null ? null : self.Model().StartDate();
                    var current_userID = self.Model() == null ? null : self.Model().UserID;
                    var current_year = startDate == null ? null : startDate.getFullYear();
                    var current_dayOfYear = startDate == null ? null : timeManagementModule.getDayOfYear(startDate);
                    //
                    var year = urlManager.getUrlParam(timeManagementModule.param_year);
                    var dayOfYear = urlManager.getUrlParam(timeManagementModule.param_dayOfYear);
                    var userID = urlManager.getUrlParam(timeManagementModule.param_userID);
                    if (userID == null)
                        userID = user.UserID;//id of currentUser
                    //
                    if (self.IsObsoleteData ||
                        year != null && current_year != null && year != current_year ||
                        dayOfYear != null && current_dayOfYear != null && dayOfYear != current_dayOfYear ||
                        userID != null && current_userID != null && userID != current_userID) {
                        //
                        if (year != null && dayOfYear != null)
                            self.Load(year, dayOfYear);
                        else
                            self.Load();
                        //
                        if (self.OnChangeForTimesheet && self.Model())
                            self.OnChangeForTimesheet(self.Model().StartDate(), self.Model().FinishDate());
                    }
                });
            };
            //
            self.ScrollToFirstWorkTime = function () {//прокручивание представления на первое рабочее время
                var calendar = self.Model();
                if (calendar == null)
                    return;
                //
                for (var i = 0; i < calendar.ItemList().length; i++) {
                    var item = calendar.ItemList()[i];
                    for (var j = 0; j < item.DayList().length; j++) {
                        var day = item.DayList()[j];
                        //
                        if (day.IsWorkTime() == true) {
                            var action = null;
                            action = function () {
                                var target = $('#' + item.ElementID);
                                if (target.length == 1) {
                                    var table = $('.table-scroll')[0];
                                    if (table.scrollHeight > table.offsetHeight) {//has scroll
                                        table.scrollTop = target[0].offsetTop - target.height();
                                    }
                                }
                                else
                                    setTimeout(action, 100);
                            };
                            action();
                            return;
                        }
                    }
                }
            };
            //
            //реакции на события OBJ_Exclusion = 172
            self.OnObjectInserted = function (e, objectClassID, objectID, parentObjectID) {
                if (objectClassID == 172)
                    self.IsObsoleteData = true;
            };
            self.OnObjectModified = function (e, objectClassID, objectID, parentObjectID) {
                if (objectClassID != 172)
                    return;
                //
                if (self.IsObjectPresent(objectID))
                    self.IsObsoleteData = true;
            };
            self.OnObjectDeleted = function (e, objectClassID, objectID, parentObjectID) {
                if (objectClassID != 172)
                    return;
                //
                if (self.IsObjectPresent(objectID))
                    self.IsObsoleteData = true;
            };
            self.IsObjectPresent = function (objectID) {
                var model = self.Model();
                if (model == null)
                    return false;
                //
                var itemList = model.ItemList();
                for (var i = 0; i < itemList.length; i++) {
                    var item = itemList[i];
                    var dayList = item.DayList();
                    for (var j = 0; j < dayList.length; j++) {
                        var day = dayList[j];
                        if (day.Exclusion() != null && day.Exclusion().ID == objectID)
                            return true;
                    }
                }
                //
                return false;
            };
            //
            self.resizeTimeout = null;
            self.OnResize = function () {
                clearTimeout(self.resizeTimeout);
                self.resizeTimeout = null;
                //
                var target = $(".table-scroll");
                if (target.length > 0) {
                    var new_height = getPageContentHeight() - $(".c-general").outerHeight(true) - $(".ui-dialog-buttonset").outerHeight(true) - $('.c-tableHeader').outerHeight(true) - 10;
                    new_height = Math.max(new_height, 100);
                    //
                    var tableSize = target.find('.c-table').height();
                    target.css("height", new_height > tableSize ? '' : new_height + 'px');
                    //
                    if (getIEVersion() != -1) {
                        if (target[0].scrollHeight > target.outerHeight(true)) //scroll visible
                            $('.c-tableHeader').css('padding-right', '22px');
                        else
                            $('.c-tableHeader').css('padding-right', '10px');
                    }
                    else {
                        if (target[0].scrollHeight > target.outerHeight(true)) //scroll visible
                            $('.c-tableHeader').css('padding-right', '17px');
                        else
                            $('.c-tableHeader').css('padding-right', '5px');
                    }
                }
                else
                    self.resizeTimeout = setTimeout(self.OnResize, 50);
            };
            //
            self.OnScroll = function (vm, e) {
                $('.c-tableHeader').css('margin-left', -e.target.scrollLeft);
            };
            //
            self.SelectedItems = ko.computed(function () {//выбранные ячейки (отклонения)
                var model = self.Model();
                if (model == null || self.cellSelectionStart() != null)
                    return [];
                //
                var selectedItems = model.GetCheckedCalendarItemDayList();
                return selectedItems;
            });
            self.SelectedExclusions = ko.computed(function () {//массив неповторяющихся выделенных отклонений
                var selectedItems = self.SelectedItems();
                var retval = [];
                var dic = {};
                //
                for (var i = 0; i < selectedItems.length; i++) {
                    var calendarItemDay = selectedItems[i];
                    if (calendarItemDay.Exclusion() != null) {
                        var e = calendarItemDay.Exclusion();
                        if (dic[e.ID] != undefined)
                            continue;
                        dic[e.ID] = e;
                        retval.push(e);
                    }
                }
                //
                return retval;
            });
            //
            self.cmd_AddExclusion = function () {
                var calendar = self.Model();
                if (calendar == null)
                    return;
                //
                var obj =
                    {
                        ID: null,
                        ObjectID: calendar.UserID,
                        UtcPeriodStart: calendar.SelectedMinDate,
                        UtcPeriodEnd: calendar.SelectedMaxDate,
                        //
                        IsWorkPeriod: false,
                    };
                showSpinner();
                require(['usualForms'], function (lib) {
                    var fvm = new lib.formHelper(true);
                    var exclusion = new module.CalendarExclusion(timeManagementModule, obj);
                    fvm.ShowCalendarExclusion(exclusion, function () {
                        if (self.OnChangeForTimesheet && self.Model())
                            self.OnChangeForTimesheet(self.Model().StartDate(), self.Model().FinishDate());
                    });
                });
            };
            self.cmd_RemoveExclusion = function () {
                var selectedExclusions = self.SelectedExclusions();
                if (selectedExclusions.length == 0)
                    return;
                //               
                var ids = [];
                var question = '';
                selectedExclusions.forEach(function (el) {
                    ids.push(el.ID);
                    //
                    if (question.length < 200) {
                        question += (question.length > 0 ? ', ' : '') + el.ExclusionName;
                        if (question.length >= 200)
                            question += '...';
                    }
                });
                //
                require(['sweetAlert'], function (swal) {
                    swal({
                        title: getTextResource('TM_RemoveExclusionCaption') + ': ' + question,
                        text: getTextResource('TM_RemoveExclusionQuestion'),
                        showCancelButton: true,
                        closeOnConfirm: false,
                        closeOnCancel: true,
                        confirmButtonText: getTextResource('ButtonOK'),
                        cancelButtonText: getTextResource('ButtonCancel')
                    },
                    function (value) {
                        swal.close();
                        //
                        if (value == true) {
                            //
                            var data = {
                                IDList: ids
                            };
                            self.ajaxControl_load.Ajax($(".c-table"),
                                {
                                    dataType: "json",
                                    method: 'POST',
                                    data: data,
                                    url: 'sdApi/RemoveCalendarExclusion'
                                },
                                function (result) {
                                    if (result == 0) {
                                        if (self.OnChangeForTimesheet && self.Model())
                                            self.OnChangeForTimesheet(self.Model().StartDate(), self.Model().FinishDate());
                                    }
                                    else if (result == 1)
                                        require(['sweetAlert'], function () {
                                            swal(getTextResource('SaveError'), getTextResource('NullParamsError') + '\n[TimeManagament.Calendar.js, cmd_RemoveExclusion]', 'error');
                                        });
                                    else if (result == 7)
                                        require(['sweetAlert'], function () {
                                            swal(getTextResource('TM_ObjectInUse'));
                                        });
                                    else
                                        require(['sweetAlert'], function () {
                                            swal(getTextResource('SaveError'), getTextResource('GlobalError') + '\n[TimeManagament.Calendar.js, cmd_RemoveExclusion]', 'error');
                                        });
                                });
                        }
                    });
                });
            };
            self.cmd_OpenExclusion = function () {
                var selectedExclusions = self.SelectedExclusions();
                if (selectedExclusions.length != 1)
                    return;
                //
                self.ShowExclusionForm(selectedExclusions[0]);
            };
        },

        CalendarExclusion: function (timeManagementModule, obj) {//BLL.TimeManagement\CalendarExclusion - исключение из графика рабочего времени пользователя
            var self = this;
            //
            self.ID = obj.ID;
            self.ObjectID = obj.ObjectID;
            //
            self.UtcPeriodStart = obj.UtcPeriodStart;
            self.UtcPeriodEnd = obj.UtcPeriodEnd;
            self.UtcPeriodStartDT = ko.observable(new Date(parseInt(obj.UtcPeriodStartString)));
            self.UtcPeriodEndDT = ko.observable(new Date(parseInt(obj.UtcPeriodEndString)));
            //
            self.IsWorkPeriod = obj.IsWorkPeriod;
            self.ExclusionName = obj.ExclusionName;
            //
            self.TooltipMessage = ko.computed(function () {
                var since = timeManagementModule.stringIsDate(self.UtcPeriodStart) ? timeManagementModule.dateToString(new Date(getUtcDate(self.UtcPeriodStart))) : '';
                var to = timeManagementModule.stringIsDate(self.UtcPeriodEnd) ? timeManagementModule.dateToString(new Date(getUtcDate(self.UtcPeriodEnd))) : '';
                //
                var text = self.ExclusionName +
                '\n' + getTextResource('Since') + ': ' + since +
                '\n' + getTextResource('To') + ': ' + to;
                return text;
            });
        },

        CalendarItemDay: function (timeManagementModule, obj) {//BLL.TimeManagement\CalendarItemDay - информация по часу дня периода
            var self = this;
            //
            self.Checked = ko.observable(false);
            //
            self.CalendarDayID = obj.CalendarDayID;
            self.IsWorkTime = ko.observable(obj.IsWorkTime);
            //
            self.Exclusion = ko.observable(null);
            if (obj.Exclusion)
                self.Exclusion(new module.CalendarExclusion(timeManagementModule, obj.Exclusion));
            //
            self.TooltipMessage = ko.computed(function () {
                if (self.Exclusion() == null)
                    return '';
                else
                    return self.Exclusion().TooltipMessage();
            });
            //
            self.Merge = function (calendarItemDay) {
                self.IsWorkTime(calendarItemDay.IsWorkTime());
                self.Exclusion(calendarItemDay.Exclusion());
            };
        },

        CalendarItem: function (timeManagementModule, obj) {//BLL.TimeManagement\CalendarItem - строки таблицы (часы)
            var self = this;
            //
            self.ElementID = 'id_' + obj.Hour.toString();
            //
            self.Hour = obj.Hour;
            self.HourString = timeManagementModule.padString(self.Hour) + ':00';
            //           
            self.DayList = ko.observableArray([]);
            if (obj.Days) {
                for (var i = 0; i < obj.Days.length; i++) {
                    var day = new module.CalendarItemDay(timeManagementModule, obj.Days[i])
                    self.DayList().push(day);
                }
                self.DayList.valueHasMutated();
            }
        },

        CalendarDay: function (timeManagementModule, obj) {//BLL.TimeManagement\CalendarDay - дни календаря (заголовок таблицы)
            var self = this;
            //
            self.ID = obj.ID;
            //
            self.Year = ko.observable(obj.Year);
            self.Month = ko.observable(obj.Month);
            self.Day = ko.observable(obj.Day);
            self.DayOfWeekString = ko.observable(obj.DayOfWeekString);
            //
            self.ManhoursNormInMinutes = ko.observable(obj.ManhoursNormInMinutes);
            //
            self.Date = ko.computed(function () {
                return new Date(self.Year(), self.Month() - 1, self.Day());
            });
            self.DateString = ko.computed(function () {
                return timeManagementModule.dateToString(self.Date());
            });
            //
            self.Merge = function (calendarDay) {
                self.Year(calendarDay.Year());
                self.Month(calendarDay.Month());
                self.Day(calendarDay.Day());
                self.DayOfWeekString(calendarDay.DayOfWeekString());
                //
                self.ManhoursNormInMinutes(calendarDay.ManhoursNormInMinutes());
            };
        },

        Calendar: function (timeManagementModule, obj) {//BLL.TimeManagement\Calendar - календарь рабочего времени пользователя
            var self = this;
            //
            self.UserID = obj.UserID;
            self.UserInfo = ko.observable(null);//для частного календаря (информация о пользователе, чей это календарь)
            //
            self.StartDate = ko.observable(timeManagementModule.parseDate(obj.StartUtcDateString));
            self.FinishDate = ko.observable(timeManagementModule.parseDate(obj.FinishUtcDateString));
            self.DateIntervalString = ko.computed(function () {
                return timeManagementModule.dateToString(self.StartDate()) + ' - ' + timeManagementModule.dateToString(self.FinishDate());
            });
            //
            self.IntervalName = ko.observable(obj.IntervalName);
            //
            self.DayList = ko.observableArray([]);//дни периода
            self.ItemList = ko.observableArray([]);//часы дней
            //
            self.SelectedMinDate = null;//выделенная минимальная дата для календаря
            self.SelectedMaxDate = null;//выделенная максимальная дата для календаря
            //           
            if (obj.Days) {
                for (var i = 0; i < obj.Days.length; i++) {
                    var day = new module.CalendarDay(timeManagementModule, obj.Days[i]);
                    self.DayList().push(day);
                }
                self.DayList.valueHasMutated();
            }
            self.ManhoursNormString = ko.computed(function () {
                var tmp = 0;
                for (var i = 0; i < self.DayList().length; i++)
                    tmp += self.DayList()[i].ManhoursNormInMinutes();
                //
                return timeManagementModule.getDatePaddedString(tmp);
            });
            //
            if (obj.Items) {
                for (var i = 0; i < obj.Items.length; i++) {
                    var day = new module.CalendarItem(timeManagementModule, obj.Items[i]);
                    self.ItemList().push(day);
                }
                self.ItemList.valueHasMutated();
            }
            //
            self.getDateByDayAndHour = function (x, y, nextHour) {
                var item = self.ItemList().length > y ? self.ItemList()[y] : null;
                var day = self.DayList().length > x ? self.DayList()[x] : null;
                //
                if (item != null && day != null) {
                    var tmp = new Date(day.Date().getTime());
                    tmp.setHours(tmp.getHours() + item.Hour + (nextHour == true ? 1 : 0));
                    return tmp;
                }
                return null;
            };
            //
            self.setSelectedDatesByDefault = function () {//просчет пограничных дат (левый верхний угол, нижний правый)
                self.SelectedMinDate = self.getDateByDayAndHour(0, 0);
                self.SelectedMaxDate = self.getDateByDayAndHour(self.DayList().length - 1, self.ItemList().length - 1, true);
            };
            self.setSelectedDatesByDefault();
            //
            self.ajaxControl_user = new ajaxLib.control();
            self.LoadUserInfo = function () {
                $.when(userD).done(function (user) {
                    if (self.UserID == user.UserID) {
                        self.UserInfo(null);//пользователь календаря = текущий пользоватль
                        return;
                    }
                    //
                    var param = {
                        userID: self.UserID,
                    };
                    self.ajaxControl_user.Ajax($('.c-table'),
                        {
                            url: 'userApi/GetUserInfo?' + $.param(param),
                            method: 'GET'
                        },
                       function (userInfo) {
                           if (userInfo) {
                               var obj = new timeManagementModule.UserInfo(timeManagementModule, userInfo);
                               self.UserInfo(obj);
                           }
                           else
                               require(['sweetAlert'], function () {
                                   swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[TimeManagement.Calendar.js, LoadUserInfo]', 'error');
                               });
                       });
                });
            };
            //
            self.Abort = function () {
                self.ajaxControl_user.Abort();
            };
            //
            self.GetCheckedCalendarItemDayList = function () {//получите все выделенные ячейки
                var retval = [];
                //
                for (var i = 0; i < self.ItemList().length; i++) {
                    var calendarItem = self.ItemList()[i];
                    var dayList = calendarItem.DayList();
                    for (var j = 0; j < dayList.length; j++) {
                        var calendarItemDay = dayList[j];
                        if (calendarItemDay.Checked() == true)
                            retval.push(calendarItemDay);
                    }
                }
                //
                return retval;
            };
            //            
            self.SelectRange = function (calendarItemDayStart, calendarItemDayFinish) {//выделить ячейки с такой-то по такую-то (начало/конец, конец/начало)
                var startX = -1;
                var startY = -1;
                var endX = -1;
                var endY = -1;
                //
                var hours = self.ItemList();
                for (var hourIndex = 0; hourIndex < hours.length; hourIndex++) {
                    var calendarItemDayList = hours[hourIndex].DayList();
                    //
                    if (startX == -1) {
                        startX = calendarItemDayList.indexOf(calendarItemDayStart);
                        if (startX != -1)
                            startY = hourIndex;
                    }
                    if (endX == -1) {
                        endX = calendarItemDayList.indexOf(calendarItemDayFinish);
                        if (endX != -1)
                            endY = hourIndex;
                    }
                }
                //
                if (startX == -1 || startY == -1 || endX == -1 || endY == -1) {//снимаем выделение
                    calendarItemDayStart = null;
                    calendarItemDayFinish = null;
                }
                else if (startX > endX ||
                    startX == endX && startY > endY) {
                    var tmp = calendarItemDayFinish;
                    calendarItemDayFinish = calendarItemDayStart;
                    calendarItemDayStart = tmp;
                }
                //
                var select = false;
                self.setSelectedDatesByDefault();
                //
                var days = self.DayList();
                for (var dayIndex = 0; dayIndex < days.length; dayIndex++) {
                    for (var hourIndex = 0; hourIndex < hours.length; hourIndex++) {
                        var calendarItem = hours[hourIndex];
                        var calendarItemDay = calendarItem.DayList()[dayIndex];
                        //
                        if (calendarItemDay == calendarItemDayStart) {
                            select = !select;
                            self.SelectedMinDate = self.getDateByDayAndHour(dayIndex, hourIndex);
                        }
                        //
                        calendarItemDay.Checked(select);
                        //
                        if (calendarItemDay == calendarItemDayFinish) {
                            select = !select;
                            self.SelectedMaxDate = self.getDateByDayAndHour(dayIndex, hourIndex, true);
                        }
                    }
                }
            };
            //
            self.SelectExclusion = function (exclusionID) {//выделение в таблице всех ячеек с таким идентификатором исключения
                for (var i = 0; i < self.ItemList().length; i++) {
                    var calendarItem = self.ItemList()[i];
                    var dayList = calendarItem.DayList();
                    for (var j = 0; j < dayList.length; j++) {
                        var calendarItemDay = dayList[j];
                        if (calendarItemDay.Exclusion() != null && calendarItemDay.Exclusion().ID == exclusionID)
                            calendarItemDay.Checked(true);
                    }
                }
            };
            //
            self.Merge = function (calendar) {
                if (calendar.ItemList().length != self.ItemList().length ||
                    calendar.DayList().length != self.DayList().length)
                    return false;
                //
                self.UserID = calendar.UserID;
                self.UserInfo(null);
                //
                self.IntervalName(calendar.IntervalName());
                self.StartDate(calendar.StartDate());
                self.FinishDate(calendar.FinishDate());
                //
                for (var i = 0; i < self.DayList().length; i++) {
                    var calendarDay = self.DayList()[i];
                    var newCalendarDay = calendar.DayList()[i];
                    calendarDay.Merge(newCalendarDay);
                }
                //
                for (var i = 0; i < self.ItemList().length; i++) {
                    var calendarItem = self.ItemList()[i];
                    var dayList = calendarItem.DayList();
                    for (var j = 0; j < dayList.length; j++) {
                        var calendarItemDay = dayList[j];
                        var newCalendarItemDay = calendar.ItemList()[i].DayList()[j];
                        calendarItemDay.Merge(newCalendarItemDay);
                    }
                }
                //                
                return true;
            };
        }
    }
    return module;
});
