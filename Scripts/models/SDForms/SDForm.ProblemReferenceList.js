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
                    retval = ko_object().ProblemsCount();
                //
                if (retval <= 0)
                    return null;
                if (retval > 99)
                    return '99';
                else
                    return '' + retval;
            });
            self.ShowObjectForm = function (pRef) {//отображает форму элемента списка
                showSpinner();
                require(['sdForms'], function (module) {
                    var fh = new module.formHelper(true);
                    fh.ShowProblem(pRef.ID, self.ReadOnly() == true ? fh.Mode.ReadOnly : fh.Mode.Default);
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
                return self.OperationIsGranted(grantedOperations, module.Operations.OPERATION_Call_Update);
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
                            url: 'sdApi/GetPBReferenceList'
                        },
                        function (newVal) {
                            if (newVal && newVal.Result === 0) {
                                var pList = newVal.List;
                                if (pList) {
                                    require(['models/SDForms/SDForm.ProblemReference'], function (prLib) {
                                        var retval = [];
                                        ko.utils.arrayForEach(pList, function (item) {
                                            retval.push(new prLib.ProblemReference(self.imList, item));
                                        });
                                        $.when(self.LoadGrantedOperations()).done(function () { retvalD.resolve(retval); });
                                    });
                                }
                                else {
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('AjaxError') + '\n[SDForm.ProblemReferenceList.js, LoadAction]', 'error');
                                    });
                                    retvalD.resolve([]);
                                }
                            }
                            else if (newVal && newVal.Result === 1)
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[SDForm.ProblemReferenceList.js, LoadAction]', 'error');
                                    retvalD.resolve([]);
                                });
                            else if (newVal && newVal.Result === 2)
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('BadParamsError') + '\n[SDForm.ProblemReferenceList.js, LoadAction]', 'error');
                                    retvalD.resolve([]);
                                });
                            else if (newVal && newVal.Result === 3)
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('AccessError'), 'error');
                                    retvalD.resolve([]);
                                });
                            else
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[SDForm.ProblemReferenceList.js, LoadAction]', 'error');
                                    retvalD.resolve([]);
                                });
                        });
                    return retvalD.promise();
                };
                //
                imListOptions.ReloadByIDAction = function (pbRef, id) {
                    var retD = $.Deferred();
                    //
                    if (!self.isLoaded()) {
                        retD.resolve(false);
                        return retD.promise();
                    }
                    //
                    if (!pbRef) {
                        var elem = ko.utils.arrayFirst(self.imList.List(), function (el) {
                            return el[self.imList.aliasID] == id;
                        });
                        if (elem)
                            pbRef = elem;
                    }
                    //
                    var data = {
                        'EntityID': ko_object().ID(),
                        'EntityClassId': objectClassID,
                        'ProblemID': id,
                        'ReferenceExists': pbRef ? true : false
                    };
                    self.ajaxControl.Ajax($(ajaxSelector),
                        {
                            dataType: "json",
                            method: 'GET',
                            data: data,
                            url: 'sdApi/GetPBReference'
                        },
                        function (newVal) {
                            if (newVal && newVal.Result === 0) {
                                var newValue = newVal.Elem;
                                //
                                if (newValue && pbRef)
                                    pbRef.Merge(newValue);
                                else if (pbRef && !newValue)
                                    self.imList.TryRemoveByID(id);
                                else if (!pbRef && newValue)
                                    self.imList.Push([newValue]);
                                retD.resolve(true);
                            }
                            else if (newVal && newVal.Result === 1)
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[SDForm.ProblemReferenceList.js, ReloadByIDAction]', 'error');
                                    retD.resolve(false);
                                });
                            else if (newVal && newVal.Result === 2)
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('BadParamsError') + '\n[SDForm.ProblemReferenceList.js, ReloadByIDAction]', 'error');
                                    retD.resolve(false);
                                });
                            else if (newVal && (newVal.Result == 3 || newVal.Result == 6)) {
                                if (pbRef)
                                    self.imList.TryRemoveByID(id);
                                retD.resolve(false);
                            }
                            else
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[SDForm.ProblemReferenceList.js, ReloadByIDAction]', 'error');
                                    retD.resolve(false);
                                });
                        });
                    return retD.promise();
                };
                //
                imListOptions.PushAction = function (list) {
                    if (list) {
                        var retvalD = $.Deferred();
                        require(['models/SDForms/SDForm.ProblemReference'], function (pLib) {
                            var retval = [];
                            ko.utils.arrayForEach(list, function (item) {
                                retval.push(new pLib.ProblemReference(self.imList, item));
                            });
                            retvalD.resolve(retval);
                        });
                    }
                    return retvalD.promise();
                }
            }
            self.imList = new imLib.IMList(imListOptions);
            //
            self.ShowUserColumn = ko.computed(function () {
                if (self.imList && self.imList.List() && self.imList.List().length > 0) {
                    var exists = ko.utils.arrayFirst(self.imList.List(), function (el) {
                        return el.OwnerObj() != null;
                    });
                    //
                    if (exists == null)
                        return false;
                    else return true;
                }
                else return false;
            });
            //
            operationsOptions = {};
            {
                operationsOptions.Text = 'addProblemReference';
                operationsOptions.Validator = function () { return false; };
                operationsOptions.IsGranted = function (grantedOperations) { return self.ObjectUpdateIsGranted(grantedOperations); };
                operationsOptions.Command = function () {
                    showSpinner();
                    require(['usualForms'], function (module) {
                        var fh = new module.formHelper(true);
                        fh.ShowSearcherLite([702], objectClassID, ko_object, self.imList);
                    });
                };
            }
            self.imList.AddOperation(operationsOptions);
            //
            operationsOptions = {};
            {
                operationsOptions.Text = 'addNewProblem';
                operationsOptions.Validator = function () { return false; };
                operationsOptions.IsGranted = function (grantedOperations) { return self.ObjectUpdateIsGranted(grantedOperations) && self.OperationIsGranted(grantedOperations, module.Operations.OPERATION_Problem_Add); };
                operationsOptions.Command = function () {
                    showSpinner();
                    //require(['registrationForms'], function (module) {
                    //    var fh = new module.formHelper(true);
                    //    fh.ShowProblemRegistration(null, objectClassID, ko_object().ID());
                    //});
                    var getItemInfos = function () {
                        var retval = [];
                            retval.push({
                                ClassID: objectClassID,
                                ID: ko_object().ID()
                            });
                        return retval;
                    };
                    
                    var data = {
                        'ObjectList': getItemInfos()
                    };
                    self.ajaxControl.Ajax(null,
                        {
                            dataType: "json",
                            method: 'POST',
                            data: data,
                            url: 'sdApi/CreateProblemByCall'
                        },
                        function (newVal) {
                            if (newVal) {
                                if (newVal.Result == 0) {//success
                                    var problemInfo = newVal.Problem;
                                    if (problemInfo && problemInfo.ID) {
                                        var fakeWrapper = {
                                            CanEdit: ko.observable(true),
                                            CanShow: ko.observable(true),
                                            IsClientMode: ko.observable(false),
                                            IsReadOnly: ko.observable(false)
                                        };
                                        require(['registrationForms', 'models/SDForms/ProblemForm.Problem'], function (lib, problemLib) {
                                            var fh = new lib.formHelper(true);
                                            fh.ShowProblemRegistration(null, null, null, new problemLib.Problem(fakeWrapper, problemInfo));
                                        });
                                    }
                                }
                            }
                        });
                };
            }
            self.imList.AddOperation(operationsOptions);
            //

            //
            operationsOptions = {};
            {
                operationsOptions.Text = getTextResource('RemoveProblem');
                operationsOptions.Validator = function () { return self.parentList == null };
                operationsOptions.IsGranted = function (grantedOperations) { return self.ObjectUpdateIsGranted(grantedOperations) && self.OperationIsGranted(grantedOperations, module.Operations.OPERATION_Problem_Delete); };
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
                            question += (question.length > 0 ? ', ' : '') + '№ ' + el.Number();
                            if (question.length >= 200)
                                question += '...';
                        }
                    });
                    //
                    require(['sweetAlert'], function (swal) {
                        swal({
                            title: getTextResource('ProblemRemoving') + ': ' + question,
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
                                    'ObjectClassID': 701,
                                    'ObjectID': ko_object().ID(),
                                    'ReferenceClassID': 702,
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
                            question += (question.length > 0 ? ', ' : '') + '№ ' + el.Number();
                            if (question.length >= 200)
                                question += '...';
                        }
                    });
                    //
                    require(['sweetAlert'], function (swal) {
                        swal({
                            title: getTextResource('ReferenceRemoving') + ': ' + question,
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
                                    'ObjectClassID': 701,
                                    'ObjectID': ko_object().ID(),
                                    'ReferenceClassID': 702,
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
            self.parentList;//when use LinkList in searchFormLite.js
            //
            self.OnSelectBtnClick = function () {
                self.disposeSubscriptions();
                //
                if (self.parentList != null) {
                    self.ReferenceToCall();
                }
                else {
                    var numberString = 'IM-PL-' + self.imList.SelectedItems()[0].Number();
                    if (self.SelectedItemNumber)
                    self.SelectedItemNumber(numberString);
                    if (self.callback) {
                        var selectedItem = self.imList.SelectedItems()[0];
                        self.callback(selectedItem,702);
                    }
                    if (self.closeFunk)
                        self.closeFunk();
                }
            };
            //
            self.ReferenceToCall = function () {
                var ids = [];
                ko.utils.arrayForEach(self.imList.SelectedItems(), function (item) {
                    ids.push(item.ID);
                });
                var data = {
                    'ObjectClassID': 701,
                    'ObjectID': ko_object().ID(),
                    'ReferenceClassID': 702,
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
        },
        Operations: {
            OPERATION_Problem_Add: 319,
            OPERATION_Problem_Delete: 320,
            OPERATION_Call_Update: 313,
        }
    };
    return module;
});