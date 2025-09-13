define(['knockout', 'jquery', 'ajax', 'usualForms', 'ttControl', 'models/SDForms/SDForm.LinkList', 'models/SDForms/SDForm.User', 'fileControl'], function (ko, $, ajaxLib, fhModule, tclib, linkListLib, userLib, fcLib) {
    var module = {
        ViewModel: function ($region, selectedObjects, ko_object) {//ko_object - объект, в рамках которого открыта форма
            var self = this;
            self.$region = $region;
            self.selectedObjects = selectedObjects;//array of (ID, ClassID, OwnerID) - used in this form
            self.LifeCycleStateOperationID = null;//context
            //
            self.$isDone = $.Deferred();//resolve, когда операция выполнена
            //
            self.GetObjectInfoList = function () {
                var retval = [];
                self.selectedObjects.forEach(function (el) {
                    var data =
                        {
                            ID: el.ID,
                            ClassID: el.ClassID
                        };
                    retval.push(data);
                });
                return retval;
            };
            self.ObjectsHasLogical = ko.computed(function () {
                for (var i = 0; i < self.selectedObjects.length; i++)
                    if (self.selectedObjects[i].IsLogical == true)
                        return true;
                return false;
            });
            self.ObjectsHasMaterail = ko.computed(function () {
                for (var i = 0; i < self.selectedObjects.length; i++)
                    if (self.selectedObjects[i].ClassID == 120)//OBJ_Material
                        return true;
                return false;
            });
            self.ObjectsHasOnlyNetworkDevice = ko.computed(function () {
                for (var i = 0; i < self.selectedObjects.length; i++)
                    if (self.selectedObjects[i].ClassID != 5)//OBJ_NetworkDevice
                        return false;
                return true;
            });
            self.ObjectsHasOnlyTerminalDevice = ko.computed(function () {
                for (var i = 0; i < self.selectedObjects.length; i++)
                    if (self.selectedObjects[i].ClassID != 6)//OBJ_TerminalDevice
                        return false;
                return true;
            });
            self.ObjectsHasOnlyAdapterOrPeripheral = ko.computed(function () {
                for (var i = 0; i < self.selectedObjects.length; i++) {
                    var classID = self.selectedObjects[i].ClassID;
                    if (classID != 33 && classID != 34)//OBJ_Adapter, OBJ_Peripheral
                        return false;
                }
                return true;
            });
            self.ObjectsHasTerminalOrNetworkDevice = ko.computed(function () {
                for (var i = 0; i < self.selectedObjects.length; i++) {
                    var classID = self.selectedObjects[i].ClassID;
                    if (classID == 5 || classID == 6)////OBJ_NetworkDevice, OBJ_TerminalDevice
                        return true;
                }
                return false;
            });
            //
            {//tabs
                self.modes = {
                    main: 'main',
                    links: 'links'
                };
                //
                self.mode = ko.observable();
                self.mode.subscribe(function (newValue) {
                    if (newValue == self.modes.links)
                        self.linkList.CheckListData();
                });
                //
                self.mainClick = function () {
                    self.mode(self.modes.main);
                };
                self.linksClick = function () {
                    self.mode(self.modes.links);
                };
                //
                self.TabLinksCaption = ko.observable('');
                //
                self.LinkIDList = [];
                var canEdit = ko.observable(true);
                var isReadOnly = ko.observable(false);
                self.linkList = new linkListLib.LinkList(null, null, self.$region.find('.links__b .tabContent').selector, isReadOnly, canEdit, self.LinkIDList);
            }
            //
            {//storage
                self.StorageID = null;
                self.StorageName = ko.observable('');
                //
                self.storageSearcher = null;
                self.storageSearcherD = $.Deferred();
                self.InitializeStorageSearcher = function () {
                    var fh = new fhModule.formHelper();
                    var storageD = fh.SetTextSearcherToField(
                        $region.find('.assetReg-storage'),
                        'StorageLocationSearcher',
                        null,
                        [true, true],
                        function (objectInfo) {//select
                            self.StorageID = objectInfo.ID !== '00000000-0000-0000-0000-000000000000' ?
                                objectInfo.ID :
                                null;//'Временный склад'
                            //
                            self.StorageName(objectInfo.FullName);
                            //
                            resetLocationSearcherParams();
                        },
                        function () {//reset
                            self.StorageID = null;
                            self.StorageName('');
                            //
                            resetLocationSearcherParams();
                        });
                    $.when(storageD).done(function (ctrl) {
                        self.storageSearcher = ctrl;
                        self.storageSearcherD.resolve(ctrl);
                        ctrl.CurrentUserID = null;
                        //
                        ctrl.LoadD.done(function () {
                            $region.find('.assetReg-storage').focus();
                        });
                    });
                    //
                    var resetLocationSearcherParams = function () {
                        if (self.StorageID) {
                            self.LocationClassID = null;
                            self.LocationID = null;
                            self.LocationFullName('');
                        }
                        //
                        if (self.locationSearcher) {
                            var params = [true, false, false, false, self.StorageID];
                            self.locationSearcher.SetSearchParameters(params);
                        }
                    };
                };
                //
                self.ajaxControl_Storage = new ajaxLib.control();
                self.StorageLocationEnabled = ko.observable(false);
                self.CheckStorageLocationExistence = function () {
                    self.ajaxControl_Storage.Ajax($region.find('.assetReg-storage'),
                        {
                            dataType: "json",
                            method: 'GET',
                            url: 'assetApi/HasStorageLocation'
                        },
                        function (result) {
                            if (result.Result === 0) {
                                var hasStorage = result.Retval;
                                //
                                self.StorageLocationEnabled(hasStorage);
                                //
                                if (hasStorage) {
                                    self.InitializeStorageSearcher();
                                }
                                else {
                                    self.StorageName(getTextResource('StorageLocationTemp'));
                                }
                            }
                        });
                };
            }
            //
            {//location
                self.LocationClassID = null;
                self.LocationID = null;
                self.LocationFullName = ko.observable('');
                //
                self.getSearcherParams = function () {
                    var retval = null;
                    if (self.ObjectsHasOnlyNetworkDevice())
                        retval = ['true', 'true', 'false', 'false', self.StorageID];//ShowRoom, ShowRack, ShowWorkplace, ShowDevice, StorageID
                    else if (self.ObjectsHasOnlyTerminalDevice())
                        retval = ['true', 'false', 'true', 'false', self.StorageID];
                    else if (self.ObjectsHasOnlyAdapterOrPeripheral())
                        retval = ['true', 'false', 'false', 'true', self.StorageID];
                    else
                        retval = ['true', 'false', 'false', 'false', self.StorageID];
                    //
                    return retval;
                };
                //
                self.locationSearcher = null;
                self.locationSearcherD = $.Deferred();
                self.InitializeLocationSearcher = function () {
                    var fh = new fhModule.formHelper();
                    var locationD = fh.SetTextSearcherToField(
                        $region.find('.assetReg-location'),
                        'AssetLocationSearcher',//not only room! rack and workplace can be
                        null,
                        self.getSearcherParams(),
                        function (objectInfo) {//select
                            self.LocationClassID = objectInfo.ClassID;
                            self.LocationID = objectInfo.ID;
                            self.LocationFullName(objectInfo.FullName);
                        },
                        function () {//reset
                            self.LocationClassID = null;
                            self.LocationID = null;
                            self.LocationFullName('');
                        });
                    $.when(locationD).done(function (ctrl) {
                        self.locationSearcher = ctrl;
                        self.locationSearcherD.resolve(ctrl);
                        ctrl.CurrentUserID = null;
                        //
                        ctrl.LoadD.done(function () {
                            $region.find('.assetReg-location').focus();
                        });
                    });
                };
                //
                self.InitializeStartLocation = function () {
                    var firstObj = self.selectedObjects[0];
                    //
                    var ajaxControl = new ajaxLib.control();
                    var data = { 'ID': firstObj.ID, 'ClassID': firstObj.ClassID }
                    ajaxControl.Ajax(self.$region.find('.assetReg-locationControl'),
                        {
                            dataType: "json",
                            method: 'GET',
                            data: data,
                            url: 'sdApi/GetObjectLocation'
                        },
                        function (newVal) {
                            if (newVal) {
                                if (newVal.Result == 0) {//success
                                    self.LocationClassID = newVal.ClassID;
                                    self.LocationID = newVal.LocationID;
                                    //
                                    var params = { 'objectID': self.LocationID, 'objectClassID': self.LocationClassID }
                                    ajaxControl.Ajax(self.$region.find('.assetReg-locationControl'),
                                        {
                                            url: 'searchApi/getObjectFullName?' + $.param(params),
                                            method: 'GET'
                                        },
                                        function (objectFullName) {
                                            self.LocationFullName(objectFullName);
                                        },
                                        function () {//object not found => not exists
                                            self.LocationID = null;
                                            self.LocationClassID = null;
                                            self.LocationFullName('');
                                        });
                                }
                            }
                        },
                        function () {
                            self.LocationClassID = null;
                            self.LocationID = null;
                        });
                };
            }
            //
            {//owner                                            
                self.selectedOwner = ko.observable(null);
                self.ownerComboItems = ko.observableArray([]);
                self.getOwnerComboItems = function () {
                    return {
                        data: self.ownerComboItems(),
                        totalCount: self.ownerComboItems().length
                    };
                };
                //                
                self.LoadOwnerList = function () {
                    var ajaxControl = new ajaxLib.control();
                    ajaxControl.Ajax($region.find('.assetReg-ownerControl'),
                       {
                           dataType: "json",
                           method: 'GET',
                           url: 'finApi/GetOrganizationList'//TODO Owners, not only organizations
                       },
                       function (result) {
                           self.ownerComboItems().splice(0, self.ownerComboItems().length);
                           //
                           if (result && result.List) {
                               var firstObj = self.selectedObjects[0];
                               //
                               var tmp = null;
                               result.List.forEach(function (el) {
                                   self.ownerComboItems().push(el);
                                   if (firstObj.OwnerID === el.ID)
                                       tmp = el;
                               });
                               self.ownerComboItems.valueHasMutated();
                               self.selectedOwner(tmp);
                           }
                       });
                };
            }
            //
            {//user - materialResponsible          
                self.CanEdit = ko.observable(true);
                self.IsReadOnly = ko.observable(false);
                //
                self.UserID = ko.observable(null);
                self.UserLoaded = ko.observable(false);
                //
                self.EditUser = function () {
                    showSpinner();
                    require(['usualForms', 'models/SDForms/SDForm.User'], function (module, userLib) {
                        var fh = new module.formHelper(true);
                        var options = {
                            fieldFriendlyName: getTextResource('Maintenance_UserName'),
                            oldValue: self.UserLoaded() ? { ID: self.User().ID(), ClassID: self.User().ClassID(), FullName: self.User().FullName() } : null,
                            object: ko.toJS(self.User()),
                            searcherName: 'MaterialResponsibleUserSearcher',
                            searcherPlaceholder: getTextResource('EnterFIO'),
                            searcherParams: [],
                            nosave: true,
                            onSave: function (objectInfo) {
                                self.UserLoaded(false);
                                self.User(new userLib.EmptyUser(self, userLib.UserTypes.mResponsible, self.EditUser));
                                if (!objectInfo)
                                    self.UserID(null);
                                else
                                    self.UserID(objectInfo.ID);
                                //
                                self.InitializeUser();
                            }
                        };
                        fh.ShowSDEditor(fh.SDEditorTemplateModes.searcherEdit, options);
                    });
                };
                self.User = ko.observable(new userLib.EmptyUser(self, userLib.UserTypes.mResponsible, self.EditUser));
                //
                self.InitializeUser = function () {
                    require(['models/SDForms/SDForm.User'], function (userLib) {
                        if (self.UserLoaded() == false) {
                            if (self.UserID()) {
                                var options = {
                                    UserID: self.UserID(),
                                    UserType: userLib.UserTypes.mResponsible,
                                    UserName: null,
                                    EditAction: self.EditUser,
                                };
                                var user = new userLib.User(self, options);
                                self.User(user);
                                self.UserLoaded(true);
                            }
                        }
                    });
                };
            }
            //
            {//founding
                self.founding = ko.observable(null);
            }
            //
            {//numbers: inventory + code
                self.setAssetInvNumber = ko.observable(false);
                self.setAssetCode = ko.observable(false);
                //
                self.ShowAssetIdentifierSetForm = function () {
                    var paramsD = $.Deferred();
                    //
                    if ((self.setAssetInvNumber() || self.setAssetCode()) && self.ObjectsHasTerminalOrNetworkDevice())
                        require(['assetForms'], function (module) {
                            var fh = new module.formHelper(true);
                            fh.ShowAssetIdentifierSetForm(self.setAssetInvNumber(), self.setAssetCode(), paramsD);
                        });
                    else
                        paramsD.resolve(null);
                    //
                    return paramsD.promise();
                };
                //
                self.CheckInvNumberAndCodeExistence = function () {
                    var replaceD = $.Deferred();
                    //
                    if (!(self.setAssetInvNumber() || self.setAssetCode())) {
                        replaceD.resolve(null);
                        return replaceD.promise();
                    }
                    //
                    var data =
                    {
                        'DeviceList': self.GetObjectInfoList(),
                    };
                    var ajaxControl = new ajaxLib.control();
                    ajaxControl.Ajax(self.$region,
                        {
                            dataType: "json",
                            method: 'POST',
                            data: data,
                            url: 'imApi/CheckInvNumberAndCodeExistence'
                        },
                        function (newVal) {
                            if (newVal.Result === 0) {
                                if (newVal.InvNumberExists || newVal.CodeExists) {
                                    var needMessage = false;
                                    var msg = getTextResource('AssetAlreadyHasFields');
                                    //
                                    var needAnd = false;
                                    if (newVal.InvNumberExists && self.setAssetInvNumber()) {
                                        msg += ' ' + getTextResource('InvNumbers');
                                        needAnd = true;
                                        needMessage = true;
                                    }
                                    if (newVal.CodeExists && self.setAssetCode()) {
                                        if (needAnd)
                                            msg += ' ' + getTextResource('And');
                                        msg += ' ' + getTextResource('Codes');
                                        needMessage = true;
                                    }
                                    //
                                    if (needMessage)
                                        require(['sweetAlert'], function () {
                                            swal({
                                                title: msg,
                                                text: getTextResource('AssetRegistration_ReplaceAlreadyExistedFieldsQuestion'),
                                                showCancelButton: true,
                                                closeOnConfirm: true,
                                                closeOnCancel: true,
                                                confirmButtonText: getTextResource('ButtonOK'),
                                                cancelButtonText: getTextResource('ButtonCancel')
                                            },
                                                function (value) {
                                                    if (value == true)
                                                        replaceD.resolve(true);
                                                    else
                                                        replaceD.resolve(false);
                                                });
                                        });
                                    else
                                        replaceD.resolve(null);
                                }
                                else
                                    replaceD.resolve(null);
                            }
                            else {
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[AssetRegistration.js, CheckInvNumberAndCodeExistence]', 'error');
                                });
                                replaceD.resolve(false);
                            }
                        });
                    //
                    return replaceD.promise();
                };
            }
            //
            {//report
                self.printReport = ko.observable(false);
            }
            //
            self.AfterRender = function () {
                self.CheckStorageLocationExistence();
                self.InitializeLocationSearcher();
            };
            //
            self.Load = function (id, classID) {
                self.mode(self.modes.main);
                //
                self.selectedObjects.forEach(function (el) {
                    self.LinkIDList.push(el.ID);
                });
                self.TabLinksCaption(getTextResource('AssetLinkHeaderChoosen') + ' (' + self.LinkIDList.length + ')');
                //                
                self.InitializeStartLocation();
                self.LoadOwnerList();
                self.InitializeUser();
            };
            //                        
            //
            self.RegisterAsset = function () {
                $.when(self.CheckInvNumberAndCodeExistence()).done(function (replace) {
                    if (replace === false)
                        return;
                    //
                    $.when(self.ShowAssetIdentifierSetForm()).done(function (params) {
                        self.DoRegisterAsset(params, replace, false, self.$isDone);
                    });
                });
                //
                return self.$isDone.promise();
            };
            self.DoRegisterAsset = function (params, replace, allowDuplicate, retval) {
                if ((self.setAssetInvNumber() || self.setAssetCode()) && self.ObjectsHasTerminalOrNetworkDevice() && !params)
                    return;
                //
                var objectList = self.GetObjectInfoList();
                var data =
                    {
                        'DeviceList': objectList,
                        'LocationID': self.LocationID,
                        'StorageID': self.StorageID,
                        'OwnerID': self.selectedOwner() ? self.selectedOwner().ID : null,
                        'OwnerClassID': 101,//TODO not only organization
                        'OwnerName': self.selectedOwner() ? self.selectedOwner().Name : null,
                        'UserID': self.UserID(),
                        'Founding': self.founding(),
                        'GenerateInvNum': self.setAssetInvNumber(),
                        'GenerateCode': self.setAssetCode(),
                        'LifeCycleStateOperationID': self.LifeCycleStateOperationID,
                        'PrintReport': self.printReport(),
                        //
                        'InventoryNumber_Prefix': params ? params.InventoryNumber_Prefix : null,
                        'InventoryNumber_Length': params ? params.InventoryNumber_Length : null,
                        'InventoryNumber_Value': params ? params.InventoryNumber_Value : null,
                        'Code_Prefix': params ? params.Code_Prefix : null,
                        'Code_Length': params ? params.Code_Length : null,
                        'Code_Value': params ? params.Code_Value : null,
                        'FillInventoryNumber': params ? params.FillInventoryNumber : null,
                        'FillSubdeviceInventoryNumber': params ? params.FillSubdeviceInventoryNumber : null,
                        'FillCode': params ? params.FillCode : null,
                        'FillSubdeviceCode': params ? params.FillSubdeviceCode : null,
                        'ReplaceInvNumber': replace ? true : null,
                        'ReplaceCode': replace ? true : null,
                        //
                        'SetInvNumberIfDuplicate': allowDuplicate,
                        'SetCodeIfDuplicate': allowDuplicate,
                    }
                var ajaxControl = new ajaxLib.control();
                ajaxControl.Ajax(self.$region,
                    {
                        dataType: "json",
                        method: 'POST',
                        data: data,
                        url: 'assetApi/RegisterAsset'
                    },
                    function (newVal) {
                        if (newVal) {
                            if (newVal.Result === 0) {
                                if (newVal.NoDuplicates || allowDuplicate) {
                                    retval.resolve(true);
                                    //
                                    ko.utils.arrayForEach(objectList, function (el) {
                                        $(document).trigger('local_objectUpdated', [el.ClassID, el.ID, ko_object ? ko_object().ID() : null]);//GoodsInvoiceSpecification
                                    });
                                    //
                                    var succsess = true;
                                    if (self.printReport()) {
                                        if (newVal.PrintReportResult === 2)//no report
                                        {
                                            succsess = false;
                                            require(['sweetAlert'], function () {
                                                swal(getTextResource('AssetRegistrationSuccess'), getTextResource('ReportPrintError') + '\n' + getTextResource('ReportPrint_NoReport'), 'info');
                                            });
                                        }
                                        else if (newVal.PrintReportResult === 3)//no ID parameter
                                        {
                                            succsess = false;
                                            require(['sweetAlert'], function () {
                                                swal(getTextResource('AssetRegistrationSuccess'), getTextResource('ReportPrintError') + '\n' + getTextResource('ReportPrint_NoParam'), 'info');
                                            });
                                        }
                                        else {
                                            if (newVal.FileInfoList != null) {
                                                var reportControl = new fcLib.control();
                                                newVal.FileInfoList.forEach(function (el) {
                                                    var item = new reportControl.CreateItem(el.ID, el.ObjectID, el.FileName, '', '', '', 'pdf');
                                                    reportControl.DownloadFile(item);
                                                });
                                            }
                                        }
                                    }
                                    //
                                    if (succsess)
                                    {
                                        if (objectList[0].ClassID != '223')
                                        {
                                            require(['sweetAlert'], function () {
                                                swal(getTextResource('AssetRegistrationSuccess'));
                                            });
                                        }
                                        else
                                        {
                                            require(['sweetAlert'], function () {
                                                swal(getTextResource('LicenseRegistrationSuccess'));
                                            });
                                        }
                                    }
                                }
                                else {//has duplicates
                                    require(['sweetAlert'], function () {
                                        swal({
                                            title: getTextResource('AssetRegistrationHasDuplicates'),
                                            text: getTextResource('AssetRegistration_AllowDuplicateQuestion'),
                                            showCancelButton: true,
                                            closeOnConfirm: true,
                                            closeOnCancel: true,
                                            confirmButtonText: getTextResource('ButtonOK'),
                                            cancelButtonText: getTextResource('ButtonCancel')
                                        },
                                        function (value) {
                                            if (value == true)
                                                self.DoRegisterAsset(params, replace, true, retval);
                                            else
                                                retval.resolve(false);
                                        });
                                    });
                                }
                            }
                            else {
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('AssetRegistrationError'), 'error');
                                });
                            }
                        }
                    });
            };
        }
    }
    return module;
});