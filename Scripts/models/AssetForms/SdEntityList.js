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
                var returnD = $.Deferred();
                if (!self.isLoaded()) {
                    $.when(self.imList.Load()).done(function () {
                        self.isLoaded(true);
                        returnD.resolve();
                    });
                }
                return returnD.promise();
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
            self.PushItemToStart = function (item) {//функция добавления элемента в начало списка
                $.when(self.imList.PushToStart(item)).done(function () {
                    self.isLoaded(true);
                });
            };
            //
            self.IsExpanded = ko.observable(true);
            self.ExpandCollapseClick = function () {
                self.IsExpanded(!self.IsExpanded());
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
                    retval = ko_object().CallCount();
                //
                if (retval <= 0)
                    return null;
                if (retval > 99)
                    return '99';
                else
                    return '' + retval;
            });
            self.ShowObjectForm = function (cRef) {//отображает форму элемента списка
                showSpinner();
                require(['sdForms'], function (module) {
                    var fh = new module.formHelper(true);
                    fh.ShowCall(cRef.ID, self.ReadOnly() == true ? fh.Mode.ReadOnly : fh.Mode.Default);
                });
            };
            //
            self.OperationIsGranted = function (grantedOperations, operation) {
                return true;
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
                return self.OperationIsGranted(grantedOperations, module.Operations.OPERATION_Problem_Update);
            };
            //
            var imListOptions = {};//параметры imList для списка 
            {
                imListOptions.aliasID = 'ID';
                //
                //
                imListOptions.ReloadByIDAction = function (cRef, id) {
                    var retD = $.Deferred();
                    //
                    if (!self.isLoaded()) {
                        retD.resolve(false);
                        return retD.promise();
                    }
                    //
                    if (!cRef) {
                        var elem = ko.utils.arrayFirst(self.imList.List(), function (el) {
                            return el[self.imList.aliasID] == id;
                        });
                        if (elem)
                            cRef = elem;
                    }
                    //
                    var data = {
                        //'EntityID': ko_object ? ko_object().ID() : null,
                        //'EntityClassId': objectClassID ? objectClassID : null,
                        'id': id,
                        //'ReferenceExists': cRef ? true : false
                    };
                    self.ajaxControl.Ajax($(ajaxSelector),
                        {
                            dataType: "json",
                            method: 'GET',
                            data: data,
                            url: 'sdApi/GetCall'
                        },
                        function (newVal) {
                            if (newVal && newVal.Result === 0) {
                                var newValue = newVal.Call;
                                //
                                if (cRef && newValue)
                                    cRef.Merge(newValue);
                                else if (cRef && !newValue)
                                    self.imList.TryRemoveByID(id);
                                else if (!cRef && newValue)
                                    self.imList.Push([newValue]);
                                retD.resolve(true);
                            }
                            else if (newVal && newVal.Result === 1)
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[SDForm.CallReferenceList.js, ReloadByIDAction]', 'error');
                                    retD.resolve(false);
                                });
                            else if (newVal && newVal.Result === 2)
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('BadParamsError') + '\n[SDForm.CallReferenceList.js, ReloadByIDAction]', 'error');
                                    retD.resolve(false);
                                });
                            else if (newVal && (newVal.Result == 3 || newVal.Result == 6)) {
                                if (cRef)
                                    self.imList.TryRemoveByID(id);
                            }
                            else
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[SDForm.CallReferenceList.js, ReloadByIDAction]', 'error');
                                    retD.resolve(false);
                                });
                        });
                    return retD.promise();
                };
                //
                imListOptions.PushAction = function (list) {
                    if (list) {
                        var retvalD = $.Deferred();
                        require(['models/SDForms/SDForm.CallReference'], function (cLib) {
                            var retval = [];
                            ko.utils.arrayForEach(list, function (item) {
                                retval.push(new cLib.CallReference(self.imList, item));
                            });
                            retvalD.resolve(retval);
                        });
                    }
                    return retvalD.promise();
                }
                //
                imListOptions.PushItemToStartAction = function (item) {
                    if (item) {
                        var retvalD = $.Deferred();
                        require(['models/SDForms/SDForm.CallReference'], function (cLib) {
                            var retval = new cLib.CallReference(self.imList, item);
                            retvalD.resolve(retval);
                        });
                    }
                    return retvalD.promise();
                }
                self.imList = new imLib.IMList(imListOptions);
                //
                self.ShowUserColumn = ko.computed(function () {
                    if (self.imList && self.imList.List() && self.imList.List().length > 0) {
                        var exists = ko.utils.arrayFirst(self.imList.List(), function (el) {
                            return el.ClientObj() != null;
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
                    operationsOptions.Text = 'addCallReference';
                    operationsOptions.Validator = function () { return false; };
                    operationsOptions.IsGranted = function (grantedOperations) { return self.ObjectUpdateIsGranted(grantedOperations); };
                    operationsOptions.Command = function () {
                        showSpinner();
                        require(['usualForms'], function (module) {
                            var fh = new module.formHelper(true);
                            fh.ShowSearcherLite([701, 119], objectClassID, ko_object, self.imList);
                        });
                    };
                }
                self.imList.AddOperation(operationsOptions);
                //
                /*operationsOptions = {};
                {
                    operationsOptions.Text = 'addNewCall';
                    operationsOptions.Validator = function () { return false; };
                    operationsOptions.IsGranted = function (grantedOperations) { return self.ObjectUpdateIsGranted(grantedOperations) && self.OperationIsGranted(grantedOperations, module.Operations.OPERATION_Call_Add); };
                    operationsOptions.Command = function () {
                        showSpinner();
                        require(['registrationForms'], function (module) {
                            var fh = new module.formHelper(true);
                            fh.ShowCallRegistrationEngineer(null, 702, ko_object().ID());
                        });
                    };
                }
                self.imList.AddOperation(operationsOptions);*/
                //
                self.parentList;//when use LinkList in searchFormLite.js
                //
                /*operationsOptions = {};
                {
                    operationsOptions.Text = getTextResource('ReferenceToProblem');
                    operationsOptions.Validator = function () { return self.parentList != null };
                    operationsOptions.Command = function () {
                        var ids = [];
                        ko.utils.arrayForEach(self.imList.SelectedItems(), function (item) {
                            ids.push(item.ID);
                        });
                        var data = {
                            'ObjectClassID': 702,
                            'ObjectID': ko_object().ID(),
                            'ReferenceClassID': 701,
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
                }
                self.imList.AddOperation(operationsOptions);*/
                //
                /*operationsOptions = {};
                {
                    operationsOptions.Text = getTextResource('RemoveCall');
                    operationsOptions.Validator = function () { return self.parentList == null };
                    operationsOptions.IsGranted = function (grantedOperations) { return self.ObjectUpdateIsGranted(grantedOperations) && self.OperationIsGranted(grantedOperations, module.Operations.OPERATION_Call_Delete); };
                    operationsOptions.Command = function () {
                        var selectedCalls = self.imList.SelectedItems();
                        if (selectedCalls.length == 0)
                            return;
                        //     
                        var ids = [];
                        var question = '';
                        selectedCalls.forEach(function (el) {
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
                                title: getTextResource('CallRemoving') + ': ' + question,
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
                                        'ObjectClassID': 702,
                                        'ObjectID': ko_object().ID(),
                                        'ReferenceClassID': 701,
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
                self.imList.AddOperation(operationsOptions);*/
                //
                operationsOptions = {};
                {
                    operationsOptions.Text = getTextResource('RemoveReference');
                    operationsOptions.Validator = function () { return self.parentList == null };
                    operationsOptions.IsGranted = function (grantedOperations) { return self.ObjectUpdateIsGranted(grantedOperations); };
                    operationsOptions.Command = function () {
                        var selectedCalls = self.imList.SelectedItems();
                        if (selectedCalls.length == 0)
                            return;
                        //           
                        var ids = [];
                        var question = '';
                        selectedCalls.forEach(function (el) {
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
                                        'ObjectClassID': 702,
                                        'ObjectID': ko_object().ID(),
                                        'ReferenceClassID': 701,
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
            }
        },
        Operations: {
            OPERATION_Call_Add: 309,
            OPERATION_Call_Delete: 310,
            OPERATION_Problem_Update: 323,
        }
    };
    return module;
});