define(['knockout', 'jquery', 'ajax', 'ttControl', 'models/FinanceForms/PurchaseSpecification', 'models/FinanceForms/PurchaseSpecificationForm', 'jqueryStepper'], function (ko, $, ajaxLib, tclib, specLib, formLib) {
    var module = {
        MaxCount: 10000,
        CurrentCurrency: getTextResource('CurrentCurrency'),
        CalculatePriceWithNDS: formLib.CalculatePriceWithNDS,
        GetNdsPercent: formLib.GetNdsPercent,
        ViewModel: function (specObject, canEdit_object, $region) {
            var self = this;
            self.LoadD = $.Deferred();
            //
            self.$region = $region;
            self.CanEdit = canEdit_object;
            self.Specification = specObject;
            //
            self.TotalValues = ko.observable({
                CostWithoutNDS: self.Specification.CostWithoutNDS(),
                CostWithNDS: self.Specification.CostWithNDS(),
                SumNDS: self.Specification.SumNDS(),
                PriceWithoutNDS: self.Specification.PriceWithoutNDS(),
                PriceWithNDS: self.Specification.PriceWithNDS()
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
            self.NDSTypeList = ko.observableArray([]);
            self.NDSPercentList = ko.observableArray([]);
            self.SelectedNDSType = ko.observable(null);
            self.SelectedNDSPercent = ko.observable(null);
            self.NDSCustomValue = self.Specification.NDSCustomValue;
            self.NDSCustomValueInput = ko.observable(self.Specification.NDSCustomValueString());
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
                    var dec = parseFloat(newValue.replace(',', '.'));
                    if (!dec)
                        self.NDSCustomValue(null);
                    else {
                        self.NDSCustomValue(specLib.Normalize(dec));
                        //
                        if (self.NDSCustomValue() > self.Price()) {
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ARS_Form_PriceIsLesser'), '', 'info');
                            });
                            self.NDSCustomValueInput('');
                            return;
                        }
                    }
                }
                //
                self.Recalculate();
            });
            //
            self.ModelID = self.Specification.ProductCatalogModelID;
            self.ModelClassID = self.Specification.ProductCatalogModelClassID;
            self.ModelFullName = self.Specification.ProductCatalogModelFullName;
            self.ModelManufacturerName = ko.observable('');
            self.ModelTypeName = ko.observable('');
            self.ModelProductNumber = ko.observable('');
            //
            self.Count = self.Specification.Count;
            self.Price = self.Specification.Price;
            self.PriceInput = ko.observable(self.Price() ? specLib.ToMoneyString(self.Price()) : null);
            self.Note = self.Specification.Note;
            //
            self.UnitList = ko.observableArray([]);
            self.SelectedUnit = ko.observable(null);
            self.SelectedUnit.subscribe(function (newValue) {
                self.Recalculate();
            });
            //
            self.SpecificationNumber = self.Specification.SpecificationNumber;
            self.CargoName = self.Specification.CargoName;
            //
            self.PriceInput.subscribe(function (newValue) {
                if (!newValue)
                    self.Price(null);
                else {
                    var dec = parseFloat(newValue.replace(',', '.'));
                    if (!dec)
                        self.Price(null);
                    else self.Price(specLib.Normalize(dec));
                }
                //
                self.Recalculate();
            });
            self.Count.subscribe(function (newValue) {
                self.Recalculate();
            });
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
                self.ARSList_TotalCount = ko.computed(function () {
                    if (!self.ARSList || !self.ARSList() || self.ARSList().length == 0)
                        return 0;
                    //
                    var retval = 0;
                    ko.utils.arrayForEach(self.ARSList(), function (el) {
                        retval += el.Count();
                    });
                    //
                    return retval;
                });
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
                $.when(self.LoadModelInfo(), self.LoadLists(), self.LoadDependencyList()).done(function () {
                    //
                    initD.resolve();
                    //
                    self.Recalculate();
                });
                return initD.promise();
            };
            //
            self.Initialize2 = function () {
                var initD = $.Deferred();
                //
                $.when(self.LoadModelInfo(), self.LoadLists()).done(function () {
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
                    //
                    initD.resolve();
                    //
                    self.Recalculate();
                });
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
            self.GetInvoiceSpecification = function () {
                var data =
                    {
                        ID: self.Specification.ID,
                        GoodsInvoiceID: self.Specification.GoodsInvoiceID(),
                        SpecificationNumber: self.Specification.SpecificationNumber(),
                        CargoName: self.Specification.CargoName(),
                        OrderNumber: self.Specification.OrderNumber(),
                        ProductCatalogModelID: self.ModelID,
                        ProductCatalogModelClassID: self.ModelClassID,
                        Price: self.Price(),
                        Count: self.Count(),
                        NDSType: self.SelectedNDSType() ? parseInt(self.SelectedNDSType().ID) : null,
                        NDSPercent: self.SelectedNDSPercent() ? parseInt(self.SelectedNDSPercent().ID) : null,
                        NDSCustomValue: self.NDSCustomValue(),
                        Note: self.Note(),
                        //
                        UnitID: self.SelectedUnit() ? self.SelectedUnit().ID : null,
                        UnitName: self.SelectedUnit() ? self.SelectedUnit().Name : null,
                        Delivered: self.InvoiceList().length,
                        //
                        PurchaseSpecificationIDList: self.Specification.PurchaseSpecificationIDList,
                        ExistsInDataBase: self.Specification.ExistsInDataBase(),
                    };
                //
                return data;
            };
            //
            /*self.GetNewValues = function () {
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
                    Delivered: self.InvoiceList().length
                };
            };*/
            //
            self.ajaxControl_loadModel = new ajaxLib.control();
            self.LoadModelInfo = function () {
                var retD = $.Deferred();
                //
                if (!self.ModelID)
                {
                    retD.resolve();
                    return retD;
                }
                //
                $.when(userD).done(function (user) {
                    var param = {
                        ModelID: self.ModelID
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
                return retD;
            };
            //
            self.ajaxControl_loadDependency = new ajaxLib.control();
            self.LoadDependencyList = function () {
                var retD = $.Deferred();
                //
                if ((!self.Specification.PurchaseSpecificationIDList || self.Specification.PurchaseSpecificationIDList.length == 0) && !self.Specification.ID) {
                    retD.resolve();
                    return retD;
                }
                //
                $.when(userD).done(function (user) {
                    var param = {
                        InvoiceSpecificationID: self.Specification.ID,
                        PurchaseSpecificationIDList: self.Specification.PurchaseSpecificationIDList
                    };
                    //
                    self.ajaxControl_loadDependency.Ajax(self.$region,
                    {
                        dataType: "json",
                        method: 'GET',
                        url: 'finApi/GetInvoiceSpecificationDependencyList?' + $.param(param)
                    },
                    function (newVal) {
                        if (newVal && newVal.Result === 0) {
                            if (newVal.ARSList) {
                                ko.utils.arrayForEach(newVal.ARSList, function (item) {
                                    self.ARSList.push(new specLib.Specification(null, item));
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
                                if (self.Specification.NDSType() !== null) {
                                    var selected = ko.utils.arrayFirst(self.NDSTypeList(), function (el) {
                                        return el.ID == self.Specification.NDSType();
                                    });
                                    //
                                    self.SelectedNDSType(selected);
                                }
                                //
                                if (self.Specification.NDSPercent() !== null) {
                                    var selected = ko.utils.arrayFirst(self.NDSPercentList(), function (el) {
                                        return el.ID == self.Specification.NDSPercent();
                                    });
                                    //
                                    self.SelectedNDSPercent(selected);
                                }
                                //
                                if (self.Specification.UnitID() !== null) {
                                    var selected = ko.utils.arrayFirst(self.UnitList(), function (el) {
                                        return el.ID == self.Specification.UnitID();
                                    });
                                    //
                                    self.SelectedUnit(selected);
                                    //
                                    /*if (selected == null) //кто-то грохнул в справочнике
                                        require(['sweetAlert'], function () {
                                            swal(getTextResource('UnitWasDeleted'), '', 'warning');
                                        });*/
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

            self.SelectModel = function () {
                require(['assetForms'], function (module) {
                    var fh = new module.formHelper(true);
                    fh.ShowAssetModelLink({
                        ClassID: 383,
                        ID: self.Specification.ID
                    }, function (newValues) {
                        if (!newValues || newValues.length == 0)
                            return;
                        //
                        if (newValues.length == 1) {
                            var model = newValues[0];
                            self.ModelID = model.ID;
                            self.ModelClassID = model.ClassID;
                            //
                            var modelFullName = model.ExternalIdentifier + '\\' + model.TypeName + '\\' + model.Name;
                            self.ModelFullName(modelFullName);
                        }
                        else {
                            require(['sweetAlert'], function () {
                                swal('Выбор модели оборудования', 'Необходимо выбрать одну модель', 'info');
                            });
                        }
                    });
                });
            };
        }
    };
    return module;
});