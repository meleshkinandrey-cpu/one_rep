define(['knockout', 'jquery', 'ajax', 'imList'], function (ko, $, ajaxLib, imLib) {
    var module = {
        //сущность knockout, идентификатор класса сущности, селектор ajax-крутилки
        LinkList: function (ko_object, objectClassID, ajaxSelector, readOnly_object, canEdit_object) {
            var self = this;
            //
            self.isLoaded = ko.observable(false);//факт загруженности данных для объекта ko_object()
            self.imList = null;//declared below
            self.ajaxControl = new ajaxLib.control();//единственный ajax для этого списка
            //
            self.CheckData = function () {//функция загрузки списка (грузится только раз)
                if (!self.isLoaded()) {
                    $.when(self.imList.Load()).done(function () {
                        self.isLoaded(true);
                    });
                }
            };
            //
            self.PushData = function (list) {//функция загрузки списка 
                var returnD = $.Deferred();
                $.when(self.imList.Push(list)).done(function () {
                    returnD.resolve();
                });
                return returnD.promise();
            };
            //
            self.ClearData = function () {//функция сброса данных
                self.imList.List([]);
                //
                self.isLoaded(false);
            };
            self.ReadOnly = readOnly_object;//флаг только чтение
            self.CanEdit = canEdit_object;//флаг для редактирования/создания
            //
            self.ItemsCount = ko.computed(function () {//вариант расчета количества элементов (по данным объекта / по реальному количеству из БД)
                var retval = 0;
                if (self.isLoaded())
                    retval = self.imList.List().length;
                else if (ko_object != null && ko_object() != null)
                    retval = ko_object().WorkOrderCount();
                //
                if (retval <= 0)
                    return null;
                if (retval > 99)
                    return '99';
                else
                    return '' + retval;
            });
            self.ShowObjectForm = function (woRef) {//отображает форму элемента списка
                showSpinner();
                require(['sdForms'], function (module) {
                    var fh = new module.formHelper(true);
                    fh.ShowWorkOrder(woRef.ID, self.ReadOnly() == true ? fh.Mode.ReadOnly : fh.Mode.Default);
                });
            };
            //
            self.OperationIsGranted = function (grantedOperations, operation) {
                if (grantedOperations)
                    for (var i = 0; i < grantedOperations.length; i++)
                        if (grantedOperations[i] === operation)
                            return true;
                return false;
            };
            self.LoadGrantedOperations = function () {
                var retvalD = $.Deferred();
                //
                if (self.imList.GrantedOperations()) {
                    retvalD.resolve();
                    return retvalD.promise();
                }
                //
                self.ajaxControl.Ajax(null,
                {
                    dataType: "json",
                    method: 'GET',
                    url: 'sdApi/GetGrantedOperations'
                },
                function (newVal) {
                    if (newVal) {
                        var opList = newVal.OperationList;
                        self.imList.GrantedOperations([]);
                        for (var i = 0; i < opList.length; i++) {
                            self.imList.GrantedOperations().push(opList[i]);
                        }
                        self.imList.GrantedOperations.valueHasMutated();
                        retvalD.resolve();
                    }
                });
                return retvalD.promise();
            };
            self.ObjectUpdateIsGranted = function (grantedOperations) {
                if (!self.CanEdit())
                    return false;
                if ((objectClassID === 701 && self.OperationIsGranted(grantedOperations, module.Operations.OPERATION_Call_Update)) ||
                    (objectClassID === 702 && self.OperationIsGranted(grantedOperations, module.Operations.OPERATION_Problem_Update)) ||
                    (objectClassID === 703 && self.OperationIsGranted(grantedOperations, module.Operations.OPERATION_RFC_Update)))
                    return true;
                return false;
            };
            //
            var imListOptions = {};//параметры imList для списка 
            {
                imListOptions.aliasID = 'ID';
                //
                imListOptions.LoadAction = function () {
                    var data = {
                        'ID': ko_object().ID(),
                        'EntityClassId': objectClassID
                    };
                    var retvalD = $.Deferred();
                    self.ajaxControl.Ajax($(ajaxSelector),
                        {
                            dataType: "json",
                            method: 'GET',
                            data: data,
                            url: 'sdApi/GetWOReferenceList'
                        },
                        function (newVal) {
                            if (newVal && newVal.Result === 0) {
                                var woList = newVal.List;
                                if (woList) {
                                    require(['models/SDForms/SDForm.WOReference'], function (woLib) {
                                        var retval = [];
                                        ko.utils.arrayForEach(woList, function (item) {
                                            retval.push(new woLib.WorkOrderReference(self.imList, item));
                                        });
                                        $.when(self.LoadGrantedOperations()).done(function () { retvalD.resolve(retval); });
                                    });
                                }
                                else {
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('AjaxError') + '\n[SDForm.WOReferenceList.js, LoadAction]', 'error');
                                    });
                                    retvalD.resolve([]);
                                }
                            }
                            else if (newVal && newVal.Result === 1)
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[SDForm.WOReferenceList.js, LoadAction]', 'error');
                                    retvalD.resolve([]);
                                });
                            else if (newVal && newVal.Result === 2)
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('BadParamsError') + '\n[SDForm.WOReferenceList.js, LoadAction]', 'error');
                                    retvalD.resolve([]);
                                });
                            else if (newVal && newVal.Result === 3)
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('AccessError'), 'error');
                                    retvalD.resolve([]);
                                });
                            else
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[SDForm.WOReferenceList.js, LoadAction]', 'error');
                                    retvalD.resolve([]);
                                });
                        });
                    return retvalD.promise();
                };
                //
                imListOptions.ReloadByIDAction = function (woRef, id) {
                    var retD = $.Deferred();
                    //
                    if (!self.isLoaded()) {
                        retD.resolve(false);
                        return retD.promise();
                    }
                    //
                    if (!woRef) {
                        var elem = ko.utils.arrayFirst(self.imList.List(), function (el) {
                            return el[self.imList.aliasID] == id;
                        });
                        if (elem)
                            woRef = elem;
                    }
                    //
                    var data = {
                        'EntityID': ko_object().ID(),
                        'EntityClassId': objectClassID,
                        'WorkOrderID': id,
                        'ReferenceExists': woRef ? true : false
                    };
                    self.ajaxControl.Ajax($(ajaxSelector),
                        {
                            dataType: "json",
                            method: 'GET',
                            data: data,
                            url: 'sdApi/GetWOReference'
                        },
                        function (newVal) {
                            if (newVal && newVal.Result === 0) {
                                var newValue = newVal.Elem;
                                //
                                if (newValue && woRef)
                                    woRef.Merge(newValue);
                                else if (woRef && !newValue)
                                    self.imList.TryRemoveByID(id);
                                else if (!woRef && newValue)
                                    self.imList.Push([newValue]);
                                //
                                retD.resolve(true);
                            }
                            else if (newVal && newVal.Result === 1)
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[SDForm.WOReferenceList.js, ReloadByIDAction]', 'error');
                                    retD.resolve(false);
                                });
                            else if (newVal && newVal.Result === 2)
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('BadParamsError') + '\n[SDForm.WOReferenceList.js, ReloadByIDAction]', 'error');
                                    retD.resolve(false);
                                });
                            else if (newVal && (newVal.Result == 3 || newVal.Result == 6)) {
                                if (woRef)
                                    self.imList.TryRemoveByID(id);
                                retD.resolve(false);
                            }
                            else
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[SDForm.WOReferenceList.js, ReloadByIDAction]', 'error');
                                    retD.resolve(false);
                                });
                        });
                    return retD.promise();
                };
                //
                imListOptions.PushAction = function (list) {
                    if (list) {
                        var retvalD = $.Deferred();
                        require(['models/SDForms/SDForm.WOReference'], function (wLib) {
                            var retval = [];
                            ko.utils.arrayForEach(list, function (item) {
                                retval.push(new wLib.WorkOrderReference(self.imList, item));
                            });
                            retvalD.resolve(retval);
                        });
                    }
                    return retvalD.promise();
                }
            }
            self.imList = new imLib.IMList(imListOptions);
            //
            operationsOptions = {};
            {
                operationsOptions.Text = 'addWorkOrderReference';
                operationsOptions.Validator = function () { return false; };
                operationsOptions.IsGranted = function (grantedOperations) { return self.ObjectUpdateIsGranted(grantedOperations) && objectClassID != 371; };
                operationsOptions.Command = function () {
                    showSpinner();
                    require(['usualForms'], function (module) {
                        var fh = new module.formHelper(true);
                        fh.ShowSearcherLite([119], objectClassID, ko_object, self.imList);
                    });
                };
            }
            self.imList.AddOperation(operationsOptions);
            //
            operationsOptions = {};
            {
                operationsOptions.Text = 'addNewWorkOrder';
                operationsOptions.Validator = function () { return false; };
                operationsOptions.IsGranted = function (grantedOperations) { return self.ObjectUpdateIsGranted(grantedOperations) && self.OperationIsGranted(grantedOperations, module.Operations.OPERATION_WorkOrder_Add) && objectClassID != 371; };
                operationsOptions.Command = function () {
                    showSpinner();
                    require(['registrationForms'], function (module) {
                        var fh = new module.formHelper(true);
                        fh.ShowWorkOrderRegistration(objectClassID, ko_object().ID());
                    });
                };
            }
            self.imList.AddOperation(operationsOptions);
            //
            operationsOptions = {};
            {
                operationsOptions.Text = getTextResource('RemoveWorkOrder');
                operationsOptions.Validator = function () { return self.parentList == null };
                operationsOptions.IsGranted = function (grantedOperations) { return self.ObjectUpdateIsGranted(grantedOperations) && self.OperationIsGranted(grantedOperations, module.Operations.OPERATION_WorkOrder_Delete); };
                operationsOptions.Command = function () {
                    var selectedWorkOrders = self.imList.SelectedItems();
                    if (selectedWorkOrders.length == 0)
                        return;
                    //     
                    var ids = [];
                    var question = '';
                    selectedWorkOrders.forEach(function (el) {
                        ids.push(el.ID);
                        //
                        if (question.length < 200) {
                            question += (question.length > 0 ? ', ' : '') + el.Name();
                            if (question.length >= 200)
                                question += '...';
                        }
                    });
                    //
                    require(['sweetAlert'], function (swal) {
                        swal({
                            title: getTextResource('WorkOrderRemoving') + ': ' + question,
                            text: getTextResource('ConfirmRemoveQuestion'),
                            showCancelButton: true,
                            closeOnConfirm: false,
                            closeOnCancel: true,
                            confirmButtonText: getTextResource('ButtonOK'),
                            cancelButtonText: getTextResource('ButtonCancel')
                        },
                        function (value) {
                            swal.close();
                            //
                            if (value == true) {
                                //
                                var data = {
                                    'ObjectClassID': objectClassID,
                                    'ObjectID': ko_object().ID(),
                                    'ReferenceClassID': 119,
                                    'ReferenceIDList': ids
                                };
                                self.ajaxControl.Ajax($(ajaxSelector),
                                    {
                                        dataType: "json",
                                        method: 'POST',
                                        data: data,
                                        url: 'sdApi/RemoveReferenceObject'
                                    },
                                    function (newVal) {
                                        ko.utils.arrayForEach(ids, function (id) {
                                            self.imList.TryRemoveByID(id, true);
                                        });
                                    });
                            }
                        });
                    })
                };
            }
            self.imList.AddOperation(operationsOptions);
            //
            operationsOptions = {};
            {
                operationsOptions.Text = getTextResource('RemoveReference');
                operationsOptions.Validator = function () { return self.parentList == null };
                operationsOptions.IsGranted = function (grantedOperations) { return self.ObjectUpdateIsGranted(grantedOperations); };
                operationsOptions.Command = function () {
                    var selectedWorkOrders = self.imList.SelectedItems();
                    if (selectedWorkOrders.length == 0)
                        return;
                    //           
                    var ids = [];
                    var question = '';
                    selectedWorkOrders.forEach(function (el) {
                        ids.push(el.ID);
                        //
                        if (question.length < 200) {
                            question += (question.length > 0 ? ', ' : '') + el.Name();
                            if (question.length >= 200)
                                question += '...';
                        }
                    });
                    //
                    require(['sweetAlert'], function (swal) {
                        swal({
                            title: 'Удаление связи' + ': ' + question,
                            text: 'Вы действительно хотите удалить?',
                            showCancelButton: true,
                            closeOnConfirm: false,
                            closeOnCancel: true,
                            confirmButtonText: getTextResource('ButtonOK'),
                            cancelButtonText: getTextResource('ButtonCancel')
                        },
                        function (value) {
                            swal.close();
                            //
                            if (value == true) {
                                //
                                var data = {
                                    'ObjectClassID': objectClassID,
                                    'ObjectID': ko_object().ID(),
                                    'ReferenceClassID': 119,
                                    'ReferenceIDList': ids
                                };
                                self.ajaxControl.Ajax($(ajaxSelector),
                                    {
                                        dataType: "json",
                                        method: 'POST',
                                        data: data,
                                        url: 'sdApi/RemoveReference'
                                    },
                                    function (newVal) {
                                        ko.utils.arrayForEach(ids, function (id) {
                                            self.imList.TryRemoveByID(id, true);
                                        });
                                    });
                            }
                        });
                    });
                };
            }
            self.imList.AddOperation(operationsOptions);
            //
            self.ShowUserColumn = ko.computed(function () {
                if (self.imList && self.imList.List() && self.imList.List().length > 0) {
                    var exists = ko.utils.arrayFirst(self.imList.List(), function (el) {
                        return el.ExecutorObj() != null;
                    });
                    //
                    if (exists == null)
                        return false;
                    else return true;
                }
                else return false;
            });
            //
            self.SetClearButtonsList = null;
            self.SetFilledButtonsList = null;
            //
            //selected items changed event
            {
                self.subscriptionList = [];
                //
                var subscription = self.imList.SelectedItems.subscribe(function (newVal) {
                    if (newVal.length == 1 && (self.SelectedItemNumber || self.callback)) {
                        self.SetFilledButtonsList();
                    }
                    else if (newVal.length != 0 && self.parentList != null) {
                        self.SetFilledButtonsList();
                    }
                    else if (self.SetClearButtonsList) {
                        self.SetClearButtonsList();
                    }
                });
                self.subscriptionList.push(subscription);
                //
                self.disposeSubscriptions = function () {
                    for (var i in self.subscriptionList) {
                        self.subscriptionList[i].dispose();
                    }
                };
            }
            //
            self.SelectedItemNumber = null;
            self.closeFunk = null;
            //
            self.OnSelectBtnClick = function () {
                self.disposeSubscriptions();
                //
                if (self.parentList != null) {
                    self.ReferenceToProblem();
                }
                else {
                    var numberString = 'IM-TS-' + self.imList.SelectedItems()[0].Number();
                    if (self.SelectedItemNumber)
                        self.SelectedItemNumber(numberString);
                    if (self.callback) {
                        var selectedItem = self.imList.SelectedItems()[0];
                        self.callback(selectedItem,119);
                    }
                    if (self.closeFunk)
                        self.closeFunk();
                }
            };

            self.parentList;//when use LinkList in searchFormLite.js
            //
            self.ReferenceToProblem = function () {
                var ids = [];
                ko.utils.arrayForEach(self.imList.SelectedItems(), function (item) {
                    ids.push(item.ID);
                });
                var data = {
                    'ObjectClassID': objectClassID,
                    'ObjectID': ko_object().ID(),
                    'ReferenceClassID': 119,
                    'ReferenceIDList': ids
                };
                var retvalD = $.Deferred();
                self.ajaxControl.Ajax($(ajaxSelector),
                    {
                        dataType: "json",
                        method: 'POST',
                        data: data,
                        url: 'sdApi/AddReference'
                    },
                    function (newVal) {
                        ko.utils.arrayForEach(ids, function (item) {
                            self.parentList.TryReloadByID(item, true);
                            self.imList.TryRemoveByID(item, true);
                        });
                    });
            };

            
            {//OnWorkOrderExecutorControl
                self.OnWorkOrderExecutorControl = ko.observable(false);
                self.VisibleOnWorkOrderExecutorControl = ko.observable(true);
                //
                if (ko_object) {
                    ko_object.subscribe(function (newVal) {
                        if (newVal.OnWorkOrderExecutorControl)
                        self.OnWorkOrderExecutorControl(newVal.OnWorkOrderExecutorControl());
                    });
                }
                //
                if (objectClassID == 371)
                    self.VisibleOnWorkOrderExecutorControl(false);
                //
                self.ajax_EditOnWorkOrderExecutorControl = new ajaxLib.control();//единственный ajax для этого списка
                self.EditOnWorkOrderExecutorControl = function () {
                    if (!self.CanEdit())
                        return;
                    //
                    var oldValue = !self.OnWorkOrderExecutorControl();
                    //
                    showSpinner();
                    //
                    var data = {
                        ID: ko_object().ID(),
                        ObjClassID: objectClassID,
                        Field: 'OnWorkOrderExecutorControl',
                        OldValue: JSON.stringify({ 'val': oldValue }),
                        NewValue: JSON.stringify({ 'val': self.OnWorkOrderExecutorControl() }),
                        ReplaceAnyway: false
                    };

                    self.ajax_EditOnWorkOrderExecutorControl.Ajax(
                        null,//self.$region, two spinner problem
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
                                hideSpinner();
                                if (result === 0) {
                                    var checkbox = $(ajaxSelector).prevObject.find('.onWorkOrderExecutorControlInput');
                                    checkbox[0].checked = self.OnWorkOrderExecutorControl()
                                }
                                else {
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('SaveError'), getTextResource('GlobalError'), 'error');
                                    });
                                }
                            }
                        });
                };
            }
        },
        Operations: {
            OPERATION_WorkOrder_Add: 301,
            OPERATION_WorkOrder_Delete: 330,
            OPERATION_Call_Update: 313,
            OPERATION_Problem_Update: 323,
            OPERATION_RFC_Update: 386,
        }
    };
    return module;
});