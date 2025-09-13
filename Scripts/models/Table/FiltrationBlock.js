define(['knockout', 'jquery', 'ttControl', 'ajax', 'treeControl', 'models/Filter/Filters', 'models/Filter/FiltersCommonTasks', 'usualForms'], function (ko, $, tclib, ajaxLib, treeLib, fvm, cfvm, fhModule) {
    var module = {
        MOL: { ID: 'MOL', Name: getTextResource('AssetNumber_UserName') },
        Owner: { ID: 'Owner', Name: getTextResource('AssetNumber_OwnerName') },
        Utilizer: { ID: 'Utilizer', Name: getTextResource('AssetNumber_UtilizerName') },
        ViewModel: function (tableModel, filterD) {//table + deffered for filter loading
            var self = this;
            //

            self.modes = {
                orgStructure: 'orgStructure',
                location: 'location',
                productCatalogue: 'productCatalogue',
                filters: 'filters',
                softCatalogue: 'softCatalogue',
                commonFilters: 'commonFilters'
            };
            //
            self.locationControl = null;
            self.productCatalogueControl = null;
            self.orgStructureControl = null;
            self.softCatalogueControl = null;
            self.tableModel = tableModel;
            self.filtersModel = null;
            self.topButtonsModel = null;
            self.currentFilterModel = null;
            self.filterContractsFields = null;
            self.filterDefaultFields = null;
            self.filterLicensFields = null;
            self.filterAssetFields = null;
            self.currentAssetField = ko.observable(null);
            //
            self.filterDiscardedFields = null;
            self.filterUtilizerCompleteFields = null;
            self.filterAssetRepairFields = null;
            //
            self.startLoadingFilters = ko.observable(false);
            self.filterActiveVisible = ko.observable(true);
            //
            self.filterLocationVisible = ko.observable(false);
            self.filterLocationVisible.subscribe(function (newValue) {
                if (newValue == false && self.activeMode() == self.modes.location)
                    self.activeMode(null);
            });
            self.filterOrgstructureVisible = ko.observable(false);
            self.filterOrgstructureVisible.subscribe(function (newValue) {
                if (newValue == false && self.activeMode() == self.modes.orgStructure)
                    self.activeMode(null);
            });
            self.filterProductCatalogueVisible = ko.observable(false);
            self.filterProductCatalogueVisible.subscribe(function (newValue) {
                if (newValue == false && self.activeMode() == self.modes.productCatalogue)
                    self.activeMode(null);
            });
            self.filterSoftCatalogueVisible = ko.observable(false);
            self.filterSoftCatalogueVisible.subscribe(function (newValue) {
                if (newValue == false && self.activeMode() == self.modes.softCatalogue)
                    self.activeMode(null);
            });
            //
            self.filterCommonFiltersVisible = ko.observable(false);
            self.filterCommonFiltersVisible.subscribe(function (newValue) {
                if (newValue == false && self.activeMode() == self.modes.commonFilters)
                    self.activeMode(null);
            });            
            //
            self.activeMode = ko.observable();
            self.activeMode.subscribe(function (newValue) {
                if (newValue == null) {
                    self.HideFiltrationPanel();
                    return;
                }
                else self.ShowFiltrationPanel();
                //
                if (newValue == self.modes.location && self.locationControl == null)
                    self.InitLocationTree();
                else if (newValue == self.modes.orgStructure && self.orgStructureControl == null)
                    self.InitOrgStructureTree();
                else if (newValue == self.modes.productCatalogue) {
                    if (self.productCatalogueControl != null) {
                        self.productCatalogueControl.ClearTreeControl();
                    }
                    self.InitProductCatalogueTree();
                }
                else if (newValue == self.modes.softCatalogue && self.softCatalogueControl == null)
                    self.InitSoftCatalogueTree();
            });
            //
            self.SelectedObjectID = ko.observable();
            self.SelectedObjectClassID = ko.observable();
            self.SelectedObjectName = ko.observable('');
            self.SelectedInMode = ko.observable();
            //
            self.SelectedField = ko.observable();
            //
            self.DDList = ko.observableArray([]);
            //
            self.SelectedInModeConverted = ko.computed(function () {
                switch(self.SelectedInMode())
                {
                    case self.modes.orgStructure:
                        return 0;
                    case self.modes.location:
                        return 1;
                    case self.modes.productCatalogue:
                        return 2;
                    case self.modes.softCatalogue:
                        return 4;
                    default:
                        return 255;
                }
            });
            //
            self.IsFiltersActive = ko.computed(function () {
                return self.activeMode() == self.modes.filters;
            });           
            //
            self.IsLocationActive = ko.computed(function () {
                return self.activeMode() == self.modes.location;
            });
            self.IsOrgStructureActive = ko.computed(function () {
                return self.activeMode() == self.modes.orgStructure;
            });
            self.IsProductCatalogueActive = ko.computed(function () {
                return self.activeMode() == self.modes.productCatalogue;
            });
            self.IsSoftCatalogueActive = ko.computed(function () {
                return self.activeMode() == self.modes.softCatalogue;
            });
            self.IsFiltersActiveCommonFilters = ko.computed(function () {
                return self.activeMode() == self.modes.commonFilters;
            });
            //
            self.HideFiltrationPanel = function () {
                $('#regionFiltration').hide();
                self.ResetContextMenuPosition();
            };
            self.ShowFiltrationPanel = function () {
                $('#regionFiltration').show();
                self.ResetContextMenuPosition();
            };
            //
            self.mainSpinnerActive = 0;
            self.HideSpinnerFiltrationPanel = function () {
                if (self.mainSpinnerActive !== 0)
                {
                    hideSpinner($('#regionFilters')[0]);
                    self.mainSpinnerActive -= 1;
                }
            };
            self.ShowSpinnerFiltrationPanel = function () {
                if (self.mainSpinnerActive === 0) {
                    showSpinner($('#regionFilters')[0]);
                    self.mainSpinnerActive = 1;
                }
                else self.mainSpinnerActive += 1;
            };
            //
            self.ClickShowLocation = function () {
                if (self.activeMode() == self.modes.location)
                    self.activeMode(null);
                else if (self.filterLocationVisible())
                    self.activeMode(self.modes.location);
            };
            //
            self.ClickShowOrgStructure = function () {
                if (self.activeMode() == self.modes.orgStructure)
                    self.activeMode(null);
                else if (self.filterOrgstructureVisible())
                    self.activeMode(self.modes.orgStructure);
            };
            //
            self.ClickShowProductCatalogue = function () {
                if (self.activeMode() == self.modes.productCatalogue)
                    self.activeMode(null);
                else if (self.filterProductCatalogueVisible())
                    self.activeMode(self.modes.productCatalogue);
            };
            //
            self.ClickShowSoftCatalogue = function () {
                if (self.activeMode() == self.modes.softCatalogue)
                    self.activeMode(null);
                else if (self.filterSoftCatalogueVisible())
                    self.activeMode(self.modes.softCatalogue);
            };
            //
            self.ClickShowFilters = function () {
                if (self.activeMode() == self.modes.filters)
                    self.activeMode(null);
                else self.activeMode(self.modes.filters);
            };
            //
            self.ClickShowCommonFilters = function () {
                if (self.activeMode() == self.modes.commonFilters)
                    self.activeMode(null);
                else if (self.filterCommonFiltersVisible()) 
                    self.activeMode(self.modes.commonFilters);
            };
            //
            self.InitLocationTree = function () {
                self.locationControl = new treeLib.control();
                self.locationControl.init($('#regionLocation'), 1, {
                    onClick: self.OnSelectLocation,
                    ShowCheckboxes: false,
                    AvailableClassArray: [29, 101, 1, 2, 3, 4, 22],
                    ClickableClassArray: [29, 101, 1, 2, 3, 4, 22],
                    AllClickable: false,
                    FinishClassArray: [4, 22]
                });
                //
                $.when(self.locationControl.$isLoaded).done(function () {
                    if (self.SelectedInMode() == self.modes.location && self.SelectedObjectID())
                        $.when(self.locationControl.OpenToNode(self.SelectedObjectID(), self.SelectedObjectClassID())).done(function (finalNode) {
                            if (finalNode && finalNode.ID == self.SelectedObjectID())
                                self.locationControl.SelectNode(finalNode);
                        });
                });
            };
            self.OnSelectLocation = function (node) {
                if (node && node.ClassID == 29)
                {
                    if (self.SelectedObjectID() && self.SelectedObjectClassID())
                        self.ResetTreeSettingsClick();
                    //
                    return false;
                }
                //
                self.SelectedObjectClassID(node.ClassID);
                self.SelectedObjectID(node.ID);
                self.SelectedObjectName(node.Name);
                self.SelectedInMode(self.modes.location);
                //
                if (self.orgStructureControl)
                    self.orgStructureControl.DeselectNode();
                if (self.productCatalogueControl)
                    self.productCatalogueControl.DeselectNode();
                if (self.softCatalogueControl)
                    self.softCatalogueControl.DeselectNode();
                self.SaveTreeValue();
                //
                return true;
            };
            //
            self.InitProductCatalogueTree = function () {
                var availableClass = self.GetAvailableAssetClass();  
                self.productCatalogueControl = new treeLib.control();
                    self.productCatalogueControl.init($('#regionProductCatalogue'), 2, {
                        onClick: self.OnSelectProductCatalogue,
                        ShowCheckboxes: false,
                        AvailableClassArray: [29, 374, 378, 93, 94, 95, 96, 115, 182],
                        AvailableTemplateClassArray: availableClass,
                        ClickableClassArray: [29, 374, 378, 93, 94, 95, 96, 115, 182],
                        AllClickable: false,
                        FinishClassArray: [93, 94, 95, 96],
                        HasLifeCycle: false,
                    });
                //
                $.when(self.productCatalogueControl.$isLoaded).done(function () {
                    if (self.SelectedInMode() == self.modes.productCatalogue && self.SelectedObjectID())
                        $.when(self.productCatalogueControl.OpenToNode(self.SelectedObjectID(), self.SelectedObjectClassID())).done(function (finalNode) {
                            if (finalNode && finalNode.ID == self.SelectedObjectID())
                                self.productCatalogueControl.SelectNode(finalNode);
                        });
                });
            };
            self.GetAvailableAssetClass = function () {                
                var tmp = null;
                switch (self.currentAssetField()) {
                    case 'Contracts':
                        tmp = [115,182];
                        break;
                    case 'SoftwareLicense':
                        tmp = [223, 183, 184, 185, 186, 187];
                        break; 
                    case 'Hardware':
                        tmp = [33, 34, 5, 6];
                        break;
                    //
                    case 'Discarded':
                        tmp = [33, 34, 5, 6];
                        break;
                    case 'UtilizerComplete':
                        tmp = [33, 34, 5, 6];
                        break;
                    case 'AssetRepair':
                        tmp = [33, 34, 5, 6];
                        break;
                    case 'ConfigurationUnits':
                        tmp = [409,410,411,412,413,414,419];
                        break;
                    case 'Clusters':
                        tmp = [420, 419];
                        break;
                    case 'LogicObjects':
                        tmp = [12,416,417,418];
                        break;
                    case 'DataEntities':
                        tmp = [165];
                        break;
                    //
                    default: 
                        tmp = null;
                        break;
                }
                return tmp;
                
            };
            self.OnSelectProductCatalogue = function (node) {
                if (node && node.ClassID == 29) {
                    if (self.SelectedObjectID() && self.SelectedObjectClassID())
                        self.ResetTreeSettingsClick();
                    //
                    return false;
                }
                //
                self.SelectedObjectClassID(node.ClassID);
                self.SelectedObjectID(node.ID);
                self.SelectedObjectName(node.Name);
                self.SelectedInMode(self.modes.productCatalogue);
                //
                if (self.orgStructureControl)
                    self.orgStructureControl.DeselectNode();
                if (self.locationControl)
                    self.locationControl.DeselectNode();
                if (self.softCatalogueControl)
                    self.softCatalogueControl.DeselectNode();
                self.SaveTreeValue();
                //
                return true;
            };
            //
            self.InitSoftCatalogueTree = function () {
                self.softCatalogueControl = new treeLib.control();
                self.softCatalogueControl.init($('#regionSoftCatalogue'), 4, {
                    onClick: self.OnSelectSoftCatalogue,
                    ShowCheckboxes: false,
                    AvailableClassArray: [29, 92, 97],
                    ClickableClassArray: [29, 92, 97],
                    AllClickable: false,
                    FinishClassArray: [97],
                    HasLifeCycle: false,
                });
                //
                $.when(self.softCatalogueControl.$isLoaded).done(function () {
                    if (self.SelectedInMode() == self.modes.softCatalogue && self.SelectedObjectID())
                        $.when(self.softCatalogueControl.OpenToNode(self.SelectedObjectID(), self.SelectedObjectClassID())).done(function (finalNode) {
                            if (finalNode && finalNode.ID == self.SelectedObjectID())
                                self.softCatalogueControl.SelectNode(finalNode);
                        });
                });
            };
            self.OnSelectSoftCatalogue = function (node) {
                if (node && node.ClassID == 29) {
                    if (self.SelectedObjectID() && self.SelectedObjectClassID())
                        self.ResetTreeSettingsClick();
                    //
                    return false;
                }
                //
                self.SelectedObjectClassID(node.ClassID);
                self.SelectedObjectID(node.ID);
                self.SelectedObjectName(node.Name);
                self.SelectedInMode(self.modes.softCatalogue);
                //
                if (self.orgStructureControl)
                    self.orgStructureControl.DeselectNode();
                if (self.locationControl)
                    self.locationControl.DeselectNode();
                if (self.productCatalogueControl)
                    self.productCatalogueControl.DeselectNode();
                self.SaveTreeValue();
                //
                return true;
            };
            //
            self.OrgSearchText = ko.observable('');
            //
            self.OrgSearcher = null;
            self.initOrgSearcherControl = function () {
                var $frm = $('#regionOrgStructure');
                var searcherControlD = $.Deferred();
                //
                var fh = new fhModule.formHelper();
                var searcherLoadD = fh.SetTextSearcherToField(
                    $frm.find('.OrgStructSearcher'),
                    'OrgUserSearcher',
                    null,null,
                    function (objectInfo) {//select
                        self.OrgSearchText(objectInfo.FullName);
                        $.when(self.orgStructureControl.OpenToNode(objectInfo.ID, objectInfo.ClassID)).done(function (finalNode) {
                            if (finalNode && finalNode.ID == objectInfo.ID) {
                                self.orgStructureControl.SelectNode(finalNode);
                                self.OnSelectOrgStructure(finalNode);
                            }
                        });
                    },
                    function () {//reset
                        self.OrgSearchText('');
                    },
                    function (selectedItem) {//close
                        if (!selectedItem) {
                            self.OrgSearchText('');
                        }
                    },
                    undefined,
                    true);
                $.when(searcherLoadD, userD).done(function (ctrl, user) {
                    searcherControlD.resolve(ctrl);
                    ctrl.CurrentUserID = user.ID;
                    self.locationSearcher = ctrl;
                });
            };
            //
            self.InitOrgStructureTree = function () {
                self.orgStructureControl = new treeLib.control();
                self.orgStructureControl.init($('#regionOrgStructure .regionFilterTree-orgstructure-tree'), 0, {
                    onClick: self.OnSelectOrgStructure,
                    ShowCheckboxes: false,
                    AvailableClassArray: [29, 101, 102, 9],
                    ClickableClassArray: [29, 101, 102, 9],
                    AllClickable: false,
                    FinishClassArray: [9]
                });
                //
                $.when(self.orgStructureControl.$isLoaded).done(function () {
                    if (self.SelectedInMode() == self.modes.orgStructure && self.SelectedObjectID())
                        $.when(self.orgStructureControl.OpenToNode(self.SelectedObjectID(), self.SelectedObjectClassID())).done(function (finalNode) {
                            if (finalNode && finalNode.ID == self.SelectedObjectID())
                                self.orgStructureControl.SelectNode(finalNode);
                            //
                            self.UpdateOrgStructureParams(self.SelectedField(), false);
                        });
                    else self.UpdateOrgStructureParams(self.SelectedField(), false);
                });
            };
            //
            self.UpdateOrgStructureParams = function (ddNewValue, saveEnabled) {
                if (!ddNewValue || !self.orgStructureControl)
                    return;
                //
                if (ddNewValue.ID == module.Owner.ID)//исключительный случай - даем выбирать только организации
                {
                    if (self.SelectedInMode() == self.modes.orgStructure && self.SelectedObjectClassID() && self.SelectedObjectClassID() != 101)
                    {//надо сбросить
                        require(['sweetAlert'], function () {
                            swal(getTextResource('FilterTreeOwnerInvalidHeader'), getTextResource('FilterTreeOwnerInvalidText'), 'warning');
                        });
                        self.ResetTreeSettingsClick();
                        saveEnabled = false;
                    }
                    //
                    self.orgStructureControl.ClickableClassArray([29, 101]);
                    if (saveEnabled)
                        self.SaveTreeValue();
                }
                else
                {
                    self.orgStructureControl.ClickableClassArray([29, 101, 102, 9]);
                    if (saveEnabled)
                        self.SaveTreeValue();
                }
            };
            //
            self.OnSelectOrgStructure = function (node) {
                if (node && node.ClassID == 29) {
                    if (self.SelectedObjectID() && self.SelectedObjectClassID())
                        self.ResetTreeSettingsClick();
                    //
                    return false;
                }
                //
                self.SelectedObjectClassID(node.ClassID);
                self.SelectedObjectID(node.ID);
                self.SelectedObjectName(node.Name);
                self.SelectedInMode(self.modes.orgStructure);
                //
                if (self.locationControl)
                    self.locationControl.DeselectNode();
                if (self.productCatalogueControl)
                    self.productCatalogueControl.DeselectNode();
                if (self.softCatalogueControl)
                    self.softCatalogueControl.DeselectNode();
                self.SaveTreeValue();
                //
                return true;
            };
            //
            self.syncTimeout = null;
            self.syncD = null;
            self.ajaxControl_save = new ajaxLib.control();
            self.SaveTreeValue = function () {
                var d = self.syncD;
                if (d == null || d.state() == 'resolved') {
                    d = $.Deferred();
                    self.syncD = d;
                }
                //
                if (self.syncTimeout)
                    clearTimeout(self.syncTimeout);
                self.syncTimeout = setTimeout(function () {
                    if (d == self.syncD) {
                        $.when(self.SaveTreeValuePrivate()).done(function () {
                            d.resolve();
                        });
                    }
                }, 1000);
                //
                return d.promise();
            };
            self.SaveTreeValuePrivate = function () {
                var retD = $.Deferred();
                var region = $('.b-content-table__center');
                showSpinner(region[0]);
                //
                if (self.tableModel) {
                    self.tableModel.columnList.removeAll();
                    self.tableModel.rowList.removeAll();
                    self.tableModel.isLoading(true);
                }
                //
                showSpinner($('#regionFilters')[0]);
                self.ajaxControl_save.Ajax(null,
                    {
                        dataType: "json",
                        url: 'accountApi/SetTreeParams',
                        data:
                        {
                            FiltrationObjectID: self.SelectedObjectID(),
                            FiltrationObjectClassID: self.SelectedObjectClassID(),
                            FiltrationObjectName: self.SelectedObjectName(),
                            FiltrationTreeType: self.SelectedInModeConverted(),
                            FiltrationField: self.SelectedField() ? self.SelectedField().ID : ''
                        },
                        method: 'POST'
                    },
                    function (response) {
                        hideSpinner($('.b-content-table__center')[0]);
                        hideSpinner($('#regionFilters')[0]);
                        if (response === 0)
                        {
                            if (self.tableModel) {
                                self.tableModel.ScrollUp();
                                $.when(self.tableModel.Reload()).done(function () {
                                    self.tableModel.isLoading(false);                                    
                                    retD.resolve();
                                });
                            }
                            else retD.resolve();
                        }
                        else
                        {
                            require(['sweetAlert'], function () {
                                swal(getTextResource('FilterImplementError'), getTextResource('AjaxError') + '\n[FiltrationBlock.js, SaveTreeValue]', 'error');
                            });
                            retD.resolve();
                        }
                    });
                //
                return retD.promise();
            };
            self.ResetTreeSettingsClick = function () {
                var retD = $.Deferred();
                var region = $('.b-content-table__center');
                showSpinner(region[0]);
                //
                if (self.tableModel) {
                    self.tableModel.columnList.removeAll();
                    self.tableModel.rowList.removeAll();
                    self.tableModel.isLoading(true);
                }
                //
                showSpinner($('#regionFilters')[0]);
                self.ajaxControl_save.Ajax(null,
                    {
                        dataType: "json",
                        url: 'accountApi/ResetTreeParams',
                        method: 'POST'
                    },
                    function (response) {
                        hideSpinner($('.b-content-table__center')[0]);
                        hideSpinner($('#regionFilters')[0]);
                        if (response === 0) {
                            self.SelectedObjectClassID(null);
                            self.SelectedObjectID(null);
                            self.SelectedObjectName('');
                            //
                            if (self.locationControl)
                                self.locationControl.DeselectNode();
                            if (self.orgStructureControl)
                                self.orgStructureControl.DeselectNode();
                            if (self.productCatalogueControl)
                                self.productCatalogueControl.DeselectNode();
                            if (self.softCatalogueControl)
                                self.softCatalogueControl.DeselectNode();
                            //
                            if (self.tableModel) {
                                self.tableModel.ScrollUp();
                                $.when(self.tableModel.Reload()).done(function () {
                                    self.tableModel.isLoading(false);                                    
                                    retD.resolve();
                                });
                            }
                            else retD.resolve();
                        }
                        else {
                            require(['sweetAlert'], function () {
                                swal(getTextResource('FilterImplementError'), getTextResource('AjaxError') + '\n[FiltrationBlock.js, ResetTreeSettingsClick]', 'error');
                            });
                            retD.resolve();
                        }
                    });
                //
                return retD.promise();
            };
            //
            self.minWidth = 400;
            self.maxWidth = 1000;
            self.Width = ko.observable(500);
            self.ResizeFunction = function (newWidth) {
                if (newWidth && newWidth >= self.minWidth && newWidth <= self.maxWidth) {
                    self.Width(newWidth);
                    self.ResetContextMenuPosition();
                }
            };
            //
            self.ResetContextMenuPosition = function () {
                var width = $('.b-content-table__center').outerWidth();
                $('.contextMenu-inner').css('left', width + 635 + 'px');
                $('#createSdObjectInner').css('left', width + 260 + 'px');
                $('.contextMenu-inner-asset').css('left', width + 470 + 'px');
            };
            //
            self.ajaxControl_load = new ajaxLib.control();
            function initToolbar (){
                self.topButtonsModel = new module.ViewModelTopButtons(self);
                ko.applyBindings(self.topButtonsModel, document.getElementById('regionFiltersButtons'));
                //
                self.currentFilterModel = new module.ViewModelCurrentFilter(self);
                ko.applyBindings(self.currentFilterModel, document.getElementById('regionToolbarFilters'));
            }
            self.startLoading = function () {
                //
                $.when(self.topButtonsModel.$isLoaded, self.currentFilterModel.$isLoaded).done(function () {
                    var mod = new fvm.ViewModel();
                    if (self.tableModel && self.tableModel.selectedItemsTemplate)
                    {
                        var path = self.tableModel.selectedItemsTemplate;//hack
                        if (path.indexOf('SD') != -1)
                        {
                            mod = new cfvm.ViewModel();
                            self.filterActiveVisible(false);
                            self.filterCommonFiltersVisible(true);
                        }
                    }
                    //
                    mod.tableModel = self.tableModel;
                    self.filtersModel = mod;
                    self.tableModel.filtersBlockModel = self;
                    //
                    self.startLoadingFilters(true);
                    var loadD = mod.Load();
                    $.when(loadD).done(function () {
                        hideSpinner($('#filterButtonID')[0]);
                        filterD.resolve(mod);
                    });
                });
                //
                $.when(userD).done(function (user) {
                    self.currentAssetField(user.ViewNameAsset);
                    self.ChangeAssetMonitor(user, user.ViewNameAsset);
                    self.SelectedObjectClassID(user.AssetFiltrationObjectClassID);
                    self.SelectedObjectID(user.AssetFiltrationObjectID);
                    self.SelectedObjectName(user.AssetFiltrationObjectName);
                    //
                    if (user.AssetFiltrationTreeType == 0)//BLL.Navigator.NavigatorTypes.OrgStructure
                        self.SelectedInMode(self.modes.orgStructure);
                    else if (user.AssetFiltrationTreeType == 1)//BLL.Navigator.NavigatorTypes.Location
                        self.SelectedInMode(self.modes.location);
                    else if (user.AssetFiltrationTreeType == 2)//BLL.Navigator.NavigatorTypes.ProductCatalogue
                        self.SelectedInMode(self.modes.productCatalogue);
                    else if (user.AssetFiltrationTreeType == 4)//BLL.Navigator.NavigatorTypes.SoftCatalogue
                        self.SelectedInMode(self.modes.softCatalogue);
                    else
                        self.SelectedInMode(self.modes.productCatalogue);
                    //
                    self.ajaxControl_load.Ajax(null,
                        {
                            dataType: "json",
                            method: 'GET',
                            url: 'imApi/GetOrgstructureFields'
                        },
                        function (newVal) {
                            if (newVal && newVal.Result === 0 && newVal.UserList) {
                                self.DDList(newVal.UserList);
                                //
                                var selected = ko.utils.arrayFirst(self.DDList(), function (item) { return item.ID == user.AssetFiltrationField; });
                                if (!selected)
                                    selected = self.DDList()[0];
                                self.SelectedField(selected);
                                //
                                self.SelectedField.subscribe(function (newValue) {
                                    if (self.activeMode() == self.modes.orgStructure)
                                        self.UpdateOrgStructureParams(newValue, true);
                                    else
                                        self.SaveTreeValue();
                                });
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
                });
            }
            self.AfterRender = function () {
                self.initOrgSearcherControl();
                initToolbar();
                self.startLoading();
            };
            //
            self.saveFilterFields = function (filterTreeFields, oldAssetName) {
                switch (oldAssetName) {
                    case 'Contracts':
                        self.filterContractsFields = filterTreeFields;
                        break;
                    case 'SoftwareLicense':
                        self.filterLicensFields = filterTreeFields;
                        break;
                    case 'Hardware':
                        self.filterAssetFields = filterTreeFields;
                        break;
                    //
                    case 'Discarded':
                        self.filterDiscardedFields = filterTreeFields;
                        break;
                    case 'UtilizerComplete':
                        self.filterUtilizerCompleteFields = filterTreeFields;
                        break;
                    case 'AssetRepair':
                        self.filterAssetRepairFields = filterTreeFields;
                        break;
                    //
                    default:
                        self.filterDefaultFields = filterTreeFields;
                        break;
                }
                if (filterTreeFields.FiltrationObjectID != null && filterTreeFields.FiltrationObjectClassID != null) {
                    if (self.locationControl) {
                        $.when(self.locationControl.findNodeWithParent(null, filterTreeFields.FiltrationObjectID, filterTreeFields.FiltrationObjectClassID)).done(function (finalNode) {
                            if (finalNode) {
                                finalNode.node.IsExpanded(false);
                            }
                            self.locationControl.SelectedNode(null);
                        });
                    }
                    if (self.orgStructureControl) {
                        $.when(self.orgStructureControl.findNodeWithParent(null, filterTreeFields.FiltrationObjectID, filterTreeFields.FiltrationObjectClassID)).done(function (finalNode) {
                            if (finalNode) {
                                finalNode.node.IsExpanded(false);
                            }
                            self.orgStructureControl.SelectedNode(null);
                        });
                    }
                    if (self.productCatalogueControl) {
                        $.when(self.productCatalogueControl.findNodeWithParent(null, filterTreeFields.FiltrationObjectID, filterTreeFields.FiltrationObjectClassID)).done(function (finalNode) {
                            if (finalNode) {
                                finalNode.node.IsExpanded(false);
                            }
                            self.productCatalogueControl.SelectedNode(null);
                        });
                    }
                    if (self.softCatalogueControl) {
                        $.when(self.softCatalogueControl.findNodeWithParent(null, filterTreeFields.FiltrationObjectID, filterTreeFields.FiltrationObjectClassID)).done(function (finalNode) {
                            if (finalNode) {
                                finalNode.node.IsExpanded(false);
                            }
                            self.softCatalogueControl.SelectedNode(null);
                        });
                    }
                }
            };
            self.RestoreFilterFields = function (user) {
                var tmp = null;
                switch (user.ViewNameAsset) {
                    case 'Contracts':
                        tmp = self.filterContractsFields;
                        break;
                    case 'SoftwareLicense':
                        tmp = self.filterLicensFields;
                        break;
                    case 'Hardware':
                        tmp =  self.filterAssetFields;
                        break;
                    //
                    case 'Discarded':
                        tmp = self.filterDiscardedFields;
                        break;
                    case 'UtilizerComplete':
                        tmp = self.filterUtilizerCompleteFields;
                        break;
                    case 'AssetRepair':
                        tmp = self.filterAssetRepairFields;
                        break;
                    //
                    default:
                        tmp = self.filterDefaultFields;
                        break;
                }
                 
                self.SelectedObjectClassID(tmp != null ? tmp.FiltrationObjectClassID :null);
                self.SelectedObjectID(tmp != null ? tmp.FiltrationObjectID :null);
                self.SelectedObjectName(tmp != null ? tmp.FiltrationObjectName : '');
                    //
                if (tmp != null) {
                    if (tmp != null && tmp.FiltrationTreeType == 0)//BLL.Navigator.NavigatorTypes.OrgStructure
                    {
                        self.SelectedInMode(self.modes.orgStructure);
                        if (self.SelectedInMode() == self.modes.orgStructure && tmp.FiltrationObjectID && self.orgStructureControl != null)
                            $.when(self.orgStructureControl.OpenToNode(tmp.FiltrationObjectID, tmp.FiltrationObjectClassID)).done(function (finalNode) {
                                if (finalNode && finalNode.ID == tmp.FiltrationObjectID) {
                                    self.orgStructureControl.SelectNode(finalNode);
                                    self.activeMode(self.modes.orgStructure);
                                }
                            });    
                       self.SelectedField(tmp.FiltrationField); 
                    }
                    else if (tmp != null && tmp.FiltrationTreeType == 1)//BLL.Navigator.NavigatorTypes.Location
                    {
                    self.SelectedInMode(self.modes.location);
                        if (self.SelectedInMode() == self.modes.location && tmp.FiltrationObjectID && self.locationControl != null)
                        $.when(self.locationControl.OpenToNode(tmp.FiltrationObjectID, tmp.FiltrationObjectClassID)).done(function (finalNode) {
                            if (finalNode && finalNode.ID == tmp.FiltrationObjectID) {
                                self.locationControl.SelectNode(finalNode);
                                self.activeMode(self.modes.location);
                            }
                        });
                       self.SelectedField(module.MOL);
                    }
                    else if (tmp != null && tmp.FiltrationTreeType == 2)//BLL.Navigator.NavigatorTypes.ProductCatalogue
                    {
                        self.SelectedInMode(self.modes.productCatalogue);
                        if (self.SelectedInMode() == self.modes.productCatalogue && tmp.FiltrationObjectID && self.productCatalogueControl != null) {
                            $.when(self.productCatalogueControl.OpenToNode(tmp.FiltrationObjectID, tmp.FiltrationObjectClassID)).done(function (finalNode) {
                                if (finalNode && finalNode.ID == tmp.FiltrationObjectID) {
                                    self.productCatalogueControl.SelectNode(finalNode);
                                    self.activeMode(null);
                                    self.activeMode(tmp.activeMode);
                                }
                            });
                        }
                        else if(self.SelectedInMode() == self.modes.productCatalogue && self.productCatalogueControl != null)
                        {
                        self.activeMode(null);
                        self.activeMode(tmp.activeMode);
                        }
                        self.SelectedField(module.MOL);
                    }
                    else if (tmp != null && tmp.FiltrationTreeType == 4)//BLL.Navigator.NavigatorTypes.SoftCatalogue
                    {
                        self.SelectedInMode(self.modes.softCatalogue);
                        if (self.SelectedInMode() == self.modes.softCatalogue && tmp.FiltrationObjectID && self.softCatalogueControl != null)
                            $.when(self.softCatalogueControl.OpenToNode(tmp.FiltrationObjectID, tmp.FiltrationObjectClassID)).done(function (finalNode) {
                                if (finalNode && finalNode.ID == tmp.FiltrationObjectID) {
                                    self.softCatalogueControl.SelectNode(finalNode);
                                    self.activeMode(self.modes.softCatalogue);
                                }
                            });
                       self.SelectedField(module.MOL);
                    }
                    else
                    {
                        self.SelectedInMode(self.modes.productCatalogue);
                        self.activeMode(null);
                        self.SelectedField(module.MOL);
                    }
                }
                else
                {
                    self.SelectedInMode(self.modes.productCatalogue);
                    self.activeMode(null);
                    //
                    if (self.locationControl)
                        self.locationControl.DeselectNode();
                    if (self.orgStructureControl)
                        self.orgStructureControl.DeselectNode();
                    if (self.productCatalogueControl)
                        self.productCatalogueControl.DeselectNode();
                    if (self.softCatalogueControl)
                        self.softCatalogueControl.DeselectNode();
                   self.SelectedField(module.MOL);
                }              
                if (self.tableModel.Reload != null)
                    self.SaveTreeValue();
            };
            self.ChangeAssetMonitor = function (user, oldAssetName) {
                self.currentAssetField(user.ViewNameAsset);
                var filterTreeFields = {
                    FiltrationObjectID: self.SelectedObjectID(),
                    FiltrationObjectClassID: self.SelectedObjectClassID(),
                    FiltrationObjectName: self.SelectedObjectName(),
                    FiltrationTreeType: self.SelectedInModeConverted(),
                    FiltrationField: self.SelectedField() ? self.SelectedField() : '',
                    activeMode: self.activeMode()
                };
                self.saveFilterFields(filterTreeFields, oldAssetName);
                self.RestoreFilterFields(user);
            };
            //
            self.NeedShowBottomPart = ko.computed(function () {
                if (self.activeMode() != self.modes.location
                    && self.activeMode() != self.modes.orgStructure
                    && self.activeMode() != self.modes.productCatalogue
                    && self.activeMode() != self.modes.softCatalogue)
                    return false;
                //
                if (!self.SelectedObjectID() || !self.SelectedObjectClassID())
                    return false;
                //
                return true;
            });
            self.CalculateBottomPosition = ko.computed(function () {
                if (self.NeedShowBottomPart())
                    return 90 + 'px';
                else return 0;
            });
        },
        ViewModelTopButtons: function (viewModelFiltration) {
            var self = this;
            self.$viewModelFiltration = viewModelFiltration;
            //
            self.$isLoaded = $.Deferred();
            self.AfterRender = function () {
                self.$isLoaded.resolve();
                showSpinner($('#filterButtonID')[0]);
                //
                var ttcontrol = new tclib.control();
                //
                if ($('#filterButtonID').length > 0)
                    ttcontrol.init($('#filterButtonID'), { text: getTextResource('Filters'), side: 'right' });
                //
                if ($('#orgstructureButtonID').length > 0)
                    ttcontrol.init($('#orgstructureButtonID'), { text: getTextResource('OrgStructureFilter'), side: 'right' });
                //
                if ($('#locationButtonID').length > 0)
                    ttcontrol.init($('#locationButtonID'), { text: getTextResource('LocationFilter'), side: 'right' });
                //
                if ($('#productCatalogueButtonID').length > 0)
                    ttcontrol.init($('#productCatalogueButtonID'), { text: getTextResource('ProductCatalogueTreeCaption'), side: 'right' });
                //
                if ($('#softCatalogueButtonID').length > 0 && self.$viewModelFiltration.IsSoftCatalogueActive)
                    ttcontrol.init($('#softCatalogueButtonID'), { text: getTextResource('SoftCatalogueTreeCaption'), side: 'right' });
            };
        },
        ViewModelCurrentFilter: function (viewModelFiltration) { //
            var self = this;
            self.$viewModelFiltration = viewModelFiltration;
            //
            self.$isLoaded = $.Deferred();
            self.AfterRender = function () {
                self.$isLoaded.resolve();
            };
            //
            self.CurrentFilterName = ko.computed(function () {
                if (!self.$viewModelFiltration || self.$viewModelFiltration.startLoadingFilters() == false)
                    return null;
                //
                if (!self.$viewModelFiltration.filtersModel.currentFilter() || !self.$viewModelFiltration.filtersModel.currentFilter().Name() 
                    || self.$viewModelFiltration.filtersModel.currentFilter().Name() == fvm.ShowAllAlias)
                    return null;
                //
                var retval = {};
                retval.Header = getTextResource('Filter');
                retval.Text = self.$viewModelFiltration.filtersModel.currentFilter().Name();
                //
                return retval;
            });
            //
            self.IsFilterNameVisible = ko.computed(function () {
                if (self.CurrentFilterName())
                    return true;
                //
                return false;
            });
            //
            self.WithFinishedWorkflowName = ko.computed(function () {
                if (!self.$viewModelFiltration || self.$viewModelFiltration.startLoadingFilters() == false)
                    return null;
                //
                if (!self.$viewModelFiltration.filtersModel.NeedShowTopPart() || !self.$viewModelFiltration.filtersModel.WithFinishedWorkflow())
                    return null;
                //
                var retval = {};
                retval.Header = getTextResource('Filter');
                retval.Text = getTextResource('Filter_ShowWithFinishedWorkflow');
                //
                return retval;
            });
            //
            self.IsWithFinishedWorkflowVisible = ko.computed(function () {
                if (self.WithFinishedWorkflowName())
                    return true;
                //
                return false;
            });
            //
            self.AfterDateModifiedName = ko.computed(function () {
                if (!self.$viewModelFiltration || self.$viewModelFiltration.startLoadingFilters() == false)
                    return null;
                //
                if (!self.$viewModelFiltration.filtersModel.NeedShowTopPart() || !self.$viewModelFiltration.filtersModel.AfterDateModifiedString())
                    return null;
                //
                var retval = {};
                retval.Header = getTextResource('Filter');
                retval.Text = getTextResource('Filter_ShowModifiedAfter') + ' ' + self.$viewModelFiltration.filtersModel.AfterDateModifiedString();
                //
                return retval;
            });
            //
            self.IsAfterDateModifiedVisible = ko.computed(function () {
                if (self.AfterDateModifiedName())
                    return true;
                //
                return false;
            });
            //
            self.CurrentTreeFilterName = ko.computed(function () {
                if (!self.$viewModelFiltration)
                    return null;
                //
                if (!self.$viewModelFiltration.SelectedObjectClassID() || !self.$viewModelFiltration.SelectedObjectName() || !self.$viewModelFiltration.SelectedObjectID())
                    return null;
                //
                var retval = { Header: '' };
                if (self.$viewModelFiltration.SelectedInMode() == self.$viewModelFiltration.modes.orgStructure) {
                    if (!self.$viewModelFiltration.SelectedField())
                        return null;
                    //
                    switch (self.$viewModelFiltration.SelectedField().ID) {
                        case module.Owner.ID:
                            retval.Header = module.Owner.Name;
                            break;
                        case module.MOL.ID:
                            retval.Header = module.MOL.Name;
                            break;
                        case module.Utilizer.ID:
                            retval.Header = module.Utilizer.Name;
                            break;
                        default: return null;
                    }
                    //
                    switch (self.$viewModelFiltration.SelectedObjectClassID()) {
                        case 101:
                            retval.Text = getTextResource('AssetNumber_OrganizationName');
                            retval.Text += ' "' + self.$viewModelFiltration.SelectedObjectName() + '"';
                            break;
                        case 102:
                            retval.Text = getTextResource('UserSubdivision');
                            retval.Text += ' "' + self.$viewModelFiltration.SelectedObjectName() + '"';
                            break;
                        case 9:
                            retval.Text = self.$viewModelFiltration.SelectedObjectName();
                            break;
                        default: return null;
                    }
                }
                else if (self.$viewModelFiltration.SelectedInMode() == self.$viewModelFiltration.modes.location) {
                    retval.Header = getTextResource('LocationCaption');
                    switch (self.$viewModelFiltration.SelectedObjectClassID())
                    {
                        case 101:
                            retval.Text = getTextResource('AssetNumber_OrganizationName');
                            break;
                        case 1:
                            retval.Text = getTextResource('AssetNumber_BuildingName');
                            break;
                        case 2:
                            retval.Text = getTextResource('AssetNumber_FloorName');
                            break;
                        case 3:
                            retval.Text = getTextResource('AssetNumber_RoomName');
                            break;
                        case 4:
                            retval.Text = getTextResource('AssetNumber_RackName');
                            break;
                        case 22:
                            retval.Text = getTextResource('AssetNumber_WorkplaceName');
                            break;
                        default: return null;
                    }
                    //
                    retval.Text += ' "' + self.$viewModelFiltration.SelectedObjectName() + '"';
                }
                else if (self.$viewModelFiltration.SelectedInMode() == self.$viewModelFiltration.modes.productCatalogue) {
                    retval.Header = getTextResource('ProductCatalogueTreeCaption');
                    switch (self.$viewModelFiltration.SelectedObjectClassID()) {
                        case 374:
                            retval.Text = getTextResource('Asset_Category');
                            break;
                        case 378:
                            retval.Text = getTextResource('ProductCatalogueModel_TypeName');
                            break;
                        case 93:
                        case 94:
                        case 95:
                        case 96:
                            retval.Text = getTextResource('Model');
                            break;
                        default: return null;
                    }
                    //
                    retval.Text += ' "' + self.$viewModelFiltration.SelectedObjectName() + '"';
                }
                else if (self.$viewModelFiltration.SelectedInMode() == self.$viewModelFiltration.modes.softCatalogue) {
                    retval.Header = getTextResource('SoftCatalogueTreeCaption');
                    switch (self.$viewModelFiltration.SelectedObjectClassID()) {
                        case 92:
                            retval.Text = getTextResource('Type');
                            break;
                        case 97:
                            retval.Text = getTextResource('Model');
                            break;
                        default: return null;
                    }
                    //
                    retval.Text += ' "' + self.$viewModelFiltration.SelectedObjectName() + '"';
                }
                //
                return retval;
            });
            self.IsTreeFilterNameVisible = ko.computed(function () {
                if (self.CurrentTreeFilterName() && self.$viewModelFiltration != null && (
                    self.$viewModelFiltration.filterLocationVisible() && self.$viewModelFiltration.SelectedInMode() == self.$viewModelFiltration.modes.location ||
                    self.$viewModelFiltration.filterOrgstructureVisible() && self.$viewModelFiltration.SelectedInMode() == self.$viewModelFiltration.modes.orgStructure ||
                    self.$viewModelFiltration.filterProductCatalogueVisible() && self.$viewModelFiltration.SelectedInMode() == self.$viewModelFiltration.modes.productCatalogue ||
                    self.$viewModelFiltration.filterSoftCatalogueVisible() && self.$viewModelFiltration.SelectedInMode() == self.$viewModelFiltration.modes.softCatalogue ||
                    self.$viewModelFiltration.filterCommonFiltersVisible() && self.$viewModelFiltration.SelectedInMode() == self.$viewModelFiltration.modes.commonFilters
                ))
                    return true;
                //
                return false;
            });
        }
    }
    return module;
});