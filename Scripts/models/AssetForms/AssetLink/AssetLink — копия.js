define(['knockout',
    'jquery',
    'ajax',
    'iconHelper',
    'selectControl',
    'treeControl',
    'ui_controls/ListView/ko.ListView.Cells',
    'ui_controls/ListView/ko.ListView.Helpers',
    'ui_controls/ListView/ko.ListView.LazyEvents',
    'ui_controls/ListView/ko.ListView',
    'ui_controls/ContextMenu/ko.ContextMenu'],
    function (ko,
        $,
        ajaxLib,
        ihLib,
        scLib,
        treeLib,
        m_cells,
        m_helpers,
        m_lazyEvents) {
        var module = {
            MOL: { ID: 'MOL', Name: getTextResource('AssetNumber_UserName') },
            Owner: { ID: 'Owner', Name: getTextResource('AssetNumber_OwnerName') },
            Utilizer: { ID: 'Utilizer', Name: getTextResource('AssetNumber_UtilizerName') },
            ViewModel: function ($region, bindedObject) {
                var self = this;
                self.$isLoaded = $.Deferred();
                self.$region = $region;
                //
                self.bindedClassID = bindedObject.ClassID;
                self.bindedObjectID = bindedObject.ID;
                self.bindedServiceID = bindedObject.ServiceID;
                self.bindedClientID = bindedObject.ClientID;
                self.showWrittenOff = bindedObject.ShowWrittenOff;
                self.selectOnlyOne = bindedObject.SelectOnlyOne;
                self.uniqueAssetTypeToShow = bindedObject.UniqueAssetTypeToShow;
                self.ShowKE = bindedObject.ShowKE;
                self.IsHaspAdapterForm = bindedObject.IsHaspAdapterForm;
                self.IsConfigurationUnitAgentForm = bindedObject.IsConfigurationUnitAgentForm;
                self.ConfigurationUnitAgentTypeID = bindedObject.ConfigurationUnitAgentTypeID;
                //
                self.modes = {
                    ClientOrService: 'ClientOrService',
                    Location: 'Location',
                    ParameterSelector: 'ParameterSelector',
                    Choosen: 'Choosen',
                    SoftwareModelCatalog: 'SoftwareModelCatalog'
                };
                //
                self.FocusSearcher = function () {
                    var searcher = self.$region.find('.asset-link_searchText .text-input');
                    searcher.focus();
                };
                //
                self.CanSeeClientOrService = ko.observable(self.bindedClassID == 701); //CALL
                //
                self.currentMode = ko.observable(null);
                self.currentMode.subscribe(function (newValue) {
                    $.when(self.$isLoaded).done(function () {
                        if (newValue == self.modes.ClientOrService && !self.modelClientService()) {
                            self.initClientService();
                            self.modelClientService().CalculateSize();
                        }
                        //
                        if (newValue == self.modes.Location && !self.modelLocation())
                            self.initLocation();
                        //
                        if (newValue == self.modes.ParameterSelector && !self.modelParameterSelector())
                            self.initParameterSelector();
                        //
                        if (newValue == self.modes.Choosen && !self.modelChoosen())
                            self.initChoosen();
                    });
                });
                //
                self.modelClientService = ko.observable(null);
                self.ClientServiceReady = ko.observable(false);
                self.initClientService = function () {
                    self.modelClientService(new module.ClientServiceModel(self.bindedClientID, self.bindedServiceID, self.OnSelectedChangeHandler, self.IsSelectedChecker, self.FocusSearcher));
                    self.ClientServiceReady(true);
                    self.modelClientService().Search();
                };
                self.selectClientService = function () {
                    self.currentMode(self.modes.ClientOrService);
                    self.FocusSearcher();
                };
                self.isClientServiceSelected = ko.computed(function () {
                    return self.currentMode() == self.modes.ClientOrService;
                });
                //
                self.modelLocation = ko.observable(null);
                self.LocationReady = ko.observable(false);
                self.initLocation = function () {
                    self.modelLocation(new module.LocationModel());
                    self.LocationReady(true);
                };
                self.selectLocation = function () {
                    self.currentMode(self.modes.Location);
                };
                self.isLocationSelected = ko.computed(function () {
                    return self.currentMode() == self.modes.Location;
                });
                //
                self.dispose = function () {
                    if (self.modelParameterSelector())
                        self.modelParameterSelector().dispose();
                };
                //
                self.modelParameterSelector = ko.observable(null);
                self.ParameterReady = ko.observable(false);
                self.initParameterSelector = function () {
                    self.modelParameterSelector(new module.ParameterSelectorModel(self.$region, self.OnSelectedChangeHandler, self.IsSelectedChecker, true, self.FocusSearcher, self.showWrittenOff, self.uniqueAssetTypeToShow, self.IsHaspAdapterForm, self.ShowKE, self.IsConfigurationUnitAgentForm, self.ConfigurationUnitAgentTypeID));
                    self.ParameterReady(true);
                };
                self.selectParameterSelector = function () {
                    self.currentMode(self.modes.ParameterSelector);
                    if (self.ParameterReady()) {
                        self.modelParameterSelector().SizeChanged();
                        self.FocusSearcher();
                    }
                };
                self.isParameterSelected = ko.computed(function () {
                    return self.currentMode() == self.modes.ParameterSelector;
                });
                //
                self.modelChoosen = ko.observable(null);
                self.ChoosenReady = ko.observable(false);
                self.initChoosen = function () {
                    self.modelChoosen(new module.ChoosenModel(self.selectedAssets));
                    self.ChoosenReady(true);
                };
                self.selectChoosen = function () {
                    self.currentMode(self.modes.Choosen);
                };
                self.isChoosenSelected = ko.computed(function () {
                    return self.currentMode() == self.modes.Choosen;
                });
                //
                self.selectedAssets = ko.observableArray([]);
                self.isChoosenVisible = ko.computed(function () {
                    var assets = self.selectedAssets();
                    if (assets && assets.length > 0)
                        return true;
                    //
                    return false;
                });
                self.ChoosenCounterText = ko.computed(function () {
                    var assets = self.selectedAssets();
                    //
                    if (assets && assets.length > 0)
                        return '(' + assets.length + ')';
                    //
                    return '';
                });
                //
                self.OnSelectedChangeHandler = function (obj, newValue) {
                    if (!obj)
                        return;
                    //
                    var startSelectedCounter = self.selectedAssets().length;
                    //
                    if (newValue) {
                        var exist = ko.utils.arrayFirst(self.selectedAssets(), function (el) {
                            return el.ID.toUpperCase() === obj.ID.toUpperCase();
                        });
                        //
                        if (!exist) {
                            self.selectedAssets.push(obj);
                            //
                            if (self.ClientServiceReady())
                                self.modelClientService().CheckAndSetSelectedState(obj.ID, true);
                            if (self.ParameterReady())
                                self.modelParameterSelector().CheckAndSetSelectedState(obj.ID, true);
                        }
                    }
                    else {
                        var exist = ko.utils.arrayFirst(self.selectedAssets(), function (el) {
                            return el.ID.toUpperCase() === obj.ID.toUpperCase();
                        });
                        //
                        if (exist) {
                            self.selectedAssets.remove(function (el) { return el.ID.toUpperCase() == obj.ID.toUpperCase(); });
                            //
                            if (self.ClientServiceReady())
                                self.modelClientService().CheckAndSetSelectedState(obj.ID, false);
                            if (self.ParameterReady())
                                self.modelParameterSelector().CheckAndSetSelectedState(obj.ID, false);
                            //
                            if (self.selectedAssets().length == 0 && self.isChoosenSelected()) {
                                if (self.CanSeeClientOrService())
                                    self.selectClientService();
                                else self.selectParameterSelector();
                            }
                        }
                    }
                    //
                    var endSelectedCounter = self.selectedAssets().length;
                    //
                    if (self.selectOnlyOne) {
                        if (endSelectedCounter == 1) {
                            self.SetFilledButtonsList();
                        } else if (endSelectedCounter > 1) {
                            self.SetClearSelectionButtonsList();
                        } else {
                            self.SetCLearButtonsList();
                        }
                    } else {
                        if (startSelectedCounter == 0 && endSelectedCounter > 0 && self.SetFilledButtonsList) {
                            self.SetFilledButtonsList();
                        } else if (startSelectedCounter != 0 && endSelectedCounter == 0 && self.SetCLearButtonsList) {
                            self.SetCLearButtonsList();
                        }
                    }

                };
                self.IsSelectedChecker = function (id) {
                    if (!id)
                        return false;
                    //
                    var exist = ko.utils.arrayFirst(self.selectedAssets(), function (el) {
                        return el.ID.toUpperCase() === id.toUpperCase();
                    });
                    //
                    if (exist)
                        return true;
                    else return false;
                };
                //uses from formHelper
                self.GetFinalList = function () {
                    return ko.toJS(self.selectedAssets());
                };
                self.ClearSelection = function () {
                    while (self.selectedAssets().length > 0) {
                        var el = self.selectedAssets()[0];
                        if (el && el.Selected && el.Selected() === true)
                            el.Selected(false);
                        else break;
                    }
                };
                self.SetCLearButtonsList = null;
                self.SetFilledButtonsList = null;
                self.SetClearSelectionButtonsList = null;
                //
                self.AfterRender = function () {
                    self.$isLoaded.resolve();
                    //
                    if (self.CanSeeClientOrService())
                        self.selectClientService();
                    else self.selectParameterSelector();
                };
                self.SizeChanged = function () {
                    if (self.ParameterReady())
                        self.modelParameterSelector().SizeChanged();
                };
            },

            ClientServiceModel: function (clientID, serviceID, mainOnChangeSelected, mainCheckerAlreadySelected, focusSearcher) {
                var self = this;
                self.bindedServiceID = ko.observable(serviceID);
                self.bindedClientID = ko.observable(clientID);
                //
                self.FindedClientObjects = ko.observableArray([]);
                self.FindedServiceObjects = ko.observableArray([]);
                self.ChoosenObjects = ko.observableArray([]);
                //
                self.OnChangeSelected = function (obj, newValue) {
                    if (!obj || !mainOnChangeSelected)
                        return;
                    //
                    mainOnChangeSelected(obj, newValue);
                };
                self.CheckAndSetSelectedState = function (id, newState) {
                    var exist = ko.utils.arrayFirst(self.FindedClientObjects(), function (el) {
                        return el.ID.toUpperCase() === id.toUpperCase();
                    });
                    if (exist && exist.Selected() !== newState)
                        exist.Selected(newState);
                    //
                    exist = ko.utils.arrayFirst(self.FindedServiceObjects(), function (el) {
                        return el.ID.toUpperCase() === id.toUpperCase();
                    });
                    if (exist && exist.Selected() !== newState)
                        exist.Selected(newState);
                };
                //
                self.ClientObjectsExpanded = ko.observable(true);
                self.ServiceObjectsExpanded = ko.observable(true);
                self.ExpandCollapseClient = function () {
                    self.ClientObjectsExpanded(!self.ClientObjectsExpanded());
                    //
                    self.CalculateSize();
                };
                self.ExpandCollapseService = function () {
                    self.ServiceObjectsExpanded(!self.ServiceObjectsExpanded());
                    //
                    self.CalculateSize();
                };
                //
                self.CanSearchClient = ko.computed(function () {
                    if (self.bindedClientID())
                        return true;
                    else return false;
                });
                self.CanSearchService = ko.computed(function () {
                    if (self.bindedServiceID())
                        return true;
                    else return false;
                });
                self.CanSearch = ko.computed(function () {
                    return self.CanSearchClient() || self.CanSearchService();
                });
                //
                self.EmptyTextClient = ko.computed(function () {
                    if (self.CanSearchClient())
                        return getTextResource('ListIsEmpty');
                    else return getTextResource('ClientNotSet');
                });
                self.EmptyTextService = ko.computed(function () {
                    if (self.CanSearchService())
                        return getTextResource('ListIsEmpty');
                    else return getTextResource('ServiceNotSet');
                });
                //
                self.SearchText = ko.observable('');
                self.SearchText.subscribe(function (newValue) {
                    self.WaitAndSearch(newValue);
                });
                self.IsSearchTextEmpty = ko.computed(function () {
                    var text = self.SearchText();
                    if (!text)
                        return true;
                    //
                    return false;
                });
                //
                self.SearchKeyPressed = function (data, event) {
                    if (event.keyCode == 13) {
                        if (!self.IsSearchTextEmpty())
                            self.Search();
                    }
                    else
                        return true;
                };
                self.EraseTextClick = function () {
                    self.SearchText('');
                };
                //
                self.searchTimeout = null;
                self.WaitAndSearch = function (text) {
                    clearTimeout(self.searchTimeout);
                    self.searchTimeout = setTimeout(function () {
                        if (text == self.SearchText())
                            console.log('search');
                        //self.Search();
                    }, 500);
                };
                //
                self.ajaxControl_search = new ajaxLib.control();
                self.Search = function () {
                    var returnD = $.Deferred();
                    //
                    if (self.CanSearch())
                        $.when(userD).done(function (user) {
                            var param = {
                                Query: encodeURIComponent(self.SearchText()),
                                NeedClient: self.CanSearchClient(),
                                NeedService: self.CanSearchService(),
                                ServiceID: self.bindedServiceID(),
                                ClientID: self.bindedClientID(),
                                StartPosition: 0
                            };
                            self.ajaxControl_search.Ajax($('.asset-link-clientservice'),
                                {
                                    url: 'imApi/SearchByClientAndService?' + $.param(param),
                                    method: 'GET'
                                },
                                function (response) {
                                    if (response) {
                                        if (response.Result === 0) {
                                            if (response.ClientList && self.CanSearchClient()) {
                                                self.FindedClientObjects.removeAll();
                                                response.ClientList.forEach(function (el) {
                                                    self.FindedClientObjects().push(new module.ListAssetObject(el, self.OnChangeSelected, mainCheckerAlreadySelected));
                                                });
                                                self.FindedClientObjects.valueHasMutated();
                                            }
                                            //
                                            if (response.ServiceList && self.CanSearchService()) {
                                                self.FindedServiceObjects.removeAll();
                                                response.ServiceList.forEach(function (el) {
                                                    self.FindedServiceObjects().push(new module.ListAssetObject(el, self.OnChangeSelected, mainCheckerAlreadySelected));
                                                });
                                                self.FindedServiceObjects.valueHasMutated();
                                            }
                                        }
                                        else if (response.Result == 1) {
                                            require(['sweetAlert'], function () {
                                                swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + ' ' + '\n[AssetLink.js, Search]', 'error');
                                            });
                                        }
                                        else {
                                            require(['sweetAlert'], function () {
                                                swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + ' ' + '\n[AssetLink.js, Search]', 'error');
                                            });
                                        }
                                        //
                                        self.CalculateSize();
                                        returnD.resolve();
                                    }
                                    else {
                                        require(['sweetAlert'], function () {
                                            swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + ' ' + '\n[AssetLink.js, Search]', 'error');
                                        });
                                        //
                                        returnD.resolve();
                                    }
                                });
                        });
                    else returnD.resolve();
                    //
                    return returnD;
                };
                //
                self.CalculatedClientHeight = ko.observable('0px');
                self.CalculatedServiceTop = ko.observable('0px');
                //
                self.CalculateSize = function () {
                    var h = 0;
                    //
                    if (!self.ClientObjectsExpanded())
                        h = 30;
                    else if (self.FindedClientObjects().length == 0)
                        h = 80;
                    else if ((self.FindedServiceObjects().length == 0 || !self.ServiceObjectsExpanded()) && self.FindedClientObjects().length > 3)
                        h = 480;
                    else h = 345;
                    //
                    self.CalculatedClientHeight(h + 'px');
                    self.CalculatedServiceTop(h + 60 + 10 + 'px'); //строка поиска и отступ между
                };
                //
                self.ShowForm = function (obj) {
                    if (!obj || !obj.ID || !obj.ClassID)
                        return;
                    //
                    showSpinner();
                    require(['assetForms'], function (module) {
                        var fh = new module.formHelper(true);
                        fh.ShowAssetForm(obj.ID, obj.ClassID);
                    });
                };
                //
                self.AfterRender = function () {
                    if (focusSearcher)
                        focusSearcher();
                };
            },

            LocationModel: function () {
                var self = this;
            },

            ParameterSelectorModel: function ($region, mainOnChangeSelected, mainCheckerAlreadySelected, showListForEmptyQuery, focusSearcher, showWrittenOff, uniqueAssetTypeToShow, NewHaspAdapterForm, ShowKE, IsConfigurationUnitAgentForm, ConfigurationUnitAgentTypeID) {
                var self = this;
                //
                self.IsHaspAdapterForm = ko.observable(false);
                if (NewHaspAdapterForm) {
                    self.IsHaspAdapterForm(NewHaspAdapterForm);
                }
                //
                self.startLoadingTable = ko.observable(false);
                self.startLoadingColumns = ko.observable(false);
                self.$region = $region;
                self.subscriptionList = [];
                //
                //
                self.dispose = function () {
                    if (self.listViewContextMenu && self.listViewContextMenu() != null)
                        self.listViewContextMenu().dispose();
                    if (self.listView != null)
                        self.listView.dispose();
                    //
                    for (var i in self.subscriptionList) {
                        self.subscriptionList[i].dispose();
                    }
                    //TODO other fields and controls
                };
                //
                {//bind contextMenu
                    self.listViewContextMenu = null;// contextMenu;
                }

                self.viewName = 'AssetSearch';
                {//events of listView
                    self.listView = null;
                    //
                    self.listViewInit = function (listView) {
                        self.listView = listView;
                        m_helpers.init(self, listView);//extend self
                        listView.load();
                        //
                        var subscription = self.listView.rowViewModel.rowChecked.subscribe(function (row) {
                            if (row.checked())
                                self.RowSelected([row]);
                            else
                                self.RowDeselected([row]);
                        });
                        //
                        self.subscriptionList.push(subscription);
                        //
                        subscription = self.listView.rowViewModel.allItemsChecked.subscribe(function (allItemsChecked) {
                            if (allItemsChecked)
                                self.RowSelected(self.listView.rowViewModel.checkedItems());

                            else
                                self.RowDeselected(self.listView.rowViewModel.rowList());
                        });
                        //
                        self.subscriptionList.push(subscription);
                    };
                    //
                    self.listViewRetrieveVirtualItems = function (startRecordIndex, countOfRecords) {
                        var retvalD = $.Deferred();
                        $.when(self.getObjectList(startRecordIndex, countOfRecords, null, true)).done(function (objectList) {
                            if (objectList) {
                                if (startRecordIndex === 0)//reloaded
                                {
                                    self.clearAllInfos();
                                }
                                else
                                    objectList.forEach(function (obj) {
                                        var id = self.getObjectID(obj);
                                        self.clearInfoByObject(id);
                                    });
                            }
                            retvalD.resolve(objectList);
                        });
                        return retvalD.promise();
                    };
                    self.listViewRowClick = function (obj) {
                        var classID = self.getObjectClassID(obj);
                        var id = self.getMainObjectID(obj);
                        //
                        var row = self.getRowByID(id);
                        if (row != null)
                            self.setRowAsLoaded(row);
                        //
                        self.showObjectForm(classID, id);
                    };

                    self.showObjectForm = function (classID, id) {
                        showSpinner();
                        require(['assetForms'], function (module) {
                            var fh = new module.formHelper(true);
                            if (classID == 5 || classID == 6 || classID == 33 || classID == 34 || classID == 415)
                                fh.ShowAssetForm(id, classID);
                            else if (classID == 115)//contract
                                fh.ShowServiceContract(id);
                            else if (classID == 386)
                                fh.ShowServiceContractAgreement(id);
                            else if (classID == 223) //software licence
                            {
                                fh.ShowSoftwareLicenceForm(id);
                            }
                            else if (classID == 409 || classID == 410 || classID == 411 || classID == 412 ||
                                classID == 413 || classID == 414 || classID == 415 || classID == 419)
                                fh.ShowConfigurationUnitForm(id);
                            else if (classID == 165)
                                fh.ShowDataEntityObjectForm(id);    
                            else if (/*classID == 415 ||*/ classID == 416 || classID == 417 || classID == 418 || classID == 12) //OBJ_LogicalObject
                                fh.ShowLogicalObjectForm(id);
                            else
                                hideSpinner();
                        });
                    };

                    self.listViewDrawCell = function (obj, column, cell) {
                    };
                    //
                    self.loadObjectListByIDs = function (idArray, unshiftMode) {
                        for (var i = 0; i < idArray.length; i++)
                            idArray[i] = idArray[i].toUpperCase();
                        //
                        var retvalD = $.Deferred();
                        if (idArray.length > 0) {
                            $.when(self.getObjectList(0, 0, idArray, false)).done(function (objectList) {
                                if (objectList) {
                                    var rows = self.appendObjectList(objectList, unshiftMode);
                                    rows.forEach(function (row) {
                                        self.setRowAsNewer(row);
                                        //
                                        var obj = row.object;
                                        var id = self.getMainObjectID(obj);
                                        self.clearInfoByObject(id);
                                        //
                                        var index = idArray.indexOf(id);
                                        if (index != -1)
                                            idArray.splice(index, 1);
                                    });
                                }
                                idArray.forEach(function (id) {
                                    self.removeRowByID(id);
                                    self.clearInfoByObject(id);
                                });
                                retvalD.resolve(objectList);
                            });
                        }
                        else
                            retvalD.resolve([]);
                        return retvalD.promise();
                    };
                    self.getObjectListByIDs = function (idArray, unshift) {
                        var retvalD = $.Deferred();
                        if (idArray.length > 0) {
                            $.when(self.getObjectList(0, 0, idArray, false)).done(function (objectList) {
                                retvalD.resolve(objectList);
                            });
                        }
                        else
                            retvalD.resolve([]);
                        return retvalD.promise();
                    };
                    //
                    self.ajaxControl = new ajaxLib.control();
                    self.isAjaxActive = function () {
                        return self.ajaxControl.IsAcitve() == true;
                    };
                    //
                    self.searchFilterData = ko.observable({ //set in ActivesLocatedLink.js
                        TypesID: [],
                        ModelsID: [],
                        LocationClassID: null,
                        LocationID: null,
                        //NumbersID: [],
                        //StatesID: [],
                        //VendorsID: [],
                    });
                    //
                    self.getObjectList = function (startRecordIndex, countOfRecords, idArray, showErrors) {
                        var retvalD = $.Deferred();
                        //
                        var curFilterID = null;
                        var withFinishedWf = false;
                        var afterDayModMS = null;
                        var treeParams = null;
                        //
                        var requestInfo = {
                            StartRecordIndex: idArray ? 0 : startRecordIndex,
                            CountRecords: idArray ? idArray.length : countOfRecords,
                            IDList: idArray ? idArray : [],
                            ViewName: self.viewName,
                            TimezoneOffsetInMinutes: new Date().getTimezoneOffset(),
                            CurrentFilterID: curFilterID,
                            WithFinishedWorkflow: withFinishedWf,
                            AfterModifiedMilliseconds: afterDayModMS,
                            TreeSettings: treeParams,
                            SearchRequest: self.searchPhraseObservable ? self.searchPhraseObservable() : null,
                            TypeID: self.searchFilterData && self.searchFilterData() ? self.searchFilterData().TypeID : null,
                            TypesID: self.searchFilterData && self.searchFilterData() ? self.searchFilterData().TypesID : null,
                            ModelsID: self.searchFilterData && self.searchFilterData() ? self.searchFilterData().ModelsID : null,
                            //NumbersID: self.searchFilterData && self.searchFilterData() ? self.searchFilterData().NumbersID : null,
                            //StatesID: self.searchFilterData && self.searchFilterData() ? self.searchFilterData().StatesID : null,
                            //VendorsID: self.searchFilterData && self.searchFilterData() ? self.searchFilterData().VendorsID : null,

                            LocationID: self.searchFilterData && self.searchFilterData() ? self.searchFilterData().LocationID : null,
                            LocationClassID: self.searchFilterData && self.searchFilterData() ? self.searchFilterData().LocationClassID : null,
                            //ParentObjectID: bindedObjectID,
                            ShowListForEmptyQuery: showListForEmptyQuery,
                            ShowWrittenOff: showWrittenOff === false ? false : true,
                            //
                            OrgStructureObjectID: self.searchFilterData && self.searchFilterData() ? self.searchFilterData().OrgStructureObjectID : null,
                            OrgStructureObjectClassID: self.searchFilterData && self.searchFilterData() ? self.searchFilterData().OrgStructureObjectClassID : null,
                            OrgStructureFilterType: self.OrgStructureFilterType && self.OrgStructureFilterType() ? self.OrgStructureFilterType().ID : null,

                            IsHaspAdapterForm: self.IsHaspAdapterForm() ? true : false,
                            ProductCatalogTemplateID: uniqueAssetTypeToShow ? uniqueAssetTypeToShow : null,
                            IsKEShow: ShowKE ? ShowKE : false,
                            IsConfigurationUnitAgentForm: IsConfigurationUnitAgentForm ? IsConfigurationUnitAgentForm : false,
                            ConfigurationUnitAgentTypeID: ConfigurationUnitAgentTypeID
                        };
                        //

                        self.ajaxControl.Ajax(null,
                            {
                                dataType: "json",
                                method: 'POST',
                                data: requestInfo,
                                url: 'assetApi/GetAssetSearchObject'
                            },
                            function (newVal) {
                                if (newVal && newVal.Result === 0) {
                                    retvalD.resolve(newVal.Data);//can be null, if server canceled request, because it has a new request                               
                                    return;
                                }
                                else if (newVal && newVal.Result === 1 && showErrors === true) {
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[AssetForms/AssetLink/AssetLink.js getObjectList]', 'error');
                                    });
                                }
                                else if (newVal && newVal.Result === 2 && showErrors === true) {
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('BadParamsError') + '\n[AssetForms/AssetLink/AssetLink.js getObjectList]', 'error');
                                    });
                                }
                                else if (newVal && newVal.Result === 3 && showErrors === true) {
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('AccessError_Table'));
                                    });
                                }
                                else if (newVal && newVal.Result === 7 && showErrors === true) {
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('OperationError_Table'));
                                    });
                                }
                                else if (newVal && newVal.Result === 9 && showErrors === true) {
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('FiltrationError'), 'error');
                                    });
                                }
                                else if (newVal && newVal.Result === 11 && showErrors === true) {
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('SqlTimeout'));
                                    });
                                }
                                else if (showErrors === true) {
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('AjaxError') + '\n[AssetForms/AssetLink/AssetLink.js getObjectList]', 'error');
                                    });
                                }
                                //
                                retvalD.resolve([]);
                            },
                            function (XMLHttpRequest, textStatus, errorThrown) {
                                if (showErrors === true)
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('AjaxError') + '\n[AssetForms/AssetLink/AssetLink.js getObjectList]', 'error');
                                    });
                                //
                                retvalD.resolve([]);
                            },
                            null
                        );
                        //
                        return retvalD.promise();
                    };
                }
                //
                {//identification
                    self.getObjectID = function (obj) {
                        return obj.ID.toUpperCase();
                    };
                    self.getObjectClassID = function (obj) {
                        return obj.ClassID;
                    };
                    self.getMainObjectID = function (obj) {
                        return obj.ID.toUpperCase();
                    };
                    self.isObjectClassVisible = function (objectClassID) {
                        if (
                            //obj_networkDevice
                            objectClassID == 5

                            //obj_terminalDevice
                            || objectClassID == 6

                            //obj_adapter
                            || objectClassID == 33

                            //obj_peripheral
                            || objectClassID == 34

                            //obj_licence
                            || objectClassID == 223

                            //obj_material
                            || objectClassID == 120

                            //obj_serviceContract
                            || objectClassID == 115

                            //OBJ_LogicalObject
                            ||classID == 415 || classID == 416 || classID == 417 || classID == 418 || classID == 12) 
                            return true;
                    };
                }
                //
                self.SizeChanged = function () {
                    var $regionTable = self.$region.find('.asset-link_tableColumn');
                    var tableHeightWithoutHeader = $regionTable.height() - $regionTable.find(".tableHeader").outerHeight();
                    $regionTable.find(".region-Table").css("height", $regionTable.height() + "px");//для скрола на таблице (без шапки)
                    if (self.listView)
                        self.listView.renderTable();
                };
                //
                self.ajaxControl_load = new ajaxLib.control();
                self.RowSelected = function (rowArray) {
                    if (rowArray && rowArray.length > 0) {
                        $.when(userD).done(function (user) {
                            var idList = [];
                            ko.utils.arrayForEach(rowArray, function (el) {
                                idList.push(el.object ? el.object.ID : el.ID);
                            });
                            //
                            var param = {
                                AssetIDList: idList,
                                ShowKE: ShowKE,
                                IsConfigurationUnitAgentForm: IsConfigurationUnitAgentForm ? true : false,
                            };
                            self.ajaxControl_load.Ajax($region,
                                {
                                    dataType: "json",
                                    url: 'imApi/GetSearchedObjectByID',
                                    method: 'POST',
                                    data: param,
                                },
                                function (response) {
                                    if (response) {
                                        if (response.Result === 0) {
                                            if (response.AssetLinkList && response.AssetLinkList.length > 0) {
                                                ko.utils.arrayForEach(response.AssetLinkList, function (el) {
                                                    var obj = new module.ListAssetObject(el, mainOnChangeSelected, mainCheckerAlreadySelected);
                                                    obj.Selected(true);
                                                });
                                            }
                                        }
                                        else if (response.Result == 1)
                                            require(['sweetAlert'], function () {
                                                swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + ' ' + '\n[AssetLink.js, RowSelected]', 'error');
                                            });
                                        else require(['sweetAlert'], function () {
                                            swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + ' ' + '\n[AssetLink.js, RowSelected]', 'error');
                                        });
                                    }
                                    else require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + ' ' + '\n[AssetLink.js, RowSelected]', 'error');
                                    });

                                });
                        });
                    }
                };

                self.RowDeselected = function (rowArray) {
                    if (rowArray && rowArray.length > 0) {
                        $.when(userD).done(function (user) {
                            var idList = [];
                            ko.utils.arrayForEach(rowArray, function (el) {
                                idList.push(el.object ? el.object.ID : el.ID);
                            });
                            //
                            var param = {
                                AssetIDList: idList,
                                ShowKE: ShowKE,
                                IsConfigurationUnitAgentForm: IsConfigurationUnitAgentForm ? true : false,
                            };
                            self.ajaxControl_load.Ajax($region,
                                {
                                    dataType: "json",
                                    url: 'imApi/GetSearchedObjectByID',
                                    method: 'POST',
                                    data: param,
                                },
                                function (response) {
                                    if (response) {
                                        if (response.Result === 0) {
                                            if (response.AssetLinkList && response.AssetLinkList.length > 0) {
                                                ko.utils.arrayForEach(response.AssetLinkList, function (el) {
                                                    var obj = new module.ListAssetObject(el, mainOnChangeSelected, mainCheckerAlreadySelected);
                                                    mainOnChangeSelected(obj, false);
                                                });
                                            }
                                        }
                                        else if (response.Result == 1)
                                            require(['sweetAlert'], function () {
                                                swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + ' ' + '\n[AssetLink.js, RowDeselected]', 'error');
                                            });
                                        else require(['sweetAlert'], function () {
                                            swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + ' ' + '\n[AssetLink.js, RowDeselected]', 'error');
                                        });
                                    }
                                    else require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + ' ' + '\n[AssetLink.js, RowDeselected]', 'error');
                                    });

                                });
                        });
                    }
                };
                self.CheckAndSetSelectedState = function (id, newState) {
                    if (!self.startLoadingTable())
                        return;
                    //
                    id = id.toUpperCase();
                    var row = self.tableModel.rowHashList[id];
                    //
                    if (!row)
                        row = ko.utils.arrayFirst(self.tableModel.rowList(), function (el) {
                            return el.ID.toUpperCase() == id;
                        });
                    //
                    if (row && row.Checked() !== newState)
                        row.Checked(newState);
                };
                //
                self.ajaxControl_loadTypes = new ajaxLib.control();
                self.controlTypeSelector = null;
                self.typeControl = null;
                self.InitializeTypeSelector = function () {

                    var retD = $.Deferred();
                    var $regionType = self.$region.find('.asset-link_paramsColumnType');
                    //
                    if (!self.typeControl) {

                        self.typeControl = new treeLib.control();
                        self.typeControl.init($regionType, 2, {
                            onClick: self.OnTypeSelected,
                            HasLifeCycle: false,//дефект 5792
                            UseAccessIsGranted: true,
                            ShowCheckboxes: false,
                            AvailableClassArray: [29, 374, 378, 93 ,94 ,95 ,96],
                            ClickableClassArray: [378, 93, 94, 95, 96],
                            AllClickable: false,
                            RemovedCategoryClassArray:
                                ['115',//Сервисные контракты
                                '120'],//Расходный материал
                            UseRemoveCategoryClass: true,
                            FinishClassArray: [93, 94, 95, 96],
                            Title: getTextResource('ProductCatalogueTreeCaption'),
                            WindowModeEnable: false
                        });
                    }
                    //
                    $.when(self.typeControl.$isLoaded).done(function () {
                        retD.resolve();
                    });
                    //
                    return retD.promise();

                };

                self.SelectedType = ko.observable(null);
                self.IsTypeSelected = ko.computed(function () {
                    return self.SelectedType() != null;
                });
                //
                self.visibleInfo = function () {
                    return self.IsTypeSelected() && self.IsModelSelected();
                };
                self.visibleModelInfo = function () {
                    return self.SelectedTextModel() != null;
                };
                self.visibleLocation = function () {
                    return self.SelectedTextLocation() != null;
                };
                self.visibleOrgStructure = function () {
                    return self.SelectedTextOrgStructure() != null;
                };
                //
                self.SelectedModels = ko.observableArray(null);
                self.SelectedModel = ko.observable(null);
                self.IsModelSelected = ko.computed(function () {
                    return (self.SelectedModel() != null || self.SelectedModels() != null)
                });
                //
                self.OnTypeSelected = function (element) {
                    if (!element) {
                        self.SelectedType(null);
                        self.SelectedModel(null);
                        self.SelectedModels(null);
                        self.ImplementFilter();
                        return false;
                    }
                    //
                    if (self.typeControl)
                        self.typeControl.DeselectNode();
                    //
                    if (element.ClassID == 378) {
                        self.SelectedType(element);
                        self.SelectedTextType(element.Name);
                        self.SelectedTextModel(null);
                        $.when(self.ModelsSelectByType()).done(function () {
                            self.ImplementFilter();
                            self.typeControl.CollapseExpandHeader();
                            return true;
                     });
                    }
                    else {
                        var parentNode = self.typeControl.findNodeWithParent(null, element.ID, element.ClassID).parent;
                        self.SelectedType(parentNode);
                        self.SelectedTextType(parentNode.Name);
                        self.SelectedModel(element);
                        self.SelectedTextModel(element.Name);
                        self.SelectedModels(null);
                        self.ImplementFilter();
                        self.typeControl.CollapseExpandHeader();
                        return true;
                    }
                };
                //
                    self.EraseSelectedTypeClick = function () {
                        self.OnTypeSelected();
                    };
                self.EraseSelectedModelClick = function (node) {
                    if (self.SelectedModels() != null) {
                        self.SelectedModels.remove(function (tree) {
                            return tree.ID == node.ID;
                        });
                        if (self.SelectedModels().length==0) {
                            self.OnTypeSelected();
                        }
                    }
                    else {
                        self.SelectedModel(null);
                        self.OnTypeSelected();
                    }
                    self.ImplementFilter();
                }
                //
                self.SelectedTextType = ko.observable(null);
                self.SelectedTextModel = ko.observable(null);
                self.SelectedTextOrgStructure = ko.observable(null);
                
                //
                self.ajaxControl_loadModels = new ajaxLib.control();
               
                    self.ModelsSelectByType = function () {
                    var retD = $.Deferred();
                    if (!self.IsTypeSelected()) {
                        retD.resolve();
                        return retD;
                    }
                    //
                    var deffered = $.Deferred();
                    var $regionModel = self.$region.find('.asset-link_paramsColumnModel');
                    //
                    var typeIDs = [];
                    typeIDs.push(self.SelectedType().ID);
                    var param = {
                        Types: typeIDs,
                    };
                    self.ajaxControl_loadModels.Ajax($regionModel,
                        {
                            dataType: "json",
                            method: 'POST',
                            url: 'imApi/GetAssetLinkModelsForTypes',
                            data: param
                        },
                        function (newData) {
                            if (newData != null && newData.Result === 0 && newData.List) {
                                var retval = [];
                                //
                                newData.List.forEach(function (el) {

                                    retval.push(el);
                                });
                                self.SelectedModel(null);
                                self.SelectedModels(retval);
                                //
                                deffered.resolve(retval);
                            }
                            else deffered.resolve();
                            //
                                retD.resolve();
                            //
                        });
                    //
                    return retD.promise();
                };
                //
                //
                self.OrgStructureObjectID = ko.observable();
                self.OrgStructureObjectClassID = ko.observable();
                self.OrgStructureObjectName = ko.observable('');
                self.SelectedInMode = ko.observable();
                //
                self.OrgStructureFilterType = ko.observable();
                self.ProductCatalogTemplateID = null;
                self.DDList = [];
                self.getOrgDDList = function (options) {
                    var data = self.DDList;
                    options.callback({ data: data, total: data.length });
                };
                //
                self.OnSelectOrgStructure = function (node) {
                    if (!node || node.ClassID == 29) {
                        if (self.OrgStructureObjectID() && self.OrgStructureObjectClassID())
                            self.ResetTreeSettingsClick();
                        //
                        return false;
                    }
                    //
                    self.OrgStructureObjectClassID(node.ClassID);
                    self.OrgStructureObjectID(node.ID);
                    self.OrgStructureObjectName(node.Name);
                    self.MakeTextLocation(node, self.SelectedTextOrgStructure);
                    //
                    if (self.locationControl)
                        self.locationControl.DeselectNode();
                    //
                    self.ImplementFilter();

                    self.orgStructureControl().CollapseExpandHeader();
                    //
                    return true;
                };
                //
                self.EraseSelectedOrgStructureClick = function () {
                    self.OnSelectOrgStructure();
                }
                //
                self.UpdateOrgStructureParams = function (ddNewValue, saveEnabled) {
                    if (!ddNewValue || !self.orgStructureControl())
                        return;
                    //
                    if (ddNewValue.ID == module.Owner.ID)//исключительный случай - даем выбирать только организации
                    {
                        if (self.OrgStructureObjectClassID() && self.OrgStructureObjectClassID() != 101) {//надо сбросить
                            require(['sweetAlert'], function () {
                                swal(getTextResource('FilterTreeOwnerInvalidHeader'), getTextResource('FilterTreeOwnerInvalidText'), 'warning');
                            });
                            self.ResetTreeSettingsClick();
                            saveEnabled = false;
                        }
                        //
                        self.orgStructureControl().ClickableClassArray([29, 101]);
                        if (saveEnabled)
                            self.ImplementFilter();
                    }
                    else {
                        self.orgStructureControl().ClickableClassArray([29, 101, 102, 9]);
                        if (saveEnabled)
                            self.ImplementFilter();
                    }
                };
                //
                self.ResetTreeSettingsClick = function () {
                    self.OrgStructureObjectClassID(null);
                    self.OrgStructureObjectID(null);
                    self.OrgStructureObjectName('');
                    self.SelectedTextOrgStructure(null);
                    //
                    if (self.orgStructureControl())
                        self.orgStructureControl().DeselectNode();
                    //
                    self.ImplementFilter();
                };
                //
                self.orgStructureControl = ko.observable(null);
                self.InitOrgStructureTree = function () {
                    self.orgStructureControl(new treeLib.control());
                    self.orgStructureControl().init($('#regionOrgStructureAssetSearch .regionFilterTree-orgstructure-tree'), 0, {
                        onClick: self.OnSelectOrgStructure,
                        ShowCheckboxes: false,
                        AvailableClassArray: [29, 101, 102, 9],
                        ClickableClassArray: [29, 101, 102, 9],
                        AllClickable: false,
                        FinishClassArray: [9],
                    });
                    //
                    $.when(self.orgStructureControl().$isLoaded).done(function () {
                        if (self.OrgStructureObjectID())
                            $.when(self.orgStructureControl().OpenToNode(self.OrgStructureObjectID(), self.OrgStructureObjectClassID())).done(function (finalNode) {
                                if (finalNode && finalNode.ID == self.OrgStructureObjectID())
                                    self.orgStructureControl().SelectNode(finalNode);
                                //
                                self.UpdateOrgStructureParams(self.OrgStructureFilterType(), false);
                            });
                        else self.UpdateOrgStructureParams(self.OrgStructureFilterType(), false);
                    });
                };
                //
                self.locationControl = null;
                self.InitLocationTree = function () {
                    var retD = $.Deferred();
                    var $regionLocation = self.$region.find('.asset-link_paramsColumnLocation');
                    //
                    if (!self.locationControl) {

                        self.locationControl = new treeLib.control();
                        self.locationControl.init($regionLocation, 1, {
                            onClick: self.OnSelectLocation,
                            UseAccessIsGranted: true,
                            ShowCheckboxes: false,
                            AvailableClassArray: [29, 101, 1, 2, 3, 4, 22],
                            ClickableClassArray: [29, 101, 1, 2, 3, 4, 22],
                            AllClickable: false,
                            FinishClassArray: [4, 22],
                            Title: getTextResource('LocationCaption'),
                            WindowModeEnabled: true
                        });
                    }
                    //
                    $.when(self.locationControl.$isLoaded).done(function () {
                        retD.resolve();
                    });
                    //
                    return retD.promise();
                };
                self.SelectedLocation = ko.observable(null);
                self.LocationSelected = ko.computed(function () {
                    return self.SelectedLocation() == null;
                });
                self.OnSelectLocation = function (node) {
                    if (!node || node.ClassID == 29) {
                        self.SelectedLocation(null);
                        self.SelectedTextLocation(null);
                        if (self.locationControl){
                            self.locationControl.DeselectNode();
                        };
                        if (node && node.ClassID == 29) 
                        self.locationControl.CollapseExpandHeader();
                        self.ImplementFilter();
                        //
                        return false;
                    }
                    //
                    self.SelectedLocation(node);
                    self.MakeTextLocation(node, self.SelectedTextLocation);
                    self.locationControl.CollapseExpandHeader();
                    self.ImplementFilter();
                    //
                    return true;
                };
                    self.SelectedTextLocation = ko.observable(null);
                self.MakeTextLocation = function (node, textChanged) {
                    switch (node.ClassID) {
                        case 29:
                            var text = node.Name;
                            textChanged(text);
                            return true;
                            break;
                        case 101:
                            var text = getTextResource('Organization_Name') + ': ' + node.Name;
                            textChanged(text);
                            return true;
                            break;
                        case 102:
                            var text = getTextResource('OrgStructureLevel_Subdivision') + ': ' + node.Name;
                            textChanged(text);
                            return true;
                            break;
                        case 1:
                            var text = getTextResource('AssetNumber_BuildingName') + ': ' + node.Name;
                            textChanged(text);
                            return true;
                            break;
                        case 2:
                            var text = getTextResource('AssetNumber_FloorName') + ': ' + node.Name;
                            textChanged(text);
                            return true;
                            break;
                        case 3:
                            var text = getTextResource('AssetNumber_RoomName') + ': ' + node.Name;
                            textChanged(text);
                            return true;
                            break;
                        case 22:
                            var text = getTextResource('AssetNumber_WorkplaceName') + ': ' + node.Name;
                            textChanged(text);
                            return true;
                            break;
                        case 4:
                            var text = getTextResource('AssetNumber_RackName') + ': ' + node.Name;
                            textChanged(text);
                            return true;
                            break;
                        case 9:
                            var text = getTextResource('User') + ': ' + node.Name;
                            textChanged(text);
                            return true;
                            break;
                    }
                    return false;
                    };

                    self.EraseSelectedLocationClick = function (node) {
                        self.OnSelectLocation();
                    };
                //
                self.ImplementFilter = function () {
                    var returnD = $.Deferred();
                    //
                    var models = [];
                    var types = [];
                    //
                    var typeID = self.SelectedType() ? self.SelectedType().ID : null;
                    //
                    var locationClassID = self.SelectedLocation() ? self.SelectedLocation().ClassID : null;
                    var locationID = self.SelectedLocation() ? self.SelectedLocation().ID : null;
                    //
                    var orgStructureObjectID = self.OrgStructureObjectID() ? self.OrgStructureObjectID() : null;
                    var orgStructureObjectClassID = self.OrgStructureObjectClassID() ? self.OrgStructureObjectClassID() : null;
                    var orgStructureObjectName = self.OrgStructureObjectName() ? self.OrgStructureObjectName() : null;

                    if (typeID != null) {
                            types.push(typeID);
                        var currentModels = self.SelectedModel() ? models.push(self.SelectedModel().ID) : self.SelectedModels();
                        if (currentModels)
                                ko.utils.arrayForEach(currentModels, function (el) {
                                    models.push(el.ID);
                                });
                    }
                    //
                    var old = self.searchFilterData();
                    var newData = {
                        TypesID: types,
                        ModelsID: models,
                        LocationClassID: locationClassID,
                        LocationID: locationID,
                        //
                        OrgStructureObjectID: orgStructureObjectID,
                        OrgStructureObjectClassID: orgStructureObjectClassID,
                        OrgStructureObjectName: orgStructureObjectName,
                    };
                    //
                    if (self.IsFilterDataDifferent(old, newData)) {
                        self.listView.load();
                        self.searchFilterData(newData);
                        //
                        self.UpdateTableByFilter(newData);
                    }
                    else {
                        returnD.resolve();
                    }
                    //
                    return returnD;
                };
                //
                self.ReloadTable = function () {
                    self.listView.load();
                };
                //
                self.updateTableByFilterTimeout = null;
                self.UpdateTableByFilter = function (data) {
                    clearTimeout(self.updateTableByFilterTimeout);
                    self.updateTableByFilterTimeout = setTimeout(function () {
                        if (!self.IsFilterDataDifferent(self.searchFilterData(), data))
                            self.listView.load();
                    }, 500);
                };
                //
                self.IsFilterDataDifferent = function (oldData, newData) {
                    if (!oldData || !newData)
                        return false;
                    //
                    if (oldData.TypeID !== newData.TypeID)
                        return true;
                    //
                    if (arr_diff(oldData.TypesID, newData.TypesID).length != 0)
                        return true;
                    //
                    if (arr_diff(oldData.ModelsID, newData.ModelsID).length != 0)
                        return true;
                    //
                    //if (arr_diff(oldData.VendorsID, newData.VendorsID).length != 0)
                    //    return true;
                    //
                    if (oldData.LocationID !== newData.LocationID)
                        return true;
                    //
                    if (oldData.OrgStructureObjectID !== newData.OrgStructureObjectID)
                        return true;
                    //
                    return false;
                };
                var arr_diff = function (a1, a2) {
                    var a = [], diff = [];
                    for (var i = 0; i < a1.length; i++) {
                        a[a1[i]] = true;
                    }
                    //
                    for (var i = 0; i < a2.length; i++) {
                        if (a[a2[i]]) {
                            delete a[a2[i]];
                        } else {
                            a[a2[i]] = true;
                        }
                    }
                    //
                    for (var k in a) {
                        diff.push(k);
                    }
                    //
                    return diff;
                };
                //
                self.SearchText = ko.observable('');
                self.SearchText.subscribe(function (newValue) {
                    self.WaitAndSearch(newValue);
                });
                self.IsSearchTextEmpty = ko.computed(function () {
                    var text = self.SearchText();
                    if (!text)
                        return true;
                    //
                    return false;
                });
                //
                self.ClearSearchTextAndFilters = function () {
                    self.SearchText('');
                    //
                    self.OnTypeSelected();
                    self.typeControl.UncheckAllNodes();
                    self.SelectedLocation(null);
                    //
                    // 
                    self.ImplementFilter();
                    self.locationControl.DeselectNode();
                    self.typeControl.DeselectNode();
                };
                //
                self.SearchKeyPressed = function (data, event) {
                    if (event.keyCode == 13) {
                        if (!self.IsSearchTextEmpty())
                            self.Search();
                    }
                    else
                        return true;
                };
                self.EraseTextClick = function () {
                    self.SearchText('');
                };
                //
                self.searchTimeout = null;
                self.WaitAndSearch = function (text) {
                    clearTimeout(self.searchTimeout);
                    self.searchTimeout = setTimeout(function () {
                        if (text == self.SearchText())
                            self.Search();
                    }, 500);
                };
                //
                self.ajaxControl_search = new ajaxLib.control();
                self.searchPhraseObservable = ko.observable('');//set in ActivesLocatedLink.js
                self.Search = function () {
                    self.searchPhraseObservable(self.SearchText());
                    self.listView.load();
                };
                //
                self.AfterRender = function () {
                    //self.InitializeTable();
                    self.InitializeTypeSelector();
                    self.InitLocationTree();
                    //
                    self.InitOrgStructureTree();
                    //
                    self.ajaxControl_load.Ajax(null,
                        {
                            dataType: "json",
                            method: 'GET',
                            url: 'imApi/GetOrgstructureFields'
                        },
                        function (newVal) {
                            if (newVal && newVal.Result === 0 && newVal.UserList) {
                                self.DDList = newVal.UserList;
                                //
                                selected = self.DDList[0];
                                self.OrgStructureFilterType(selected);
                                //
                                self.OrgStructureFilterType.subscribe(function (newValue) {
                                    self.UpdateOrgStructureParams(newValue, true);
                                });
                                //
                                self.ReloadTable();
                            }
                            else if (newVal && newVal.Result === 1)
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[FiltrationBlock.js, AfterRender]', 'error');
                                });
                            else
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[FiltrationBlock.js, AfterRender]', 'error');
                                });
                        });
                    //
                    if (focusSearcher)
                        focusSearcher();
                };
                //
                m_lazyEvents.init(self);//extend self
            },

            ChoosenModel: function (observableList) {
                var self = this;
                //
                self.ChoosenObjectsList = observableList;
                self.ShowForm = function (obj) {
                    if (!obj || !obj.ID || !obj.ClassID)
                        return;
                    //
                    showSpinner();
                    require(['assetForms'], function (module) {
                        var fh = new module.formHelper(true);
                        if (obj.ClassID == 5 || obj.ClassID == 6 || obj.ClassID == 33 || obj.ClassID == 34)
                            fh.ShowAssetForm(obj.ID, obj.ClassID);
                        else if (obj.ClassID == 115)
                            fh.ShowServiceContract(obj.ID);
                        else if (obj.ClassID == 386)
                            fh.ShowServiceContractAgreement(obj.ID);
                        else if (obj.ClassID == 223)
                            fh.ShowSoftwareLicenceForm(obj.ID);    
                    });
                };
            },

            ListAssetObject: function (obj, onSelectedChange, mainCheckerAlreadySelected) {
                var self = this;
                //
                self.ID = obj.ID;
                self.Name = obj.Name;
                self.State = obj.State;
                //
                self.Type = obj.Type;
                self.Model = obj.Model;
                self.ClassID = obj.ClassID;
                //
                self.Building = obj.Building;
                self.Floor = obj.Floor;
                self.Room = obj.Room;
                self.Rack = obj.Rack;
                self.Workplace = obj.Workplace;
                self.Organization = obj.Organization;
                //
                self.Selected = ko.observable(mainCheckerAlreadySelected ? mainCheckerAlreadySelected(self.ID) : false);
                self.Selected.subscribe(function (newValue) {
                    if (onSelectedChange)
                        onSelectedChange(self, newValue);
                });
                self.CssIconClass = ko.computed(function () {
                    return ihLib.getIconByClassID(self.ClassID);
                });
            }
        }
        return module;
    });
