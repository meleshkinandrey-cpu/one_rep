define(['knockout', 'jquery', 'ajax', 'imList', 'models/FinanceForms/ActivesLocation/ActivesLocationLink', 'models/FinanceForms/ActivesLocation/ActivesLocatedLink', 'treeControl', 'dateTimeControl', 'usualForms', 'parametersControl'], function (ko, $, ajaxLib, imLib, activesLocationLinkLib, activesLocatedLinkLib, treeLib, dtLib, fhModule, pcLib) {
    var module = {
        //сущность knockout, идентификатор класса сущности, селектор ajax-крутилки
        Control: function (ko_object, objectClassID, ajaxSelector, readOnly_object, canEdit_object, $region, tabHeight) {
            var self = this;
            //
            self.ko_object = ko_object;
            //
            self.isLoaded = ko.observable(false);//факт загруженности данных для объекта ko_object()
            self.ajaxControl = new ajaxLib.control();//единственный ajax для этого списка
            //
            self.ReadOnly = readOnly_object;//флаг только чтение
            self.CanEdit = canEdit_object;//флаг для редактирования/создания
            //
            self.getTabHeight = function () {
                return parseInt(tabHeight().split('px')[0]) - 5;
            };
            //
            self.locationHeightPrev = 0;
            self.locatedHeightPrev = 0;
            //
            tabHeight.subscribe(function (newValue) {
                var newTabHeightInt = parseInt(newValue.split('px')[0]) - 5;
                //
                var prevHeight = self.LeftPanelHeight() + self.LocatedHeight();
                var toLocate = self.LeftPanelHeight() / prevHeight;
                var located = 1 - toLocate;
                //
                var useHeight = newTabHeightInt - 50;
                self.LeftPanelHeight(toLocate * useHeight)
                self.LocatedHeight(located * useHeight);
                self.activesLocationLink.SizeChanged();
                self.activesLocatedLink.SizeChanged();
                //
                self.locationHeightPrev = self.LeftPanelHeight();
                self.locatedHeightPrev = self.LocatedHeight();
            });
            //
            self.LeftPanelHeight = ko.observable(0);
            self.LocatedHeight = ko.observable(0);
            //
            self.initHeight = function () {
                var _tabHeight = self.getTabHeight();
                //
                var toLocateHeight = _tabHeight / 2;
                var locatedHeight = _tabHeight - toLocateHeight - 50;
                //
                self.LeftPanelHeight(toLocateHeight);
                self.LocatedHeight(locatedHeight);
            };
            //
            self.locationControlIsExpanded = ko.observable(true);
            self.locatedControlIsExpanded = ko.observable(true);
            //
            self.LocationExpandCollapseClick = function () {
                var newStateIsCollapsed = self.locationControlIsExpanded();
                var locatedStateIsCollapsed = !self.locatedControlIsExpanded();
                //
                var _tabHeight = self.getTabHeight();
                var locationHeight;
                //
                if (newStateIsCollapsed) {
                    self.locationHeightPrev = self.LeftPanelHeight();
                    locationHeight = 0;
                    //
                    if (locatedStateIsCollapsed) {
                        self.locatedControlIsExpanded(true);
                        self.locatedHeightPrev = 0;
                    }
                }
                else {
                    var _locatedHeight = _tabHeight - 50;
                    locationHeight = self.locationHeightPrev ? self.locationHeightPrev : _locatedHeight;
                    //
                    if (!locatedStateIsCollapsed && self.locatedHeightPrev == 0)
                        self.locatedControlIsExpanded(false);
                }
                //
                var locatedHeight = _tabHeight - locationHeight - 50;
                //
                self.LeftPanelHeight(locationHeight);
                self.LocatedHeight(locatedHeight);
                //
                self.activesLocatedLink.SizeChanged();
                self.activesLocationLink.SizeChanged();
                //
                self.locationControlIsExpanded(!newStateIsCollapsed);
            };
            //
            self.LocatedExpandCollapseClick = function () {
                var newStateIsCollapsed = self.locatedControlIsExpanded();
                var locationStateIsCollapsed = !self.locationControlIsExpanded();
                //
                var locatedHeight;
                var _tabHeight = self.getTabHeight();
                //
                if (newStateIsCollapsed) {
                    self.locatedHeightPrev = self.LocatedHeight();
                    locatedHeight = 0;
                    //
                    if (locationStateIsCollapsed) {
                        self.locationControlIsExpanded(true);
                    }
                }
                else {
                    locatedHeight = self.locatedHeightPrev;
                    var _locationHeight = _tabHeight - locatedHeight - 50;
                    //
                    if (!locationStateIsCollapsed) {
                        if (self.locationHeightPrev == 0 && self.locatedHeightPrev != 0) {
                            self.locationControlIsExpanded(false);
                        }
                        else if (self.locatedHeightPrev == 0) {
                            self.locationControlIsExpanded(false);
                            locatedHeight = _tabHeight - 50;
                            self.locationHeightPrev = 0;
                        }
                        else if (_locationHeight == 0)
                            self.locationControlIsExpanded(false);
                    }
                }
                //
                var locationHeight = _tabHeight - locatedHeight - 50;
                //
                self.LeftPanelHeight(locationHeight);
                self.LocatedHeight(locatedHeight);
                //
                self.activesLocatedLink.SizeChanged();
                self.activesLocationLink.SizeChanged();
                //
                self.locatedControlIsExpanded(!newStateIsCollapsed);
            };
            //
            self.minHeight = 1;
            self.maxHeight = $(document).height();
            self.Height = ko.observable(100);
            //
            self.ResizeFunction = function (newHeight) {
                var _tabHeight = self.getTabHeight();
                //
                var resHeight = newHeight - 30;
                resHeight = Math.max(resHeight, 0);

                if (resHeight && resHeight >= self.minHeight && resHeight <= _tabHeight - 50) {
                    self.LeftPanelHeight(resHeight);
                    //
                    var locatedHeight = _tabHeight - resHeight - 50;
                    self.LocatedHeight(locatedHeight);
                    //
                    self.activesLocatedLink.SizeChanged();
                    self.activesLocationLink.SizeChanged();
                }
                //
                self.locationControlIsExpanded(true);
                self.locatedControlIsExpanded(true);
            };
            //
            self.Resize = function (tabHeight) {
                self.activesLocatedLink.SizeChanged();
                self.activesLocationLink.SizeChanged();
            };
            //
            self.ValidateFields = function () {
                if (self.hasNoContracts() == true && self.hasContracts() == true) {
                    require(['sweetAlert'], function () {
                        swal(getTextResource('AssetLocation_ContractsAndOtherTohether'));
                    });
                    return false;
                }
                if (self.hasNoContracts() == true) {
                    if (!self.LocationID) {
                        require(['sweetAlert'], function () {
                            swal(getTextResource('AssetLocation'), getTextResource('AssetLocationNotSet'), 'info');
                        });
                        return false;
                    }
                }
                if (self.hasContracts() == true) {
                    if (self.dateStartedDateTime() == null) {
                        require(['sweetAlert'], function () {
                            swal(getTextResource('Contract_StartDate'), getTextResource('ContractRegistration_DateStartPrompt'), 'info');
                        });
                        return false;
                    }
                    if (self.dateFinishedDateTime() == null) {
                        require(['sweetAlert'], function () {
                            swal(getTextResource('Contract_EndDate'), getTextResource('ContractRegistration_DateEndPrompt'), 'info');
                        });
                        return false;
                    }
                }
                if (self.parametersControl == null) {
                    require(['sweetAlert'], function () {
                        swal(getTextResource('ParametersNotLoaded'));
                    });
                    return false;
                }
                else if (!self.parametersControl.Validate())
                    return false;
                //
                return true;
            };
            //
            self.isGenerateIdentifiersVisible = function () {
                var displayIdentifierSet = $('.actives-location-inventoryNumber').css('display');
                return displayIdentifierSet == 'none' ? false : true;
            };
            //
            self.ShowAssetIdentifierSetForm = function () {
                var paramsD = $.Deferred();
                //
                if (!self.isGenerateIdentifiersVisible() || !(self.GenerateInvNumber() || self.GenerateCode())) {
                    paramsD.resolve(null);
                    return paramsD;
                }
                //
                require(['assetForms'], function (module) {
                    var fh = new module.formHelper(false);
                    fh.ShowAssetIdentifierSetForm(self.GenerateInvNumber(), self.GenerateCode(), paramsD);
                });
                //
                return paramsD.promise();
            };
            //
            self.locateActives = function (modelList) {
                var parameterValueList = self.GetParameterValueList();
                //
                self.DoLocateActives(modelList, parameterValueList, false);
            };
            //
            self.DoLocateActives = function (modelList, parameterValueList, allowDuplicate) {
                if (!self.ValidateFields())
                    return;
                //
                var data = [];
                ko.utils.arrayForEach(modelList, function (el) {
                    var value =
                    {
                        GoodsInvoiceSpecificationPurchaseDependencyID: el.GoodsInvoiceSpecificationPurchaseDependencyID,
                        //GoodsInvoiceUtcDate: el.GoodsInvoiceUtcDate,
                        //GoodsInvoiceNumber: el.GoodsInvoiceNumber,
                        //OwnerID: el.OwnerID,
                        //WorkOrderID: el.WorkOrderID,
                        //SupplierID: el.SupplierID,
                        //PriceWithNDS: el.PriceWithNDS,
                        //
                        //ProductCatalogModelClassID: el.ProductCatalogModelClassID,
                        //ProductCatalogModelID: el.ProductCatalogModelID,
                        LocationClassID: self.LocationClassID,
                        LocationID: self.LocationID,
                        StorageID: self.StorageID,
                        UtcWarrantyDate: dtLib.GetMillisecondsSince1970(self.dateCreatedDateTime()),
                        ServiceCenterID: self.selectedServiceCenterItem() ? self.selectedServiceCenterItem().ID : null,
                        GenerateInvNumber: self.isGenerateIdentifiersVisible() ? self.GenerateInvNumber() : false,
                        GenerateCode: self.isGenerateIdentifiersVisible() ? self.GenerateCode() : false,
                        SDCClassID: self.activesLocationLink.isLicense() == true ? self.SDCClassID : null,
                        SDCID: self.activesLocationLink.isLicense() == true ? self.SDCID : null,
                        //
                        UtcDateStart: dtLib.GetMillisecondsSince1970(self.dateStartedDateTime()),
                        UtcDateFinish: dtLib.GetMillisecondsSince1970(self.dateFinishedDateTime()),
                        ManagerClassID: self.ManagerClassID,
                        ManagerID: self.ManagerID,
                        //
                        ParameterValueList: parameterValueList,
                        //
                        Count: el.Count,
                        //
                        SetInvNumberIfDuplicate: allowDuplicate,
                        SetCodeIfDuplicate: allowDuplicate,
                    };
                    data.push(value);
                });
                //
                self.ajaxControl.Ajax($region,
                    {
                        dataType: "json",
                        method: 'POST',
                        data: { AssetFieldsList: data },
                        url: 'finApi/LocateAsset'
                    },
                    function (val) {
                        if (val.Result == 0) {
                            if (val.NoDuplicates || allowDuplicate) {
                                self.activesLocationLink.ReloadTable();
                                self.activesLocatedLink.ReloadTable();
                                //
                                $(document).trigger('local_objectUpdated', [383, null, ko_object().ID()]);//GoodsInvoiceSpecification
                                //
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('AssetLocation'), getTextResource('AssetLocatedSuccessfully'), 'info');
                                    self.showHideProgressBar(false);
                                    self.ShowHideLocationButton(false);
                                });
                            }
                            else {//has duplicates
                                self.showHideProgressBar(false);
                                //
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
                                                self.DoLocateActives(modelList, parameterValueList, true);
                                        });
                                });
                            }
                        }
                        else {
                            require(['sweetAlert'], function () {
                                swal(getTextResource('AssetLocation'), getTextResource('AssetLocationError'), 'error');
                                self.showHideProgressBar(false);
                            });
                        }
                    });
            };
            //
            self.ShowHideLocationButton = function (show) {
                if (!show) {
                    var btn = $region.find(".asset-locate-btn");
                    var progressBar = $region.find(".asset-locate-progressBar");
                    var pBarText = $region.find(".asset-locate-progressBarText");
                    var hider = $region.find(".asset-locate-progressBarHider");
                    //
                    btn.css('display', show ? '' : 'none');
                    progressBar.css('display', show ? '' : 'none');
                    hider.css('display', show ? '' : 'none');
                    pBarText.css('display', show ? '' : 'none');
                }
                else
                    self.showHideProgressBar(false);
            };
            //            
            self.Inited = false;
            self.Init = function () {
                if (!self.Inited) {
                    self.initHeight();
                    //
                    self.Inited = true;
                    self.activesLocationLink.AfterRender(ko_object);
                    self.activesLocatedLink.AfterRender(ko_object);
                    //
                    self.GetServiceCenterList();
                    //
                    if (!self.controlDateCreated())
                        self.InitDtp('.date-warranty', self.dateCreated, self.dateCreatedDateTime, self.controlDateCreated);
                    if (!self.controlDateStarted())
                        self.InitDtp('.date-start', self.dateStarted, self.dateStartedDateTime, self.controlDateStarted);
                    if (!self.controlDateFinished())
                        self.InitDtp('.date-end', self.dateFinished, self.dateFinishedDateTime, self.controlDateFinished);
                    //
                    self.CheckStorageLocationExistence();
                    self.InitializeLocationSearcher();
                    self.InitializeManagerSearcher();
                    self.LoadSoftwareDistributionCentres();
                    //
                    $(document).bind('progressBarProcessed', self.onProgressBarProcessed);
                }
                else {
                    self.LeftPanelHeight(self.LeftPanelHeight());
                    //self.activesLocationLink.SizeChanged();
                    //self.activesLocatedLink.SizeChanged();
                }
            };
            //
            self.showHideProgressBar = function (show) {
                var btn = $region.find(".asset-locate-btn");
                var progressBar = $region.find(".asset-locate-progressBar");
                var pBarText = $region.find(".asset-locate-progressBarText");
                var hider = $region.find(".asset-locate-progressBarHider");
                //
                btn.css('display', show ? 'none' : '');
                progressBar.css('display', show ? '' : 'none');
                hider.css('display', show ? '' : 'none');
                pBarText.css('display', show ? '' : 'none');
            };
            //
            self.onProgressBarProcessed = function (e, objectClassID, objectID, progressMessage, percentage) {
                if (!self.ko_object || !self.ko_object() || self.ko_object().ID() != objectID)
                    return;
                //
                self.showHideProgressBar(true);
                //
                var hider = $region.find(".asset-locate-progressBarHider");
                hider.css('width', (1 - percentage) * 200 + 'px');
            };
            //
            self.GenerateInvNumber = ko.observable(false);
            self.GenerateCode = ko.observable(false);
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
                        $region.find('.invoice-asset-storage'),
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
                            $region.find('.invoice-asset-storage').focus();
                        });
                    });
                    //
                    var resetLocationSearcherParams = function () {
                        if (self.StorageID) {
                            self.LocationClassID = null;
                            self.LocationID = null;
                            self.LocationName('');
                        }
                        //
                        if (self.locationSearcher) {
                            var params = [true, false, false, false, self.StorageID];
                            self.locationSearcher.SetSearchParameters(params);
                        }
                    };
                };
            }
            //
            {//location
                self.LocationClassID = null;
                self.LocationID = null;
                self.LocationName = ko.observable('');
                //
                self.locationSearcher = null;
                self.locationSearcherD = $.Deferred();
                self.InitializeLocationSearcher = function () {
                    var fh = new fhModule.formHelper();
                    var locationD = fh.SetTextSearcherToField(
                        $region.find('.invoice-asset-location'),
                        'AssetLocationSearcher',
                        null,
                        [true, false, false, false, self.StorageID],
                        function (objectInfo) {//select
                            self.LocationClassID = objectInfo.ClassID;
                            self.LocationID = objectInfo.ID;
                            self.LocationName(objectInfo.FullName);
                        },
                        function () {//reset
                            self.LocationClassID = null;
                            self.LocationID = null;
                            self.LocationName('');
                        });
                    $.when(locationD).done(function (ctrl) {
                        self.locationSearcher = ctrl;
                        self.locationSearcherD.resolve(ctrl);
                        ctrl.CurrentUserID = null;
                        //
                        ctrl.LoadD.done(function () {
                            $region.find('.invoice-asset-location').focus();
                        });
                    });
                };
            }

            {//ЦРПО
                self.targetSoftwareDistributionCentre = ko.observable(null);
                self.LoadSoftwareDistributionCentres = function () {
                    var retD = $.Deferred();
                    $.when(self.softwareDistributionCentres.load())
                        .done(function () { retD.resolve(); });
                    return retD;
                };
                self.softwareDistributionCentres = new module.SoftwareDistributionCentres(null);
                self.getListOfSDC = function (options) {
                    var data = self.softwareDistributionCentres == null
                        ? []
                        : self.softwareDistributionCentres.list();

                    options.callback({ data: data, total: data.length });
                };

                self.softwareDistributionCentres_handle = self.softwareDistributionCentres.list.subscribe(function (newObject) {
                    if (newObject != null) {
                        self.targetSoftwareDistributionCentre(newObject[0]);
                    }
                });
                self.targetSoftwareDistributionCentre.subscribe(function (newObject) {
                    if (newObject != null) {
                        self.SDCClassID = 23;
                        self.SDCID = newObject.ID;
                        //self.LocationName(newObject.Name);
                    };
                });
          }
            //
            {//manager (contract)
                self.ManagerClassID = null;
                self.ManagerID = null;
                self.ManagerName = ko.observable('');
                //
                self.managerSearcher = null;
                self.managerSearcherD = $.Deferred();
                self.InitializeManagerSearcher = function () {
                    var fh = new fhModule.formHelper();
                    var managerD = fh.SetTextSearcherToField(
                        $region.find('.invoice-contract-manager'),
                        'UtilizerSearcher',
                        null,
                        [],
                        function (objectInfo) {//select
                            self.ManagerClassID = objectInfo.ClassID;
                            self.ManagerID = objectInfo.ID;
                            self.ManagerName(objectInfo.FullName);
                        },
                        function () {//reset
                            self.ManagerClassID = null;
                            self.ManagerID = null;
                            self.ManagerName('');
                        });
                    $.when(managerD).done(function (ctrl) {
                        self.managerSearcher = ctrl;
                        self.managerSearcherD.resolve(ctrl);
                        ctrl.CurrentUserID = null;
                        //
                        $.when(userD).done(function (user) {
                            self.ManagerClassID = 9;
                            self.ManagerID = user.UserID;
                            self.ManagerName(user.UserFullName);
                            //
                            ctrl.SetSelectedItem(user.UserID, 9, user.UserFullName, '');
                        });
                        //
                        ctrl.LoadD.done(function () {
                            $region.find('.invoice-contract-manager').focus();
                        });
                    });
                };
            }
            //
            //parameters
            {
                self.parametersControl = null;
                self.parameterListByGroup = ko.observable([]);//кеш отсортирортированных параметров, разбитых по группам
                self.GetParameterValueList = function () {//получения списка значений всех параметров
                    var retval = [];
                    //
                    if (self.parametersControl != null)
                        retval = self.parametersControl.GetParameterValueList();
                    //
                    return retval;
                };
                self.InitializeParameters = function (modelList) {
                    var productCatalogModelID = modelList.length == 0 ? null : modelList[0].ProductCatalogModelID;
                    var productCatalogModelClassID = modelList.length == 0 ? null : modelList[0].ProductCatalogModelClassID;
                    for (var i = 0; i < modelList.length; i++) {//выбрано больше одной позиции с разными моделями - параметры прячем
                        if (productCatalogModelID != modelList[i].ProductCatalogModelID ||
                            productCatalogModelClassID != modelList[i].ProductCatalogModelClassID) {
                            productCatalogModelID = null;
                            productCatalogModelClassID = null;
                            break;
                        }
                    }
                    //
                    var objectClassID = 0;
                    switch (productCatalogModelClassID) {
                        case 95://IMSystem.Global.OBJ_ADAPTERMODEL
                            objectClassID = 33;//IMSystem.Global.OBJ_ADAPTER
                            break;
                        case 96://IMSystem.Global.OBJ_PERIPHERALMODEL
                            objectClassID = 34;//IMSystem.Global.OBJ_PERIPHERAL
                            break;
                        case 94://IMSystem.Global.OBJ_TERMINALDEVICEMODEL
                            objectClassID = 6;//IMSystem.Global.OBJ_TERMINALDEVICE
                            break;
                        case 93://IMSystem.Global.OBJ_NETWORKDEVICEMODEL
                            objectClassID = 5;//IMSystem.Global.OBJ_NETWORKDEVICE
                            break;
                        case 107://IMSystem.Global.OBJ_MATERIALMODEL
                            objectClassID = 120;//IMSystem.Global.OBJ_MATERIAL
                            break;
                        case 38://IMSystem.Global.OBJ_SoftwareLicenceModel
                            objectClassID = 223;//IMSystem.Global.OBJ_SOFTWARE_LICENSE
                            break;
                        case 182://OBJ_ServiceContractModel
                            objectClassID = 115;//OBJ_ServiceContract
                            break;
                    }
                    //
                    var elem = $region.find('.actives-location-params-table');
                    if (elem.length > 0) {
                        showSpinner(elem[0]);
                        var handle = null;
                        handle = self.parametersControl.IsLoaded.subscribe(function (newValue) {
                            if (newValue == true) {
                                hideSpinner(elem[0]);
                                handle.dispose();
                            }
                        });
                    }
                    self.parametersControl.Create(objectClassID, productCatalogModelID, false, null);
                };
                self.OnParametersChanged = function (modelList) {//обновления списка параметров по объекту
                    self.modelList(modelList);
                    //
                    if (self.parametersControl == null) {
                        self.parametersControl = new pcLib.control();
                        self.parametersControl.ReadOnly(self.ReadOnly());
                        self.parametersControl.ParameterListByGroup.subscribe(function (newValue) {//изменилась разбивка параметров по группам
                            self.parameterListByGroup(newValue);
                        });
                    }
                    self.InitializeParameters(modelList);
                };
            }
            //
            {//hide/show params by classID
                self.modelList = ko.observableArray([]);
                //
                self.hasNoContracts = ko.computed(function () {
                    if (self.modelList().length == 0)
                        return false;
                    var retval = ko.utils.arrayFirst(self.modelList(), function (el) {
                        return el.ProductCatalogModelClassID != 182;//OBJ_ServiceContractModel
                    });
                    return retval != null;
                });
                self.hasContracts = ko.computed(function () {
                    if (self.modelList().length == 0)
                        return false;
                    var retval = ko.utils.arrayFirst(self.modelList(), function (el) {
                        return el.ProductCatalogModelClassID == 182;//OBJ_ServiceContractModel
                    });
                    return retval != null;
                });
                self.hasMaterial = ko.computed(function () {
                    if (self.modelList().length == 0)
                        return false;
                    var retval = ko.utils.arrayFirst(self.modelList(), function (el) {
                        return el.ProductCatalogModelClassID == 107;//OBJ_MATERIALMODEL
                    });
                    return retval != null;
                });                
            }
            //
            self.activesLocationLink = new activesLocationLinkLib.ViewModel($region, ko_object, self.locateActives, self.OnParametersChanged, self.ShowHideLocationButton);
            self.activesLocatedLink = new activesLocatedLinkLib.ViewModel($region, ko_object);
            //
            self.DestroyControls = function () {
                if (self.parametersControl != null)
                    self.parametersControl.DestroyControls();
                self.activesLocatedLink.dispose();
            };
            //
            //
            {//dateWarranty
                self.controlDateCreated = ko.observable(null);
                //
                self.dateCreated = ko.observable(null);//always local string
                self.dateCreated.subscribe(function (newValue) {
                    if (self.controlDateCreated().$isLoaded.state() != 'resolved')
                        return;
                    //
                    var dt = self.controlDateCreated().dtpControl.length > 0 ? self.controlDateCreated().dtpControl.datetimepicker('getValue') : null;
                    //
                    if (!newValue || newValue.length == 0)
                        self.dateCreatedDateTime(null);//clear field => reset value
                    else if (dtLib.Date2String(dt, true) != newValue) {
                        self.dateCreatedDateTime(null);//value incorrect => reset value
                        self.dateCreated('');
                    }
                    else
                        self.dateCreatedDateTime(dt);
                });
                self.dateCreatedDateTime = ko.observable(dtLib.StringIsDate(self.dateCreated()) ? new Date(getUtcDate(self.dateCreated())) : null);//always dateTime, auto convert serverUtcDateString to jsLocalTime
            }
            {//dateStart
                self.controlDateStarted = ko.observable(null);
                //
                self.dateStarted = ko.observable(null);//always local string
                self.dateStarted.subscribe(function (newValue) {
                    if (self.controlDateStarted().$isLoaded.state() != 'resolved')
                        return;
                    //
                    var dt = self.controlDateStarted().dtpControl.length > 0 ? self.controlDateStarted().dtpControl.datetimepicker('getValue') : null;
                    //
                    if (!newValue || newValue.length == 0)
                        self.dateStartedDateTime(null);//clear field => reset value
                    else if (dtLib.Date2String(dt, true) != newValue) {
                        self.dateStartedDateTime(null);//value incorrect => reset value
                        self.dateStarted('');
                    }
                    else
                        self.dateStartedDateTime(dt);
                });
                self.dateStartedDateTime = ko.observable(dtLib.StringIsDate(self.dateStarted()) ? new Date(getUtcDate(self.dateStarted())) : null);//always dateTime, auto convert serverUtcDateString to jsLocalTime
            }
            {//dateEnd
                self.controlDateFinished = ko.observable(null);
                //
                self.dateFinished = ko.observable(null);//always local string
                self.dateFinished.subscribe(function (newValue) {
                    if (self.controlDateFinished().$isLoaded.state() != 'resolved')
                        return;
                    //
                    var dt = self.controlDateFinished().dtpControl.length > 0 ? self.controlDateFinished().dtpControl.datetimepicker('getValue') : null;
                    //
                    if (!newValue || newValue.length == 0)
                        self.dateFinishedDateTime(null);//clear field => reset value
                    else if (dtLib.Date2String(dt, true) != newValue) {
                        self.dateFinishedDateTime(null);//value incorrect => reset value
                        self.dateFinished('');
                    }
                    else
                        self.dateFinishedDateTime(dt);
                });
                self.dateFinishedDateTime = ko.observable(dtLib.StringIsDate(self.dateFinished()) ? new Date(getUtcDate(self.dateFinished())) : null);//always dateTime, auto convert serverUtcDateString to jsLocalTime
            }
            //
            self.InitDtp = function (dtpClass, dateTimeStr, dateTime, control) {
                var dtp = $region.find(dtpClass);
                var ctrl = new dtLib.control();
                ctrl.init(dtp, {
                    StringObservable: dateTimeStr,
                    ValueDate: dateTime(),
                    OnlyDate: true,
                    OnSelectDateFunc: function (current_time, $input) {
                        dateTime(current_time);
                        dateTimeStr(dtLib.Date2String(current_time, true));
                    },
                    OnSelectTimeFunc: function (current_time, $input) {
                        dateTime(current_time);
                        dateTimeStr(dtLib.Date2String(current_time, true));
                    },
                    HeaderText: ''
                });
                control(ctrl);
            };
            //
            //
            self.selectedServiceCenterItem = ko.observable(null);
            self.serviceCenterComboItems = ko.observableArray([]);
            self.getServiceCenterComboItems = function () {
                return {
                    data: self.serviceCenterComboItems(),
                    totalCount: self.serviceCenterComboItems().length
                };
            };
            //
            self.GetServiceCenterList = function () {
                self.ajaxControl.Ajax($region.find('.service-center-combobox'),
                   {
                       dataType: "json",
                       method: 'GET',
                       url: 'finApi/GetSupplierList'
                   },
                   function (result) {
                       if (result) {
                           var selEl = null;
                           result.forEach(function (el) {
                               self.serviceCenterComboItems().push(el);
                           });
                           self.serviceCenterComboItems.valueHasMutated();
                           self.selectedServiceCenterItem(selEl);
                       }
                   });
            };
            //
            self.ajaxControl_Storage = new ajaxLib.control();
            self.StorageLocationEnabled = ko.observable(false);
            self.CheckStorageLocationExistence = function () {
                self.ajaxControl_Storage.Ajax($region.find('.invoice-asset-storage'),
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
        },
        SoftwareDistributionCentres: function (el) {
            var self = this;
            self.list = ko.observableArray([]);
            self.load = function () {
                var retD = $.Deferred();

                new ajaxLib.control().Ajax(null, {
                    dataType: "json",
                    method: 'GET',
                    url: 'assetApi/SoftwareDistributionCentres?softwareModelId=' + el
                }, function (newVal) {
                    if (newVal && newVal.Result === 0) {
                        var data = newVal.Data;
                        if (data) {

                            self.list.removeAll();
                            ko.utils.arrayForEach(data.Objects, function (el) {
                                self.list.push(el.ObjectData);
                            });
                        }
                        retD.resolve();
                    }
                    else if (newVal && newVal.Result === 1)
                        require(['sweetAlert'], function () {
                            swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[frmSublicenseTransfer.js, load]', 'error');
                        });
                    else if (newVal && newVal.Result === 2)
                        require(['sweetAlert'], function () {
                            swal(getTextResource('ErrorCaption'), getTextResource('BadParamsError') + '\n[frmSublicenseTransfer.js, load]', 'error');
                        });
                    else if (newVal && newVal.Result === 3)
                        require(['sweetAlert'], function () {
                            swal(getTextResource('ErrorCaption'), getTextResource('AccessError'), 'error');
                        });
                    else
                        require(['sweetAlert'], function () {
                            swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[frmSublicenseTransfer.js, load]', 'error');
                        });
                });

                return retD;
            };
        }
    };
    return module;
});