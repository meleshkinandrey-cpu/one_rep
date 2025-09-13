define(['knockout', 'jquery', 'ajax', 'urlManager', 'ttControl'], function (ko, $, ajaxLib, urlManager, tclib) {
    var module = {
        ViewModel: function (timeManagementModule) {//общая модель представления табель
            var self = this;
            //
            self.RequestLength = 5;//количество дат, которое запрашивается за раз
            //
            self.IsObsoleteData = true;//данные устарели, пора обновлять
            self.IsUsersLoaded = false;//факт загруженности информации по пользователям моего подразделения
            //
            self.UserNotFound = ko.observable(false);//не найдены пользователи
            self.ItemInfoList = ko.observableArray([]);//module.ItemInfo[] строка таблицы (пользователи с табелями)
            self.ItemInfoList.subscribe(function (newValue) {
                setTimeout(self.OnResize, 500);
            });
            self.IntervalInfoList = ko.observableArray([]);//module.ItervalInfo[] заголовки таблицы (интервалы)
            self.IntervalInfoExists = ko.computed(function () {
                return self.IntervalInfoList().length > 0;
            });
            self.DateIntervalString = ko.computed(function () {//вычисляемая информация по датам отображаемых табелей
                var count = self.IntervalInfoList().length;
                if (count == 0)
                    return '';
                //
                var startDate = self.IntervalInfoList()[0].StartDate;
                var finishDate = self.IntervalInfoList()[count - 1].FinishDate;
                var retval = timeManagementModule.dateToString(startDate) + ' - ' + timeManagementModule.dateToString(finishDate);
                return retval;
            });
            self.FilterState = ko.observable('');//фильтр по состоянию табеля, пусто = нет фильтра
            self.FilterState.subscribe(function (newValue) {
                var params = {};
                params[timeManagementModule.param_filterStateID] = newValue;
                timeManagementModule.setParameters(params, false);
                //
                self.IsObsoleteData = true;
                self.CheckData();
            });
            //            
            self.ModelAfterRender = function () {
                self.OnResize();
            };
            //
            self.getMinRowIndex = function (onlyData) {//минимальная строка выборки групп дат
                var retval = 100000;
                for (var i = 0; i < self.IntervalInfoList().length; i++) {
                    var intervalInfo = self.IntervalInfoList()[i];
                    retval = Math.min(retval, intervalInfo.Index);
                }
                if (retval == 100000) {
                    if (onlyData != true) {
                        var t = urlManager.getUrlParam(timeManagementModule.param_minRow);
                        if (t != null)
                            retval = parseInt(t) == NaN ? null : parseInt(t);
                        else
                            retval = null;
                    }
                    else
                        retval = null;
                }
                return retval;
            };
            self.getMaxRowIndex = function (onlyData) {//максимальная строка выборки групп дат
                var retval = -100000;
                for (var i = 0; i < self.IntervalInfoList().length; i++) {
                    var intervalInfo = self.IntervalInfoList()[i];
                    retval = Math.max(retval, intervalInfo.Index);
                }
                if (retval == -100000) {
                    if (onlyData != true) {
                        var t = urlManager.getUrlParam(timeManagementModule.param_maxRow);
                        if (t != null)
                            retval = parseInt(t) == NaN ? null : parseInt(t);
                        else
                            retval = null;
                    }
                    else
                        retval = null;
                }
                return retval;
            };
            //
            self.ClearData = function () {//очистка данных
                self.IntervalInfoList.removeAll();
                //
                for (var i = 0; i < self.ItemInfoList().length; i++)
                    self.ItemInfoList()[i].IntervalList.removeAll();
                self.ItemInfoList.valueHasMutated();
            };
            //
            self.ajaxControl_load = new ajaxLib.control();
            self.Load = function (minRowIndex, maxRowIndex) {//загрузка сводных данных по табелям
                var url = '';
                var mainD = $.Deferred();//ожидание загрузки списка пользователей моего подразделения
                var firstLoad = (self.IsUsersLoaded == false);
                self.IsObsoleteData = false;
                //
                showSpinner($('.tmModule')[0]);
                if (self.IsUsersLoaded == false) {
                    self.ItemInfoList.removeAll();
                    self.UserNotFound(false);
                    //
                    self.ajaxControl_load.Ajax(null,
                        {
                            dataType: "json",
                            method: 'GET',
                            url: 'userApi/GetUserInfoListInMySubdivision'
                        },
                        function (userInfoList) {
                            $.when(userD).done(function (user) {
                                if (userInfoList) {
                                    for (var i = 0; i < userInfoList.length; i++) {
                                        var userInfo = new timeManagementModule.UserInfo(timeManagementModule, userInfoList[i]);
                                        if (userInfo.ID != user.UserID)//not currentUser!
                                            self.ItemInfoList().push(new module.ItemInfo(userInfo));
                                    }
                                    self.ItemInfoList.valueHasMutated();
                                    self.IsUsersLoaded = true;
                                    self.UserNotFound(self.ItemInfoList().length == 0);
                                    //
                                    mainD.resolve();
                                }
                                else {
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('TM_TimeSheetNotExistsByPeriod'));
                                    });
                                    mainD.resolve();
                                }
                            });
                        });
                }
                else
                    mainD.resolve();
                //
                $.when(mainD).done(function (vm) {//получение информации по табелям сотрудников
                    var param = {
                        minRowIndex: minRowIndex != undefined ? minRowIndex : 1,
                        maxRowIndex: maxRowIndex != undefined ? maxRowIndex : self.RequestLength,
                        stateID: self.FilterState()
                    };
                    self.ajaxControl_load.Ajax(null,
                        {
                            dataType: "json",
                            method: 'GET',
                            url: 'sdApi/GetTimeSheetInfoList?' + $.param(param)
                        },
                        function (outModel) {
                            if (outModel && outModel.Result === 0) {
                                var list = outModel.List;
                                if (list) {
                                    self.ClearData();
                                    //
                                    var params = {};
                                    params[timeManagementModule.param_filterStateID] = param.stateID;
                                    params[timeManagementModule.param_minRow] = param.minRowIndex;
                                    params[timeManagementModule.param_maxRow] = param.maxRowIndex;
                                    timeManagementModule.setParameters(params, false);
                                    //
                                    if (list.length == 0 && firstLoad)
                                        require(['sweetAlert'], function () {
                                            swal(getTextResource('TM_TimeSheetNotExistsByPeriod'));
                                        });
                                    //
                                    var dicIntervalInfo = {};//перечень разных интервалов IntervalInfo
                                    var dicUsers = {};//перечень табелей пользователей
                                    for (var i = 0; i < list.length; i++) {
                                        var obj = new module.TimeSheetInfo(timeManagementModule, list[i]);
                                        //
                                        if (dicIntervalInfo[obj.DateIntervalString] == undefined) {//нет такого интервала
                                            var intervalInfo = new module.IntervalInfo(timeManagementModule, self, obj.StartDate, obj.FinishDate, obj.RowIndex);
                                            dicIntervalInfo[obj.DateIntervalString] = intervalInfo;
                                            //
                                            self.IntervalInfoList().push(intervalInfo);
                                        }
                                        //
                                        if (dicUsers[obj.UserID] == undefined) {//нет информации по пользователю
                                            var timeSheetInfoList = [];
                                            timeSheetInfoList.push(obj);
                                            dicUsers[obj.UserID] = timeSheetInfoList;
                                        }
                                        else {
                                            var timeSheetInfoList = dicUsers[obj.UserID];
                                            timeSheetInfoList.push(obj);
                                        }
                                    }
                                    self.IntervalInfoList.valueHasMutated();
                                    var countOfIntervals = self.IntervalInfoList().length;
                                    //
                                    for (var i = 0; i < self.ItemInfoList().length; i++) {
                                        var itemInfo = self.ItemInfoList()[i];
                                        //
                                        var intervalList = itemInfo.IntervalList();
                                        for (var j = 0; j < countOfIntervals; j++)//заполним пустотами
                                            intervalList.push(null);
                                        //
                                        var userID = itemInfo.UserInfo().ID;
                                        if (dicUsers[userID]) {//есть такой пользователь
                                            var timeSheetInfoList = dicUsers[userID];
                                            for (var j = 0; j < timeSheetInfoList.length; j++) {//по всем доступным на этом периоде табелям пользователя
                                                var timeSheetInfo = timeSheetInfoList[j];
                                                //
                                                var index = -1;//индекс столбца, в который нужно отнести табель
                                                for (var k = 0; k < self.IntervalInfoList().length; k++) {
                                                    var intervalInfo = self.IntervalInfoList()[k];
                                                    if (intervalInfo.DateIntervalString == timeSheetInfo.DateIntervalString) {
                                                        index = k;
                                                        break;
                                                    }
                                                }
                                                //
                                                if (index >= 0 && intervalList.length > index)
                                                    intervalList[index] = timeSheetInfo;
                                                else
                                                    throw 'internval info not found';
                                            }
                                        }
                                        itemInfo.IntervalList.valueHasMutated();
                                    }
                                    self.ItemInfoList.valueHasMutated();
                                }
                                else
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('AjaxError') + '\n[TimeManagement.TimeSheetTotal.js, LoadD]', 'error');
                                    });
                            }
                            else if (outModel && outModel.Result === 1)//NullParamsError
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[TimeManagement.TimeSheetTotal.js, LoadD]', 'error');
                                });
                            else if (outModel && outModel.Result === 3)//AccessError
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('AccessError'), 'error');
                                });
                            else if (outModel && outModel.Result === 4)//GlobalError
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[TimeManagement.TimeSheetTotal.js, LoadD]', 'error');
                                });
                            else
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[TimeManagement.TimeSheetTotal.js, LoadD]', 'error');
                                });
                        },
                        function () { },//err
                        function () {
                            hideSpinner($('.tmModule')[0]);
                        });
                });
            };
            //
            self.NextClick = function () {//следующий отчетный период
                self.Abort();
                var minRowIndex = self.getMinRowIndex();
                if (minRowIndex == null)
                    return;
                //
                self.Load(minRowIndex - self.RequestLength, minRowIndex - 1);
            };
            self.PreviousClick = function () {//предыдущий отчетный период
                self.Abort();
                var maxRowIndex = self.getMaxRowIndex();
                if (maxRowIndex == null)
                    return;
                //
                self.Load(maxRowIndex + 1, maxRowIndex + self.RequestLength);
            };
            //
            self.Abort = function () {//прерываение предыдущих загрузок
                self.ajaxControl_load.Abort();
            };
            //
            self.ShowUserTimeSheet = function (vm, e) {//vm is TimeSheetInfo, открытие табеля пользователя
                if (vm == null || $(e.target).is('input'))
                    return true;
                //
                var params = {};
                params[timeManagementModule.param_mode] = timeManagementModule.modes.timeSheet;
                params[timeManagementModule.param_timeSheetID] = vm.ID;
                params[timeManagementModule.param_userID] = vm.UserID;
                timeManagementModule.setParameters(params);//raise tm_urlChanged event (mode parameter)
                //
                return true;
            };
            self.ShowUserCalendar = function (vm, e) {//vm is ItemInfo, открытие календаря пользователя
                if (vm == null)
                    return true;
                var userInfo = vm.UserInfo();
                if (userInfo == null)
                    return true;
                //
                var startDate = null;
                for (var i = 0; i < vm.IntervalList().length; i++) {
                    var intervalInfo = vm.IntervalList()[i];
                    if (intervalInfo != null) {
                        startDate = intervalInfo.StartDate;
                        break;
                    }
                }
                //
                var params = {};
                params[timeManagementModule.param_mode] = timeManagementModule.modes.calendar;
                params[timeManagementModule.param_year] = startDate == null ? undefined : startDate.getFullYear();
                params[timeManagementModule.param_dayOfYear] = startDate == null ? undefined : timeManagementModule.getDayOfYear(startDate);
                params[timeManagementModule.param_userID] = userInfo.ID;
                timeManagementModule.setParameters(params);//raise tm_urlChanged event (mode parameter)
                //
                return true;
            };
            //
            self.CheckData = function () {//вызывается извне, сообщает, что пора обновлять/загружать данные
                var filterStateID = urlManager.getUrlParam(timeManagementModule.param_filterStateID);
                if (filterStateID != null && self.FilterState() != filterStateID) {
                    self.FilterState(filterStateID);//auto reload
                    return;
                }
                //
                var current_minRowIndex = self.getMinRowIndex(true);//by loaded data
                var current_maxRowIndex = self.getMaxRowIndex(true);//by loaded data
                //
                var minRowIndex = urlManager.getUrlParam(timeManagementModule.param_minRow);//by url
                var maxRowIndex = urlManager.getUrlParam(timeManagementModule.param_maxRow);//by url
                //
                if (self.IsObsoleteData ||
                    current_minRowIndex == null ||
                    current_maxRowIndex == null ||
                    current_minRowIndex != null && minRowIndex != null && current_minRowIndex != minRowIndex ||
                    current_maxRowIndex != null && maxRowIndex != null && current_maxRowIndex != maxRowIndex) {
                    minRowIndex = minRowIndex == null ? self.getMinRowIndex() : minRowIndex;
                    maxRowIndex = maxRowIndex == null ? self.getMaxRowIndex() : maxRowIndex;
                    //
                    if (minRowIndex != null && maxRowIndex != null)
                        self.Load(minRowIndex, maxRowIndex);
                    else
                        self.Load();
                }
            };
            //
            //реакции на события
            self.OnObjectInserted = function (e, objectClassID, objectID, parentObjectID) {
                //
            };
            self.OnObjectModified = function (e, objectClassID, objectID, parentObjectID) {
                if (self.IsObjectPresent(objectID))
                    self.IsObsoleteData = true;
            };
            self.OnObjectDeleted = function (e, objectClassID, objectID, parentObjectID) {
                if (self.IsObjectPresent(objectID))
                    self.IsObsoleteData = true;
            };
            //
            self.OnLocalMessageReaded = function (e, messageID, timesheetID, ownerTimesheetID, authorID) {
                var ts = self.FindByID(timesheetID);
                if (ts != null && ts.NewMessagesCount) {
                    var old = ts.NewMessagesCount();
                    if (old > 0)
                        ts.NewMessagesCount(old - 1);
                }
            };
            self.OnMessageAdded = function (e, messageID, timesheetID, ownerTimesheetID, authorID) {
                $.when(userD).done(function (user) {
                    var ts = self.FindByID(timesheetID);
                    if (ts != null && ts.NewMessagesCount && user.UserID != authorID) {
                        var old = ts.NewMessagesCount();
                        ts.NewMessagesCount(old + 1);
                    }
                });
            };
            //
            self.IsObjectPresent = function (timeSheetID) {//отображается ли табель с таким идентификатором
                for (var i = 0; i < self.ItemInfoList().length; i++) {
                    var itemInfo = self.ItemInfoList()[i];
                    var intervalList = itemInfo.IntervalList();
                    for (var j = 0; j < intervalList.length; j++) {
                        var timeSheetInfo = intervalList[j];
                        if (timeSheetInfo != null && timeSheetInfo.ID == timeSheetID)
                            return true;
                    }
                }
                //
                return false;
            };
            self.FindByID = function (timeSheetID) {//вернуть табель с таким идентификатором
                for (var i = 0; i < self.ItemInfoList().length; i++) {
                    var itemInfo = self.ItemInfoList()[i];
                    var intervalList = itemInfo.IntervalList();
                    for (var j = 0; j < intervalList.length; j++) {
                        var timeSheetInfo = intervalList[j];
                        if (timeSheetInfo != null && timeSheetInfo.ID == timeSheetID)
                            return timeSheetInfo;
                    }
                }
                //
                return null;
            };
            //
            self.TotalUnreadedMessages = ko.computed(function () {
                var retval = 0;
                //
                for (var i = 0; i < self.ItemInfoList().length; i++) {
                    var itemInfo = self.ItemInfoList()[i];
                    var intervalList = itemInfo.IntervalList();
                    for (var j = 0; j < intervalList.length; j++) {
                        var timeSheetInfo = intervalList[j];
                        if (timeSheetInfo != null && timeSheetInfo.NewMessagesCount && timeSheetInfo.NewMessagesCount() > 0)
                            retval += timeSheetInfo.NewMessagesCount();
                    }
                }
                //
                return retval;
            });
            //
            self.resizeTimeout = null;
            self.OnResize = function () {
                clearTimeout(self.resizeTimeout);
                self.resizeTimeout = null;
                //
                var target = $(".table-scroll");
                var tableSize = target.find('.tst-table').height();
                if (target.length > 0 && tableSize > 0) {
                    var new_height = getPageContentHeight() - $(".ts-general").outerHeight(true) - $(".ui-dialog-buttonset").outerHeight(true) - 20 - 10;
                    new_height = Math.max(new_height, 100);
                    //
                    target.css("height", new_height > tableSize ? '' : new_height + "px");
                }
                else
                    self.resizeTimeout = setTimeout(self.OnResize, 50);
            };
            //
            self.SelectedItems = ko.computed(function () {//timeSheetInfo
                var retval = [];
                //
                var itemList = self.ItemInfoList();
                for (var i = 0; i < itemList.length; i++) {
                    var item = itemList[i];
                    var intervalList = item.IntervalList();
                    //
                    for (var j = 0; j < intervalList.length; j++) {
                        var timeSheetInfo = intervalList[j];
                        if (timeSheetInfo != null && timeSheetInfo.Checked())
                            retval.push(timeSheetInfo);
                    }
                }
                //
                return retval;
            });
            self.GetSelectedItemsWithEqualState = ko.computed(function () {//все выделенные элементы имеют одно и то же состояние
                var selectedItems = self.SelectedItems();
                var state = null;
                for (var i = 0; i < selectedItems.length; i++) {
                    var timeSheeInfo = selectedItems[i];
                    if (state == null)
                        state = timeSheeInfo.State;
                    else if (state != timeSheeInfo.State)
                        return null;
                }
                return state;
            });
            self.cmd_ApproveTimeSheet = function () {
                var selectedItems = self.SelectedItems();
                var timeSheetIDArray = [];
                for (var i = 0; i < selectedItems.length; i++)
                    timeSheetIDArray.push(selectedItems[i].ID);
                //
                require(['usualForms'], function (fhModule) {
                    var fh = new fhModule.formHelper();
                    var d = fh.ShowTimeSheetSetStateForm(timeSheetIDArray, 3);//approved
                    $.when(d).done(function (result) {
                        if (result == true) {

                        }
                    });
                });
            };
            self.cmd_RejectTimeSheet = function () {
                var selectedItems = self.SelectedItems();
                var timeSheetIDArray = [];
                for (var i = 0; i < selectedItems.length; i++)
                    timeSheetIDArray.push(selectedItems[i].ID);
                //
                require(['usualForms'], function (fhModule) {
                    var fh = new fhModule.formHelper();
                    var d = fh.ShowTimeSheetSetStateForm(timeSheetIDArray, 2);//rejected
                    $.when(d).done(function (result) {
                        if (result == true) {

                        }
                    });
                });
            };
        },

        IntervalInfo: function (timeManagementModule, parentSelf, startDate, finishDate, rowIndex) {
            var self = this;
            //
            self.Index = rowIndex;
            self.StartDate = startDate;
            self.FinishDate = finishDate;
            self.DateIntervalString = timeManagementModule.dateToString(self.StartDate) + ' - ' + timeManagementModule.dateToString(self.FinishDate);
            self.DateIntervalString1 = timeManagementModule.dateToString(self.StartDate) + ' - ';
            self.DateIntervalString2 = timeManagementModule.dateToString(self.FinishDate);
            //
            self.CheckAllRows = function (vm, e) {
                var newVal = e.target.checked;
                var index = parentSelf.IntervalInfoList.indexOf(self);
                //
                for (var i = 0; i < parentSelf.ItemInfoList().length; i++) {
                    var item = parentSelf.ItemInfoList()[i];
                    //
                    if (item.IntervalList().length > index) {
                        var timeSheetInfo = item.IntervalList()[index];
                        if (timeSheetInfo != null)
                            timeSheetInfo.Checked(newVal);
                    }
                }
                return true;
            };
        },

        TimeSheetInfo: function (timeManagementModule, obj) {//BLL.TimeManagement.TimeSheetInfo - информация по табелю
            var self = this;
            //
            self.Checked = ko.observable(false);
            //
            self.RowIndex = obj.RowIndex;
            self.ID = obj.ID;
            self.UserID = obj.UserID;
            self.State = obj.State;
            //
            self.ManhoursNormInMinutes = obj.ManhoursNormInMinutes;
            self.ManhoursNormString = timeManagementModule.getDatePaddedString(self.ManhoursNormInMinutes);
            //
            self.ManhoursInMinutes = obj.ManhoursInMinutes;
            self.TotalManhoursString = timeManagementModule.getDatePaddedString(self.ManhoursInMinutes);
            //
            self.StartDate = timeManagementModule.parseDate(obj.StartUtcDateString);
            self.FinishDate = timeManagementModule.parseDate(obj.FinishUtcDateString);
            self.DateIntervalString = timeManagementModule.dateToString(self.StartDate) + ' - ' + timeManagementModule.dateToString(self.FinishDate);
            //
            self.TooltipWithComment = ko.observable('');
            //
            self.ajaxControl_notes = new ajaxLib.control();
            self.TooltipLoader = function () {
                var retD = $.Deferred();
                //
                var param = {
                    timeSheetID: self.ID
                };
                self.ajaxControl_notes.Ajax(null,
                {
                    url: 'sdApi/GetTimeSheetLastNoteList?' + $.param(param),
                    method: 'GET'
                },
                   function (outModel) {
                       if (outModel && outModel.Result === 0) {
                           retD.resolve(outModel.NotesString);
                       }
                       else if (outModel && outModel.Result === 1)//NullParamsError
                           require(['sweetAlert'], function () {
                               swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[TimeManagement.TimeSheetTotal.js, LoadNotes]', 'error');
                               retD.resolve('');
                           });
                       else if (outModel && outModel.Result === 3)//AccessError
                           require(['sweetAlert'], function () {
                               swal(getTextResource('ErrorCaption'), getTextResource('AccessError'), 'error');
                               retD.resolve('');
                           });
                       else
                           require(['sweetAlert'], function () {
                               swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[TimeManagement.TimeSheetTotal.js, LoadNotes]', 'error');
                               retD.resolve('');
                           });
                   });
                //
                return retD.promise();
            };
            //
            self.NewMessagesCount = ko.observable(obj.UnreadNotesCount ? obj.UnreadNotesCount : 0);
            self.NewMessagesCountString = ko.computed(function () {
                var val = timeManagementModule.formatNumberForCircle(self.NewMessagesCount());
                return val;
            });
        },

        ItemInfo: function (userInfo) {
            var self = this;
            //
            self.IntervalList = ko.observableArray([]);
            self.UserInfo = ko.observable(userInfo);
        }
    }
    return module;
});
