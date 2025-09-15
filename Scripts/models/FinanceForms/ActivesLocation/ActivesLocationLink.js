define(['knockout', 'jquery', 'ajax', 'iconHelper', 'selectControl', 'treeControl', 'jqueryStepper'], function (ko, $, ajaxLib, ihLib, scLib, treeLib) {
    var module = {
        MaxCount: 2147483647,//2^31-1
        ViewModel: function ($region, bindedObject, callback, callbackReloadParameters, hideShowBtnFunc) {
            var self = this;
            self.$isLoaded = $.Deferred();
            self.$region = $region;
            //
            self.bindedClassID = bindedObject.ClassID;
            self.bindedObjectID = bindedObject.ID;
            //
            self.modes = {
                ParameterSelector: 'ParameterSelector',
                Choosen: 'Choosen'
            };
            //
            self.Height = ko.observable(0);
            self.Resize = function (tabHeight) {
                self.Height(Math.max(tabHeight - 100 - 26, 0) + 'px');
            };
            //
            self.SelectedPurchaseSpecificationList = self.tableModel;
            //
            self.currentMode = ko.observable(null);
            self.currentMode.subscribe(function (newValue) {
                $.when(self.$isLoaded).done(function () {
                    if (newValue == self.modes.ParameterSelector && !self.modelParameterSelector())
                        self.initParameterSelector();
                    //
                    if (newValue == self.modes.Choosen && !self.modelChoosen())
                        self.initChoosen();
                });
            });
            //
            self.ReloadTable = function () {
                if (!self.modelParameterSelector() || !self.modelParameterSelector().tableModel)
                    return;
                //
                self.selectedModels.removeAll();
                self.ChoosenReady(false);
                self.modelChoosen(null);
                self.modelParameterSelector().tableModel.Reload();
                self.selectParameterSelector();
                //
                callbackReloadParameters(self.GetFinalList());
            };
            //
            self.modelParameterSelector = ko.observable(null);
            self.ParameterReady = ko.observable(false);
            self.initParameterSelector = function () {
                self.modelParameterSelector(new module.ParameterSelectorModel(self.$region, self.OnSelectedChangeHandler, self.IsSelectedChecker, self.bindedObjectID, hideShowBtnFunc));
                self.ParameterReady(true);
            };
            self.selectParameterSelector = function () {
                self.currentMode(self.modes.ParameterSelector);
                if (self.ParameterReady())
                    self.modelParameterSelector().SizeChanged();
            };
            self.isParameterSelected = ko.computed(function () {
                return self.currentMode() == self.modes.ParameterSelector;
            });
            //
            self.modelChoosen = ko.observable(null);
            self.ChoosenReady = ko.observable(false);
            self.initChoosen = function () {
                self.modelChoosen(new module.ChoosenModel(self.selectedModels));
                self.ChoosenReady(true);
            };
            self.selectChoosen = function () {
                self.currentMode(self.modes.Choosen);
            };
            self.isChoosenSelected = ko.computed(function () {
                return self.currentMode() == self.modes.Choosen;
            });
            //
            //self.emptyMenuItem =
            //    {
            //        Enabled: false,
            //        Name: '--Действия--',
            //        CommandType: -1,
            //        LifeCycleStateOperationID: null
            //    };
            ////
            //self.selectedComboItem = ko.observable(self.emptyMenuItem);
            //self.selectedComboItem.subscribe(function (contextMenuItem) {
            //    if (contextMenuItem == self.emptyMenuItem)
            //        return;
            //    //
            //    if (contextMenuItem.CommandType == 0) {//register
            //        showSpinner();
            //        require(['assetForms'], function (module) {
            //            var fh = new module.formHelper(true);
            //            var selectedObjects = self.getSelectedItems();
            //            fh.ShowAssetRegistration(selectedObjects, contextMenuItem.Name, contextMenuItem.LifeCycleStateOperationID);
            //        });
            //    }
            //    else if (contextMenuItem.CommandType == 11) {//workOrder
            //        self.ExecuteContextMenu(contextMenuItem);
            //    }
            //    //
            //    self.selectedComboItem(self.emptyMenuItem);
            //});
            ////
            //self.ajaxControlExecuteContextMenu = new ajaxLib.control();
            //self.ExecuteContextMenu = function (contextMenuItem) {
            //    var deviceList = self.getSelectedItems();
            //    var cmd = {
            //        Enabled: contextMenuItem.Enabled,
            //        Name: contextMenuItem.Name,
            //        CommandType: contextMenuItem.CommandType,
            //        LifeCycleStateOperationID: contextMenuItem.LifeCycleStateOperationID
            //    };
            //    //
            //    self.ajaxControlExecuteContextMenu.Ajax(null,
            //    {
            //        dataType: "json",
            //        method: 'GET',
            //        data: { DeviceList: deviceList, Command: cmd },
            //        url: 'sdApi/ExecuteContextMenu'
            //    },
            //    function (newVal) {
            //        self.ReloadTable();
            //        //
            //        if (newVal) {
            //            if (newVal.Result == 0 && newVal.Message) {
            //                require(['sweetAlert'], function () {
            //                    swal(contextMenuItem.Name, newVal.Message, 'info');
            //                });
            //            }
            //            else if (newVal.Result != 0) {
            //                require(['sweetAlert'], function () {
            //                    swal(contextMenuItem.Name, 'Операция не выполнена', 'error');
            //                });
            //            }
            //        }
            //    });
            //    //
            //    // return retval.promise();
            //};
            //
            self.getSelectedItems = function () {
                if (!self.selectedModels())
                    return [];
                //
                var retval = [];
                self.selectedModels().forEach(function (el) {
                    var item =
                    {
                        ID: el.AssetLocateObj.DeviceID,
                        ClassID: el.AssetLocateObj.ClassID,
                        OwnerID: el.AssetLocateObj.GoodsInvoiceConsigneeID,
                        OwnerClassID: 101,
                        //HasInvNumber: el.AssetLocateObj.HasInvNumber
                    };
                    retval.push(item);
                });
                return retval;
            };
            //

            //self.ajaxControl = new ajaxLib.control();
            //self.ResetContextMenu = function () {
            //    var retval = $.Deferred();
            //    self.comboItems.splice(1, self.comboItems.length - 1);
            //    //
            //    var deviceList = self.getSelectedItems();
            //    //
            //    self.ajaxControl.Ajax(null,
            //    {
            //        dataType: "json",
            //        method: 'POST',
            //        data: { DeviceList: deviceList },
            //        url: 'sdApi/GetContextMenu'
            //    },
            //    function (newVal) {
            //        if (newVal) {
            //            if (newVal.List) {
            //                self.comboItems = newVal.List;
            //                self.comboItems.splice(0, 0, self.emptyMenuItem);
            //            }
            //            retval.resolve(newVal.List);
            //        }
            //    });
            //    //
            //    return retval.promise();
            //};
            ////
            //self.comboItems = [self.emptyMenuItem];
            //self.getComboItems = function (options) {
            //    $.when(self.ResetContextMenu()).done(function (list) {
            //        options.callback({ data: self.comboItems, totalCount: self.comboItems.length });
            //    });
            //}
            //
            self.selectedModels = ko.observableArray([]);
            //self.isOperationsVisible = ko.computed(function () {
            //    var models = self.selectedModels();
            //    var retval;
            //    if (models && models.length > 0)
            //        retval = true
            //    //
            //    ko.utils.arrayForEach(models, function (el) {
            //        if (!el.AssetLocateObj.DeviceID) {
            //            retval = false;
            //            return false;
            //        }
            //    });
            //    return retval;
            //});
            //
            self.CheckLicenseClass = function (classID) {
                if (classID == 38 || classID == 183 || classID == 184 || classID == 185 || classID == 186 || classID == 187 || classID == 223)
                    return true;
                return false;
            }

            self.isLicense = ko.observable(false);

            self.isChoosenVisible = ko.computed(function () {
                var models = self.selectedModels();
                var retval;
                if (models && models.length > 0)
                    retval = true
                //
                var modelClass = null;
                ko.utils.arrayForEach(models, function (el) {
                    if (el.AssetLocateObj.DeviceID) {
                        retval = false;
                        self.isLicense(false);
                        return false;
                    }
                });

                ko.utils.arrayForEach(models, function (el) {
                    if (modelClass == null) {
                        modelClass = el.AssetLocateObj.ProductCatalogModelClassID;
                    }
                    if (self.CheckLicenseClass(modelClass) && self.CheckLicenseClass(el.AssetLocateObj.ProductCatalogModelClassID))
                        self.isLicense(true);
                    else if (self.CheckLicenseClass(modelClass) == self.CheckLicenseClass(el.AssetLocateObj.ProductCatalogModelClassID))
                        self.isLicense(false);
                    else {
                        self.isLicense(false);
                        retval = false;
                        return false;
                    }
                    modelClass = el.AssetLocateObj.ProductCatalogModelClassID;
                });
                //
                if (self.modelParameterSelector() && self.modelParameterSelector().tableModel) {
                    var table = self.modelParameterSelector().tableModel;
                    table.LocateBtnVisible = retval;
                    table.RenderTableComplete();
                }
                //
                return retval;
            });
            self.ChoosenCounterText = ko.computed(function () {
                var assets = self.selectedModels();
                //
                if (assets && assets.length > 0)
                    return '(' + assets.length + ')';
                //
                return '';
            });
            //
            self.timeoutSelection = null;
            self.SomethingSelected = function () {
                if (self.timeoutSelection != null) {
                    clearTimeout(self.timeoutSelection);
                    self.timeoutSelection = null;
                }
                //
                self.timeoutSelection = setTimeout(function () {
                    clearTimeout(self.timeoutSelection);
                    self.timeoutSelection = null;
                    //
                    callbackReloadParameters(self.GetFinalList());
                }, 200);
            };
            self.OnSelectedChangeHandler = function (obj, newValue) {
                if (!obj)
                    return;
                //
                var startSelectedCounter = self.selectedModels().length;
                //
                if (newValue) {
                    var exist = ko.utils.arrayFirst(self.selectedModels(), function (el) {
                        return el.ID.toUpperCase() === obj.ID.toUpperCase();
                    });
                    //
                    if (!exist) {
                        self.selectedModels.push(obj);
                        //
                        if (self.ParameterReady())
                            self.modelParameterSelector().CheckAndSetSelectedState(obj.ID, true);
                    }
                }
                else {
                    var exist = ko.utils.arrayFirst(self.selectedModels(), function (el) {
                        return el.ID.toUpperCase() === obj.ID.toUpperCase();
                    });
                    //
                    if (exist) {
                        self.selectedModels.remove(function (el) { return el.ID.toUpperCase() == obj.ID.toUpperCase(); });
                        //
                        if (self.ParameterReady())
                            self.modelParameterSelector().CheckAndSetSelectedState(obj.ID, false);
                        //
                        if (self.selectedModels().length == 0 && self.isChoosenSelected()) {
                            self.selectParameterSelector();
                        }
                    }
                }
                //
                var endSelectedCounter = self.selectedModels().length;
                //
                if (startSelectedCounter == 0 && endSelectedCounter > 0 && self.SetFilledButtonsList)
                    self.SetFilledButtonsList();
                else if (startSelectedCounter != 0 && endSelectedCounter == 0 && self.SetCLearButtonsList)
                    self.SetCLearButtonsList();
                //
                self.SomethingSelected();
            };
            self.IsSelectedChecker = function (id) {
                if (!id)
                    return false;
                //
                var exist = ko.utils.arrayFirst(self.selectedModels(), function (el) {
                    return el.ID.toUpperCase() === id.toUpperCase();
                });
                //
                if (exist)
                    return true;
                else return false;
            };
            //
            self.locateActives = function () {
                var modelList = self.GetFinalList();
                callback(modelList);
            };
            //
            //uses from formHelper
            self.GetFinalList = function () {
                var retval = [];
                ko.utils.arrayForEach(self.selectedModels(), function (el) {
                    var obj = el.AssetLocateObj;
                    var value =
                        {
                            GoodsInvoiceSpecificationPurchaseDependencyID: obj.GoodsInvoiceSpecificationPurchaseDependencyID,
                            GoodsInvoiceUtcDate: obj.GoodsInvoiceUtcDate,
                            GoodsInvoiceNumber: obj.GoodsInvoiceNumber,
                            OwnerID: obj.GoodsInvoiceConsigneeID,
                            WorkOrderID: obj.WorkOrderID,
                            SupplierID: obj.SupplierID,
                            PriceWithNDS: obj.PriceWithNDS,
                            //
                            ProductCatalogModelClassID: obj.ProductCatalogModelClassID,
                            ProductCatalogModelID: obj.ProductCatalogModelID,
                            Count: el.Count()
                        };
                    retval.push(value);
                });
                return retval;
            };
            self.ClearSelection = function () {
                while (self.selectedModels().length > 0) {
                    var el = self.selectedModels()[0];
                    if (el && el.Selected && el.Selected() === true)
                        el.Selected(false);
                    else break;
                }
            };
            self.SetCLearButtonsList = null;
            self.SetFilledButtonsList = null;
            //
            self.AfterRender = function (ko_object) {
                self.$isLoaded.resolve();
                //
                self.bindedObjectID = ko_object().ID();
                //
                self.selectParameterSelector();
                //
                callbackReloadParameters(self.GetFinalList());
                //self.InitContextMenu();
            };
            self.SizeChanged = function () {
                if (self.ParameterReady())
                    self.modelParameterSelector().SizeChanged();
                //
                //self.SizeChangedParent();
            };
        },
        ParameterSelectorModel: function ($region, mainOnChangeSelected, mainCheckerAlreadySelected, bindedObjectID, hideShowBtnFunc) {
            var self = this;
            self.tableModel = null;
            self.columnsModel = null;
            self.startLoadingTable = ko.observable(false);
            self.startLoadingColumns = ko.observable(false);
            self.$region = $region;
            //
            self.InitializeTable = function () {
                var columnSettingsD = $.Deferred();
                var tableD = $.Deferred();
                //
                var $columnButton = self.$region.find('.asset-model-link_columnsButton');
                var $workplace = self.$region.find('.asset-link-parameters');
                var $table = self.$region.find('.asset-link-main .asset-link_tableColumn');
                if ($columnButton.length > 0)
                    showSpinner($columnButton[0]);
                if ($workplace.length > 0)
                    showSpinner($workplace[0]);
                //
                require(['models/FinanceForms/ActivesLocation/ActivesLocationSearchTable'], function (vm) {
                    self.tableModel = new vm.ViewModel($table);
                    self.tableModel.OnSelectedRow = self.RowSelected;
                    self.tableModel.OnDeselectedRow = self.RowDeselected;
                    self.tableModel.CheckRowSelection = mainCheckerAlreadySelected;
                    self.tableModel.workOrderID = bindedObjectID;
                    self.tableModel.HideShowLocateBtn = hideShowBtnFunc;
                    //
                    self.startLoadingTable(true);
                    tableD.resolve();
                    //
                    require(['models/Table/Columns'], function (vm) {
                        self.columnsModel = new vm.ViewModel(self.tableModel, $('.asset-model-link_tableSearchColumns'), $columnButton, $workplace);
                        self.startLoadingColumns(true);
                        if ($columnButton.length > 0)
                            hideSpinner($columnButton[0]);
                        columnSettingsD.resolve();
                    });
                });
                //
                $.when(columnSettingsD, tableD).done(function () {
                    $.when(self.tableModel.Reload()).done(function () {
                        if ($workplace.length > 0)
                            hideSpinner($workplace[0]);
                        self.columnsModel.refreshListSize();
                    });
                });
            };
            self.SizeChanged = function () {
                if (self.startLoadingTable())
                    self.tableModel.resizeTable();
            };
            //
            self.ajaxControl_load = new ajaxLib.control();
            self.RowSelected = function (rowArray) {
                if (rowArray && rowArray.length > 0) {
                    $.when(userD).done(function (user) {
                        var idList = [];
                        ko.utils.arrayForEach(rowArray, function (el) {
                            idList.push(el.ID);
                            var obj = new module.ListModelObject(el, mainOnChangeSelected, mainCheckerAlreadySelected);
                            obj.Selected(true);
                        });
                    });
                }
            };
            self.RowDeselected = function (rowArray) {
                if (rowArray && rowArray.length > 0) {
                    $.when(userD).done(function (user) {
                        var idList = [];
                        ko.utils.arrayForEach(rowArray, function (el) {
                            idList.push(el.ID);
                            var obj = new module.ListModelObject(el, mainOnChangeSelected, mainCheckerAlreadySelected);
                            mainOnChangeSelected(obj, false);
                        });
                    });
                }
            };

            self.CheckAndSetSelectedState = function (id, newState) {
                if (!self.startLoadingTable())
                    return;
                //
                id = id.toUpperCase();
                var row = self.tableModel.rowHashList[id];
                //
                if (!row)
                    row = ko.utils.arrayFirst(self.tableModel.rowList(), function (el) {
                        return el.ID.toUpperCase() == id;
                    });
                //
                if (row && row.Checked() !== newState)
                    row.Checked(newState);
            };
            //
            self.SearchText = ko.observable('');
            self.SearchText.subscribe(function (newValue) {
                self.WaitAndSearch(newValue);
            });
            self.IsSearchTextEmpty = ko.computed(function () {
                var text = self.SearchText();
                if (!text)
                    return true;
                //
                return false;
            });
            //
            self.SearchKeyPressed = function (data, event) {
                if (event.keyCode == 13) {
                    if (!self.IsSearchTextEmpty())
                        self.Search();
                }
                else
                    return true;
            };
            self.EraseTextClick = function () {
                self.SearchText('');
            };
            //
            self.searchTimeout = null;
            self.WaitAndSearch = function (text) {
                clearTimeout(self.searchTimeout);
                self.searchTimeout = setTimeout(function () {
                    if (text == self.SearchText())
                        self.Search();
                }, 500);
            };
            //
            self.ajaxControl_search = new ajaxLib.control();
            self.Search = function () {
                var returnD = $.Deferred();
                //
                self.tableModel.searchPhraseObservable(self.SearchText());
                $.when(self.UpdateTable()).done(function () {
                    returnD.resolve();
                });
                //
                return returnD;
            };
            //
            self.UpdateTable = function () {
                var returnD = $.Deferred();
                //
                var $workplace = self.$region.find('.asset-link-parameters');
                if ($workplace.length > 0)
                    showSpinner($workplace[0]);
                $.when(self.tableModel.Reload()).done(function () {
                    if ($workplace.length > 0)
                        hideSpinner($workplace[0]);
                    self.columnsModel.refreshListSize();
                });
                //
                return returnD;
            };
            //
            self.AfterRender = function () {
                self.InitializeTable();
            };
        },
        ChoosenModel: function (observableList) {
            var self = this;
            //
            self.ChoosenObjectsList = observableList;
            self.ShowForm = function (obj) {
                if (!obj || !obj.ID || !obj.ClassID)
                    return;
                //
            };
        },
        ListModelObject: function (obj, onSelectedChange, mainCheckerAlreadySelected) {
            var self = this;
            //
            self.AssetLocateObj = obj.OperationInfo.RowObject;
            //
            self.ID = obj.ID;
            //
            self.ModelName = self.AssetLocateObj.ProductCatalogModelFullName;
            self.TypeName = self.AssetLocateObj.ProductCatalogTypeName;
            self.GoodsInvoiceNumber = self.AssetLocateObj.GoodsInvoiceNumber;
            self.ActivesRequestNumber = self.AssetLocateObj.ActivesRequestNumber;
            self.MaxCount = self.AssetLocateObj.Count;
            //
            self.Selected = ko.observable(mainCheckerAlreadySelected ? mainCheckerAlreadySelected(self.ID) : false);
            self.Selected.subscribe(function (newValue) {
                if (onSelectedChange)
                    onSelectedChange(self, newValue);
            });
            //
            self.Count = ko.observable(self.MaxCount);
            self.Count.subscribe(function (newValue) {
                var val = parseInt(newValue);
                if (val <= 0 || isNaN(val))
                    self.Count(1);
                else if (val > self.MaxCount)
                    self.Count(self.MaxCount);
            });
            //
            self.OnRender = function (htmlNodes, thisObj) {
                var node = ko.utils.arrayFirst(htmlNodes, function (html) {
                    return html.tagName == 'INPUT';
                });
                if (!node)
                    return;
                //
                var $input = $(node);
                $input.stepper({
                    type: 'int',
                    floatPrecission: 0,
                    wheelStep: 1,
                    arrowStep: 1,
                    limit: [1, self.MaxCount],
                    onStep: function (val, up) {
                        self.Count(val);
                    }
                });
            };
        }
    }
    return module;
});