define(['knockout',
    'jquery',
    'ajax',
    'iconHelper',
    'selectControl',
    'treeControl',
    'jqueryStepper',
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
        m_st,
        m_cells,
        m_helpers,
        m_lazyEvents) {
        var module = {
            MaxCount: 1000000,
            ViewModel: function ($region, activeRequestMode, hasLifeCycleOnly, modelSearchMode, productCatalogueItemInfo) {
                var self = this;
                self.isLoaded = $.Deferred();
                self.$region = $region;
                //
                {//interface
                    self.getPackedSelectedObjectList = function () {
                        return ko.toJS(self.selectedObjectList());
                    };
                    self.dispose = function () {
                        self.mode_handle.dispose();
                        //
                        self.lv_tabModel.dispose();
                    }
                }
                //
                {//modes
                    self.modes = {
                        tabModel: 'tabModel',
                        tabContract: 'tabContract',
                        tabResult: 'tabResult'
                    };
                    self.mode = ko.observable(null);
                    self.mode_handle = self.mode.subscribe(function (newValue) {
                        if (newValue == self.modes.tabModel)
                            self.initTabModel();
                        else if (newValue == self.modes.tabContract)
                            self.initTabContract();
                        else if (newValue == self.modes.tabResult)
                            self.initTabResult();
                    });
                }
                //
                {//tab helpers
                    self.initTabModel = function () {
                        var searcher = self.$region.find('.tabModelSearcher');
                        searcher.focus();
                        //
                        self.lv_tabModel.check();
                        self.treeFilterCheck_Model();
                    };
                    self.initTabContract = function () {
                        var searcher = self.$region.find('.tabContractSearcher');
                        searcher.focus();
                        //
                        self.lv_tabContract.check();
                        self.treeFilterCheck_Contract();
                    };
                    self.initTabResult = function () { };
                    //
                    self.selectedObjectList = ko.observableArray([]);
                    self.selectedObjectListCountString = ko.computed(function () {
                        var list = self.selectedObjectList();
                        if (list.length > 0)
                            return '(' + list.length + ')';
                        else
                            return '';
                    });
                    self.isTabResultVisible = ko.computed(function () {
                        if (modelSearchMode)
                            return false;
                        //
                        var list = self.selectedObjectList();
                        return (list.length > 0);
                    });
                    self.isTabContractVisible = ko.computed(function () {
                        return !modelSearchMode;
                    });
                    self.isSelectButtonVisible = ko.computed(function () {
                        var list = self.selectedObjectList();
                        return modelSearchMode ? list.length == 1 : list.length != 0;
                    });
                    //
                    self.checkedChanged = function () {
                        var objectList = [];
                        if (self.lv_tabModel.listView != null)
                            objectList = objectList.concat(self.lv_tabModel.listView.rowViewModel.checkedItemsToSubscribe());
                        //
                        for (var j = 0; j < self.selectedObjectList().length; j++) {
                            var obj = self.selectedObjectList()[j];
                            var exists = false;
                            for (var i = 0; i < objectList.length; i++) {
                                var obj1 = objectList[i];
                                if (obj1.ID.toUpperCase() == obj.ID.toUpperCase()) {
                                    exists = true;
                                    break;
                                }
                            }
                            if (exists == false) {
                                self.selectedObjectList().splice(j, 1);
                                j--;
                            }
                        }
                        for (var j = 0; j < objectList.length; j++) {
                            var obj = objectList[j];
                            var exists = false;
                            for (var i = 0; i < self.selectedObjectList().length; i++) {
                                var obj1 = self.selectedObjectList()[i];
                                if (obj1.ID.toUpperCase() == obj.ID.toUpperCase()) {
                                    exists = true;
                                    break;
                                }
                            }
                            if (exists == false) {
                                self.selectedObjectList().push(new module.ResultObject(obj));
                            }
                        }
                        self.selectedObjectList.valueHasMutated();
                    };
                    self.removeCheckedItem = function (vm, obj) {
                        self.selectedObjectList.splice(self.selectedObjectList().indexOf(vm), 1);
                        self.lv_tabModel.uncheckItem(vm.ID);
                        //
                        if (self.selectedObjectList().length == 0 && self.mode() == self.modes.tabResult)
                            self.mode(self.modes.tabModel);
                    };

                    //               
                    self.showForm = function (id, classID) {
                    };
                }
                //
                self.afterRender = function () {
                    self.isLoaded.resolve();
                    self.mode(self.modes.tabModel);
                };
                //
                {//tabModel
                    self.searchText_Model = ko.observable('');
                    self.searchText_Model_handle = self.searchText_Model.subscribe(function () {
                        self.lv_tabModel.waitAndReload();
                    });
                    self.treeClassID_Model = ko.observable(null);
                    self.treeID_Model = ko.observable(null);
                    self.treeID_Model_handle = self.treeID_Model.subscribe(function () {
                        self.lv_tabModel.waitAndReload();
                    });
                    //
                    self.lv_tabModel = new module.ListView(
                        'SoftwareLicenceModel',
                        'imApi/GetSoftwareModelSearchForTable',
                        self.searchText_Model,
                        self.treeClassID_Model,
                        self.treeID_Model,
                        null,
                        activeRequestMode,
                        hasLifeCycleOnly,
                        productCatalogueItemInfo,
                        self.checkedChanged);
                    //
                    self.tv_Model = null;
                    //дерево Навигатор по моделям ПО
                    self.treeFilterCheck_Model = function () {
                        var $tv = self.$region.find('.asset-link_paramsColumnProductCatalog');
                        //
                        if (!self.tv_Model) {
                            self.tv_Model = new treeLib.control();
                            let productCatalogType = 2;
                            self.tv_Model.init($tv, productCatalogType,
                                {
                                    onClick: function (node) {
                                        self.treeClassID_Model(node ? node.ClassID : null);
                                        self.treeID_Model(node ? node.ID : null);
                                        return true;
                                    },
                                    ShowCheckboxes: false,
                                    AvailableClassArray: [374, 378],
                                    ClickableClassArray: [378],
                                    FinishClassArray: [378],
                                    AllClickable: false,
                                    HasLifeCycle: false,
                                    AvailableTemplateClassArray: [183, 184, 185, 186, 187, 223]
                                }
                            );
                        }
                        //
                        $.when(self.tv_Model.$isLoaded).done(function () {
                            self.tv_Model.HeaderExpanded(true);
                        });
                    };
                }

                {//tabResult
                    self.showFormInResult = function (obj) {
                        self.showForm(obj.ID, obj.ClassID);
                    };
                }
            },
            ListView: function (
                viewName,
                url,
                ko_searchText,
                ko_treeClassID,
                ko_treeID,
                showObjectForm,
                activeRequestMode,
                hasLifeCycleOnly,
                productCatalogueItemInfo,
                checkedChanged) {
                var self = this;
                //
                {//дергается извне
                    self.isLoaded = ko.observable(false);
                    self.check = function () {
                        if (!self.isLoaded()) {
                            if (self.listView != null) {
                                self.listView.load();
                            }
                            self.isLoaded(true);
                        }
                    };
                    self.wait_timeout = null;
                    self.waitAndReload = function () {
                        clearTimeout(self.wait_timeout);
                        self.wait_timeout = setTimeout(function () {
                            if (self.listView == null)
                                self.check();
                            else self.listView.load();
                        }, 500);
                    };
                    self.dispose = function () {
                        $(document).unbind('objectInserted', self.onObjectInserted);
                        $(document).unbind('local_objectInserted', self.onObjectInserted);
                        $(document).unbind('objectUpdated', self.onObjectModified);
                        $(document).unbind('local_objectUpdated', self.onObjectModified);
                        $(document).unbind('objectDeleted', self.onObjectDeleted);
                        $(document).unbind('local_objectDeleted', self.onObjectDeleted);
                        //
                        if (self.checkedItems_handle)
                            self.checkedItems_handle.dispose();
                        if (self.listViewContextMenu() != null)
                            self.listViewContextMenu().dispose();
                        if (self.listView != null)
                            self.listView.dispose();
                        self.ajaxControl.Abort();
                    };
                    self.dispose = function () {

                    };
                    self.uncheckItem = function (id) {
                        if (self.listView == null)
                            return;
                        var checkedItems = self.listView.rowViewModel.checkedItems();
                        for (var i = 0; i < checkedItems.length; i++)
                            if (checkedItems[i].ID.toUpperCase() == id.toUpperCase()) {
                                checkedItems.splice(i, 1);
                                self.listView.rowViewModel.checkedItems(checkedItems);
                                break;
                            }
                    };
                }
                //
                {//ko.listView
                    {//events of listView
                        self.viewName = viewName;
                        self.listView = null;
                        self.listViewContextMenu = ko.observable(null);
                        //
                        self.listViewInit = function (listView) {
                            self.listView = listView;
                            self.checkedItems_handle = listView.rowViewModel.checkedItemsToSubscribe.subscribe(function (objectList) {
                                checkedChanged();
                            });

                            m_helpers.init(self, listView);//extend self

                            //
                            if (self.isLoaded() == true) {
                                listView.load();
                            }
                        };
                        self.listViewRetrieveVirtualItems = function (startRecordIndex, countOfRecords) {
                            var retvalD = $.Deferred();
                            $.when(self.getObjectList(startRecordIndex, countOfRecords, null, true)).done(function (objectList) {
                                retvalD.resolve(objectList);
                            });
                            return retvalD.promise();
                        };
                        self.listViewRowClick = function (obj) {
                            showObjectForm(obj);
                        };
                    }
                    //
                    {//geting data 
                        self.getObjectID = function (obj) {
                            return obj.ID.toUpperCase();
                        };                       
                        
                        self.loadObjectListByIDs = function (idArray, unshiftMode) {
                            for (var i = 0; i < idArray.length; i++)
                                idArray[i] = idArray[i].toUpperCase();
                            //
                            var retvalD = $.Deferred();
                            if (idArray.length > 0) {
                                $.when(self.getObjectList(0, 0, idArray, false)).done(function (objectList) {
                                    if (objectList)
                                        self.appendObjectList(objectList, unshiftMode);
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
                                $.when(self.getObjectList(idArray, false)).done(function (objectList) {
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
                        self.getObjectList = function (startRecordIndex, countOfRecords, idArray, showErrors) {
                            var retvalD = $.Deferred();
                            //

                            var requestInfo = {
                                StartRecordIndex: idArray ? 0 : startRecordIndex,
                                CountRecords: idArray ? idArray.length : countOfRecords,
                                IDList: idArray ? idArray : [],
                                ViewName: self.viewName,
                                TimezoneOffsetInMinutes: new Date().getTimezoneOffset(),//not used in this request
                                CurrentFilterID: null,
                                WithFinishedWorkflow: null,
                                AfterModifiedMilliseconds: null,
                                TreeSettings: null,
                                SearchRequest: ko_searchText(),
                                ProductCatalogID: ko_treeID(),
                                ProductCatalogClassID: ko_treeClassID(),
                                TypeID: productCatalogueItemInfo ? productCatalogueItemInfo.TypeID : null,
                                CategoryID: productCatalogueItemInfo ? productCatalogueItemInfo.CategoryID : null,
                                TemplateClassID: productCatalogueItemInfo ? productCatalogueItemInfo.TemplateClassID : null,
                                ActiveRequest: activeRequestMode,
                                HasLifeCycle: hasLifeCycleOnly,
                            };

                            self.ajaxControl.Ajax(null,
                                {
                                    dataType: "json",
                                    method: 'POST',
                                    data: requestInfo,
                                    url: url
                                },
                                function (newVal) {
                                    if (newVal && newVal.Result === 0) {
                                        retvalD.resolve(newVal.Data);//can be null, if server canceled request, because it has a new request                               
                                        return;
                                    }
                                    else if (newVal && newVal.Result === 1 && showErrors === true) {
                                        require(['sweetAlert'], function () {
                                            swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[AssetModelLink.js getObjectList]', 'error');
                                        });
                                    }
                                    else if (newVal && newVal.Result === 2 && showErrors === true) {
                                        require(['sweetAlert'], function () {
                                            swal(getTextResource('ErrorCaption'), getTextResource('BadParamsError') + '\n[AssetModelLink.js getObjectList]', 'error');
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
                                            swal(getTextResource('ErrorCaption'), getTextResource('AjaxError') + '\n[AssetModelLink.js getObjectList]', 'error');
                                        });
                                    }
                                    //
                                    retvalD.resolve([]);
                                },
                                function (XMLHttpRequest, textStatus, errorThrown) {
                                    if (showErrors === true)
                                        require(['sweetAlert'], function () {
                                            swal(getTextResource('ErrorCaption'), getTextResource('AjaxError') + '\n[AssetModelLink.js, getObjectList]', 'error');
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
                }
                //
                {//granted operations
                    self.grantedOperations = [];
                    $.when(userD).done(function (user) {
                        self.grantedOperations = user.GrantedOperations;
                    });
                    self.operationIsGranted = function (operationID) {
                        for (var i = 0; i < self.grantedOperations.length; i++)
                            if (self.grantedOperations[i] === operationID)
                                return true;
                        return false;
                    };
                }
                //
                {//ko.contextMenu
                    self.contextMenuInit = function (contextMenu) {
                        self.listViewContextMenu(contextMenu);//bind contextMenu
                        //
                        self.properties(contextMenu);
                        contextMenu.addSeparator();
                        self.addAgreement(contextMenu);
                    };
                    self.contextMenuOpening = function (contextMenu) {
                        contextMenu.items().forEach(function (item) {
                            if (item.isEnable && item.isVisible) {
                                item.enabled(item.isEnable());
                                item.visible(item.isVisible());
                            }
                        });
                        //
                        if (contextMenu.visibleItems().length == 0)
                            contextMenu.close();
                    };
                }
                //
                {//helper methods
                    self.getSelectedItems = function () {
                        var selectedItems = self.listView.rowViewModel.checkedItems();
                        return selectedItems;
                    };
                }
                //
                {//menu operations               
                    self.addAgreement = function (contextMenu) {
                        var isEnable = function () {
                            return self.getSelectedItems().length === 1;
                        };
                        var isVisible = function () {
                            var items = self.getSelectedItems();
                            if (items.length == 1) {
                                var classID = items[0].ClassID;
                                if (classID == 115 && self.operationIsGranted(873) && items[0].CanCreateAgreement == true && items[0].AgreementID == null)//OPERATION_ServiceContractAgreement_Add = 873
                                    return true;
                            }
                            return false;
                        };
                        var action = function () {
                            if (self.getSelectedItems().length != 1)
                                return false;
                            //
                            var selected = self.getSelectedItems()[0];
                            var classID = selected.ClassID;
                            var id = selected.ID.toUpperCase();
                            if (classID == 115 && selected.CanCreateAgreement == true) {
                                showSpinner();
                                require(['assetForms'], function (module) {
                                    var fh = new module.formHelper(true);
                                    fh.ShowServiceContractAgreement(null, id);
                                });
                            }
                        };
                        //
                        var cmd = contextMenu.addContextMenuItem();
                        cmd.restext('ContractAgreement_CreateFromContract');
                        cmd.isEnable = isEnable;
                        cmd.isVisible = isVisible;
                        cmd.click(action);
                    };
                    //
                    self.properties = function (contextMenu) {
                        var isEnable = function () {
                            return self.getSelectedItems().length === 1;
                        };
                        var isVisible = function () {
                            var retval = true;
                            self.getSelectedItems().forEach(function (el) {
                                var classID = el.ClassID;
                                if ((classID == 115 && !self.operationIsGranted(211)) ||
                                    (classID == 386 && !self.operationIsGranted(872)))
                                    retval = false;
                            });
                            return retval;
                        };
                        var action = function () {
                            if (self.getSelectedItems().length != 1)
                                return false;
                            //
                            var selected = self.getSelectedItems()[0];
                            showObjectForm(selected);
                        };
                        //
                        var cmd = contextMenu.addContextMenuItem();
                        cmd.restext('Properties');
                        cmd.isEnable = isEnable;
                        cmd.isVisible = isVisible;
                        cmd.click(action);
                    };
                }
                //
                {//server and local(only this browser tab) events                               
                    self.onObjectInserted = function (e, objectClassID, objectID, parentObjectID) {
                        objectID = objectID.toUpperCase();
                        self.reloadObjectByID(objectID);
                    };
                    //
                    self.onObjectModified = function (e, objectClassID, objectID, parentObjectID) {
                        objectID = objectID.toUpperCase();
                        var row = self.getRowByID(objectID);
                        if (row == null)
                            self.checkAvailabilityID(objectID);
                        else
                            self.reloadObjectByID(objectID);
                    };
                    //
                    self.onObjectDeleted = function (e, objectClassID, objectID, parentObjectID) {
                        objectID = objectID.toUpperCase();
                        //
                        self.removeRowByID(objectID);
                        self.clearInfoByObject(objectID);
                    };
                    //
                    $(document).bind('objectInserted', self.onObjectInserted);
                    $(document).bind('local_objectInserted', self.onObjectInserted);
                    $(document).bind('objectUpdated', self.onObjectModified);
                    $(document).bind('local_objectUpdated', self.onObjectModified);
                    $(document).bind('objectDeleted', self.onObjectDeleted);
                    $(document).bind('local_objectDeleted', self.onObjectDeleted);
                }
                //
                m_lazyEvents.init(self);//extend self
                //Переопределяем функцию, т.к. в этом списке нет информации о новых объектах
                self.addToModifiedObjectIDs = function (objectID) {
                    self.reloadObjectByID(objectID);
                };
            },

            //Заполнение результата выбора на форме
            ResultObject: function (obj) {
                var self = this;

                self.ID = obj.ID;
                self.ManufacturerID = obj.ManufacturerID;
                self.ManufacturerName = obj.ManufacturerName;

                //SoftwareLicenceModel.Name
                self.Name = obj.Name;
                self.SoftwareLicenceModelID = obj.SoftwareLicenceModelID;

                self.SoftwareTypeID = obj.SoftwareTypeID;
                self.SoftwareTypeName = obj.SoftwareTypeName;

                //SoftwareModel.Name
                self.SoftwareModelName = obj.SoftwareModelName;
                self.SoftwareModelID = obj.SoftwareModelID;

                self.ProductCatalogTypeID = obj.ProductCatalogTypeID;

                self.SoftwareLicenceType = obj.SoftwareLicenceType;
                self.SoftwareLicenceTypeName = obj.SoftwareLicenceTypeName;

                self.SoftwareLicenceScheme = obj.SoftwareLicenceScheme;
                self.SoftwareLicenceSchemeName = obj.SoftwareLicenceSchemeName;

                self.SoftwareExecutionCount = obj.SoftwareExecutionCount;
                self.LimitInHours = obj.LimitInHours;
                self.DowngradeAvailable = obj.DowngradeAvailable;
                self.IsFull = obj.IsFull;

                //Не задано
                self.SoftwareExecutionCountIsNotDefined = obj.SoftwareExecutionCountIsNotDefined;
                //Без ограничений
                self.SoftwareExecutionUnlimited = obj.SoftwareExecutionUnlimited;
                //Задано
                self.SoftwareExecutionCountSet = obj.SoftwareExecutionCountSet;

                self.ProductCatalogCategoryName = obj.ProductCatalogCategoryName;
                self.ProductCatalogTemplate = obj.ProductCatalogTemplate;

                self.Note = obj.Note;
            }
        }
        return module;
    });