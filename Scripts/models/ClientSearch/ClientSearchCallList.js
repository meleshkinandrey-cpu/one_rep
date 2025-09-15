define(['knockout', 'jquery', 'ajax', 
    'ui_controls/ListView/ko.ListView.Cells', 'ui_controls/ListView/ko.ListView.Helpers',
    'ui_controls/ListView/ko.ListView', 'ui_controls/ContextMenu/ko.ContextMenu', 'ui_controls/ListView/ko.ListView.LazyEvents'],
    function (ko, $, ajaxLib, m_cells, m_helpers, m_List,m_Context, m_Lazy) {
    var module = {
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
            self.resicetable = function () {
                m_List.waitAndRenderTable();
            }
            self.init = function (obj) {
            };
            self.userIDSearch = null;
            self.SetuserIDSearch = function (obj) {
                self.userIDSearch = obj;
            };
            self.ReadOnly = vm.ReadOnly;
            //
            self.CanEdit = vm.CanEdit;
            //           
            self.IsClientMode = vm.IsClientMode;
            self.IsReadOnly = ko.observable(true);

            self.UserSearchOption = null;
            self.SetUserSearchOption = function (obj) {
                self.UserSearchOption = obj;
            };

            self.ChechDownloadUser = function (data) {
                var UserName = self.UserSearchOption.UserName;
                var retval = [];
                data.forEach(function (item) {
                    if (UserName.indexOf(item.ClientFullName) != -1)
                        retval.push(item);
                });
                    return retval;
            }
            self.call = ko.observable(null);
            {
                self.CheckData = function () {
                      $.when(operationIsGrantedD(518)).done(function (ps_properties){                                
                          self.properties_operation(ps_properties);
                            });
                };
                self.getObjectID = function (obj) {
                    return obj.ID.toUpperCase();
                };
                self.ListModified = function (e, objectClassID, objectID, parentObjectID) {
                    
                    objectID = objectID.toUpperCase();
                    //
                    var loadOjbect = true;//будем загружать
                    if (self.getRowByID) {
                        var row = self.getRowByID(objectID);
                        if (row != null) {
                            //используем грязное чтение, поэтому такое возможно
                            self.setRowAsOutdated(row);
                        }
                    }
                    //
                    if (loadOjbect == true) {
                        if (self.isAjaxActive() === true)
                            self.addToModifiedObjectIDs(objectID);
                        else
                            self.reloadObjectByID(objectID);
                    }
                }
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
                {
                    self.listView = null;
                    self.viewName = 'CallForTable';
                    self.listViewID = 'listView_' + ko.getNewID();
                    //
                    self.listViewInit = function (listView) {
                        self.listView = listView;
                        m_helpers.init(self, listView);
                        listView.load();
                    };
                    self.listViewRetrieveItems = function (startRecordIndex, countOfRecords) {
                        var retvalD = $.Deferred();
                        $.when(self.getObjectList(startRecordIndex, countOfRecords,null)).done(function (objectList) {
                            retvalD.resolve(objectList);
                        });
                        return retvalD.promise();
                    };
                    self.listViewRowClick = function (obj) {
                        var id = self.getMainObjectID(obj);
                        //
                        if (self.getRowByID) {
                            var row = self.getRowByID(id);
                            if (row != null)
                                self.setRowAsLoaded(row);
                        }
                        //
                        self.Load(id);
                    };
                    self.isAjaxActive = function () {
                        return self.ajaxControl.IsAcitve() == true;
                    };
                }
                //
                {//identification
                    self.getMainObjectID = function (obj) {
                        return obj.ID.toUpperCase();
                    };
                    self.getObjectClassID = function (obj) {
                        return 701;
                    };
                }
                //
                {//geting data             
                    self.loadObjectListByIDs = function (idArray, unshiftMode) {
                        var retvalD = $.Deferred();
                        for (var i = 0; i < idArray.length; i++)
                            idArray[i] = idArray[i].toUpperCase();
                        //
                        if (idArray.length > 0 && self.appendObjectList) {
                            $.when(self.getObjectList(0,0,idArray)).done(function (objectList) {
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
                    self.getObjectListByIDs = function (idArray, unshift) {
                    var retvalD = $.Deferred();
                    if (idArray.length > 0) {
                        $.when(self.getObjectList(0,0,idArray)).done(function (objectList) {
                            retvalD.resolve(objectList);
                        });
                    }
                    else
                        retvalD.resolve([]);
                    return retvalD.promise();
                    };
                    //
                    self.getObjectList = function (startRecordIndex, countOfRecords,idArray) {
                        var retvalD = $.Deferred();
                        //
                        var requestInfo = {
                            StartRecordIndex: startRecordIndex,
                            CountRecords: idArray ? idArray.length : countOfRecords,
                            IDList: idArray ? idArray : [],
                            TimezoneOffsetInMinutes: new Date().getTimezoneOffset(),
                            CurrentFilterID: self.userIDSearch ? self.userIDSearch : [],
                            ViewName: self.viewName,
                            ParentObjectID: null
                        };
                        self.IsExpanded(true);
                        self.ajaxControl.Ajax(null,
                            {
                                dataType: "json",
                                method: 'POST',
                                data: requestInfo,
                                url: 'sdApi/GetCallListUserSearch'
                            },
                            function (newVal) {
                                if (newVal && newVal.Result === 0) {
                                    var CheckVal = newVal.Data != null ? self.ChechDownloadUser(newVal.Data) : newVal.Data;
                                    if ((CheckVal != null ? CheckVal.length == 0 : false) && !self.IsExpandedCheck()) {
                                        self.IsExpanded(false);
                                    }
                                    self.IsExpandedCheck(true);
                                    retvalD.resolve(CheckVal);
                                }
                                else if (newVal && newVal.Result === 1)
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[ClientSearchCallList.js, LoadAction]', 'error');
                                        retvalD.resolve([]);
                                    });
                                else if (newVal && newVal.Result === 2)
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('BadParamsError') + '\n[ClientSearchCallList.js, LoadAction]', 'error');
                                        retvalD.resolve([]);
                                    });
                                else if (newVal && newVal.Result === 3)
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('AccessError'), 'error');
                                        retvalD.resolve([]);
                                    });
                                else
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[ClientSearchCallList.js, LoadAction]', 'error');
                                        retvalD.resolve([]);
                                    });
                            });
                        //
                        return retvalD.promise();
                    };
                }
                //
                {//open object form
                    self.Load = function (id) {
                        require(['sdForms'], function (module) {
                            var fh = new module.formHelper(true);
                            fh.ShowCallByContext(id);
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
                        var id = self.getMainObjectID(selected);
                        //     
                        self.Load(id);
                    };
                    //
                    var cmd = contextMenu.addContextMenuItem();
                    cmd.restext('Properties');
                    cmd.isEnable = isEnable;
                    cmd.isVisible = isVisible;
                    cmd.click(action);
                };
                self.propertiesObjectMenuItem = function (contextMenu) {
                    var isEnable = function () {
                        return self.getSelectedItems().length === 1;
                    };
                    var isVisible = function () {
                        var items = self.getSelectedItems();
                        if (items.length != 1)
                            return false;
                        var classID = items[0].ProductCatalogModelClassID;
                        return ((classID == 115 && self.propertiesContract_operation()) || (classID == 386 && self.propertiesAgreement_operation())) && items[0].ProductCatalogModelID != null;
                    };
                    var action = function () {
                        if (self.getSelectedItems().length != 1)
                            return false;
                        //
                        var selected = self.getSelectedItems()[0];
                        var id = selected.ProductCatalogModelID;
                        var classID = selected.ProductCatalogModelClassID;
                        //     
                        showSpinner();
                        require(['assetForms'], function (fhModule) {
                            var fh = new fhModule.formHelper(true);
                            if (classID == 115)
                                fh.ShowServiceContract(id);
                            else if (classID == 386)
                                fh.ShowServiceContractAgreement(id);
                            else
                                hideSpinner();
                        });
                    };
                    //
                    var cmd = contextMenu.addContextMenuItem();
                    cmd.restext('PropertiesObject');
                    cmd.isEnable = isEnable;
                    cmd.isVisible = isVisible;
                    cmd.click(action);
                };
            }

            $(document).bind('objectInserted', self.ListModified);
            $(document).bind('local_objectInserted', self.ListModified);
            m_Lazy.init(self);
        }
    };
    return module;
});
