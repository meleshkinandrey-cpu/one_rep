define(['knockout', 'jquery', 'ttControl', 'models/Filter/FilterElement', 'ajax', 'selectControl', 'dateTimeControl'], function (ko, $, tclib, feLib, ajaxLib, scLib, dtLib) {
    var module = {
        ShowAllAlias: getTextResource('_ALL_'),
        FilterDefaultName: getTextResource('FilterDefaultName'),
        ViewModel: function () {
            var self = this;
            var $isLoaded = $.Deferred();
            //
            self.tableModel = null; //модель таблицы, которой управляем
            //
            self.mode = {
                FiltersList: 0,
                NewFilter: 1
            };
            //
            self.SaveFilterResult = {
                Fail: 'Fail',
                Success: 'Success',
                NoItemsToSave: 'NoItemsToSave'
            };
            //
            self.currentTableView = function () {//return 2 params, Module and ViewName
                var retD = $.Deferred();
                $.when(userD).done(function (user) {
                    if (!self.tableModel || !self.tableModel.selectedItemsTemplate) {
                        retD.resolve({});
                        return;
                    }
                    //
                    var path = self.tableModel.selectedItemsTemplate;//hack
                    if (path.indexOf('SD') != -1)
                        retD.resolve({ module: 0, view: user.ViewNameSD }); //BLL.Modules.SD
                    else if (path.indexOf('Asset') != -1)
                        retD.resolve({ module: 1, view: user.ViewNameAsset }); //BLL.Modules.Asset
                    else if (path.indexOf('Finance') != -1)
                        retD.resolve({ module: 2, view: user.ViewNameFinance }); //BLL.Modules.Finance
                    else retD.resolve({});
                });
                return retD.promise();
            };
            //
            self.filterMode = ko.observable(self.mode.FiltersList);//сохраненные, редактирование или новый
            self.filterMode.subscribe(function (newValue) {
                $.when($isLoaded).done(function () {
                    if (newValue == self.mode.NewFilter) {
                        self.PrepareNewFilter();
                    }
                });
                //
                if (newValue == self.mode.FiltersList) {
                    self.LoadCurrentFilter();
                }
            });
            //
            self.OpenList = function () {
                if (self.filterMode() == self.mode.NewFilter)
                    self.filterMode(self.mode.FiltersList);
            };
            self.OpenNew = function () {
                if (self.filterMode() == self.mode.FiltersList)
                    self.filterMode(self.mode.NewFilter);
            };
            //
            self.filterList = ko.observableArray([]);
            self.standartFilterList = ko.computed(function () {
                var retval = [];
                ko.utils.arrayForEach(self.filterList(), function (filt) {
                    if (filt.Standart && filt.Name() != module.ShowAllAlias)
                        retval.push(filt);
                });
                //
                retval.sort(
                    function (left, right) {
                        return left.Name().toLowerCase() == right.Name().toLowerCase() ? 0 : (left.Name().toLowerCase() < right.Name().toLowerCase() ? -1 : 1);
                    }
                );
                //
                return retval;
            });
            self.userFilterList = ko.computed(function () {
                var retval = [];
                ko.utils.arrayForEach(self.filterList(), function (filt) {
                    if (!filt.Standart)
                        retval.push(filt);
                });
                //
                retval.sort(
                    function (left, right) {
                        return left.Name().toLowerCase() == right.Name().toLowerCase() ? 0 : (left.Name().toLowerCase() < right.Name().toLowerCase() ? -1 : 1);
                    }
                );
                //
                return retval;
            });
            self.lastFiltersList = ko.computed(function () {
                var retval = [];
                ko.utils.arrayForEach(self.filterList(), function (filt) {
                    if (filt.DateLastUsage() && filt.Name() != module.ShowAllAlias)
                        retval.push(filt);
                });
                //
                retval.sort(
                    function (left, right) {
                        return left.DateLastUsage() == right.DateLastUsage() ? 0 : (left.DateLastUsage() < right.DateLastUsage() ? 1 : -1);
                    }
                );
                //
                return retval.slice(0, 10);
            });
            //
            self.filterSaveTimeout = null;
            self.WaitToSaveFitler = function () {//при изменении значений автоматом вызовется процедура сохранения значений на серврере и перезагрузка списка
                clearTimeout(self.filterSaveTimeout);
                self.filterSaveTimeout = setTimeout(function () {
                    self.SetCurrentFilter(null, false);
                }, 200);
            };
            //
            self.WithFinishedWorkflow = ko.observable(false);//вместе с объектами, по которым завершены рабочие процедуры
            self.WithFinishedWorkflow.subscribe(self.WaitToSaveFitler);
            self.SetWithFinishedWorkflow = function (value) {
                self.WithFinishedWorkflow(value);
                clearTimeout(self.filterSaveTimeout);
                self.filterSaveTimeout = null;
            };
            //
            self.AfterDateModified = ko.observable(null);//js Date - дата (изменения), после которой показывать объекты
            self.AfterDateModified.subscribe(self.WaitToSaveFitler);
            self.AfterDateModifiedControl = '';//dateTimeControl
            //
            self.AfterDateModifiedString = ko.observable();//отображаемое значение даты (редактируемое поле ввода / контрол выбора даты)
            self.AfterDateModifiedString.subscribe(function (newValue) {
                if (self.AfterDateModifiedControl.$isLoaded.state() != 'resolved')
                    return;
                //
                var dt = self.AfterDateModifiedControl.dtpControl.length > 0 ? self.AfterDateModifiedControl.dtpControl.datetimepicker('getValue') : null;
                //
                if (!newValue || newValue.length == 0)
                    self.AfterDateModified(null);//clear field => reset value
                else if (dtLib.Date2String(dt, true) != newValue) {
                    self.AfterDateModified(null);//value incorrect => reset value
                    self.AfterDateModifiedString('');
                }
                else
                    self.AfterDateModified(dt);
            });
            //
            self.SetAfterDateModified = function (utcValue) {
                if (self.AfterDateModifiedControl.$isLoaded.state() != 'resolved')
                    return;
                //
                self.AfterDateModified(dtLib.StringIsDate(utcValue) ? new Date(getUtcDate(utcValue)) : null);//always dateTime, auto convert serverUtcDateString to jsLocalTime
                if (self.AfterDateModifiedControl.dtpControl.length > 0 && self.AfterDateModified())
                    self.AfterDateModifiedControl.dtpControl.datetimepicker('setOptions', { startDate: self.AfterDateModified(), value: self.AfterDateModified() });
                self.AfterDateModifiedString(dtLib.Date2String(self.AfterDateModified(), true));//always local string
                clearTimeout(self.filterSaveTimeout);
                self.filterSaveTimeout = null;
            };
            //
            self.currentFilter = ko.observable(null);
            self.currentFilter.subscribe(function (newValue) {
                $.when($isLoaded).done(function () {
                    if (newValue && !newValue.Standart)
                        self.PrepareEditFilter(newValue);
                });
            });
            self.IsCurrentFilterShowAll = ko.computed(function () {
                if (self.currentFilter() == null)
                    return false;
                //
                return self.currentFilter().Name() == module.ShowAllAlias;
            });
            self.CurrentFilterDescription = ko.computed(function () {
                if (self.currentFilter() == null || self.IsCurrentFilterShowAll() || !self.currentFilter().Standart)
                    return '';
                //
                return self.currentFilter().Description;
            });
            //
            self.mainSpinnerActive = 0;
            self.HideSpinnerFilters = function () {
                if (self.mainSpinnerActive !== 0) {
                    hideSpinner($('.b-content-table__filter-container')[0]);
                    self.mainSpinnerActive -= 1;
                }
            };
            self.ShowSpinnerFilters = function () {
                if (self.mainSpinnerActive === 0) {
                    showSpinner($('.b-content-table__filter-container')[0]);
                    self.mainSpinnerActive = 1;
                }
                else self.mainSpinnerActive += 1;
            };
            //
            self.ajaxControl_setCurrentFilter = new ajaxLib.control();
            self.SetCurrentFilter = function (newFilter, isTemp) {
                var retD = $.Deferred();
                //
                $.when($isLoaded).done(function () {
                    self.ShowSpinnerFilters();
                    //
                    if (self.tableModel) {
                        self.tableModel.columnList.removeAll();
                        self.tableModel.rowList.removeAll();
                        self.tableModel.isLoading(true);
                    }
                    //
                    $.when(self.currentTableView()).done(function (curViewInfo) {
                        showSpinner($('#regionFilters')[0]);
                        var param = {
                            viewName: curViewInfo.view,
                            filterIDString: newFilter ? newFilter.ID : (self.currentFilter() ? self.currentFilter().ID : ''),
                            isTemp: isTemp,
                            withFinishedWorkflow: self.WithFinishedWorkflow(),
                            afterModifiedMilliseconds: dtLib.GetMillisecondsSince1970(self.AfterDateModified()),
                            module: curViewInfo.module
                        };
                        self.ajaxControl_setCurrentFilter.Ajax(null,
                            {
                                url: 'accountApi/setCurrentFilter?' + $.param(param),
                                method: 'POST'
                            },
                            function (response) {
                                hideSpinner($('#regionFilters')[0]);
                                if (response === 0) {
                                    if (newFilter) {
                                        if (self.currentFilter())
                                            self.currentFilter().Selected(false);
                                        self.currentFilter(newFilter);
                                        //
                                        newFilter.Selected(true);
                                    }
                                    //
                                    if (self.tableModel) {
                                        self.tableModel.ScrollUp();
                                        $.when(self.tableModel.Reload()).done(function () {
                                            self.tableModel.isLoading(false);
                                            retD.resolve();
                                        });
                                    }
                                    else retD.resolve();
                                }
                                else {
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('FilterImplementError'), getTextResource('AjaxError') + '\n[Filters.js, SetCurrentFilter]', 'error');
                                    });
                                    retD.resolve();
                                }
                            }, null, function () {
                                self.HideSpinnerFilters();
                            });
                    });
                });
                //
                return retD.promise();
            };
            //
            self.newFilterModel = ko.observable(null);
            self.PrepareNewFilter = function () {
                $.when($isLoaded).done(function () {
                    if (self.newFilterModel && self.newFilterModel())
                        self.newFilterModel().Clear();
                    else self.newFilterModel(new feLib.ViewModel(self, $('.b-content-table__filter-container-newFilter')));
                    //
                    self.newFilterModel().RenameAction = null;
                    self.newFilterModel().filterName('');
                    //
                    $.when(self.newFilterModel().LoadFullList()).done(function () {
                        self.newFilterModel().CreateEditor();
                    });
                });
            };
            //
            self.editFilterModel = ko.observable(null);
            self.PrepareEditFilter = function (editedFilter) {
                $.when($isLoaded).done(function () {
                    if (self.editFilterModel && self.editFilterModel())
                        self.editFilterModel().Clear();
                    else self.editFilterModel(new feLib.ViewModel(self, $('.b-content-table__filter-container-filterView')));
                    //
                    self.editFilterModel().RenameAction = null;
                    self.editFilterModel().filterName(editedFilter.Name());
                    self.editFilterModel().RenameAction = self.TryRenameEditFilter;
                    //
                    $.when(self.editFilterModel().LoadFullList()).done(function () {
                        self.editFilterModel().LoadElementsByFilter(editedFilter.ID);
                    });
                });
            };
            //
            self.ajaxControl_renameEditFilter = new ajaxLib.control();
            self.filterRenameTimeout = null;
            self.TryRenameEditFilter = function (newName) {
                clearTimeout(self.filterRenameTimeout);
                self.filterRenameTimeout = setTimeout(function () {
                    if (self.currentFilter() && self.currentFilter().ID)
                        self.RenameEditFilter(newName, self.currentFilter().ID);
                }, 3000);
            };
            self.RenameEditFilter = function (newName, filterID) {
                var returnD = $.Deferred();
                //
                var filterToRename = ko.utils.arrayFirst(self.filterList(), function (f) {
                    return f.ID == filterID;
                });
                //
                if (!newName || !filterToRename || filterToRename.Name() == newName)
                    returnD.resolve(false);
                else $.when($isLoaded).done(function () {
                    var param = {
                        newName: newName,
                        filterId: filterID
                    };
                    //
                    self.ShowSpinnerFilters();
                    //
                    self.ajaxControl_renameEditFilter.Ajax(null,
                        {
                            dataType: "json",
                            method: 'POST',
                            url: 'filterApi/RenameFilter?' + $.param(param)
                        },
                        function (response) {
                            if (response && response.Result === 0) {
                                filterToRename.Name(newName);
                                //
                                returnD.resolve(true);
                            }
                            else {
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('FilterRenameError'), response && response.Message ? response.Message : getTextResource('SaveError'), 'error');
                                });
                                returnD.resolve(false);
                            }
                        }, null, function () {
                            self.HideSpinnerFilters();
                        });
                });
                return returnD.promise();
            };
            //
            self.SelectFilter = function (filter) {
                if (!filter)
                    return;
                //
                self.SetCurrentFilter(filter, false, false);
                filter.DateLastUsage(Date.now());
            };
            self.SelectFilterNotFromControl = function (filter) {
                if (!filter)
                    return;
                //
                self.SelectFilter(filter);
            };
            //
            self.ajaxControl_delete = new ajaxLib.control();
            self.DeleteFilter = function (filter) {
                if (!filter)
                    return;
                //
                require(['sweetAlert'], function () {
                    swal({
                        title: getTextResource('FilterDelete') + " '" + filter.Name() + "'",
                        text: getTextResource('FilterDeleteQuestion'),
                        showCancelButton: true,
                        closeOnConfirm: false,
                        closeOnCancel: true,
                        confirmButtonText: getTextResource('ButtonOK'),
                        cancelButtonText: getTextResource('ButtonCancel')
                    },
                    function (value) {
                        if (value == true) {
                            $.when(self.currentTableView()).done(function (curViewInfo) {
                                var param = {
                                    viewName: curViewInfo.view,
                                    module: curViewInfo.module,
                                    filterId: filter.ID
                                };
                                //
                                self.ShowSpinnerFilters();
                                self.ajaxControl_delete.Ajax(null,
                                    {
                                        dataType: 'json',
                                        url: 'filterApi/DeleteFilter?' + $.param(param),
                                        method: 'POST'
                                    },
                                    function (response) {
                                        if (response === false)
                                            swal(getTextResource('FilterDelete'), getTextResource('AjaxError') + '\n[Filters.js, deleteFilter]', 'error');
                                        else {
                                            swal.close();
                                            self.Load();
                                        }
                                    }, null, function () {
                                        self.HideSpinnerFilters();
                                    });
                            });
                        }
                    });
                });
            };
            //
            self.ajaxControl_load = new ajaxLib.control();
            self.Load = function () {
                var returnD = $.Deferred();
                //
                $.when(self.currentTableView(), $isLoaded).done(function (curViewInfo) {
                    self.filterList.removeAll();
                    self.currentFilter(null);
                    self.filterMode(self.mode.FiltersList);
                    //
                    var param = {
                        viewName: curViewInfo.view,
                        module: curViewInfo.module
                    };
                    //
                    self.ShowSpinnerFilters();
                    self.ajaxControl_load.Ajax(null,
                        {
                            dataType: "json",
                            method: 'GET',
                            url: 'filterApi/GetFilters?' + $.param(param)
                        },
                        function (newData) {
                            if (newData != null) {
                                newData.forEach(function (el) {
                                    self.filterList().push(new module.Filter(el));
                                });
                                //
                                //self.filterList.sort(function (left, right) {
                                //    return left.Name() == right.Name() ? 0 : (left.Name() < right.Name() ? -1 : 1);
                                //});
                                self.filterList.valueHasMutated();
                                //
                                $.when(self.LoadCurrentFilter()).done(function () {
                                    returnD.resolve();
                                });
                            }
                            else returnD.resolve();
                        }, null, function () {
                            self.HideSpinnerFilters();
                        });
                });
                //
                return returnD.promise();
            };
            //
            self.ajaxControl_load_current = new ajaxLib.control();
            self.LoadCurrentFilter = function () {
                var retD = $.Deferred();
                //
                $.when(self.currentTableView()).done(function (curViewInfo) {
                    var param = {
                        viewName: curViewInfo.view,
                        module: curViewInfo.module
                    };
                    //
                    self.ShowSpinnerFilters();
                    //
                    self.ajaxControl_load_current.Ajax(null,
                        {
                            url: 'accountApi/getCurrentFilter?' + $.param(param),
                            method: 'GET'
                        },
                        function (response) {//FilterData
                            if (response && response.Result == 0)//success
                            {
                                self.SetWithFinishedWorkflow(response.WithFinishedWorkflow);
                                //
                                var filter = response.Filter;
                                if (filter && filter.ID) {
                                    var elem = ko.utils.arrayFirst(self.filterList(), function (item) {
                                        return item.ID == filter.ID;
                                    });
                                    if (elem) {
                                        self.currentFilter(elem);
                                        elem.Selected(true);
                                    }
                                }
                                //
                                $.when(self.AfterDateModifiedControl.$isLoaded).done(function () {
                                    self.SetAfterDateModified(response.AfterUtcModified);
                                    retD.resolve();
                                });
                            }
                            else retD.resolve();
                        }, null, function () {
                            self.HideSpinnerFilters();
                        });
                });
                //
                return retD.promise();
            };
            //
            self.ajaxControl_saveFilter = new ajaxLib.control();
            self.SaveFilter = function (filterID, filterName, isTemp, filterElementsCollection, onNewFilterAction) {
                if (isTemp == null)
                    isTemp = false;
                //
                var returnD = $.Deferred();
                //
                if (!isTemp && filterName == '') {
                    var i = 1;
                    while (ko.utils.arrayFirst(self.filterList(), function (f) { return f.Name() == (module.FilterDefaultName + ' ' + i); }) != null) {
                        i++;
                    }
                    //
                    filterName = module.FilterDefaultName + ' ' + i;
                }
                //
                if (filterElementsCollection.length <= 0) {
                    if (!isTemp)
                        require(['sweetAlert'], function () {
                            swal(getTextResource('FilterSaveError'), getTextResource('NoElementsToSave'), 'info');
                        });
                    returnD.resolve(self.SaveFilterResult.NoItemsToSave);
                }
                else {
                    var plainJs = ko.toJS(filterElementsCollection);
                    //
                    $.when(self.currentTableView()).done(function (curViewInfo) {
                        var param = {
                            viewName: curViewInfo.view,
                            module: curViewInfo.module,
                            filterName: filterName ? filterName : null,
                            filterId: filterID,
                            isTemp: isTemp
                        };
                        //
                        self.ShowSpinnerFilters();
                        //
                        self.ajaxControl_saveFilter.Ajax($('#regionFilters'),
                            {
                                dataType: "json",
                                method: 'POST',
                                url: 'filterApi/PostFilter?' + $.param(param),
                                data: JSON.stringify(plainJs)
                            },
                            function (fromServer) {
                                if (fromServer) {
                                    var response = fromServer.Response;
                                    if (response) {
                                        if (response.Result == 0) {
                                            returnD.resolve(self.SaveFilterResult.Success);
                                            var newFilter = new module.Filter(fromServer.NewFilter);
                                            //
                                            var existed = ko.utils.arrayFirst(self.filterList(), function (el) {
                                                return el.ID == newFilter.ID;
                                            });
                                            if (!existed)
                                                self.filterList().push(newFilter);
                                            //
                                            //self.filterList.sort(function (left, right) {
                                            //    return left.Name() == right.Name() ? 0 : (left.Name() < right.Name() ? -1 : 1);
                                            //});
                                            self.filterList.valueHasMutated();
                                            //
                                            if (onNewFilterAction && !isTemp && !filterID)
                                                onNewFilterAction(newFilter);
                                        }
                                        else {
                                            if (!isTemp)
                                                require(['sweetAlert'], function () {
                                                    swal(getTextResource('FilterSaveError'), response.Message, 'error');
                                                });
                                            returnD.resolve(self.SaveFilterResult.Fail);
                                        }
                                    }
                                    else returnD.resolve(self.filterMainModel.Fail);
                                }
                                else returnD.resolve(self.filterMainModel.Fail);
                            }, null, function () {
                                self.HideSpinnerFilters();
                            });
                    });
                }
                //
                return returnD.promise();
            };
            //
            self.NeedShowTopPart = ko.observable(false);
            self.NeedShowBottomPart = ko.computed(function () {
                return true;
            });
            self.IsCurrentFilterActive = function () {//для реакции на события сервера в списке
                return false;
            };
            //
            self.AfterRender = function () {
                $isLoaded.resolve();
                //
                $.when(self.currentTableView()).done(function (curViewInfo) {
                    var $dtp = $('.region-Filtration').find('.dtpAfterDateModified');
                    //
                    self.AfterDateModifiedControl = new dtLib.control();
                    self.AfterDateModifiedControl.init($dtp, {
                        OnlyDate: true,
                        StringObservable: self.AfterDateModifiedString,
                        ValueDate: self.AfterDateModified(),
                        OnSelectDateFunc: function (current_time, $input) {
                            self.AfterDateModified(current_time);
                            self.AfterDateModifiedString(dtLib.Date2String(current_time, true));
                        },
                        OnSelectTimeFunc: function (current_time, $input) {
                            self.AfterDateModified(current_time);
                            self.AfterDateModifiedString(dtLib.Date2String(current_time, true));
                        },
                        HeaderText: getTextResource('Filter_ShowModifiedAfter')
                    });
                    //
                    if (curViewInfo.module == 0 ||//BLL.Modules.SD
                        curViewInfo.module == 1 && curViewInfo.view == 'Inventories')//BLL.Modules.Asset
                        self.NeedShowTopPart(true);
                    else self.NeedShowTopPart(false);
                });
            };
            //
            self.CalculateBodyTopPosition = ko.computed(function () {
                if (self.NeedShowTopPart())
                    return 60 + 50 + 'px';
                else return 60 + 'px';
            });
            self.CalculateBodyBottomPosition = ko.computed(function () {
                if (self.NeedShowBottomPart())
                    return 90 + 'px';
                else return 0;
            });
            //
            self.CreateNewVisible = ko.computed(function () {
                return self.filterMode() == self.mode.FiltersList;
            });
            self.CreateNewClick = function () {
                var filter = ko.utils.arrayFirst(self.filterList(), function (item) {
                    return item != null && item.Name() == module.ShowAllAlias;
                });
                //
                self.SelectFilterNotFromControl(filter);
                self.OpenNew();
            };
            //
            self.ResetVisible = ko.computed(function () {
                if (!self.currentFilter())
                    return false;
                //
                if (self.IsCurrentFilterShowAll())
                    return false;
                //
                return true;
            });
            self.ResetClick = function () {
                var filter = ko.utils.arrayFirst(self.filterList(), function (item) {
                    return item != null && item.Name() == module.ShowAllAlias;
                });
                //
                if (filter)
                    self.SelectFilterNotFromControl(filter);
            };
            //            
            self.EditFilter = function (filter) {
                self.SelectFilterNotFromControl(filter);
                self.OpenNew();
            };
            //
            self.SaveEditVisible = ko.computed(function () {
                var curFilter = self.currentFilter();
                if (!curFilter || curFilter.Standart)
                    return false;
                //
                return true;
            });
            self.SaveEditClick = function () {
                var curFilter = self.currentFilter();
                if (!curFilter || curFilter.Standart || !self.editFilterModel())
                    return;
                //
                var fName = curFilter.Name();
                var fID = curFilter.ID;
                var fElements = self.editFilterModel().GetValueFromEditors();
                //
                $.when(self.SaveFilter(fID, fName, false, fElements)).done(function (result) {
                    if (result == self.SaveFilterResult.Success) {
                        if (self.tableModel) {
                            self.ShowSpinnerFilters();
                            //
                            self.tableModel.columnList.removeAll();
                            self.tableModel.rowList.removeAll();
                            self.tableModel.isLoading(true);
                            self.tableModel.ScrollUp();
                            $.when(self.tableModel.Reload()).done(function () {
                                self.tableModel.isLoading(false);
                                //
                                self.HideSpinnerFilters();
                            });
                        }
                    }
                });
            };
            //
            self.NewFilterCancelVisible = ko.computed(function () {
                return self.newFilterModel && self.newFilterModel();
            });
            self.NewFilterCancelClick = function () {
                if (self.newFilterModel && self.newFilterModel())
                    self.newFilterModel().Clear();
                //
                self.OpenList();
            };
            //
            self.NewFilterClearVisible = ko.computed(function () {
                if (self.newFilterModel && self.newFilterModel() && self.newFilterModel().HaveEditors())
                    return true;
                //
                return false;
            });
            self.NewFilterClearClick = function () {
                if (self.newFilterModel && self.newFilterModel())
                    self.newFilterModel().Clear();
            };
            //
            self.NewFilterSaveVisible = ko.computed(function () {
                if (self.newFilterModel && self.newFilterModel() && self.newFilterModel().CanBeSaved())
                    return true;
                //
                return false;
            });
            self.NewFilterSaveClick = function () {
                if (!self.newFilterModel || !self.newFilterModel() || !self.newFilterModel().CanBeSaved())
                    return;
                //
                var fName = self.newFilterModel().filterName();
                var fID = null;
                var fElements = self.newFilterModel().GetValueFromEditors();
                //
                var onFilterAdded = function (filter) {
                    if (filter)
                        self.SelectFilter(filter);
                };
                $.when(self.SaveFilter(fID, fName, false, fElements, onFilterAdded)).done(function (result) {
                    if (result == self.SaveFilterResult.Success)
                        self.OpenList();
                });
            };
        },
        Filter: function (obj) {
            var self = this;
            //
            self.Name = ko.observable(obj.Name);
            self.Selected = ko.observable(false);
            self.DateLastUsage = ko.observable(obj.UtcDateLastUsage);
            //
            self.ViewName = obj.ViewName;
            self.Description = obj.Description;
            self.ID = obj.ID;
            self.UserID = obj.UserID;
            //
            if (obj.Standart != null)
                self.Standart = obj.Standart;
            else
                self.Standart = false;
        }
    };
    return module;
});