define(['knockout', 'jquery', 'ajax', 'iconHelper', 'selectControl', 'treeControl', 'models/FinanceForms/PurchaseSpecification', 'models/FinanceForms/GoodsInvoiceSpecification', 'models/FinanceForms/GoodsInvoiceSpecificationControl', 'jqueryStepper'], function (ko, $, ajaxLib, ihLib, scLib, treeLib, specLib, invoiceSpecLib, formLib) {
    var module = {
        MaxCount: 10000,
        ViewModel: function ($region, bindedObject) {
            var self = this;
            self.$isLoaded = $.Deferred();
            self.$region = $region;
            //
            self.bindedClassID = bindedObject.ClassID;
            self.bindedObjectID = bindedObject.ID;
            self.UsedIDList = bindedObject.UsedIDList;
            self.invoiceSpecification = ko.observable(bindedObject.InvoiceSpec);
            //
            self.modes = {
                ParameterSelector: 'ParameterSelector',
                Choosen: 'Choosen'
            };
            //
            self.FocusSearcher = function () {
                var searcher = self.$region.find('.asset-link_searchText .text-input');
                searcher.focus();
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
                    if (newValue == self.modes.Choosen && !self.modelChoosen()) {
                        self.initChoosen();
                        self.SetFilledButtonsList();
                    }
                    self.SizeChanged();
                });
            });
            //
            self.modelParameterSelector = ko.observable(null);
            self.ParameterReady = ko.observable(false);
            self.initParameterSelector = function () {
                self.modelParameterSelector(new module.ParameterSelectorModel(self.$region, self.OnSelectedChangeHandler, self.IsSelectedChecker, self.bindedObjectID, self.UsedIDList, self.selectedModels, self.FocusSearcher));
                //
                self.ParameterReady(true);
            };
            self.selectParameterSelector = function () {
                self.currentMode(self.modes.ParameterSelector);
                if (self.ParameterReady()) {
                    self.modelParameterSelector().SizeChanged();
                    self.FocusSearcher();
                }
            };
            self.isParameterSelected = ko.computed(function () {
                return self.currentMode() == self.modes.ParameterSelector;
            });
            //
            self.modelChoosen = ko.observable(null);
            self.ChoosenReady = ko.observable(false);
            self.initChoosen = function () {
                self.modelChoosen(new module.ChoosenModel(self.$region, self.invoiceSpecification, self.selectedModels));
                self.ChoosenReady(true);
            };
            self.selectChoosen = function () {
                self.currentMode(self.modes.Choosen);
            };
            self.isChoosenSelected = ko.computed(function () {
                return self.currentMode() == self.modes.Choosen;
            });
            //
            self.selectedModels = ko.observableArray([]);
            self.isChoosenVisible = ko.computed(function () {
                var models = self.selectedModels();
                if (models && models.length > 0)
                    return true;
                //
                return false;
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
                if (startSelectedCounter == 0 && endSelectedCounter > 0 && self.SetFilledButtonsList && self.modelChoosen())
                    self.SetFilledButtonsList();
                else if (startSelectedCounter != 0 && endSelectedCounter == 0 && self.SetClearButtonsList)
                    self.SetClearButtonsList();

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
            //uses from formHelper
            self.GetInvoiceSpecificationData = function () { 
                //
                if (!self.modelChoosen())
                    return null;
                //
                var invoiceSpecData = self.modelChoosen().control.GetInvoiceSpecification();
                //
                return invoiceSpecData;
            };
            self.ClearSelection = function () {
                while (self.selectedModels().length > 0) {
                    var el = self.selectedModels()[0];
                    if (el && el.Selected && el.Selected() === true)
                        el.Selected(false);
                    else break;
                }
            };
            self.SetClearButtonsList = null;
            self.SetFilledButtonsList = null;
            //
            self.AfterRender = function () {
                self.$isLoaded.resolve();
                //
                self.selectParameterSelector();
            };
            //
            self.SpecControlHeight = ko.observable(0);
            //
            self.SizeChanged = function () {
                if (self.ParameterReady())
                    self.modelParameterSelector().SizeChanged();
                //
                if (self.invoiceSpecification()) {
                    var tabHeight = self.$region.height();//form height
                    tabHeight -= self.$region.find('.b-requestDetail-menu').outerHeight(true);
                    tabHeight -= self.$region.find('.b-requestDetail__title-header').outerHeight(true);
                    //
                    var height = Math.max(0, tabHeight - 10);
                    //
                    self.SpecControlHeight(Math.max(0, height - 60) + 'px');
                    if (self.modelChoosen())
                        self.modelChoosen().control.PURSListHeight(Math.max(0, height - 410) + 'px');
                }
            };
        },
        ParameterSelectorModel: function ($region, mainOnChangeSelected, mainCheckerAlreadySelected, bindedObjectID, usedIDList, selectedObjects, focusSearcher) {
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
                var $columnButton = self.$region.find('.goods-invoice-link_columnsButton');
                var $workplace = self.$region.find('.asset-link-parameters');
                var $table = self.$region.find('.asset-link_tableColumn');
                if ($columnButton.length > 0)
                    showSpinner($columnButton[0]);
                if ($workplace.length > 0)
                    showSpinner($workplace[0]);
                //
                require(['models/FinanceForms/GoodsInvoiceSpecificationLink/GoodsInvoiceSpecificationSearchTable'], function (vm) {
                    self.tableModel = new vm.ViewModel($table);
                    self.tableModel.OnSelectedRow = self.RowSelected;
                    self.tableModel.OnDeselectedRow = self.RowDeselected;
                    self.tableModel.CheckRowSelection = mainCheckerAlreadySelected;
                    self.tableModel.workOrderID = bindedObjectID;
                    self.tableModel.usedIDList = usedIDList;
                    self.tableModel.mode = 3;//PurchaseSpecificationTableMode.ShowPurchasing
                    self.tableModel.selectedObjects = selectedObjects;
                    //
                    self.startLoadingTable(true);
                    tableD.resolve();
                    //
                    require(['models/Table/Columns'], function (vm) {
                        self.columnsModel = new vm.ViewModel(self.tableModel, $('.goods-invoice-link_tableSearchColumns'), $columnButton, $workplace);
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
                if (focusSearcher)
                    focusSearcher();
            };
        },
        ChoosenModel: function ($region, invoiceSpecification, observableList) {
            var self = this;
            //
            self.control = new formLib.ViewModel(invoiceSpecification, observableList, ko.observable(true), $region);
            //
            observableList.subscribe(function (newValue) {
                self.control.ListenToCountUpdate();
                self.control.InitializeFromPURSList();
                self.control.InitUnitAndNDSByPURSList();
            });
        },
        ListModelObject: function (obj, onSelectedChange, mainCheckerAlreadySelected) {
            var self = this;
            //
            self.PurchaseSpecification = obj.OperationInfo.RowObject;
            self.pur = new specLib.Specification(null, self.PurchaseSpecification);
            //
            self.ID = self.PurchaseSpecification.ID;
            //
            self.Selected = ko.observable(mainCheckerAlreadySelected ? mainCheckerAlreadySelected(self.ID) : false);
            self.Selected.subscribe(function (newValue) {
                if (onSelectedChange)
                    onSelectedChange(self, newValue);
            });
            //
            self.OnCountUpdate = null;//событие изменения Count
            //
            var count = self.PurchaseSpecification.Count;
            var delivered = self.PurchaseSpecification.Delivered;
            self.MaxCount = delivered ? count - delivered : count;
            //
            self.pur.CountPlan(self.MaxCount);
            //
            self.Count = ko.observable(self.MaxCount);
            self.Count.subscribe(function (newValue) {
                var val = parseInt(newValue);
                if (val <= 0 || isNaN(val))
                    self.Count(1);
                else if (val > self.MaxCount)
                    self.Count(self.MaxCount);
                //
                if (self.OnCountUpdate)
                    self.OnCountUpdate();
                //
                self.pur.CountPlan(parseInt(self.Count()));
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