define(['knockout', 'jquery', 'ajax', 'urlManager', 'usualForms', 'comboBox'], function (ko, $, ajaxLib, urlManager, fhModule) {
    var module = {
        ViewModel: function (timeManagementModule, checkDataInSelectedView) {//общая модель представления табель
            var self = this;
            //
            self.IsObsoleteData = true;//данные устарели, пора обновлять
            //
            self.TableMinWidth = ko.observable();//минимальная ширина таблицы, чтобы поле описание не пряталось
            self.Model = ko.observable(null);//module.TimeSheet
            self.CanChangeTable = ko.observable(true);
            self.CurrentUserID = null;
            self.Model.subscribe(function (newValue) {
                var minWidth = 30 + 100 + 400 + ((newValue ? newValue.DayList().length : 0) + 1) * 120;//th-checkBox + th-link + th-description + n * th-date
                self.TableMinWidth(minWidth);
                //
                if(newValue.State == 1)
                    self.CanChangeTable(false);
                else
                    self.CanChangeTable(true);

                var handler = null;
                handler = newValue.UserInfo.subscribe(function () {
                    handler.dispose();
                    setTimeout(self.OnResize, 500);
                });
                //
                var params = {};
                params[timeManagementModule.param_timeSheetID] = newValue.ID;
                timeManagementModule.setParameters(params, false);
                //
                if (newValue)
                    newValue.SheetMode.subscribe(function (sheetModeValue) {
                        if (sheetModeValue == false)
                            self.InitHTMLControl();
                    });
            });
            //
            $.when(userD).done(function (user) {
                self.CurrentUserID = user.UserID;
            });
            //
            self.ModelAfterRender = function () {
                self.OnResize();
            };
            //
            self.TimezoneOffsetInMinutes = new Date().getTimezoneOffset(); //для учета всех расчетов на стороне серера            
            //
            self.ajaxControl_load = new ajaxLib.control();
            self.Load = function (timeSheetID, forward) {//загрузка/создание данных по отчетному периоду
                var url = '';
                var mainD = $.Deferred();//ожидание загрузки информации по дням
                self.IsObsoleteData = false;
                //
                if (timeSheetID) {
                    var param = {
                        timeSheetID: timeSheetID,
                        timezoneOffsetInMinutes: self.TimezoneOffsetInMinutes
                    };
                    if (forward == undefined)
                        url = 'sdApi/GetTimeSheet?' + $.param(param);
                    else
                        url = (forward == true ? 'sdApi/GetNextTimeSheet?' : 'sdApi/GetPreviousTimeSheet?') + $.param(param);
                }
                else {
                    var now = new Date();
                    var param = {
                        year: now.getFullYear(),
                        dayOfYear: timeManagementModule.getDayOfYear(now),
                        timezoneOffsetInMinutes: self.TimezoneOffsetInMinutes
                    };
                    url = 'sdApi/GetActiveTimeSheet?' + $.param(param);
                }
                self.ajaxControl_load.Ajax($('.tmModule'),
                    {
                        dataType: "json",
                        method: 'GET',
                        url: url
                    },
                    function (outModel) {
                        if (outModel && outModel.Result === 0) {
                            var timeSheet = outModel.Value;
                            if (timeSheet) {
                                var vm = new module.TimeSheet(timeManagementModule, timeSheet);
                                self.Model(vm);
                                //
                                mainD.resolve(vm);
                            }
                            else {
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('TM_TimeSheetNotExistsByPeriod'));
                                });
                            }
                        }
                        else if (outModel && outModel.Result === 1)//NullParamsError
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[TimeManagement.TimeSheet.js, Load]', 'error');
                            });
                        else if (outModel && outModel.Result === 3)//AccessError
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('AccessError'), 'error');
                            });
                        else if (outModel && outModel.Result === 4)//GlobalError
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[TimeManagement.TimeSheet.js, Load]', 'error');
                            });
                        else if (outModel && outModel.Result === 9)//FiltrationError
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('TM_CannotCreateTimeSheet'), 'error');
                            });
                        else
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[TimeManagement.TimeSheet.js, Load]', 'error');
                            });
                    });
                //
                $.when(mainD).done(function (vm) {//получение данных таблицы
                    vm.ItemList.removeAll();
                    //
                    vm.LoadStateList();
                    vm.LoadUserInfo();
                    vm.LoadNotes();
                    //
                    vm.InitSearcher();
                    //
                    var param = {
                        timeSheetID: vm.ID,
                        timezoneOffsetInMinutes: self.TimezoneOffsetInMinutes
                    };
                    self.ajaxControl_load.Ajax($('.ts-table').parent(),
                        {
                            dataType: "json",
                            method: 'GET',
                            url: 'sdApi/GetTimeSheetItemList?' + $.param(param)
                        },
                        function (outModel) {
                            if (outModel && outModel.Result === 0) {
                                var itemList = outModel.List;
                                if (itemList) {
                                    for (var i = 0; i < itemList.length; i++) {
                                        var obj = new module.TimeSheetItem(timeManagementModule, vm, itemList[i]);
                                        vm.ItemList().push(obj);
                                    }
                                    vm.ItemList.valueHasMutated();
                                }
                                else
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('AjaxError') + '\n[TimeManagement.TimeSheet.js, LoadD]', 'error');
                                    });
                            }
                            else if (outModel && outModel.Result === 1)//NullParamsError
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[TimeManagement.TimeSheet.js, LoadD]', 'error');
                                });
                            else if (outModel && outModel.Result === 3)//AccessError
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('AccessError'), 'error');
                                });
                            else if (outModel && outModel.Result === 4)//GlobalError
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[TimeManagement.TimeSheet.js, LoadD]', 'error');
                                });
                            else
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[TimeManagement.TimeSheet.js, LoadD]', 'error');
                                });
                        });
                });
            };
            //
            self.NextTimeSheetClick = function () {//следующий отчетный период
                var vm = self.Model();
                if (vm) {
                    self.Abort();
                    self.Load(vm.ID, true);
                }
            };
            self.PreviousTimeSheetClick = function () {//предыдущий отчетный период
                var vm = self.Model();
                if (vm) {
                    self.Abort();
                    self.Load(vm.ID, false);
                }
            };
            //
            self.Filter_ShowTemplates = ko.observable(true);
            self.Filter_ShowWorksWithManhours = ko.observable(true);
            self.Filter_ShowWorksWithoutManhours = ko.observable(true);
            self.Filter_ShowCalls = ko.observable(true);
            self.Filter_ShowWorkOrders = ko.observable(true);
            self.Filter_ShowProblems = ko.observable(true);
            self.Filter_ShowProjects = ko.observable(true);
            self.Filter_ShowAllMy = ko.observable(false);
            {
                self.ajaxControl_filter = new ajaxLib.control();
                self.ajaxControl_filter.Ajax($('.ts-third'),
                {
                    dataType: "json",
                    method: 'GET',
                    url: 'accountApi/GetUserSettings'
                },
                function (setting) {
                    if (setting != null) {
                        var val = setting.TimeSheetFilter
                        self.Filter_ShowTemplates((val & 1) == 1);
                        self.Filter_ShowTemplates.subscribe(self.SaveFilter);
                        //
                        self.Filter_ShowWorksWithManhours((val & 2) == 2);
                        self.Filter_ShowWorksWithManhours.subscribe(self.SaveFilter);
                        //
                        self.Filter_ShowWorksWithoutManhours((val & 4) == 4);
                        self.Filter_ShowWorksWithoutManhours.subscribe(self.SaveFilter);
                        //
                        self.Filter_ShowCalls((val & 8) == 8);
                        self.Filter_ShowCalls.subscribe(self.SaveFilter);
                        //
                        self.Filter_ShowWorkOrders((val & 16) == 16);
                        self.Filter_ShowWorkOrders.subscribe(self.SaveFilter);
                        //
                        self.Filter_ShowProblems((val & 32) == 32);
                        self.Filter_ShowProblems.subscribe(self.SaveFilter);
                        //
                        self.Filter_ShowProjects((val & 64) == 64);
                        self.Filter_ShowProjects.subscribe(self.SaveFilter);
                        //
                        self.Filter_ShowAllMy((val & 128) == 128);
                        self.Filter_ShowAllMy.subscribe(self.SaveFilter);
                    }
                });
                //
                self.SaveFilter = function () {
                    var value = 0;
                    if (self.Filter_ShowTemplates() == true)
                        value += 1;
                    if (self.Filter_ShowWorksWithManhours() == true)
                        value += 2;
                    if (self.Filter_ShowWorksWithoutManhours() == true)
                        value += 4;
                    if (self.Filter_ShowCalls() == true)
                        value += 8;
                    if (self.Filter_ShowWorkOrders() == true)
                        value += 16;
                    if (self.Filter_ShowProblems() == true)
                        value += 32;
                    if (self.Filter_ShowProjects() == true)
                        value += 64;
                    if (self.Filter_ShowAllMy() == true)
                        value += 128;
                    //
                    self.ajaxControl_filter.Ajax($('.ts-third'),
                        {
                            url: 'accountApi/SetTimeSheetFilter',
                            method: 'POST',
                            data: { '': value }
                        },
                        function (response) {
                            if (response == false) {
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('SaveError'), getTextResource('AjaxError') + '\n[TimeSheet.js, SaveFilter]', 'error');
                                });
                            }
                        });
                };
            }
            //
            self.IsDatesCrossing = function (checkedStartDate, checkedFinishDate) {
                if (!self.Model())
                    return false;
                //
                var tsStartDate = self.Model().StartDate;
                var tsFinishDate = self.Model().FinishDate;
                //
                if (checkedStartDate > tsFinishDate && checkedFinishDate > tsFinishDate)//обе после
                    return false;
                //
                if (checkedStartDate < tsStartDate && checkedFinishDate < tsStartDate)//обе до
                    return false;
                //
                return true;//иначе есть пересечения
            };
            //
            self.IsTimeSheetItemEval = function (timeSheetItem, searchText, searchMode) {
                if (timeSheetItem == null)
                    return false;//не определено
                if (timeSheetItem.IsTemplate == true && self.Filter_ShowTemplates() == false)
                    return false;//шаблон, а шаблоны не показываем
                if (timeSheetItem.IsTemplate == false && timeSheetItem.TotalManhoursByDaysInMinutes() == 0 && self.Filter_ShowWorksWithoutManhours() == false)
                    return false;//нет за период трудозатрат, а без трудозатрат не показываем
                if (timeSheetItem.IsTemplate == false && timeSheetItem.TotalManhoursByDaysInMinutes() > 0 && self.Filter_ShowWorksWithManhours() == false)
                    return false;//есть за период трудозатраты, а с трудозатратами не показываем
                //
                var classID = timeSheetItem.ObjectClassID;
                //
                if (classID == 701 && self.Filter_ShowCalls() == false)
                    return false;
                if (classID == 119 && self.Filter_ShowWorkOrders() == false)
                    return false;
                if (classID == 702 && self.Filter_ShowProblems() == false)
                    return false;
                if (classID == 371 && self.Filter_ShowProjects() == false)
                    return false;
                //
                //Все мои
                if (classID == 119 && timeSheetItem.LinkObjectExecutorID != self.CurrentUserID && self.Filter_ShowAllMy() == true && self.Filter_ShowWorkOrders() == true )
                    return false;//Задания, где текущий пользователь - Исполнитель
                if (classID == 702 && timeSheetItem.LinkObjectOwnerID != self.CurrentUserID && self.Filter_ShowAllMy() == true && self.Filter_ShowProblems() == true)
                    return false;//Проблемы, где текущий пользователь - Владелец
                if (classID == 701 && ((timeSheetItem.LinkObjectOwnerID == null && timeSheetItem.LinkObjectExecutorID != self.CurrentUserID) ||
                    (timeSheetItem.LinkObjectOwnerID != self.CurrentUserID && timeSheetItem.LinkObjectExecutorID == null))
                    && self.Filter_ShowAllMy() == true && self.Filter_ShowCalls() == true)
                    return false;//Заявки, где текущий пользователь - Владелец/Исполнитель
                if (classID == 371 && self.Filter_ShowProjects() == true && self.Filter_ShowAllMy() == true)
                    return false;//Проекты
                //
                if (classID == 18 && timeSheetItem.LinkObjectClassID == 371 && self.Filter_ShowAllMy() == true && self.Filter_ShowWorksWithManhours() == true)
                    return false;//Работы, связанные с проектом
                if (classID == 18 && timeSheetItem.LinkObjectClassID == 703 && self.Filter_ShowAllMy() == true && self.Filter_ShowWorksWithManhours() == true)
                    return false;//Работы, связанные с RFC
                //
                if (classID == 18 && timeSheetItem.LinkObjectClassID == 702 && timeSheetItem.LinkObjectOwnerID != self.CurrentUserID && self.Filter_ShowAllMy() == true
                    && (self.Filter_ShowWorksWithManhours() == true || self.Filter_ShowWorksWithoutManhours() == true))
                    return false;//Работы, связанные с проблемами
                if (classID == 18 && timeSheetItem.LinkObjectClassID == 701 && ((timeSheetItem.LinkObjectOwnerID == null && timeSheetItem.LinkObjectExecutorID != self.CurrentUserID) ||
                    (timeSheetItem.LinkObjectOwnerID != self.CurrentUserID && timeSheetItem.LinkObjectExecutorID == null)) && self.Filter_ShowAllMy() == true
                    && (self.Filter_ShowWorksWithManhours() == true || self.Filter_ShowWorksWithoutManhours() == true))
                    return false;//Работы, связанные с заявками
                if (classID == 18 && timeSheetItem.LinkObjectClassID == 119 && timeSheetItem.LinkObjectExecutorID != self.CurrentUserID && self.Filter_ShowAllMy() == true
                    && (self.Filter_ShowWorksWithManhours() == true || self.Filter_ShowWorksWithoutManhours() == true))
                    return false;//Работы,связанные с заданиями

                //
                if (searchText !== null && searchMode !== null) {
                    var timeSheet = self.Model();
                    var SearchMode = timeSheet.SearchModeEnum;
                    if (searchMode == SearchMode.number) {
                        if (classID == 701 || classID == 119 || classID == 702 || classID == 371) {
                            if (timeSheetItem.ObjectNumber != searchText)
                                return false;
                        }
                        else if (classID == 18) {
                            if (timeSheetItem.LinkObjectNumber != searchText)
                                return false;
                        }
                    }
                    else if (searchMode == SearchMode.context) {
                        if (timeSheetItem.ObjectSummary) {
                            if (timeSheetItem.ObjectSummary.toLowerCase().indexOf(searchText.toLowerCase()) == -1)
                                return false;
                        }
                        else
                            return false;
                    }
                    else if (searchMode == SearchMode.user) {
                        if (timeSheetItem.ObjectInitiatorID != searchText)
                            return false;
                    }
                }
                //
                return true;
            };
            self.VisibleItemList = ko.computed(function () {//отображдаемый список строк в табеле
                var timeSheet = self.Model();
                if (timeSheet == null)
                    return [];
                //
                var retval = [];
                var list = timeSheet.ItemList();
                var searchText = timeSheet.GetSearchText();
                var searchMode = timeSheet.GetSearchMode();
                for (var i = 0; i < list.length; i++) {
                    var timeSheetItem = list[i];
                    if (self.IsTimeSheetItemEval(timeSheetItem, searchText, searchMode) == true)
                        retval.push(timeSheetItem);
                }
                //force scroll size update
                setTimeout(self.OnResize, 50);
                setTimeout(self.OnResize, 200);
                //
                return retval;
            });
            //
            self.EditableCalendarItemDay = ko.observable(null);//ячейка, которую редактируем в календаре
            {
                self.EditableCellText = ko.observable('');//текст в редактируемой ячейке
                self.CellMouseClick = function (vm, e) {//начало редактирования в ячейке timeSheetDayItem
                    if (self.CanEdit() == false)
                        return;
                    $.when(timeManagementModule.ManhoursInClosedD, operationIsGrantedD(318)).done(function (allowInClosed, work_update) {
                        if (self.EditableCalendarItemDay() == null) {
                            if (allowInClosed == false && vm.TimeSheetItem.IsTemplate == false && vm.TimeSheetItem.LinkObjectWorkflowSchemeID == null && vm.TimeSheetItem.LinkObjectClassID != null && vm.TimeSheetItem.LinkObjectClassID != 371/*Obj_Project*/) {
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('TM_CannotEditClosedObjects'));
                                });
                                return;
                            }
                            //
                            if (work_update != true)
                                return;
                            if (vm.TimeSheetItem.IsTemplate) {
                                self.ShowObjectForm(vm.TimeSheetItem);
                                return;
                            }
                            if (vm.ManhourID == null && vm.ManhoursInMinutes() > 0) {
                                self.ShowWorkForm(vm.TimeSheetItem);
                                return;
                            }
                            //
                            self.EditableCellText(vm.ManhoursInMinutesString());//запишем старое значение
                            self.EditableCalendarItemDay(vm);//делаем ячейку редактируемой
                            //
                            //устанавливаем фокус в поле
                            var setFocusAction = null;
                            setFocusAction = function () {
                                var tb = $(e.target).find('input');
                                if (tb.length > 0)
                                    tb.select();
                                else
                                    setTimeout(setFocusAction, 50);
                            };
                            setFocusAction();
                        } else if (self.EditableCalendarItemDay() != vm)
                            self.StopCellEdit();
                    });
                    //
                    return true;
                };
                self.StopCellEdit = function () {
                    var text = self.EditableCellText();
                    var timeSheetItemDay = self.EditableCalendarItemDay();
                    if (timeSheetItemDay == null)
                        return;
                    //
                    if (text === "")
                        text = "00:00";
                    //
                    if (text.length > 0 && text != timeSheetItemDay.ManhoursInMinutesString()) {//что-то ввели иное
                        var separatorIndex = text.indexOf(':');
                        if (separatorIndex == -1) {//число = минуты
                            var val = parseInt(text);
                            if (!isNaN(val) && isFinite(val) && val >= 0 && val <= 1440)//24*60
                                self.cmd_SetDayManhours(timeSheetItemDay, val);
                        }
                        else if (separatorIndex < text.length - 1) {//ожидаем формат ч:м
                            var hoursStr = text.substring(0, separatorIndex);
                            var minutesStr = text.substring(separatorIndex + 1);
                            //
                            var hours = parseInt(hoursStr);
                            var minutes = parseInt(minutesStr);
                            if (!isNaN(hours) && isFinite(hours) && hours >= 0 && hours < 24 &&
                                !isNaN(minutes) && isFinite(minutes) && minutes >= 0 && minutes < 60)
                                self.cmd_SetDayManhours(timeSheetItemDay, hours * 60 + minutes);
                        }
                    }
                    //
                    self.EditableCalendarItemDay(null);
                };
                self.CellKeyDown = function (vm, e) {
                    if (e.keyCode == 27)//esc => cancel
                        self.EditableCellText('');
                    if (e.keyCode == 27 || e.keyCode == 9 || e.keyCode == 13) //Esc, tab, enter
                        self.StopCellEdit();
                    return true;
                };
                $(document).click(function (e) {
                    var target = $(e.target);
                    if (target.is('input') == false) {
                        self.StopCellEdit();
                        return;
                    }
                    else if (target.text() != self.EditableCellText()) {
                        self.StopCellEdit();
                        return;
                    }
                });
            }
            //
            self.Abort = function () {//прерываение предыдущих загрузок
                self.ajaxControl_load.Abort();
                var vm = self.Model();
                if (vm != null)
                    vm.Abort();
            };
            //
            self.RowClick = function (vm, e) {//vm is TimeSheetItem
                var target = $(e.target);
                if (target.is('input') == true || target.has('input').length > 0)
                    return true;
                //
                if (vm.IsTemplate && self.CanChangeTable())
                    self.CreateWorkAs(vm);
                else if (!vm.IsTemplate)
                    self.ShowWorkForm(vm);
                return true;
            };
            self.BackToTimeSheetTotalClick = function () {//назад к сводному табелю руководителя
                var params = {};
                params[timeManagementModule.param_mode] = timeManagementModule.modes.timeSheetTotal;
                params[timeManagementModule.param_timeSheetID] = undefined;
                params[timeManagementModule.param_userID] = undefined;
                timeManagementModule.setParameters(params);//raise tm_urlChanged event (mode parameter)
            };
            //
            self.GetTimeSheetObjectCss = function (vm) {//vm is TimeSheetItem
                var classID = vm.LinkObjectClassID;
                if (!classID)
                    return '';
                //
                if (classID == 701) //OBJ_Call
                    return 'icon-call';
                else if (classID == 119)//OBJ_WorkOrder
                    return 'icon-workOrder';
                else if (classID == 702)//OBJ_Problem
                    return 'icon-problem';
                else if (classID == 371)//OBJ_Project
                    return 'icon-project';
                else
                    return '';
            };
            //
            self.CheckData = function () {//вызывается извне, сообщает, что пора обновлять/загружать данные
                $.when(userD).done(function (user) {
                    var currentTimeSheetID = self.Model() == null ? null : self.Model().ID;
                    var currentUserID = self.Model() == null ? null : self.Model().UserID;
                    //
                    var timeSheetID = urlManager.getUrlParam(timeManagementModule.param_timeSheetID);
                    var userID = urlManager.getUrlParam(timeManagementModule.param_userID);
                    if (userID == null)
                        userID = user.UserID;//id of currentUser
                    //
                    if (self.IsObsoleteData ||
                        timeSheetID != currentTimeSheetID && currentTimeSheetID != null && timeSheetID != null ||
                        currentUserID != userID && currentUserID != null && userID != null) {
                        if (timeSheetID != null)
                            self.Load(timeSheetID);
                        else
                            self.Load();
                    }
                    else if (self.Model() != null)
                        self.Model().InitSearcher();
                    //
                    if (self.Model() != null && self.Model().SheetMode && self.Model().SheetMode() === false) {
                        self.InitHTMLControl();
                    }
                });
            };
            //
            self.htmlControl = null; //for new comment create
            //
            self.InitHTMLControl = function () {
                console.log('init control');
                var $area = $('.ts-forms__editor');
                if ($area.length == 0) {
                    setTimeout(self.InitHTMLControl, 100);
                    return;
                }
                //
                if (self.htmlControl == null) {
                    showSpinner($area[0]);
                    require(['htmlControl'], function (htmlLib) {
                        self.htmlControl = new htmlLib.control($area);
                        self.htmlControl.OnHTMLChanged = function () {
                            //
                        };
                        self.htmlControl.OnKeyDown = function (e) {
                            if (e.keyCode == 13 && e.ctrlKey) {
                                self.AddNote();
                                return false;
                            }
                            else if (e.keyCode == 27) {
                                self.ClearHtmlControl();
                                return false;
                            }
                            else
                                return true;
                        };
                        hideSpinner($area[0]);
                        $.when(self.htmlControl.firstLoadD).done(function () {
                            $.when(self.htmlControl.frameD).done(function () {
                                self.OnResize();
                                self.htmlControl.Focus();
                            });
                        });
                    });
                }
                else {
                    self.htmlControl.Load($area);
                    $.when(self.htmlControl.firstLoadD).done(function () {
                        $.when(self.htmlControl.frameD).done(function () {
                            self.OnResize();
                            self.htmlControl.Focus();
                        });
                    });
                }
                //
                var fh = new fhModule.formHelper();
                fh.ScrollTo($('.ts-comments-list'), 'bottom');
            };
            //
            self.ClearHtmlControl = function () {
                if (self.htmlControl)
                    self.htmlControl.SetHTML('');
            };
            //
            self.AddNote = function () {
                if (self.htmlControl == null)
                    return;
                //
                var html = self.htmlControl.GetHTML();
                if (self.htmlControl.IsEmpty() == true) {
                    require(['sweetAlert'], function () {
                        swal(getTextResource('SDNoteIsEmptyCaption'), getTextResource('SDNoteIsEmpty'), 'warning');
                    });
                    //
                    return;
                }
                //
                $.when(self.Model().AddNote(html)).done(function (result) {
                    if (result)
                        self.ClearHtmlControl();
                });
            };
            //
            //реакции на события
            self.OnObjectInserted = function (e, objectClassID, objectID, parentObjectID) {
                if (objectClassID == 18 || objectClassID == 0) {//work, manhour
                    if (self.IsObjectPresent(objectID, parentObjectID))
                        self.IsObsoleteData = true;//возможно, присутствует работа, в нее добавилась трудозатрата
                    else {
                        var workD = self.GetWorkD(objectClassID == 0 ? parentObjectID : objectID);
                        $.when(workD).done(self.OnWorkSaved);
                    }
                }
            };
            self.OnObjectModified = function (e, objectClassID, objectID, parentObjectID) {
                if (objectClassID != 701 && objectClassID != 119 && objectClassID != 702 && objectClassID != 371 && objectClassID != 173 && objectClassID != 18 && objectClassID != 0)
                    return;//call, workOrder, problem, project, timeSheet, work, manhour
                //
                if (self.IsObjectPresent(objectID, parentObjectID))
                    self.IsObsoleteData = true;
                else if (objectClassID == 18 || objectClassID == 0) {
                    var workD = self.GetWorkD(objectClassID == 0 ? parentObjectID : objectID);
                    $.when(workD).done(self.OnWorkSaved);
                }
            };
            self.OnObjectDeleted = function (e, objectClassID, objectID, parentObjectID) {
                if (objectClassID != 701 && objectClassID != 119 && objectClassID != 702 && objectClassID != 371 && objectClassID != 173 && objectClassID != 18 && objectClassID != 0)
                    return;//call, workOrder, problem, project, timeSheet, work, manhour
                //
                if (self.IsObjectPresent(objectID, parentObjectID))
                    self.IsObsoleteData = true;
            };
            self.IsObjectPresent = function (objectID, parentObjectID) {
                var model = self.Model();
                if (model == null)
                    return false;
                //
                if (model.ID == objectID)
                    return true;
                //
                var itemList = model.ItemList();
                for (var i = 0; i < itemList.length; i++) {
                    var item = itemList[i];
                    if (item.ObjectID == objectID ||
                        item.LinkObjectID == objectID ||
                        item.ObjectID == parentObjectID && parentObjectID != null ||
                        item.LinkObjectID == parentObjectID && parentObjectID != null)
                        return true;
                }
                //
                return false;
            };
            self.OnMessageAdded = function (e, messageID, timesheetID, ownerTimesheetID, authorID) {
                var ts = self.Model();
                if (ts != null && ts.ID == timesheetID) {
                    var note = ko.utils.arrayFirst(ts.NotesList(), function (el) {
                        return el.ID == messageID;
                    });
                    //
                    if (note == null)//не добавлена раньше
                        ts.LoadNote(messageID);
                }
            };
            //
            self.resizeTimeout = null;
            self.OnResize = function () {//чтобы была красивая прокрутка таблицы, а кнопки при этом оставались видны
                clearTimeout(self.resizeTimeout);
                self.resizeTimeout = null;
                //
                var target = $(".table-scroll");
                if (target.length > 0) {
                    var new_height = 0;
                    if (self.Model() != null && self.Model().SheetMode && self.Model().SheetMode() === false)//comments mode
                    {
                        var firstContainer = $('.mainTimeSheetWrapper');
                        new_height = getPageContentHeight() - firstContainer.find(".ts-general").outerHeight(true) - firstContainer.find('.txt-btn').outerHeight(true) - 20 - 10;
                        new_height = Math.max(new_height, 300);
                        //
                        target.css("height", new_height + "px");
                    }
                    else {
                        new_height = getPageContentHeight() - $(".ts-general").outerHeight(true) - $(".ui-dialog-buttonset").outerHeight(true) - $('.txt-btn').outerHeight(true) - $('.ts-third').outerHeight(true) - $('.ts-tableHeader').outerHeight(true) - 20 - 10;
                        new_height = Math.max(new_height, 100);
                        //
                        var tableSize = target.find('.ts-table').height();
                        target.css("height", new_height > tableSize ? '' : new_height + "px");
                        //
                        if (getIEVersion() != -1) {
                            if (target[0].scrollHeight > target.outerHeight(true)) //scroll visible
                                $('.ts-tableHeader').css('padding-right', '22px');
                            else
                                $('.ts-tableHeader').css('padding-right', '5px');
                        }
                        else {
                            if (target[0].scrollHeight > target.outerHeight(true)) //scroll visible
                                $('.ts-tableHeader').css('padding-right', '17px');
                            else
                                $('.ts-tableHeader').css('padding-right', '5px');
                        }
                    }
                }
                else
                    self.resizeTimeout = setTimeout(self.OnResize, 50);
            };
            //
            self.OnScroll = function (vm, e) {
                $('.ts-tableHeader').css('margin-left', -e.target.scrollLeft);
            };
            //
            self.CanEdit = ko.computed(function () {//когда доступны команды в табеле
                var model = self.Model();
                if (model == null)
                    return false;
                //
                return model.State != 3 &&//not approved
                    (model.UserInfo() == null);//i'am manager
            });
            self.SelectedItems = ko.computed(function () {//выбранные строки (работы / шаблоны)
                var model = self.Model();
                if (model == null)
                    return [];
                //
                var selectedItems = model.GetCheckedItemList();
                return selectedItems;
            });
            //
            self.cmd_SetDayManhours = function (timeSheetItemDay, manhoursInMinutes) {//редактирование ячейки таблицы - изменение/добавление трудозатрат и создание работ                
                var timeSheetItem = timeSheetItemDay.TimeSheetItem;
                if (timeSheetItem.IsTemplate == true || timeSheetItem.ObjectClassID != 18)//work
                {
                    require(['sweetAlert'], function () {
                        swal(getTextResource('TM_OnlyRowWithWorkCanBeModified'));
                    });
                    return;
                }
                if (timeSheetItemDay.ManhourID == null && timeSheetItemDay.ManhoursInMinutes() > 0) {
                    require(['sweetAlert'], function () {
                        swal(getTextResource('TM_OnlyEmptyCellsOrCellsWithSingleValueCanBeModified'));
                    });
                    return;
                }
                //                
                var timeSheetDay = null;
                var timeSheetDayID = timeSheetItemDay.TimeSheetDayID;
                var timeSheetDayList = timeSheetItem.TimeSheet.DayList();
                for (var i = 0; i < timeSheetDayList.length; i++)
                    if (timeSheetDayList[i].ID == timeSheetDayID) {
                        timeSheetDay = timeSheetDayList[i];
                        break;
                    }
                if (timeSheetDay == null) {
                    require(['sweetAlert'], function () {
                        swal(getTextResource('TM_CantModifyCellDayNotFound'));
                    });
                    return;
                }
                //
                var date = new Date(timeSheetDay.Year, timeSheetDay.Month - 1, timeSheetDay.Day);
                {
                    var now = new Date();
                    date.setHours(now.getHours());
                    date.setMinutes(now.getMinutes());
                    date.setSeconds(now.getSeconds());
                }
                var manhoursInfo = {
                    ID: timeSheetItemDay.ManhourID,
                    WorkID: timeSheetItem.ObjectID,
                    ObjectID: timeSheetItem.LinkObjectID,
                    ObjectClassID: timeSheetItem.LinkObjectClassID,
                    Value: manhoursInMinutes,
                    UtcDate: null,
                    UtcDateMilliseconds: date.getTime(),
                    Operation: timeSheetItemDay.ManhourID == null ? 1 : (manhoursInMinutes == 0 ? 2 : 0)//edit=0, create=1, remove=2
                };
                //
                var ajaxControl = new ajaxLib.control();
                ajaxControl.Ajax($('.tmModule'),
                {
                    dataType: 'json',
                    url: 'sdApi/EditManhours',
                    method: 'POST',
                    data: manhoursInfo
                },
                function (ans) {
                    if (ans) {
                        var response = ans.Response;
                        if (response) {
                            var result = response.Result;
                            if (result != 0) {
                                require(['sweetAlert'], function () {
                                    if (result == 8 || result == 7) {
                                        swal(getTextResource('EditManhoursWorkCaption'), (response.Message ? response.Message : getTextResource('ValidationError')), 'warning');
                                    }
                                    else {
                                        swal(getTextResource('EditManhoursWorkCaption'), (response.Message ? response.Message : getTextResource('AjaxError')) + '\n[TimeSheet.js, cmd_SetDayManhours]', 'error');
                                    }
                                });
                                return;
                            }
                            //                            
                            if (manhoursInfo.Operation == 2)
                                timeSheetItemDay.ManhourID = null;
                            else if (manhoursInfo.Operation == 1)
                                timeSheetItemDay.ManhourID = ans.ID;
                            //
                            timeSheetItemDay.ManhoursInMinutes(manhoursInMinutes);
                            return;
                        }
                    }
                    //
                    require(['sweetAlert'], function () {
                        swal(getTextResource('EditManhoursWorkCaption'), getTextResource('AjaxError') + '\n[TimeSheet.js, cmd_SetDayManhours]', 'error');
                    });
                });
            };
            self.cmd_AddWork = function () {//добавить новую работу
                var workD = self.CreateWorkD('', null, null);
                //
                $.when(workD, timeManagementModule.ManhoursWorkShowModeD, timeManagementModule.ManhoursInClosedD).done(function (work, showMode, allowInClosed) {
                        var fh = new fhModule.formHelper();
                        //
                        var options = {};
                        options.onSave = self.OnWorkSavedByForm;
                        options.showLink = false;
                        options.canEditOthersWork = false;
                        options.canEditExecutor = false;
                        options.manhoursWorkShowMode = showMode;
                        //
                        fh.ShowManhoursWorkForm(work, self.CanEdit, options);
                });
            };
            self.cmd_AddWorkAs = function () {//добавить работу по аналогии
                var selectedItems = self.SelectedItems();
                if (selectedItems.length == 0)
                    return;
                //
                var first = selectedItems[0];
                self.CreateWorkAs(first);
            };
            self.cmd_RemoveWork = function () {//удалить работы
                var selectedItems = self.SelectedItems();
                if (selectedItems.length == 0)
                    return;
                //
                var question = '';
                var list = [];//список, подлежащий удалению
                for (var i = 0; i < selectedItems.length; i++) {
                    var timeSheetItem = selectedItems[i];
                    if (timeSheetItem.IsTemplate)
                        continue;
                    //
                    list.push(timeSheetItem);
                    if (question.length < 200) {
                        question += (question.length > 0 ? ', ' : '') + timeSheetItem.ObjectFullName;
                        if (question.length >= 200)
                            question += '...';
                    }
                }
                //
                if (list.length == 0) {
                    require(['sweetAlert'], function (swal) {
                        swal(getTextResource('TM_OnlyRowWithWorkCanBeRemoved'));
                    });
                    return;
                }
                //
                require(['sweetAlert'], function (swal) {
                    swal({
                        title: getTextResource('RemoveManhoursWorkCaption') + question,
                        text: getTextResource('RemoveManhoursWorkQuestion'),
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
                            var removeWork = function (timeSheetItem) {
                                var retvalD = $.Deferred();
                                //
                                var ajaxControl = new ajaxLib.control();
                                ajaxControl.Ajax($('.tmModule'),
                                {
                                    dataType: 'json',
                                    url: 'sdApi/EditManhoursWork',
                                    method: 'POST',
                                    data: {
                                        Operation: 2, //remove
                                        ID: timeSheetItem.ObjectID,
                                        ObjectID: timeSheetItem.LinkObjectID,
                                        ObjectClassID: timeSheetItem.LinkObjectClassID,
                                        ExecutorID: null,
                                        InitiatorID: null,
                                        UserActivityTypeID: null,
                                        Description: null,
                                        Number: null,
                                    }
                                },
                                function (ans) {
                                    if (ans) {
                                        var response = ans.Response;
                                        if (response) {
                                            var result = response.Result;
                                            if (result !== 0) {
                                                swal(getTextResource('RemoveManhoursWorkCaption'), (response.Message ? response.Message : getTextResource('AjaxError')) + '\n[TimeSheet.js, cmd_RemoveWork]', 'error');
                                                retvalD.resolve(false);
                                            }
                                            else {
                                                self.IsObsoleteData = true;
                                                retvalD.resolve(true);
                                            }
                                        }
                                        else
                                            retvalD.resolve(false);
                                    }
                                    else {
                                        swal(getTextResource('RemoveManhoursWorkCaption'), getTextResource('AjaxError') + '\n[TimeSheet.js, cmd_RemoveWork]', 'error');
                                        retvalD.resolve(false);
                                    }
                                },
                                function () {
                                    retvalD.resolve(false);
                                });
                                //
                                return retvalD.promise();
                            };
                            //
                            var process = null;
                            process = function () {//recursive save by deferred
                                var item = list.pop();
                                if (item != undefined) {
                                    var d = removeWork(item);
                                    $.when(d).done(function (res) {
                                        if (res == false) {
                                            self.CheckData();
                                            return;
                                        }
                                        //
                                        process();
                                    });
                                }
                                else
                                    self.CheckData();
                            };
                            process();
                        }
                    });
                });
            };
            self.cmd_OpenWork = function () {//открыть форму работы
                var selectedItems = self.SelectedItems();
                if (selectedItems.length == 0)
                    return;
                //
                self.ShowWorkForm(selectedItems[0]);
            };
            self.cmd_OpenObject = function () {//открыть форму связи работы / шаблона
                var selectedItems = self.SelectedItems();
                if (selectedItems.length == 1)
                    self.ShowObjectForm(selectedItems[0]);
            };
            //
            self.ShowObjectForm = function (timeSheetItem) {//открывает форму объекта - заявки/задания/проблемы/проекта
                var objectClassID = timeSheetItem.ObjectClassID;
                var objectID = timeSheetItem.ObjectID;
                //
                if (timeSheetItem.LinkObjectClassID && timeSheetItem.LinkObjectID) {
                    objectClassID = timeSheetItem.LinkObjectClassID;
                    objectID = timeSheetItem.LinkObjectID;
                }
                //
                if (objectClassID == 18) {//work without link
                    require(['sweetAlert'], function () {
                        swal(getTextResource('TM_ItIsWorkWithoutLink'));
                    });
                    return;
                }
                //
                showSpinner();
                require(['sdForms'], function (sfhModule) {
                    var fh = new sfhModule.formHelper(true);
                    if (objectClassID == 701)//IMSystem.Global.OBJ_CALL
                        fh.ShowObjectForm(objectClassID, objectID, fh.Mode.ForceEngineer);
                    else
                        fh.ShowObjectForm(objectClassID, objectID);
                });
            };
            self.ShowWorkForm = function (timeSheetItem) {//открывает форму работы
                if (timeSheetItem.IsTemplate) {
                    require(['sweetAlert'], function () {
                        swal(getTextResource('TM_ItIsTemplate'));
                    });
                    return;
                }
                //
                var workD = self.GetWorkD(timeSheetItem.ObjectID, timeSheetItem.LinkObjectID, timeSheetItem.LinkObjectClassID);
                $.when(userD, workD, timeManagementModule.ManhoursWorkShowModeD, timeManagementModule.ManhoursInClosedD, operationIsGrantedD(317)).done(function (user, work, showMode, allowInClosed, work_properties) {
                    if (work == null || work_properties != true) {
                        require(['sweetAlert'], function () {
                            swal(getTextResource('TM_CannotGetWork'));
                        });
                        return;
                    }
                    //                  
                    showSpinner();
                        var fh = new fhModule.formHelper(true);
                        //
                        var options = {};
                        options.onSave = self.OnWorkSavedByForm;
                        options.showLink = true;
                        options.linkObjectNumber = timeSheetItem.LinkObjectNumber;
                        //
                        var canEdit = user.UserID != timeSheetItem.TimeSheet.UserID;
                        options.canEditOthersWork = canEdit;
                        options.canEditExecutor = canEdit;
                        //
                        options.manhoursWorkShowMode = showMode;
                    var canEditComputed = function () {
                            if (self.CanEdit() == false)
                                return false;                          
                            //
                            if (timeSheetItem.TimeSheet.State == 1)
                                return false;
                            //
                            if (timeSheetItem.LinkObjectClassID != null && timeSheetItem.LinkObjectClassID != 371)//link exists, NOT OBJ_PROJECT
                            {
                                if (allowInClosed == false && timeSheetItem.LinkObjectWorkflowSchemeID == null)
                                    return false;
                            }
                            return true;
                        };
                        //
                    fh.ShowManhoursWorkForm(work, canEditComputed, options);
                });
            };
            self.CreateWorkAs = function (timeSheetItem) {
                var workD = timeSheetItem.IsTemplate ?
                    self.CreateWorkD(timeSheetItem.ObjectFullName, timeSheetItem.ObjectID, timeSheetItem.ObjectClassID, timeSheetItem.ObjectInitiatorID) :
                    self.GetWorkD(timeSheetItem.ObjectID, timeSheetItem.LinkObjectID, timeSheetItem.LinkObjectClassID);
                $.when(workD, timeManagementModule.ManhoursWorkShowModeD, timeManagementModule.ManhoursInClosedD, operationIsGrantedD(314)).done(function (work, showMode, allowInClosed, work_add) {
                    if (work == null || work_add != true) {
                        require(['sweetAlert'], function () {
                            swal(getTextResource('TM_CannotGetWork'));
                        });
                        return;
                    }
                    //
                    if (allowInClosed == false && timeSheetItem.IsTemplate == false && timeSheetItem.LinkObjectWorkflowSchemeID == null && timeSheetItem.LinkObjectClassID != null && timeSheetItem.LinkObjectClassID != 371/*Obj_Project*/) {
                        require(['sweetAlert'], function () {
                            swal(getTextResource('TM_CannotEditClosedObjects'));
                        });
                        return;
                    }
                    //
                    {//clear IDs
                        work.ID = null;
                        work.Number = null;
                        work.ManhoursList = [];
                    }
                    var fh = new fhModule.formHelper();
                        //
                        var options = {};
                        options.onSave = self.OnWorkSavedByForm;
                        options.showLink = true;
                        options.linkObjectNumber = timeSheetItem.IsTemplate ? timeSheetItem.ObjectNumber : timeSheetItem.LinkObjectNumber;
                        options.canEditOthersWork = false;
                        options.canEditExecutor = false;
                        options.manhoursWorkShowMode = showMode;
                        //
                        fh.ShowManhoursWorkForm(work, self.CanEdit, options);
                });
            };
            //            
            self.CreateWorkD = function (description, objectID, objectClassID, objectInitiatorID) {//создает работу и заполняет в зависимости от контекста исполнителя и инициатора
                var work = {
                    ID: null,
                    Number: null,
                    Description: description,
                    ObjectID: objectID,
                    ObjectClassID: objectClassID,
                    ExecutorID: null,
                    ExecutorFullName: null,
                    InitiatorID: objectInitiatorID,
                    InitiatorFullName: null,
                    UserActivityTypeID: null,
                    UserActivityTypeName: null,
                    ManhoursList: null
                };
                //
                var retval = $.Deferred();
                var dExecutor = $.Deferred();
                var dInitiator = $.Deferred();
                //
                var timeSheet = self.Model();
                if (timeSheet != null) {
                    var ajaxControl = new ajaxLib.control();
                    var param = {
                        userID: timeSheet.UserID,
                    };
                    ajaxControl.Ajax($('.tmModule'),
                    {
                        url: 'userApi/GetUserInfo?' + $.param(param),
                        method: 'GET'
                    },
                       function (userInfo) {
                           work.ExecutorID = userInfo.ID;
                           work.ExecutorFullName = userInfo.FullName;
                           dExecutor.resolve();
                       });
                    //
                    /*$.when(userD).done(function (user) {
                        if (timeSheet.UserID != user.UserID) {
                            work.InitiatorID = user.UserID;
                            work.InitiatorFullName = user.UserFullName;
                        }
                        dInitiator.resolve();
                    });*/
                    dInitiator.resolve();//они еще не определились с тз видимо, так что оставил пока
                    //
                    $.when(dInitiator, dExecutor).done(function () {
                        retval.resolve(work);
                    });
                }
                else
                    retval.resolve(work);
                //
                return retval.promise();
            };
            self.GetWorkD = function (id, entityID, entityClassID) {//получает работу с сервера
                var retvalD = $.Deferred();
                var param = {
                    'ID': id,
                    'EntityID': entityID,
                    'EntityClassId': entityClassID
                };
                var ajaxControl = new ajaxLib.control();
                ajaxControl.Ajax($('.tmModule'),
                {
                    url: 'sdApi/GetManhoursWork?' + $.param(param),
                    method: 'GET',
                    dataType: "json"
                }, function (response) {
                    if (response && response.Result == 0 && response.Work)
                        retvalD.resolve(response.Work);
                    else
                        retvalD.resolve(null);
                });
                //
                return retvalD.promise();
            };
            //
            self.IsWorkVisible = function (work) {//проверка вхождения работы в текущий период
                var model = self.Model();
                if (model == null || work == null ||//нет работы - не видна                    
                    work.ExecutorID != model.UserID)//не мое - не должна отображаться
                    return false;
                //
                if (work.ManhoursList == null || work.ManhoursList.length == 0) //нет трудозатрат - показываем
                    return true;
                //
                var minDate = null;
                var maxDate = null;
                for (var i = 0; i < work.ManhoursList.length; i++) {
                    var manhour = work.ManhoursList[i];
                    //
                    var startDate = new Date(getUtcDate(manhour.UtcDate));
                    var endDate = new Date(startDate.getTime());
                    endDate.setMinutes(endDate.getMinutes() + manhour.Value);
                    //
                    minDate = minDate == null ? startDate : new Date(Math.min(startDate, minDate));
                    maxDate = maxDate == null ? endDate : new Date(Math.max(endDate, maxDate));
                }
                //
                if (minDate <= model.StartDate && maxDate >= model.StartDate)
                    return true;
                else if (minDate >= model.StartDate && maxDate <= model.FinishDate)
                    return true;
                else if (minDate <= model.FinishDate && maxDate >= model.FinishDate)
                    return true;
                else
                    return false;
            };
            //
            self.OnWorkSaved = function (work) {//реакция на изменную работу - попадает в список => обновляем
                if (self.IsWorkVisible(work)) {
                    self.IsObsoleteData = true;
                    //self.CheckData(); мы не знаем эта ли вкладка открыта, поэтому вызываем этот же метод у всего модуля
                    checkDataInSelectedView();
                }
            };
            self.OnWorkSavedByForm = function (ko_work) {//реакция на изменную формой работы работу (она ko-объект)
                var d = self.GetWorkD(ko_work.ID, ko_work.ObjectID, ko_work.ObjectClassID);
                $.when(d).done(function (work) {
                    self.OnWorkSaved(work);
                });
            };
        },

        TimeSheetDay: function (timeManagementModule, timeSheet, obj) {//BLL.TimeManagement\TimeSheetDay - дни табеля (заголовок таблицы)
            if (timeSheet.ID != obj.TimeSheetID)
                throw 'timeSheet does not contains this day';
            var self = this;
            //
            self.ID = obj.ID;
            self.TimeSheet = timeSheet;
            //
            self.Year = obj.Year;
            self.Month = obj.Month;
            self.Day = obj.Day;
            self.DateString = self.Day.toString() + '.' + self.Month.toString() + '.' + self.Year.toString();
            //
            self.ManhoursNormInMinutes = obj.ManhoursNormInMinutes;
            self.ManhoursNormString = timeManagementModule.getDatePaddedString(self.ManhoursNormInMinutes);
            //
            self.ManhoursInMinutes = ko.computed(function () {//всего в этот день трудозатрат внесено
                var retval = 0;
                //
                var itemList = self.TimeSheet.ItemList();
                for (var i = 0; i < itemList.length; i++) {//по всем строкам (работам и шаблонам)
                    var item = itemList[i];
                    if (item.IsTemplate == true)
                        continue;
                    //
                    var days = item.DayList();
                    for (var y = 0; y < days.length; y++)//по всем трудозатратам работы
                        if (days[y].TimeSheetDayID == self.ID) {//соответствующий столбец
                            retval += days[y].ManhoursInMinutes();
                            break;
                        }
                }
                //
                return retval;
            });
            self.ManhoursInMinutesString = ko.computed(function () {
                return timeManagementModule.getDatePaddedString(self.ManhoursInMinutes());
            });
        },

        TimeSheet: function (timeManagementModule, obj) {//BLL.TimeManagement\TimeSheet - табель
            var self = this;
            //
            self.SearchModeEnum = {
                context: 0,
                user: 1,
                number: 2,
            };
            //
            self.ID = obj.ID;
            self.UserID = obj.UserID;
            self.UserInfo = ko.observable(null);//для частного табеля (информация о пользователе, чей это табель)
            //
            self.StartDate = timeManagementModule.parseDate(obj.StartUtcDateString);
            self.FinishDate = timeManagementModule.parseDate(obj.FinishUtcDateString);
            self.DateIntervalString = timeManagementModule.dateToString(self.StartDate) + ' - ' + timeManagementModule.dateToString(self.FinishDate);
            //
            self.State = obj.State;
            self.StateName = obj.StateName;
            //
            self.NewMessagesCount = ko.observable(obj.UnreadNotesCount ? obj.UnreadNotesCount : 0);
            self.NewMessagesCountString = ko.computed(function () {
                var val = timeManagementModule.formatNumberForCircle(self.NewMessagesCount());
                return val;
            });
            //
            self.SearcherText = ko.observable(null);
            self.SelectedClient = ko.observable(null);
            self.Searcher = null;
            self.SearchMode = null;
            self.SearcherText.subscribe(function (newValue) { self.InitSearch(newValue) });
            self.$searcher = null;
            //
            self.SyncTimeout = null;
            self.SyncD = null;
            //
            self.InitSearch = function (phrase) {
                var d = self.SyncD;
                if (d == null || d.state() == 'resolved') {
                    d = $.Deferred();
                    self.SyncD = d;
                }
                //
                if (self.SyncTimeout)
                    clearTimeout(self.SyncTimeout);
                self.SyncTimeout = setTimeout(function () {
                    if (d == self.SyncD && phrase == self.SearcherText()) {
                        if (self.SelectedClient() && self.SelectedClient().FullName != phrase)
                            self.SelectedClient(null);
                        //
                        self.ItemList.valueHasMutated();
                        d.resolve();
                    }
                }, 500);
                //
                return d.promise();
            };
            self.GetSearchMode = function () {
                if (self.SelectedClient())
                    return self.SearchModeEnum.user;
                //
                if (self.SearcherText() == null)
                    return null;
                //
                var phrase = self.SearcherText().toString();
                if (parseInt(phrase).toString() == phrase)
                    return self.SearchModeEnum.number;
                else
                    return self.SearchModeEnum.context;
            };
            self.GetSearchText = function () {
                if (self.SelectedClient())
                    return self.SelectedClient().ID;
                else if (self.$searcher) {
                    var searcher = self.$searcher[0];
                    if (searcher) {
                        var phrase = searcher.value.trim();
                        return phrase.length != 0 ? phrase : null;
                    }
                }
                return null;
            };
            self.InitSearcher = function () {
                self.$searcher = $('.ts-second .ts-search .text-input');
                //
                var setUser = function (user) {
                    if (user) {
                        self.SelectedClient(user);
                        self.SearcherText(user.FullName);
                    }
                    else {
                        self.SelectedClient(null);
                        self.SearcherText(null);
                    }
                };
                var fh = new fhModule.formHelper();
                var ctrlD = fh.SetTextSearcherToField(
                    self.$searcher,
                    'WebUserSearcher',
                    null,//default template
                    null,//searcher params
                    function (objectInfo) {//select
                        if (self.Searcher.Items().length == 0)
                            return;
                        //
                        var param = { userID: objectInfo.ID };
                        self.ajaxControl_user.Ajax(self.$searcher,
                           {
                               dataType: "json",
                               method: 'GET',
                               url: 'userApi/GetUserInfo?' + $.param(param)
                           },
                           function (user) {
                               setUser(user);
                           });
                    },
                    function () {//reset
                        setUser(null);
                    },
                    null);
                $.when(ctrlD).done(function (ctrl) {
                    ctrl.LoadD.done(function () {
                        self.Searcher = ctrl;
                        self.$searcher.focus();
                        ctrl.Close();
                        setTimeout(ctrl.Close, 500);
                        //
                        ctrl.itemEval = function (item) {
                            var result = false;
                            self.ItemList().forEach(function (timeSheetItem) {
                                if (item.ID == timeSheetItem.ObjectInitiatorID)
                                    result = true;
                            });
                            return result;
                        };
                    });
                    //
                    return ctrlD;
                });
            };
            self.OnEnter = function (d, e) {
                if (e.keyCode === 13) {
                    self.Searcher.Close();
                    self.ItemList.valueHasMutated();
                }
                return true;
            };
            //
            self.IntervalName = obj.IntervalName;
            //
            self.DayList = ko.observableArray([]);
            self.ItemList = ko.observableArray([]);//перечень работ и шаблонов
            //
            self.ManhoursNormInMinutes = 0;
            if (obj.Days) {
                for (var i = 0; i < obj.Days.length; i++) {
                    var day = new module.TimeSheetDay(timeManagementModule, self, obj.Days[i])
                    self.DayList().push(day);
                    //
                    self.ManhoursNormInMinutes += day.ManhoursNormInMinutes;
                }
                self.DayList.valueHasMutated();
            }
            self.ManhoursNormString = timeManagementModule.getDatePaddedString(self.ManhoursNormInMinutes);
            //
            self.TotalManhoursByDaysInMinutes = ko.computed(function () {//всего трудозатрат по всем дням внесено
                var retval = 0;
                for (var i = 0; i < self.DayList().length; i++)
                    retval += self.DayList()[i].ManhoursInMinutes();
                return retval;
            });
            self.TotalManhoursByDaysString = ko.computed(function () {
                return timeManagementModule.getDatePaddedString(self.TotalManhoursByDaysInMinutes());
            });
            //
            //
            self.SheetMode = ko.observable(true);//либо таблица, либо комменты
            self.ShowSheet = function () {//показать таблицу
                self.SheetMode(true);
            };
            self.ShowComments = function () {//показать комментарии
                self.SheetMode(false);
            };
            //
            //
            self.StateList = ko.observableArray([]);
            self.SelectedState = ko.observable(new module.TimeSheetState({ ID: self.State, Name: self.StateName }));
            self.SelectedState.subscribe(function (newValue) {
                if (newValue.ID == self.State)
                    return;
                //
                    var fh = new fhModule.formHelper();
                    var d = fh.ShowTimeSheetSetStateForm([self.ID], newValue.ID);
                    $.when(d).done(function (result) {
                        if (result == false) {
                            self.SelectedState(new module.TimeSheetState({ ID: self.State, Name: self.StateName }));//to old value
                        }
                        //else server send objectUpdated
                        self.LoadNotes();
                    });
            });
            self.getStateList = function (options) {
                var data = self.StateList();
                options.callback({ data: data, total: data.length });
            };
            self.ajaxControl_state = new ajaxLib.control();
            self.LoadStateList = function () {
                if (self.StateList().length > 0)
                    return;
                //
                var param = {
                    timeSheetID: self.ID,
                };
                self.ajaxControl_state.Ajax($('.ts-state'),
                {
                    url: 'sdApi/GetAvailableStateInfos?' + $.param(param),
                    method: 'GET'
                },
                   function (outModel) {
                       if (outModel && outModel.Result === 0) {
                           var stateList = outModel.List;
                           if (stateList) {
                               for (var i = 0; i < stateList.length; i++) {
                                   var s = new module.TimeSheetState(stateList[i]);
                                   self.StateList().push(s);
                               }
                               self.StateList.valueHasMutated();
                           }
                           else
                               require(['sweetAlert'], function () {
                                   swal(getTextResource('ErrorCaption'), getTextResource('AjaxError') + '\n[TimeManagement.TimeSheet.js, LoadStateList]', 'error');
                               });
                       }
                       else if (outModel && outModel.Result === 1)//NullParamsError
                           require(['sweetAlert'], function () {
                               swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[TimeManagement.TimeSheet.js, LoadStateList]', 'error');
                           });
                       else if (outModel && outModel.Result === 3)//AccessError
                           require(['sweetAlert'], function () {
                               swal(getTextResource('ErrorCaption'), getTextResource('AccessError'), 'error');
                           });
                       else if (outModel && outModel.Result === 6)//ObjectDeleted
                           require(['sweetAlert'], function () {
                               swal(getTextResource('ErrorCaption'), getTextResource('ObjectDeleted'), 'error');
                           });
                       else if (outModel && outModel.Result === 4)//GlobalError
                           require(['sweetAlert'], function () {
                               swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[TimeManagement.TimeSheet.js, LoadStateList]', 'error');
                           });
                       else
                           require(['sweetAlert'], function () {
                               swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[TimeManagement.TimeSheet.js, LoadStateList]', 'error');
                           });
                   });
            };
            //
            self.ajaxControl_addnote = new ajaxLib.control();
            self.AddNote = function (html) {
                var retD = $.Deferred();
                var $area = $('.ts-forms__editor');
                if (html == null || html == '') {
                    retD.resolve(false);
                    return retD.promise();
                }
                //
                self.ajaxControl_addnote.Ajax($area,
                    {
                        dataType: "json",
                        method: 'POST',
                        url: 'sdApi/AddTimeSheetNote',
                        data: {
                            TimeSheetID: self.ID,
                            HTMLMessage: html,
                            TimezoneOffsetInMinutes: self.TimezoneOffsetInMinutes
                        }
                    },
                    function (model) {
                        if (model.Result === 0) {
                            retD.resolve(true);
                            //
                            if (model.Value) {
                                self.NotesList.push(new module.TimeSheetNote(model.Value));
                                self.NotesList.valueHasMutated();
                                //
                                    var fh = new fhModule.formHelper();
                                    fh.ScrollTo($('.ts-comments-list'), 'bottom');
                            }
                        }
                        else if (model.Result === 1) {
                            require(['sweetAlert'], function () {
                                swal(getTextResource('SaveError'), getTextResource('NullParamsError') + '\n[TimeManagement.TimeSheet.js, AddNote]', 'error');
                                retD.resolve(false);
                            });
                        }
                        else if (model.Result === 2) {
                            require(['sweetAlert'], function () {
                                swal(getTextResource('SaveError'), getTextResource('BadParamsError') + '\n[TimeManagement.TimeSheet.js, AddNote]', 'warning');
                                retD.resolve(false);
                            });
                        }
                        else if (model.Result === 3) {
                            require(['sweetAlert'], function () {
                                swal(getTextResource('SaveError'), getTextResource('AccessError'), 'error');
                                retD.resolve(false);
                            });
                        }
                        else if (model.Result === 8) {
                            require(['sweetAlert'], function () {
                                swal(getTextResource('SaveError'), getTextResource('ValidationError'), 'error');
                                retD.resolve(false);
                            });
                        }
                        else {
                            require(['sweetAlert'], function () {
                                swal(getTextResource('SaveError'), getTextResource('GlobalError') + '\n[TimeManagement.TimeSheet.js, AddNote]', 'error');
                                retD.resolve(false);
                            });
                        }
                    });
                //
                return retD.promise();
            };
            //
            self.NotesList = ko.observableArray([]);
            self.ajaxControl_notes = new ajaxLib.control();
            self.ajaxControl_read = new ajaxLib.control();
            self.LoadNotes = function () {
                self.NotesList.removeAll();
                //
                var param = {
                    timeSheetID: self.ID
                };
                self.ajaxControl_notes.Ajax($('.ts-table'),
                {
                    url: 'sdApi/GetTimeSheetNoteList?' + $.param(param),
                    method: 'GET'
                },
                   function (outModel) {
                       if (outModel && outModel.Result === 0) {
                           var noteList = outModel.List;
                           if (noteList) {
                               for (var i = 0; i < noteList.length; i++) {
                                   var s = new module.TimeSheetNote(noteList[i]);
                                   self.NotesList().push(s);
                               }
                               self.NotesList.valueHasMutated();
                               //
                                   var fh = new fhModule.formHelper();
                                   fh.ScrollTo($('.ts-comments-list'), 'bottom');
                           }
                           else
                               require(['sweetAlert'], function () {
                                   swal(getTextResource('ErrorCaption'), getTextResource('AjaxError') + '\n[TimeManagement.TimeSheet.js, LoadNotes]', 'error');
                               });
                       }
                       else if (outModel && outModel.Result === 1)//NullParamsError
                           require(['sweetAlert'], function () {
                               swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[TimeManagement.TimeSheet.js, LoadNotes]', 'error');
                           });
                       else if (outModel && outModel.Result === 3)//AccessError
                           require(['sweetAlert'], function () {
                               swal(getTextResource('ErrorCaption'), getTextResource('AccessError'), 'error');
                           });
                       else
                           require(['sweetAlert'], function () {
                               swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[TimeManagement.TimeSheet.js, LoadNotes]', 'error');
                           });
                   });
            };
            self.LoadNote = function (newNoteID) {
                var param = {
                    noteID: newNoteID,
                    timeSheetID: self.ID
                };
                self.ajaxControl_notes.Ajax($('.ts-table'),
                {
                    url: 'sdApi/GetTimeSheetNote?' + $.param(param),
                    method: 'GET'
                },
                   function (outModel) {
                       if (outModel && outModel.Result === 0) {
                           var note = outModel.Note;
                           if (note) {
                               var s = new module.TimeSheetNote(note);
                               self.NotesList().push(s);
                               //
                               self.NotesList.valueHasMutated();
                               //
                                   var fh = new fhModule.formHelper();
                                   fh.ScrollTo($('.ts-comments-list'), 'bottom');
                           }
                           else
                               require(['sweetAlert'], function () {
                                   swal(getTextResource('ErrorCaption'), getTextResource('AjaxError') + '\n[TimeManagement.TimeSheet.js, LoadNote]', 'error');
                               });
                       }
                       else if (outModel && outModel.Result === 1)//NullParamsError
                           require(['sweetAlert'], function () {
                               swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[TimeManagement.TimeSheet.js, LoadNote]', 'error');
                           });
                       else if (outModel && outModel.Result === 3)//AccessError
                           require(['sweetAlert'], function () {
                               swal(getTextResource('ErrorCaption'), getTextResource('AccessError'), 'error');
                           });
                       else
                           require(['sweetAlert'], function () {
                               swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[TimeManagement.TimeSheet.js, LoadNote]', 'error');
                           });
                   });
            };
            self.TotalUnreadedMessages = ko.computed(function () {
                var retval = 0;
                //
                for (var i = 0; i < self.NotesList().length; i++) {
                    var note = self.NotesList()[i];
                    if (note && note.IsReaded && note.IsReaded() == false)
                        retval++;
                }
                //
                return retval;
            });
            self.TotalUnreadedMessagesString = ko.computed(function () {
                return ' (' + getTextResource('TM_NewMessages') + ': ' + self.TotalUnreadedMessages() + ')';
            });
            self.OnMouseOverMessage = function (obj, event) {
                if (obj && obj.IsReaded() == false)
                    self.SetMessageReaded(obj);
            };
            self.SetMessageReaded = function (obj) {
                if (obj != null) {
                    self.ajaxControl_read.Ajax($('.ts-table'),
                        {
                            dataType: "json",
                            method: 'POST',
                            url: 'sdApi/setTimeSheetNoteReaded',
                            data: {
                                TimeSheetID: self.ID,
                                NoteID: obj.ID,
                            }
                        },
                        function (result) {
                            if (result === 0) {
                                if (self.NotesList && self.NotesList().length > 0) {
                                    obj.IsReaded(true);
                                    self.NotesList.valueHasMutated();
                                    $(document).trigger('local_messageReaded', [obj.ID, self.ID, self.UserID, obj.UserID]);
                                }
                                return;
                            }
                            else if (result === 2)
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('SaveError'), getTextResource('BadParamsError') + '\n[TimeManagement.TimeSheet.js, SetMessageReaded]', 'error');
                                });
                            else
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('SaveError'), getTextResource('GlobalError') + '\n[TimeManagement.TimeSheet.js, SetMessageReaded]', 'error');
                                });
                            //
                            obj.IsReaded(false);
                            self.NotesList.valueHasMutated();
                        });
                }
            };
            //
            self.ajaxControl_user = new ajaxLib.control();
            self.LoadUserInfo = function () {
                $.when(userD).done(function (user) {
                    if (self.UserID == user.UserID) {
                        self.UserInfo(null);//пользователь табеля = текущий пользоватль
                        return;
                    }
                    //
                    var param = {
                        userID: self.UserID,
                    };
                    self.ajaxControl_user.Ajax($('.ts-table'),
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
                                   swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[TimeManagement.TimeSheet.js, LoadUserInfo]', 'error');
                               });
                       });
                });
            };
            //
            self.Abort = function () {
                self.ajaxControl_state.Abort();
                self.ajaxControl_user.Abort();
                self.ajaxControl_notes.Abort();
            };
            //
            self.CheckAllItems = function (vm, e) {
                var newVal = e.target.checked;
                //
                var itemList = self.ItemList();
                for (var i = 0; i < itemList.length; i++)
                    itemList[i].Checked(newVal);
                //
                return true;
            };
            //
            self.GetCheckedItemList = function () {
                var retval = [];
                //
                for (var i = 0; i < self.ItemList().length; i++) {
                    var item = self.ItemList()[i];
                    if (item.Checked() == true)
                        retval.push(item);
                }
                //
                return retval;
            };
        },

        TimeSheetItemDay: function (timeManagementModule, timeSheetItem, timeSheetItemDay) {//BLL.TimeManagement\TimeSheetItemDay - значения трудозатрат по дням
            var self = this;
            //
            self.TimeSheetItem = timeSheetItem;
            self.TimeSheetDayID = timeSheetItemDay.TimeSheetDayID;
            self.ManhourID = timeSheetItemDay.ManhourID;//null if multiple values in one cell (sum)
            //
            self.ManhoursInMinutes = ko.observable(timeSheetItemDay.ManhoursInMinutes);
            self.ManhoursInMinutesString = ko.computed(function () {
                return timeManagementModule.getDatePaddedString(self.ManhoursInMinutes());
            });
            //
            self.ManhoursNormInMinutes = ko.computed(function () {
                var days = self.TimeSheetItem.TimeSheet.DayList();
                for (var y = 0; y < days.length; y++)//по всем описаниям дней в табеле
                    if (days[y].ID == self.TimeSheetDayID) //соответствующий столбец
                        return days[y].ManhoursNormInMinutes;
                //
                return 0;
            });
        },

        TimeSheetItem: function (timeManagementModule, timeSheet, timeSheetItem) {//BLL.TimeManagement\TimeSheetItem - строки таблицы
            if (timeSheet.ID != timeSheetItem.TimeSheetID)
                throw 'timeSheet does not contains this item';
            var self = this;
            //
            self.TimeSheet = timeSheet;
            //
            self.ObjectClassID = timeSheetItem.ObjectClassID;
            self.ObjectID = timeSheetItem.ObjectID;
            self.ObjectFullName = timeSheetItem.ObjectFullName;
            self.ObjectNumber = timeSheetItem.ObjectNumber;
            self.ObjectSummary = timeSheetItem.ObjectSummary;
            self.ObjectInitiatorID = timeSheetItem.ObjectInitiatorID;
            if (timeSheetItem.IsTemplate) {//для красоты
                var className = '';
                if (self.ObjectClassID == 701)//OBJ_CALL
                    className = getTextResource('Call');
                else if (self.ObjectClassID == 119)//OBJ_WORKORDER
                    className = getTextResource('WorkOrder');
                else if (self.ObjectClassID == 702)//OBJ_PROBLEM
                    className = getTextResource('Problem');
                else if (self.ObjectClassID == 371)//OBJ_Project
                    className = getTextResource('Project');
                //
                if (className != '')
                    self.ObjectFullName = className + ' ' + self.ObjectFullName;
            }
            //
            self.LinkObjectNumber = timeSheetItem.LinkObjectNumber;
            self.LinkObjectClassID = timeSheetItem.LinkObjectClassID;
            self.LinkObjectID = timeSheetItem.LinkObjectID;
            self.LinkObjectWorkflowSchemeID = timeSheetItem.LinkObjectWorkflowSchemeID;
            //
            self.IsTemplate = timeSheetItem.IsTemplate;
            self.LinkObjectOwnerID = timeSheetItem.LinkObjectOwnerID;
            self.LinkObjectExecutorID = timeSheetItem.LinkObjectExecutorID;
            //
            self.DayList = ko.observableArray([]);
            if (timeSheetItem.Days) {
                for (var i = 0; i < timeSheetItem.Days.length; i++) {
                    var day = new module.TimeSheetItemDay(timeManagementModule, self, timeSheetItem.Days[i])
                    self.DayList().push(day);
                }
                self.DayList.valueHasMutated();
            }
            //
            self.TotalManhoursByDaysInMinutes = ko.computed(function () {
                var retval = 0;
                for (var i = 0; i < self.DayList().length; i++)
                    retval += self.DayList()[i].ManhoursInMinutes();
                return retval;
            });
            self.TotalManhoursByDaysString = ko.computed(function () {
                return timeManagementModule.getDatePaddedString(self.TotalManhoursByDaysInMinutes());
            });
            //
            self.Checked = ko.observable(false);
        },

        TimeSheetNote: function (obj) {//BLL.TimeManagement\TimeSheetNote - комментарии табеля
            var self = this;
            //
            self.ID = obj.ID;
            self.LocalDate = parseDate(obj.UtcDateString);
            self.UserID = obj.UserID;
            self.UserFullName = obj.UserFullName;
            self.HTMLNote = obj.HTMLNote;
            self.IsReaded = ko.observable(obj.IsReaded === false ? false : true);
        },

        TimeSheetState: function (obj) {//BLL.TimeManagement\TimeSheetStateInfo - состояние табеля
            var self = this;
            //
            self.ID = obj.ID;
            self.Name = obj.Name;
        }
    }
    return module;
});
