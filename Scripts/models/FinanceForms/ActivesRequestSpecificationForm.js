define(['knockout', 'jquery', 'ajax', 'ttControl', 'models/FinanceForms/ActivesRequestSpecification', 'decimal', 'jqueryStepper'], function (ko, $, ajaxLib, tclib, specLib, decimal) {
    var module = {
        MaxPrice: 1000000000,
        MaxCount: 1000000,
        CurrentCurrency: getTextResource('CurrentCurrency'),
        ViewModel: function (specObject, canEdit_object, $region) {
            var self = this;
            self.LoadD = $.Deferred();
            //
            self.$region = $region;
            self.CanEdit = canEdit_object;
            self.Specification = specObject;
            self.isEditModel = ko.observable(false);
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
            //
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
            self.Count.subscribe(function (newValue) {
                var val = parseInt(newValue);
                if (val <= 0 || isNaN(val))
                    self.Count(1);
                else if (val > module.MaxCount)
                    self.Count(module.MaxCount);
                //
                self.Recalculate();
            });
            self.getNDSTypeList = function (options) {
                var data = self.NDSTypeList();
                options.callback({ data: data, total: data.length });
            };
            //
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
            self.AfterRender = function () {
                $.when(self.Initialize()).done(function () {
                    self.LoadD.resolve();
                });
            };
            //
            self.Initialize = function () {
                var initD = $.Deferred();
                //
                $.when(self.LoadModelInfo(), self.LoadLists()).done(function () {
                    if (self.CanEdit() && self.CanEditCount())
                    {
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
                    UnitID: self.SelectedUnit() ? self.SelectedUnit().ID : null,
                    UnitName: self.SelectedUnit() ? self.SelectedUnit().Name : null,
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
                                    swal(getTextResource('ErrorCaption'), getTextResource('AjaxError') + '\n[ActiveRequestSpecificationForm.js, LoadModelInfo]', 'error');
                                });
                            }
                        }
                        else if (newVal && newVal.Result === 1)
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[ActiveRequestSpecificationForm.js, LoadModelInfo]', 'error');
                            });
                        else
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[ActiveRequestSpecificationForm.js, LoadModelInfo]', 'error');
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
                        url: 'finApi/GetActivesRequestSpecificationsEnums'
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
                                    swal(getTextResource('ErrorCaption'), getTextResource('AjaxError') + '\n[ActiveRequestSpecificationForm.js, LoadLists]', 'error');
                                });
                            }
                        }
                        else if (newVal && newVal.Result === 1)
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[ActiveRequestSpecificationForm.js, LoadLists]', 'error');
                            });
                        else
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[ActiveRequestSpecificationForm.js, LoadLists]', 'error');
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
                //
                if (self.isOperationeActivesRequestSpecificationProperties() == false || self.CanEditCount() == false)
                    return;
                else {
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
        CalculatePriceWithNDS: function (price, count, type, percent, customValue) {
            if (!price)
                price = 0;
            if (!percent)
                percent = 0;
            //
            decimal.set({ precision: 29 });//C# Decimal precision
            var priceDecimal = new decimal(price);
            //
            var costWithoutNDSDecimal = new decimal(0);
            var sumNDSDecimal = new decimal(0);
            var costWithNDSDecimal = new decimal(0);
            var priceWithoutNDSDecimal = new decimal(0);
            var ndsPriceDecimal = new decimal(0);
            var priceWithNDSDecimal = new decimal(0);
            //
            var isCustomSum = percent === 0; //NDSPercent
            //
            if (type === 0) //AlreadyIncluded
            {
                if (isCustomSum) {
                    var value = customValue !== null ? customValue : 0;
                    var valueDecimal = new decimal(value);
                    //
                    /*priceWithoutNDS = specLib.Normalize((specLib.PredNormalize(price) - specLib.PredNormalize(value)) / 100);
                    ndsPrice = specLib.Normalize(value);
                    priceWithNDS = specLib.Normalize(price);*/
                    //
                    priceWithoutNDSDecimal = priceDecimal.minus(valueDecimal);
                    ndsPriceDecimal = valueDecimal;
                    priceWithNDSDecimal = priceDecimal;
                }
                else {
                    var p = module.GetNdsPercent(percent);
                    //
                    /*priceWithoutNDS = specLib.Normalize(specLib.PredNormalize(price) / ((1 + p) * 100));
                    ndsPrice = specLib.Normalize((specLib.PredNormalize(price) - specLib.PredNormalize(priceWithoutNDS)) / 100);
                    priceWithNDS = specLib.Normalize(price);*/
                    //
                    var factor = new decimal(1 + p);
                    priceWithoutNDSDecimal = priceDecimal.dividedBy(factor);
                    ndsPriceDecimal = priceDecimal.minus(priceWithoutNDSDecimal);
                    priceWithNDSDecimal = priceDecimal;
                }
            }
            else if (type === 2) //AddToPrice
            {
                if (isCustomSum) {
                    var value = customValue !== null ? customValue : 0;
                    var valueDecimal = new decimal(value);
                    //
                    /*ndsPrice = specLib.Normalize(value);
                    priceWithNDS = specLib.Normalize((specLib.PredNormalize(price) + specLib.PredNormalize(ndsPrice)) / 100);
                    priceWithoutNDS = specLib.Normalize(price);*/
                    //
                    ndsPriceDecimal = valueDecimal;
                    priceWithNDSDecimal = priceDecimal.plus(valueDecimal);
                    priceWithoutNDSDecimal = priceDecimal;
                }
                else {
                    var p = module.GetNdsPercent(percent);
                    //
                    /*ndsPrice = specLib.Normalize(specLib.PredNormalize(price) * p / 100);
                    priceWithNDS = specLib.Normalize((specLib.PredNormalize(price) + specLib.PredNormalize(ndsPrice)) / 100);
                    priceWithoutNDS = specLib.Normalize(price);*/
                    //
                    ndsPriceDecimal = priceDecimal.times(p);
                    priceWithNDSDecimal = priceDecimal.add(ndsPriceDecimal);
                    priceWithoutNDSDecimal = priceDecimal;
                }
            }
            else if (type === 1) //NotNeeded
            {
                /*ndsPrice = 0;
                priceWithoutNDS = specLib.Normalize(price);
                priceWithNDS = specLib.Normalize(price);*/
                ndsPriceDecimal = new decimal(0);
                priceWithoutNDSDecimal = priceDecimal;
                priceWithNDSDecimal = priceDecimal;
            }
            //
            costWithoutNDSDecimal = priceWithoutNDSDecimal.times(count);
            sumNDSDecimal = ndsPriceDecimal.times(count);
            costWithNDSDecimal = priceWithNDSDecimal.times(count);
            //
            return {
                CostWithoutNDS: costWithoutNDSDecimal.toDP(2).toString(),
                CostWithNDS: costWithNDSDecimal.toDP(2).toString(),
                SumNDS: sumNDSDecimal.toDP(2).toString(),
                PriceWithoutNDS: priceWithoutNDSDecimal.toDP(2).toString(),
                PriceWithNDS: priceWithNDSDecimal.toDP(2).toString()
            };
        },
        GetNdsPercent: function (percent) {
            if (percent === 0)
                return 0;
            else if (percent === 1)
                return 0.07;
            else if (percent === 2)
                return 0.1;
            else if (percent === 3)
                return 0.18;
            else if (percent === 4)
                return 0.20;
            else return null;
        }
    };
    return module;
});