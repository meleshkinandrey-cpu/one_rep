define(['knockout', 'jquery', 'ajax', 'imList', 'ttControl', 'models/FinanceForms/GoodsInvoice', 'models/FinanceForms/GoodsInvoiceSpecificationList'], function (ko, $, ajaxLib, imLib, tclib, invoiceLib, specListLib) {
    var module = {
        //сущность knockout, идентификатор класса сущности, селектор ajax-крутилки
        LinkList: function (ko_object, objectClassID, ajaxSelector, readOnly_object, canEdit_object, $region) {
            var self = this;
            //
            self.isLoaded = ko.observable(false);//факт загруженности данных для объекта ko_object()
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
                    $.when(operationIsGrantedD(837), operationIsGrantedD(838), operationIsGrantedD(836), operationIsGrantedD(839), self.imList.Load()).done(function (add, _delete, properties, update) {
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
            self.ClearData = function () {//функция сброса данных
                self.imList.List([]);
                //
                self.isLoaded(false);
            };
            self.ReadOnly = readOnly_object;//флаг только чтение
            self.CanEdit = canEdit_object;
            //
            self.ItemsCount = ko.computed(function () {//вариант расчета количества элементов (по данным объекта / по реальному количеству из БД)                
                var retval = 0;
                if (self.isLoaded()) {
                    retval = self.imList.List().length;
                }
                else if (ko_object != null && ko_object() != null) {
                    retval = 0;
                }
                //
                if (retval <= 0)
                    return null;
                if (retval > 99)
                    return '99';
                else
                    return '' + retval;
                //
            });
            //
            self.SortTable = function () {
                if (!self.imList.List)
                    return;
                //
                self.imList.List.sort(
                        function (a, b) {
                            if (!a.UtcDateCreatedSecondsFrom1970())
                                return 1;
                            //
                            if (!b.UtcDateCreatedSecondsFrom1970())
                                return -1;
                            //
                            return a.UtcDateCreatedSecondsFrom1970() === b.UtcDateCreatedSecondsFrom1970() ? 0 : (a.UtcDateCreatedSecondsFrom1970() > b.UtcDateCreatedSecondsFrom1970() ? -1 : 1);
                        }
                    );
            };
            //
            var imListOptions = {};//параметры imList для списка 
            {
                imListOptions.aliasID = 'ID';
                //
                imListOptions.LoadAction = function () {
                    var data = {
                        'ObjectID': ko_object().ID(),
                        'ObjectClassID': objectClassID
                    };
                    var retvalD = $.Deferred();
                    self.ajaxControl.Ajax($(ajaxSelector),
                        {
                            dataType: "json",
                            method: 'GET',
                            data: data,
                            url: 'finApi/GetGoodsInvoiceList'
                        },
                        function (newVal) {
                            if (newVal && newVal.Result === 0) {
                                var invoiceList = newVal.List;
                                if (invoiceList) {
                                    var retval = [];
                                    ko.utils.arrayForEach(invoiceList, function (item) {
                                        retval.push(new invoiceLib.GoodsInvoice(self.imList, item));
                                    });
                                    retvalD.resolve(retval);
                                    self.SortTable();
                                    if (self.imList.List().length != 0)
                                        self.SelectItem(self.imList.List()[0]);
                                    //
                                    self.imList.List.valueHasMutated();
                                }
                                else {
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('AjaxError') + '\n[FinanceForms.GoodsInvoiceList.js, LoadAction]', 'error');
                                    });
                                    retvalD.resolve([]);
                                }
                            }
                            else if (newVal && newVal.Result === 1)
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[FinanceForms.GoodsInvoiceList.js, LoadAction]', 'error');
                                    retvalD.resolve([]);
                                });
                            else if (newVal && newVal.Result === 2)
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('BadParamsError') + '\n[FinanceForms.GoodsInvoiceList.js, LoadAction]', 'error');
                                    retvalD.resolve([]);
                                });
                            else if (newVal && newVal.Result === 3)
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('AccessError'), 'error');
                                    retvalD.resolve([]);
                                });
                            else
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[FinanceForms.GoodsInvoiceList.js, LoadAction]', 'error');
                                    retvalD.resolve([]);
                                });
                        });
                    return retvalD.promise();
                };
                //
                /*TODO: 
                imListOptions.ReloadByIDAction = function (specification, id) {
                };*/
            }
            self.imList = new imLib.IMList(imListOptions);
            //
            {//действия над списком
                operationsOptions = {};
                {
                    operationsOptions.Text = getTextResource('AddGoodsInvoice');
                    operationsOptions.IsGranted = function () { return self.CanEdit(); };
                    operationsOptions.Command = function (specArray) {
                        showSpinner();
                        var invoice = new invoiceLib.GoodsInvoice(self.imList, new Object()); //empty GoodsInvoice
                        invoice.WorkOrderID = ko.observable(ko_object().ID());
                        //
                        require(['financeForms'], function (module) {
                            var fh = new module.formHelper(true);
                            //
                            var operation = 1;
                            //
                            fh.ShowGoodsInvoice(ko_object, invoice, operation, self.EditGoodsInvoice, self.CanEdit);
                        });
                    };
                }
                self.imList.AddOperation(operationsOptions);
                //
                operationsOptions = {};
                {
                    operationsOptions.Text = getTextResource('RemoveGoodsInvoice');
                    operationsOptions.IsGranted = function () { return self.CanEdit() && self.CanDelete(); };
                    operationsOptions.Command = function (list) {
                        var PostD = $.Deferred();
                        require(['sweetAlert'], function () {
                            var nameList = '';
                            ko.utils.arrayForEach(list, function (el) {
                                nameList += el.FullName() + '\n';
                            });
                            //
                            swal({
                                title: getTextResource('СonfirmOperationCaption'),
                                text: getTextResource('GoodsInvoiceDeleteQuestion') + ' ' + nameList,
                                showCancelButton: true,
                                closeOnConfirm: true,
                                closeOnCancel: true,
                                confirmButtonText: getTextResource('ButtonOK'),
                                cancelButtonText: getTextResource('ButtonCancel')
                            },
                            function (value) {
                                if (value == true) {
                                    showSpinner();
                                    //
                                    var invoice = list[0];
                                    //
                                    var data =
                                        {
                                            ID: invoice.ID,
                                            WorkOrderID: invoice.WorkOrderID(),
                                            Operation: 2
                                        };
                                    //
                                    self.ajaxControl.Ajax($(ajaxSelector),
                                        {
                                            dataType: "json",
                                            method: 'POST',
                                            data: data,
                                            url: 'finApi/EditGoodsInvoice'
                                        },
                                        function (model) {
                                            if (model.Response.Result === 0) {
                                                self.imList.TryRemoveByID(invoice.ID);
                                                //
                                                if (self.imList.List().length != 0)
                                                    self.SelectItem(self.imList.List()[0]);
                                                //
                                                self.imList.List.valueHasMutated();
                                                //
                                                PostD.resolve();
                                            } else if (model.Response.Result === 1)
                                                require(['sweetAlert'], function () {
                                                    swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[FinanceForms.GoodsInvoiceList.js, GoodsInvoiceRemove]', 'error');
                                                    PostD.resolve();
                                                });
                                            else if (model.Response.Result === 2)
                                                require(['sweetAlert'], function () {
                                                    swal(getTextResource('ErrorCaption'), getTextResource('BadParamsError') + '\n[FinanceForms.GoodsInvoiceList.js, GoodsInvoiceRemove]', 'error');
                                                    PostD.resolve();
                                                });
                                            else if (model.Response.Result === 3)
                                                require(['sweetAlert'], function () {
                                                    swal(getTextResource('ErrorCaption'), getTextResource('AccessError'), 'error');
                                                    PostD.resolve();
                                                });
                                            else if (model.Response.Result === 5)
                                                require(['sweetAlert'], function () {
                                                    swal(getTextResource('ErrorCaption'), getTextResource('ConcurrencyErrorWithoutQuestion'), 'error');
                                                    PostD.resolve();
                                                });
                                            else if (model.Response.Result === 6)
                                                require(['sweetAlert'], function () {
                                                    swal(getTextResource('ErrorCaption'), getTextResource('ObjectDeleted'), 'error');
                                                    $.when(self.imList.ReloadAll()).done(function () {
                                                        PostD.resolve();
                                                    });
                                                });
                                            else if (model.Response.Result === 8)
                                                require(['sweetAlert'], function () {
                                                    swal(getTextResource('ErrorCaption'), getTextResource('ValidationError'), 'error');
                                                    PostD.resolve();
                                                });
                                            else
                                                require(['sweetAlert'], function () {
                                                    swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[FinanceForms.GoodsInvoiceList.js, GoodsInvoiceRemove]', 'error');
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
                        return PostD.promise();
                    };
                }
                self.imList.AddOperation(operationsOptions);
            }
            //
            self.ShowObjectForm = function (invoice) {//отображает форму элемента списка           
                showSpinner();
                require(['financeForms'], function (module) {
                    var fh = new module.formHelper(true);
                    //
                    var operation = 0;
                    //
                    fh.ShowGoodsInvoice(ko_object, invoice, operation, self.EditGoodsInvoice, ko.observable(self.CanEdit() && self.CanUpdate()));
                });
            };
            //
            self.EditGoodsInvoice = function (newValue) {
                if (!newValue)
                    return;
                //
                var data = newValue;
                //
                var $retD = $.Deferred();
                self.ajaxControl.Ajax($(ajaxSelector),
                    {
                        dataType: "json",
                        method: 'POST',
                        data: data,
                        url: 'finApi/EditGoodsInvoice'
                    },
                    function (model) {
                        if (model.Response.Result === 0) {
                            var invoiceData = model.GoodsInvoice;
                            var invoiceObj = null;
                            if (invoiceData) {
                                var exist = ko.utils.arrayFirst(self.imList.List(), function (exItem) {
                                    return exItem.ID == invoiceData.ID;
                                });
                                if (exist) {
                                    exist.Merge(invoiceData);
                                    invoiceObj = exist;
                                    //
                                    if (data.SpecificationList)
                                        ko.utils.arrayForEach(data.SpecificationList, function (invoiceSpec) {
                                            $(document).trigger('local_objectUpdated', [383, invoiceSpec.ID, ko_object().ID()]);//GoodsInvoiceSpecification
                                        });
                                }
                                else {
                                    invoiceObj = new invoiceLib.GoodsInvoice(self.imList, invoiceData);
                                    self.imList.List.push(invoiceObj);
                                    //
                                    if (data.SpecificationList)
                                        ko.utils.arrayForEach(data.SpecificationList, function (invoiceSpec) {
                                            $(document).trigger('local_objectInserted', [383, invoiceSpec.ID, ko_object().ID()]);//GoodsInvoiceSpecification
                                            if (invoiceSpec.PurchaseSpecificationIDList)
                                                ko.utils.arrayForEach(invoiceSpec.PurchaseSpecificationIDList, function (el) {
                                                    $(document).trigger('local_objectUpdated', [381, el.PurchaseSpecificationID, ko_object().ID()]);//Specification
                                                });
                                        });
                                }
                                //
                                $retD.resolve(invoiceData.ID);
                                //
                                if (invoiceObj)
                                    self.SelectItem(invoiceObj);
                                //
                                self.SortTable();
                                self.imList.List.valueHasMutated();
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
            self.SelectItem = function (invoice) {
                self.imList.UncheckAll();
                invoice.Selected(true);
                //
                self.ResetInvoiceSpecificationList(invoice);
            };
            //
            self.invoiceSpecificationList = ko.observable(null);//список строк товарной накладной
            //
            self.ResetInvoiceSpecificationList = function (invoice) {
                if (!invoice)
                    return;
                //
                var list = self.invoiceSpecificationList;
                //
                if (list() == null) {
                    list(new specListLib.LinkList(ko.observable(invoice), 382, $region.find('.invoice-spec-list-wrapper').selector, self.ReadOnly, self.CanEdit));
                }
                else {
                    list().ClearData();
                    list().goodsInvoice = ko.observable(invoice);
                }
                //
                list().CheckData();
            };
            //
            self.IsObjectClassVisible = function (objectClassID) {
                if (objectClassID == 382 || objectClassID == 383)//GoodsInvoice, GoodsInvoiceSpecification
                    return true;
                return false;
            };
            self.onObjectModified = function (e, objectClassID, objectID, parentObjectID) {
                if (!self.IsObjectClassVisible(objectClassID))
                    return;
                //
                var invoice = self.imList.SelectedItems().length == 1 ? self.imList.SelectedItems()[0] : null;
                if (invoice == null) {
                    self.ClearData();
                    self.CheckData();
                }
                else
                {
                    self.imList.TryReloadByID(invoice.ID, true);
                }
            };
            //
            //отписываться не будем
            $(document).bind('objectUpdated', self.onObjectModified);
            $(document).bind('local_objectUpdated', self.onObjectModified);
        }
    };
    return module;
});