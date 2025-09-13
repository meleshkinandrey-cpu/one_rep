define(['knockout', 'jquery', 'ajax'], function (ko, $, ajaxLib) {
    var module = {
        IMList: function (options) {
            var imself = this;
            imself.options = options;
            if (imself.options != null)
                imself.aliasID = '' + options.aliasID;
            //
            imself.List = ko.observableArray([]);
            imself.MultipleSelection = true;//по умолчанию список с множественным выбором элеметов
            imself.GrantedOperations = ko.observable(null);//array
            //
            imself.OperationList = ko.observableArray([]);
            imself.AddOperation = function (operationOptions) {
                if (!operationOptions || !operationOptions.Text || !operationOptions.Command)
                    return;
                imself.OperationList.push(
                    new module.Operation(
                        imself,
                        operationOptions.Text,
                        operationOptions.Command,
                        operationOptions.Validator ? operationOptions.Validator : function () { return imself.SelectedItemsCount() > 0; },//по умолчанию = выделен хотя бы один элемент
                        operationOptions.Params ? operationOptions.Params : {},
                        operationOptions.IsGranted ? operationOptions.IsGranted : function () { return true; }
                    ));
            };
            //
            imself.Load = function () {
                var promise = null;
                if (imself.options != null && imself.options.LoadAction != null) {
                    imself.SelectedItems.removeAll();
                    imself.List.removeAll();
                    //
                    promise = imself.options.LoadAction();
                    $.when(promise).done(function (arrayElems) {
                        if (arrayElems != null) {
                            ko.utils.arrayForEach(arrayElems, function (item) {
                                imself.List().push(item);
                            });
                            imself.List.valueHasMutated();
                        }
                    });
                }
                return promise;
            };
            //
            imself.LoadList = function () {
                var promise = null;
                if (imself.options != null && imself.options.LoadIDListAction != null) {
                    imself.SelectedItems.removeAll();
                    imself.List.removeAll();
                    //
                    promise = imself.options.LoadIDListAction();
                    $.when(promise).done(function (arrayElems) {
                        if (arrayElems != null) {
                            ko.utils.arrayForEach(arrayElems, function (item) {
                                imself.List().push(item);
                            });
                            imself.List.valueHasMutated();
                        }
                    });
                }
                return promise;
            };
            //
            imself.Push = function (list) {
                var retvalD = $.Deferred();
                if (imself.options != null && imself.options.PushAction != null) {
                    //
                    var promise = imself.options.PushAction(list);
                    $.when(promise).done(function (arrayElems) {
                        if (arrayElems != null) {
                            ko.utils.arrayForEach(arrayElems, function (item) {
                                imself.List().push(item);
                            });
                            imself.List.valueHasMutated();
                        }
                        retvalD.resolve();
                    });
                }
                return retvalD.promise();
            };
            //
            imself.PushToStart = function (item) {
                var promise = null;
                if (imself.options != null && imself.options.PushItemToStartAction != null) {
                    //
                    promise = imself.options.PushItemToStartAction(item);
                    $.when(promise).done(function (elem) {
                        if (elem != null) {
                            var oldList = ko.observableArray([]);
                            ko.utils.arrayForEach(imself.List(), function (el) {
                                oldList.push(el);
                            });
                            imself.List.removeAll();
                            imself.List.push(elem);
                            ko.utils.arrayForEach(oldList(), function (el) {
                                imself.List.push(el);
                            });
                            imself.List.valueHasMutated();
                        }
                    });
                }
                return promise;
            };
            //
            imself.ReloadAll = function () {
                //TODO мб что-то надо дополнительно проверять
                return imself.Load();
            };
            //
            imself.TryReloadByIDArray = [];
            imself.TryReloadByID = function (elemID, forced) {
                if (imself.aliasID != null && imself.aliasID != '' && imself.options != null && imself.options.ReloadByIDAction != null) {
                    if (elemID && imself.TryReloadByIDArray.indexOf(elemID) == -1) {
                        imself.TryReloadByIDArray.push(elemID);
                        //console.log('pushed ' + elemID);
                    }
                    //
                    if (forced !== true && imself.TryReloadByIDArray.length > 1)
                        return;
                    //
                    var elem = ko.utils.arrayFirst(imself.List(), function (el) {
                        return el[imself.aliasID] == elemID;
                    });
                    //
                    //console.log('started ' + elemID);
                    var d = imself.options.ReloadByIDAction(elem, elemID);
                    $.when(d).done(function () {
                        var index = imself.TryReloadByIDArray.indexOf(elemID);
                        imself.TryReloadByIDArray.splice(index, 1);
                        //console.log('finished ' + elemID);
                        //
                        elemID = imself.TryReloadByIDArray.length > 0 ? imself.TryReloadByIDArray[0] : null;
                        if (elemID)
                            imself.TryReloadByID(elemID, true);
                    });
                }
            };
            imself.TryRemoveByID = function (elemID) {
                if (imself.aliasID != null && imself.aliasID != '') {
                    var elem = ko.utils.arrayFirst(imself.List(), function (el) {
                        return el[imself.aliasID].toUpperCase() == elemID.toUpperCase();
                    });
                    if (elem != null) {
                        imself.List.remove(elem);
                        //
                        elem = ko.utils.arrayFirst(imself.SelectedItems(), function (el) {
                            return el[imself.aliasID].toUpperCase() == elemID.toUpperCase();
                        });
                        if (elem != null) {
                            imself.SelectedItems.remove(elem);
                            //
                            if (imself.OnSelectionChanged)
                                imself.OnSelectionChanged();
                        }
                    }
                }
            };
            //
            imself.OnSelectionChanged = null;
            imself.SelectedItems = ko.observableArray([]);
            imself.SelectedItemsCount = ko.computed(function () {
                if (imself.SelectedItems() != null)
                    return imself.SelectedItems().length;
                else
                    return 0;
            });
            //
            imself.ItemChecked = function (obj) {
                if (!imself.MultipleSelection)
                    imself.UncheckAll(obj);
                //
                if (imself.aliasID != null && imself.aliasID != '') {
                    var already = ko.utils.arrayFirst(imself.SelectedItems(), function (el) {
                        return el[imself.aliasID] == obj[imself.aliasID];
                    });
                    if (already == null) {
                        imself.SelectedItems.push(obj);
                        //
                        if (imself.OnSelectionChanged)
                            imself.OnSelectionChanged();
                    }
                }
            };
            imself.ItemUnchecked = function (obj) {
                if (imself.aliasID != null && imself.aliasID != '') {
                    var already = ko.utils.arrayFirst(imself.SelectedItems(), function (el) {
                        return el[imself.aliasID] == obj[imself.aliasID];
                    });
                    if (already != null) {
                        imself.SelectedItems.remove(obj);
                        //
                        if (imself.OnSelectionChanged)
                            imself.OnSelectionChanged();
                    }
                }
            };
            imself.UncheckAll = function (keepCheckedItem) {
                ko.utils.arrayForEach(imself.List(), function (el) {
                    if (el.Selected != null && el.Selected() && el != keepCheckedItem)
                        el.Selected(false);
                });
            };
            //
            imself.ExecuteOperation = function (operationText) {
                var op = ko.utils.arrayFirst(imself.OperationList(), function (el) {
                    return el.Text == operationText;
                });
                //
                if (op)
                    op.OnClick();
                else
                    console.log('This operation doesnt exist: ' + operationText);
            };
            //
            imself.IsGranted = function (operationText) {
                var op = ko.utils.arrayFirst(imself.OperationList(), function (el) {
                    return el.Text == operationText;
                });
                //
                if (op)
                    return op.IsGranted();
                else
                    console.log('This operation doesnt exist: ' + operationText);
            };
        },
        Operation: function (imList, text, command, validator, params, isGranted) {
            var opself = this;
            //
            opself.Text = text;
            opself.Command = command;
            opself.Validator = validator;
            opself.Params = params;
            opself.IsGranted = ko.computed(function () {
                return isGranted(imList.GrantedOperations());
            });
            //
            opself.OnClick = function () {
                if (!opself.IsGranted())
                    return;
                if (imList && opself.Command)
                    opself.Command(imList.SelectedItems(), opself.Params);
            };
            //
            opself.IsVisible = ko.computed(function () {
                if (imList.SelectedItems()) {
                    if (!opself.Validator)
                        return false;
                    if (!opself.IsGranted())
                        return false;
                    //
                    return opself.Validator(imList.SelectedItems());
                }
                else false;
            });
        }
    };
    return module;
});