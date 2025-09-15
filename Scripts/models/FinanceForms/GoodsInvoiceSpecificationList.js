define(['knockout', 'jquery', 'ajax', 'imList', 'models/FinanceForms/GoodsInvoiceSpecification'], function (ko, $, ajaxLib, imLib, specLib) {
    var module = {
        MaxCount: Math.pow(2, 31) - 1,
        //сущность knockout, идентификатор класса сущности, селектор ajax-крутилки
        LinkList: function (goodsInvoice, objectClassID, ajaxSelector, readOnly_object, canEdit_object, openedInsideForm) {
            var self = this;
            //
            self.goodsInvoice = goodsInvoice;
            self.openedInsideForm = ko.observable(openedInsideForm ? true : false);
            //
            self.isLoaded = ko.observable(false);//факт загруженности данных для объекта goodsInvoice()
            self.imList = null;//declared below
            self.ajaxControl = new ajaxLib.control();//единственный ajax для этого списка
            //
            self.CanAdd = ko.observable(false);
            self.CanDelete = ko.observable(false);
            self.Properties = ko.observable(false);
            self.CanUpdate = ko.observable(false);
            //
            self.CheckData = function () {//функция загрузки списка (грузится только раз).
                if (!self.isLoaded()) {
                    $.when(operationIsGrantedD(841), operationIsGrantedD(842), operationIsGrantedD(840), operationIsGrantedD(843), self.imList.Load()).done(function (add, _delete, properties, update) {
                        self.CanAdd(add);
                        self.CanDelete(_delete);
                        self.Properties(properties);
                        self.CanUpdate(update);
                        //
                        self.isLoaded(true);
                    });
                }
            };
            //
            self.SortTable = function () {
                if (!self.imList.List)
                    return;
                //
                self.imList.List.sort(
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
            //
            self.ClearData = function () {//функция сброса данных
                self.imList.List([]);
                //
                self.isLoaded(false);
            };
            self.ReadOnly = readOnly_object;//флаг только чтение
            self.CanEdit = canEdit_object;//флаг для редактирования/создания
            //
            var imListOptions = {};//параметры imList для списка 
            {
                imListOptions.aliasID = 'ID';
                //
                imListOptions.LoadAction = function () {
                    if (!self.goodsInvoice || !self.goodsInvoice() || !self.goodsInvoice().ID)
                        return;
                    //
                    var data = {
                        'ObjectClassID': 382,
                        'ObjectID': self.goodsInvoice().ID
                    };
                    var retvalD = $.Deferred();
                    self.ajaxControl.Ajax($(ajaxSelector),
                        {
                            dataType: "json",
                            method: 'GET',
                            data: data,
                            url: 'finApi/GetGoodsInvoiceSpecificationList'
                        },
                        function (newVal) {
                            if (newVal && newVal.Result === 0) {
                                var specList = newVal.List;
                                if (specList) {
                                    var retval = [];
                                    ko.utils.arrayForEach(specList, function (item) {
                                        retval.push(new specLib.Specification(self.imList, item));
                                    });
                                    retvalD.resolve(retval);
                                    self.SortTable();
                                    self.imList.List.valueHasMutated();
                                }
                                else {
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('AjaxError') + '\n[FinanceForms.GoodsInvoiceSpecificationList.js, LoadAction]', 'error');
                                    });
                                    retvalD.resolve([]);
                                }
                            }
                            else if (newVal && newVal.Result === 1)
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[FinanceForms.GoodsInvoiceSpecificationList.js, LoadAction]', 'error');
                                    retvalD.resolve([]);
                                });
                            else if (newVal && newVal.Result === 2)
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('BadParamsError') + '\n[FinanceForms.GoodsInvoiceSpecificationList.js, LoadAction]', 'error');
                                    retvalD.resolve([]);
                                });
                            else if (newVal && newVal.Result === 3)
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('AccessError'), 'error');
                                    retvalD.resolve([]);
                                });
                            else
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[FinanceForms.GoodsInvoiceSpecificationList.js, LoadAction]', 'error');
                                    retvalD.resolve([]);
                                });
                        });
                    return retvalD.promise();
                };
            }
            //
            self.imList = new imLib.IMList(imListOptions);
            //
            self.TotalSumNDS = ko.computed(function () {
                if (!self.imList || !self.imList.List || !self.imList.List() || self.imList.List().length == 0)
                    return 0;
                //
                var retval = 0.0;
                ko.utils.arrayForEach(self.imList.List(), function (el) {
                    if (el.SumNDS())
                        retval += el.SumNDS();
                });
                retval = specLib.Normalize(retval);
                //
                return retval;
            });
            self.TotalSumNDSString = ko.computed(function () {
                return specLib.ToMoneyString(self.TotalSumNDS());
            });
            self.TotalCostWithNDS = ko.computed(function () {
                if (!self.imList || !self.imList.List || !self.imList.List() || self.imList.List().length == 0)
                    return 0;
                //
                var retval = 0.0;
                ko.utils.arrayForEach(self.imList.List(), function (el) {
                    retval += el.CostWithNDS();
                });
                retval = specLib.Normalize(retval);
                //
                return retval;
            });
            self.TotalCostWithNDSString = ko.computed(function () {
                return specLib.ToMoneyString(self.TotalCostWithNDS());
            });
            self.TotalCostWithoutNDS = ko.computed(function () {
                if (!self.imList || !self.imList.List || !self.imList.List() || self.imList.List().length == 0)
                    return 0;
                //
                var retval = 0.0;
                ko.utils.arrayForEach(self.imList.List(), function (el) {
                    retval += el.CostWithoutNDS();
                });
                retval = specLib.Normalize(retval);
                //
                return retval;
            });
            self.TotalCostWithoutNDSString = ko.computed(function () {
                return specLib.ToMoneyString(self.TotalCostWithoutNDS());
            });
            //
            self.ShowObjectForm = function (item) {
                if (!self.Properties())
                    return;
                //
                require(['financeForms'], function (module) {
                    var fh = new module.formHelper(true);
                    fh.ShowInvoiceSpecification(null, item, ko.observable(self.CanEdit() && self.CanUpdate()), function (newData) {
                        if (!newData)
                            return;
                        //
                        var invoice = self.goodsInvoice();
                        //
                        item.Merge(newData);
                        self.imList.List.valueHasMutated();
                        //
                        if (!invoice.ExistsInDataBase()) {
                            var data = { 'GoodsInvoiceSpecification': newData };
                            //
                            self.ajaxControl.Ajax($(ajaxSelector),
                                {
                                    dataType: "json",
                                    method: 'POST',
                                    data: data,
                                    url: 'finApi/GetGoodsInvoiceSpecificationNDSFields'
                                },
                                function (answer) {
                                    if (answer) {
                                        var result = answer.Result;
                                        if (result === 0) {
                                            var newInvoiceSpec = answer.GoodsInvoiceSpecification;
                                            //
                                            var purchaseSpecificationIDList = item.PurchaseSpecificationIDList;
                                            item.Merge(newInvoiceSpec);
                                            item.PurchaseSpecificationIDList = purchaseSpecificationIDList;
                                            //
                                            ko.utils.arrayForEach(item.PurchaseSpecificationList, function (newInvoicePURS) {
                                                ko.utils.arrayForEach(self.imList.List(), function (invoiceSpec) {
                                                    if (invoiceSpec.TempID != newData.TempID)
                                                        ko.utils.arrayForEach(invoiceSpec.PurchaseSpecificationList, function (purs) {
                                                            if (purs.ID == newInvoicePURS.ID) {
                                                                var newByOthers = newInvoicePURS.CountPlanByOthers();
                                                                purs.CountPlanByOthers(newInvoicePURS.Delivered + newByOthers + newInvoicePURS.CountPlan() - purs.Delivered - purs.CountPlan());
                                                            }
                                                        });
                                                });
                                            });
                                            //
                                            //self.SortTable();
                                            self.imList.List.valueHasMutated();
                                            //
                                        }
                                    }
                                    else
                                        require(['sweetAlert'], function () {
                                            swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[FinanceForms.GoodsInvoiceSpecificationList.js, ShowObjectForm]', 'error');
                                        });
                                },
                                null,
                                function () {
                                    hideSpinner();
                                });
                            //
                            return;
                        }
                        //
                        newData.GoodsInvoiceID = invoice.ID;
                        newData.Operation = 0; // EDIT
                        //
                        self.EditGoodsInvoiceSpecification(newData, item);
                        //

                    });
                });
            };
            //
            self.EditGoodsInvoiceSpecification = function (newValue, selectedItem) {
                if (!newValue)
                    return;
                //
                var $retD = $.Deferred();
                //
                /*var data = {
                    'GoodsInvoice': newValue
                };*/
                var data = newValue;
                //
                var purchseSpecificationIDList = data.PurchaseSpecificationIDList;
                //
                self.ajaxControl.Ajax($(ajaxSelector),
                    {
                        dataType: "json",
                        method: 'POST',
                        data: data,
                        //url: 'finApi/AddGoodsInvoice'
                        url: 'finApi/EditGoodsInvoiceSpecification'
                    },
                    function (model) {
                        if (model.Response.Result === 0) {
                            var invoiceSpec = model.NewModel;
                            if (invoiceSpec) {
                                var exist = ko.utils.arrayFirst(self.imList.List(), function (exItem) {
                                    return exItem.ID == invoiceSpec.ID;
                                });
                                if (!exist) {
                                    self.imList.List.push(new specLib.Specification(self.imList, invoiceSpec));
                                    //
                                    $(document).trigger('local_objectInserted', [383, invoiceSpec.ID, self.goodsInvoice().WorkOrderID()]);//GoodsInvoiceSpecification
                                }
                                else if (selectedItem) {
                                    selectedItem.Merge(invoiceSpec);
                                    self.SortTable();
                                    self.imList.List.valueHasMutated();
                                    //
                                    $(document).trigger('local_objectUpdated', [383, invoiceSpec.ID, self.goodsInvoice().WorkOrderID()]);//GoodsInvoiceSpecification
                                }
                                //
                                if (purchseSpecificationIDList)
                                    ko.utils.arrayForEach(purchseSpecificationIDList, function (el) {
                                        $(document).trigger('local_objectUpdated', [381, el.PurchaseSpecificationID, self.goodsInvoice().WorkOrderID()]);//Specification
                                    });
                            }
                        }
                        else {
                            if (model.Result === 1) {
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('SaveError'), getTextResource('NullParamsError') + '\n[FinanceForms.GoodsInvoiceList.js, AddGoodsInvoice]', 'error');
                                });
                            }
                            else if (model.Result === 2) {
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('SaveError'), getTextResource('BadParamsError') + '\n[FinanceForms.GoodsInvoiceList.js, AddGoodsInvoice]', 'error');
                                });
                            }
                            else if (model.Result === 3) {
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('SaveError'), getTextResource('AccessError'), 'error');
                                });
                            }
                            else if (model.Result === 8) {
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('SaveError'), getTextResource('ValidationError'), 'error');
                                });
                            }
                            else {
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('SaveError'), getTextResource('GlobalError') + '\n[FinanceForms.GoodsInvoiceList.js, AddGoodsInvoice]', 'error');
                                });
                            }
                        }
                    });
                //
                return $retD.promise();
            };

            //
            operationsOptions = {};
            {
                operationsOptions.Text = getTextResource('AddPurchaseSpecificationFromCatalog');
                operationsOptions.IsGranted = function () { return self.CanEdit() && self.CanAdd(); };
                operationsOptions.Validator = function () { return false; };
                operationsOptions.Command = function () {
                    showSpinner();
                    require(['financeForms'], function (module) {
                        var invoice = self.goodsInvoice();
                        //
                        var usedIDList = [];
                        ko.utils.arrayForEach(self.imList.List(), function (item) {
                            ko.utils.arrayForEach(item.PurchaseSpecificationIDList, function (el) {
                                var exist = ko.utils.arrayFirst(usedIDList, function (_info) {
                                    return _info.PurchaseSpecificationID.toUpperCase() === el.PurchaseSpecificationID.toUpperCase();
                                });
                                if (exist)
                                    exist.Count += el.CountPlan ? el.CountPlan : 0;
                                else {
                                    var info =
                                        {
                                            PurchaseSpecificationID: el.PurchaseSpecificationID,
                                            Count: el.CountPlan ? el.CountPlan : 0
                                        };
                                    //
                                    usedIDList.push(info);
                                }
                            });
                        });
                        //
                        var fh = new module.formHelper(true);
                        fh.ShowGoodsInvoiceSpecificationLink(
                            {
                                ID: invoice.WorkOrderID(),
                                UsedIDList: usedIDList,
                                InvoiceSpec: self.GetNewInvoiceSpecification()
                            },
                            function (newData) {
                                if (!newData)
                                    return;
                                //
                                if (invoice.ExistsInDataBase()) {
                                    newData.GoodsInvoiceID = invoice.ID;
                                    newData.Operation = 1;
                                    //save
                                    self.EditGoodsInvoiceSpecification(newData);
                                }
                                else {
                                    var data = { 'GoodsInvoiceSpecification': newData };
                                    //
                                    self.ajaxControl.Ajax($(ajaxSelector),
                                        {
                                            dataType: "json",
                                            method: 'POST',
                                            data: data,
                                            url: 'finApi/GetGoodsInvoiceSpecificationNDSFields'
                                        },
                                        function (answer) {
                                            if (answer) {
                                                var result = answer.Result;
                                                if (result === 0) {
                                                    var newInvoiceSpec = answer.GoodsInvoiceSpecification;
                                                    //
                                                    var invoiceSpec = new specLib.Specification(self.imList, newData);

                                                    var purchaseSpecificationIDList = newData.PurchaseSpecificationIDList;
                                                    invoiceSpec.Merge(newInvoiceSpec);
                                                    invoiceSpec.PurchaseSpecificationIDList = purchaseSpecificationIDList;
                                                    invoiceSpec.TempID = newData.TempID;
                                                    //
                                                    ko.utils.arrayForEach(invoiceSpec.PurchaseSpecificationList, function (newInvoicePURS) {
                                                        ko.utils.arrayForEach(self.imList.List(), function (_invoiceSpec) {
                                                            if (invoiceSpec.TempID != _invoiceSpec.TempID)
                                                                ko.utils.arrayForEach(_invoiceSpec.PurchaseSpecificationList, function (purs) {
                                                                    if (purs.ID == newInvoicePURS.ID) {
                                                                        //purs.Delivered += newInvoicePURS.CountPlan();
                                                                        var byOthers = purs.CountPlanByOthers();
                                                                        purs.CountPlanByOthers(byOthers + newInvoicePURS.CountPlan());
                                                                    }
                                                                });
                                                        });
                                                    });

                                                    self.imList.List.push(invoiceSpec);
                                                    //self.SortTable();
                                                    //self.imList.List.valueHasMutated();
                                                    //
                                                }
                                            }
                                            else
                                                require(['sweetAlert'], function () {
                                                    swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[FinanceForms.GoodsInvoiceSpecificationList.js, ShowObjectForm]', 'error');
                                                });
                                        },
                                        null,
                                        function () {
                                            hideSpinner();
                                        });
                                }
                            });
                    });
                };
            }
            self.imList.AddOperation(operationsOptions);
            //
            self.guid = function () {
                function s4() {
                    return Math.floor((1 + Math.random()) * 0x10000)
                      .toString(16)
                      .substring(1);
                }
                return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
            };
            //
            operationsOptions = {};
            {
                operationsOptions.Text = getTextResource('PurchaseSpecificationRemove');
                operationsOptions.IsGranted = function () { return self.CanEdit() && self.CanDelete(); };
                operationsOptions.Command = function (specArray) {
                    var PostD = $.Deferred();
                    $.when(userD).done(function (user) {
                        require(['sweetAlert'], function () {
                            var nameList = '';
                            ko.utils.arrayForEach(specArray, function (el) {
                                nameList += el.ProductCatalogModelFullName() + '\n';
                            });
                            //
                            swal({
                                title: getTextResource('PurchaseSpecificationOperationCaption'),
                                text: getTextResource('PurchaseSpecificationDeleteQuestion') + ' ' + nameList,
                                showCancelButton: true,
                                closeOnConfirm: false,
                                closeOnCancel: true,
                                confirmButtonText: getTextResource('ButtonOK'),
                                cancelButtonText: getTextResource('ButtonCancel')
                            },
                            function (value) {
                                if (value == true) {
                                    showSpinner();
                                    //
                                    var idList = [];
                                    ko.utils.arrayForEach(specArray, function (el) {
                                        if (el.ExistsInDataBase())
                                            idList.push(el.ID);
                                        else {
                                            ko.utils.arrayForEach(el.PurchaseSpecificationList, function (pursToDelete) {
                                                ko.utils.arrayForEach(self.imList.List(), function (_invoiceSpec) {
                                                if (el.TempID != _invoiceSpec.TempID)
                                                    ko.utils.arrayForEach(_invoiceSpec.PurchaseSpecificationList, function (purs) {
                                                        if (purs.ID == pursToDelete.ID) {
                                                            purs.CountPlanByOthers(purs.CountPlanByOthers() - pursToDelete.CountPlan());
                                                        }
                                                    });
                                                });
                                            });
                                            //
                                            self.imList.aliasID = 'TempID';
                                            self.imList.TryRemoveByID(el.TempID); //temp
                                            self.imList.aliasID = 'ID';
                                        }
                                    });
                                    //
                                    if (idList.length == 0) {
                                        self.SortTable();
                                        self.imList.List.valueHasMutated();
                                        PostD.resolve();
                                        swal.close();
                                        hideSpinner();
                                        return;
                                    }
                                    //
                                    var data = {
                                        IDList: idList,
                                        GoodsInvoiceID: goodsInvoice().ID
                                    };
                                    self.ajaxControl.Ajax($(ajaxSelector),
                                        {
                                            dataType: "json",
                                            method: 'POST',
                                            data: data,
                                            url: 'finApi/RemoveGoodsInvoiceSpecification'
                                        },
                                        function (Result) {
                                            if (Result === 0) {
                                                for (var i = 0; i < idList.length; i++) {
                                                    $(document).trigger('local_objectDeleted', [383, idList[i], goodsInvoice().WorkOrderID()]);//OBJ_GoodsInvoiceSpecification для обновления в списке
                                                    self.imList.TryRemoveByID(idList[i]); //temp
                                                }
                                                //
                                                self.SortTable();
                                                self.imList.List.valueHasMutated();
                                                //
                                                PostD.resolve();
                                                swal.close();
                                            } else if (Result === 1)
                                                require(['sweetAlert'], function () {
                                                    swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[FinanceForms.PurchaseSpecificationList.js, PurchaseSpecificationRemove]', 'error');
                                                    PostD.resolve();
                                                });
                                            else if (Result === 2)
                                                require(['sweetAlert'], function () {
                                                    swal(getTextResource('ErrorCaption'), getTextResource('BadParamsError') + '\n[FinanceForms.PurchaseSpecificationList.js, PurchaseSpecificationRemove]', 'error');
                                                    PostD.resolve();
                                                });
                                            else if (Result === 3)
                                                require(['sweetAlert'], function () {
                                                    swal(getTextResource('ErrorCaption'), getTextResource('AccessError'), 'error');
                                                    PostD.resolve();
                                                });
                                            else if (Result === 5)
                                                require(['sweetAlert'], function () {
                                                    swal(getTextResource('ErrorCaption'), getTextResource('ConcurrencyErrorWithoutQuestion'), 'error');
                                                    PostD.resolve();
                                                });
                                            else if (Result === 6)
                                                require(['sweetAlert'], function () {
                                                    swal(getTextResource('ErrorCaption'), getTextResource('ObjectDeleted'), 'error');
                                                    $.when(self.imList.ReloadAll()).done(function () {
                                                        PostD.resolve();
                                                    });
                                                });
                                            else if (Result === 8)
                                                require(['sweetAlert'], function () {
                                                    swal(getTextResource('ErrorCaption'), getTextResource('ValidationError'), 'error');
                                                    PostD.resolve();
                                                });
                                            else
                                                require(['sweetAlert'], function () {
                                                    swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[FinanceForms.PurchaseSpecificationList.js, PurchaseSpecificationRemove]', 'error');
                                                    PostD.resolve();
                                                });
                                        },
                                        null,
                                        function () {
                                            hideSpinner();
                                        });
                                }
                                else PostD.resolve();
                            });
                        });
                    });
                    return PostD.promise();
                };
            }
            self.imList.AddOperation(operationsOptions);
            //
            self.getNextOrderNumber = function () {
                if (!self.imList || !self.imList.List || !self.imList.List())
                    return 1;
                //
                var maxOrderNumber = 0;
                ko.utils.arrayForEach(self.imList.List(), function (item) {
                    maxOrderNumber = Math.max(item.OrderNumber(), maxOrderNumber);
                });
                //
                var nextNumber = Math.min(maxOrderNumber + 1, module.MaxCount);
                return nextNumber;
            };
            //
            self.GetNewInvoiceSpecification = function () {
                var invoiceSpecObj =
                {
                    ID: null,
                    GoodsInvoiceID: null,
                    OrderNumber: self.getNextOrderNumber(),
                    SpecificationNumber: '',
                    CargoName: '',
                    ProductCatalogModelID: null,
                    ProductCatalogModelClassID: null,
                    Price: 0,
                    Count: 0,
                    NDSType: 0,
                    NDSPercent: 2,
                    NDSCustomValue: null,
                    Note: '',
                    UnitID: null,
                    //UnitName: '',
                    //
                    ExistsInDataBase: false,
                    TempID: self.guid(),
                };
                //
                var invoiceSpec = new specLib.Specification(self.imList, invoiceSpecObj);
                return invoiceSpec;
            };
        }
    };
    return module;
});