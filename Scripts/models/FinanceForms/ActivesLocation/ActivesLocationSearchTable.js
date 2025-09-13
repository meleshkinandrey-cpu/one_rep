define(['knockout', 'jquery', 'ajax', 'models/Table/TableParts', 'dateTimeControl', 'comboBox'], function (ko, $, ajaxLib, tpLib, dtLib) {
    var module = {
        ViewModel: function ($regionTable) {
            var self = this;
            self.ajaxControl = new ajaxLib.control();
            //
            //self.resizeFunc = null;
            self.workOrderID = null;
            self.selectedPurchaseSpecificationList = null;
            //
            self.selectedItemsModel = ko.observable(null); //модель свойств выделенных объектов, тут всегда не задана из-за шаблона
            self.OnSelectedRow = null;//set in AssetModelLink.js
            self.OnDeselectedRow = null;//set in AssetModelLink.js
            self.CheckRowSelection = null;//set in AssetModelLink.js
            self.HideShowLocateBtn = null;//set in AssetModelLink.js
            self.OnResize = null;
            //
            var $operationsLoadedD = $.Deferred();
            self.searchPhraseObservable = ko.observable('');//set in AssetModelLink.js
            //
            self.createColumn = null;//set in columns.js
            self.columnList = ko.observableArray([]);
            self.TableWidth = ko.computed(function () {//для синхронного размера шапки и самой таблицы
                var retval = 2;
                //
                for (var i = 0; i < self.columnList().length; i++) {
                    var column = self.columnList()[i];
                    if (column.Visible() == true)
                        retval += column.Width();
                }
                //
                return retval;
            });
            //
            self.rowList = ko.observableArray([]);
            self.rowHashList = {};//для быстрого поиска строки по идентификатору объекта
            //
            self.viewName = 'GoodsInvoiceSpecificationSearch';
            self.isLoading = ko.observable(false);//скрываем текст "Список пуст", если список грузится
            self.isAppendRequestAvailable = ko.observable(false);
            //
            self.ShowForm = function (cell) {
                self.MarkRow(cell.Row.ID, false, 'modified');
                self.MarkRow(cell.Row.ID, false, 'highlight');
                //
            };
            //
            self.GetOrCreateRow = function (id, classID, addToBeginOfList, realObjectID, operationInfo) {
                id = id.toUpperCase();
                self.ClearInfoByObject(id);
                //
                var isNew = false;
                var row = self.rowHashList[id];
                if (!row) {
                    row = self.rowHashList[id] = new tpLib.createRow(id, classID, realObjectID, operationInfo, self.ShowForm, self.RowSelectedChanged, self.thumbResizeCatch, self.moveTrumbData);
                    if (addToBeginOfList == true)
                        self.rowList().unshift(row);
                    else
                        self.rowList().push(row);
                    isNew = true;
                }
                else
                    row.OperationInfo = operationInfo;
                //
                if (self.CheckRowSelection && self.CheckRowSelection(realObjectID ? realObjectID : id))
                    row.Checked(true);
                //
                return {
                    row: row,
                    isNew: isNew
                };
            };
            //
            self.IsSelectAllWorking = false;
            self.SelectAllClick = function (item, event) {
                var checking = $regionTable.find('.b-content-table__th-checkbox').is(':checked');
                self.IsSelectAllWorking = true;
                //
                for (var i = 0; i < self.rowList().length; i++) {
                    var row = self.rowList()[i];
                    row.Checked(checking);
                }
                if (checking && self.OnSelectedRow)
                    self.OnSelectedRow(self.rowList());
                else if (!checking && self.OnDeselectedRow)
                    self.OnDeselectedRow(self.rowList());
                //
                self.IsSelectAllWorking = false;
                return true;
            };
            //
            self.MarkRow = function (objectID, addMode, cssClass) {
                var obj = $('#' + objectID);
                if (obj.length == 0)
                    return false;
                //
                if (addMode) {
                    if (!obj.hasClass(cssClass))
                        obj.addClass(cssClass);
                }
                else {
                    if (obj.hasClass(cssClass))
                        obj.removeClass(cssClass);
                }
                return true;
            };
            self.RemoveRow = function (id) {
                id = id.toUpperCase();
                var row = self.rowHashList[id];
                if (row) {
                    self.rowHashList[id] = null;
                    //
                    var index = self.rowList().indexOf(row);
                    if (index == -1)
                        return;//в кеше строка есть, а по факту нет - не может быть!
                    else {
                        self.rowList().splice(index, 1);
                        self.rowList.valueHasMutated();
                    }
                }
            };
            self.ClearInfoByObject = function (id) {
                id = id.toUpperCase();
                var index = self.ModifiedObjectIDs().indexOf(id);
                if (index > -1) {
                    self.ModifiedObjectIDs().splice(index, 1);//попали сюда - нет необходимости отображать уведомление
                    self.ModifiedObjectIDs.valueHasMutated();
                }
            };
            //
            self.RowSelectedChanged = function (row, isAdd) {
                if (!row || self.IsSelectAllWorking)
                    return;
                //
                if (isAdd && self.OnSelectedRow)
                    self.OnSelectedRow([row]);
                else if (!isAdd && self.OnDeselectedRow)
                    self.OnDeselectedRow([row]);
            };
            //
            self.ClearSelection = function () {
                if (!self.selectedItemsModel())
                    return;
                self.selectedItemsModel().ClearSelection();
            };
            //
            self.moveTrumbData = ko.observable(null);
            self.moveThumbCancelTime = (new Date()).getTime();
            self.moveTrumbData.subscribe(function (newValue) {
                if (newValue) {
                    var column = newValue.column;
                    if (self.columnList().indexOf(column) == self.columnList().length - 1) {
                        column.Width(column.Width() + 200);
                    }
                }
                else
                    self.moveThumbCancelTime = (new Date()).getTime();
            });
            self.cancelThumbResize = function () {
                if (self.moveTrumbData() != null) {
                    var column = self.moveTrumbData().column;
                    column.showResizeThumb(false);
                    self.moveTrumbData(null);
                }
            }
            self.thumbResizeCatch = function (column, e) {
                if (e.button == 0) {
                    self.moveTrumbData({ column: column, startX: e.screenX, startWidth: column.Width() });
                    self.moveTrumbData().column.showResizeThumb(true);
                }
                else
                    self.cancelThumbResize();
            };
            $(document).bind('mousemove', function (e) {
                if (self.moveTrumbData() != null) {
                    var dx = e.screenX - self.moveTrumbData().startX;
                    self.moveTrumbData().column.Width(Math.max(self.moveTrumbData().startWidth + dx, 50));
                    self.moveTrumbData().column.showResizeThumb(true);
                }
            });
            $(document).bind('mouseup', function (e) {
                self.cancelThumbResize();
            });
            //
            self.SyncLoad = null;
            self.Load = function () {
                self.SyncAppend = null;//cancel append blocking
                //
                var returnD = $.Deferred();
                if (self.SyncLoad) {
                    returnD.resolve();
                    return returnD.promise();
                }
                self.SyncLoad = true;
                //
                self.ClearSelection();
                //
                var count = 30;
                var curFilterID = null;
                var withFinishedWf = false;
                var afterDayModMS = null;
                var treeParams = null;
                //
                var requestInfo = {
                    StartRecordIndex: 0,
                    CountRecords: count,
                    IDList: [],
                    ViewName: self.viewName,
                    TimezoneOffsetInMinutes: new Date().getTimezoneOffset(),
                    CurrentFilterID: curFilterID,
                    WithFinishedWorkflow: withFinishedWf,
                    AfterModifiedMilliseconds: afterDayModMS,
                    TreeSettings: treeParams,
                    SearchRequest: self.searchPhraseObservable ? self.searchPhraseObservable() : null,
                    TypeID: null,
                    ModelsID: null,
                    VendorsID: null,
                    LocationID: null,
                    LocationClassID: null,
                    ParentObjectID: self.workOrderID
                };
                self.ajaxControl.Ajax($regionTable,
                    {
                        dataType: "json",
                        method: 'POST',
                        data: requestInfo,
                        url: 'finApi/GetGoodsInvoiceSpecificationSearchListForTable'
                    },
                    function (newVal) {
                        if (newVal && newVal.Result === 0) {
                            if (newVal.DataList) {
                                self.columnList.removeAll();
                                self.rowList.removeAll();
                                self.rowHashList = {};
                                self.ModifiedObjectIDs.removeAll();
                                //
                                self.selectedPurchaseSpecificationList = newVal.ExtraData;
                                //
                                $.each(newVal.DataList, function (index, columnWithData) {
                                    if (columnWithData && columnWithData.ColumnSettings && columnWithData.Data) {
                                        var column = self.createColumn(columnWithData.ColumnSettings);//set in Columns.js
                                        self.columnList().push(column);
                                        //
                                        var data = columnWithData.Data;
                                        for (var i = 0; i < data.length; i++) {
                                            var realObjectID = newVal.ObjectIDList ? newVal.ObjectIDList[i] : null;
                                            var rowInfo = self.GetOrCreateRow(newVal.IDList[i], newVal.ClassIDList[i], false, realObjectID, newVal.OperationInfoList[i]);
                                            rowInfo.row.AddCell(column, data[i].Text, data[i].ImageSource);
                                        }
                                    }
                                });
                                //                                                 
                                self.columnList.valueHasMutated();
                                self.rowList.valueHasMutated();
                                self.ModifiedObjectIDs.valueHasMutated();
                                self.RefreshArrows();
                                self.isAppendRequestAvailable(self.rowList().length >= count);
                            }
                        }
                        else if (newVal && newVal.Result === 1) {
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[AssetModelSearchTable.js Load]', 'error');
                            });
                        }
                        else if (newVal && newVal.Result === 2) {
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('BadParamsError') + '\n[AssetModelSearchTable.js Load]', 'error');
                            });
                        }
                        else if (newVal && newVal.Result === 3) {
                            require(['sweetAlert'], function () {
                                swal(getTextResource('AccessError_Table'));
                            });
                        }
                        else if (newVal && newVal.Result === 7) {
                            require(['sweetAlert'], function () {
                                swal(getTextResource('OperationError_Table'));
                            });
                        }
                        else if (newVal && newVal.Result === 9) {
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('FiltrationError'), 'error');
                            });
                        }
                        else if (newVal && newVal.Result === 11) {
                            require(['sweetAlert'], function () {
                                swal(getTextResource('SqlTimeout'));
                            });
                        }
                        else {
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('AjaxError') + '\n[AssetModelSearchTable.js Load]', 'error');
                            });
                        }
                        //
                        self.SyncLoad = null;
                        returnD.resolve();
                    },
                    function (XMLHttpRequest, textStatus, errorThrown) {
                        require(['sweetAlert'], function () {
                            swal(getTextResource('ErrorCaption'), getTextResource('AjaxError') + '\n[AssetTable.js, Load]', 'error');
                        });
                        //
                        self.SyncLoad = null;
                        returnD.resolve();
                    },
                    null
                );
                //
                return returnD.promise();
            };
            //
            self.SyncAppend = null;
            self.scrollPosition = 0;
            self.OnScroll = function () {
                self.scrollPosition = 100 * this.scrollTop / (this.scrollHeight - this.clientHeight);
                $regionTable.find('.tableHeader').css('margin-left', -this.scrollLeft);
                //
                var tableHeight = $regionTable.find('.tableScroll .b-content-table__table').height();
                var viewTableHeight = $regionTable.find('.tableScroll').height();
                var loadingFooterHeight = $regionTable.find('.tableScroll .loadingFooter').height();
                var scrollTop = this.scrollTop;
                //
                if (scrollTop + viewTableHeight >= tableHeight - loadingFooterHeight && !self.SyncAppend) {
                    self.SyncAppend = true;
                    try {
                        var countBefore = self.rowList().length;
                        $.when(self.AppendOrUpdate()).done(function () {
                            if (self.rowList().length == countBefore)
                                setTimeout(function () {//докрутили до конца списка, больше данных нет - не дадим ничего подгpужать 10 сек
                                    self.SyncAppend = null;
                                }, 10000);
                            else
                                self.SyncAppend = null;
                        });
                    }
                    catch (e) { self.SyncAppend = null; }
                }
            };
            //
            self.LoadRows = function (objectIDList, scrollToUp) {
                if (!self.SyncAppend && objectIDList) {
                    self.SyncAppend = true;
                    try {
                        var scrollPositionBefore = self.scrollPosition;
                        $.when(self.AppendOrUpdate(objectIDList)).done(function (newRowsCount) {
                            self.SyncAppend = null;
                            //
                            if (newRowsCount > 0 && scrollToUp == true)//при загрузке появились новые данные (есть доступ к ним), нужно прокрутить до новых данных
                                setTimeout(function () {
                                    if (self.scrollPosition != scrollPositionBefore)
                                        return;//прокручиваем или прокрутили
                                    //
                                    self.ScrollUp();
                                }, 1000);
                        });
                    }
                    catch (e) { self.SyncAppend = null; }
                }
            };
            self.LoadModifiedObjects = function () {//вызывается при клике на количество измененных объектов
                if (self.SyncAppend == true) //сейчас прокручивается список или подгружаются другие объекты - новые грузить не можем
                    return;
                //
                var idList = [];
                for (var i = 0; i < self.ModifiedObjectIDs().length; i++)
                    idList.push(self.ModifiedObjectIDs()[i]);
                //
                if (idList.length > 0)
                    self.LoadRows(idList, true);
            };
            //
            self.AppendOrUpdate = function (objectIDList) {
                var returnD = $.Deferred();
                //
                var curFilterID = null;
                var withFinishedWf = false;
                var afterDayModMS = null;
                var treeParams = null;
                //
                var rowsCount = self.rowList().length;
                var count = 15;
                var requestInfo = {
                    StartRecordIndex: rowsCount,
                    CountRecords: count,
                    IDList: objectIDList,
                    ViewName: self.viewName,
                    TimezoneOffsetInMinutes: new Date().getTimezoneOffset(),
                    CurrentFilterID: curFilterID,
                    WithFinishedWorkflow: withFinishedWf,
                    AfterModifiedMilliseconds: afterDayModMS,
                    TreeSettings: treeParams,
                    SearchRequest: self.searchPhraseObservable ? self.searchPhraseObservable() : null,
                    TypeID: null,
                    ModelsID: null,
                    VendorsID: null,
                    LocationID: null,
                    LocationClassID: null,
                    ParentObjectID: self.workOrderID
                };
                self.ajaxControl.Ajax(null,
                    {
                        dataType: "json",
                        method: 'POST',
                        data: requestInfo,
                        url: 'finApi/GetGoodsInvoiceSpecificationSearchListForTable'
                    },
                    function (newVal) {
                        if (newVal && newVal.Result === 0) {
                            if (newVal.DataList) {
                                var firstTime = true;
                                var updatedRows = [];
                                var newRowsCount = 0;
                                var cloneObjectIDList = objectIDList ? JSON.parse(JSON.stringify(objectIDList)) : [];//копия для того, чтобы узнать, что теперь не возвращается сервером из запрошенных ids
                                $.each(newVal.DataList, function (index, columnWithData) {
                                    if (columnWithData && columnWithData.ColumnSettings && columnWithData.Data) {
                                        var column = self.columnList()[index];
                                        var data = columnWithData.Data;
                                        //
                                        for (var i = requestInfo.StartRecordIndex, j = 0; i < data.length + requestInfo.StartRecordIndex; i++, j++) {
                                            var id = newVal.IDList[j];
                                            var realObjectID = newVal.ObjectIDList ? newVal.ObjectIDList[j] : null;
                                            var rowInfo = self.GetOrCreateRow(id, newVal.ClassIDList[j], objectIDList ? true : false, realObjectID, newVal.OperationInfoList[j]);//если загружаем по требованию определенные id - добавляем их в начало списка
                                            if (rowInfo.isNew)
                                                newRowsCount++;
                                            if (!rowInfo.isNew && firstTime) {
                                                rowInfo.row.Cells.removeAll();
                                                self.MarkRow(rowInfo.row.ID, false, 'modified');
                                                updatedRows.push(rowInfo.row);
                                            }
                                            if (firstTime) {
                                                if (objectIDList) {
                                                    var index = cloneObjectIDList.indexOf(id.toUpperCase());//отметим, чтобы понимать, что загрузили, а что не загрузили
                                                    if (index > -1)
                                                        cloneObjectIDList.splice(index, 1);
                                                }
                                            }
                                            rowInfo.row.AddCell(column, data[j].Text, data[j].ImageSource);
                                        }
                                        firstTime = false;
                                    }
                                });
                                //                                
                                if (objectIDList && cloneObjectIDList.length > 0) {//остались те, что мы запрашивали, но которые не загрузились
                                    for (var i = 0; i < cloneObjectIDList.length; i++) {
                                        var id = cloneObjectIDList[i];
                                        self.RemoveRow(id);
                                        self.ClearInfoByObject(id);
                                    }
                                }
                                //
                                self.columnList.valueHasMutated();
                                self.rowList.valueHasMutated();
                                for (var i = 0; i < updatedRows.length; i++)
                                    updatedRows[i].Cells.valueHasMutated();
                                self.ModifiedObjectIDs.valueHasMutated();
                                //
                                if (objectIDList)
                                    setTimeout(function () {
                                        for (var i = 0; i < objectIDList.length; i++)
                                            self.MarkRow(objectIDList[i], true, 'highlight');
                                    }, 1000);//отрисует knockout (можно подписаться на его событие, но сложнее)
                                else if (newRowsCount == 0)
                                    self.isAppendRequestAvailable(false);
                            }
                        }
                        else if (newVal && newVal.Result === 1) {
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[AssetModelSearchTable.js AppendOrUpdate]', 'error');
                            });
                        }
                        else if (newVal && newVal.Result === 2) {
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('BadParamsError') + '\n[AssetModelSearchTable.js AppendOrUpdate]', 'error');
                            });
                        }
                        else if (newVal && newVal.Result === 3) {
                            require(['sweetAlert'], function () {
                                swal(getTextResource('AccessError_Table'));
                            });
                        }
                        else if (newVal && newVal.Result === 7) {
                            require(['sweetAlert'], function () {
                                swal(getTextResource('OperationError_Table'));
                            });
                        }
                        else if (newVal && newVal.Result === 9) {
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('FiltrationError'), 'error');
                            });
                        }
                        else if (newVal && newVal.Result === 11) {
                            require(['sweetAlert'], function () {
                                swal(getTextResource('SqlTimeout'));
                            });
                        }
                        else {
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('AjaxError') + '\n[AssetModelSearchTable.js AppendOrUpdate]', 'error');
                            });
                        }
                        if (newVal && newVal.Result != 0 && !objectIDList)
                            self.isAppendRequestAvailable(false);
                        returnD.resolve(newRowsCount);
                    },
                    function (XMLHttpRequest, textStatus, errorThrown) {
                        require(['sweetAlert'], function () {
                            swal(getTextResource('ErrorCaption'), getTextResource('AjaxError') + '\n[AssetModelSearchTable.js AppendOrUpdate]', 'error');
                        });
                        //
                        if (!objectIDList)
                            self.isAppendRequestAvailable(false);
                        self.SyncLoad = null;
                        returnD.resolve(0);
                    });
                //
                return returnD.promise();
            };
            //
            self.IsObjectAvailableForMeNow = function (objectID) {
                var returnD = $.Deferred();
                //
                var objectIDList = [];
                objectIDList.push(objectID);
                var curFilterID = null;
                var withFinishedWf = false;
                var afterDayModMS = null;
                var treeParams = null;
                //
                var requestInfo = {
                    StartRecordIndex: 0,
                    CountRecords: 1,
                    IDList: objectIDList,
                    ViewName: self.viewName,
                    TimezoneOffsetInMinutes: new Date().getTimezoneOffset(),
                    CurrentFilterID: curFilterID,
                    WithFinishedWorkflow: withFinishedWf,
                    AfterModifiedMilliseconds: afterDayModMS,
                    TreeSettings: treeParams,
                    SearchRequest: self.searchPhraseObservable ? self.searchPhraseObservable() : null,
                    TypeID: null,
                    ModelsID: null,
                    VendorsID: null,
                    LocationID: null,
                    LocationClassID: null,
                    ParentObjectID: self.workOrderID
                };
                var ajaxControlAsync = new ajaxLib.control();
                ajaxControlAsync.Ajax(null,
                    {
                        dataType: "json",
                        method: 'POST',
                        data: requestInfo,
                        url: 'finApi/GetGoodsInvoiceSpecificationSearchListForTable'
                    },
                    function (newVal) {
                        if (newVal && newVal.Result === 0) {
                            if (newVal.DataList && newVal.DataList.length > 0) {
                                returnD.resolve(newVal.DataList[0].Data.length > 0 ? true : false);//data in first column
                                return;
                            }
                        }
                        returnD.resolve(false);
                    },
                    function (XMLHttpRequest, textStatus, errorThrown) {
                        returnD.resolve(false);
                    });
                //
                return returnD.promise();
            };
            //
            self.Reload = function () {
                var returnD = $.Deferred();
                //
                $.when(self.Load()).done(function () {
                    returnD.resolve();
                    setTimeout(self.ScrollUp, 1000);//TODO? сразу не срабатывает из-за knockout
                });
                //
                return returnD.promise();
            };
            //
            self.resizeTable = function () {
                //var new_height = getPageContentHeight() - $(".b-content-table__icons").outerHeight();
                //$(".region-ListMode").css("height", new_height + "px");//чтобы линия была до самого низа
                //$(".region-Filtration").css("height", new_height + "px");//контейнер должен быть такой же высоты
                //$regionTable.css("height", new_height + "px");//контейнер должен быть такой же высоты
                //
                self.RenderTableComplete();
            };
            //
            self.ScrollUp = function () {
                var container = $regionTable.find('.tableScroll');
                if (container.length > 0)
                    container[0].scrollTop = 0;
            };

            self.RenderTableComplete = function () {
                var tableHeightWithoutHeader = $regionTable.height() - $regionTable.find(".tableHeader").outerHeight();
                //
                var height = self.LocateBtnVisible ? 50 : 0;
                //
                var h = Math.max(tableHeightWithoutHeader - height, 0);
                //
                if (self.LocateBtnVisible) {
                    var showBtn = h > 0;
                    self.HideShowLocateBtn(showBtn);
                }
                //
                $regionTable.find(".tableScroll").css("height", h + "px");//для скрола на таблице (без шапки)
            };
            //
            self.AfterRender = function () {
                self.resizeTable();
                $(window).resize(self.resizeTable);
                //
                $regionTable.find('.tableScroll').bind('scroll', self.OnScroll);
                //
                //self.resizeFunc();
            };
            //
            self.ModifiedObjectIDs = ko.observableArray([]);//количество измененных, но не отображенных элементов, которые могут быть интересны пользователю
            self.ModifiedObjectCount = ko.computed(function () {
                return self.ModifiedObjectIDs().length;
            });
            self.ModifiedObjectCountString = ko.computed(function () {
                var retval = self.ModifiedObjectIDs().length;
                return retval > 9 ? '9+' : retval.toString();
            });
            self.IsObjectClassVisible = function (objectClassID) {
                if (objectClassID == 383)
                    return true;
                return false;
            };
            self.IsModifiedObjectIDsContains = function (objectID) {
                for (var i = 0; i < self.ModifiedObjectIDs().length; i++)
                    if (self.ModifiedObjectIDs()[i] == objectID)
                        return true;
                //
                return false;
            };
            self.AppendToModifiedObjectIDs = function (objectID) {
                if (self.IsModifiedObjectIDsContains(objectID))
                    return;//уже уведомили
                //
                self.ModifiedObjectIDs().push(objectID);
                self.ModifiedObjectIDs.valueHasMutated();
            };
            //
            self.onObjectInserted = function (e, objectClassID, objectID, parentObjectID) {
                if (!self.IsObjectClassVisible(objectClassID) || self.SyncLoad)
                    return;
                //
                self.Reload();
            };
            self.onObjectModified = function (e, objectClassID, objectID, parentObjectID) {
                if (!self.IsObjectClassVisible(objectClassID) || self.SyncLoad)
                    return;
                //
                self.Reload();
            };
            self.onObjectDeleted = function (e, objectClassID, objectID, parentObjectID) {
                if (!self.IsObjectClassVisible(objectClassID) || self.SyncLoad)
                    return;//в текущем списке удаляемый объект присутствовать не может
                else if (parentObjectID && objectClassID != 160) {
                    self.onObjectModified(e, objectClassID, parentObjectID, null);//возможно изменилась часть объекта, т.к. в контексте указан родительский объект
                    return;
                }
                objectID = objectID.toUpperCase();
                //
                self.RemoveRow(objectID);
                self.ClearInfoByObject(objectID);
            };
            //
            //отписываться не будем
            $(document).bind('objectInserted', self.onObjectInserted);
            $(document).bind('local_objectInserted', self.onObjectInserted);
            $(document).bind('objectUpdated', self.onObjectModified);
            $(document).bind('local_objectUpdated', self.onObjectModified);
            $(document).bind('objectDeleted', self.onObjectDeleted);
            $(document).bind('local_objectDeleted', self.onObjectDeleted);
        }
    }
    return module;
});