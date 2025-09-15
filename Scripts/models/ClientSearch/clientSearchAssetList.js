define(['knockout', 'jquery', 'ajax',
    'ui_controls/ListView/ko.ListView.Cells', 'ui_controls/ListView/ko.ListView.Helpers',
    'ui_controls/ListView/ko.ListView', 'ui_controls/ContextMenu/ko.ContextMenu'],
    function (ko, $, ajaxLib, m_cells, m_helpers) {
        var module = {
            //сущность knockout, идентификатор класса сущности, селектор ajax-крутилки
            LinkList: function (vm) {
                var self = this;
                self.IsExpanded = ko.observable(true);
                self.ExpandCollapseClick = function () {
                    self.IsExpandedCheck(true);
                    self.IsExpanded(!self.IsExpanded());
                };
                self.IsExpandedCheck = ko.observable(false);
                self.ajaxControl = new ajaxLib.control();
                self.loadL = function (obj) {
                };
                self.init = function (obj) {
                };
                self.userIDSearch = null;
                self.SetuserIDSearch = function (obj) {
                    self.userIDSearch = obj;
                };
                self.ReadOnly = vm.ReadOnly;
                self.CanEdit = vm.CanEdit;
                self.IsClientMode = vm.IsClientMode;
                self.IsReadOnly = ko.observable(true);
                self.call = ko.observable(null);
                {
                    self.CheckData = function () {
                        $.when(operationIsGrantedD(518)).done(function (ps_properties) {
                            self.properties_operation(ps_properties);
                        });
                    };
                    self.ClearData = function () { };
                    self.Dispose = function () {
                        $(document).unbind('objectInserted', self.onObjectInserted);
                        $(document).unbind('local_objectInserted', self.onObjectInserted);
                        $(document).unbind('objectUpdated', self.onObjectModified);
                        $(document).unbind('local_objectUpdated', self.onObjectModified);
                        $(document).unbind('objectDeleted', self.onObjectDeleted);
                        $(document).unbind('local_objectDeleted', self.onObjectDeleted);
                        self.ajaxControl.Abort();
                        if (self.listViewContextMenu() != null)
                            self.listViewContextMenu().dispose();
                        if (self.listView != null)
                            self.listView.dispose();
                    };
                }
                //
                {//ko.listView
                    {//events of listView
                        self.listView = null;
                        self.viewName = 'Hardware';
                        self.listViewID = 'listView_' + ko.getNewID();
                        //
                        self.listViewInit = function (listView) {
                            self.listView = listView;
                            m_helpers.init(self, listView);//extend self
                            listView.load();
                        };
                        self.listViewRetrieveItems = function () {
                            var retvalD = $.Deferred();
                            $.when(self.getObjectList()).done(function (objectList) {
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
                            self.Load(classID, id);
                        };
                    }
                    //
                    {//identification
                        self.getMainObjectID = function (obj) {
                            return obj.ID.toUpperCase();
                        };
                        self.getObjectClassID = function (obj) {
                            return obj.ClassID;
                        };
                    }
                    //
                    {//geting data             
                        self.loadObjectListByIDs = function (idArray, unshiftMode) {
                            var retvalD = $.Deferred();
                            for (var i = 0; i < idArray.length; i++)
                                idArray[i] = idArray[i].toUpperCase();
                            //
                            if (idArray.length > 0) {
                                $.when(self.getObjectList()).done(function (objectList) {
                                    if (objectList) {
                                        var rows = self.appendObjectList(objectList, unshiftMode);
                                        rows.forEach(function (row) {
                                            self.setRowAsNewer(row);
                                            //
                                            var obj = row.object;
                                            var id = self.getObjectID(obj);
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
                        //
                        self.getObjectList = function () {
                            var retvalD = $.Deferred();
                            //
                            var requestInfo = {
                                StartRecordIndex: 0,
                                CountRecords: self.userIDSearch ? self.userIDSearch.length : false,
                                IDList: self.userIDSearch ? self.userIDSearch : [],
                                TimezoneOffsetInMinutes: new Date().getTimezoneOffset(),
                                ViewName: self.viewName,
                                ParentObjectID: null
                            };
                            self.ajaxControl.Ajax(null,
                                {
                                    dataType: "json",
                                    method: 'POST',
                                    data: requestInfo,
                                    url: 'assetApi/GetListForSearchAssetObject'
                                },
                                function (newVal) {
                                    if (newVal && newVal.Result === 0) {
                                        if (newVal.Data.length == 0 && !self.IsExpandedCheck())
                                            self.IsExpanded(false);
                                        retvalD.resolve(newVal.Data);
                                    }
                                    else if (newVal && newVal.Result === 1)
                                        require(['sweetAlert'], function () {
                                            swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[clientSearchAssetList.js, getObjectList]', 'error');
                                            retvalD.resolve([]);
                                        });
                                    else if (newVal && newVal.Result === 2)
                                        require(['sweetAlert'], function () {
                                            swal(getTextResource('ErrorCaption'), getTextResource('BadParamsError') + '\n[clientSearchAssetList.js, getObjectList]', 'error');
                                            retvalD.resolve([]);
                                        });
                                    else if (newVal && newVal.Result === 3)
                                        require(['sweetAlert'], function () {
                                            swal(getTextResource('ErrorCaption'), getTextResource('AccessError'), 'error');
                                            retvalD.resolve([]);
                                        });
                                    else
                                        require(['sweetAlert'], function () {
                                            swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[clientSearchAssetList.js, getObjectList]', 'error');
                                            retvalD.resolve([]);
                                        });
                                });
                            //
                            return retvalD.promise();
                        };
                    }
                    //
                    {//open object form
                        self.Load = function (classID, id) {
                            showSpinner();
                            require(['assetForms'], function (module) {
                                var fh = new module.formHelper(true);
                                if (classID == 5 || classID == 6 || classID == 33 || classID == 34)
                                    fh.ShowAssetForm(id, classID);
                                else if (classID == 115)
                                    fh.ShowServiceContract(id);
                                else if (classID == 386)
                                    fh.ShowServiceContractAgreement(id);
                                else if (classID == 223) 
                                {
                                    fh.ShowSoftwareLicenceForm(id);
                                }
                                else
                                    hideSpinner();
                            });
                        };
                    }
                }
                //
                {//ko.contextMenu
                    self.listViewContextMenu = ko.observable(null);
                    self.contextMenuInit = function (contextMenu) {
                        self.listViewContextMenu(contextMenu);//bind contextMenu
                        //
                        self.propertiesMenuItem(contextMenu);
                    };
                    self.contextMenuOpening = function (contextMenu) {
                        self.CheckData();
                        contextMenu.items().forEach(function (item) {
                            if (item.isEnable && item.isVisible) {
                                item.enabled(item.isEnable());
                                item.visible(item.isVisible());
                            }
                        });
                    };
                    //
                    {//helper methods                               
                        self.getItemName = function (item) {
                            return '№ ' + item.OrderNumber;
                        };
                        //
                        self.getSelectedItems = function () {
                            var selectedItems = self.listView.rowViewModel.checkedItems();
                            return selectedItems;
                        };
                        self.clearSelection = function () {
                            self.listView.rowViewModel.checkedItems([]);
                        };
                        self.getConcatedItemNames = function (items) {
                            var retval = '';
                            items.forEach(function (item) {
                                if (retval.length < 200) {
                                    retval += (retval.length > 0 ? ', ' : '') + self.getItemName(item);
                                    if (retval.length >= 200)
                                        retval += '...';
                                }
                            });
                            return retval;
                        };
                        self.getItemInfos = function (items) {
                            var retval = [];
                            items.forEach(function (item) {
                                retval.push({
                                    ClassID: self.getObjectClassID(item),
                                    ID: self.getMainObjectID(item)
                                });
                            });
                            return retval;
                        };
                        self.getItemIDs = function (items) {
                            var infos = self.getItemInfos(items);
                            var retval = [];
                            for (var i = 0; i < infos.length; i++)
                                retval.push(infos[i].ID);
                            return retval;
                        };
                    }
                }
                //
                {//operations
                    self.properties_operation = ko.observable(false);
                    //
                    self.propertiesMenuItem = function (contextMenu) {
                        var isEnable = function () {
                            return self.getSelectedItems().length === 1;
                        };
                        var isVisible = function () {
                            return self.properties_operation();
                        };
                        var action = function () {
                            if (self.getSelectedItems().length != 1)
                                return false;
                            //
                            var selected = self.getSelectedItems()[0];

                            var classID = self.getObjectClassID(selected);
                            var id = self.getMainObjectID(selected);
                            //
                            self.Load(classID, id);
                        };
                        //
                        var cmd = contextMenu.addContextMenuItem();
                        cmd.restext('Properties');
                        cmd.isEnable = isEnable;
                        cmd.isVisible = isVisible;
                        cmd.click(action);
                    };
                }
            }
        };
        return module;
    });
