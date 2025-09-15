define(['knockout', 'jquery', 'ajax', 'ttControl', 'models/SDForms/SDForm.LinkList', 'models/SDForms/SDForm.NegotiationList', 'models/SDForms/SDForm.Tape', 'models/FinanceForms/ActivesRequestSpecification', 'models/FinanceForms/ActivesRequestSpecificationList', 'models/FinanceForms/PurchaseSpecificationList', 'models/FinanceForms/Budget/FinanceBudgetRowList', 'models/FinanceForms/GoodsInvoiceList', 'models/FinanceForms/ActivesLocation/ActivesLocationControl', 'parametersControl', 'ui_forms/SD/InventorySpecificationControl', 'comboBox'],
    function (ko, $, ajaxLib, tclib, linkListLib, negotiationListLib, tapeLib, specLib, ar_specificationsListLib, pu_specificationsListLib, financeBudgetRowListLib, pu_invoiceListLib, pu_activesLocationLib, pcLib, inventory_specificationControlLib) {
    var module = {
        ViewModel: function (isReadOnly, $region, id) {
            //PROPERTIES AND ENUMS BLOCK
            var self = this;
            var $isLoaded = $.Deferred();
            self.$region = $region;
            self.CloseForm = null; // set in fh
            self.ControlForm = null; //set in fh
            self.CurrentUserID = null;
            self.id = id;
            self.objectClassID = 119; //WorkOrder object id
            self.modes = {
                nothing: 'nothing',
                main: 'main',
                tape: 'tape',
                negotiation: 'negotiation',
                links: 'links',
                ar_specifications: 'ar_specifications', //Спецификации запросов на активы
                pu_specifications: 'pu_specifications', //Потребности это практически те же Спецификации для закупок
                pu_financeBudgetRows: 'pu_financeBudgetRows',//не детально финансирование закупок
                supplies: 'supplies', //Поставки
                accommodation: 'accommodation', //Размещение
                inventory_specifications: 'inventory_specifications' //Ведомость инвентаризации
            };
            $.when(userD).done(function (user) {
                self.CurrentUserID = user.UserID;
            });
            self.TabHeight = ko.observable(0);
            self.TabWidth = ko.observable(0);
            self.TabSize = ko.computed(function () {
                return {
                    h: self.TabHeight(),
                    w: self.TabWidth()
                };
            });
            //
            self.negotiationID = null;//negotiation to show 
            //
            //MAIN TAB BLOCK
            self.mainTabLoaded = ko.observable(false);
            self.mode = ko.observable(self.modes.nothing);
            self.mode.subscribe(function (newValue) {
                if (newValue == self.modes.nothing)
                    return;
                //
                if (newValue == self.modes.main) {
                    if (!self.mainTabLoaded()) {
                        self.mainTabLoaded(true);
                        //
                        self.SizeChanged();
                    }
                }
                else if (newValue == self.modes.tape)
                    self.tapeControl.CheckData();
                else if (newValue == self.modes.links)
                    self.linkList.CheckData();
                else if (newValue == self.modes.negotiation)
                    self.negotiationList.CheckData(self.negotiationID);
                else if (newValue.indexOf(self.parameterModePrefix) != -1) {
                    self.InitializeParametersTabs();
                }
                else if (newValue == self.modes.ar_specifications)
                    self.ar_specificationsList.CheckData();
                else if (newValue == self.modes.pu_specifications)
                    self.pu_specificationsList.CheckData();
                else if (newValue == self.modes.pu_financeBudgetRows)
                    self.pu_FinanceBudgetRowList.CheckData();
                else if (newValue == self.modes.supplies) {
                    self.pu_invoiceList.CheckData();
                }
                else if (newValue == self.modes.accommodation) {
                    self.pu_activesLocation.SizeChanged = self.SizeChanged;
                    self.pu_activesLocation.Init();
                    self.SizeChanged();
                }
                else if (newValue == self.modes.inventory_specifications) {
                    self.InitializeInventorySpecificationControl();
                }
            });
            //
            //
            self.attachmentsControl = null;
            self.LoadAttachmentsControl = function () {
                if (!self.workOrder())
                    return;
                //
                require(['fileControl'], function (fcLib) {
                    if (self.attachmentsControl != null) {
                        if (self.attachmentsControl.ObjectID != self.workOrder().ID())//previous object  
                            self.attachmentsControl.RemoveUploadedFiles();
                        else if (!self.attachmentsControl.IsAllFilesUploaded())//uploading
                        {
                            setTimeout(self.LoadAttachmentsControl, 1000);//try to reload after second
                            return;
                        }
                    }
                    if (self.attachmentsControl == null || self.attachmentsControl.IsLoaded() == false) {
                        var attachmentsElement = self.$region.find('.documentList');
                        self.attachmentsControl = new fcLib.control(attachmentsElement, '.ui-dialog', '.b-requestDetail__files-addBtn');
                        self.attachmentsControl.OnChange = function () {
                            if (self.workflowControl() != null)
                                self.workflowControl().OnSave();
                        };
                    }
                    self.attachmentsControl.ReadOnly(self.IsReadOnly());
                    self.attachmentsControl.Initialize(self.workOrder().ID());
                });
            };
            //
            self.workflowControl = ko.observable(null);
            self.LoadWorkflowControl = function () {
                if (!self.workOrder())
                    return;
                //
                require(['workflow'], function (wfLib) {
                    if (self.workflowControl() == null) {
                        self.workflowControl(new wfLib.control(self.$region, self.IsReadOnly, self.workOrder));
                    }
                    self.workflowControl().ReadOnly(self.IsReadOnly());
                    self.workflowControl().Initialize();
                });
            };
            //
            self.EditManhoursWork = function () {
                require(['usualForms'], function (fhModule) {
                    var fh = new fhModule.formHelper();
                    fh.ShowManhoursWorkList(self.workOrder, self.objectClassID, self.CanEdit);
                });
            };
            //
            self.priorityControl = null;
            self.LoadPriorityControl = function () {
                if (!self.workOrder())
                    return;
                //
                require(['models/SDForms/WorkOrderForm.Priority'], function (prLib) {
                    if (self.priorityControl == null || self.priorityControl.IsLoaded() == false) {
                        self.priorityControl = new prLib.ViewModel(self.$region.find('.b-requestDetail-menu__priority'), self, self.IsReadOnly());
                        self.priorityControl.Initialize();
                    }
                    $.when(self.priorityControl.Load(self.workOrder().ID(), self.objectClassID, self.workOrder().PriorityID())).done(function (result) {
                        //not needed now
                    });
                });
            };
            //
            self.RefreshPriority = function (priorityObj) {
                if (priorityObj == null)
                    return;
                //
                self.workOrder().PriorityName(priorityObj.Name);
                self.workOrder().PriorityColor(priorityObj.Color);
                self.workOrder().PriorityID(priorityObj.ID);
            };
            //
            self.ajaxControl_CustomControl = new ajaxLib.control();
            self.ajaxControl_CustomControlUsers = new ajaxLib.control();
            self.CustomControl = ko.observable(false);
            self.LoadCustomControl = function () {
                if (!self.workOrder())
                    return;
                //
                var param = {
                    objectID: self.workOrder().ID(),
                };
                self.ajaxControl_CustomControl.Ajax(self.$region.find('.b-requestDetail-menu__item-control'),
                    {
                        method: 'GET',
                        url: 'accountApi/GetCustomControl?' + $.param(param)
                    },
                    function (result) {
                        if (result != null)
                            self.CustomControl(result);
                    });
                //
                var param2 = {
                    objectID: self.workOrder().ID(),
                    objectClassID: self.objectClassID
                };
                self.ajaxControl_CustomControlUsers.Ajax(self.$region.find('.b-requestDetail-menu__item-control'),
                    {
                        method: 'GET',
                        url: 'userApi/GetUserInfoListOnCustomControl?' + $.param(param2)
                    },
                    function (result) {
                        if (result && result.length > 0)
                            require(['models/SDForms/SDForm.User'], function (userLib) {
                                ko.utils.arrayForEach(result, function (el) {
                                    var already = ko.utils.arrayFirst(self.WorkOrderUsersList(), function (item) {
                                        return item.ID() == el.ID;
                                    });
                                    //                    
                                    if (already != null)
                                        return;
                                    //
                                    var options = {
                                        UserID: el.ID,
                                        UserType: userLib.UserTypes.inspector,
                                        UserName: el.FullName,
                                        EditAction: null,
                                        RemoveAction: null,
                                        UserData: el
                                    };
                                    var user = new userLib.User(self, options);
                                    //
                                    self.WorkOrderUsersList.push(user);
                                });
                            });
                    });
            };
            self.SaveCustomControl = function () {
                if (!self.workOrder())
                    return;
                //
                var param = {
                    objectID: self.workOrder().ID(),
                    objectClassID: self.objectClassID, // IMSystem.Global.OBJ_workOrder
                    value: self.CustomControl()
                };
                self.ajaxControl_CustomControl.Ajax(self.$region.find('.b-requestDetail-menu__item-control'),
                    {
                        method: 'POST',
                        url: 'accountApi/SetCustomControl?' + $.param(param)
                    },
                    function (result) {
                        if (result != true) {
                            self.CustomControl(!self.CustomControl());//restore
                            //
                            require(['sweetAlert'], function () {
                                swal(getTextResource('SaveError'), getTextResource('GlobalError'), 'error');
                            });
                        }
                    });
            };
            //
            self.workOrder = ko.observable(null);
            self.workOrder.subscribe(function (newValue) {
                $.when($isLoaded).done(function () {
                    self.SizeChanged();//block of workOrder completed
                    //
                    self.LoadAttachmentsControl();
                    self.LoadWorkflowControl();
                    if (self.IsReadOnly() == false) {
                        self.LoadPriorityControl();
                    }
                    //
                    self.OnParametersChanged();
                });
            });
            self.IsReadOnly = ko.observable(isReadOnly);
            self.IsReadOnly.subscribe(function (newValue) {
                var readOnly = self.IsReadOnly();
                //
                if (self.attachmentsControl != null)
                    self.attachmentsControl.ReadOnly(readOnly);
                if (self.workflowControl() != null)
                    self.workflowControl().ReadOnly(readOnly);
                if (self.parametersControl != null)
                    self.parametersControl.ReadOnly(readOnly);
                if (self.priorityControl != null)
                    self.priorityControl.ReadOnly(readOnly);
                if (self.linkList != null)
                    self.linkList.ReadOnly(readOnly);
                if (self.negotiationList != null) {
                    //all inside control already
                }
            });
            //
            self.CanEdit = ko.computed(function () {
                return !self.IsReadOnly();
            });
            self.CanShow = ko.observable(self.CanEdit);
            //
            self.CanShowInventoryTabs = ko.computed(function () {
                var wo = self.workOrder();
                if (!wo)
                    return false;
                //
                if (wo.WorkOrderTypeClass() === 3)//Inventory
                    return true;
                //
                return false;
            });
            //
            self.CanShowPurchaseTabs = ko.computed(function () {
                var wo = self.workOrder();
                if (!wo)
                    return false;
                //
                if (wo.WorkOrderTypeClass() === 2)//Purchase
                    return true;
                //
                return false;
            });
            self.CanShowActiveRequestsTabs = ko.computed(function () {
                var wo = self.workOrder();
                if (!wo)
                    return false;
                //
                if (wo.WorkOrderTypeClass() === 1)//Actives request
                    return true;
                //
                return false;
            });
            //
            self.additionalClick = function () {
                //TODO
            };
            self.CustomControlClick = function () {//поставить/снять с контроля
                self.CustomControl(!self.CustomControl());
                self.SaveCustomControl();
            };
            //
            self.SendMail = function () {
                showSpinner();
                require(['sdForms'], function (module) {
                    var fh = new module.formHelper(true);
                    //
                    var options = {
                        Obj: {
                            ID: self.id,
                            ClassID: self.objectClassID
                        },
                        CanNote: true,
                        Subject: getTextResource('WorkOrder') + (self.workOrder() != null ? (' №' + self.workOrder().Number() + ' ' + self.workOrder().Name()) : '')
                    }
                    fh.ShowSendEmailForm(options);
                });
            };
            //
            self.showContextMenu = function (obj, e) {
                var contextMenuViewModel = self.contextMenu();
                e.preventDefault();
                contextMenuViewModel.show(e);
                return true;
            };
            //
            self.contextMenu = ko.observable(null);

            self.contextMenuInit = function (contextMenu) {
                self.contextMenu(contextMenu);//bind contextMenu

                self.setCustomControl(contextMenu);
                //Поставить на контроль 
                self.removeCustomControl(contextMenu);
                //Снять с контроля 
            };
            //
            self.contextMenuOpening = function (contextMenu) {
                contextMenu.items().forEach(function (item) {
                    if (item.isEnable && item.isVisible) {
                        item.enabled(item.isEnable());
                        item.visible(item.isVisible());
                    }
                });
            };
            self.getItemInfos = function () {
                var retval = [];
                retval.push({
                    ClassID: self.objectClassID,
                    ID: self.id
                });
                return retval;
            };

            self.ajaxControl_SetCustomControl = new ajaxLib.control();
            self.setCustomControl = function (contextMenu) {
                var isEnable = function () {
                    return true;
                };
                var isVisible = function () {
                    return true;
                };
                var action = function () {
                    var callback = function (selectedUserList) {
                        showSpinner();
                        //
                        var data = {
                            'CustomControl': true,
                            'ObjectList': self.getItemInfos(),
                            'UserList': selectedUserList,
                            'IsEngineerView': true
                        };
                        self.ajaxControl_SetCustomControl.Ajax(null,
                            {
                                dataType: "json",
                                method: 'POST',
                                data: data,
                                url: 'sdApi/SetCustomControlToList'
                            },
                            function (newVal) {
                                hideSpinner();
                                for (var i = 0; i < selectedUserList.length; i++) {
                                    if (selectedUserList[i].ID == self.CurrentUserID)
                                        self.CustomControlClick(true);
                                }
                            });
                    };
                    //
                    require(['sdForms'], function (fhModule) {
                        var fh = new fhModule.formHelper();
                        var userInfo = { UserID: self.CurrentUserID, CustomControlObjectID: self.id, SetCustomControl: true, UseTOZ: true };
                        fh.ShowUserSearchForm(userInfo, callback);
                    });
                }
                var cmd = contextMenu.addContextMenuItem();
                cmd.restext('SetCustomControl');
                cmd.isEnable = isEnable;
                cmd.isVisible = isVisible;
                cmd.click(action);
            };
            //
            self.removeCustomControl = function (contextMenu) {
                var isEnable = function () {
                    return true;
                };
                var isVisible = function () {
                    return true;
                };
                var action = function () {
                    var callback = function (selectedUserList) {
                        showSpinner();
                        //
                        var data = {
                            'CustomControl': false,
                            'ObjectList': self.getItemInfos(),
                            'UserList': selectedUserList,
                            'IsEngineerView': true
                        };
                        self.ajaxControl_SetCustomControl.Ajax(null,
                            {
                                dataType: "json",
                                method: 'POST',
                                data: data,
                                url: 'sdApi/SetCustomControlToList'
                            },
                            function (newVal) {
                                hideSpinner();
                                for (var i = 0; i < selectedUserList.length; i++) {
                                    if (selectedUserList[i].ID == self.CurrentUserID)
                                        self.CustomControlClick(false);
                                }
                            });
                    };
                    //
                    require(['sdForms'], function (fhModule) {
                        var fh = new fhModule.formHelper();
                        var userInfo = { UserID: self.CurrentUserID, CustomControlObjectID: self.id, SetCustomControl: false, UseTOZ: true };
                        fh.ShowUserSearchForm(userInfo, callback);
                    });
                }
                var cmd = contextMenu.addContextMenuItem();
                cmd.restext('RemoveCustomControl');
                cmd.isEnable = isEnable;
                cmd.isVisible = isVisible;
                cmd.click(action);
            };
            //
            self.EditWorkOrderType = function () {
                if (self.CanEdit() == false)
                    return;
                showSpinner();
                require(['usualForms'], function (module) {
                    var fh = new module.formHelper(true);
                    //
                    var searcherName = 'WorkOrderTypeSearcher';
                    if (self.workOrder().WorkOrderTypeClass() === 0)
                        searcherName = 'WorkOrderDefaultTypeSearcher';
                    else if (self.workOrder().WorkOrderTypeClass() === 1)
                        searcherName = 'WorkOrderActivesRequestTypeSearcher';
                    if (self.workOrder().WorkOrderTypeClass() === 2)
                        searcherName = 'WorkOrderPurchaseTypeSearcher';
                    //
                    var options = {
                        ID: self.workOrder().ID(),
                        objClassID: self.objectClassID,
                        fieldName: 'WorkOrder.Type',
                        fieldFriendlyName: getTextResource('WorkOrderType'),
                        oldValue: { ID: self.workOrder().TypeID(), ClassID: 142, FullName: self.workOrder().TypeName() },
                        searcherName: searcherName,
                        onSave: function (objectInfo) {
                            if (!objectInfo)
                                return;
                            self.workOrder().TypeID(objectInfo.ID);
                            self.workOrder().TypeName(objectInfo.FullName);
                            self.LoadWorkflowControl();
                        }
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.searcherEdit, options);
                });
            };
            //
            self.EditQueue = function () {
                if (self.CanEdit() == false)
                    return;
                showSpinner();
                require(['usualForms', 'models/SDForms/SDForm.User'], function (module, userLib) {
                    var fh = new module.formHelper(true);
                    var options = {
                        ID: self.workOrder().ID(),
                        objClassID: self.objectClassID,
                        fieldName: 'WorkOrder.Queue',
                        fieldFriendlyName: getTextResource('Queue'),
                        oldValue: self.workOrder().QueueLoaded() ? { ID: self.workOrder().Queue().ID(), ClassID: self.workOrder().Queue().ClassID(), FullName: self.workOrder().Queue().FullName() } : null,
                        object: ko.toJS(self.workOrder().Queue()),
                        searcherName: "QueueSearcher",
                        searcherPlaceholder: getTextResource('EnterQueue'),
                        searcherParams: ['2'],//for workOrder
                        onSave: function (objectInfo) {
                            self.workOrder().QueueLoaded(false);
                            self.workOrder().Queue(new userLib.EmptyUser(self, userLib.UserTypes.queueExecutor, self.EditQueue));
                            //
                            if (objectInfo && objectInfo.ClassID == 722) { //IMSystem.Global.OBJ_QUEUE
                                self.workOrder().QueueID(objectInfo.ID);
                                self.workOrder().QueueName(objectInfo.FullName);
                            }
                            else {
                                self.workOrder().QueueID('');
                                self.workOrder().QueueName('');
                            }
                            self.InitializeQueue();
                        }
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.searcherEdit, options);
                });
            };
            self.EditExecutor = function () {
                if (self.CanEdit() == false)
                    return;
                showSpinner();
                require(['usualForms', 'models/SDForms/SDForm.User'], function (module, userLib) {
                    var fh = new module.formHelper(true);
                    var options = {
                        ID: self.workOrder().ID(),
                        objClassID: self.objectClassID,
                        fieldName: 'WorkOrder.Executor',
                        fieldFriendlyName: getTextResource('Executor'),
                        oldValue: self.workOrder().ExecutorLoaded() ? { ID: self.workOrder().Executor().ID(), ClassID: self.workOrder().Executor().ClassID(), FullName: self.workOrder().Executor().FullName() } : null,
                        object: ko.toJS(self.workOrder().Executor()),
                        searcherName: "ExecutorUserSearcher",
                        searcherPlaceholder: getTextResource('EnterFIO'),
                        searcherParams: [self.workOrder().QueueID() == '' ? null : self.workOrder().QueueID()],
                        onSave: function (objectInfo) {
                            self.workOrder().ExecutorLoaded(false);
                            self.workOrder().Executor(new userLib.EmptyUser(self, userLib.UserTypes.executor, self.EditExecutor));
                            //
                            if (objectInfo && objectInfo.ClassID == 9) { //IMSystem.Global.OBJ_USER
                                self.workOrder().ExecutorID(objectInfo.ID);
                            }
                            else {
                                self.workOrder().ExecutorID('');
                            }
                            self.InitializeExecutor();
                        }
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.searcherEdit, options);
                });
            };
            self.EditAssignor = function () {
                if (self.CanEdit() == false)
                    return;
                showSpinner();
                require(['usualForms', 'models/SDForms/SDForm.User'], function (module, userLib) {
                    var fh = new module.formHelper(true);
                    var options = {
                        ID: self.workOrder().ID(),
                        objClassID: self.objectClassID,
                        fieldName: 'WorkOrder.Assignor',
                        fieldFriendlyName: getTextResource('Assignor'),
                        oldValue: self.workOrder().AssignorLoaded() ? { ID: self.workOrder().Assignor().ID(), ClassID: 9, FullName: self.workOrder().Assignor().FullName() } : null,
                        object: ko.toJS(self.workOrder().Assignor()),
                        searcherName: 'AccomplisherUserSearcher',
                        searcherPlaceholder: getTextResource('EnterFIO'),
                        onSave: function (objectInfo) {
                            self.workOrder().AssignorLoaded(false);
                            self.workOrder().Assignor(new userLib.EmptyUser(self, userLib.UserTypes.assignor, self.EditAssignor));
                            //
                            self.workOrder().AssignorID(objectInfo ? objectInfo.ID : '');
                            self.InitializeAssignor();
                        }
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.searcherEdit, options);
                });
            };
            self.EditDescription = function () {
                showSpinner();
                require(['usualForms'], function (module) {
                    var fh = new module.formHelper(true);
                    var options = {
                        ID: self.workOrder().ID(),
                        objClassID: self.objectClassID,
                        fieldName: 'WorkOrder.Description',
                        fieldFriendlyName: getTextResource('Description'),
                        oldValue: self.workOrder().Description(),
                        onSave: function (newHTML) {
                            self.workOrder().Description(newHTML);
                        },
                        readOnly: !self.CanEdit()
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.htmlEdit, options);
                });
            };
            self.EditName = function () {
                if (self.CanEdit() == false)
                    return;
                showSpinner();
                require(['usualForms'], function (module) {
                    var fh = new module.formHelper(true);
                    var options = {
                        ID: self.workOrder().ID(),
                        objClassID: self.objectClassID,
                        fieldName: 'WorkOrder.Name',
                        fieldFriendlyName: getTextResource('Name'),
                        oldValue: self.workOrder().Name(),
                        onSave: function (newText) {
                            self.workOrder().Name(newText);
                        }
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.textEdit, options);
                });
            };
            self.EditDatePromised = function () {
                if (self.CanEdit() == false)
                    return;
                showSpinner();
                require(['usualForms'], function (module) {
                    var fh = new module.formHelper(true);
                    var options = {
                        ID: self.workOrder().ID(),
                        objClassID: self.objectClassID,
                        fieldName: 'WorkOrder.DatePromised',
                        fieldFriendlyName: getTextResource('WorkOrderDatePromise'),
                        oldValue: self.workOrder().UtcDatePromisedDT(),
                        onSave: function (newDate) {
                            self.workOrder().UtcDatePromised(parseDate(newDate));
                            self.workOrder().UtcDatePromisedDT(new Date(parseInt(newDate)));
                            //
                            if (self.tapeControl && self.tapeControl.TimeLineControl && self.tapeControl.isTimeLineLoaded && self.tapeControl.isTimeLineLoaded()) {
                                var mainTLC = self.tapeControl.TimeLineControl();
                                if (mainTLC != null && mainTLC.TimeLine) {
                                    var currentTL = mainTLC.TimeLine();
                                    if (currentTL != null && currentTL.UtcDatePromised) {
                                        currentTL.UtcDatePromised.LocalDate(self.workOrder().UtcDatePromised());
                                        currentTL.UtcDatePromised.DateObj(self.workOrder().UtcDatePromisedDT());
                                    }
                                }
                            }
                        }
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.dateEdit, options);
                });
            };
            self.EditManhoursNorm = function () {
                if (self.CanEdit() == false)
                    return;
                showSpinner();
                require(['usualForms'], function (module) {
                    var fh = new module.formHelper(true);
                    var options = {
                        ID: self.workOrder().ID(),
                        objClassID: self.objectClassID,
                        fieldName: 'WorkOrder.ManhoursNorm',
                        fieldFriendlyName: getTextResource('ManhoursNorm'),
                        oldValue: self.workOrder().ManhoursNorm(),
                        onSave: function (newVal) {
                            self.workOrder().ManhoursNorm(newVal);
                        }
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.timeEdit, options);
                });
            };
            //
            self.ajaxControl_deleteUser = new ajaxLib.control();
            self.DeleteUser = function (isReplaceAnyway, options) {
                var data = {
                    ID: self.workOrder().ID(),
                    ObjClassID: self.objectClassID,
                    Field: options.FieldName,
                    OldValue: options.OldValue == null ? null : JSON.stringify({ 'id': options.OldValue.ID, 'fullName': options.OldValue.FullName }),
                    NewValue: null,
                    Params: null,
                    ReplaceAnyway: isReplaceAnyway
                };
                //
                self.ajaxControl_deleteUser.Ajax(
                            self.$region,
                            {
                                dataType: "json",
                                method: 'POST',
                                url: 'sdApi/SetField',
                                data: data
                            },
                            function (retModel) {
                                if (retModel) {
                                    var result = retModel.ResultWithMessage.Result;
                                    //
                                    if (result === 0) {
                                        if (options.onSave != null)
                                            options.onSave(null);
                                    }
                                    else if (result === 1) {
                                        require(['sweetAlert'], function () {
                                            swal(getTextResource('SaveError'), getTextResource('NullParamsError') + '\n[WorkOrderForm.js DeleteUser]', 'error');
                                        });
                                    }
                                    else if (result === 2) {
                                        require(['sweetAlert'], function () {
                                            swal(getTextResource('SaveError'), getTextResource('BadParamsError') + '\n[WorkOrderForm.js DeleteUser]', 'error');
                                        });
                                    }
                                    else if (result === 3) {
                                        require(['sweetAlert'], function () {
                                            swal(getTextResource('SaveError'), getTextResource('AccessError'), 'error');
                                        });
                                    }
                                    else if (result === 5 && isReplaceAnyway == false) {
                                        require(['sweetAlert'], function () {
                                            swal({
                                                title: getTextResource('SaveError'),
                                                text: getTextResource('ConcurrencyError'),
                                                showCancelButton: true,
                                                closeOnConfirm: true,
                                                closeOnCancel: true,
                                                confirmButtonText: getTextResource('ButtonOK'),
                                                cancelButtonText: getTextResource('ButtonCancel')
                                            },
                                            function (value) {
                                                if (value == true) {
                                                    self.DeleteUser(true, options);
                                                }
                                            });
                                        });
                                    }
                                    else if (result === 6) {
                                        require(['sweetAlert'], function () {
                                            swal(getTextResource('SaveError'), getTextResource('ObjectDeleted'), 'error');
                                        });
                                    }
                                    else if (result === 7) {
                                        require(['sweetAlert'], function () {
                                            swal(getTextResource('SaveError'), getTextResource('OperationError'), 'error');
                                        });
                                    }
                                    else if (result === 8) {
                                        require(['sweetAlert'], function () {
                                            swal(getTextResource('SaveError'), getTextResource('ValidationError'), 'error');
                                        });
                                    }
                                    else {
                                        require(['sweetAlert'], function () {
                                            swal(getTextResource('SaveError'), getTextResource('GlobalError') + '\n[WorkOrderForm.js DeleteUser]', 'error');
                                        });
                                    }
                                }
                                else {
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('SaveError'), getTextResource('GlobalError') + '\n[WorkOrderForm.js DeleteUser]', 'error');
                                    });
                                }
                            });
            };
            self.DeleteQueue = function () {
                require(['models/SDForms/SDForm.User'], function (userLib) {
                    var options = {
                        FieldName: 'WorkOrder.Queue',
                        OldValue: self.workOrder().QueueLoaded() ? { ID: self.workOrder().Queue().ID(), ClassID: self.workOrder().Queue().ClassID(), FullName: self.workOrder().Queue().FullName() } : null,
                        onSave: function () {
                            self.workOrder().QueueLoaded(false);
                            self.workOrder().Queue(new userLib.EmptyUser(self, userLib.UserTypes.queueExecutor, self.EditQueue));
                            //
                            self.workOrder().QueueID('');
                            self.workOrder().QueueName('');
                        }
                    };
                    self.DeleteUser(false, options);
                });
            };
            self.DeleteExecutor = function () {
                require(['models/SDForms/SDForm.User'], function (userLib) {
                    var options = {
                        FieldName: 'WorkOrder.Executor',
                        OldValue: self.workOrder().ExecutorLoaded() ? { ID: self.workOrder().Executor().ID(), ClassID: self.workOrder().Executor().ClassID(), FullName: self.workOrder().Executor().FullName() } : null,
                        onSave: function () {
                            self.workOrder().ExecutorLoaded(false);
                            self.workOrder().Executor(new userLib.EmptyUser(self, userLib.UserTypes.executor, self.EditExecutor));
                            //
                            self.workOrder().ExecutorID('');                           
                        }
                    };
                    self.DeleteUser(false, options);
                });
            };
            self.DeleteAssignor = function () {
                require(['models/SDForms/SDForm.User'], function (userLib) {
                    var options = {
                        FieldName: 'WorkOrder.Assignor',
                        OldValue: self.workOrder().AssignorLoaded() ? { ID: self.workOrder().Assignor().ID(), ClassID: 9, FullName: self.workOrder().Assignor().FullName() } : null,
                        onSave: function () {
                            self.workOrder().AssignorLoaded(false);
                            self.workOrder().Assignor(new userLib.EmptyUser(self, userLib.UserTypes.assignor, self.EditAssignor));
                            //
                            self.workOrder().AssignorID('');
                        }
                    };
                    self.DeleteUser(false, options);
                });
            };
            //
            self.InitializeInitiator = function () {
                require(['models/SDForms/SDForm.User'], function (userLib) {
                    var w = self.workOrder();
                    //
                    if (w.InitiatorLoaded() == false && w.InitiatorID()) {
                        var options = {
                            UserID: w.InitiatorID(),
                            UserType: userLib.UserTypes.workOrderInitiator,
                            UserName: null,
                            EditAction: null,
                            RemoveAction: null,
                            CanNote: true
                        };
                        var user = new userLib.User(self, options);
                        w.Initiator(user);
                        w.InitiatorLoaded(true);
                        //
                        var already = ko.utils.arrayFirst(self.WorkOrderUsersList(), function (item) {
                            return item.ID() == w.InitiatorID();
                        });
                        //                    
                        if (already == null)
                            self.WorkOrderUsersList.push(user);
                        else if (already.Type == userLib.UserTypes.withoutType) {
                            self.WorkOrderUsersList.remove(already);
                            self.WorkOrderUsersList.push(user);
                        }
                    }
                });
            };
            self.InitializeQueue = function () {
                require(['models/SDForms/SDForm.User'], function (userLib) {
                    var w = self.workOrder();
                    //
                    if (w.QueueLoaded() == false) {
                        if (w.QueueID()) {
                            var options = {
                                UserID: w.QueueID(),
                                UserType: userLib.UserTypes.queueExecutor,
                                UserName: null,
                                EditAction: self.EditQueue,
                                RemoveAction: self.DeleteQueue,
                                CanNote: true
                            };
                            var user = new userLib.User(self, options);
                            w.Queue(user);
                            w.QueueLoaded(true);
                            //
                            var already = ko.utils.arrayFirst(self.WorkOrderUsersList(), function (item) {
                                return item.ID() == w.QueueID();
                            });
                            //
                            if (already == null)
                                self.WorkOrderUsersList.push(user);
                            else if (already.Type == userLib.UserTypes.withoutType) {
                                self.WorkOrderUsersList.remove(already);
                                self.WorkOrderUsersList.push(user);
                            }
                        }
                    }
                });
            };
            self.InitializeExecutor = function () {
                require(['models/SDForms/SDForm.User'], function (userLib) {
                    var w = self.workOrder();
                    //
                    if (w.ExecutorLoaded() == false) {
                        if (w.ExecutorID()) {
                            var options = {
                                UserID: w.ExecutorID(),
                                UserType: userLib.UserTypes.executor,
                                UserName: null,
                                EditAction: self.EditExecutor,
                                RemoveAction: self.DeleteExecutor,
                                CanNote: true
                            };
                            var user = new userLib.User(self, options);
                            w.Executor(user);
                            w.ExecutorLoaded(true);
                            //
                            var already = ko.utils.arrayFirst(self.WorkOrderUsersList(), function (item) {
                                return item.ID() == w.ExecutorID();
                            });
                            //
                            if (already == null)
                                self.WorkOrderUsersList.push(user);
                            else if (already.Type == userLib.UserTypes.withoutType) {
                                self.WorkOrderUsersList.remove(already);
                                self.WorkOrderUsersList.push(user);
                            }
                        }                       
                    }
                });
            };
            self.InitializeAssignor = function () {
                require(['models/SDForms/SDForm.User'], function (userLib) {
                    var w = self.workOrder();
                    //
                    if (w.AssignorLoaded() == false && w.AssignorID()) {
                        var options = {
                            UserID: w.AssignorID(),
                            UserType: userLib.UserTypes.assignor,
                            UserName: null,
                            EditAction: self.EditAssignor,
                            RemoveAction: self.DeleteAssignor,
                            CanNote: true
                        };
                        var user = new userLib.User(self, options);
                        w.Assignor(user);
                        w.AssignorLoaded(true);
                        //
                        var already = ko.utils.arrayFirst(self.WorkOrderUsersList(), function (item) {
                            return item.ID() == w.AssignorID();
                        });
                        //
                        if (already == null)
                            self.WorkOrderUsersList.push(user);
                        else if (already.Type == userLib.UserTypes.withoutType) {
                            self.WorkOrderUsersList.remove(already);
                            self.WorkOrderUsersList.push(user);
                        }
                    }
                });
            };

            self.InitializeClient = function () {
                require(['models/SDForms/SDForm.User'], function (userLib) {
                    var w = self.workOrder();
                    //
                    if (w.ClientLoaded() == false && w.ClientID()) {
                        var options = {
                            UserID: w.ClientID(),
                            UserType: userLib.UserTypes.projectInitiator,
                            UserName: null,
                            EditAction: null,
                            RemoveAction: null,
                            CanNote: true
                        };
                        var user = new userLib.User(self, options);
                        w.Client(user);
                        w.ClientLoaded(true);
                        //
                        var already = ko.utils.arrayFirst(self.WorkOrderUsersList(), function (item) {
                            return item.ID() == w.ClientID();
                        });
                        //                    
                        if (already == null)
                            self.WorkOrderUsersList.push(user);
                        else if (already.Type == userLib.UserTypes.withoutType) {
                            self.WorkOrderUsersList.remove(already);
                            self.WorkOrderUsersList.push(user);
                        }
                    }
                });
            };

            self.CalculateUsersList = function () {
                require(['models/SDForms/SDForm.User'], function (userLib) {
                    if (!self.workOrder()) {
                        self.WorkOrderUsersList([]);
                        self.WorkOrderUsersList.valueHasMutated();
                        return;
                    }
                    //
                    self.InitializeAssignor();
                    //
                    self.InitializeQueue();
                    self.InitializeExecutor();
                    //
                    self.InitializeInitiator();
                    //
                    self.WorkOrderUsersList.valueHasMutated();
                    //add currentUser to list
                    $.when(userD).done(function (userObj) {
                        require(['models/SDForms/SDForm.User'], function (userLib) {
                            var already = ko.utils.arrayFirst(self.WorkOrderUsersList(), function (item) {
                                return item.ID() == userObj.UserID;
                            });
                            //                    
                            if (already != null)
                                return;
                            //
                            var options = {
                                UserID: userObj.UserID,
                                UserType: userLib.UserTypes.withoutType,
                                UserName: userObj.UserName,
                                EditAction: null,
                                RemoveAction: null,
                                CanNote: true
                            };
                            var user = new userLib.User(self, options);
                            //
                            self.WorkOrderUsersList.push(user);
                        });
                    });
                    self.LoadCustomControl();
                });
            };
            //
            self.WorkOrderUsersList = ko.observableArray([]);
            //
            self.DatePromisedCalculated = ko.computed(function () { //или из объекта, или из хода выполнения
                var retval = '';
                //
                if (self.tapeControl && self.tapeControl.TimeLineControl && self.tapeControl.isTimeLineLoaded && self.tapeControl.isTimeLineLoaded()) {
                    var mainTLC = self.tapeControl.TimeLineControl();
                    if (mainTLC != null && mainTLC.TimeLine) {
                        var currentTL = mainTLC.TimeLine();
                        if (currentTL != null && currentTL.UtcDatePromised)
                            retval = currentTL.UtcDatePromised.LocalDate();
                    }
                }
                //
                if (!retval && self.workOrder) {
                    var w = self.workOrder();
                    if (w && w.UtcDatePromised)
                        retval = w.UtcDatePromised();
                }
                //
                return retval;
            });
            //
            self.DateModifyCalculated = ko.computed(function () { //или из объекта, или из хода выполнения
                var retval = '';
                //
                if (self.tapeControl && self.tapeControl.TimeLineControl && self.tapeControl.isTimeLineLoaded && self.tapeControl.isTimeLineLoaded()) {
                    var mainTLC = self.tapeControl.TimeLineControl();
                    if (mainTLC != null && mainTLC.TimeLine) {
                        var currentTL = mainTLC.TimeLine();
                        if (currentTL != null && currentTL.UtcDateModified)
                            retval = currentTL.UtcDateModified.LocalDate();
                    }
                }
                //
                if (!retval && self.workOrder) {
                    var w = self.workOrder();
                    if (w && w.UtcDateModified)
                        retval = w.UtcDateModified();
                }
                //
                return retval;
            });
            //
            //TAPE BLOCK
            self.TapeClick = function () {
                self.mode(self.modes.tape);
                self.SizeChanged();
                //
                if (self.tapeControl && self.tapeControl.CalculateTopPosition)
                    self.tapeControl.CalculateTopPosition();
            };
            self.CanViewNotes = ko.computed(function () {
                return true;
            });
            self.tapeControl = new tapeLib.Tape(self.workOrder, self.objectClassID, self.$region.find('.tape__b').selector, self.$region.find('.tape__forms').selector, self.IsReadOnly, self.CanEdit, self.CanViewNotes, self.TabSize, self.WorkOrderUsersList);
            //
            //LINKS BLOCK
            self.linkList = new linkListLib.LinkList(self.workOrder, self.objectClassID, self.$region.find('.links__b .tabContent').selector, self.IsReadOnly, self.CanEdit);
            //
            //NEGOTIATION BLOCK
            self.negotiationList = new negotiationListLib.LinkList(self.workOrder, self.objectClassID, self.$region.find('.negotiations__b .tabContent').selector, self.IsReadOnly, self.CanEdit);
            //
            //ACTIVE REQUEST SPECIFICATIONS BLOCK
            self.ar_specificationsList = new ar_specificationsListLib.LinkList(self.workOrder, self.objectClassID, self.$region.find('.ar_specifications__b').selector, self.IsReadOnly, self.CanEdit, self.$region);
            //PURCHASE SPECIFICATIONS BLOCK
            self.pu_specificationsList = new pu_specificationsListLib.LinkList(self.workOrder, self.objectClassID, self.$region.find('.pu_specifications__b').selector, self.IsReadOnly, self.CanEdit, self.$region);
            //financeBudgetRowList
            self.pu_FinanceBudgetRowList = new financeBudgetRowListLib.LinkList(self.workOrder, self.objectClassID, self.$region.find('.financeBudgetRowList .tabContent').selector, self.IsReadOnly, self.CanEdit);
            self.PurchaseFinanceBudgetRowList_SumString = ko.computed(function () {//when not detail
                var val = null;
                if (self.pu_FinanceBudgetRowList.isLoaded())
                    val = self.pu_FinanceBudgetRowList.FinanceBudgetRowList_Sum();
                else if (self.workOrder())
                    val = self.workOrder().PurchaseFinanceBudgetRowList_Sum;
                return (val ? specLib.ToMoneyString(val) : '0') + ' ' + getTextResource('CurrentCurrency');
            });
            self.PurchaseFinanceBudgetRowList_PercentString = ko.computed(function () {//when not detail
                var val = null;
                if (self.pu_FinanceBudgetRowList.isLoaded())
                    val = self.pu_FinanceBudgetRowList.FinanceBudgetRowList_Sum();
                else if (self.workOrder())
                    val = self.workOrder().PurchaseFinanceBudgetRowList_Sum;
                if (val && self.workOrder() && self.workOrder().TotalCostWithNDSS() && self.workOrder().TotalCostWithNDSS() != 0)
                    return specLib.ToMoneyString(normalize(100 * val / self.workOrder().TotalCostWithNDSS())) + ' %';
                else
                    return '0 %';
            });
            //PURCHASE SUPPLIES BLOCK
            self.pu_invoiceList = new pu_invoiceListLib.LinkList(self.workOrder, self.objectClassID, self.$region.find('.pu_goodsInvoices__b .invoice-list').selector, self.IsReadOnly, self.CanEdit, self.$region);
            //PURCHASE SUPPLIES BLOCK
            self.pu_activesLocation = new pu_activesLocationLib.Control(self.workOrder, self.objectClassID, self.$region.find('.pu_assetlocation__b').selector, self.IsReadOnly, self.CanEdit, self.$region, self.TabHeight);
            //INVENTORY SPECIFICATIONS BLOCK
            self.inventory_specificationControl = ko.observable(null);
            //
            //PARAMETERS BLOCK
            self.parametersControl = null;
            self.parameterListByGroup = null;//кеш отсортирортированных параметров, разбитых по группам
            self.parameterModePrefix = 'parameter_';
            self.ParameterList = ko.observable([]);//параметры текущей выбранной группы
            self.ParameterListGroupName = ko.computed(function () {
                if (self.mode().indexOf(self.parameterModePrefix) != 0)
                    return '';
                //
                var groupName = self.mode().substring(self.parameterModePrefix.length);
                return groupName;
            });
            self.ParameterGroupList = ko.observable([]);
            self.InitializeParametersTabs = function () {
                if (self.mode().indexOf(self.parameterModePrefix) != 0) {
                    self.ParameterList([]);
                    return;
                }
                //
                var groupName = self.mode().substring(self.parameterModePrefix.length);
                var list = self.parameterListByGroup;
                for (var i = 0; i < list.length; i++)
                    if (list[i].GroupName == groupName) {
                        self.ParameterList(list[i].ParameterList);
                        return;
                    }
                //
                self.ParameterList([]);//groupName not found
            };
            self.InitializeParameters = function () {
                var wo = self.workOrder();
                if (!wo)
                    self.parametersControl.InitializeOrCreate(null, null, null, false);//нет объекта - нет параметров
                else self.parametersControl.InitializeOrCreate(self.objectClassID, wo.ID(), wo, false);
            };
            self.OnParametersChanged = function () {//обновления списка параметров по объекту
                if (self.parametersControl == null) {
                    self.parametersControl = new pcLib.control();
                    self.parametersControl.ReadOnly(self.IsReadOnly());
                    self.parametersControl.ClientID(self.workOrder() ? self.workOrder().CallClientID() : null);//от клинета есть зависимые параметры для задания
                    self.parametersControl.ParameterListByGroup.subscribe(function (newValue) {//изменилась разбивка параметров по группам
                        self.parameterListByGroup = newValue;
                        //                                
                        self.ParameterGroupList().splice(0, self.ParameterGroupList().length);//remove without ko update
                        var newParameterListContainsOldGroup = false;
                        //
                        for (var i = 0; i < newValue.length; i++) {
                            var groupName = newValue[i].GroupName;
                            //
                            self.ParameterGroupList().push({
                                Index: i + 1,
                                Name: groupName,
                                IsValid: newValue[i].IsValid
                            });
                            //
                            if (self.mode().indexOf(self.parameterModePrefix + groupName) != -1)
                                newParameterListContainsOldGroup = true;
                        }
                        self.ParameterGroupList.valueHasMutated();
                        //
                        if (self.mode().indexOf(self.parameterModePrefix) == 0) {//сейчас вкладка параметры
                            if (!newParameterListContainsOldGroup)
                                self.mode(self.modes.main);//такой больше нет, идем на главную
                            else {//hack ko
                                var tmp = self.mode();
                                self.mode(self.modes.nothing);
                                self.mode(tmp);
                            }
                        }
                    });
                }
                self.InitializeParameters();
            };
            //
            //
            //KO INIT BLOCK
            self.ajaxControl_load = new ajaxLib.control();
            self.Load = function (id) {
                $(document).unbind('objectInserted', self.onObjectInserted);
                $(document).unbind('objectUpdated', self.onObjectUpdated);
                $(document).unbind('objectDeleted', self.onObjectDeleted);
                $(document).unbind('local_objectInserted', self.onObjectInserted);
                $(document).unbind('local_objectUpdated', self.onObjectUpdated);
                $(document).unbind('local_objectDeleted', self.onObjectDeleted);
                $(document).unbind('progressBarProcessed', self.onProgressBarProcessed);
                //
                var retD = $.Deferred();
                if (id) {
                    self.ajaxControl_load.Ajax(self.$region,
                        {
                            dataType: "json",
                            method: 'GET',
                            data: { 'id': id },
                            url: 'sdApi/GetWorkOrder'
                        },
                        function (newVal) {
                            var loadSuccessD = $.Deferred();
                            var processed = false;
                            //
                            if (newVal) {
                                if (newVal.Result == 0) {//success
                                    var woInfo = newVal.WorkOrder;
                                    if (woInfo && woInfo.ID) {
                                        require(['models/SDForms/WorkOrderForm.WorkOrder'], function (woLib) {
                                            self.workOrder(new woLib.WorkOrder(self, woInfo));
                                            self.WorkOrderUsersList.removeAll();
                                            self.CalculateUsersList();
                                            //
                                            $(document).unbind('objectInserted', self.onObjectInserted).bind('objectInserted', self.onObjectInserted);
                                            $(document).unbind('objectUpdated', self.onObjectUpdated).bind('objectUpdated', self.onObjectUpdated);
                                            $(document).unbind('objectDeleted', self.onObjectDeleted).bind('objectDeleted', self.onObjectDeleted);
                                            $(document).unbind('local_objectInserted', self.onObjectInserted).bind('local_objectInserted', self.onObjectInserted);
                                            $(document).unbind('local_objectUpdated', self.onObjectUpdated).bind('local_objectUpdated', self.onObjectUpdated);
                                            $(document).unbind('local_objectDeleted', self.onObjectDeleted).bind('local_objectDeleted', self.onObjectDeleted);
                                            $(document).unbind('progressBarProcessed', self.onProgressBarProcessed).bind('progressBarProcessed', self.onProgressBarProcessed);
                                            //
                                            self.LoadReferenceObject();
                                            //
                                            processed = true;
                                            loadSuccessD.resolve(true);
                                        });
                                    }
                                    else loadSuccessD.resolve(false);
                                }
                                else {//not success
                                    if (newVal.Result == 3) {//AccessError
                                        require(['sweetAlert'], function () {
                                            swal(getTextResource('ErrorCaption'), getTextResource('AccessError'), 'error');
                                        });
                                        processed = true;
                                    }
                                    if (newVal.Result == 6) {//AccessError
                                        require(['sweetAlert'], function () {
                                            swal(getTextResource('ErrorCaption'), getTextResource('ObjectDeleted'), 'error');
                                        });
                                        processed = true;
                                    }
                                    else if (newVal.Result == 7) {//OperationError
                                        require(['sweetAlert'], function () {
                                            swal(getTextResource('ErrorCaption'), getTextResource('OperationError'), 'error');
                                        });
                                        processed = true;
                                    }
                                    loadSuccessD.resolve(false);
                                }
                            }
                            else loadSuccessD.resolve(false);
                            //
                            $.when(loadSuccessD).done(function (loadSuccess) {
                                retD.resolve(loadSuccess);
                                if (loadSuccess == false && processed == false) {
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('UnhandledErrorServer'), getTextResource('AjaxError') + '\n[WorkOrderForm.js, Load]', 'error');
                                    });
                                }
                            });
                        });
                }
                else retD.resolve(false);
                //
                return retD.promise();
            };
            //
            self.Reload = function (id, readOnly) {
                if (id == null && self.id == null)
                    return;
                else if (id == null)
                    id = self.id;
                //
                if (readOnly === true || readOnly === false)
                    self.IsReadOnly(readOnly);
                //
                var currentTab = self.mode();
                self.mode(self.modes.nothing);
                self.mainTabLoaded(false);
                self.tapeControl.ClearData();
                self.negotiationList.ClearData();
                self.ar_specificationsList.ClearData();
                self.pu_specificationsList.ClearData();
                self.pu_FinanceBudgetRowList.ClearData();
                self.pu_invoiceList.ClearData();
                self.linkList.ClearData();
                if (self.priorityControl != null)
                    self.priorityControl.IsLoaded(false);
                //
                showSpinner(self.$region[0]);
                //
                $.when(self.Load(id)).done(function (loadResult) {
                    if (loadResult == false && self.CloseForm != null) {
                        self.CloseForm();
                    }
                    else self.mode(currentTab);
                    //
                    hideSpinner(self.$region[0]);
                });
            };
            //
            self.AfterRender = function () {
                self.SizeChanged();
            };
            self.renderWorkOrderComplete = function () {
                $isLoaded.resolve();
                self.SizeChanged();
            };
            //
            self.IsDescriptionContainerVisible = ko.observable(true);
            self.ToggleDescriptionContainer = function () {
                self.IsDescriptionContainerVisible(!self.IsDescriptionContainerVisible());
            };
            //
            self.SizeChanged = function () {
                if (!self.workOrder())
                    return;//Critical - ko - with:wo!!!
                //
                var tabHeight = self.$region.height();//form height
                tabHeight -= self.$region.find('.b-requestDetail-menu').outerHeight(true);
                tabHeight -= self.$region.find('.b-requestDetail__title-header').outerHeight(true);
                //
                var tabWidth = self.$region.width();//form width
                tabWidth -= self.$region.find('.b-requestDetail-right').outerWidth(true);
                //
                var tabHeight = Math.max(0, tabHeight - 10);
                self.TabHeight(tabHeight + 'px');
                self.TabWidth(Math.max(0, tabWidth - 5) + 'px');
                //
                self.ResizeFinanceFields(tabHeight);
            };
            //
            self.Unload = function () {
                $(document).unbind('objectInserted', self.onObjectInserted);
                $(document).unbind('objectUpdated', self.onObjectUpdated);
                $(document).unbind('objectDeleted', self.onObjectDeleted);
                $(document).unbind('local_objectInserted', self.onObjectInserted);
                $(document).unbind('local_objectUpdated', self.onObjectUpdated);
                $(document).unbind('local_objectDeleted', self.onObjectDeleted);
                //
                if (self.attachmentsControl != null)
                    self.attachmentsControl.RemoveUploadedFiles();
                if (self.parametersControl != null)
                    self.parametersControl.DestroyControls();
                if (self.workflowControl() != null)
                    self.workflowControl().Unload();
                if (self.pu_activesLocation != null)
                    self.pu_activesLocation.DestroyControls();
                self.ar_specificationsList.Dispose();
                self.pu_specificationsList.Dispose();
            };
            //
            self.onProgressBarProcessed = function (e, objectClassID, objectID, progressMessage, percentage) {
                //alert("progressBarProcessed");
            };
            //
            self.onObjectInserted = function (e, objectClassID, objectID, parentObjectID) {
                var currentID = self.workOrder().ID();
                //
                if (objectClassID == 110 && currentID == parentObjectID) //OBJ_DOCUMENT
                    self.LoadAttachmentsControl();
                else if (objectClassID == 160 && currentID == parentObjectID) //OBJ_NEGOTIATION
                {
                    if (self.negotiationList.isLoaded())
                        self.negotiationList.imList.TryReloadByID(objectID);
                    else
                        self.Reload(currentID);
                }
                else if (objectClassID == 380 && currentID == parentObjectID) //OBJ_ActivesRequestSpecification
                {
                    if (self.ar_specificationsList.isLoaded())
                        self.ar_specificationsList.loadObjectListByIDs([objectID], false);
                }
                else if (objectClassID == 381 && currentID == parentObjectID) //OBJ_PurchaseSpecification
                {
                    if (self.pu_specificationsList.isLoaded())
                        self.pu_specificationsList.loadObjectListByIDs([objectID], false);
                }
                else if (objectClassID == 180 && currentID == parentObjectID) //OBJ_FinanceBudgetRow
                {
                    if (self.pu_FinanceBudgetRowList.isLoaded())
                        self.pu_FinanceBudgetRowList.imList.TryReloadByID(objectID);
                }
                else if (objectClassID == 117 && currentID == parentObjectID) //OBJ_NOTIFICATION ~ SDNote
                {
                    if (self.tapeControl.isNoteListLoaded())
                        self.tapeControl.TryAddNoteByID(objectID);
                    else
                        self.Reload(currentID);
                }
            };
            self.onObjectUpdated = function (e, objectClassID, objectID, parentObjectID) {
                var currentID = self.workOrder().ID();
                //
                if (objectClassID == 160 && currentID == parentObjectID) //OBJ_NEGOTIATION
                {
                    if (self.negotiationList.isLoaded())
                        self.negotiationList.imList.TryReloadByID(objectID);
                    else
                        self.Reload(currentID);
                }
                else if (objectClassID == 380 && currentID == parentObjectID) //OBJ_ActivesRequestSpecification
                {
                    if (self.ar_specificationsList.isLoaded())
                        self.ar_specificationsList.loadObjectListByIDs([objectID], false);
                }
                else if (objectClassID == 381 && currentID == parentObjectID) //OBJ_PurchaseSpecification
                {
                    if (self.pu_specificationsList.isLoaded())
                        self.pu_specificationsList.loadObjectListByIDs([objectID], false);
                }
                else if (objectClassID == 180 && currentID == parentObjectID) //OBJ_FinanceBudgetRow
                {
                    if (self.pu_FinanceBudgetRowList.isLoaded())
                        self.pu_FinanceBudgetRowList.imList.TryReloadByID(objectID);
                }
                else if (objectClassID == 117 && currentID == parentObjectID) //OBJ_NOTIFICATION ~ SDNote
                {
                    if (self.tapeControl.isNoteListLoaded())
                        self.tapeControl.TryAddNoteByID(objectID);
                    else
                        self.Reload(currentID);
                }
                else if (objectID == self.workOrder().ReferenceObjectID())
                    self.LoadReferenceObject();
                else if (objectClassID == 119 && currentID == objectID && e.type != 'local_objectUpdated') //OBJ_WORKORDER
                    self.Reload(currentID);
            };
            self.onObjectDeleted = function (e, objectClassID, objectID, parentObjectID) {
                var currentID = self.workOrder().ID();
                //
                if (objectClassID == 110 && currentID == parentObjectID) //OBJ_DOCUMENT
                    self.LoadAttachmentsControl();
                else if (objectClassID == 160 && currentID == parentObjectID) //OBJ_NEGOTIATION
                {
                    if (self.negotiationList.isLoaded())
                        self.negotiationList.imList.TryRemoveByID(objectID);
                    else
                        self.Reload(currentID);
                }
                else if (objectClassID == 380 && currentID == parentObjectID) //OBJ_ActivesRequestSpecification
                {
                    if (self.ar_specificationsList.isLoaded())
                        self.ar_specificationsList.removeRowByID(objectID);
                }
                else if (objectClassID == 381 && currentID == parentObjectID) //OBJ_PurchaseSpecification
                {
                    if (self.pu_specificationsList.isLoaded())
                        self.pu_specificationsList.removeRowByID(objectID);
                }
                if (objectClassID == 180 && currentID == parentObjectID) //OBJ_FinanceBudgetRow
                {
                    if (self.pu_FinanceBudgetRowList.isLoaded())
                        self.pu_FinanceBudgetRowList.imList.TryRemoveByID(objectID);
                }
                else if (objectID == self.workOrder().ReferenceObjectID()) {
                    self.workOrder().ReferenceObject(null);
                    self.workOrder().ReferenceObjectID(null);
                    self.workOrder().ReferenceClassID(null);
                }
                else if (objectClassID == 119 && currentID == objectID) //OBJ_WORKORDER
                {
                    self.IsReadOnly(true);
                    require(['sweetAlert'], function () {
                        swal(getTextResource('ObjectDeleted'), 'info');
                    });
                }
            };
            //
            self.ShowReferenceObjectForm = function (referenceObject) {
                if (referenceObject.ClassID() === 701) {
                    showSpinner();
                    require(['sdForms'], function (module) {
                        var fh = new module.formHelper(true);
                        fh.ShowCall(referenceObject.ID, self.IsReadOnly() == true ? fh.Mode.ReadOnly : fh.Mode.Default);
                    });
                }
                else if (referenceObject.ClassID() === 702) {
                    showSpinner();
                    require(['sdForms'], function (module) {
                        var fh = new module.formHelper(true);
                        fh.ShowProblem(referenceObject.ID, self.IsReadOnly() == true ? fh.Mode.ReadOnly : fh.Mode.Default);
                    });
                }
                else if (referenceObject.ClassID() === 371) {
                    showSpinner();
                    require(['sdForms'], function (module) {
                        var fh = new module.formHelper(true);
                        fh.ShowProject(referenceObject.ID);
                    });
                }
            };
            //
            self.ContextMenuVisible = ko.observable(false);
            //
            self.LinkObjectClick = function (data, e) {
                var isVisible = self.ContextMenuVisible();
                self.ContextMenuVisible(!isVisible);
                //
                e.stopPropagation();
            };
            //
            self.OnFormClick = function () {
                self.ContextMenuVisible(false);
                return true;
            };
            //
            self.LinkObjectCallBack = function (objectID, classID) {
                self.ContextMenuVisible(false);
                //
                var workOrder = self.workOrder();
                if (!workOrder)
                    return;
                //
                workOrder.LoadReferenceObject(objectID, classID, workOrder.CauseObject, workOrder.CauseClassID, self.InitializeClient, false, self.ResizeFinanceFields);
                //
                self.SaveCauseObject(objectID, classID);
            };
            //
            self.ajaxControl_loadCauseObject = new ajaxLib.control();
            self.SaveCauseObject = function (objectID, classID) {
                var wo = self.workOrder();
                if (!wo)
                    return;
                //
                var data = {
                    ID: wo.ID(),
                    ObjClassID: self.objectClassID,
                    Field: 'CauseObject',
                    OldValue: JSON.stringify({ 'id': wo.ReferenceObjectID(), 'classID': wo.ReferenceClassID(), 'fullName': '' }),
                    NewValue: JSON.stringify({ 'id': objectID, 'classID': classID, 'fullName': '' }),
                    Params: null,
                    ReplaceAnyway: true
                };
                //
                self.ajaxControl_loadCauseObject.Ajax(
                            self.$region,
                            {
                                dataType: "json",
                                method: 'POST',
                                url: 'sdApi/SetField',
                                data: data
                            },
                            function (retModel) {
                                if (retModel) {
                                }
                                else {
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('SaveError'), getTextResource('GlobalError') + '\n[WorkOrderForm.js SaveCauseObject]', 'error');
                                    });
                                }
                            });
            };
            //
            self.LinkCall = function () {
                showSpinner();
                require(['usualForms'], function (module) {
                    var fh = new module.formHelper(true);
                    fh.ShowSearcherLite([701], null, null, null, null, self.LinkObjectCallBack);
                });
            };
            //
            self.LinkProject = function () {
                showSpinner();
                require(['usualForms'], function (module) {
                    var fh = new module.formHelper(true);
                    fh.ShowSearcherLite([371], null, null, null, null, self.LinkObjectCallBack);
                });
            };
            //
            self.LoadReferenceObject = function () {
                var wo = self.workOrder();
                if (!wo)
                    return;
                //
                var id = wo.ReferenceObjectID();
                var classID = wo.ReferenceClassID();
                var referenceObj = wo.ReferenceObject;
                var typeClassStr = wo.WorkOrderTypeClassString();
                if (typeClassStr == 'ActivesRequest' || typeClassStr == 'Purchase')
                    wo.LoadReferenceObject(id, classID, wo.CauseObject, wo.CauseClassID, self.InitializeClient, false, self.ResizeFinanceFields);
                else
                    wo.LoadReferenceObject(id, classID, referenceObj, null, null, true, null);
            };
            //
            self.ResizeFinanceFields = function (tabHeight) {
                var wo = self.workOrder();
                if (!wo)
                    return;
                //
                var height = self.$region.find('.wo-causeObject').outerHeight() + 20;
                if (wo.WorkOrderTypeClassString() == 'ActivesRequest') {
                    self.$region.find('#activesRequestFields').css('paddingTop', height + 'px');
                }
                else if (wo.WorkOrderTypeClassString() == 'Purchase') {
                    self.$region.find('#purchaseFields').css('paddingTop', height + 'px');
                }
                else if (wo.WorkOrderTypeClassString() == 'Inventory') {
                    self.$region.find('#inventoryFields').css('paddingTop', height + 'px');
                }
                //
                self.pu_activesLocation.Resize(tabHeight);
            };
            //
            self.EditCounterParty = function () {
                if (!self.CanEdit())
                    return;
                //
                showSpinner();
                var wo = self.workOrder();
                require(['usualForms'], function (fhModule) {
                    var fh = new fhModule.formHelper(true);
                    var options = {
                        ID: wo.ID(),
                        objClassID: self.objectClassID,
                        fieldName: 'WorkOrder.CounterParty',
                        fieldFriendlyName: getTextResource('FinancePurchase_Сounterparty'),
                        comboBoxGetValueUrl: 'finApi/GetSupplierList',
                        oldValue: wo.CounterPartyID() ? { ID: wo.CounterPartyID() } : null,
                        onSave: function (selectedValue) {
                            wo.CounterPartyID(selectedValue ? selectedValue.ID : null);
                            wo.CounterPartyName(selectedValue ? selectedValue.Name : '');
                        },
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.comboBoxEdit, options);
                });
            };
            //
            self.EditDateDelivered = function () {
                if (self.CanEdit() == false)
                    return;
                //
                showSpinner();
                require(['usualForms'], function (module) {
                    var fh = new module.formHelper(true);
                    var options = {
                        ID: self.workOrder().ID(),
                        objClassID: self.objectClassID,
                        fieldName: 'WorkOrder.DateDelivered',
                        fieldFriendlyName: getTextResource('FinancePurchase_SupplyDate'),
                        oldValue: self.workOrder().UtcDateDeliveredDT(),
                        onSave: function (newDate) {
                            self.workOrder().UtcDateDelivered(parseDate(newDate));
                            self.workOrder().UtcDateDeliveredDT(new Date(parseInt(newDate)));
                        }
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.dateEdit, options);
                });
            };
            //
            self.EditPurchaseConcord = function () {
                if (self.CanEdit() == false)
                    return;
                //
                showSpinner();
                require(['usualForms'], function (module) {
                    var fh = new module.formHelper(true);
                    var options = {
                        ID: self.workOrder().ID(),
                        objClassID: self.objectClassID,
                        fieldName: 'WorkOrder.Concord',
                        fieldFriendlyName: getTextResource('FinancePurchase_Concord'),
                        oldValue: self.workOrder().PurchaseConcord(),
                        onSave: function (newText) {
                            self.workOrder().PurchaseConcord(newText);
                        }
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.textEdit, options);
                });
            };
            //
            self.EditPurchaseBill = function () {
                if (self.CanEdit() == false)
                    return;
                //
                showSpinner();
                require(['usualForms'], function (module) {
                    var fh = new module.formHelper(true);
                    var options = {
                        ID: self.workOrder().ID(),
                        objClassID: self.objectClassID,
                        fieldName: 'WorkOrder.PurchaseBill',
                        fieldFriendlyName: getTextResource('FinancePurchase_Bill'),
                        oldValue: self.workOrder().PurchaseBill(),
                        onSave: function (newText) {
                            self.workOrder().PurchaseBill(newText);
                        }
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.textEdit, options);
                });
            };
            //
            self.EditInventoryDocument = function () {
                if (self.CanEdit() == false)
                    return;
                //
                showSpinner();
                require(['usualForms'], function (module) {
                    var fh = new module.formHelper(true);
                    var options = {
                        ID: self.workOrder().ID(),
                        objClassID: self.objectClassID,
                        fieldName: 'WorkOrder.InventoryDocument',
                        fieldFriendlyName: getTextResource('AssetInventory_Document'),
                        oldValue: self.workOrder().InventoryDocument(),
                        allowNull: true,
                        maxLength: 250,
                        onSave: function (newText) {
                            self.workOrder().InventoryDocument(newText);
                        }
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.textEdit, options);
                });
            };
            //
            self.EditInventoryFounding = function () {
                if (self.CanEdit() == false)
                    return;
                //
                showSpinner();
                require(['usualForms'], function (module) {
                    var fh = new module.formHelper(true);
                    var options = {
                        ID: self.workOrder().ID(),
                        objClassID: self.objectClassID,
                        fieldName: 'WorkOrder.InventoryFounding',
                        fieldFriendlyName: getTextResource('AssetInventory_Founding'),
                        oldValue: self.workOrder().InventoryFounding(),
                        allowNull: true,
                        maxLength: 250,
                        onSave: function (newText) {
                            self.workOrder().InventoryFounding(newText);
                        }
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.textEdit, options);
                });
            };
            //                
            self.PurchaseDetailBudgetString = ko.computed(function () {
                if (!self.workOrder())
                    return '';
                return self.workOrder().PurchaseDetailBudget() == true ? getTextResource('FinancePurchase_DetailBudget_Yes') : getTextResource('FinancePurchase_DetailBudget_No');
            });
            self.PurchaseDetailBudgetReadOnly = ko.computed(function () {
                if (!self.workOrder())
                    return true;
                if (self.workOrder().PurchaseDetailBudgetReadOnly() == true)
                    return true;
                //
                return false;
            });
            self.EditPurchaseDetailBudget = function () {
                if (self.CanEdit() == false)
                    return;
                if (self.PurchaseDetailBudgetReadOnly() == true) {
                    require(['sweetAlert'], function () {
                        swal(getTextResource('FinancePurchase_DetailBudget'), getTextResource('WorkOrderContainsFinanceBudgetRows'), 'info');
                    });
                    return;
                }
                //
                showSpinner();
                require(['usualForms'], function (module) {
                    var fh = new module.formHelper(true);
                    var options = {
                        ID: self.workOrder().ID(),
                        objClassID: self.objectClassID,
                        fieldName: 'WorkOrder.PurchaseDetailBudget',
                        fieldFriendlyName: getTextResource('FinancePurchase_DetailBudget'),
                        oldValue: self.workOrder().PurchaseDetailBudget() == true ? { ID: true, Name: getTextResource('FinancePurchase_DetailBudget_Yes') } : { ID: false, Name: getTextResource('FinancePurchase_DetailBudget_No') },
                        comboBoxValueList: [{ ID: false, Name: getTextResource('FinancePurchase_DetailBudget_No') }, { ID: true, Name: getTextResource('FinancePurchase_DetailBudget_Yes') }],
                        onSave: function (newVal) {
                            self.workOrder().PurchaseDetailBudget(newVal);
                        }
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.comboBoxEdit, options);
                });
            };
            //
            self.InitializeInventorySpecificationControl = function () {
                if (self.inventory_specificationControl())
                    return;
                //
                self.inventory_specificationControl(new inventory_specificationControlLib.Control(self, self.objectClassID, self.$region.find('.pu_specifications__b').selector, self.IsReadOnly, self.CanEdit, self.$region));
            };
        }
    }
    return module;
});