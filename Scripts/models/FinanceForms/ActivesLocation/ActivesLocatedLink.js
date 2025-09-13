define(['knockout', 'jquery', 'ajax', 'iconHelper', 'selectControl', 'treeControl', 'ui_controls/ListView/ko.ListView.Cells', 'ui_controls/ListView/ko.ListView.Helpers', 'ui_controls/ListView/ko.ListView.LazyEvents', 'ui_controls/ListView/ko.ListView', 'ui_controls/ContextMenu/ko.ContextMenu', 'jqueryStepper'], function (ko, $, ajaxLib, ihLib, scLib, treeLib, m_cells, m_helpers, m_lazyEvents) {
    var module = {
        MaxCount: 2147483647,//2^31-1
        ViewModel: function ($region, bindedObject) {
            var self = this;
            self.$isLoaded = $.Deferred();
            self.$region = $region;
            //
            self.bindedClassID = bindedObject.ClassID;
            self.bindedObjectID = bindedObject.ID;
            //
            self.Height = ko.observable(0);
            self.Resize = function (tabHeight) {
                self.Height(Math.max(tabHeight - 100 - 26, 0) + 'px');
            };
            //
            self.dispose = function () {
                if (self.modelParameterSelector())
                    self.modelParameterSelector().dispose();
            };
            //
            self.modelParameterSelector = ko.observable(null);
            self.initParameterSelector = function () {
                self.modelParameterSelector(new module.ParameterSelectorModel(self.$region, self.bindedObjectID, self.listViewContextMenu));
            };
            //
            self.ReloadTable = function () {
                if (!self.modelParameterSelector())
                    return;
                //
                self.modelParameterSelector().ReloadTable();
            };
            //
            {//ko.contextMenu
                self.listViewContextMenu = ko.observable(null);
                self.contextMenuItems = [];

                self.contextMenuInit = function (contextMenu) {
                    self.listViewContextMenu(contextMenu);//bind contextMenu
                };
                self.contextMenuOpening = function (contextMenu) {
                    contextMenu.clearItems();
                    var cmd = contextMenu.addContextMenuItem();
                    cmd.restext('Loading');
                    cmd.enabled(false);
                    //
                    $.when(self.ResetContextMenu(contextMenu)).done(function() {
                        contextMenu.removeItem(cmd);
                    });
                };
            }
            //
            self.ContextMenuAction = function (contextMenuItem) {
                if (contextMenuItem.LifeCycleStateOperationID) {
                    if (contextMenuItem.CommandType == 0) {//register
                        showSpinner();
                        require(['assetForms'], function (module) {
                            var fh = new module.formHelper(true);
                            var selectedObjects = self.getSelectedItems();
                            fh.ShowAssetRegistration(selectedObjects, contextMenuItem.Name, contextMenuItem.LifeCycleStateOperationID, bindedObject);
                        });
                    }
                    else if (contextMenuItem.CommandType == 1 || contextMenuItem.CommandType == 7 || contextMenuItem.CommandType == 8) {//asset move; asset from storage; asset to storage
                        showSpinner();
                        require(['assetForms'], function (module) {
                            var fh = new module.formHelper(true);
                            var selectedObjects = self.getSelectedItems();
                            fh.ShowAssetMoveForm(selectedObjects, contextMenuItem.Name, contextMenuItem.LifeCycleStateOperationID, contextMenuItem.CommandType);
                        });
                    }
                    else if (contextMenuItem.CommandType == 2) {//asset to repair
                        showSpinner();
                        require(['assetForms'], function (module) {
                            var fh = new module.formHelper(true);
                            var selectedObjects = self.getSelectedItems();
                            fh.ShowAssetToRepairForm(selectedObjects, contextMenuItem.Name, contextMenuItem.LifeCycleStateOperationID);
                        });
                    }
                    else if (contextMenuItem.CommandType == 3) {//asset from repair
                        showSpinner();
                        require(['assetForms'], function (module) {
                            var fh = new module.formHelper(true);
                            var selectedObjects = self.getSelectedItems();
                            fh.ShowAssetFromRepairForm(selectedObjects, contextMenuItem.Name, contextMenuItem.LifeCycleStateOperationID);
                        });
                    }
                    else if (contextMenuItem.CommandType == 4) {//asset write off
                        showSpinner();
                        require(['assetForms'], function (module) {
                            var fh = new module.formHelper(true);
                            var selectedObjects = self.getSelectedItems();
                            fh.ShowAssetOffForm(selectedObjects, contextMenuItem.Name, contextMenuItem.LifeCycleStateOperationID);
                        });
                    }
                    else if (contextMenuItem.CommandType == 11 || contextMenuItem.CommandType == 10 || contextMenuItem.CommandType == 14) {//workOrder or setState
                        self.ExecuteContextMenu(contextMenuItem);
                    }                    
                }
                else if (contextMenuItem.CommandType == -1) {//отметить исполнение
                    var selectedItems = self.modelParameterSelector().listView.rowViewModel.checkedItems();
                    if (selectedItems.length == 1) {
                        var id = selectedItems[0].DTL.PurchaseSpecificationID;
                        require(['financeForms'], function (module) {
                            var fh = new module.formHelper(true);
                            fh.ShowExecutePurchaseSpecification(id);
                        });
                    }
                }
                else //serviceContractAgreement state
                    self.ExecuteContextMenu(contextMenuItem);
            };
            //
            self.ajaxControlExecuteContextMenu = new ajaxLib.control();
            self.ExecuteContextMenu = function (contextMenuItem) {
                var deviceList = self.getSelectedItems();
                var cmd = {
                    Enabled: contextMenuItem.Enabled,
                    Name: contextMenuItem.Name,
                    CommandType: contextMenuItem.CommandType,
                    LifeCycleStateOperationID: contextMenuItem.LifeCycleStateOperationID
                };
                //
                self.ajaxControlExecuteContextMenu.Ajax(null,
                {
                    dataType: "json",
                    method: 'GET',
                    data: { DeviceList: deviceList, Command: cmd },
                    url: 'sdApi/ExecuteContextMenu'
                },
                function (newVal) {
                    if (newVal) {
                        if (newVal.Result == 0) {
                            if (newVal.Message)
                                require(['sweetAlert'], function () {
                                    swal(contextMenuItem.Name, newVal.Message, 'info');
                                });
                            ko.utils.arrayForEach(deviceList, function (el) {
                                $(document).trigger('local_objectUpdated', [el.ClassID, el.ID]);
                            });
                        }
                        else if (newVal.Result == 8) {//validation
                            require(['sweetAlert'], function () {
                                swal(contextMenuItem.Name, newVal.Message, 'warning');
                            });
                        }
                        else if (newVal.Result != 0) {
                            require(['sweetAlert'], function () {
                                swal(contextMenuItem.Name, 'Операция не выполнена', 'error');
                            });
                        }
                    }
                });
            };
            //
            self.getSelectedItems = function () {
                if (!self.modelParameterSelector || !self.modelParameterSelector())
                    return [];
                //
                var selectedItems = self.modelParameterSelector().listView.rowViewModel.checkedItems();
                //
                if (!selectedItems)
                    return [];
                //
                var retval = [];
                selectedItems.forEach(function (el) {
                    var item =
                    {
                        ID: el.ID.toUpperCase(),
                        ClassID: el.DTL.ClassID,
                        OwnerID: el.DTL.GoodsInvoiceConsigneeID,
                        OwnerClassID: 101,
                        UtilizerID: el.DTL.UtilizerID,
                        UtilizerClassID: el.DTL.UtilizerClassID,
                        IsLogical: false
                    };
                    retval.push(item);
                });
                return retval;
            };
            //
            self.ajaxControl = new ajaxLib.control();
            self.ResetContextMenu = function (contextMenu) {
                var retval = $.Deferred();
                //
                var deviceList = self.getSelectedItems();
                //
                self.ajaxControl.Ajax(null,
                {
                    dataType: "json",
                    method: 'POST',
                    data: { DeviceList: deviceList },
                    url: 'sdApi/GetContextMenu'
                },
                function (newVal) {
                    if (newVal && newVal.List) {
                        require(['assetOperationsHelper'], function (module) {
                            newVal.List.forEach(function (lifeCycleOperation) {
                                
                                if (functionsAvailability.SoftwareDistributionCentres && (lifeCycleOperation.CommandType == 12 || lifeCycleOperation.CommandType ==13)) {
                                    return;
                                }
                                
                                var cmd = contextMenu.addContextMenuItem();
                                cmd.enabled(lifeCycleOperation.Enabled);
                                cmd.text(lifeCycleOperation.Name);
                                cmd.click(function () { module.executeLifeCycleOperation(lifeCycleOperation, deviceList); });
                                //
                                cmd.isDynamic = true;
                            });

                            if (contextMenu.visibleItems().length == 0)
                                contextMenu.close();
                        });
                    }
                    retval.resolve();
                });
                //
                return retval.promise();
            };
            //            
            self.AfterRender = function (ko_object) {
                self.bindedObjectID = ko_object().ID();
                //
                self.initParameterSelector();
                //
                self.$isLoaded.resolve();
            };
            self.SizeChanged = function () {
                if (self.modelParameterSelector && self.modelParameterSelector())
                    self.modelParameterSelector().SizeChanged();
            };
        },
        ParameterSelectorModel: function ($region, bindedObjectID, contextMenu) {
            var self = this;
            self.tableModel = null;
            self.columnsModel = null;
            self.startLoadingTable = ko.observable(false);
            self.startLoadingColumns = ko.observable(false);
            self.$region = $region;
            //
            self.dispose = function () {
                if (self.listViewContextMenu() != null)
                    self.listViewContextMenu().dispose();
                if (self.listView != null)
                    self.listView.dispose();
                //TODO other fields and controls
            };
            //
            {//bind contextMenu
                self.listViewContextMenu = contextMenu;
            }

            self.viewName = 'LocatedActivesSearch';
            {//events of listView
                self.listView = null;
                //
                self.listViewInit = function (listView) {
                    self.listView = listView;
                    m_helpers.init(self, listView);//extend self
                    listView.load();
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
                        if (classID == 5 || classID == 6 || classID == 33 || classID == 34)
                            fh.ShowAssetForm(id, classID);
                        else if (classID == 115)//contract
                            fh.ShowServiceContract(id);
                        else if (classID == 386)
                            fh.ShowServiceContractAgreement(id);
                        else if (classID == 223) //software licence
                            fh.ShowSoftwareLicenceForm(id);
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
                    TypeID: null,
                    ModelsID: [],
                    LocationClassID: null,
                    LocationID: null,
                    NumbersID: [],
                    StatesID: [],
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
                        ModelsID: self.searchFilterData && self.searchFilterData() ? self.searchFilterData().ModelsID : null,
                        NumbersID: self.searchFilterData && self.searchFilterData() ? self.searchFilterData().NumbersID : null,
                        StatesID: self.searchFilterData && self.searchFilterData() ? self.searchFilterData().StatesID : null,
                        LocationID: self.searchFilterData && self.searchFilterData() ? self.searchFilterData().LocationID : null,
                        LocationClassID: self.searchFilterData && self.searchFilterData() ? self.searchFilterData().LocationClassID : null,
                        ParentObjectID: bindedObjectID,
                    };
                    //
                    self.ajaxControl.Ajax(null,
                        {
                            dataType: "json",
                            method: 'POST',
                            data: requestInfo,
                            url: 'finApi/GetLocatedActivesSearchListForObject'
                        },
                        function (newVal) {
                            if (newVal && newVal.Result === 0) {
                                retvalD.resolve(newVal.Data);//can be null, if server canceled request, because it has a new request                               
                                return;
                            }
                            else if (newVal && newVal.Result === 1 && showErrors === true) {
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[Lists/SD/Table.js getData]', 'error');
                                });
                            }
                            else if (newVal && newVal.Result === 2 && showErrors === true) {
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('BadParamsError') + '\n[Lists/SD/Table.js getData]', 'error');
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
                                    swal(getTextResource('ErrorCaption'), getTextResource('AjaxError') + '\n[Lists/SD/Table.js getData]', 'error');
                                });
                            }
                            //
                            retvalD.resolve([]);
                        },
                        function (XMLHttpRequest, textStatus, errorThrown) {
                            if (showErrors === true)
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('AjaxError') + '\n[Lists/SD/Table.js, getData]', 'error');
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
                    return obj.DTL.ClassID;
                };
                self.getMainObjectID = function (obj) {
                    return obj.ID.toUpperCase();
                };
                self.isObjectClassVisible = function (objectClassID) {
                    if (objectClassID == 5
                        || objectClassID == 6
                        || objectClassID == 33
                        || objectClassID == 34
                        || objectClassID == 223
                        || objectClassID == 120
                        || objectClassID == 115
                        || objectClassID == 223)//obj_networkDevice, obj_terminalDevice, obj_adapter, obj_peripheral, obj_licence, obj_material, obj_serviceContract
                        return true;
                };
            }
            //
            self.SizeChanged = function () {
                var $regionTable = self.$region.find('.ars-link_tableColumn');
                var tableHeightWithoutHeader = $regionTable.height() - $regionTable.find(".tableHeader").outerHeight();
                $regionTable.find(".region-Table").css("height", $regionTable.height() + "px");//для скрола на таблице (без шапки)
                if (self.listView)
                    self.listView.renderTable();
            };
            //
            self.ajaxControl_loadTypes = new ajaxLib.control();
            self.controlTypeSelector = null;
            self.InitializeTypeSelector = function () {
                var retD = $.Deferred();
                //
                var $regionType = self.$region.find('.ars-link_paramsColumnType');
                var deffered = $.Deferred();
                self.controlTypeSelector = new scLib.control();
                self.controlTypeSelector.init($regionType,
                    {
                        Title: getTextResource('AssetNumber_TypeName'),
                        IsSelectMultiple: false,
                        AllowDeselect: true,
                        OnSelect: self.OnTypeSelected,
                        ShowSingleSelectionInRow: true
                    }, deffered.promise());
                //
                self.ajaxControl_loadTypes.Ajax($regionType,
                    {
                        dataType: "json",
                        method: 'GET',
                        url: 'finApi/GetARSLinkTypes'
                    },
                    function (newData) {
                        if (newData != null && newData.Result === 0 && newData.List) {
                            var retval = [];
                            //
                            newData.List.forEach(function (el) {
                                retval.push({
                                    ID: el.ID,
                                    Name: el.Name,
                                    Checked: false
                                });
                            });
                            //
                            deffered.resolve(retval);
                        }
                        else deffered.resolve();
                        //
                        $.when(self.controlTypeSelector.$initializeCompleted).done(function () {
                            retD.resolve();
                        });
                    });
                //
                return retD.promise();
            };
            self.SelectedType = ko.observable(null);
            self.IsTypeSelected = ko.computed(function () {
                return self.SelectedType() != null;
            });
            self.OnTypeSelected = function (type) {
                if (!type || type.Checked === false) {
                    self.SelectedType(null);
                    self.ImplementFilter();
                    return;
                }
                //
                self.SelectedType(type);
                //
                $.when(self.InitializeModelSelector()/*, self.InitializeVendorSelector()*/).done(function () {
                    self.ImplementFilter();
                });
            };
            //
            self.ajaxControl_loadModels = new ajaxLib.control();
            self.controlModelSelector = null;
            self.InitializeModelSelector = function () {
                var retD = $.Deferred();
                if (!self.IsTypeSelected()) {
                    retD.resolve();
                    return retD;
                }
                //
                var deffered = $.Deferred();
                var $regionModel = self.$region.find('.ars-link_paramsColumnModel');
                //
                if (!self.controlModelSelector) {
                    self.controlModelSelector = new scLib.control();
                    self.controlModelSelector.init($regionModel,
                        {
                            Title: getTextResource('AssetNumber_ModelName'),
                            AlwaysShowTitle: true,
                            IsSelectMultiple: true,
                            OnEditComplete: self.ImplementFilter
                        }, deffered.promise());
                }
                else {
                    self.controlModelSelector.ClearItemsList();
                    $.when(deffered).done(function (values) {
                        self.controlModelSelector.AddItemsToControl(values);
                    });
                }
                //
                var param = {
                    typeID: self.SelectedType().ID,
                };
                //
                self.ajaxControl_loadModels.Ajax($regionModel,
                    {
                        dataType: "json",
                        method: 'GET',
                        url: 'finApi/GetARSLinkModels?' + $.param(param)
                    },
                    function (newData) {
                        if (newData != null && newData.Result === 0 && newData.List) {
                            var retval = [];
                            //
                            newData.List.forEach(function (el) {
                                retval.push({
                                    ID: el.ID,
                                    Name: el.Name,
                                    Checked: false
                                });
                            });
                            //
                            deffered.resolve(retval);
                        }
                        else deffered.resolve();
                        //
                        $.when(self.controlModelSelector.$initializeCompleted).done(function () {
                            retD.resolve();
                        });
                    });
                //
                return retD.promise();
            };
            //
            self.ajaxControl_location = new ajaxLib.control();
            self.controlLocationSelector = null;
            self.InitializeLocationSelector = function () {
                var retD = $.Deferred();
                //
                var $regionLocation = self.$region.find('.ars-link_LocationSearcher');
                var deffered = $.Deferred();
                self.controlLocationSelector = new scLib.control();
                self.controlLocationSelector.init($regionLocation,
                    {
                        Title: getTextResource('LocationCaption'),
                        IsSelectMultiple: false,
                        AllowDeselect: true,
                        AlwaysShowSearch: true,
                        ShowSingleSelectionInRow: true,
                        OnEditComplete: self.ImplementFilter
                    }, deffered.promise());
                //
                self.ajaxControl_location.Ajax($regionLocation,
                    {
                        dataType: "json",
                        method: 'GET',
                        url: 'finApi/GetLocationList'
                    },
                    function (newData) {
                        if (newData != null && newData.Result === 0 && newData.List) {
                            var retval = [];
                            //
                            newData.List.forEach(function (el) {
                                retval.push({
                                    ID: el.ID,
                                    Name: el.Name,
                                    ClassID: el.ClassID,
                                    Checked: false
                                });
                            });
                            //
                            deffered.resolve(retval);
                        }
                        else deffered.resolve();
                        //
                        $.when(self.controlLocationSelector.$initializeCompleted).done(function () {
                            retD.resolve();
                        });
                    });
                //
                return retD.promise();
            };
            //
            //
            self.treeControl = null;
            self.InitTree = function () {
                var retD = $.Deferred();
                var $regionTree = self.$region.find('.purchase_located');
                //
                if (!self.treeControl) {
                    self.treeControl = new treeLib.control();
                    self.treeControl.init($regionTree, 1, {
                        onClick: self.OnSelectTreeValue,
                        UseAccessIsGranted: true,
                        ShowCheckboxes: false,
                        AvailableClassArray: [29, 101, 1, 2, 3, 4],
                        ClickableClassArray: [29, 3, 4],
                        AllClickable: false,
                        FinishClassArray: [4],
                        Title: getTextResource('LocationCaption'),
                        WindowModeEnabled: false
                    });
                }
                //
                $.when(self.treeControl.$isLoaded).done(function () {
                    retD.resolve();
                });
                //
                return retD.promise();
            };
            self.SelectedTreeValue = ko.observable(null);
            self.TreeValueSelected = ko.computed(function () {
                return self.SelectedTreeValue() == null;
            });
            self.OnSelectTreeValue = function (node) {
                if (node && node.ClassID == 29) {
                    if (self.SelectedTreeValue()) {
                        self.SelectedTreeValue(null);
                        self.ImplementFilter();
                    }
                    self.treeControl.DeselectNode();
                    //
                    return false;
                }
                //
                self.SelectedTreeValue(node);
                self.ImplementFilter();
                //
                return true;
            };
            //
            //
            self.ajaxControl_loadNumbers = new ajaxLib.control();
            self.controlNumbersSelector = null;
            self.InitializeNumbersSelector = function () {
                var retD = $.Deferred();
                //
                var deffered = $.Deferred();
                var $regionNumbers = self.$region.find('.ars-link_paramsColumnNumbers');
                //
                if (!self.controlNumbersSelector) {
                    self.controlNumbersSelector = new scLib.control();
                    self.controlNumbersSelector.init($regionNumbers,
                        {
                            Title: getTextResource('GoodsInvoiceNumber'),
                            AlwaysShowTitle: true,
                            IsSelectMultiple: true,
                            OnEditComplete: self.ImplementFilter
                        }, deffered.promise());
                }
                else {
                    self.controlNumbersSelector.ClearItemsList();
                    $.when(deffered).done(function (values) {
                        self.controlNumbersSelector.AddItemsToControl(values);
                    });
                }
                //
                var param = {
                    workOrderID: bindedObjectID,
                };
                //
                self.ajaxControl_loadNumbers.Ajax($regionNumbers,
                    {
                        dataType: "json",
                        method: 'GET',
                        url: 'finApi/GetGoodsInvoiceNumbers?' + $.param(param)
                    },
                    function (newData) {
                        if (newData != null && newData.Result === 0 && newData.List) {
                            var retval = [];
                            //
                            newData.List.forEach(function (el) {
                                retval.push({
                                    ID: el.ID,
                                    Name: el.Name,
                                    Checked: false
                                });
                            });
                            //
                            deffered.resolve(retval);
                        }
                        else deffered.resolve();
                        //
                        $.when(self.controlNumbersSelector.$initializeCompleted).done(function () {
                            retD.resolve();
                        });
                    });
                //
                return retD.promise();
            };
            //
            self.ajaxControl_loadStates = new ajaxLib.control();
            self.controlStatesSelector = null;
            self.InitializeStatesSelector = function () {
                var retD = $.Deferred();
                //
                var deffered = $.Deferred();
                var $regionStates = self.$region.find('.ars-link_paramsColumnLifeCycleStates');
                //
                if (!self.controlStatesSelector) {
                    self.controlStatesSelector = new scLib.control();
                    self.controlStatesSelector.init($regionStates,
                        {
                            Title: getTextResource('LifeCycleState'),
                            AlwaysShowTitle: true,
                            IsSelectMultiple: true,
                            OnEditComplete: self.ImplementFilter
                        }, deffered.promise());
                }
                else {
                    self.controlStatesSelector.ClearItemsList();
                    $.when(deffered).done(function (values) {
                        self.controlStatesSelector.AddItemsToControl(values);
                    });
                }
                //
                var param = {
                    workOrderID: bindedObjectID,
                };
                //
                self.ajaxControl_loadStates.Ajax($regionStates,
                    {
                        dataType: "json",
                        method: 'GET',
                        url: 'finApi/GetLifeCycleStates?' + $.param(param)
                    },
                    function (newData) {
                        if (newData != null && newData.Result === 0 && newData.List) {
                            var retval = [];
                            //
                            newData.List.forEach(function (el) {
                                retval.push({
                                    ID: el.ID,
                                    Name: el.Name,
                                    Checked: false
                                });
                            });
                            //
                            deffered.resolve(retval);
                        }
                        else deffered.resolve();
                        //
                        $.when(self.controlStatesSelector.$initializeCompleted).done(function () {
                            retD.resolve();
                        });
                    });
                //
                return retD.promise();
            };
            //
            self.ImplementFilter = function () {
                var models = [];
                var vendors = [];
                var reference = [];
                var numbers = [];
                var states = [];
                var typeID = self.SelectedType() ? self.SelectedType().ID : null;
                //
                if (typeID && self.controlModelSelector) {
                    var currentModels = self.controlModelSelector.GetSelectedItems();
                    if (currentModels)
                        ko.utils.arrayForEach(currentModels, function (el) {
                            models.push(el.ID);
                        });
                }
                //
                if (self.controlNumbersSelector) {
                    var currentNumbers = self.controlNumbersSelector.GetSelectedItems();
                    if (currentNumbers)
                        ko.utils.arrayForEach(currentNumbers, function (el) {
                            numbers.push(el.ID);
                        });
                    //
                }
                //
                if (self.controlStatesSelector) {
                    var currentCustomers = self.controlStatesSelector.GetSelectedItems();
                    if (currentCustomers)
                        ko.utils.arrayForEach(currentCustomers, function (el) {
                            states.push(el.ID);
                        });
                    //
                }
                //
                var treeClassID = self.SelectedTreeValue() ? self.SelectedTreeValue().ClassID : null;
                var treeID = self.SelectedTreeValue() ? self.SelectedTreeValue().ID : null;
                //
                /*if (self.controlLocationSelector) {
                    var currentLocation = self.controlLocationSelector.GetSelectedItems();
                    if (currentLocation) {
                        treeClassID = currentLocation.ClassID;
                        treeID = currentLocation.ID;
                    }
                }*/
                //
                var old = self.searchFilterData();
                var newData = {
                    TypeID: typeID,
                    ModelsID: models,
                    LocationClassID: treeClassID,
                    LocationID: treeID,
                    NumbersID: numbers,
                    StatesID: states,
                };
                //
                if (self.IsFilterDataDifferent(old, newData)) {
                    self.listView.load();
                    self.searchFilterData(newData);
                    //
                    self.UpdateTableByFilter(newData);
                }
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
                if (arr_diff(oldData.ModelsID, newData.ModelsID).length != 0)
                    return true;
                //
                if (oldData.LocationClassID != newData.LocationClassID)
                    return true;
                //
                if (oldData.LocationID != newData.LocationID)
                    return true;
                //

                if (arr_diff(oldData.NumbersID, newData.NumbersID).length != 0)
                    return true;
                //
                if (arr_diff(oldData.StatesID, newData.StatesID).length != 0)
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
                self.InitializeTypeSelector();
                self.InitTree();
                //self.InitializeLocationSelector();
                self.InitializeNumbersSelector();
                self.InitializeStatesSelector();
            };
            //
            {//server and local(only this browser tab) events                
                self.isFilterActive = function () {
                    return false;
                };
                //
                self.onObjectInserted = function (e, objectClassID, objectID, parentObjectID) {
                    if (!self.isObjectClassVisible(objectClassID))
                        return;//в текущем списке измененный объект присутствовать не может
                    else if (parentObjectID && objectClassID != 160) {
                        self.onObjectModified(e, objectClassID, parentObjectID, null);//возможно изменилась часть объекта, т.к. в контексте указан родительский объект
                        return;
                    }
                    objectID = objectID.toUpperCase();
                    //
                    var loadOjbect = true;//будем загружать
                    var row = self.getRowByID(objectID);
                    if (row == null) {
                        if (self.isFilterActive() === true) {//активен фильтр => самостоятельно не загружаем                                   
                            loadOjbect = false;
                            self.checkAvailabilityID(objectID);
                        }
                    } else //используем грязное чтение, поэтому такое возможно
                        self.setRowAsOutdated(row);
                    //
                    if (loadOjbect == true) {
                        if (self.isAjaxActive() === true)
                            self.addToModifiedObjectIDs(objectID);
                        else
                            self.reloadObjectByID(objectID);
                    }
                };
                //
                self.onObjectModified = function (e, objectClassID, objectID, parentObjectID) {
                    if (!self.isObjectClassVisible(objectClassID))
                        return;//в текущем списке измененный объект присутствовать не может
                    //
                    objectID = objectID.toUpperCase();
                    //
                    var row = self.getRowByID(objectID);
                    if (row == null) {
                        var viewName = self.viewName;
                        //
                        self.checkAvailabilityID(objectID);
                    } else {
                        self.setRowAsOutdated(row);
                        //
                        if (self.isAjaxActive() === true)
                            self.addToModifiedObjectIDs(objectID);
                        else
                            self.reloadObjectByID(objectID);
                    }
                };
                //
                self.onObjectDeleted = function (e, objectClassID, objectID, parentObjectID) {
                    if (!self.isObjectClassVisible(objectClassID))
                        return;//в текущем списке удаляемый объект присутствовать не может
                    else if (parentObjectID && objectClassID != 160) {
                        self.onObjectModified(e, objectClassID, parentObjectID, null);//возможно изменилась часть объекта, т.к. в контексте указан родительский объект
                        return;
                    }
                    objectID = objectID.toUpperCase();
                    //
                    self.removeRowByID(objectID);
                    self.clearInfoByObject(objectID);
                };
                //
                //отписываться не будем
                $(document).bind('objectInserted', self.onObjectInserted);
                $(document).bind('local_objectInserted', self.onObjectInserted);
                $(document).bind('objectUpdated', self.onObjectModified);
                $(document).bind('local_objectUpdated', self.onObjectModified);
                $(document).bind('objectDeleted', self.onObjectDeleted);
                $(document).bind('local_objectDeleted', self.onObjectDeleted);
            }
            //
            m_lazyEvents.init(self);//extend self
        }
    }
    return module;
});