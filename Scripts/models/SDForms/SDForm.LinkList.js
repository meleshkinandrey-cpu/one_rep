define(['knockout', 'jquery', 'ajax', 'imList', 'assetForms'], function (ko, $, ajaxLib, imLib, fhModule) {
    var module = {
        //сущность knockout, идентификатор класса сущности, селектор ajax-крутилки
        LinkList: function (ko_object, objectClassID, ajaxSelector, readOnly_object, canEdit_object, IDList, KEList) {
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
            self.CheckListData = function () {//функция загрузки списка (грузится только раз)
                if (!self.isLoaded()) {
                    $.when(self.imList.LoadList()).done(function () {
                        self.isLoaded(true);
                    });
                }
            };
            self.ClearData = function () {//функция сброса данных
                self.imList.List([]);
                //
                self.isLoaded(false);
            };
            self.ReadOnly = readOnly_object;//флаг только чтение
            self.CanEdit = canEdit_object;//флаг для редактирования/создания
            //
            self.ShowObjectForm = function (obj) {//отображает форму элемента списка
                showSpinner();
                require(['assetForms'], function (module) {
                    var fh = new module.formHelper(true);
                    if (obj.ClassID() == 5 || obj.ClassID() == 6 || obj.ClassID() == 33 || obj.ClassID() == 34)
                        fh.ShowAssetForm(obj.ID, obj.ClassID());
                    else if (obj.ClassID() == 115)
                        fh.ShowServiceContract(obj.ID);
                    else if (obj.ClassID() == 386)
                        fh.ShowServiceContractAgreement(obj.ID);
                    else if (obj.ClassID() == 223)
                        fh.ShowSoftwareLicenceForm(obj.ID);
                    else if (obj.ClassID() == 165)
                        fh.ShowDataEntityObjectForm(obj.ID);
                    else if (obj.ClassID() == 409 || obj.ClassID() == 410 || obj.ClassID() == 411 || obj.ClassID() == 412 ||
                        obj.ClassID() == 413 || obj.ClassID() == 414 || obj.ClassID() == 415 || obj.ClassID() == 419)
                        fh.ShowConfigurationUnitForm(obj.ID);                       
                });
            };
            //
            self.ItemsCount = ko.computed(function () {//вариант расчета количества элементов (по данным объекта / по реальному количеству из БД)
                var retval = 0;
                if (self.isLoaded())
                    retval = self.imList.List().length;
                else if (ko_object != null && ko_object() != null)
                    retval = ko_object().DependencyObjectCount();
                //
                if (retval <= 0)
                    return null;
                if (retval > 99)
                    return '99';
                else return '' + retval;
            });
            //
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
            //
            self.OperationIsGranted = function (grantedOperations, operation) {
                if (grantedOperations)
                    for (var i = 0; i < grantedOperations.length; i++)
                        if (grantedOperations[i] === operation)
                            return true;
                return false;
            };
            //
            self.ObjectUpdateIsGranted = function (grantedOperations) {
                if (!self.CanEdit())
                    return false;
                //
                var operationID;
                if (objectClassID == 701)//OBJ_CALL
                    operationID = module.Operations.OPERATION_Call_Update;
                else if (objectClassID == 702)//OBJ_PROBLEM
                    operationID = module.Operations.OPERATION_Problem_Update;
                else if (objectClassID == 119)//OBJ_WORKORDER
                    operationID = module.Operations.OPERATION_WorkOrder_Update;
                else if (objectClassID == 703)//OBJ_RFC
                    operationID = module.Operations.OPERATION_RFC_Update;
                else
                    console.log(objectClassID);
                //
                return self.OperationIsGranted(grantedOperations, operationID);
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
                            url: 'sdApi/GetLinksList'
                        },
                        function (newVal) {
                            if (newVal && newVal.Result === 0) {
                                var linkList = newVal.List;
                                if (linkList) {
                                    require(['models/SDForms/SDForm.Link'], function (linkLib) {
                                        var retval = [];
                                        ko.utils.arrayForEach(linkList, function (item) {
                                            retval.push(new linkLib.Link(self.imList, item));
                                        });
                                        $.when(self.LoadGrantedOperations()).done(function () { retvalD.resolve(retval); });
                                    });
                                }
                                else {
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('AjaxError') + '\n[SDForm.LinkList.js, LoadAction]', 'error');
                                    });
                                    retvalD.resolve([]);
                                }
                            }
                            else if (newVal && newVal.Result === 1)
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[SDForm.LinkList.js, LoadAction]', 'error');
                                    retvalD.resolve([]);
                                });
                            else if (newVal && newVal.Result === 2)
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('BadParamsError') + '\n[SDForm.LinkList.js, LoadAction]', 'error');
                                    retvalD.resolve([]);
                                });
                            else if (newVal && newVal.Result === 3)
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('AccessError'), 'error');
                                    retvalD.resolve([]);
                                });
                            else
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[SDForm.LinkList.js, LoadAction]', 'error');
                                    retvalD.resolve([]);
                                });
                        });
                    return retvalD.promise();
                };
                //
                imListOptions.LoadIDListAction = function () {
                    var data = {
                        'ListID': IDList
                    };
                    var retvalD = $.Deferred();
                    self.ajaxControl.Ajax($(ajaxSelector),
                        {
                            dataType: "json",
                            method: 'GET',
                            data: data,
                            url: 'sdApi/GetAssetLinkList'
                        },
                        function (newVal) {
                            if (newVal && newVal.Result === 0) {
                                var linkList = newVal.List;
                                if (linkList) {
                                    require(['models/SDForms/SDForm.Link'], function (linkLib) {
                                        var retval = [];
                                        ko.utils.arrayForEach(linkList, function (item) {
                                            retval.push(new linkLib.Link(self.imList, item));
                                        });
                                        retvalD.resolve(retval);
                                    });
                                }
                                else {
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('AjaxError') + '\n[SDForm.LinkList.js, LoadAction]', 'error');
                                    });
                                    retvalD.resolve([]);
                                }
                            }
                            else if (newVal && newVal.Result === 1)
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[SDForm.LinkList.js, LoadAction]', 'error');
                                    retvalD.resolve([]);
                                });
                            else if (newVal && newVal.Result === 2)
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('BadParamsError') + '\n[SDForm.LinkList.js, LoadAction]', 'error');
                                    retvalD.resolve([]);
                                });
                            else if (newVal && newVal.Result === 3)
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('AccessError'), 'error');
                                    retvalD.resolve([]);
                                });
                            else
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[SDForm.LinkList.js, LoadAction]', 'error');
                                    retvalD.resolve([]);
                                });
                        });
                    return retvalD.promise();
                };
                //
                imListOptions.PushAction = function (newValues) {
                    var retD = $.Deferred();
                    //
                    var retval = [];
                    //
                    require(['models/SDForms/SDForm.Link'], function (linkLib) {
                        ko.utils.arrayForEach(newValues, function (item) {
                            retval.push(new linkLib.Link(self.imList, item));
                        });
                        retD.resolve(retval);
                    });
                    //
                    return retD;
                };
            }
            //
            self.imList = new imLib.IMList(imListOptions);
            //
            operationsOptions = {};
            {
                operationsOptions.Text = getTextResource('RemoveReference');
                operationsOptions.Validator = function () { return true; };
                operationsOptions.IsGranted = function (grantedOperations) { return self.ObjectUpdateIsGranted(grantedOperations); };
                //
                operationsOptions.Command = function () {
                    var selectedCalls = self.imList.SelectedItems();
                    if (selectedCalls.length == 0)
                        return;
                    //
                    var ids = [];
                    var question = '';
                    selectedCalls.forEach(function (el) {
                        ids.push({
                            'ClassID': el.ClassID(),
                            'ID': el.ID
                        });
                        //
                        var numChar = el.ClassID() == 702 || el.ClassID() == 703|| el.ClassID() == 701 || el.ClassID() == 119 ? '№ ' : '';
                        //
                        if (question.length < 200) {
                            question += (question.length > 0 ? ', ' : '') + numChar + el.Name;
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
                                    'ObjectClassID': objectClassID,
                                    'ObjectID': ko_object().ID(),
                                    'ReferenceIDList': ids
                                };
                                self.ajaxControl.Ajax($(ajaxSelector),
                                    {
                                        dataType: "json",
                                        method: 'POST',
                                        data: data,
                                        url: 'sdApi/RemoveAssetMixedReference'
                                    },
                                    function (newVal) {
                                        ko.utils.arrayForEach(ids, function (id) {
                                            self.imList.TryRemoveByID(id.ID, true);
                                        });
                                    });
                            }
                        });
                    });
                };
            }
            self.imList.AddOperation(operationsOptions);
            //
            operationsOptions = {};
            {
                operationsOptions.Text = 'reference';
                operationsOptions.Validator = function () { return false };
                operationsOptions.IsGranted = function (grantedOperations) { return self.ObjectUpdateIsGranted(grantedOperations); };
                operationsOptions.Command = function () {
                    var retvalD = $.Deferred();
                    //
                    if (ko_object != null)
                    {
                        var fh = new fhModule.formHelper();
                        fh.ShowAssetLink({
                            ClassID: objectClassID,
                            ID: ko_object().ID(),
                            ServiceID: objectClassID == 701 ? ko_object().ServiceID() : null,
                            ClientID: objectClassID == 701 ? ko_object().ClientID() : null,
                            ShowKE: KEList ? KEList : false
                        }, function (newValues) {
                            if (!newValues || newValues.length == 0)
                                return;
                            //
                            var retval = [];
                            ko.utils.arrayForEach(newValues, function (el) {
                                if (el && el.ID)
                                    retval.push({ ID: el.ID, ClassID: el.ClassID });
                            });
                            //
                            var data = {
                                'ObjectClassID': objectClassID,
                                'ObjectID': ko_object().ID(),
                                'DependencyList': retval,
                                'Parameters': [KEList ? KEList :false]
                            };
                            //
                            self.ajaxControl.Ajax($(ajaxSelector),
                                {
                                    dataType: "json",
                                    method: 'POST',
                                    data: data,
                                    url: 'sdApi/AddAssetReferences'
                                },
                                function (model) {
                                    if (model.Result === 0) {
                                        var linkList = model.List;
                                        if (linkList) {
                                            $.when(self.imList.Push(linkList)).done(function () {
                                                retvalD.resolve();
                                            });
                                        }
                                        else retvalD.resolve();
                                    }
                                    else
                                    {
                                        if (model.Result === 1) {
                                            require(['sweetAlert'], function () {
                                                swal(getTextResource('SaveError'), getTextResource('NullParamsError') + '\n[SDForm.LinkList.js, AddReferences]', 'error');
                                            });
                                        }
                                        else if (model.Result === 2) {
                                            require(['sweetAlert'], function () {
                                                swal(getTextResource('SaveError'), getTextResource('BadParamsError') + '\n[SDForm.LinkList.js, AddReferences]', 'error');
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
                                                swal(getTextResource('SaveError'), getTextResource('GlobalError') + '\n[SDForm.LinkList.js, AddReferences]', 'error');
                                            });
                                        }
                                        //
                                        retvalD.resolve();
                                    }
                                });
                        });                        
                    }
                    else retvalD.resolve();
                    //
                    return retvalD;
                };
            }
            self.imList.AddOperation(operationsOptions);
        },
        Operations: {
            OPERATION_Call_Update: 313,
            OPERATION_Problem_Update: 323,
            OPERATION_WorkOrder_Update: 333,
            OPERATION_RFC_Update:386,
        }
    };
    return module;
});