define(['knockout', 'jquery', 'usualForms', 'ajax', 'comboBox', 'dateTimeControl', 'parametersControl'], function (ko, $, fhModule, ajaxLib, cbLib, dtLib, pcLib) {
    var module = {
        ViewModel: function (mainRegionID, objectClassID, objectID, dependencyList) {
            var self = this;
            //
            //outer actions
            self.InvalidateHelpPanel = undefined;
            self.frm = undefined;
            //
            //vars
            self.formClassID = 119;//OBJ_WORKORDER
            self.MainRegionID = mainRegionID;
            self.ID = null;//for registered workOrder
            self.WorkOrderTemplateID = null;
            self.renderedD = $.Deferred();
            //
            self.ObjectClassID = objectClassID;//объект, с которым связано задание
            self.ObjectID = objectID;//объект, с которым связано задание
            //
            //tab pages
            {
                self.modes = {
                    nothing: 'nothing',
                    main: 'main',
                    parameterPrefix: 'parameter_'
                };
                //
                self.mode = ko.observable(self.modes.nothing);
                self.mode.subscribe(function (newValue) {
                    if (newValue == self.modes.nothing)
                        return;
                    //
                    if (newValue == self.modes.main) {
                    }
                    else if (newValue.indexOf(self.modes.parameterPrefix) != -1)
                        self.InitializeParametersTabs();
                });
            }
            //
            //priority / influence / urgency
            {
                self.PriorityID = null;
                self.PriorityName = ko.observable(getTextResource('PromptPriority'));
                self.PriorityColor = ko.observable('');
                //
                self.priorityControl = null;
                self.LoadPriorityControl = function () {
                    require(['models/SDForms/WorkOrderForm.Priority'], function (prLib) {
                        if (self.priorityControl == null || self.priorityControl.IsLoaded() == false) {
                            self.priorityControl = new prLib.ViewModel($('#' + self.MainRegionID).find('.b-requestDetail-menu__priority'), self, false);
                            self.priorityControl.Initialize();
                        }
                        $.when(self.priorityControl.Load(null, 119, self.PriorityID)).done(function (result) {
                        });
                    });
                };
                self.RefreshPriority = function (priorityObj) {//invokes from priorityControl
                    if (priorityObj == null)
                        return;
                    //
                    self.PriorityName(priorityObj.Name);
                    self.PriorityColor(priorityObj.Color);
                    self.PriorityID = priorityObj.ID;
                };
            }
            //
            //name
            {
                self.Name = ko.observable('');
                //
                self.EditName = function () {
                    showSpinner();
                    var fh = new fhModule.formHelper(true);
                    var options = {
                        fieldName: 'WorkOrder.Name',
                        fieldFriendlyName: getTextResource('Name'),
                        oldValue: self.Name(),
                        onSave: function (newText) {
                            self.Name(newText);
                        },
                        nosave: true
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.textEdit, options);
                };
            }
            //
            //description
            {
                self.htmlDescriptionControlD = $.Deferred();
                self.IsDescriptionContainerVisible = ko.observable(true);
                self.ToggleDescriptionContainer = function () {
                    self.IsDescriptionContainerVisible(!self.IsDescriptionContainerVisible());
                };
                //
                self.htmlDescriptionControl = null;
                self.InitializeDescription = function () {
                    var htmlElement = $('#' + self.MainRegionID).find('.description');
                    if (self.htmlDescriptionControl == null)
                        require(['htmlControl'], function (htmlLib) {
                            self.htmlDescriptionControl = new htmlLib.control(htmlElement);
                            self.htmlDescriptionControlD.resolve();
                            self.htmlDescriptionControl.OnHTMLChanged = function (htmlValue) {
                                self.Description(htmlValue);
                            };
                        });
                    else
                        self.htmlDescriptionControl.Load(htmlElement);
                };
                //
                self.Description = ko.observable('');
                self.Description.subscribe(function (newValue) {
                    if (self.htmlDescriptionControl != null)
                        self.htmlDescriptionControl.SetHTML(newValue);
                });
                //
                self.EditDescription = function () {
                    showSpinner();
                    var fh = new fhModule.formHelper(true);
                    var options = {
                        fieldName: 'WorkOrder.Description',
                        fieldFriendlyName: getTextResource('Description'),
                        oldValue: self.Description(),
                        onSave: function (newHTML) {
                            self.Description(newHTML);
                        },
                        nosave: true
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.htmlEdit, options);
                };
            }
            //
            //attachments
            {
                self.attachmentsControl = null;
                self.LoadAttachmentsControl = function () {
                    require(['fileControl'], function (fcLib) {
                        if (self.attachmentsControl != null)
                            self.attachmentsControl.RemoveUploadedFiles();//previous object                   
                        //
                        if (self.attachmentsControl == null || self.attachmentsControl.IsLoaded() == false) {
                            var attachmentsElement = $('#' + self.MainRegionID).find('.documentList');
                            self.attachmentsControl = new fcLib.control(attachmentsElement, '.ui-dialog', '.b-requestDetail__files-addBtn');
                        }
                        self.attachmentsControl.ReadOnly(false);
                    });
                };
            }
            //
            //for comboBox
            {
                self.createComboBoxItem = function (simpleDictionary) {
                    var thisObj = this;
                    //
                    thisObj.ID = simpleDictionary.ID;
                    thisObj.Name = simpleDictionary.Name;
                };
                //
                self.createComboBoxHelper = function (container_selector, getUrl, comboBoxFunc) {
                    var thisObj = this;
                    if (!comboBoxFunc)
                        comboBoxFunc = self.createComboBoxItem;
                    //
                    thisObj.SelectedItem = ko.observable(null);
                    //
                    thisObj.ItemList = ko.observableArray([]);
                    thisObj.ItemListD = $.Deferred();
                    thisObj.getItemList = function (options) {
                        var data = thisObj.ItemList();
                        options.callback({ data: data, total: data.length });
                    };
                    //
                    thisObj.ajaxControl = new ajaxLib.control();
                    thisObj.LoadList = function () {
                        thisObj.ajaxControl.Ajax($(container_selector),
                            {
                                url: getUrl,
                                method: 'GET'
                            },
                            function (response) {
                                if (response) {
                                    thisObj.ItemList.removeAll();
                                    //
                                    $.each(response, function (index, simpleDictionary) {
                                        var u = new comboBoxFunc(simpleDictionary);
                                        thisObj.ItemList().push(u);
                                    });
                                    thisObj.ItemList.valueHasMutated();
                                }
                                thisObj.ItemListD.resolve();
                            });
                    };
                    //
                    thisObj.GetObjectInfo = function (classID) {
                        return thisObj.SelectedItem() ? { ID: thisObj.SelectedItem().ID, ClassID: classID, FullName: thisObj.SelectedItem().Name } : null;
                    };
                    thisObj.SetSelectedItem = function (id) {
                        $.when(thisObj.ItemListD).done(function () {
                            var item = null;
                            if (id != undefined && id != null)
                                for (var i = 0; i < thisObj.ItemList().length; i++) {
                                    var tmp = thisObj.ItemList()[i];
                                    if (tmp.ID == id) {
                                        item = tmp;
                                        break;
                                    }
                                }
                            thisObj.SelectedItem(item);
                        });
                    };
                }
            }
            //           
            //workOrderType
            {
                self.createWorkOrderType = function (info) {
                    thisObj = this;
                    //
                    thisObj.ID = info.ID;
                    thisObj.Name = info.Name;
                    thisObj.Default = info.Default;
                    thisObj.TypeClass = info.TypeClass;
                }
                self.WorkOrderTypeHelper = new self.createComboBoxHelper('#' + self.MainRegionID + ' .workOrderType', 'sdApi/GetWorkOrderTypeList', self.createWorkOrderType);
                self.IsPurchase = ko.computed(function () {
                    var retval = false;
                    if (self.WorkOrderTypeHelper.SelectedItem() != null)
                        retval = self.WorkOrderTypeHelper.SelectedItem().TypeClass == 2;
                    return retval;
                });
                self.EditWorkOrderType = function () {
                    showSpinner();
                    require(['ui_forms/SD/frmWorkOrderTypeTree'], function (jsModule) {
                        var retvalD = jsModule.ShowDialog(true);
                        $.when(retvalD).done(function (val) {
                            if (val) {
                                $.when(self.WorkOrderTypeHelper.ItemListD).done(function () {
                                    for (var i = 0; i < self.WorkOrderTypeHelper.ItemList().length; i++) {
                                        var item = self.WorkOrderTypeHelper.ItemList()[i];
                                        if (item.ID == val) {
                                            self.WorkOrderTypeHelper.SetSelectedItem(item.ID);
                                            break;
                                        }
                                    }
                                });
                            }
                        });
                    });
                    //старый способ смены типа по искалке типов заданий (не фильтруется по видам деятельности!)
                    //showSpinner();
                    //var fh = new fhModule.formHelper(true);
                    //var options = {
                    //    fieldName: 'WorkOrder.WorkOrderType',
                    //    fieldFriendlyName: getTextResource('WorkOrderType'),
                    //    oldValue: self.WorkOrderTypeHelper.GetObjectInfo(142),
                    //    searcherName: 'WorkOrderTypeSearcher', //этот выдает все типы заданий, в отличии от штуковины на форме задания
                    //    searcherPlaceholder: getTextResource('PromptType'),
                    //    onSave: function (objectInfo) {
                    //        self.WorkOrderTypeHelper.SetSelectedItem(objectInfo ? objectInfo.ID : null);
                    //    },
                    //    nosave: true
                    //};
                    //fh.ShowSDEditor(fh.SDEditorTemplateModes.searcherEdit, options);
                };
                //
                self.WorkOrderTypeHelper.SelectedItem.subscribe(function (newValue) {
                    self.LoadTipicalWorkOrders();
                    self.LoadWorkOrderTemplateList();
                });
                $.when(self.WorkOrderTypeHelper.ItemListD).done(function () {
                    for (var i = 0; i < self.WorkOrderTypeHelper.ItemList().length; i++) {
                        var item = self.WorkOrderTypeHelper.ItemList()[i];
                        if (item.Default == true && !self.AddAs) {
                            self.WorkOrderTypeHelper.SetSelectedItem(item.ID);
                            break;
                        }
                    }
                });
                //
                self.CheckWorkOrderTypeSettings = function () {
                    var ajaxControl = new ajaxLib.control();
                    ajaxControl.Ajax(null,
                        {
                            url: 'configApi/WorkOrderRegistration_UseTypeSelectionDialog',
                            method: 'GET'
                        },
                        function (openForm) {
                            if (openForm === true)
                                self.EditWorkOrderType();
                        });
                };
            }
            //
            //purchase fields
            {
                //counterParty ~ supplier
                {
                    self.createCounterParty = function (info) {
                        thisObj = this;
                        //
                        thisObj.ID = info.ID;
                        thisObj.Name = info.Name;
                    }
                    self.CounterPartyHelper = new self.createComboBoxHelper('#' + self.MainRegionID + ' .counterParty', 'finApi/GetSupplierList', self.createCounterParty);
                }
                //Concord
                self.Concord = ko.observable('');
                //DateDelivered
                {
                    self.DateDeliveredPickerControlD = $.Deferred();
                    self.DateDelivered = ko.observable(null);
                    self.DateDeliveredControl = null;
                    self.DateDeliveredStr = ko.observable(null);
                    self.DateDeliveredStr.subscribe(function (newValue) {
                        if (self.DateDeliveredControl.$isLoaded.state() != 'resolved')
                            return;
                        //
                        var dt = self.DateDeliveredControl.dtpControl.length > 0 ? self.DateDeliveredControl.dtpControl.datetimepicker('getValue') : null;
                        //
                        if (!newValue || newValue.length == 0)
                            self.DateDelivered(null);//clear field => reset value
                        else if (dtLib.Date2String(dt, false) != newValue) {
                            self.DateDelivered(null);//value incorrect => reset value
                            self.DateDeliveredeStr('');
                        }
                        else
                            self.DateDelivered(dt);
                    });
                    self.CreateDateDeliveredEditor = function () {
                        var dtpContainer = $('#' + self.MainRegionID + ' .dateDelivered');
                        //
                        if (self.DateDeliveredControl)
                            self.DateDeliveredControl.destroy();
                        //
                        self.DateDeliveredControl = new dtLib.control();
                        self.DateDeliveredControl.init(dtpContainer, {
                            StringObservable: self.DateDeliveredStr,
                            ValueDate: self.DateDelivered(),
                            OnSelectDateFunc: function (current_time, $input) {
                                self.DateDelivered(current_time);
                                self.DateDeliveredStr(dtLib.Date2String(current_time, false));
                            },
                            OnSelectTimeFunc: function (current_time, $input) {
                                self.DateDelivered(current_time);
                                self.DateDeliveredStr(dtLib.Date2String(current_time, false));
                            },
                            HeaderText: null,
                            OnlyDate: false
                        });
                        $.when(self.DateDeliveredControl.$isLoaded).done(function () {
                            self.DateDeliveredPickerControlD.resolve();
                        });
                        //
                        return self.DateDeliveredPickerControlD.promise();
                    };
                }
                //bill
                self.Bill = ko.observable('');
                //DetailBudget
                self.DetailBudget = ko.observable(false);
            }
            //            
            //for all user controls
            {
                self.CanEdit = ko.computed(function () {
                    return true;
                });
            }
            //           
            //initiator
            {
                self.InitiatorLoaded = ko.observable(false);
                self.InitiatorID = null;
                self.Initiator = ko.observable(null);
                self.Initiator.subscribe(function (newValue) {
                    self.LoadTipicalWorkOrders();
                    if (self.TipicalWorkOrders().length > 0)
                        self.TipicalWorkOrdersVisible(true);
                });
                //
                self.InitializeInitiator = function () {
                    require(['models/SDForms/SDForm.User'], function (userLib) {
                        if (self.InitiatorLoaded() == false) {
                            if (self.InitiatorID) {
                                var options = {
                                    UserID: self.InitiatorID,
                                    UserType: userLib.UserTypes.workOrderInitiator,
                                    UserName: null,
                                    EditAction: self.EditInitiator,
                                    RemoveAction: self.DeleteInitiator
                                };
                                var user = new userLib.User(self, options);
                                self.Initiator(user);
                                self.InitiatorLoaded(true);
                            }
                            else
                                self.Initiator(new userLib.EmptyUser(self, userLib.UserTypes.workOrderInitiator, self.EditInitiator));
                        }
                    });
                };
                self.EditInitiator = function () {
                    showSpinner();
                    require(['models/SDForms/SDForm.User'], function (userLib) {
                        var fh = new fhModule.formHelper(true);
                        var options = {
                            fieldName: 'WorkOrder.Initiator',
                            fieldFriendlyName: getTextResource('Initiator'),
                            oldValue: self.InitiatorLoaded() ? { ID: self.Initiator().ID(), ClassID: 9, FullName: self.Initiator().FullName() } : null,
                            object: ko.toJS(self.Initiator()),
                            searcherName: 'WebUserSearcher',
                            searcherPlaceholder: getTextResource('EnterFIO'),
                            onSave: function (objectInfo) {
                                self.InitiatorLoaded(false);
                                self.Initiator(new userLib.EmptyUser(self, userLib.UserTypes.workOrderInitiator, self.EditInitiator));
                                self.InitiatorID = objectInfo ? objectInfo.ID : null;
                                //
                                self.InitializeInitiator();
                            },
                            nosave: true
                        };
                        fh.ShowSDEditor(fh.SDEditorTemplateModes.searcherEdit, options);
                    });
                };
                self.DeleteInitiator = function () {
                    require(['models/SDForms/SDForm.User'], function (userLib) {
                        self.InitiatorLoaded(false);
                        self.InitiatorID = null;
                        self.Initiator(new userLib.EmptyUser(self, userLib.UserTypes.workOrderInitiator, self.EditInitiator));
                    });
                };
            }
            //
            //
            //queue
            {
                self.QueueLoaded = ko.observable(false);
                self.QueueID = null;
                self.QueueName = null;
                self.Queue = ko.observable(null);
                //
                self.InitializeQueue = function () {
                    require(['models/SDForms/SDForm.User'], function (userLib) {
                        if (self.QueueLoaded() == false) {
                            if (self.QueueID) {
                                var options = {
                                    UserID: self.QueueID,
                                    UserType: userLib.UserTypes.queueExecutor,
                                    UserName: self.QueueName,
                                    EditAction: self.EditQueue,
                                    RemoveAction: self.DeleteQueue
                                };
                                var queue = new userLib.User(self, options);
                                self.Queue(queue);
                                self.QueueLoaded(true);
                            }
                            else
                                self.Queue(new userLib.EmptyUser(self, userLib.UserTypes.queueExecutor, self.EditQueue));
                        }
                    });
                };
                //
                self.ClearExecutor = ko.observable(true);
                self.CheckExecutor = function () {
                    var UserIDs = self.Queue().QueueUserIDList();
                    self.ClearExecutor(true);
                    UserIDs.forEach(function (item) {
                        if (item == self.ExecutorID)
                            self.ClearExecutor(false);
                    })
                    if (self.ClearExecutor()) {
                        self.DeleteExecutor();
                    }
                };
                //
                self.EditQueue = function () {
                    showSpinner();
                    require(['models/SDForms/SDForm.User'], function (userLib) {
                        var fh = new fhModule.formHelper(true);
                        var options = {
                            fieldName: 'WorkOrder.Queue',
                            fieldFriendlyName: getTextResource('Queue'),
                            oldValue: self.QueueLoaded() ? { ID: self.Queue().ID(), ClassID: self.Queue().ClassID(), FullName: self.Queue().FullName() } : null,
                            object: ko.toJS(self.Queue()),
                            searcherName: "QueueSearcher",
                            searcherPlaceholder: getTextResource('EnterQueue'),
                            searcherParams: ['2'],//for workOrder
                            onSave: function (objectInfo) {
                                self.QueueLoaded(false);
                                self.Queue(new userLib.EmptyUser(self, userLib.UserTypes.queueExecutor, self.EditQueue));
                                //
                                if (objectInfo && objectInfo.ClassID == 722) { //IMSystem.Global.OBJ_QUEUE
                                    self.QueueID = objectInfo.ID;
                                    self.QueueName = objectInfo.FullName;
                                }
                                else {
                                    self.QueueID = null;
                                    self.QueueName = null;
                                }
                                self.InitializeQueue();
                            },
                            nosave: true
                        };
                        fh.ShowSDEditor(fh.SDEditorTemplateModes.searcherEdit, options);
                    });
                };
                self.DeleteQueue = function () {
                    require(['models/SDForms/SDForm.User'], function (userLib) {
                        self.QueueLoaded(false);
                        self.QueueID = null;
                        self.QueueName = null;
                        self.Queue(new userLib.EmptyUser(self, userLib.UserTypes.queueExecutor, self.EditQueue));
                    });
                };
            }
            //
            //executor
            {
                self.ExecutorLoaded = ko.observable(false);
                self.ExecutorID = null;
                self.Executor = ko.observable(null);
                //
                self.InitializeExecutor = function () {
                    require(['models/SDForms/SDForm.User'], function (userLib) {
                        if (self.ExecutorLoaded() == false) {
                            if (self.ExecutorID) {
                                var options = {
                                    UserID: self.ExecutorID,
                                    UserType: userLib.UserTypes.executor,
                                    UserName: null,
                                    EditAction: self.EditExecutor,
                                    RemoveAction: self.DeleteExecutor
                                };
                                var user = new userLib.User(self, options);
                                self.Executor(user);
                                self.ExecutorLoaded(true);
                            }
                            else
                                self.Executor(new userLib.EmptyUser(self, userLib.UserTypes.executor, self.EditExecutor));
                        }
                    });
                };
                self.EditExecutor = function () {
                    showSpinner();
                    require(['models/SDForms/SDForm.User'], function (userLib) {
                        var fh = new fhModule.formHelper(true);
                        var options = {
                            fieldName: 'WorkOrder.Executor',
                            fieldFriendlyName: getTextResource('Executor'),
                            oldValue: self.ExecutorLoaded() ? { ID: self.Executor().ID(), ClassID: self.Executor().ClassID(), FullName: self.Executor().FullName() } : null,
                            object: ko.toJS(self.Executor()),
                            searcherName: "ExecutorUserSearcher",
                            searcherPlaceholder: getTextResource('EnterFIO'),
                            searcherParams: [self.QueueID],
                            onSave: function (objectInfo) {
                                self.ExecutorLoaded(false);
                                self.Executor(new userLib.EmptyUser(self, userLib.UserTypes.executor, self.EditExecutor));
                                //
                                if (objectInfo && objectInfo.ClassID == 9) { //IMSystem.Global.OBJ_USER
                                    self.ExecutorID = objectInfo.ID;
                                }
                                else {
                                    self.ExecutorID = null;
                                }
                                self.InitializeExecutor();
                            },
                            nosave: true
                        };
                        fh.ShowSDEditor(fh.SDEditorTemplateModes.searcherEdit, options);
                    });
                };
                self.DeleteExecutor = function () {
                    require(['models/SDForms/SDForm.User'], function (userLib) {
                        self.ExecutorLoaded(false);
                        self.ExecutorID = null;
                        self.Executor(new userLib.EmptyUser(self, userLib.UserTypes.executor, self.EditExecutor));
                    });
                };
            }
            //
            //assignor
            {
                self.AssignorLoaded = ko.observable(false);
                self.AssignorID = null;
                self.Assignor = ko.observable(null);
                //
                self.InitializeAssignor = function () {
                    require(['models/SDForms/SDForm.User'], function (userLib) {
                        if (self.AssignorLoaded() == false) {
                            if (self.AssignorID) {
                                var options = {
                                    UserID: self.AssignorID,
                                    UserType: userLib.UserTypes.assignor,
                                    UserName: null,
                                    EditAction: self.EditAssignor,
                                    RemoveAction: self.DeleteAssignor
                                };
                                var user = new userLib.User(self, options);
                                self.Assignor(user);
                                self.AssignorLoaded(true);
                            }
                            else
                                self.Assignor(new userLib.EmptyUser(self, userLib.UserTypes.assignor, self.EditAssignor));
                        }
                    });
                };
                self.EditAssignor = function () {
                    showSpinner();
                    require(['models/SDForms/SDForm.User'], function (userLib) {
                        var fh = new fhModule.formHelper(true);
                        var options = {
                            fieldName: 'WorkOrder.Assignor',
                            fieldFriendlyName: getTextResource('Assignor'),
                            oldValue: self.AssignorLoaded() ? { ID: self.Assignor().ID(), ClassID: 9, FullName: self.Assignor().FullName() } : null,
                            object: ko.toJS(self.Assignor()),
                            searcherName: 'AccomplisherUserSearcher',
                            searcherPlaceholder: getTextResource('EnterFIO'),
                            onSave: function (objectInfo) {
                                self.AssignorLoaded(false);
                                self.AssignorID = objectInfo ? objectInfo.ID : null;
                                self.Assignor(new userLib.EmptyUser(self, userLib.UserTypes.assignor, self.EditAssignor));
                                //
                                self.InitializeAssignor();
                            },
                            nosave: true
                        };
                        fh.ShowSDEditor(fh.SDEditorTemplateModes.searcherEdit, options);
                    });
                };
                self.DeleteAssignor = function () {
                    require(['models/SDForms/SDForm.User'], function (userLib) {
                        self.AssignorLoaded(false);
                        self.AssignorID = null;
                        self.Assignor(new userLib.EmptyUser(self, userLib.UserTypes.assignor, self.EditAssignor));
                    });
                };
            }
            //
            //parameters
            {
                self.parametersControl = null;
                self.parameterListByGroup = null;//кеш отсортирортированных параметров, разбитых по группам
                self.ParameterList = ko.observable([]);//параметры текущей выбранной группы
                self.ParameterListGroupName = ko.computed(function () {
                    if (self.mode().indexOf(self.modes.parameterPrefix) != 0)
                        return '';
                    //
                    var groupName = self.mode().substring(self.modes.parameterPrefix.length);
                    return groupName;
                });
                self.GetParameterValueList = function () {//получения списка значений всех параметров
                    var retval = [];
                    //
                    if (self.parametersControl != null)
                        retval = self.parametersControl.GetParameterValueList();
                    //
                    return retval;
                };
                self.ParameterGroupList = ko.observable([]);
                self.InitializeParametersTabs = function () {
                    if (self.mode().indexOf(self.modes.parameterPrefix) != 0) {
                        self.ParameterList([]);
                        return;
                    }
                    //
                    var groupName = self.mode().substring(self.modes.parameterPrefix.length);
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
                    if (self.AddAs)
                        self.parametersControl.GetCopy(119, self.primaryObjectID, false, self.workOrderData, 3);
                    else
                        self.parametersControl.Create(119, self.WorkOrderTemplateID, false, 3);
                };
                self.OnParametersChanged = function () {//обновления списка параметров по объекту
                    if (self.parametersControl == null) {
                        self.parametersControl = new pcLib.control();
                        self.parametersControl.ClientID(null);//от клинета есть зависимые параметры
                        self.parametersControl.ReadOnly(false);
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
                                if (self.mode().indexOf(self.modes.parameterPrefix + groupName) != -1)
                                    newParameterListContainsOldGroup = true;
                            }
                            self.ParameterGroupList.valueHasMutated();
                            //
                            if (self.mode().indexOf(self.modes.parameterPrefix) == 0) {//сейчас вкладка параметры
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
            }
            //
            //
            self.Load = function () {
                self.mode(self.modes.main);
                //
                $.when(self.renderedD).done(function () {
                    $('#' + self.MainRegionID).find('.firstFocus').focus();
                    //
                    if (self.AddAs)
                        self.Fill(self.workOrderData);
                    //
                    self.LoadPriorityControl();
                    //
                    self.InitializeDescription();
                    self.LoadAttachmentsControl();
                    //
                    if (!self.AddAs)
                        self.WorkOrderTypeHelper.LoadList();
                    //
                    self.InitializeInitiator();
                    $.when(userD).done(function (user) {
                        self.InitiatorLoaded(false);
                        self.InitiatorID = user.UserID;
                        //
                        self.InitializeInitiator();
                    });
                    self.InitializeQueue();
                    self.InitializeExecutor();
                    self.InitializeAssignor();
                    //
                    self.OnParametersChanged();
                    //
                    self.LoadTipicalWorkOrders();
                    self.LoadWorkOrderTemplateList();
                    //
                    self.CheckWorkOrderTypeSettings();
                    //
                    self.CounterPartyHelper.LoadList();
                    self.CreateDateDeliveredEditor();
                });
            };
            //
            self.AfterRender = function () {
                self.renderedD.resolve();
            };
            //       
            self.IsRegisteringWorkOrder = false;
            //
            self.ajaxControl_RegisterWorkOrder = new ajaxLib.control();
            self.ValidateAndRegisterWorkOrder = function (showSuccessMessage) {
                var retval = $.Deferred();
                //
                if (self.IsRegisteringWorkOrder)
                    return;
                //
                var data = {
                    'WorkOrderTypeID': self.WorkOrderTypeHelper.SelectedItem() == null ? null : self.WorkOrderTypeHelper.SelectedItem().ID,
                    'Name': self.Name(),
                    'HTMLDescription': self.Description(),
                    'Files': self.attachmentsControl == null ? null : self.attachmentsControl.GetData(),
                    'WorkOrderTemplateID': self.WorkOrderTemplateID != null ? self.WorkOrderTemplateID : null,
                    'ParameterValueList': self.GetParameterValueList(),
                    'PriorityID': self.PriorityID,
                    'InitiatorID': self.InitiatorID,
                    'ExecutorID': self.ExecutorID,
                    'QueueID': self.QueueID,
                    'AssignorID': self.AssignorID,
                    'ObjectClassID': self.ObjectClassID,
                    'ObjectID': self.ObjectID,
                    'CounterPartyID': self.CounterPartyHelper.SelectedItem() == null ? null : self.CounterPartyHelper.SelectedItem().ID,
                    'Concord': self.Concord(),
                    'DateDeliveredSince1970': dtLib.Date2String(self.DateDelivered(), false) == self.DateDeliveredStr() ? dtLib.GetMillisecondsSince1970(self.DateDelivered()) : '',
                    'Bill': self.Bill(),
                    'DetailBudget': self.DetailBudget(),
                    'DependencyList': dependencyList
                };
                //    
                if (data.WorkOrderTypeID == null) {
                    require(['sweetAlert'], function () {
                        swal(getTextResource('PromptType'));
                    });
                    retval.resolve(null);
                    return;
                }
                if (!data.Name || data.Name.trim().length == 0) {
                    require(['sweetAlert'], function () {
                        swal(getTextResource('PromptName'));
                    });
                    retval.resolve(null);
                    return;
                }
                if (self.parametersControl == null) {
                    require(['sweetAlert'], function () {
                        swal(getTextResource('ParametersNotLoaded'));
                    });
                    retval.resolve(null);
                    return;
                }
                else if (!self.parametersControl.Validate()) {
                    retval.resolve(null);
                    return;
                }
                //
                self.IsRegisteringWorkOrder = true;
                showSpinner();
                self.ajaxControl_RegisterWorkOrder.Ajax(null,
                    {
                        url: 'sdApi/registerWorkOrder',
                        method: 'POST',
                        dataType: 'json',
                        data: data
                    },
                    function (response) {//WorkOrderRegistrationResponse
                        hideSpinner();
                        if (response) {
                            if (response.Message && response.Message.length > 0 && (showSuccessMessage == true || response.Type != 0))
                                require(['sweetAlert'], function () {
                                    swal(response.Message);//some problem
                                });
                            //
                            if (response.Type == 0) {//ok 
                                retval.resolve(response);
                                return;
                            }
                        }
                        retval.resolve(null);
                        self.IsRegisteringWorkOrder = false;
                    },
                    function (response) {
                        hideSpinner();
                        require(['sweetAlert'], function () {
                            swal(getTextResource('ErrorCaption'), getTextResource('AjaxError') + '\n[WorkOrderRegistration.js, RegisterWorkOrder]', 'error');
                        });
                        retval.resolve(null);
                        self.IsRegisteringWorkOrder = false;
                    });
                //
                return retval.promise();
            };
            //
            //
            //tipical workOrders - help panel
            {
                self.ajaxControl_WorkOrderInfoList = new ajaxLib.control();
                self.TipicalWorkOrders = ko.observableArray([]);
                self.TipicalWorkOrdersVisible = ko.observable(false);
                self.TipicalWorkOrders_paramWorkOrderTypeID = null;
                self.TipicalWorkOrders_paramUserID = null;
                self.TipicalWorkOrders_timeout = null;
                self.TipicalWorkOrdersVisible.subscribe(function (newValue) {
                    self.InvalidateHelpPanel();
                });
                var createTipicalWorkOrder = function (workOrderInfo) {
                    var thisObj = this;
                    //
                    thisObj.ID = workOrderInfo.ID;
                    thisObj.Number = workOrderInfo.Number;
                    thisObj.Name = workOrderInfo.Name;
                    //
                    thisObj.Description = workOrderInfo.Description;
                    thisObj.HTMLDescription = workOrderInfo.HTMLDescription;
                    //
                    thisObj.UseClick = function () {
                        self.Name(thisObj.Name);
                        self.Description(thisObj.HTMLDescription);
                    };
                    thisObj.ShowWorkOrderClick = function () {
                        require(['sdForms'], function (module) {
                            var fh = new module.formHelper();
                            fh.ShowWorkOrder(thisObj.ID, fh.Mode.Default);
                        });
                    };
                };
                self.LoadTipicalWorkOrders = function () {
                    var selectedWorkOrderTypeID = self.WorkOrderTypeHelper.SelectedItem() ? self.WorkOrderTypeHelper.SelectedItem().ID : null;
                    var selectedUserID = self.InitiatorID;
                    //
                    if (self.TipicalWorkOrders_paramWorkOrderTypeID == selectedWorkOrderTypeID && self.TipicalWorkOrders_paramUserID == selectedUserID)
                        return;
                    //
                    self.TipicalWorkOrdersVisible(false);
                    self.TipicalWorkOrders.removeAll();
                    //
                    if (selectedWorkOrderTypeID == null)
                        return;
                    //
                    self.TipicalWorkOrders_paramWorkOrderTypeID = selectedWorkOrderTypeID;
                    self.TipicalWorkOrders_paramUserID = selectedUserID;
                    //
                    if (self.TipicalWorkOrders_timeout != null)
                        clearTimeout(self.TipicalWorkOrders_timeout);
                    self.TipicalWorkOrders_timeout = setTimeout(function () {
                        self.ajaxControl_WorkOrderInfoList.Ajax(null,
                            {
                                url: 'sdApi/GetWorkOrderInfoList',
                                method: 'GET',
                                data: { workOrderTypeID: self.TipicalWorkOrders_paramWorkOrderTypeID, userID: self.TipicalWorkOrders_paramUserID == null ? '' : self.TipicalWorkOrders_paramUserID }
                            },
                            function (response) {
                                if (response) {
                                    self.TipicalWorkOrders.removeAll();
                                    //
                                    $.each(response, function (index, workOrderInfo) {
                                        var u = new createTipicalWorkOrder(workOrderInfo);
                                        self.TipicalWorkOrders().push(u);
                                    });
                                    self.TipicalWorkOrders.valueHasMutated();
                                    self.TipicalWorkOrdersVisible(self.TipicalWorkOrders().length > 0);
                                    self.InvalidateHelpPanel();
                                }
                            });
                    }, 1000);
                };
            }
            //
            //workOrderTemplates - help panel
            {
                self.ajaxControl_WorkOrderTemplateList = new ajaxLib.control();
                self.WorkOrderTemplateList = ko.observableArray([]);
                self.WorkOrderTemplateListVisible = ko.observable(false);
                self.WorkOrderTemplateListVisible.subscribe(function (newValue) {
                    self.InvalidateHelpPanel();
                });
                self.WorkOrderTemplateList_paramWorkOrderTypeID = null;
                self.WorkOrderTemplateList_timeout = null;
                var createWorkOrderTemplate = function (info) {
                    var thisObj = this;
                    //
                    thisObj.ID = info.ID;
                    thisObj.Name = info.Name;
                    thisObj.Description = info.Description;
                    thisObj.PriorityID = info.WorkOrderPriorityID;
                    thisObj.TypeID = info.WorkOrderTypeID;
                    thisObj.ExecutorID = info.ExecutorID;
                    thisObj.QueueID = info.QueueID;
                    thisObj.InitiatorID = info.InitiatorID;
                    thisObj.UserField1 = info.UserField1;
                    thisObj.UserField2 = info.UserField2;
                    thisObj.UserField3 = info.UserField3;
                    thisObj.UserField4 = info.UserField4;
                    thisObj.UserField5 = info.UserField5;
                    //
                    thisObj.UseClick = function () {
                        self.WorkOrderTemplateID = thisObj.ID;
                        //
                        self.Name(thisObj.Name);
                        //
                        var html = '<html><body><p style="white-space:pre-wrap">' + thisObj.Description.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</p></body></html>';
                        self.Description(html);
                        //
                        //set initiator
                        {
                            self.InitiatorLoaded(false);
                            self.InitiatorID = thisObj.InitiatorID;
                            self.InitializeInitiator();
                        }
                        //
                        //set queue
                        {
                            self.QueueLoaded(false);
                            self.QueueID = thisObj.QueueID;
                            self.InitializeQueue();
                        }
                        //
                        //set executor
                        {
                            //вычисление исполнителя с учотом графиков и занятости, а также режима привязки исполнителя у шаблона задания
                            self.ajaxControl_WorkOrderTemplateList.Ajax(null,
                                {
                                    url: 'sdApi/getWorkOrderTemplate',
                                    method: 'GET',
                                    data: { workOrderTemplateID: thisObj.ID }
                                },
                                function (response) {
                                    if (response) {
                                        self.ExecutorLoaded(false);
                                        self.ExecutorID = thisObj.ExecutorID;
                                        self.QueueID = thisObj.QueueID;
                                        self.InitializeExecutor();
                                    }
                                });
                        }
                        //
                        self.WorkOrderTypeHelper.SetSelectedItem(thisObj.TypeID);
                        //
                        //setPriority
                        {
                            if (self.priorityControl != null) {
                                var setPriority = function () {
                                    for (var i = 0; i < self.priorityControl.PriorityList().length; i++) {
                                        var p = self.priorityControl.PriorityList()[i];
                                        if (p.ID == thisObj.PriorityID) {
                                            self.priorityControl.SelectPriority(p);
                                            break;
                                        }
                                    }
                                };
                                //
                                if (self.priorityControl.IsLoaded() == true)
                                    setPriority();
                                else {
                                    var handler = null;
                                    handler = self.priorityControl.IsLoaded.subscribe(function (newValue) {
                                        if (newValue == true) {
                                            handler.dispose();
                                            setPriority();
                                        }
                                    });
                                }
                            }
                        }
                        //
                        //set parameters and fill userFields
                        {
                            self.OnParametersChanged();
                            if (self.parametersControl != null) {
                                var setUserField = function (number, value) {
                                    var identifier = 'object.UserField' + number.toString();
                                    //
                                    for (var i = 0; i < self.parametersControl.ParameterList().length; i++) {
                                        var p = self.parametersControl.ParameterList()[i];
                                        if (p.Identifier == identifier) {
                                            var jsonString = JSON.stringify([value]);
                                            if (p.IsLoadedAllEditors())
                                                p.InitializeEditors(jsonString);
                                            else {
                                                var handler = null;
                                                handler = p.IsLoadedAllEditors.subscribe(function (newValue) {
                                                    if (newValue == true) {
                                                        handler.dispose();
                                                        p.InitializeEditors(jsonString);
                                                    }
                                                });
                                            }
                                            break;
                                        }
                                    }
                                };
                                var setParameter = function (sourceParameterInfo) {
                                    for (var i = 0; i < self.parametersControl.ParameterList().length; i++) {
                                        var p = self.parametersControl.ParameterList()[i];
                                        if (p.Identifier == sourceParameterInfo.Identifier && p.Type == sourceParameterInfo.Type) {
                                            if (p.IsLoadedAllEditors())
                                                p.InitializeEditors(sourceParameterInfo.JSValueList);
                                            else {
                                                var handler = null;
                                                handler = p.IsLoadedAllEditors.subscribe(function (newValue) {
                                                    if (newValue == true) {
                                                        handler.dispose();
                                                        p.InitializeEditors(sourceParameterInfo.JSValueList);
                                                    }
                                                });
                                            }
                                            break;
                                        }
                                    }
                                };
                                var setParameterValues = function () {
                                    if (self.ObjectClassID == 701 && self.ObjectID) {//копируем значения параметров заявки в задание, созданное по шаблону
                                        var ajaxControl_WorkOrderTemplate_paramters = new ajaxLib.control();
                                        var param = {
                                            'objectClassID': self.ObjectClassID,
                                            'objectID': self.ObjectID
                                        };
                                        ajaxControl_WorkOrderTemplate_paramters.Ajax(null,
                                            {
                                                url: 'sdApi/getParameters?' + $.param(param),
                                                method: 'GET',
                                                dataType: "json"
                                            },
                                            function (response) {
                                                if (response)
                                                    $.each(response, function (index, parameterInfo) {
                                                        setParameter(parameterInfo);
                                                    });
                                            });
                                    }
                                    //
                                    setUserField(1, thisObj.UserField1);
                                    setUserField(2, thisObj.UserField2);
                                    setUserField(3, thisObj.UserField3);
                                    setUserField(4, thisObj.UserField4);
                                    setUserField(5, thisObj.UserField5);
                                };
                                //
                                if (self.parametersControl.IsLoaded() == true)
                                    setParameterValues();
                                else {
                                    var handler = null;
                                    handler = self.parametersControl.IsLoaded.subscribe(function (newValue) {
                                        if (newValue == true) {
                                            handler.dispose();
                                            setParameterValues();
                                        }
                                    });
                                }
                            }
                        }
                    };
                };
                self.LoadWorkOrderTemplateList = function () {
                    var selectedWorkOrderTypeID = self.WorkOrderTypeHelper.SelectedItem() ? self.WorkOrderTypeHelper.SelectedItem().ID : null;
                    //
                    if (self.WorkOrderTemplateList_paramWorkOrderTypeID == selectedWorkOrderTypeID)
                        return;
                    //
                    self.WorkOrderTemplateListVisible(false);
                    self.WorkOrderTemplateList.removeAll();
                    //
                    self.WorkOrderTemplateList_paramWorkOrderTypeID = selectedWorkOrderTypeID;
                    //
                    if (self.WorkOrderTemplateList_timeout != null)
                        clearTimeout(self.WorkOrderTemplateList_timeout);
                    self.WorkOrderTemplateList_timeout = setTimeout(function () {
                        self.ajaxControl_WorkOrderTemplateList.Ajax(null,
                            {
                                url: 'sdApi/getWorkOrderTemplateList',
                                method: 'GET',
                                data: { workOrderTypeID: self.WorkOrderTemplateList_paramWorkOrderTypeID }
                            },
                            function (response) {
                                if (response) {
                                    self.WorkOrderTemplateList.removeAll();
                                    //
                                    $.each(response, function (index, info) {
                                        var s = new createWorkOrderTemplate(info);
                                        self.WorkOrderTemplateList().push(s);
                                    });
                                    self.WorkOrderTemplateList.valueHasMutated();
                                    self.WorkOrderTemplateListVisible(self.WorkOrderTemplateList().length > 0);
                                    self.InvalidateHelpPanel();
                                }
                            });
                    }, 1000);
                };
                //
                self.AddAs = false;//задание создано по аналогии
                self.workOrderData = null;//задание, взятое за основу
                //
                self.Fill = function (woData) {
                    if (woData.Name())
                        self.Name(woData.Name());
                    if (woData.PriorityID())
                        self.PriorityID = woData.PriorityID();
                    if (woData.PriorityColor())
                        self.PriorityColor(woData.PriorityColor());
                    if (woData.PriorityName())
                        self.PriorityName(woData.PriorityName());
                    //
                    if (woData.TypeID()) {
                        self.WorkOrderTypeHelper.LoadList();
                        self.WorkOrderTypeHelper.SetSelectedItem(woData.TypeID());
                    }
                    //
                    if (woData.ExecutorID())
                        self.ExecutorID = woData.ExecutorID();
                    if (woData.InitiatorID())
                        self.InitiatorID = woData.InitiatorID();
                    if (woData.QueueID())
                        self.QueueID = woData.QueueID();
                    if (woData.QueueName())
                        self.QueueName = woData.QueueName();
                    //
                    if (woData.Description())
                        $.when(self.htmlDescriptionControlD).done(function () { self.Description(woData.Description()); });
                    //
                    if (woData.ID()) {
                        self.primaryObjectID = woData.ID();
                    }
                    //
                    self.WorkOrderData = woData;
                };
            }
        }
    }
    return module;
});
