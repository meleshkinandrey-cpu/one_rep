define(['knockout', 'jquery', 'ajax', 'models/FinanceForms/PurchaseSpecification', 'ui_controls/ListView/ko.ListView.Cells', 'ui_controls/ListView/ko.ListView.Helpers', 'ui_controls/ListView/ko.ListView', 'ui_controls/ContextMenu/ko.ContextMenu'], function (ko, $, ajaxLib, specLib, m_cells, m_helpers) {
    var module = {
        //сущность knockout, идентификатор класса сущности, селектор ajax-крутилки
        LinkList: function (ko_object, objectClassID, ajaxSelector, readOnly_object, canEdit_object, $region) {
            var self = this;
            //
            {//дергается извне
                self.isLoaded = ko.observable(false);//факт загруженности данных для объекта ko_object()
                self.CheckData = function () {//функция загрузки списка (грузится только раз).
                    if (!self.isLoaded()) {
                        $.when(operationIsGrantedD(833), operationIsGrantedD(834), operationIsGrantedD(832), operationIsGrantedD(835), operationIsGrantedD(211), operationIsGrantedD(872)).
                            done(function (ps_add, ps_delete, ps_properties, ps_update, ps_propertiesContract, ps_propertiesAgreement) {
                                self.add_operation(ps_add);
                                self.delete_operation(ps_delete);
                                self.properties_operation(ps_properties);
                                self.propertiesContract_operation(ps_propertiesContract);
                                self.propertiesAgreement_operation(ps_propertiesAgreement);
                                self.update_operation(ps_update);
                            });
                        if (self.listView != null)
                            self.listView.load();
                        self.LoadNDSTotalValues();
                        self.isLoaded(true);
                    }
                };
                self.ClearData = function () {//функция сброса данных
                    self.isLoaded(false);
                };
                self.Dispose = function () {
                    if (self.listViewContextMenu() != null)
                        self.listViewContextMenu().dispose();
                    if (self.listView != null)
                        self.listView.dispose();
                    self.ShowWithDeclined_handle.dispose();
                    //
                    self.ajaxControlTotalValues.Abort();
                    self.TotalCostWithNDSString.dispose();
                    self.TotalCostWithoutNDSString.dispose();
                    self.TotalSumNDSString.dispose();
                };
            }
            //
            //
            {//строка состояния
                self.TotalCostWithNDS = ko.observable(null);
                self.TotalCostWithNDSString = ko.computed(function () {
                    return specLib.ToMoneyString(self.TotalCostWithNDS(), ',');
                });
                self.TotalCostWithoutNDS = ko.observable(null);
                self.TotalCostWithoutNDSString = ko.computed(function () {
                    return specLib.ToMoneyString(self.TotalCostWithoutNDS(), ',');
                });
                self.TotalSumNDS = ko.observable(null);
                self.TotalSumNDSString = ko.computed(function () {
                    return specLib.ToMoneyString(self.TotalSumNDS(), ',');
                });
                //
                self.ajaxControlTotalValues = new ajaxLib.control();
                self.LoadNDSTotalValues = function () {
                    var param = {
                        workOrderID: ko_object().ID(),
                    };
                    //
                    self.ajaxControlTotalValues.Ajax($(ajaxSelector),
                    {
                        dataType: "json",
                        method: 'GET',
                        url: 'finApi/GetPurchaseSpecificationNDSTotalValues?' + $.param(param)
                    },
                    function (newVal) {
                        if (newVal && newVal.Result === 0) {
                            self.TotalCostWithoutNDS(newVal.CostWithoutNDS);
                            self.TotalCostWithNDS(newVal.CostWithNDS);
                            self.TotalSumNDS(newVal.SumNDS);
                        }
                    });
                };
            }
            //
            {//фильтр списка
                self.ShowWithDeclined = ko.observable(false);
                self.ShowWithDeclined_handle = self.ShowWithDeclined.subscribe(function (newVal) {
                    if (self.listView != null)
                        self.listView.load();
                    self.LoadNDSTotalValues();
                });
            }
            //
            {//ko.listView
                {//events of listView
                    self.viewName = 'PurchaseSpecificationSearch';
                    self.listView = null;
                    //
                    self.listViewInit = function (listView) {
                        self.listView = listView;
                        m_helpers.init(self, listView);//extend self
                        // 
                        if (self.isLoaded() == true)
                            listView.load();
                    };
                    self.listViewRetrieveVirtualItems = function (startRecordIndex, countOfRecords) {
                        var retvalD = $.Deferred();
                        $.when(self.getObjectList(startRecordIndex, countOfRecords, null, true)).done(function (objectList) {
                            retvalD.resolve(objectList);
                        });
                        return retvalD.promise();
                    };
                    self.listViewRowClick = function (obj) {
                        var classID = self.getObjectClassID(obj);
                        var id = self.getMainObjectID(obj);
                        //
                        self.showObjectForm(classID, id);
                    };
                }
                //
                {//identification
                    self.getObjectID = function (obj) {
                        return obj.ID.toUpperCase();
                    };
                    self.getMainObjectID = function (obj) {
                        return obj.ID.toUpperCase();
                    };
                    self.getObjectClassID = function (obj) {
                        return 381; //OBJ_PurchaseSpecification
                    };
                }
                //
                {//geting data             
                    self.loadObjectListByIDs = function (idArray, unshiftMode) {
                        var retvalD = $.Deferred();
                        if (self.ajaxControl.IsAcitve()) {
                            var handle = null;
                            handle = self.ajaxControl.IsAcitve.subscribe(function (newValue) {
                                if (newValue == false) {
                                    handle.dispose();
                                    $.when(self.loadObjectListByIDs(idArray, unshiftMode)).done(function (objectList) {
                                        retvalD.resolve(objectList);
                                    });
                                }                                
                            });
                            return retvalD.promise();
                        }
                        for (var i = 0; i < idArray.length; i++)
                            idArray[i] = idArray[i].toUpperCase();
                        //
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
                    //
                    self.ajaxControl = new ajaxLib.control();
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
                            SearchRequest: null,
                            TypeID: null,
                            ModelsID: [],
                            VendorsID: null,
                            LocationID: null,
                            LocationClassID: null,
                            ParentObjectID: ko_object().ID(),
                            Mode: self.ShowWithDeclined() == true ? 1 /*PurchaseSpecificationTableMode.ShowAll*/ : 2 /*PurchaseSpecificationTableMode.NotShowDeclined*/,
                        };
                        self.ajaxControl.Ajax(null,
                            {
                                dataType: "json",
                                method: 'POST',
                                data: requestInfo,
                                url: 'finApi/GetPurchaseSpecificationListForTable'
                            },
                            function (newVal) {
                                if (newVal && newVal.Result === 0) {
                                    retvalD.resolve(newVal.Data);//can be null, if server canceled request, because it has a new request                               
                                    return;
                                }
                                else if (newVal && newVal.Result === 1 && showErrors === true) {
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[PurchaseSpecificationList.js getObjectList]', 'error');
                                    });
                                }
                                else if (newVal && newVal.Result === 2 && showErrors === true) {
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('BadParamsError') + '\n[PurchaseSpecificationList.js getObjectList]', 'error');
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
                                        swal(getTextResource('ErrorCaption'), getTextResource('AjaxError') + '\n[PurchaseSpecificationList.js getObjectList]', 'error');
                                    });
                                }
                                //
                                retvalD.resolve([]);
                            },
                            function (XMLHttpRequest, textStatus, errorThrown) {
                                if (showErrors === true)
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('AjaxError') + '\n[PurchaseSpecificationList.js, getObjectList]', 'error');
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
                {//open object form
                    self.showObjectForm = function (classID, id) {
                        if (!self.properties_operation())
                            return;
                        //
                        var data = {
                            'WorkOrderID': ko_object().ID(),
                            'SpecificationID': id
                        };
                        //
                        self.ajaxControl.Ajax($(ajaxSelector),
                        {
                            dataType: "json",
                            method: 'GET',
                            data: data,
                            url: 'finApi/GetPurchaseSpecification'
                        },
                        function (newVal) {
                            if (newVal && newVal.Result === 0) {
                                var newValue = newVal.Elem;
                                var spec = new specLib.Specification(null, newValue);
                                //
                                self.DoShowObjectForm(spec);
                            }
                        });
                    };                 

                    self.DoShowObjectForm = function (specification) {//отображает форму элемента списка                                    
                        showSpinner();
                        require(['financeForms'], function (module) {
                            var fh = new module.formHelper(true);
                            //call func
                            var p = ko.toJS(specification);
                            //
                            var computedCanEdit = ko.computed(function () {
                                if (canEdit_object() == false)
                                    return false;
                                //
                                if (p.State !== 0)//IS_FORMED
                                    return false;

                                if (!self.update_operation())
                                    return false;
                                //
                                return true;
                            });
                            //
                            fh.ShowPurchaseSpecification(p, computedCanEdit, function (newData) {
                                if (!newData)
                                    return;
                                //
                                var data = newData;
                                data.Operation = 0; // EDIT
                                //
                                self.ajaxControl.Ajax($(ajaxSelector),
                                    {
                                        dataType: "json",
                                        method: 'POST',
                                        data: data,
                                        url: 'finApi/EditPurchaseSpecification'
                                    },
                                    function (answer) {
                                        if (answer && answer.Response) {
                                            var result = answer.Response.Result;
                                            if (result === 0) {
                                                var newModel = answer.NewModel;
                                                //
                                                self.loadObjectListByIDs([newModel.ID], false);
                                                self.LoadNDSTotalValues();
                                                self.listView.load();
                                            }
                                            else if (result === 1)
                                                require(['sweetAlert'], function () {
                                                    swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[FinanceForms.PurchaseSpecificationList.js, DoShowObjectForm]', 'error');
                                                });
                                            else if (result === 2)
                                                require(['sweetAlert'], function () {
                                                    swal(getTextResource('ErrorCaption'), getTextResource('BadParamsError') + '\n[FinanceForms.PurchaseSpecificationList.js, DoShowObjectForm]', 'error');
                                                });
                                            else if (result === 3)
                                                require(['sweetAlert'], function () {
                                                    swal(getTextResource('ErrorCaption'), getTextResource('AccessError'), 'error');
                                                });
                                            else if (result === 5)
                                                require(['sweetAlert'], function () {
                                                    swal(getTextResource('ErrorCaption'), getTextResource('ConcurrencyErrorWithoutQuestion'), 'error');
                                                });
                                            else if (result === 6)
                                                require(['sweetAlert'], function () {
                                                    swal(getTextResource('ErrorCaption'), getTextResource('ObjectDeleted'), 'error');
                                                    self.listView.load();
                                                });
                                            else if (result === 8)
                                                require(['sweetAlert'], function () {
                                                    swal(getTextResource('ErrorCaption'), getTextResource('ValidationError'), 'error');
                                                });
                                            else
                                                require(['sweetAlert'], function () {
                                                    swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[FinanceForms.PurchaseSpecificationList.js, DoShowObjectForm]', 'error');
                                                });
                                        }
                                        else
                                            require(['sweetAlert'], function () {
                                                swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[FinanceForms.PurchaseSpecificationList.js, DoShowObjectForm]', 'error');
                                            });
                                    });
                            });
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
                    self.propertiesObjectMenuItem(contextMenu);
                    self.markAsExecutedMenuItem(contextMenu);
                    contextMenu.addSeparator();
                    self.addMenuItem(contextMenu);
                    self.addMenuItemFromARS(contextMenu);
                    self.removeMenuItem(contextMenu);
                };
                self.contextMenuOpening = function (contextMenu) {
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
                self.add_operation = ko.observable(false);
                self.properties_operation = ko.observable(false);
                self.propertiesContract_operation = ko.observable(false);
                self.propertiesAgreement_operation = ko.observable(false);
                self.delete_operation = ko.observable(false);
                self.update_operation = ko.observable(false);
                //
                self.add_operationClick = function () {
                    showSpinner();
                    require(['assetForms'], function (module) {
                        var fh = new module.formHelper(true);
                        //
                        fh.ShowAssetModelLink(
                         false, true,
                         function (newValues) {
                             if (!newValues || newValues.length == 0)
                                 return;
                             //
                             var retval = [];
                             ko.utils.arrayForEach(newValues, function (el) {
                                 if (el && el.ID)
                                     retval.push({ ModelID: el.ID, ModelClassID: el.ClassID, Count: el.Count });
                             });
                             //
                             var data = {
                                 'ObjectClassID': objectClassID,
                                 'ObjectID': ko_object().ID(),
                                 'ModelsList': retval
                             };
                             //
                             self.ajaxControl.Ajax($(ajaxSelector),
                                 {
                                     dataType: "json",
                                     method: 'POST',
                                     data: data,
                                     url: 'finApi/AddPurchaseSpecificationListFromCatalogue'
                                 },
                                 function (model) {
                                     if (model.Result === 0) {
                                         var specList = model.List;
                                         if (specList) {
                                             var ids = [];
                                             ko.utils.arrayForEach(specList, function (item) {
                                                 ids.push(item.ID);
                                             });
                                             self.loadObjectListByIDs(ids, false);
                                             self.LoadNDSTotalValues();
                                         }
                                     }
                                     else {
                                         if (model.Result === 1) {
                                             require(['sweetAlert'], function () {
                                                 swal(getTextResource('SaveError'), getTextResource('NullParamsError') + '\n[FinanceForms.PurchaseSpecificationList.js, add_operationClick]', 'error');
                                             });
                                         }
                                         else if (model.Result === 2) {
                                             require(['sweetAlert'], function () {
                                                 swal(getTextResource('SaveError'), getTextResource('BadParamsError') + '\n[FinanceForms.PurchaseSpecificationList.js, add_operationClick]', 'error');
                                             });
                                         }
                                         else if (model.Result === 3) {
                                             require(['sweetAlert'], function () {
                                                 swal(getTextResource('SaveError'), getTextResource('AccessError'), 'error');
                                             });
                                         }
                                         else if (model.Result === 8) {
                                             require(['sweetAlert'], function () {
                                                 swal(getTextResource('SaveError'), getTextResource('ValidationError'), 'error');
                                             });
                                         }
                                         else {
                                             require(['sweetAlert'], function () {
                                                 swal(getTextResource('SaveError'), getTextResource('GlobalError') + '\n[FinanceForms.PurchaseSpecificationList.js, add_operationClick]', 'error');
                                             });
                                         }
                                     }
                                 });
                         });
                    });
                };
                self.addFromARS_operationClick = function () {
                    showSpinner();
                    require(['financeForms'], function (module) {
                        var fh = new module.formHelper(true);
                        fh.ShowActivesRequestSpecificationSearch({
                            ClassID: objectClassID,
                            ID: ko_object().ID(),
                            PurchaseLink: true,
                        }, function (newValues, createSingle, defaultModelID, defaultModelClassID) {
                            if (!newValues || newValues.length == 0)
                                return;
                            //
                            var retval = [];
                            ko.utils.arrayForEach(newValues, function (el) {
                                if (el && el.ID && el.ProductCatalogModelID)
                                    retval.push({
                                        ModelID: el.ProductCatalogModelID,
                                        ModelClassID: el.ProductCatalogModelClassID,
                                        Count: el.Count,
                                        ObjectID: el.ID,
                                        ObjectClassID: el.ClassID,
                                        UnitID: el.UnitID,
                                        UnitName: el.UnitName
                                    });
                            });
                            //
                            var options = {
                                DefaultModelID: defaultModelID,
                                DefaultModelClassID: defaultModelClassID,
                                CreateSingleSpecification: createSingle
                            };
                            //
                            var data = {
                                'ObjectClassID': objectClassID,
                                'ObjectID': ko_object().ID(),
                                'ModelsList': retval,
                                'Options': options
                            };
                            //
                            self.ajaxControl.Ajax($(ajaxSelector),
                                {
                                    dataType: "json",
                                    method: 'POST',
                                    data: data,
                                    url: 'finApi/AddPurchaseSpecificationListFromObject'
                                },
                                function (model) {
                                    if (model.Result === 0) {
                                        var specList = model.List;
                                        if (specList) {
                                            var ids = [];
                                            ko.utils.arrayForEach(specList, function (item) {
                                                ids.push(item.ID);
                                            });
                                            self.loadObjectListByIDs(ids, false);
                                            self.LoadNDSTotalValues();
                                        }
                                    }
                                    else {
                                        if (model.Result === 1) {
                                            require(['sweetAlert'], function () {
                                                swal(getTextResource('SaveError'), getTextResource('NullParamsError') + '\n[FinanceForms.PurchaseSpecificationList.js, addFromARS_operationClick]', 'error');
                                            });
                                        }
                                        else if (model.Result === 2) {
                                            require(['sweetAlert'], function () {
                                                swal(getTextResource('SaveError'), getTextResource('BadParamsError') + '\n[FinanceForms.PurchaseSpecificationList.js, addFromARS_operationClick]', 'error');
                                            });
                                        }
                                        else if (model.Result === 3) {
                                            require(['sweetAlert'], function () {
                                                swal(getTextResource('SaveError'), getTextResource('AccessError'), 'error');
                                            });
                                        }
                                        else if (model.Result === 8) {
                                            require(['sweetAlert'], function () {
                                                swal(getTextResource('SaveError'), getTextResource('ValidationError'), 'error');
                                            });
                                        }
                                        else {
                                            require(['sweetAlert'], function () {
                                                swal(getTextResource('SaveError'), getTextResource('GlobalError') + '\n[FinanceForms.PurchaseSpecificationList.js, addFromARS_operationClick]', 'error');
                                            });
                                        }
                                    }
                                });
                        });
                    });
                };
                //
                self.markAsExecutedMenuItem = function (contextMenu) {
                    var isEnable = function () {
                        return self.getSelectedItems().length === 1;
                    };
                    var isVisible = function () {
                        var items = self.getSelectedItems();
                        return self.update_operation() == true && items.length == 1 && (items[0].ProductCatalogModelClassID == 115 || items[0].ProductCatalogModelClassID == 386) && items[0].State == 1;//contract or agreement + state == purchasing
                    };
                    var action = function () {
                        if (self.getSelectedItems().length != 1)
                            return false;
                        //
                        var selected = self.getSelectedItems()[0];
                        var id = self.getMainObjectID(selected);
                        //     
                        require(['financeForms'], function (module) {
                            var fh = new module.formHelper(true);
                            fh.ShowExecutePurchaseSpecification(id);
                        });
                    };
                    //
                    var cmd = contextMenu.addContextMenuItem();
                    cmd.restext('PurchaseSpecification_MarkAsExecuted');
                    cmd.isEnable = isEnable;
                    cmd.isVisible = isVisible;
                    cmd.click(action);
                };
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
                        var classID = self.getObjectClassID(selected);
                        //     
                        self.showObjectForm(classID, id);
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
                self.addMenuItem = function (contextMenu) {
                    var isEnable = function () {
                        return true;
                    };
                    var isVisible = function () {
                        return self.add_operation() && canEdit_object();
                    };
                    //
                    var cmd = contextMenu.addContextMenuItem();
                    cmd.restext('AddPurchaseSpecificationFromCatalog');
                    cmd.isEnable = isEnable;
                    cmd.isVisible = isVisible;
                    cmd.click(self.add_operationClick);
                };
                self.addMenuItemFromARS = function (contextMenu) {
                    var isEnable = function () {
                        return true;
                    };
                    var isVisible = function () {
                        return self.add_operation() && canEdit_object();
                    };
                    //
                    var cmd = contextMenu.addContextMenuItem();
                    cmd.restext('AddPurchaseSpecificationFromARS');
                    cmd.isEnable = isEnable;
                    cmd.isVisible = isVisible;
                    cmd.click(self.addFromARS_operationClick);
                };
                self.removeMenuItem = function (contextMenu) {
                    var isEnable = function () {
                        return self.getSelectedItems().length > 0;
                    };
                    var isVisible = function () {
                        return self.delete_operation() && canEdit_object();
                    };
                    var action = function () {
                        var list = self.getSelectedItems();
                        if (list.length == 0)
                            return;
                        //     
                        require(['sweetAlert'], function () {
                            var nameList = self.getConcatedItemNames(list);
                            swal({
                                title: getTextResource('PurchaseSpecificationOperationCaption'),
                                text: getTextResource('PurchaseSpecificationDeleteQuestion') + ' ' + nameList,
                                showCancelButton: true,
                                closeOnConfirm: false,
                                closeOnCancel: true,
                                confirmButtonText: getTextResource('ButtonOK'),
                                cancelButtonText: getTextResource('ButtonCancel')
                            },
                            function (value) {
                                if (value == true) {
                                    var idList = self.getItemIDs(list);
                                    var data = {
                                        IDList: idList,
                                        WorkOrderID: ko_object().ID()
                                    };
                                    self.ajaxControl.Ajax($(ajaxSelector),
                                        {
                                            dataType: "json",
                                            method: 'POST',
                                            data: data,
                                            url: 'finApi/RemovePurchaseSpecification'
                                        },
                                        function (Result) {
                                            if (Result === 0) {
                                                for (var i = 0; i < idList.length; i++)
                                                    self.removeRowByID(idList[i]);
                                                //
                                                self.LoadNDSTotalValues();
                                                swal.close();
                                            } else if (Result === 1)
                                                require(['sweetAlert'], function () {
                                                    swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[FinanceForms.PurchaseSpecificationList.js, removeMenuItem]', 'error');
                                                });
                                            else if (Result === 2)
                                                require(['sweetAlert'], function () {
                                                    swal(getTextResource('ErrorCaption'), getTextResource('BadParamsError') + '\n[FinanceForms.PurchaseSpecificationList.js, removeMenuItem]', 'error');
                                                });
                                            else if (Result === 3)
                                                require(['sweetAlert'], function () {
                                                    swal(getTextResource('ErrorCaption'), getTextResource('AccessError'), 'error');
                                                });
                                            else if (Result === 5)
                                                require(['sweetAlert'], function () {
                                                    swal(getTextResource('ErrorCaption'), getTextResource('ConcurrencyErrorWithoutQuestion'), 'error');
                                                });
                                            else if (Result === 6)
                                                require(['sweetAlert'], function () {
                                                    swal(getTextResource('ErrorCaption'), getTextResource('ObjectDeleted'), 'error');
                                                    self.listView.load();
                                                });
                                            else if (Result === 8)
                                                require(['sweetAlert'], function () {
                                                    swal(getTextResource('ErrorCaption'), getTextResource('ValidationError'), 'error');
                                                });
                                            else
                                                require(['sweetAlert'], function () {
                                                    swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[FinanceForms.PurchaseSpecificationList.js, removeMenuItem]', 'error');
                                                });
                                        });
                                }
                            });
                        });
                    };
                    //
                    var cmd = contextMenu.addContextMenuItem();
                    cmd.restext('ActionRemove');
                    cmd.isEnable = isEnable;
                    cmd.isVisible = isVisible;
                    cmd.click(action);
                };
            }
        }
    };
    return module;
});
