define(['knockout', 'jquery', 'ajax', 'imList', 'models/FinanceForms/ActivesRequestSpecification'], function (ko, $, ajaxLib, imLib, specLib) {
    var module = {
        //сущность knockout, идентификатор класса сущности, селектор ajax-крутилки
        LinkList: function (ko_object, objectClassID, ajaxSelector, readOnly_object, canEdit_object) {
            var self = this;
            //
            self.isLoaded = ko.observable(false);//факт загруженности данных для объекта ko_object()
            self.imList = null;//declared below
            self.ajaxControl = new ajaxLib.control();//единственный ajax для этого списка            
            //
            self.CheckData = function () {//функция загрузки списка (грузится только раз).
                if (!self.isLoaded()) {
                    $.when(self.imList.Load()).done(function () {
                        self.isLoaded(true);
                    });
                }
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
            self.onSelectedChange = function (item, isSelected) {
                if (isSelected == true)
                    self.imList.ItemChecked(item);
                else if (isSelected == false)
                    self.imList.ItemUnchecked(item);
            };
            self.ClearSelection = function () {
                self.imList.UncheckAll();
                self.SelectAll(false);
            };
            self.SelectAll = ko.observable(false);
            self.SelectAll.subscribe(function (newValue) {
                ko.utils.arrayForEach(self.imList.List(), function (el) {
                    if (el.Selected != null && el.Selected() != newValue)
                        el.Selected(newValue);
                });
            });
            //
            self.getFloatValue = function (val) {
                if (val)
                    return parseFloat(val.toString().replace(',', '.').split(' ').join(''));
                else
                    return 0;
            };
            //
            self.ShowObjectForm = function (obj) {//отображает форму элемента списка
                if (self.ReadOnly())
                    return;
                //         
                require(['financeForms'], function (module) {
                    var fh = new module.formHelper(true);
                    fh.ShowFinanceBudgetRow(obj.ID);
                });
            };
            //
            self.FinanceBudgetRowList_Sum = ko.computed(function () {
                if (!self.isLoaded())
                    return 0;
                //
                var retval = 0.0;
                ko.utils.arrayForEach(self.imList.List(), function (el) {
                    retval += parseFloat(el.Sum);
                });
                retval = specLib.Normalize(retval);
                //
                return retval;
            });
            self.SumToString = function (val) {
                return specLib.Normalize(val);
            };
            self.SortList = function (list) {
                list.sort(
                        function (left, right) {
                            return left.Identifier == right.Identifier ?
                                (left.Name == right.Name ? 0 : (left.Name < right.Name ? -1 : 1)) :
                                (left.Identifier < right.Identifier ? -1 : 1);
                        }
                    );
            };
            //
            var imListOptions = {};//параметры imList для списка 
            {
                imListOptions.aliasID = 'ID';
                //
                imListOptions.LoadAction = function () {
                    var retvalD = $.Deferred();
                    var param = {
                        WorkOrderID: ko_object().ID()
                    };
                    //
                    self.ajaxControl.Ajax($(ajaxSelector),
                    {
                        dataType: "json",
                        method: 'GET',
                        url: 'finApi/GetFinanceBudgetRowDependencyListByWorkOrder?' + $.param(param)
                    },
                    function (newVal) {
                        if (newVal && newVal.Result === 0) {
                            if (newVal.List) {
                                var retval = [];
                                for (var i = 0; i < newVal.List.length; i++)
                                    retval.push(new module.FinanceBudgetRow(newVal.List[i], self.onSelectedChange));
                                self.SortList(retval);
                                retvalD.resolve(retval);
                            }
                            else {
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('AjaxError') + '\n[FinanceBudgetRowList.js, LoadAction]', 'error');
                                });
                                retvalD.resolve([]);
                            }
                        }
                        else if (newVal && newVal.Result === 1) {
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[FinanceBudgetRowList.js, LoadAction]', 'error');
                            });
                            retvalD.resolve([]);
                        }
                        else {
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[FinanceBudgetRowList.js, LoadAction]', 'error');
                            });
                            retvalD.resolve([]);
                        }
                    },
                    null,
                    function () {
                        retvalD.resolve([]);
                    });
                    //
                    return retvalD.promise();
                };
                //
                imListOptions.ReloadByIDAction = function (obj, id) {
                    var retD = $.Deferred();
                    //
                    if (!self.isLoaded()) {
                        retD.resolve(false);
                        return retD.promise();
                    }
                    //
                    var data = {
                        'WorkOrderID': ko_object().ID(),
                        'FinanceBudgetRowID': id
                    };
                    self.ajaxControl.Ajax($(ajaxSelector),
                        {
                            dataType: "json",
                            method: 'GET',
                            data: data,
                            url: 'finApi/GetFinanceBudgetRowDependencyByWorkOrder'
                        },
                        function (newVal) {
                            if (newVal && newVal.Result === 0) {
                                var newValue = newVal.Data;
                                //
                                self.imList.TryRemoveByID(id);
                                if (newValue) {
                                    self.imList.List.push(new module.FinanceBudgetRow(newValue, self.onSelectedChange));
                                    self.SortList(self.imList.List);
                                    self.imList.List.valueHasMutated();
                                }
                                //
                                retD.resolve(true);
                            }
                            else if (newVal && newVal.Result === 1)
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[FinanceBudgetRowList.js, ReloadByIDAction]', 'error');
                                    retD.resolve(false);
                                });
                            else
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[FinanceBudgetRowList.js, ReloadByIDAction]', 'error');
                                    retD.resolve(false);
                                });
                        });
                    //
                    return retD.promise();
                };
            }
            self.imList = new imLib.IMList(imListOptions);
            //
            //
            {//действия над списком               
                operationsOptions = {};
                $.when(operationIsGrantedD(858)).done(function (remove) {
                    if (remove != true)
                        return;
                    //
                    operationsOptions.Text = getTextResource('ActionRemove');
                    operationsOptions.Command = function (list) {
                        var PostD = $.Deferred();
                        require(['sweetAlert'], function () {
                            var identifierList = '';
                            ko.utils.arrayForEach(list, function (el) {
                                identifierList += el.Identifier + '\n';
                            });
                            //
                            swal({
                                title: getTextResource('FinanceBudgetRowOperationCaption'),
                                text: getTextResource('FinanceBudgetRowDeleteQuestion') + ' ' + identifierList,
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
                                    showSpinner();
                                    //
                                    var ids = [];
                                    ko.utils.arrayForEach(list, function (el) {
                                        ids.push(el.ID);
                                    });
                                    //
                                    var data = {
                                        WorkOrderID: ko_object().ID(),
                                        FinanceBudgetRowIDList: ids
                                    };
                                    self.ajaxControl.Ajax($(ajaxSelector),
                                        {
                                            dataType: "json",
                                            method: 'POST',
                                            data: data,
                                            url: 'finApi/DeleteFinanceBudgetRowDependency'
                                        },
                                        function (Result) {
                                            if (Result === 0) {
                                                for (var i = 0; i < ids.length; i++)
                                                    self.imList.TryRemoveByID(ids[i]);
                                                PostD.resolve();
                                            } else if (Result === 1)
                                                require(['sweetAlert'], function () {
                                                    swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[FinanceBudgetRowList.js, Delete]', 'error');
                                                    PostD.resolve();
                                                });
                                            else if (Result === 2)
                                                require(['sweetAlert'], function () {
                                                    swal(getTextResource('ErrorCaption'), getTextResource('BadParamsError') + '\n[FinanceBudgetRowList.js, Delete]', 'error');
                                                    PostD.resolve();
                                                });
                                            else if (Result === 3)
                                                require(['sweetAlert'], function () {
                                                    swal(getTextResource('ErrorCaption'), getTextResource('AccessError'), 'error');
                                                    PostD.resolve();
                                                });
                                            else if (Result === 5)
                                                require(['sweetAlert'], function () {
                                                    swal(getTextResource('ErrorCaption'), getTextResource('ConcurrencyErrorWithoutQuestion'), 'error');
                                                    PostD.resolve();
                                                });
                                            else if (Result === 6)
                                                require(['sweetAlert'], function () {
                                                    swal(getTextResource('ErrorCaption'), getTextResource('ObjectDeleted'), 'error');
                                                    $.when(self.imList.ReloadAll()).done(function () {
                                                        PostD.resolve();
                                                    });
                                                });
                                            else if (Result === 8)
                                                require(['sweetAlert'], function () {
                                                    swal(getTextResource('ErrorCaption'), getTextResource('ValidationError'), 'error');
                                                    PostD.resolve();
                                                });
                                            else
                                                require(['sweetAlert'], function () {
                                                    swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[FinanceBudgetRowList.js, Delete]', 'error');
                                                    PostD.resolve();
                                                });
                                        },
                                        null,
                                        function () {
                                            hideSpinner();
                                        });
                                }
                                else PostD.resolve();
                            });
                        });
                        return PostD.promise();
                    };
                    self.imList.AddOperation(operationsOptions);
                });
                //
                operationsOptions = {};
                $.when(operationIsGrantedD(857)).done(function (add) {
                    if (add != true)
                        return;
                    //
                    operationsOptions.Text = getTextResource('Add');
                    operationsOptions.Validator = function () { return self.imList.SelectedItemsCount() == 0; };
                    operationsOptions.Command = function (selectedList) {
                        showSpinner();
                        require(['financeForms'], function (fh) {
                            var fh = new fh.formHelper(true);
                            fh.ShowFinanceBudgetRowSearcher(ko_object().ID(), function (selectedFinanceBudgetRowArray) {//workOrderID, func
                                var list = [];
                                for (var i = 0; i < selectedFinanceBudgetRowArray.length; i++) {
                                    var obj = selectedFinanceBudgetRowArray[i];
                                    list.push({
                                        WorkOrderID: ko_object().ID(),
                                        FinanceBudgetRowID: obj.ID,
                                        Sum: self.getFloatValue(obj.Sum())
                                    });
                                }
                                if (list.length == 0)
                                    return;
                                //
                                self.ajaxControl.Ajax($(ajaxSelector),
                                {
                                    dataType: "json",
                                    method: 'POST',
                                    data: { List: list },
                                    url: 'finApi/InsertFinanceBudgetRowDependency'
                                },
                                function (newVal) {
                                    if (newVal && newVal.Result === 0) {
                                        if (newVal.List) {
                                            for (var i = 0; i < newVal.List.length; i++)
                                                self.imList.List.push(new module.FinanceBudgetRow(newVal.List[i], self.onSelectedChange));
                                            //
                                            self.SortList(self.imList.List);
                                            self.imList.List.valueHasMutated();
                                        }
                                        else
                                            require(['sweetAlert'], function () {
                                                swal(getTextResource('ErrorCaption'), getTextResource('AjaxError') + '\n[FinanceBudgetRowList.js, Insert]', 'error');
                                            });
                                    }
                                    else if (newVal && newVal.Result === 1)
                                        require(['sweetAlert'], function () {
                                            swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[FinanceBudgetRowList.js, Insert]', 'error');
                                        });
                                    else if (newVal && newVal.Result === 2)
                                        require(['sweetAlert'], function () {
                                            swal(getTextResource('ErrorCaption'), getTextResource('BadParamsError') + '\n[FinanceBudgetRowList.js, Insert]', 'error');
                                        });
                                    else
                                        require(['sweetAlert'], function () {
                                            swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[FinanceBudgetRowList.js, Insert]', 'error');
                                        });
                                },
                                null);
                            });
                        });
                    };
                    self.imList.AddOperation(operationsOptions);
                });
            }
        },

        FinanceBudgetRow: function (obj, onSelectedChange) {
            var self = this;
            //
            self.ID = obj.ID;
            self.Identifier = obj.Identifier;
            self.Name = obj.Name;
            self.InitiatorFullName = obj.InitiatorFullName;
            self.BudgetFullName = obj.BudgetFullName;
            //self.AvailableSum = specLib.Normalize(obj.AvailableSum); needn't
            self.Sum = specLib.Normalize(obj.Sum);
            //
            self.Selected = ko.observable(false);
            self.Selected.subscribe(function (newValue) {
                if (onSelectedChange)
                    onSelectedChange(self, newValue);
            });
            //
            self.RowClick = function (obj, e) {
                e.stopPropagation();
                return true;
            };
        }
    };
    return module;
});