define(['knockout', 'jquery', 'ajax', 'ttControl', 'models/FinanceForms/ActivesRequestSpecification', 'models/FinanceForms/ActivesRequestSpecificationForm', 'models/FinanceForms/GoodsInvoiceSpecification', 'jqueryStepper'], function (ko, $, ajaxLib, tclib, specLib, formLib, invoiceSpecLib) {
    var module = {
        MaxPrice: 1000000000,
        MaxCount: 1000000,
        CurrentCurrency: getTextResource('CurrentCurrency'),
        CalculatePriceWithNDS: formLib.CalculatePriceWithNDS,
        GetNdsPercent: formLib.GetNdsPercent,

        ViewModel: function (specObject, canEdit_object, $region) {
            var self = this;
            self.LoadD = $.Deferred();
            //
            self.$region = $region;
            self.CanEdit = canEdit_object;
            self.isEditModel = ko.observable(false);
            self.Specification = specObject;
            self.IsWorkOrderHasDetailBudget = ko.observable(false);
            //
            self.isOperationeActivesRequestSpecificationProperties = ko.observable(false);
            self.isOperationPurchaseSpecificationProperties = ko.observable(false);            
            //
            self.TotalValues = ko.observable({
                CostWithoutNDS: self.Specification.CostWithoutNDS,
                CostWithNDS: self.Specification.CostWithNDS,
                SumNDS: self.Specification.SumNDS,
                PriceWithoutNDS: self.Specification.PriceWithoutNDS,
                PriceWithNDS: self.Specification.PriceWithNDS
            });
            self.TotalValuesString = ko.computed(function () {
                var tv = self.TotalValues();
                //
                return {
                    CostWithoutNDS: specLib.ToMoneyString(tv.CostWithoutNDS) + ' ' + module.CurrentCurrency,
                    CostWithNDS: specLib.ToMoneyString(tv.CostWithNDS) + ' ' + module.CurrentCurrency,
                    SumNDS: specLib.ToMoneyString(tv.SumNDS) + ' ' + module.CurrentCurrency,
                    PriceWithoutNDS: specLib.ToMoneyString(tv.PriceWithoutNDS) + ' ' + module.CurrentCurrency,
                    PriceWithNDS: specLib.ToMoneyString(tv.PriceWithNDS) + ' ' + module.CurrentCurrency
                };
            });
            //
            {//granted operations
                self.grantedOperations = [];
                $.when(userD).done(function (user) {
                    self.grantedOperations = user.GrantedOperations;
                });
                self.operationIsGranted = function (operationID) {
                    for (var i = 0; i < self.grantedOperations.length; i++)
                        if (self.grantedOperations[i] === operationID)
                            return true;
                    return false;
                };
                //
                $.when(userD).done(function (user) {
                    self.grantedOperations = user.GrantedOperations;
                    //
                    self.isOperationeActivesRequestSpecificationProperties(self.operationIsGranted(819));

                    self.isOperationPurchaseSpecificationProperties(self.operationIsGranted(835));
                });
            }
            //
            self.NDSTypeList = ko.observableArray([]);
            self.NDSPercentList = ko.observableArray([]);
            self.SelectedNDSType = ko.observable(null);
            self.SelectedNDSPercent = ko.observable(null);
            self.NDSCustomValue = ko.observable(self.Specification.NDSCustomValue);
            self.NDSCustomValueInput = ko.observable(self.Specification.NDSCustomValueString);
            //
            self.SelectedNDSType.subscribe(function (newValue) {
                self.Recalculate();
            });
            self.NDSCustomValueInput.subscribe(function (newValue) {
                if (newValue && !self.Price()) {
                    require(['sweetAlert'], function () {
                        swal(getTextResource('ARS_Form_PriceIsEmpty'), '', 'info');
                    });
                    self.NDSCustomValueInput('');
                    return;
                }
                //
                if (!self.SelectedNDSPercent() || (newValue && self.SelectedNDSPercent().ID !== 0)) { //BLL.Finance.Specification.NDSPercent
                    var custom = ko.utils.arrayFirst(self.NDSPercentList(), function (el) {
                        return el.ID == 0;
                    });
                    self.SelectedNDSPercent(custom);
                }
                //
                if (!newValue)
                    self.NDSCustomValue(null);
                else {
                    var dec = parseFloat(newValue.split(' ').join('').split(' ').join('').replace(',', '.'));//hack
                    if (!dec)
                        self.NDSCustomValue(null);
                    else {
                        self.NDSCustomValue(specLib.Normalize(Math.abs(dec)));
                        //
                        if (self.NDSCustomValue() > self.Price()) {
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ARS_Form_PriceIsLesser'), '', 'info');
                            });
                            self.NDSCustomValueInput('');
                            return;
                        }
                        if (dec < 0)
                            self.NDSCustomValueInput(self.NDSCustomValue().toString());
                    }
                }
                //
                self.Recalculate();
            });
            //
            self.ModelID = ko.observable(self.Specification.ProductCatalogModelID);
            self.ModelClassID = ko.observable(self.Specification.ProductCatalogModelClassID);
            self.ModelFullName = ko.observable(self.Specification.ProductCatalogModelFullName);
            self.ModelManufacturerName = ko.observable('');
            self.ModelTypeName = ko.observable('');
            self.ModelProductNumber = ko.observable('');
            self.AvailableCategoryID = ko.observable(self.Specification.ProductCatalogCategoryID);
            self.AvailableTypeID = ko.observable(self.Specification.ProductCatalogTypeID);           
            //
            self.Count = ko.observable(self.Specification.Count);
            self.CanEditCount = ko.computed(function () {
                return self.ModelClassID() != 115 && self.ModelClassID() != 386;//agreement, contract
            });
            self.Price = ko.observable(self.Specification.Price);
            self.PriceInput = ko.observable(specLib.ToMoneyString(self.Price()));
            self.Note = ko.observable(self.Specification.Note);
            //
            self.UnitList = ko.observableArray([]);
            self.SelectedUnit = ko.observable(null);
            self.SelectedUnit.subscribe(function (newValue) {
                self.Recalculate();
            });
            //
            self.textFieldFocusOut = function () {
                self.PriceInput(specLib.ToFormattedMoneyString(self.PriceInput()));
                self.NDSCustomValueInput(specLib.ToFormattedMoneyString(self.NDSCustomValueInput()));
            };
            //
            self.PriceInput.subscribe(function (newValue) {
                if (!newValue)
                    self.Price(null);
                else {
                    var dec = parseFloat(newValue.split(' ').join('').split(' ').join('').replace(',', '.'));//hack
                    if (!dec)
                        self.Price(null);
                    else self.Price(specLib.Normalize(Math.abs(dec)));
                }
                //
                if (self.NDSCustomValue() > self.Price()) {
                    require(['sweetAlert'], function () {
                        swal(getTextResource('ARS_Form_PriceIsLesser'), '', 'info');
                    });
                    self.NDSCustomValueInput('');
                }
                //
                if (self.Price() > module.MaxPrice)
                    self.PriceInput(module.MaxPrice.toString());
                if (dec < 0)
                    self.PriceInput(self.Price().toString());
                //
                self.Recalculate();
            });
            //
            self.RecalculateCount = function () {
                var current = self.Count();
                var totalFromList = self.ARSList_TotalCount();
                //
                if (current < totalFromList)
                    self.Count(totalFromList);
            };
            self.Count.subscribe(function (newValue) {
                var val = parseInt(newValue);
                if (val <= 0 || isNaN(val))
                    self.Count(1);
                else if (val > module.MaxCount)
                    self.Count(module.MaxCount);
                //
                self.RecalculateCount();
                //
                self.Recalculate();
            });
            //
            self.getNDSTypeList = function (options) {
                var data = self.NDSTypeList();
                options.callback({ data: data, total: data.length });
            };
            self.getUnitList = function (options) {
                var data = self.UnitList();
                options.callback({ data: data, total: data.length });
            };
            //
            self.OnPercentSelected = function (newValue) {
                if (!self.CanEdit() || !self.isOperationPurchaseSpecificationProperties())
                    return;
                //
                self.SelectedNDSPercent(newValue);
                if (newValue && newValue.ID !== 0) //BLL.Finance.Specification.NDSPercent
                    self.NDSCustomValueInput(null);
                //
                self.Recalculate();
            };
            //
            self.IsNeedShowPercentBlock = ko.computed(function () {
                var type = self.SelectedNDSType();
                if (type && type.ID != '1') //BLL.Finance.Specification.NDSType
                    return true;
                //
                return false;
            });
            self.IsNeedBlurPercentList = ko.computed(function () {
                var type = self.SelectedNDSPercent();
                if (type && type.ID == '0') //BLL.Finance.Specification.NDSPercent
                    return true;
                //
                return false;
            });
            self.IsNeedBlurCustomNDSBlock = ko.computed(function () {
                var type = self.SelectedNDSPercent();
                if (type && type.ID != '0') //BLL.Finance.Specification.NDSPercent
                    return true;
                //
                return false;
            });
            //
            {//tabs
                self.tabs = {
                    general: 'general',
                    finance: 'finance'
                };
                self.SelectedTab = ko.observable(self.tabs.general);
            }
            //
            {//financeBudgetRowList
                self.FinanceBudgetRowList = ko.observableArray([]);
                self.FinanceBudgetRowList_Sum = ko.computed(function () {
                    if (self.FinanceBudgetRowList().length == 0)
                        return 0;
                    //
                    var retval = 0.0;
                    ko.utils.arrayForEach(self.FinanceBudgetRowList(), function (el) {
                        retval += self.getFloatValue(el.Sum());
                    });
                    retval = specLib.Normalize(retval);
                    //
                    return retval;
                });
                self.FinanceBudgetRowList_SumString = ko.computed(function () {
                    return specLib.ToMoneyString(self.FinanceBudgetRowList_Sum()) + ' ' + module.CurrentCurrency;
                });
                self.FinanceBudgetRowList_FinancePercentString = ko.computed(function () {
                    var tmp = self.TotalValues().CostWithNDS;
                    return tmp == 0 ? '' : getMoneyString(normalize(self.FinanceBudgetRowList_Sum() / tmp * 100)) + ' %';
                });
                self.FinanceBudgetRowList_SortTable = function () {
                    self.FinanceBudgetRowList.sort(
                            function (left, right) {
                                return left.Identifier == right.Identifier ?
                                    (left.Name == right.Name ? 0 : (left.Name < right.Name ? -1 : 1)) :
                                    (left.Identifier < right.Identifier ? -1 : 1);
                            }
                        );
                };
                //
                self.ajaxControl_financeBudgetRowList = new ajaxLib.control();
                self.LoadFinanceBudgetRowList = function () {
                    var retD = $.Deferred();
                    //
                    if (isBudgetEnabled == true) {
                        var param = {
                            PurchaseSpecificationID: self.Specification.ID
                        };
                        //
                        self.ajaxControl_financeBudgetRowList.Ajax(self.$region,
                        {
                            dataType: "json",
                            method: 'GET',
                            url: 'finApi/GetFinanceBudgetRowDependencyListByPurchaseSpecification?' + $.param(param)
                        },
                        function (newVal) {
                            if (newVal && newVal.Result === 0) {
                                if (newVal.List) {
                                    ko.utils.arrayForEach(newVal.List, function (item) {
                                        var row = new module.FinanceBudgetRow(item, self);
                                        self.FinanceBudgetRowList().push(row);
                                    });
                                    //
                                    self.FinanceBudgetRowList_SortTable();
                                    self.FinanceBudgetRowList.valueHasMutated();
                                }
                                else {
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('AjaxError') + '\n[PurchaseSpecificationForm.js, LoadFinanceBudgetRowList]', 'error');
                                    });
                                }
                            }
                            else if (newVal && newVal.Result === 1)
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[PurchaseSpecificationForm.js, LoadFinanceBudgetRowList]', 'error');
                                });
                            else
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[PurchaseSpecificationForm.js, LoadFinanceBudgetRowList]', 'error');
                                });
                            retD.resolve();
                        },
                        null,
                        function () {
                            retD.resolve();
                        });
                    }
                    else
                        retD.resolve();
                    //
                    return retD;
                };
                //
                self.getFloatValue = function (val) {
                    if (val)
                        return parseFloat(val.toString().replace(',', '.').split(' ').join(''));
                    else
                        return 0;
                };
                self.FinanceBudgetRowList_AddClick = function () {
                    require(['financeForms'], function (fh) {
                        var fh = new fh.formHelper(true);
                        fh.ShowFinanceBudgetRowSearcher(self.Specification.ID, function (selectedFinanceBudgetRowArray) {
                            for (var i = 0; i < selectedFinanceBudgetRowArray.length; i++) {
                                var obj = selectedFinanceBudgetRowArray[i];
                                var tmp = {
                                    ID: obj.ID,
                                    Identifier: obj.Identifier,
                                    Name: obj.Name,
                                    InitiatorFullName: obj.InitiatorFullName,
                                    BudgetFullName: obj.BudgetFullName,
                                    AvailableSum: self.getFloatValue(obj.AvailableSum),
                                    Sum: self.getFloatValue(obj.Sum()),
                                };
                                //
                                var list = self.FinanceBudgetRowList();
                                var existRow = null;
                                for (var j = 0; j < list.length; j++)
                                    if (list[j].ID.toUpperCase() == tmp.ID.toUpperCase()) {
                                        existRow = list[j];
                                        break;
                                    }
                                if (existRow != null)
                                    existRow.Sum(tmp.Sum);
                                else {
                                    var row = new module.FinanceBudgetRow(tmp, self);
                                    self.FinanceBudgetRowList().push(row);
                                }
                            }
                            self.FinanceBudgetRowList_SortTable();
                            self.FinanceBudgetRowList.valueHasMutated();
                        });
                    });
                };
            }
            //
            //ARSLIST_BLOCK
            {
                self.ARSList = ko.observableArray([]);
                self.ARSListExpanded = ko.observable(true);
                self.ExpandCollapseARSList = function () {
                    self.ARSListExpanded(!self.ARSListExpanded());
                };
                self.ARSList_TotalSumNDS = ko.computed(function () {
                    if (!self.ARSList || !self.ARSList() || self.ARSList().length == 0)
                        return 0;
                    //
                    var retval = 0.0;
                    ko.utils.arrayForEach(self.ARSList(), function (el) {
                        retval += el.SumNDS();
                    });
                    retval = specLib.Normalize(retval);
                    //
                    return retval;
                });
                self.ARSList_TotalSumNDSString = ko.computed(function () {
                    return specLib.ToMoneyString(self.ARSList_TotalSumNDS());
                });
                self.ARSList_TotalCostWithNDS = ko.computed(function () {
                    if (!self.ARSList || !self.ARSList() || self.ARSList().length == 0)
                        return 0;
                    //
                    var retval = 0.0;
                    ko.utils.arrayForEach(self.ARSList(), function (el) {
                        retval += el.CostWithNDS();
                    });
                    retval = specLib.Normalize(retval);
                    //
                    return retval;
                });
                self.ARSList_TotalCostWithNDSString = ko.computed(function () {
                    return specLib.ToMoneyString(self.ARSList_TotalCostWithNDS());
                });
                self.ARSList_TotalCostWithoutNDS = ko.computed(function () {
                    if (!self.ARSList || !self.ARSList() || self.ARSList().length == 0)
                        return 0;
                    //
                    var retval = 0.0;
                    ko.utils.arrayForEach(self.ARSList(), function (el) {
                        retval += el.CostWithoutNDS();
                    });
                    retval = specLib.Normalize(retval);
                    //
                    return retval;
                });
                self.ARSList_TotalCostWithoutNDSString = ko.computed(function () {
                    return specLib.ToMoneyString(self.ARSList_TotalCostWithoutNDS());
                });
                //
                self.ARSList_TotalCount = function () {
                    if (!self.ARSList || !self.ARSList() || self.ARSList().length == 0)
                        return 0;
                    //
                    var retval = 0;
                    ko.utils.arrayForEach(self.ARSList(), function (el) {
                        retval += parseInt(el.DependencyCount());
                    });
                    //
                    return retval;
                };
                //
                self.ARSList_SortTable = function () {
                    if (!self.ARSList)
                        return;

                    self.ARSList.sort(
                            function (left, right) {
                                if (left.OrderNumber() == null)
                                    return -1;
                                //
                                if (right.OrderNumber() == null)
                                    return 1;
                                //
                                return left.OrderNumber() == right.OrderNumber() ? 0 : (left.OrderNumber() < right.OrderNumber() ? -1 : 1);
                            }
                        );
                };
            }
            //
            self.InvoiceList = ko.observableArray([]);
            self.InvoiceListExpanded = ko.observable(true);
            self.ExpandCollapseInvoiceList = function () {
                self.InvoiceListExpanded(!self.InvoiceListExpanded());
            };
            //
            self.AfterRender = function () {
                $.when(self.Initialize()).done(function () {
                    self.LoadD.resolve();
                });
            };
            //
            self.Initialize = function () {
                var initD = $.Deferred();
                //
                $.when(self.LoadModelInfo(), self.LoadLists(), self.LoadDependencyList(), self.LoadInvoiceList()).done(function () {
                    if (self.CanEdit() && self.CanEditCount() && self.isOperationPurchaseSpecificationProperties()) {
                        var $input = self.$region.find('.spec_form-count-TextField');
                        $input.stepper({
                            type: 'int',
                            floatPrecission: 0,
                            wheelStep: 1,
                            arrowStep: 1,
                            limit: [1, module.MaxCount],
                            onStep: function (val, up) {
                                self.Count(val);
                            }
                        });
                    }
                    //
                    initD.resolve();
                    //
                    self.Recalculate();
                });
                self.LoadFinanceBudgetRowList();
                return initD.promise();
            };
            //
            self.Recalculate = function () {
                var price = self.Price();
                var count = self.Count();
                var type = self.SelectedNDSType();
                type = type ? parseInt(type.ID) : null;
                var percent = self.SelectedNDSPercent();
                percent = percent ? parseInt(percent.ID) : null;
                var customValue = self.NDSCustomValue();
                //
                var tv = module.CalculatePriceWithNDS(price, count, type, percent, customValue);
                self.TotalValues(tv);
            };
            //
            self.GetNewValues = function () {
                var arsEditedList = [];
                if (self.ARSList() && self.ARSList().length > 0)
                    ko.utils.arrayForEach(self.ARSList(), function (el) {
                        if (el)
                            arsEditedList.push({
                                ARSID: el.ID,
                                Count: el.DependencyCount()
                            });
                    });
                var financeBudgetRowList = [];
                ko.utils.arrayForEach(self.FinanceBudgetRowList(), function (el) {
                    if (el)
                        financeBudgetRowList.push({
                            FinanceBudgetRowID: el.ID,
                            Sum: self.getFloatValue(el.Sum())
                        });
                });
                //
                return {
                    ID: self.Specification.ID,
                    WorkOrderID: self.Specification.WorkOrderID,
                    OrderNumber: self.Specification.OrderNumber,
                    ProductCatalogModelID: self.ModelID(),
                    ProductCatalogModelClassID: self.ModelClassID(),
                    Price: self.Price(),
                    Count: self.Count(),
                    State: self.Specification.State,
                    NDSType: self.SelectedNDSType() ? parseInt(self.SelectedNDSType().ID) : null,
                    NDSPercent: self.SelectedNDSPercent() ? parseInt(self.SelectedNDSPercent().ID) : null,
                    NDSCustomValue: self.NDSCustomValue(),
                    Note: self.Note(),
                    //
                    UnitID: self.SelectedUnit() ? self.SelectedUnit().ID : null,
                    UnitName: self.SelectedUnit() ? self.SelectedUnit().Name : null,
                    Delivered: self.InvoiceList().length,
                    //
                    ARSDependencyList: arsEditedList,
                    FinanceBudgetRowList: financeBudgetRowList
                };
            };
            //
            self.ajaxControl_loadModel = new ajaxLib.control();
            self.LoadModelInfo = function () {
                var retD = $.Deferred();
                //
                $.when(userD).done(function (user) {
                    var param = {
                        ModelID: self.ModelID(),
                        ClassID: self.ModelClassID()
                    };
                    //
                    self.ajaxControl_loadModel.Ajax(self.$region,
                    {
                        dataType: "json",
                        method: 'GET',
                        url: 'imApi/GetModelByID?' + $.param(param)
                    },
                    function (newVal) {
                        if (newVal && newVal.Result === 0) {
                            if (newVal.Model) {
                                self.ModelManufacturerName(newVal.Model.ManufacturerName);
                                self.ModelTypeName(newVal.Model.TypeName);
                                self.ModelProductNumber(newVal.Model.ProductNumber);
                                self.AvailableTypeID(newVal.Model.TypeID);
                                self.AvailableCategoryID(newVal.Model.ProductCatalogCategoryID);
                            }
                            else {
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('AjaxError') + '\n[PurchaseSpecificationForm.js, LoadModelInfo]', 'error');
                                });
                            }
                        }
                        else if (newVal && newVal.Result === 1)
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[PurchaseSpecificationForm.js, LoadModelInfo]', 'error');
                            });
                        else
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[PurchaseSpecificationForm.js, LoadModelInfo]', 'error');
                            });
                        retD.resolve();
                    },
                    null,
                    function () {
                        retD.resolve();
                    });
                });
                //
                $.when(retD).done(function () {
                    var param = {
                        WorkOrderID: self.Specification.WorkOrderID
                    };
                    self.ajaxControl_loadModel.Ajax(self.$region,
                    {
                        dataType: "json",
                        method: 'GET',
                        url: 'sdApi/IsWorkOrderHasDetailBudget?' + $.param(param)
                    },
                    function (newVal) {
                        self.IsWorkOrderHasDetailBudget(newVal);
                    });
                });
                //
                return retD;
            };
            //
            self.ajaxControl_loadDependency = new ajaxLib.control();
            self.LoadDependencyList = function () {
                var retD = $.Deferred();
                //
                $.when(userD).done(function (user) {
                    var param = {
                        PurchaseSpecificationID: self.Specification.ID
                    };
                    //
                    self.ajaxControl_loadDependency.Ajax(self.$region,
                    {
                        dataType: "json",
                        method: 'GET',
                        url: 'finApi/GetPurchaseSpecificationDependencyList?' + $.param(param)
                    },
                    function (newVal) {
                        if (newVal && newVal.Result === 0) {
                            if (newVal.ARSList) {
                                ko.utils.arrayForEach(newVal.ARSList, function (item) {
                                    var specRow = new module.DependencyARSObject(item, self);
                                    //
                                    self.ARSList.push(specRow);
                                });
                                //
                                self.ARSList_SortTable();
                                self.ARSList.valueHasMutated();
                            }
                            else {
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('AjaxError') + '\n[PurchaseSpecificationForm.js, LoadDependencyList]', 'error');
                                });
                            }
                        }
                        else if (newVal && newVal.Result === 1)
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[PurchaseSpecificationForm.js, LoadDependencyList]', 'error');
                            });
                        else
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[PurchaseSpecificationForm.js, LoadDependencyList]', 'error');
                            });
                        retD.resolve();
                    },
                    null,
                    function () {
                        retD.resolve();
                    });
                });
                //
                return retD;
            };
            //
            self.ajaxControl_loadLists = new ajaxLib.control();
            self.LoadLists = function () {
                var retD = $.Deferred();
                //
                $.when(userD).done(function (user) {
                    self.ajaxControl_loadLists.Ajax(self.$region,
                    {
                        dataType: "json",
                        method: 'GET',
                        url: 'finApi/GetPurchaseSpecificationsEnums'
                    },
                    function (newVal) {
                        if (newVal && newVal.Result === 0) {
                            if (newVal.NDSTypeList && newVal.NDSPercentList && newVal.UnitList) {
                                ko.utils.arrayForEach(newVal.NDSTypeList, function (el) {
                                    self.NDSTypeList.push(el);
                                });
                                ko.utils.arrayForEach(newVal.NDSPercentList, function (el) {
                                    self.NDSPercentList.push(el);
                                });
                                //
                                ko.utils.arrayForEach(newVal.UnitList, function (el) {
                                    self.UnitList.push(el);
                                });
                                //
                                self.NDSTypeList.valueHasMutated();
                                self.NDSPercentList.valueHasMutated();
                                self.UnitList.valueHasMutated();
                                //
                                if (self.Specification.NDSType !== null) {
                                    var selected = ko.utils.arrayFirst(self.NDSTypeList(), function (el) {
                                        return el.ID == self.Specification.NDSType;
                                    });
                                    //
                                    self.SelectedNDSType(selected);
                                }
                                //
                                if (self.Specification.NDSPercent !== null) {
                                    var selected = ko.utils.arrayFirst(self.NDSPercentList(), function (el) {
                                        return el.ID == self.Specification.NDSPercent;
                                    });
                                    //
                                    self.SelectedNDSPercent(selected);
                                }
                                //
                                if (self.Specification.UnitID !== null) {
                                    var selected = ko.utils.arrayFirst(self.UnitList(), function (el) {
                                        return el.ID == self.Specification.UnitID;
                                    });
                                    //
                                    self.SelectedUnit(selected);
                                    //
                                    if (selected == null) //кто-то грохнул в справочнике
                                        require(['sweetAlert'], function () {
                                            swal(getTextResource('UnitWasDeleted'), '', 'warning');
                                        });
                                }
                            }
                            else {
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('AjaxError') + '\n[PurchaseSpecificationForm.js, LoadLists]', 'error');
                                });
                            }
                        }
                        else if (newVal && newVal.Result === 1)
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[PurchaseSpecificationForm.js, LoadLists]', 'error');
                            });
                        else
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[PurchaseSpecificationForm.js, LoadLists]', 'error');
                            });
                        retD.resolve();
                    },
                    null,
                    function () {
                        retD.resolve();
                    });
                });
                //
                return retD;
            };
            //
            self.ShowInvoiceForm = function (obj) {
                require(['financeForms'], function (module) {
                    var fh = new module.formHelper(true);
                    fh.ShowInvoiceSpecification(null, obj, self.CanEdit);
                });
            };
            //
            self.ajaxControl_loadInvoice = new ajaxLib.control();
            self.LoadInvoiceList = function () {
                var retD = $.Deferred();
                //
                $.when(userD).done(function (user) {
                    var param = {
                        ObjectID: self.Specification.ID,
                        ObjectClassID: 381
                    };
                    //
                    self.ajaxControl_loadInvoice.Ajax(self.$region,
                    {
                        dataType: "json",
                        method: 'GET',
                        url: 'finApi/GetGoodsInvoiceSpecificationList?' + $.param(param)
                    },
                    function (newVal) {
                        if (newVal && newVal.Result === 0) {
                            if (newVal.List) {
                                ko.utils.arrayForEach(newVal.List, function (item) {
                                    self.InvoiceList.push(new invoiceSpecLib.Specification(null, item));
                                });
                                //
                                self.InvoiceList.valueHasMutated();
                            }
                            else {
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('AjaxError') + '\n[PurchaseSpecificationForm.js, LoadInvoiceList]', 'error');
                                });
                            }
                        }
                        else if (newVal && newVal.Result === 1)
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[PurchaseSpecificationForm.js, LoadInvoiceList]', 'error');
                            });
                        else
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[PurchaseSpecificationForm.js, LoadInvoiceList]', 'error');
                            });
                        retD.resolve();
                    },
                    null,
                    function () {
                        retD.resolve();
                    });
                });
                //
                return retD;
            };

            self.SelectModel = function () {
                if (self.isOperationPurchaseSpecificationProperties() == false || self.CanEditCount() == false)
                    return;
                else {

                require(['assetForms'], function (module) {
                    var fh = new module.formHelper(true);
                    fh.ShowAssetModelLink(
                        false, true,
                        function (newValues) {
                            if (!newValues || newValues.length == 0)
                                return;
                            //
                            if (newValues.length == 1) {
                                var model = newValues[0];
                                self.ModelID(model.ID);
                                self.ModelClassID(model.ClassID);
                                self.ModelTypeName(model.TypeName);
                                self.ModelManufacturerName(model.ManufacturerName);
                                self.ModelProductNumber(model.ProductNumber);
                                //
                                var modelFullName = model.Name;
                                self.ModelFullName(modelFullName);
                                self.isEditModel(true);
                            }
                        },
                        true,
                        {
                            CategoryID: self.AvailableCategoryID(),
                            TypeID: self.AvailableTypeID()
                        },
                        getTextResource('AddModel')
                    );
                });
                };
           };
        },
       

        DependencyARSObject: function (obj, parent) {
            var self = this;
            var parentSelf = parent;
            //
            self.ID = obj.ID;
            self.ClassID = obj.ClassID;
            self.WorkOrderID = obj.WorkOrderID;
            self.OrderNumber = ko.observable(obj.OrderNumber);
            self.PriceWithoutNDS = ko.observable(specLib.Normalize(obj.PriceWithoutNDS));
            self.PriceWithNDS = ko.observable(specLib.Normalize(obj.PriceWithNDS));
            self.Count = ko.observable(obj.Count);
            self.Price = ko.observable(obj.Price);//не для таблиц-списков, для формы
            self.State = ko.observable(obj.State);
            self.NDSType = ko.observable(obj.NDSType);
            self.NDSPercent = ko.observable(obj.NDSPercent);
            self.NDSCustomValue = ko.observable(specLib.Normalize(obj.NDSCustomValue));
            self.Note = ko.observable(obj.Note);
            self.ProductCatalogModelID = obj.ProductCatalogModelID;
            self.ProductCatalogModelClassID = obj.ProductCatalogModelClassID;
            self.ProductCatalogModelFullName = ko.observable(obj.ProductCatalogModelFullName);
            self.SumNDS = ko.observable(specLib.Normalize(obj.SumNDS));
            self.CostWithNDS = ko.observable(specLib.Normalize(obj.CostWithNDS));
            self.CostWithoutNDS = ko.observable(specLib.Normalize(obj.CostWithoutNDS));
            self.UnitID = ko.observable(obj.UnitID);
            self.UnitName = ko.observable(obj.UnitName);
            //
            self.StateString = ko.observable(obj.StateString);
            self.NDSTypeString = ko.observable(obj.NDSTypeString);
            self.NDSPercentString = ko.observable(obj.NDSPercentString);
            //
            self.NDSCustomValueString = ko.computed(function () {
                return specLib.ToMoneyString(self.NDSCustomValue());
            });
            self.PriceWithNDSString = ko.computed(function () {
                return specLib.ToMoneyString(self.PriceWithNDS());
            });
            self.PriceWithoutNDSString = ko.computed(function () {
                return specLib.ToMoneyString(self.PriceWithoutNDS());
            });
            self.SumNDSString = ko.computed(function () {
                return specLib.ToMoneyString(self.SumNDS());
            });
            self.CostWithNDSString = ko.computed(function () {
                return specLib.ToMoneyString(self.CostWithNDS());
            });
            self.CostWithoutNDSString = ko.computed(function () {
                return specLib.ToMoneyString(self.CostWithoutNDS());
            });
            //
            self.NDSInfo = ko.computed(function () {
                if (self.NDSType() === 1) //Не облагается
                    return self.NDSTypeString();
                //
                if (self.NDSPercent() === 0) //Вручную
                    return self.NDSPercentString();
                else return self.NDSPercentString() + '%';
            });
            //
            self.WorkOrderNumber = ko.observable(obj.WorkOrderNumber);
            self.DependencyCount = ko.observable(obj.DependencyCount);
            self.DependencyCountString = ko.observable(self.DependencyCount() + ' / ' + self.Count());
            self.AvailableCount = ko.observable(obj.AvailableCount);
            self.ActiveRequestResponsibleName = ko.observable(obj.ActiveRequestResponsibleName);
            self.ReferenceObjectName = ko.observable(obj.ReferenceObjectName);

            //
            self.Max = self.AvailableCount() > module.MaxCount ? module.MaxCount : self.AvailableCount();
            self.DependencyCount.subscribe(function (newValue) {
                var val = parseInt(newValue);
                if (val <= 0 || isNaN(val))
                    self.DependencyCount(1);
                else if (val > self.Max)
                    self.DependencyCount(self.Max);
                //
                self.updateDepencyCountString();
                //
                parentSelf.RecalculateCount();
            });
            //
            self.CountClick = function (obj, e) {
                e.stopPropagation();
            };
            self.Merge = function (obj) {
                self.OrderNumber(obj.OrderNumber);
                self.PriceWithoutNDS(obj.PriceWithoutNDS);
                self.PriceWithNDS(obj.PriceWithNDS);
                self.Count(obj.Count);
                self.Price(obj.Price);
                self.State(obj.State);
                self.NDSType(obj.NDSType);
                self.NDSPercent(obj.NDSPercent);
                self.NDSCustomValue(obj.NDSCustomValue);
                self.Note(obj.Note);
                self.ProductCatalogModelID = obj.ProductCatalogModelID;
                self.ProductCatalogModelClassID = obj.ProductCatalogModelClassID;
                self.ProductCatalogModelFullName(obj.ProductCatalogModelFullName);
                //self.ProductCatalogTypeName(obj.ProductCatalogTypeName);
                self.SumNDS(obj.SumNDS);
                self.CostWithNDS(obj.CostWithNDS);
                self.CostWithoutNDS(obj.CostWithoutNDS);
                self.UnitID(obj.UnitID);
                self.UnitName(obj.UnitName);
                //
                self.StateString(obj.StateString);
                self.NDSTypeString(obj.NDSTypeString);
                self.NDSPercentString(obj.NDSPercentString);
                self.ArsObj = obj;
            };
            self.ArsObj = null;
            //
            self.ajaxControl_edit = new ajaxLib.control();
            self.ShowForm = function () {
                require(['financeForms'], function (module) {
                    var fh = new module.formHelper(true);
                    var ars = self.ArsObj == null ? ko.toJS(self) : self.ArsObj;
                    fh.ShowActivesRequestSpecification(ars, parentSelf.CanEdit, function (newData) {
                        if (!newData)
                            return;
                        //
                        var data = newData;
                        data.Operation = 0; // EDIT
                        //
                        self.ajaxControl_edit.Ajax(parent.$region,
                            {
                                dataType: "json",
                                method: 'POST',
                                data: data,
                                url: 'finApi/EditActivesRequestSpecification'
                            },
                            function (answer) {
                                if (answer && answer.Response) {
                                    var result = answer.Response.Result;
                                    if (result === 0) {
                                        var newModel = answer.NewModel;
                                        //
                                        self.Merge(newModel);
                                        //
                                        $(document).trigger('local_objectUpdated', [ars.ClassID, ars.ID, ars.ObjectID]);//Specification
                                    }
                                    else if (result === 1)
                                        require(['sweetAlert'], function () {
                                            swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[CustomNegotiation.js, SpecList_Edit]', 'error');
                                        });
                                    else if (result === 2)
                                        require(['sweetAlert'], function () {
                                            swal(getTextResource('ErrorCaption'), getTextResource('BadParamsError') + '\n[CustomNegotiation.js, SpecList_Edit]', 'error');
                                        });
                                    else if (result === 3)
                                        require(['sweetAlert'], function () {
                                            swal(getTextResource('ErrorCaption'), getTextResource('AccessError'), 'error');
                                        });
                                    else if (result === 5)
                                        require(['sweetAlert'], function () {
                                            swal(getTextResource('ErrorCaption'), getTextResource('ConcurrencyErrorWithoutQuestion'), 'error');
                                        });
                                    else if (result === 6)
                                        require(['sweetAlert'], function () {
                                            swal(getTextResource('ErrorCaption'), getTextResource('ObjectDeleted'), 'error');
                                            $.when(self.imList.ReloadAll()).done(function () {
                                                //
                                            });
                                        });
                                    else if (result === 8)
                                        require(['sweetAlert'], function () {
                                            swal(getTextResource('ErrorCaption'), getTextResource('ValidationError'), 'error');
                                        });
                                    else
                                        require(['sweetAlert'], function () {
                                            swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[CustomNegotiation.js, SpecList_Edit]', 'error');
                                        });
                                }
                                else
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[CustomNegotiation.js, SpecList_Edit]', 'error');
                                    });
                            },
                            null,
                            function () {
                                hideSpinner();
                            });

                    });
                });
            };
            //
            self.updateDepencyCountString = function () {
                self.DependencyCountString(self.DependencyCount() + ' / ' + self.Count());
            };
            //
            self.OnRender = function (htmlNodes, thisObj) {
                var node = ko.utils.arrayFirst(htmlNodes, function (html) {
                    return html.tagName == 'INPUT';
                });
                if (!node || !parentSelf.CanEdit())
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
                        self.DependencyCount(val);
                        //
                        self.updateDepencyCountString();
                    }
                });
            };
        },

        FinanceBudgetRow: function (obj, parent) {
            var self = this;
            var parentSelf = parent;
            //
            self.ID = obj.ID;
            self.Identifier = obj.Identifier;
            self.Name = obj.Name;
            self.InitiatorFullName = obj.InitiatorFullName;
            self.BudgetFullName = obj.BudgetFullName;
            self.AvailableSum = specLib.Normalize(obj.AvailableSum);
            self.Sum = ko.observable(specLib.Normalize(obj.Sum));
            self.Sum.subscribe(function (newValue) {
                if (newValue > self.AvailableSum)
                    self.Sum(self.AvailableSum);
            });
            //
            self.SumClick = function (obj, e) {
                e.stopPropagation();
            };
            //
            self.ShowForm = function () {
                require(['financeForms'], function (module) {
                    var fh = new module.formHelper(true);
                    fh.ShowFinanceBudgetRow(self.ID);
                });
            };
            self.RemoveClick = function () {
                var index = parentSelf.FinanceBudgetRowList().indexOf(self);
                if (index > -1 && parentSelf.CanEdit())
                    parentSelf.FinanceBudgetRowList().splice(index, 1);
                parent.FinanceBudgetRowList.valueHasMutated();
            };
            //
            self.OnRender = function (htmlNodes, thisObj) {
                var node = ko.utils.arrayFirst(htmlNodes, function (html) {
                    return html.tagName == 'INPUT';
                });
                if (!node || !parentSelf.CanEdit())
                    return;
                //
                var $input = $(node);
                $input.stepper({
                    type: 'float',
                    floatPrecission: 2,
                    wheelStep: 1,
                    arrowStep: 1,
                    limit: [1, self.AvailableSum],
                    onStep: function (val, up) {
                        self.Sum(val);
                    }
                });
            };
        },
    };
    return module;
});