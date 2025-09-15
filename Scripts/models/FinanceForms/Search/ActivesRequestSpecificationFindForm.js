define(['knockout', 'jquery', 'ajax', 'iconHelper', 'selectControl', 'dateTimeControl', 'models/FinanceForms/ActivesRequestSpecification', 'treeControl', 'jqueryStepper'], function (ko, $, ajaxLib, ihLib, scLib, dtLib, specLib, treeLib) {
    var module = {
        MaxCount: 1000000,
        ViewModel: function ($region, bindedObject) {
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
            self.FocusSearcher = function () {
                var searcher = self.$region.find('.ars-link_searchText .text-input');
                searcher.focus();
            };
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
            self.modelParameterSelector = ko.observable(null);
            self.ParameterReady = ko.observable(false);
            self.initParameterSelector = function () {
                self.modelParameterSelector(new module.ParameterSelectorModel(self.$region, self.OnSelectedChangeHandler, self.IsSelectedChecker, bindedObject, self.FocusSearcher));
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
                if (startSelectedCounter != 0 && endSelectedCounter == 0 && self.SetCLearButtonsList)
                    self.SetCLearButtonsList();
                else self.SelectButtons();
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
            self.GetFinalList = function () {
                return ko.toJS(self.selectedModels());
            };
            self.ClearSelection = function () {
                while (self.selectedModels().length > 0) {
                    var el = self.selectedModels()[0];
                    if (el && el.Selected && el.Selected() === true)
                        el.Selected(false);
                    else break;
                }
            };
            //
            self.SetCLearButtonsList = null;
            self.SetFilledButtonsList = null;
            self.SetAdvancedButtonsList = null; //take typeID
            //
            self.SelectButtons = function () {
                if (!self.SetFilledButtonsList || !self.SetAdvancedButtonsList)
                    return;
                //
                var choosen = self.selectedModels();
                if (!choosen || choosen.length == 0)
                    return;
                //
                var isTypeSame = true;
                var firstType = null;
                var isModelSame = true;
                var firstModel = null;
                var hasContract = false;//сервисный контракт
                var hasAgreement = false;//дополнительное соглашение
                //
                ko.utils.arrayForEach(choosen, function (el) {
                    if (firstType == null)
                        firstType = el.ProductCatalogTypeID();
                    else if (isTypeSame && firstType != el.ProductCatalogTypeID())
                        isTypeSame = false;
                    //
                    if (firstModel == null)
                        firstModel = el.ProductCatalogModelID;
                    else if (isModelSame && firstModel != el.ProductCatalogModelID)
                        isModelSame = false;
                    //
                    if (el.ProductCatalogModelClassID == 115)//OBJ_ServiceContract
                        hasContract = true;
                    else if (el.ProductCatalogModelClassID == 386)//OBJ_ServiceContractAgreement
                        hasAgreement = true;
                });
                //
                if (!firstType || !firstModel)
                    return;
                //
                if (!isTypeSame || isModelSame || bindedObject.PurchaseMode == false || hasContract || hasAgreement) //типы разные или модели совпали, без шансов на одну общую строку в любом случае
                    self.SetFilledButtonsList();
                else self.SetAdvancedButtonsList(firstType);
            };
            //
            self.AfterRender = function () {
                self.$isLoaded.resolve();
                //
                self.selectParameterSelector();
            };
            self.SizeChanged = function () {
                if (self.ParameterReady())
                    self.modelParameterSelector().SizeChanged();
            };
        },
        ParameterSelectorModel: function ($region, mainOnChangeSelected, mainCheckerAlreadySelected, bindedObject, focusSearcher) {
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
                var $columnButton = self.$region.find('.ars-link_columnsButton');
                var $workplace = self.$region.find('.notFound');//.ars-link-parameters
                var $table = self.$region.find('.ars-link_tableColumn');
                if ($columnButton.length > 0)
                    showSpinner($columnButton[0]);
                if ($workplace.length > 0)
                    showSpinner($workplace[0]);
                //
                require(['models/FinanceForms/Search/ActivesRequestSpecificationTable'], function (vm) {
                    self.tableModel = new vm.ViewModel($table);
                    self.tableModel.OnSelectedRow = self.RowSelected;
                    self.tableModel.OnDeselectedRow = self.RowDeselected;
                    self.tableModel.CheckRowSelection = mainCheckerAlreadySelected;
                    self.tableModel.ShowFormFunc = self.ShowForm;
                    self.tableModel.PurchaseMode = bindedObject.PurchaseMode == false ? false : true;
                    self.tableModel.PurchaseLink = bindedObject.PurchaseLink == false ? false : true;
                    //
                    self.startLoadingTable(true);
                    tableD.resolve();
                    //
                    require(['models/Table/Columns'], function (vm) {
                        self.columnsModel = new vm.ViewModel(self.tableModel, $('.ars-link_tableSearchColumns'), $columnButton, $workplace);
                        self.startLoadingColumns(true);
                        if ($columnButton.length > 0)
                            hideSpinner($columnButton[0]);
                        columnSettingsD.resolve();
                    });
                });
                //
                $.when(columnSettingsD, tableD).done(function () {
                    if ($workplace.length > 0)
                        hideSpinner($workplace[0]);
                    //
                    self.ImplementFilter(true);
                    //alex replaced - нужно делать одинаково применение фильтрации!
                    //$.when(self.tableModel.Reload()).done(function () {
                    //    if ($workplace.length > 0)
                    //        hideSpinner($workplace[0]);
                    //    self.columnsModel.refreshListSize();
                    //});
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
                        });
                        //
                        var param = {
                            ArsIDList: idList,
                            PurchaseMode: bindedObject.PurchaseMode == false ? false : true
                        };
                        self.ajaxControl_load.Ajax($region,
                            {
                                dataType: "json",
                                url: 'finApi/GetSearchedARSByID',
                                method: 'POST',
                                data: param,
                            },
                            function (response) {
                                if (response) {
                                    if (response.Result === 0) {
                                        if (response.ARSList && response.ARSList.length > 0) {
                                            ko.utils.arrayForEach(response.ARSList, function (el) {
                                                var obj = new module.ListModelObject(el, mainOnChangeSelected, mainCheckerAlreadySelected);
                                                obj.Selected(true);
                                            });
                                        }
                                    }
                                    else if (response.Result == 1)
                                        require(['sweetAlert'], function () {
                                            swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + ' ' + '\n[ActivesRequestSpecificationFindForm.js, RowSelected]', 'error');
                                        });
                                    else require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + ' ' + '\n[ActivesRequestSpecificationFindForm.js, RowSelected]', 'error');
                                    });
                                }
                                else require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + ' ' + '\n[ActivesRequestSpecificationFindForm.js, RowSelected]', 'error');
                                });

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
                        });
                        //
                        var param = {
                            ArsIDList: idList,
                            PurchaseMode: bindedObject.PurchaseMode == false ? false : true
                        };
                        self.ajaxControl_load.Ajax($region,
                            {
                                dataType: "json",
                                url: 'finApi/GetSearchedARSByID',
                                method: 'POST',
                                data: param,
                            },
                            function (response) {
                                if (response) {
                                    if (response.Result === 0) {
                                        if (response.ARSList && response.ARSList.length > 0) {
                                            ko.utils.arrayForEach(response.ARSList, function (el) {
                                                var obj = new module.ListModelObject(el, mainOnChangeSelected, mainCheckerAlreadySelected);
                                                mainOnChangeSelected(obj, false);
                                            });
                                        }
                                    }
                                    else if (response.Result == 1)
                                        require(['sweetAlert'], function () {
                                            swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + ' ' + '\n[ActivesRequestSpecificationFindForm.js, RowDeselected]', 'error');
                                        });
                                    else require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + ' ' + '\n[ActivesRequestSpecificationFindForm.js, RowDeselected]', 'error');
                                    });
                                }
                                else require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + ' ' + '\n[ActivesRequestSpecificationFindForm.js, RowDeselected]', 'error');
                                });

                            });
                    });
                }
            };
            self.ShowForm = function (id) {
                if (id) {
                    showSpinner();
                    //
                    $.when(userD).done(function (user) {
                        var param = {
                            SpecificationID: id
                        };
                        self.ajaxControl_load.Ajax($region,
                            {
                                dataType: "json",
                                url: 'finApi/GetARSFromSearch?' + $.param(param),
                                method: 'GET'
                            },
                            function (response) {
                                if (response) {
                                    if (response.Result === 0 && response.Elem) {
                                        var newValue = new specLib.Specification(null, response.Elem);
                                        require(['financeForms'], function (module) {
                                            var fh = new module.formHelper(true);
                                            //call func
                                            var ars = ko.toJS(newValue);
                                            //
                                            var computedCanEdit = ko.computed(function () {
                                                return false;
                                            });
                                            //
                                            fh.ShowActivesRequestSpecification(ars, computedCanEdit, null);
                                        });
                                    }
                                    else if (response.Result == 1)
                                        require(['sweetAlert'], function () {
                                            hideSpinner();
                                            swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + ' ' + '\n[ActivesRequestSpecificationFindForm.js, ShowForm]', 'error');
                                        });
                                    else require(['sweetAlert'], function () {
                                        hideSpinner();
                                        swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + ' ' + '\n[ActivesRequestSpecificationFindForm.js, ShowForm]', 'error');
                                    });
                                }
                                else require(['sweetAlert'], function () {
                                    hideSpinner();
                                    swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + ' ' + '\n[ActivesRequestSpecificationFindForm.js, ShowForm]', 'error');
                                });
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
            self.treeControlProductCatalog = null;
            self.InitTreeProductCatalog = function () {
                var retD = $.Deferred();
                var $regionTree = self.$region.find('.ars-link_paramsColumnProductCatalog');
                //
                if (!self.treeControlProductCatalog) {
                    self.treeControlProductCatalog = new treeLib.control();
                    self.treeControlProductCatalog.init($regionTree, 2, {
                        onClick: self.OnSelectTreeValueProductCatalog,
                        UseAccessIsGranted: true,
                        ShowCheckboxes: false,
                        AvailableClassArray: [29, 374, 378],
                        ClickableClassArray: [29, 374, 378],
                        AllClickable: false,
                        FinishClassArray: [378],
                        Title: getTextResource('ProductCatalogueFilterCaption'),
                        WindowModeEnabled: true
                    });
                }
                //
                $.when(self.treeControlProductCatalog.$isLoaded).done(function () {
                    self.treeControlProductCatalog.HeaderExpanded(true);
                    retD.resolve();
                });
                //
                return retD.promise();
            };
            self.SelectedTreeValueProductCatalog = ko.observable(bindedObject.ProductCatalogClassID ? { ID: bindedObject.ProductCatalogID, ClassID: bindedObject.ProductCatalogClassID } : null);
            self.OnSelectTreeValueProductCatalog = function (node) {
                if (node && node.ClassID == 29) {
                    if (self.SelectedTreeValueProductCatalog()) {
                        self.SelectedTreeValueProductCatalog(null);
                        self.ImplementFilter();
                    }
                    self.treeControlProductCatalog.DeselectNode();
                    //
                    return false;
                }
                //
                self.SelectedTreeValueProductCatalog(node);
                self.ImplementFilter();
                //
                return true;
            };
            //
            self.treeControlCustomerSubdivision = null;
            self.InitTreeCustomerSubdivision = function () {
                var retD = $.Deferred();
                var $regionTree = self.$region.find('.ars-link_paramsColumnCustomerSubdivision');
                //
                if (!self.treeControlCustomerSubdivision) {
                    self.treeControlCustomerSubdivision = new treeLib.control();
                    self.treeControlCustomerSubdivision.init($regionTree, 0, {
                        onClick: self.OnSelectTreeValueCustomerSubdivision,
                        UseAccessIsGranted: true,
                        ShowCheckboxes: false,
                        AvailableClassArray: [29, 101, 102],
                        ClickableClassArray: [29, 101, 102],
                        AllClickable: false,
                        FinishClassArray: [102],
                        Title: getTextResource('CustomerSubdivisonFilterCaption'),
                        WindowModeEnabled: true
                    });
                }
                //
                $.when(self.treeControlCustomerSubdivision.$isLoaded).done(function () {
                    self.treeControlCustomerSubdivision.HeaderExpanded(true);
                    retD.resolve();
                });
                //
                return retD.promise();
            };
            self.SelectedTreeValueCustomerSubdivision = ko.observable(null);
            self.OnSelectTreeValueCustomerSubdivision = function (node) {
                if (node && node.ClassID == 29) {
                    if (self.SelectedTreeValueCustomerSubdivision()) {
                        self.SelectedTreeValueCustomerSubdivision(null);
                        self.ImplementFilter();
                    }
                    self.treeControlCustomerSubdivision.DeselectNode();
                    //
                    return false;
                }
                //
                self.SelectedTreeValueCustomerSubdivision(node);
                self.ImplementFilter();
                //
                return true;
            };
            //
            self.ajaxControl_loadNumbers = new ajaxLib.control();
            self.controlNumbersSelector = null;
            self.InitializeNumbersSelector = function () {
                var retD = $.Deferred();
                //
                var deffered = $.Deferred();
                var $regionNumbers = self.$region.find('.ars-link_paramsColumnNumbers');
                //
                if (!self.controlNumbersSelector) {
                    self.controlNumbersSelector = new scLib.control();
                    self.controlNumbersSelector.init($regionNumbers,
                        {
                            Title: getTextResource('ARS_NumberWorkOrder'),
                            AlwaysShowTitle: true,
                            IsSelectMultiple: true,
                            OnEditComplete: self.ImplementFilter
                        }, deffered.promise());
                }
                else {
                    self.controlNumbersSelector.ClearItemsList();
                    $.when(deffered).done(function (values) {
                        self.controlNumbersSelector.AddItemsToControl(values);
                    });
                }
                //
                self.ajaxControl_loadNumbers.Ajax($regionNumbers,
                    {
                        dataType: "json",
                        method: 'GET',
                        url: 'finApi/GetARSLinkNumbers'
                    },
                    function (newData) {
                        if (newData != null && newData.Result === 0 && newData.List) {
                            var retval = [];
                            //
                            newData.List.forEach(function (el) {
                                retval.push({
                                    ID: el.ID,
                                    Name: el.Name,
                                    Checked: false
                                });
                            });
                            //
                            deffered.resolve(retval);
                        }
                        else deffered.resolve();
                        //
                        $.when(self.controlNumbersSelector.$initializeCompleted).done(function () {
                            retD.resolve();
                        });
                    });
                //
                return retD.promise();
            };
            //
            self.ajaxControl_loadCustomers = new ajaxLib.control();
            self.controlCustomersSelector = null;
            self.InitializeCustomersSelector = function () {
                var retD = $.Deferred();
                //
                var deffered = $.Deferred();
                var $regionCustomers = self.$region.find('.ars-link_paramsColumnCustomers');
                //
                if (!self.controlCustomersSelector) {
                    self.controlCustomersSelector = new scLib.control();
                    self.controlCustomersSelector.init($regionCustomers,
                        {
                            Title: getTextResource('FinanceOrder_CustomerFullName'),
                            AlwaysShowTitle: true,
                            IsSelectMultiple: true,
                            OnEditComplete: self.ImplementFilter
                        }, deffered.promise());
                }
                else {
                    self.controlCustomersSelector.ClearItemsList();
                    $.when(deffered).done(function (values) {
                        self.controlCustomersSelector.AddItemsToControl(values);
                    });
                }
                //
                self.ajaxControl_loadCustomers.Ajax($regionCustomers,
                    {
                        dataType: "json",
                        method: 'GET',
                        url: 'finApi/GetARSLinkCustomers'
                    },
                    function (newData) {
                        if (newData != null && newData.Result === 0 && newData.List) {
                            var retval = [];
                            //
                            newData.List.forEach(function (el) {
                                retval.push({
                                    ID: el.ID,
                                    Name: el.Name,
                                    Checked: false
                                });
                            });
                            //
                            deffered.resolve(retval);
                        }
                        else deffered.resolve();
                        //
                        $.when(self.controlCustomersSelector.$initializeCompleted).done(function () {
                            retD.resolve();
                        });
                    });
                //
                return retD.promise();
            };
            //
            self.ajaxControl_loadReference = new ajaxLib.control();
            self.controlReferenceSelector = null;
            self.InitializeReferenceSelector = function () {
                var retD = $.Deferred();
                //
                var deffered = $.Deferred();
                var $regionRef = self.$region.find('.ars-link_paramsColumnReferences');
                //
                if (!self.controlReferenceSelector) {
                    self.controlReferenceSelector = new scLib.control();
                    self.controlReferenceSelector.init($regionRef,
                        {
                            Title: getTextResource('WorkOrderReference'),
                            AlwaysShowTitle: true,
                            IsSelectMultiple: true,
                            OnEditComplete: self.ImplementFilter
                        }, deffered.promise());
                }
                else {
                    self.controlReferenceSelector.ClearItemsList();
                    $.when(deffered).done(function (values) {
                        self.controlReferenceSelector.AddItemsToControl(values);
                    });
                }
                //
                self.ajaxControl_loadReference.Ajax($regionRef,
                    {
                        dataType: "json",
                        method: 'GET',
                        url: 'finApi/GetARSLinkReference'
                    },
                    function (newData) {
                        if (newData != null && newData.Result === 0 && newData.List) {
                            var retval = [];
                            //
                            newData.List.forEach(function (el) {
                                retval.push({
                                    ID: el.ID,
                                    Name: el.Name,
                                    Checked: false
                                });
                            });
                            //
                            deffered.resolve(retval);
                        }
                        else deffered.resolve();
                        //
                        $.when(self.controlReferenceSelector.$initializeCompleted).done(function () {
                            retD.resolve();
                        });
                    });
                //
                return retD.promise();
            };
            //
            self.DatePromised = ko.observable(null);//js Date - дата (изменения), после которой показывать объекты
            self.DatePromised.subscribe(function () {
                self.ImplementFilter();
            });
            self.controlDatePromised = '';//dateTimeControl
            //
            self.DatePromisedString = ko.observable();//отображаемое значение даты (редактируемое поле ввода / контрол выбора даты)
            self.DatePromisedString.subscribe(function (newValue) {
                if (self.controlDatePromised.$isLoaded.state() != 'resolved')
                    return;
                //
                var dt = self.controlDatePromised.dtpControl.length > 0 ? self.controlDatePromised.dtpControl.datetimepicker('getValue') : null;
                //
                if (!newValue || newValue.length == 0)
                    self.DatePromised(null);//clear field => reset value
                else if (dtLib.Date2String(dt) != newValue) {
                    self.DatePromised(null);//value incorrect => reset value
                    self.DatePromisedString('');
                }
                else
                    self.DatePromised(dt);
            });
            self.InitializeDatePromised = function () {
                var $dtp = self.$region.find('.ars-link_dtpDatePromised');
                //
                self.controlDatePromised = new dtLib.control();
                self.controlDatePromised.init($dtp, {
                    StringObservable: self.DatePromisedString,
                    ValueDate: self.DatePromised(),
                    OnSelectDateFunc: function (current_time, $input) {
                        self.DatePromised(current_time);
                        self.DatePromisedString(dtLib.Date2String(current_time));
                    },
                    OnSelectTimeFunc: function (current_time, $input) {
                        self.DatePromised(current_time);
                        self.DatePromisedString(dtLib.Date2String(current_time));
                    },
                    HeaderText: getTextResource('ARS_BeforeUtcDatePromised'),
                    ClassText: 'ars-link_dtpDatePromisedHeader',
                    FocusControl: focusSearcher
                });
            };
            //
            self.ImplementFilter = function (firstTime) {
                var reference = [];
                var numbers = [];
                var customers = [];
                //
                var treeProductCatalogClassID = self.SelectedTreeValueProductCatalog() ? self.SelectedTreeValueProductCatalog().ClassID : null;
                var treeProductCatalogID = self.SelectedTreeValueProductCatalog() ? self.SelectedTreeValueProductCatalog().ID : null;
                //
                var datePromise = self.DatePromised() ? dtLib.GetMillisecondsSince1970(self.DatePromised()) : null;
                //
                if (self.controlNumbersSelector) {
                    var currentNumbers = self.controlNumbersSelector.GetSelectedItems();
                    if (currentNumbers)
                        ko.utils.arrayForEach(currentNumbers, function (el) {
                            numbers.push(el.ID);
                        });
                    //
                }
                //
                if (self.controlCustomersSelector) {
                    var currentCustomers = self.controlCustomersSelector.GetSelectedItems();
                    if (currentCustomers)
                        ko.utils.arrayForEach(currentCustomers, function (el) {
                            customers.push(el.ID);
                        });
                    //
                }
                //
                if (self.controlReferenceSelector) {
                    var currentReference = self.controlReferenceSelector.GetSelectedItems();
                    if (currentReference)
                        ko.utils.arrayForEach(currentReference, function (el) {
                            reference.push(el.ID);
                        });
                    //
                }
                //
                var old = self.tableModel.searchFilterData();
                var newData = {
                    ProductCatalogClassID: treeProductCatalogClassID,
                    ProductCatalogID: treeProductCatalogID,
                    NumbersID: numbers,
                    CustomerFilterClassID: self.SelectedTreeValueCustomerSubdivision() ? self.SelectedTreeValueCustomerSubdivision().ClassID : null,
                    CustomerFilterID: self.SelectedTreeValueCustomerSubdivision() ? self.SelectedTreeValueCustomerSubdivision().ID : null,
                    CustomersID: customers,
                    ReferenceID: reference,
                    DatePromise: datePromise
                };
                //
                if (firstTime === true || self.IsFilterDataDifferent(old, newData)) {
                    self.tableModel.searchFilterData(newData);
                    //
                    if (firstTime === true)
                        self.UpdateTable();
                    else
                        self.UpdateTableByFilter(newData);
                }
            };
            //
            self.updateTableByFilterTimeout = null;
            self.UpdateTableByFilter = function (data) {
                clearTimeout(self.updateTableByFilterTimeout);
                self.updateTableByFilterTimeout = setTimeout(function () {
                    if (!self.IsFilterDataDifferent(self.tableModel.searchFilterData(), data))
                        self.UpdateTable();
                }, 500);
            };
            //
            self.IsFilterDataDifferent = function (oldData, newData) {
                if (!oldData || !newData)
                    return false;
                //
                if (oldData.ProductCatalogClassID !== newData.ProductCatalogClassID)
                    return true;
                //
                if (oldData.ProductCatalogID !== newData.ProductCatalogID)
                    return true;
                //
                if (oldData.CustomerFilterClassID !== newData.CustomerFilterClassID)
                    return true;
                //
                if (oldData.CustomerFilterID !== newData.CustomerFilterID)
                    return true;
                //
                if (arr_diff(oldData.NumbersID, newData.NumbersID).length != 0)
                    return true;
                //
                if (arr_diff(oldData.CustomersID, newData.CustomersID).length != 0)
                    return true;
                //
                if (arr_diff(oldData.ReferenceID, newData.ReferenceID).length != 0)
                    return true;
                //
                if (oldData.DatePromise !== newData.DatePromise)
                    return true;
                //
                return false;
            };
            var arr_diff = function (a1, a2) {
                var a = [], diff = [];
                for (var i = 0; i < a1.length; i++) {
                    a[a1[i]] = true;
                }
                //
                for (var i = 0; i < a2.length; i++) {
                    if (a[a2[i]]) {
                        delete a[a2[i]];
                    } else {
                        a[a2[i]] = true;
                    }
                }
                //
                for (var k in a) {
                    diff.push(k);
                }
                //
                return diff;
            };
            //
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
                var $workplace = self.$region.find('.ars-link-parameters');
                //alex removed
                //if ($workplace.length > 0)
                //    showSpinner($workplace[0]);
                $.when(self.tableModel.Reload()).done(function () {
                    //if ($workplace.length > 0)
                    //    hideSpinner($workplace[0]);
                    self.columnsModel.refreshListSize();
                });
                //
                return returnD;
            };
            //
            self.AfterRender = function () {
                self.InitializeTable();
                if (!bindedObject.ProductCatalogID)
                    self.InitTreeProductCatalog();
                self.InitTreeCustomerSubdivision();
                self.InitializeNumbersSelector();
                self.InitializeCustomersSelector();
                self.InitializeReferenceSelector();
                self.InitializeDatePromised();
                //
                if (focusSearcher)
                    focusSearcher();
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
            self.ID = obj.ID;
            self.ClassID = obj.ClassID;
            self.WorkOrderID = obj.WorkOrderID;
            self.OrderNumber = ko.observable(obj.OrderNumber);
            self.Note = ko.observable(obj.Note);
            self.ProductCatalogModelID = obj.ProductCatalogModelID;
            self.ProductCatalogModelClassID = obj.ProductCatalogModelClassID;
            self.ProductCatalogModelFullName = ko.observable(obj.ProductCatalogModelFullName);
            self.UnitID = ko.observable(obj.UnitID);
            self.UnitName = ko.observable(obj.UnitName);
            //
            self.State = ko.observable(obj.State);
            self.NDSType = ko.observable(obj.NDSType);
            self.NDSPercent = ko.observable(obj.NDSPercent);
            self.StateString = ko.observable(obj.StateString);
            self.NDSTypeString = ko.observable(obj.NDSTypeString);
            self.NDSPercentString = ko.observable(obj.NDSPercentString);
            self.NDSInfo = ko.computed(function () {
                if (self.NDSType() === 1) //Не облагается
                    return self.NDSTypeString();
                //
                if (self.NDSPercent() === 0) //Вручную
                    return self.NDSPercentString();
                else return self.NDSPercentString() + '%';
            });
            //
            self.ManufacturerName = ko.observable(obj.ManufacturerName);
            self.ProductCatalogTypeName = ko.observable(obj.ProductCatalogTypeName);
            self.ProductCatalogTypeID = ko.observable(obj.ProductCatalogTypeID);
            self.WorkOrderNumber = ko.observable(obj.WorkOrderNumber);
            self.CustomerFullName = ko.observable(obj.CustomerFullName);
            self.WorkOrderUtcDatePromised = ko.observable(parseDate(obj.WorkOrderUtcDatePromised));
            self.AvailableCount = ko.observable(obj.AvailableCount == null ? 0 : obj.AvailableCount);
            //
            self.Selected = ko.observable(mainCheckerAlreadySelected ? mainCheckerAlreadySelected(self.ID) : false);
            self.Selected.subscribe(function (newValue) {
                if (onSelectedChange)
                    onSelectedChange(self, newValue);
            });
            //
            self.Max = self.AvailableCount() > module.MaxCount ? module.MaxCount : self.AvailableCount();
            self.Count = ko.observable(self.Max);
            self.Count.subscribe(function (newValue) {
                var val = parseInt(newValue);
                if (val <= 0 || isNaN(val))
                    self.Count(1);
                else if (val > self.Max)
                    self.Count(self.Max);
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
                    limit: [1, self.Max],
                    onStep: function (val, up) {
                        self.Count(val);
                    }
                });
            };
        }
    }
    return module;
});