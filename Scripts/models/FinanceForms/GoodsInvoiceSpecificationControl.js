define(['knockout', 'jquery', 'ajax', 'ttControl', 'models/FinanceForms/PurchaseSpecification', 'models/FinanceForms/PurchaseSpecificationForm', 'decimal', 'jqueryStepper'], function (ko, $, ajaxLib, tclib, specLib, formLib, decimal) {
    var module = {
        MaxPrice: 1000000000,
        MaxCount: Math.pow(2, 31) - 1,
        CurrentCurrency: getTextResource('CurrentCurrency'),
        CalculatePriceWithNDS: formLib.CalculatePriceWithNDS,
        GetNdsPercent: formLib.GetNdsPercent,
        ViewModel: function (invoiceSpecification, observableList, canEdit_object, $region) {//строка накладной, список выбранных строк спецификации закупки, ...
            var self = this;
            self.LoadD = $.Deferred();
            //
            self.checkBoxVisible = ko.observable(observableList ? true : false);
            //
            self.ajaxControl_edit = new ajaxLib.control();
            //
            self.ShowForm = function (item) {
                require(['financeForms'], function (module) {
                    var fh = new module.formHelper(true);
                    var ps = ko.toJS(item.pur);
                    fh.ShowPurchaseSpecification(ps, self.CanEdit, function (newData) {
                        if (!newData)
                            return;
                        //
                        var data = newData;
                        data.Operation = 0; // EDIT
                        //
                        self.ajaxControl_edit.Ajax($region,
                            {
                                dataType: "json",
                                method: 'POST',
                                data: data,
                                url: 'finApi/EditPurchaseSpecification'
                            },
                            function (answer) {
                                if (answer && answer.Response) {
                                    var result = answer.Response.Result;
                                    if (result === 0) {
                                        var newModel = answer.NewModel;
                                        //
                                        ps.Merge(newModel);
                                        //
                                        $(document).trigger('local_objectUpdated', [ps.ClassID, ps.ID, ps.ObjectID]);//Specification
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
            self.$region = $region;
            //self.CanEdit = canEdit_object;
            self.Specification = invoiceSpecification;
            self.CanEdit = ko.observable(canEdit_object() && !self.Specification().IsDone());
            //
            self.AvailableCategoryID = self.Specification().ProductCatalogCategoryID;
            self.AvailableTypeID = self.Specification().ProductCatalogTypeID;
            //
            self.TotalValues = ko.observable({
                CostWithoutNDS: self.Specification().CostWithoutNDS(),
                CostWithNDS: self.Specification().CostWithNDS(),
                SumNDS: self.Specification().SumNDS(),
                PriceWithoutNDS: self.Specification().PriceWithoutNDS(),
                PriceWithNDS: self.Specification().PriceWithNDS()
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
            self.NDSCustomValue = self.Specification().NDSCustomValue;
            self.NDSCustomValueInput = ko.observable(self.Specification().NDSCustomValueString());
            //
            self.SelectedNDSType.subscribe(function (newValue) {
                self.Recalculate();
            });
            //
            self.PURSListHeight = ko.observable(0);
            self.SizeChanged = function () {
                if (!self.Specification())
                    return;
                //
                var tabHeight = self.$region.height();//form height
                tabHeight -= self.$region.find('.b-requestDetail-menu').outerHeight(true);
                tabHeight -= self.$region.find('.b-requestDetail__title-header').outerHeight(true);
                //
                var height = Math.max(0, tabHeight - 10);
                //
                self.PURSListHeight(Math.max(0, height - 340) + 'px');
            };
            //
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
            self.ModelID = self.Specification().ProductCatalogModelID;
            self.ModelClassID = self.Specification().ProductCatalogModelClassID;
            self.ModelFullName = self.Specification().ProductCatalogModelFullName;
            self.ModelManufacturerName = ko.observable('');
            self.ModelTypeName = ko.observable('');
            self.ModelProductNumber = ko.observable('');
            //
            self.OrderNumber = self.Specification().OrderNumber;
            //
            self.OrderNumber.subscribe(function (newValue) {
                var val = parseInt(newValue);
                if (val <= 0 || isNaN(val))
                    self.Count(1);
                else if (val > module.MaxCount)
                    self.OrderNumber(module.MaxCount);
            });
            //
            self.Count = self.Specification().Count;
            self.Price = self.Specification().Price;
            self.PriceInput = ko.observable(self.Price() ? specLib.ToMoneyString(self.Price()) : null);
            self.Note = self.Specification().Note;
            //
            self.UnitList = ko.observableArray([]);
            self.SelectedUnit = ko.observable(null);
            self.SelectedUnit.subscribe(function (newValue) {
                self.Recalculate();
            });
            //
            self.SpecificationNumber = self.Specification().SpecificationNumber;
            self.CargoName = self.Specification().CargoName;
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
                if (!self.CanEdit())
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
            self.ajaxControl_loadModel = new ajaxLib.control();
            self.LoadModelInfo = function () {
                var retD = $.Deferred();
                //
                if (!self.ModelID) {
                    retD.resolve();
                    return retD;
                }
                //
                $.when(userD).done(function (user) {
                    var param = {
                        ModelID: self.ModelID,
                        ClassID: self.ModelClassID
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
            self.InitializeFromPURSList = function () {
                if (!observableList() || observableList().length == 0)
                    return;
                //
                var selectedObj = observableList()[0];
                var pur = observableList()[0].pur;
                //
                self.ModelID = pur.ProductCatalogModelID;
                self.ModelClassID = pur.ProductCatalogModelClassID;
                self.ModelFullName(pur.ProductCatalogModelFullName());
                //
                self.AvailableCategoryID = selectedObj.PurchaseSpecification.ProductCatalogCategoryID;
                self.AvailableTypeID = selectedObj.PurchaseSpecification.ProductCatalogTypeID;
                //
                self.LoadModelInfo();
                //
                self.Price = ko.observable(pur.Price());
                self.PriceInput(self.Price() ? specLib.ToMoneyString(self.Price()) : null);
            };
            //
            //PURSLIST_BLOCK
            {
                self.PURSList = ko.observableArray([]);
                self.EditCount = ko.observable(true);
                //
                if (observableList) {
                    self.PURSList = observableList;
                    self.EditCount(true);
                    self.InitializeFromPURSList();
                }
                //
                self.PURSListExpanded = ko.observable(true);
                self.ExpandCollapsePURSList = function () {
                    self.PURSListExpanded(!self.PURSListExpanded());
                };
                //
                self.PURSList_SortTable = function () {
                    if (!self.PURSList)
                        return;

                    self.PURSList.sort(
                        function (left, right) {
                            if (left.pur.OrderNumber() == null)
                                return -1;
                            //
                            if (right.pur.OrderNumber() == null)
                                return 1;
                            //
                            return left.pur.OrderNumber() == right.pur.OrderNumber() ? 0 : (left.pur.OrderNumber() < right.pur.OrderNumber() ? -1 : 1);
                        }
                    );
                };
            }
            //
            self.AfterRender = function () {
                $.when(self.Initialize()).done(function () {
                    self.LoadD.resolve();
                    if (!observableList)
                        self.SizeChanged();
                });
            };
            //
            self.Initialize = function () {
                var initD = $.Deferred();
                //
                $.when(self.LoadModelInfo(), self.LoadLists(), self.LoadDependencyList()).done(function () {
                    if (self.CanEdit()) {
                        var $input = self.$region.find('.invoiceSpec_form-number-TextField');
                        $input.stepper({
                            type: 'int',
                            floatPrecission: 0,
                            wheelStep: 1,
                            arrowStep: 1,
                            limit: [1, module.MaxCount],
                            onStep: function (val, up) {
                                self.OrderNumber(val);
                            }
                        });
                    }
                    //
                    self.ListenToCountUpdate();
                    //
                    initD.resolve();
                    //
                    self.Recalculate();
                });
                return initD.promise();
            };
            //
            self.GetInvoiceSpecification = function () {
                var data =
                {
                    ID: self.Specification().ID,
                    GoodsInvoiceID: self.Specification().GoodsInvoiceID(),
                    SpecificationNumber: self.Specification().SpecificationNumber(),
                    CargoName: self.Specification().CargoName(),
                    OrderNumber: self.Specification().OrderNumber(),
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
                    //
                    PurchaseSpecificationIDList: self.GetPurchaseSpecificationIDList(),
                    ExistsInDataBase: self.Specification().ExistsInDataBase(),
                    TempID: self.Specification().TempID,
                    //
                    ProductCatalogModelFullName: self.ModelFullName(),
                    ProductCatalogTypeName: self.ModelTypeName(),
                    //
                    PurchaseSpecificationList: self.GetPurchaseSpecificationList()
                };
                //
                return data;
            };
            //
            self.GetPurchaseSpecificationList = function () {
                if (self.Specification().ExistsInDataBase())
                    return [];
                //
                var retval = [];
                ko.utils.arrayForEach(self.PURSList(), function (el) {
                    var data = el.PurchaseSpecification;
                    //
                    if (data) {
                        data.CountPlan = ko.observable(parseInt(el.Count()));
                        data.CountPlanByOthers = ko.observable(el.pur.CountPlanByOthers());
                        //
                        retval.push(data);
                    }
                    else {
                        var ps = ko.utils.arrayFirst(self.Specification().PurchaseSpecificationList, function (_ps) {
                            return _ps.ID == el.pur.ID;
                        });
                        //
                        if (ps) {
                            ps.CountPlan(parseInt(el.Count()));
                            ps.CountPlanByOthers(el.pur.CountPlanByOthers());
                        }
                    }
                });
                return retval;
            };
            //
            self.GetPurchaseSpecificationIDList = function () {
                var retval = [];
                ko.utils.arrayForEach(self.PURSList(), function (el) {
                    var data =
                    {
                        PurchaseSpecificationID: el.pur.ID,
                        Count: el.Count(),
                        CountPlan: el.pur.CountPlan()
                    };
                    //
                    retval.push(data);
                });
                return retval;
            };
            //
            self.InitUnitAndNDSByPURSList = function () {
                if (!observableList || !observableList() || observableList().length == 0)
                    return;
                //
                var pur = observableList()[0].pur;
                //
                if (pur.NDSType() !== null) {
                    var selected = ko.utils.arrayFirst(self.NDSTypeList(), function (el) {
                        return el.ID == pur.NDSType();
                    });
                    //
                    self.SelectedNDSType(selected);
                }
                //
                if (pur.NDSPercent() !== null) {
                    var selected = ko.utils.arrayFirst(self.NDSPercentList(), function (el) {
                        return el.ID == pur.NDSPercent();
                    });
                    //
                    self.SelectedNDSPercent(selected);
                }
                //
                if (pur.UnitID() !== null) {
                    var selected = ko.utils.arrayFirst(self.UnitList(), function (el) {
                        return el.ID == pur.UnitID();
                    });
                    //
                    self.SelectedUnit(selected);
                }
            };
            //
            self.ListenToCountUpdate = function () {
                var onCountUpdata = function (item) {
                    var res = 0;
                    ko.utils.arrayForEach(self.PURSList(), function (item) {
                        res += parseInt(item.Count());
                    });
                    self.Count(res);
                };
                //
                var res = 0;
                ko.utils.arrayForEach(self.PURSList(), function (item) {
                    res += parseInt(item.Count());
                    item.OnCountUpdate = onCountUpdata;
                });
                //
                if (self.PURSList().length > 0)
                    self.Count(res);
            };
            //
            self.ajaxControl_loadDependency = new ajaxLib.control();
            self.LoadDependencyList = function () {
                var retD = $.Deferred();
                //
                if (!self.Specification().PurchaseSpecificationIDList || self.Specification().PurchaseSpecificationIDList.length == 0) {
                    retD.resolve();
                    return retD;
                }
                //
                if (!self.Specification().ExistsInDataBase()) {
                    var PURSList = self.Specification().PurchaseSpecificationList;
                    if (PURSList) {
                        ko.utils.arrayForEach(PURSList, function (item) {
                            /*var pur = new specLib.Specification(null, item);
                            var count = pur.Count();
                            var delivered = pur.Delivered();
                            var maxCount = delivered ? count - delivered : count;*/
                            //var Count = 0;
                            var data = new module.ListModelObject(item, false);
                            self.PURSList.push(data);
                        });
                        //
                        self.PURSList_SortTable();
                        self.PURSList.valueHasMutated();
                    }
                    //
                    retD.resolve();
                    return retD;
                }
                //
                $.when(userD).done(function (user) {
                    var param = {
                        InvoiceSpecificationID: self.Specification().ID,
                        PurchaseSpecificationIDList: self.Specification().PurchaseSpecificationIDList
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
                                if (newVal.PURSList) {
                                    ko.utils.arrayForEach(newVal.PURSList, function (item) {
                                        var pur = new specLib.Specification(null, item);
                                        var count = pur.Count();
                                        var delivered = pur.Delivered();
                                        var maxCount = delivered ? count - delivered : count;
                                        //var Count = 0;
                                        var data = new module.ListModelObject(item, true);
                                        self.PURSList.push(data);
                                    });
                                    //
                                    self.PURSList_SortTable();
                                    self.PURSList.valueHasMutated();
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
                                    if (self.Specification().NDSType() !== null) {
                                        var selected = ko.utils.arrayFirst(self.NDSTypeList(), function (el) {
                                            return el.ID == self.Specification().NDSType();
                                        });
                                        //
                                        self.SelectedNDSType(selected);
                                    }
                                    //
                                    if (self.Specification().NDSPercent() !== null) {
                                        var selected = ko.utils.arrayFirst(self.NDSPercentList(), function (el) {
                                            return el.ID == self.Specification().NDSPercent();
                                        });
                                        //
                                        self.SelectedNDSPercent(selected);
                                    }
                                    //
                                    if (self.Specification().UnitID() !== null) {
                                        var selected = ko.utils.arrayFirst(self.UnitList(), function (el) {
                                            return el.ID == self.Specification().UnitID();
                                        });
                                        //
                                        self.SelectedUnit(selected);
                                    }
                                    //
                                    if (observableList)
                                        self.InitUnitAndNDSByPURSList();
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
                if (!self.CanEdit())
                    return;
                //
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
                                self.ModelID = model.ID;
                                self.ModelClassID = model.ClassID;
                                self.ModelTypeName(model.TypeName);
                                self.ModelManufacturerName(model.ManufacturerName);
                                self.ModelProductNumber(model.ProductNumber);
                                //
                                var modelFullName = model.ExternalIdentifier + '\\' + model.TypeName + '\\' + model.Name;
                                self.ModelFullName(modelFullName);
                            }
                        },
                        true,
                        {
                            CategoryID: self.AvailableCategoryID,
                            TypeID: self.AvailableTypeID
                        },
                        getTextResource('AddModel')
                    );
                });
            };
        },
        ListModelObject: function (purchaseSpecification, invoiceSpecExistInDataBase) {
            var self = this;
            //
            self.pur = new specLib.Specification(null, purchaseSpecification);
            //
            self.OnCountUpdate = null;//событие изменения Count
            //
            var count = purchaseSpecification.Count;
            var countPlan = !invoiceSpecExistInDataBase ? purchaseSpecification.CountPlan() : 0;
            var countPlanByOthers = !invoiceSpecExistInDataBase ? purchaseSpecification.CountPlanByOthers() : 0;
            //var delivered = purchaseSpecification.Delivered + countPlan;
            var dependencyCount = purchaseSpecification.DependencyCount ? purchaseSpecification.DependencyCount : 0;
            var delivered = purchaseSpecification.Delivered ? purchaseSpecification.Delivered : 0;
            self.MaxCount = count - delivered + dependencyCount - countPlanByOthers;
            if (self.MaxCount == 0)
                self.MaxCount = dependencyCount;
            //
            self.Selected = ko.observable(false);
            //
            if (!invoiceSpecExistInDataBase) {
                self.pur.CountPlan(countPlan);
                self.pur.CountPlanByOthers(countPlanByOthers);
            }
            //
            self.Count = ko.observable(countPlan ? countPlan : dependencyCount);
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
                if (!invoiceSpecExistInDataBase)
                    self.pur.CountPlan(parseInt(self.Count()));
                else {
                    var delivered = self.pur.Delivered();
                    self.pur.CountPlan(parseInt(self.Count()) - dependencyCount);
                }
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
    };
    return module;
});