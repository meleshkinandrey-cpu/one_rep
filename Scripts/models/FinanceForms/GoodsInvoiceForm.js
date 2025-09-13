define(['knockout', 'jquery', 'ajax', 'ttControl', 'models/FinanceForms/GoodsInvoiceSpecificationList', 'dateTimeControl', 'usualForms', 'jqueryStepper'], function (ko, $, ajaxLib, tclib, specListLib, dtLib, fhModule) {
    var module = {
        ViewModel: function (workOrder, goodsInvoiceObject, canEdit_object, $region, saveFunc) {
            var self = this;
            self.LoadD = $.Deferred();
            //
            self.$region = $region;
            self.CanEdit = ko.observable(canEdit_object() && !goodsInvoiceObject.IsDone());
            //
            self.goodsInvoice = ko.observable(goodsInvoiceObject);
            //
            self.GoodsRegionHeight = ko.observable(0);
            self.SizeChanged = function () {
                if (!self.goodsInvoice())
                    return;//Critical - ko - with:goodsInvoice!!!
                //
                var tabHeight = self.$region.height();//form height
                tabHeight -= self.$region.find('.invoice').outerHeight(true);
                tabHeight -= self.$region.find('.invoice-table').outerHeight(true);
                tabHeight -= self.$region.find('.goods').outerHeight(true);
                //
                self.GoodsRegionHeight(Math.max(0, tabHeight - 85) + 'px');
            };
            //
            self.GetGoodsInvoice = function (operation) {
                var data =
                {
                    'ID': self.goodsInvoice().ID,
                    'WorkOrderID': workOrder().ID(),
                    'DocumentNumber': self.goodsInvoice().DocumentNumber(),
                    'ExistsInDataBase': self.goodsInvoice().ExistsInDataBase(),
                    'SpecificationList': self.GetSpecificationList(),
                    'ConsignorID': self.goodsInvoice().ConsignorID(),
                    'ConsigneeID': self.goodsInvoice().ConsigneeID(),
                    'StorageLocationID': self.goodsInvoice().StorageLocationID(),
                    'UtcDateCreated': dtLib.GetMillisecondsSince1970(self.dateCreatedDateTime()),
                    'Operation': operation
                };
                //
                return data;
            };
            //
            self.GetSpecificationList = function () {
                var list = self.specificationsList.imList.List();
                //
                if (!list)
                    return [];
                //
                var retval = [];
                ko.utils.arrayForEach(list, function (item) {
                    retval.push(self.GetSpecificationData(item));
                });
                //
                return retval;
            };
            //
            self.GetSpecificationData = function (invoiceSpec) {
                return {
                    ID: invoiceSpec.ID,
                    OrderNumber: invoiceSpec.OrderNumber(),
                    GoodsInvoiceID: invoiceSpec.GoodsInvoiceID(),
                    SpecificationNumber: invoiceSpec.SpecificationNumber(),
                    CargoName: invoiceSpec.CargoName(),
                    ProductCatalogModelID: invoiceSpec.ProductCatalogModelID,
                    ProductCatalogModelClassID: invoiceSpec.ProductCatalogModelClassID,
                    Price: invoiceSpec.Price(),
                    Count: invoiceSpec.Count(),
                    NDSType: invoiceSpec.NDSType(),
                    NDSPercent: invoiceSpec.NDSPercent(),
                    NDSCustomValue: invoiceSpec.NDSCustomValue(),
                    Note: invoiceSpec.Note(),
                    UnitID: invoiceSpec.UnitID(),
                    //
                    PurchaseSpecificationIDList: invoiceSpec.PurchaseSpecificationIDList,
                    ExistsInDataBase: invoiceSpec.ExistsInDataBase()
                };
            };
            //
            self.specificationsList = new specListLib.LinkList(self.goodsInvoice, 382, self.$region.find('.goods').selector, self.IsReadOnly, self.CanEdit, true);
            //
            self.Initialize = function () {
                var initD = $.Deferred();
                //
                return initD.promise();
            };
            //
            self.AfterRender = function () {
                self.LoadD.resolve();
                self.specificationsList.CheckData();
              
                if (!self.controlDateCreated())
                    self.InitDtp('.invoice-date-created', self.dateCreated, self.dateCreatedDateTime, self.controlDateCreated);
                //
                self.initializeStorageLocationSearcher();
                self.initializeSelectedSupplierSearcher();
                self.initializeSelectedOrganizationSearcher();
                //
                self.SizeChanged();
            };
            //
            self.selectedSupplierD = $.Deferred();
            self.selectedSupplier = null;
            self.initializeSelectedSupplierSearcher = function () {
                var fh = new fhModule.formHelper();
                var selectedSupplierD = fh.SetTextSearcherToField(
                    $region.find('.goodInvoiceSupplierSearcher'),
                    'SupplierSearcher',
                    null,
                    [],
                    function (objectInfo) {//select
                        self.goodsInvoice().ConsignorName(objectInfo.FullName);
                        self.goodsInvoice().ConsignorID(objectInfo.ID);
                    },
                    function () {//reset
                        self.goodsInvoice().ConsignorName('');
                        self.goodsInvoice().ConsignorID('');
                    },
                    function (selectedItem) {//close
                        if (!selectedItem) {
                            self.goodsInvoice().ConsignorName('');
                            self.goodsInvoice().ConsignorID('');
                        }
                    });
                $.when(selectedSupplierD).done(function (ctrl) {
                    self.selectedSupplier = ctrl;
                    self.selectedSupplierD.resolve(ctrl);
                });
                //
                //
                $.when(self.selectedSupplierD).done(function (ctrl) {
                    ctrl.SetSelectedItem(self.goodsInvoice().ConsignorID(), 116, self.goodsInvoice().ConsignorName(), '');
                });
            };
            //    
            self.selectedOrganizationD = $.Deferred();
            self.selectedOrganization = null;
            self.initializeSelectedOrganizationSearcher = function () {
                var fh = new fhModule.formHelper();
                var selectedOrganizationD = fh.SetTextSearcherToField(
                    $region.find('.goodInvoiceOrganizationSearcher'),
                    'OrganizationSearcher',
                    null,
                    [],
                    function (objectInfo) {//select
                        self.goodsInvoice().ConsigneeName(objectInfo.FullName);
                        self.goodsInvoice().ConsigneeID(objectInfo.ID);
                    },
                    function () {//reset
                        self.goodsInvoice().ConsigneeName('');
                        self.goodsInvoice().ConsigneeID('');
                    },
                    function (selectedItem) {//close
                        if (!selectedItem) {
                            self.goodsInvoice().ConsigneeName('');
                            self.goodsInvoice().ConsigneeID('');
                        }
                    });
                $.when(selectedOrganizationD).done(function (ctrl) {
                    self.selectedOrganization = ctrl;
                    self.selectedOrganizationD.resolve(ctrl);
                });
                //
                //
                $.when(self.selectedOrganizationD).done(function (ctrl) {
                    ctrl.SetSelectedItem(self.goodsInvoice().ConsigneeID(), 101, self.goodsInvoice().ConsigneeName(), '');
                });
            };
            //
            self.controlDateCreated = ko.observable(null);
            //
            self.dateCreated = ko.observable(self.goodsInvoice().UtcDateCreatedDT() ? self.goodsInvoice().UtcDateCreatedDT() : null);//always local string
            self.dateCreated.subscribe(function (newValue) {
                if (self.controlDateCreated().$isLoaded.state() != 'resolved')
                    return;
                //
                var dt = self.controlDateCreated().dtpControl.length > 0 ? self.controlDateCreated().dtpControl.datetimepicker('getValue') : null;
                //
                if (!newValue || newValue.length == 0)
                    self.dateCreatedDateTime(null);//clear field => reset value
                else if (dtLib.Date2String(dt) != newValue) {
                    self.dateCreatedDateTime(null);//value incorrect => reset value
                    self.dateCreated('');
                }
                else
                    self.dateCreatedDateTime(dt);
            });
            self.dateCreatedDateTime = ko.observable(self.dateCreated() ? new Date(getUtcDate(self.dateCreated())) : null);//always dateTime, auto convert serverUtcDateString to jsLocalTime
            //
            self.InitDtp = function (dtpClass, dateTimeStr, dateTime, control) {
                var dtp = self.$region.find(dtpClass);
                var ctrl = new dtLib.control();
                ctrl.init(dtp, {
                    StringObservable: dateTimeStr,
                    ValueDate: dateTime(),
                    OnSelectDateFunc: function (current_time, $input) {
                        dateTime(current_time);
                        dateTimeStr(dtLib.Date2String(current_time));
                    },
                    OnSelectTimeFunc: function (current_time, $input) {
                        dateTime(current_time);
                        dateTimeStr(dtLib.Date2String(current_time));
                    },
                    HeaderText: ''
                });
                control(ctrl);
            };
            //
            self.storageLocationSearcherD = $.Deferred();
            self.storageLocationSearcher = null;
            self.initializeStorageLocationSearcher = function () {
                var fh = new fhModule.formHelper();
                var storageLocationD = fh.SetTextSearcherToField(
                    $region.find('.goodInvoiceStorageLocationSearcher'),                   
                    'StorageLocationSearcher',
                    null,
                    [false, false],
                    function (objectInfo) {//select
                        self.goodsInvoice().StorageLocationName(objectInfo.FullName);
                        self.goodsInvoice().StorageLocationID(objectInfo.ID);
                    },
                    function () {//reset
                        self.goodsInvoice().StorageLocationName('');
                        self.goodsInvoice().StorageLocationID(null);
                    },
                    function (selectedItem) {//close
                        if (!selectedItem) {
                            self.goodsInvoice().StorageLocationName('');
                            self.goodsInvoice().StorageLocationID(null);
                        }
                    });
                $.when(storageLocationD).done(function (ctrl) {
                    self.storageLocationSearcher = ctrl;
                    self.storageLocationSearcherD.resolve(ctrl);                    
                });
                //
                //
                $.when(self.storageLocationSearcherD).done(function (ctrl) {
                    ctrl.SetSelectedItem(self.goodsInvoice().StorageLocationID(), 397, self.goodsInvoice().StorageLocationName(), '');//OBJ_StorageLocation
                });
            };
        }
    };
    return module;
});