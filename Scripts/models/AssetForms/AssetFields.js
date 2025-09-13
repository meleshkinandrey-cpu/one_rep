define(['knockout', 'jquery', 'ajax', 'dateTimeControl'], function (ko, $, ajaxLib, dtLib) {
    var module = {
        AssetFields: function (asset, region, ko_CanEdit) {
            var self = this;
            self.IsLoaded = false;
            //
            self.asset = asset;
            self.$region = region;
            self.CanEdit = ko_CanEdit;
            //
            self.AssetFields = ko.observable(null);
            //
            self.ajaxControl = new ajaxLib.control();
            self.Initialize = function () {
                if (self.IsLoaded)
                    return;
                //
                var retD = $.Deferred();
                //
                var data = { 'ID': self.asset().ID() };
                self.ajaxControl.Ajax(self.$region,
                    {
                        dataType: "json",
                        method: 'GET',
                        data: data,
                        url: 'imApi/GetAssetFields'
                    },
                    function (newVal) {
                        if (newVal) {
                            if (newVal.Result == 0) {
                                var assetFields = newVal.AssetFields;
                                if (assetFields) {
                                    require(['models/AssetForms/AssetForm.AssetFields'], function (assetFieldsLib) {
                                        self.AssetFields(new assetFieldsLib.AssetFields(self, assetFields));
                                        //
                                        self.InitializeOwner();
                                        self.InitializeUser();
                                        //self.OnParametersChanged();
                                        //
                                        retD.resolve();
                                        self.IsLoaded = true;
                                    });
                                }
                            }
                            else {
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('GlobalError'), 'error');
                                });
                            }
                        }
                    });
                //
                return retD.promise();
            };
            //           
            self.IsPurchaseContainerVisible = ko.observable(true);
            self.TogglePurchaseContainer = function () {
                self.IsPurchaseContainerVisible(!self.IsPurchaseContainerVisible());
            };
            //
            self.IsOwnerContainerVisible = ko.observable(true);
            self.ToggleOwnerContainer = function () {
                self.IsOwnerContainerVisible(!self.IsOwnerContainerVisible());
            };
            //
            self.IsServiceContainerVisible = ko.observable(true);
            self.ToggleServiceContainer = function () {
                self.IsServiceContainerVisible(!self.IsServiceContainerVisible());
            };
            //
            self.IsInventorizationContainerVisible = ko.observable(true);
            self.ToggleInventorizationContainer = function () {
                self.IsInventorizationContainerVisible(!self.IsInventorizationContainerVisible());
            };
            //
            self.IsUserFieldsContainerVisible = ko.observable(true);
            self.ToggleUserFiedlsContainer = function () {
                self.IsUserFieldsContainerVisible(!self.IsUserFieldsContainerVisible());
            };
            //
            self.EditDateReceived = function () {
                if (!self.CanEdit())
                    return;
                //
                showSpinner();
                var assetFields = self.AssetFields();
                require(['usualForms'], function (module) {
                    var fh = new module.formHelper(true);
                    var options = {
                        ID: self.asset().ID(),
                        objClassID: assetFields.ClassID(),
                        ClassID: self.asset().ClassID(),
                        fieldName: 'AssetFields.DateReceived',
                        fieldFriendlyName: getTextResource('AssetFields_PurchaseDate'),
                        oldValue: assetFields.UtcDateReceivedDT(),
                        allowNull: true,
                        OnlyDate: true,
                        onSave: function (newDate) {
                            assetFields.UtcDateReceived(parseDate(newDate, true));
                            assetFields.UtcDateReceivedDT(newDate ? new Date(parseInt(newDate)) : null);
                        }
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.dateEdit, options);
                });
            };
            //
            self.EditSupplier = function () {
                if (!self.CanEdit())
                    return;
                //
                showSpinner();
                var assetFields = self.AssetFields();
                require(['usualForms'], function (module) {
                    var fh = new module.formHelper(true);
                    //
                    var options = {
                        ID: self.asset().ID(),
                        objClassID: assetFields.ClassID(),
                        ClassID: self.asset().ClassID(),
                        fieldName: 'AssetFields.Supplier',
                        fieldFriendlyName: getTextResource('AssetNumber_SupplierName'),
                        oldValue: { ID: assetFields.SupplierID(), ClassID: 116, FullName: assetFields.SupplierName() },
                        searcherName: 'SupplierSearcher',
                        searcherPlaceholder: getTextResource('AssetNumber_SupplierName'),
                        onSave: function (objectInfo) {
                            assetFields.SupplierID(objectInfo ? objectInfo.ID : null);
                            assetFields.SupplierName(objectInfo ? objectInfo.FullName : '');
                        }
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.searcherEdit, options);
                });
            };
            //
            self.EditCost = function () {
                if (!self.CanEdit())
                    return;
                //
                showSpinner();
                var assetFields = self.AssetFields();
                require(['usualForms'], function (fhModule) {
                    var fh = new fhModule.formHelper(true);
                    var options = {
                        ID: self.asset().ID(),
                        objClassID: assetFields.ClassID(),
                        ClassID: self.asset().ClassID(),
                        fieldName: 'AssetFields.Cost',
                        fieldFriendlyName: getTextResource('AssetFields_Cost'),
                        oldValue: assetFields.Cost(),
                        maxValue: 1000000000,//ограничеие толстого клиента. в бд decimal(12, 2)
                        stepperType: 'float',
                        floatPrecission: 2,
                        onSave: function (newVal) {
                            var newValStr = newVal.toString();
                            //
                            assetFields.Cost(newVal);
                            assetFields.CostStr(getFormattedMoneyString(newValStr));
                        },
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.numberEdit, options);
                });
            };
            //
            self.EditDocument = function () {
                if (!self.CanEdit())
                    return;
                //
                showSpinner();
                var assetFields = self.AssetFields();
                require(['usualForms'], function (fhModule) {
                    var fh = new fhModule.formHelper(true);
                    var options = {
                        ID: self.asset().ID(),
                        objClassID: assetFields.ClassID(),
                        ClassID: self.asset().ClassID(),
                        fieldName: 'AssetFields.Document',
                        fieldFriendlyName: getTextResource('AssetNumber_Agreement'),
                        oldValue: assetFields.Document(),
                        allowNull: true,
                        maxLength: 255,
                        onSave: function (newText) {
                            assetFields.Document(newText);
                        },
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.textEdit, options);
                });
            };
            //
            self.EditOwner = function () {
                if (!self.CanEdit())
                    return;
                //
                showSpinner();
                var assetFields = self.AssetFields();
                require(['usualForms', 'models/SDForms/SDForm.User'], function (module, userLib) {
                    var fh = new module.formHelper(true);
                    $.when(userD).done(function (user) {
                        var options = {
                            ID: self.asset().ID(),
                            objClassID: assetFields.ClassID(),
                            ClassID: self.asset().ClassID(),
                            fieldName: 'AssetFields.Owner',
                            fieldFriendlyName: getTextResource('AssetNumber_OwnerName'),
                            oldValue: assetFields.OwnerLoaded() ? { ID: assetFields.Owner().ID(), ClassID: assetFields.Owner().ClassID(), FullName: assetFields.Owner().FullName() } : null,
                            object: ko.toJS(assetFields.Owner()),
                            searcherName: 'OwnerSearcher',
                            searcherPlaceholder: getTextResource('Asset_EnterOrganization'),
                            onSave: function (objectInfo) {
                                assetFields.OwnerLoaded(false);
                                assetFields.Owner(new userLib.EmptyUser(self, userLib.UserTypes.organization, self.EditOwner, false, false));
                                //
                                assetFields.OwnerID(objectInfo ? objectInfo.ID : '');
                                assetFields.OwnerClassID(objectInfo ? objectInfo.ClassID : '');
                                self.InitializeOwner();
                            }
                        };
                        fh.ShowSDEditor(fh.SDEditorTemplateModes.searcherEdit, options);
                    });
                });
            };
            //
            self.InitializeOwner = function () {
                require(['models/SDForms/SDForm.User'], function (userLib) {
                    var assetFields = self.AssetFields();
                    if (assetFields.OwnerLoaded() == false && assetFields.OwnerID()) {
                        var options = {
                            UserID: assetFields.OwnerID(),
                            UserType: userLib.UserTypes.organization,
                            UserName: null,
                            EditAction: self.EditOwner,
                            RemoveAction: null,
                            //ShowLeftSide: false,
                            ShowTypeName: false
                        };
                        var user = new userLib.User(self, options);
                        assetFields.Owner(user);
                        assetFields.OwnerLoaded(true);
                    }
                });
            };
            //
            self.EditWarranty = function () {
                if (!self.CanEdit())
                    return;
                //
                showSpinner();
                var assetFields = self.AssetFields();
                require(['usualForms'], function (module) {
                    var fh = new module.formHelper(true);
                    var options = {
                        ID: self.asset().ID(),
                        objClassID: assetFields.ClassID(),
                        ClassID: self.asset().ClassID(),
                        fieldName: 'AssetFields.Warranty',
                        fieldFriendlyName: getTextResource('AssetNumber_Warranty'),
                        oldValue: assetFields.UtcWarrantyDT(),
                        allowNull: true,
                        OnlyDate: true,
                        onSave: function (newDate) {
                            assetFields.UtcWarranty(parseDate(newDate, true));
                            assetFields.UtcWarrantyDT(newDate ? new Date(parseInt(newDate)) : null);
                        }
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.dateEdit, options);
                });
            };
            //
            self.EditServiceCenter = function () {
                if (!self.CanEdit())
                    return;
                //
                showSpinner();
                var assetFields = self.AssetFields();
                require(['usualForms'], function (module) {
                    var fh = new module.formHelper(true);
                    //
                    var options = {
                        ID: self.asset().ID(),
                        objClassID: assetFields.ClassID(),
                        ClassID: self.asset().ClassID(),
                        fieldName: 'AssetFields.ServiceCenter',
                        fieldFriendlyName: getTextResource('AssetNumber_SupplierName'),
                        oldValue: { ID: assetFields.ServiceCenterID(), ClassID: 116, FullName: assetFields.ServiceCenterName() },
                        searcherName: 'SupplierSearcher',
                        searcherPlaceholder: getTextResource('AssetNumber_SupplierName'),
                        onSave: function (objectInfo) {
                            assetFields.ServiceCenterID(objectInfo ? objectInfo.ID : null);
                            assetFields.ServiceCenterName(objectInfo ? objectInfo.FullName : '');
                            //
                            assetFields.ServiceContractID(null);
                            assetFields.ServiceContractNumber('');
                        }
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.searcherEdit, options);
                });
            };
            //
            self.EditServiceContract = function () {
                if (!self.CanEdit() || !self.AssetFields().ServiceCenterID())
                    return;
                //
                showSpinner();
                var assetFields = self.AssetFields();
                require(['usualForms'], function (module) {
                    var fh = new module.formHelper(true);
                    //
                    var options = {
                        ID: self.asset().ID(),
                        objClassID: assetFields.ClassID(),
                        ClassID: self.asset().ClassID(),
                        fieldName: 'AssetFields.ServiceContract',
                        fieldFriendlyName: getTextResource('AssetNumber_ServiceContractNumber'),
                        oldValue: { ID: assetFields.ServiceContractID(), FullName: assetFields.ServiceContractNumber() },
                        searcherName: 'ServiceContractSearcher',
                        searcherPlaceholder: getTextResource('AssetNumber_ServiceContractNumber'),
                        searcherParams: [assetFields.ServiceCenterID()],
                        onSave: function (objectInfo) {
                            assetFields.ServiceContractID(objectInfo ? objectInfo.ID : null);
                            assetFields.ServiceContractNumber(objectInfo ? objectInfo.FullName : '');
                        }
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.searcherEdit, options);
                });
            };
            //
            self.EditFounding = function () {
                if (!self.CanEdit())
                    return;
                //
                showSpinner();
                var assetFields = self.AssetFields();
                require(['usualForms'], function (fhModule) {
                    var fh = new fhModule.formHelper(true);
                    var options = {
                        ID: self.asset().ID(),
                        objClassID: assetFields.ClassID(),
                        ClassID: self.asset().ClassID(),
                        fieldName: 'AssetFields.Founding',
                        fieldFriendlyName: getTextResource('AssetNumber_Founding'),
                        oldValue: assetFields.Founding(),
                        allowNull: true,
                        maxLength: 255,
                        onSave: function (newText) {
                            assetFields.Founding(newText);
                        },
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.textEdit, options);
                });
            };
            //
            self.EditStorageLocation = function () {
                if (!self.CanEdit())
                    return;
                //
                showSpinner();
                var assetFields = self.AssetFields();
                require(['usualForms'], function (module) {
                    var fh = new module.formHelper(true);
                    //
                    var options = {
                        ID: self.asset().ID(),
                        objClassID: assetFields.ClassID(),
                        ClassID: self.asset().ClassID(),
                        fieldName: 'AssetFields.StorageLocation',
                        fieldFriendlyName: getTextResource('GoodsInvoiceStorageLocation'),
                        oldValue: { ID: assetFields.StorageID(), FullName: assetFields.StorageName() },
                        searcherName: 'StorageLocationSearcher',
                        searcherPlaceholder: getTextResource('GoodsInvoiceStorageLocation'),
                        searcherParams: [false, false],
                        onSave: function (objectInfo) {
                            assetFields.StorageID(objectInfo ? objectInfo.ID : null);
                            assetFields.StorageName(objectInfo ? objectInfo.FullName : '');
                        }
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.searcherEdit, options);
                });
            };
            //
            self.EditUser = function () {
                if (!self.CanEdit())
                    return;
                //
                showSpinner();
                var assetFields = self.AssetFields();
                require(['usualForms', 'models/SDForms/SDForm.User'], function (module, userLib) {
                    var fh = new module.formHelper(true);
                    $.when(userD).done(function (user) {
                        var options = {
                            ID: self.asset().ID(),
                            objClassID: assetFields.ClassID(),
                            ClassID: self.asset().ClassID(),
                            fieldName: 'AssetFields.User',
                            fieldFriendlyName: getTextResource('AssetNumber_UserName'),
                            oldValue: assetFields.UserLoaded() ? { ID: assetFields.User().ID(), ClassID: assetFields.User().ClassID(), FullName: assetFields.User().FullName() } : null,
                            object: ko.toJS(assetFields.User()),
                            searcherName: 'MaterialResponsibleUserSearcher',
                            searcherPlaceholder: getTextResource('EnterFIO'),
                            onSave: function (objectInfo) {
                                assetFields.UserLoaded(false);
                                assetFields.User(new userLib.EmptyUser(self, userLib.UserTypes.mResponsible, self.EditUser, false, false));
                                //
                                assetFields.UserID(objectInfo ? objectInfo.ID : '');
                                //assetFields.UserClassID(objectInfo ? objectInfo.ClassID : '');
                                self.InitializeUser();
                            }
                        };
                        fh.ShowSDEditor(fh.SDEditorTemplateModes.searcherEdit, options);
                    });
                });
            };
            //
            self.InitializeUser = function () {
                require(['models/SDForms/SDForm.User'], function (userLib) {
                    var assetFields = self.AssetFields();
                    if (assetFields.UserLoaded() == false && assetFields.UserID()) {
                        var options = {
                            UserID: assetFields.UserID(),
                            UserType: userLib.UserTypes.mResponsible,
                            UserName: null,
                            EditAction: self.EditUser,
                            RemoveAction: null,
                            //ShowLeftSide: false,
                            ShowTypeName: false
                        };
                        var user = new userLib.User(self, options);
                        assetFields.User(user);
                        assetFields.UserLoaded(true);
                    }
                });
            };
            //
            self.EditAppointmentDate = function () {
                if (!self.CanEdit())
                    return;
                //
                showSpinner();
                var assetFields = self.AssetFields();
                require(['usualForms'], function (module) {
                    var fh = new module.formHelper(true);
                    var options = {
                        ID: self.asset().ID(),
                        objClassID: assetFields.ClassID(),
                        ClassID: self.asset().ClassID(),
                        fieldName: 'AssetFields.AppointmentDate',
                        fieldFriendlyName: getTextResource('AssetFields_AppointmentDate'),
                        oldValue: assetFields.UtcAppointmentDateDT(),
                        allowNull: true,
                        OnlyDate: true,
                        onSave: function (newDate) {
                            assetFields.UtcAppointmentDate(parseDate(newDate, true));
                            assetFields.UtcAppointmentDateDT(newDate ? new Date(parseInt(newDate)) : null);
                        }
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.dateEdit, options);
                });
            };
            //
            self.EditUserField = function (data) {
                if (!self.CanEdit())
                    return;
                //
                showSpinner();
                var assetFields = self.AssetFields();
                require(['usualForms'], function (fhModule) {
                    var fh = new fhModule.formHelper(true);
                    var options = {
                        ID: self.asset().ID(),
                        objClassID: assetFields.ClassID(),
                        ClassID: self.asset().ClassID(),
                        fieldName: 'AssetFields.UserField',
                        fieldFriendlyName: data.FieldName(),
                        oldValue: data.Value(),
                        userFieldID: '00000000-0000-0000-0000-00000000000' + data.FieldNumber,
                        identifier: 'object.UserField' + data.FieldNumber,
                        type: 2,
                        allowNull: true,
                        maxLength: 255,
                        isAssetUserField: true,
                        onSave: function (newText) {
                            data.Value(newText);
                        },
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.textEdit, options);
                });
            };
        }
    };
    return module;
});