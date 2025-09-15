define(['knockout', 'jquery', 'ajax', 'selectControl', 'treeAndSearchControl'], function (ko, $, ajaxLib, scLib, treeSearchLib) {
    var module = {
        OperationEmpty: { ID: -100500, Name: getTextResource('FilterElementIsEmpty') },
        OperationUseSelf: { ID: -1812, Name: getTextResource('CurrentUser') },
        CurrentUserID: '_currentUserID_',
        ElementIsEmptyID: '_elementIsEmptyID_',
        MyUserOrQueueID: '_myUserOrQueueID_',
        ViewModel: function (obj) {
            var self = this;
            self.$region = null;
            self.$isLoaded = $.Deferred();
            //
            self.Type = obj.Type;
            self.PropertyName = obj.PropertyName;
            self.LocaleName = obj.LocaleName;
            self.IsEmpty = obj.IsEmpty;
            self.Operation = obj.Operation;
            //
            self.ClassSearcher = obj.ClassSearcher;
            self.UseSelf = obj.UseSelf;
            self.Options = obj.Options;
            self.SearcherParams = [];
            if (obj.SearcherParams) {
                obj.SearcherParams.forEach(function (el) {
                    self.SearcherParams.push(el);
                });
            }
            //
            {//extended filters. only for Executor, Owner, Queue
                self.FilterElementIsEmptyChecked = ko.observable(false);
                self.FilterElementIsEmptyCheckedChanged = function (item) {
                    self.FilterElementIsEmptyChecked(!self.FilterElementIsEmptyChecked());
                    return true;
                };
                //
                self.CurrentUserChecked = ko.observable(false);
                self.CurrentUserCheckedChanged = function (item) {
                    self.CurrentUserChecked(!self.CurrentUserChecked());
                    return true;
                };
                //
                self.MyUserOrQueueChecked = ko.observable(false);
                self.MyUserOrQueueCheckedChanged = function (item) {
                    self.MyUserOrQueueChecked(!self.MyUserOrQueueChecked());
                    return true;
                };
                //
                self.CurrentUserIsVisible = ko.computed(function () {
                    if (self.PropertyName == "QueueName")
                        return false;
                    //
                    return true;
                });
                //
                self.ShowExtendedFields = ko.computed(function () {
                    if (self.PropertyName == "ExecutorFullName" || self.PropertyName == "OwnerFullName" || self.PropertyName == "QueueName")
                        return true;
                    //
                    return false;
                });
                //
                self.GetMyUserOrQueueTextResource = ko.computed(function () {
                    if (self.PropertyName == "ExecutorFullName" || self.PropertyName == "OwnerFullName")
                        return getTextResource('MyUser');
                    else if (self.PropertyName == "QueueName")
                        return getTextResource('MyQueue');
                });
            }
            //
            self.SelectedValues = [];
            if (obj.SelectedValues) {
                obj.SelectedValues.forEach(function (el) {
                    self.SelectedValues.push(el);
                });
            }
            //
            self.SetNewValues = function (newFilterElement) {
                if (self.Type != newFilterElement.Type || self.PropertyName != newFilterElement.PropertyName)
                    return;
                //
                self.IsEmpty = newFilterElement.IsEmpty;
                self.Operation = newFilterElement.Operation;
                //
                var currentUserSetted = false;
                //
                var addedToSelected = [];
                if (newFilterElement.SelectedValues)
                    ko.utils.arrayForEach(newFilterElement.SelectedValues, function (newSel) {
                        var exist = ko.utils.arrayFirst(self.SelectedValues, function (sel) {
                            return sel.ID == newSel.ID;
                        });
                        //
                        if (newSel.ID == module.CurrentUserID) {
                            self.CurrentUserChecked(true);
                            currentUserSetted = true;
                        }
                        else if (newSel.ID == module.ElementIsEmptyID) {
                            self.FilterElementIsEmptyChecked(true);
                        }
                        else if (newSel.ID == module.MyUserOrQueueID) {
                            self.MyUserOrQueueChecked(true);
                        }
                        else if (!exist) {
                            self.SelectedValues.push(newSel);
                            addedToSelected.push(newSel);
                        }
                    });
                //
                if (self.controlSelectOperations) {
                    if (self.IsEmpty !== 1) {                        
                        if (currentUserSetted && (newFilterElement.IsFilteredBySearcher !== null && !newFilterElement.IsFilteredBySearcher)) {
                            self.controlSelectOperations.SetItemSelectedByID(module.OperationUseSelf.ID);
                            self.ValueSelectorVisible(false);
                        }
                        else {
                            self.controlSelectOperations.SetItemSelectedByID(self.Operation);
                            self.ValueSelectorVisible(true);
                        }
                    }
                    else {
                        self.controlSelectOperations.SetItemSelectedByID(module.OperationEmpty.ID);
                        self.ValueSelectorVisible(false);
                    }
                }
                //
                if (self.controlSelectValues && (newFilterElement.IsFilteredBySearcher !== null && newFilterElement.IsFilteredBySearcher)) {
                    self.controlSelectValues.SetValues(addedToSelected);
                }
            };
            self.GetDataToSave = function () {
                if (!self.controlSelectOperations || !self.controlSelectValues)
                    return null;
                //
                var currentOperation = self.controlSelectOperations.GetSelectedItems();
                var currentValues = self.controlSelectValues.GetValues();
                if (currentOperation == null || !currentValues)
                    return null;
                //
                var retval = {};
                //
                retval.Type = self.Type;
                retval.PropertyName = self.PropertyName;
                retval.LocaleName = self.LocaleName;
                retval.ClassSearcher = self.ClassSearcher;
                retval.UseSelf = self.UseSelf;
                retval.SearcherParams = self.SearcherParams;
                //
                retval.IsFilteredBySearcher = false;
                //
                if (self.IsEmpty == 0)//FilterEmptyState CantEmpty
                {
                    retval.IsEmpty = 0;
                    if (self.UseSelf && currentOperation.ID == module.OperationUseSelf.ID)
                        retval.Operation = null;
                    else retval.Operation = currentOperation.ID;
                }
                else if (currentOperation.ID == module.OperationEmpty.ID) {
                    retval.IsEmpty = 1;//Checked
                    retval.Operation = null;
                }
                else {
                    retval.IsEmpty = 2;//Unchecked
                    if (self.UseSelf && currentOperation.ID == module.OperationUseSelf.ID)
                        retval.Operation = null;
                    else retval.Operation = currentOperation.ID;
                }
                //
                retval.SelectedValues = [];
                if (currentOperation.ID == module.OperationUseSelf.ID) {
                    if (self.PropertyName != 'QueueName')
                        retval.SelectedValues.push({
                            ID: module.CurrentUserID,
                            ClassID: 9,//USER
                            Info: getTextResource('CurrentUser'),
                            DopInfo: ''
                        });
                }
                else {
                    retval.IsFilteredBySearcher = true;
                    //
                    if (self.CurrentUserChecked()) {
                        retval.SelectedValues.push({
                            ID: module.CurrentUserID,
                            ClassID: 9,//USER
                            Info: getTextResource('CurrentUser'),
                            DopInfo: ''
                        });
                    }
                    //
                    if (self.FilterElementIsEmptyChecked()) {
                        retval.SelectedValues.push({
                            ID: module.ElementIsEmptyID,
                            ClassID: 9,//USER
                            Info: getTextResource('FilterElementIsEmpty'),
                            DopInfo: ''
                        });
                    }
                    //
                    if (self.MyUserOrQueueChecked()) {
                        retval.SelectedValues.push({
                            ID: module.MyUserOrQueueID,
                            ClassID: self.PropertyName == 'QueueName' ? 722 : 9,//QUEUE, USER
                            Info: self.GetMyUserOrQueueTextResource(),
                            DopInfo: ''
                        });
                    }
                    //
                    ko.utils.arrayForEach(currentValues, function (val) {
                        retval.SelectedValues.push({
                            ID: val.ID,
                            ClassID: val.ClassID,
                            Info: val.Name,
                            DopInfo: val.DopInfo
                        });
                    });
                }
                //
                return retval;
            };
            //
            self.AfterRender = function (htmlNodes) {
                if (htmlNodes && htmlNodes.length > 0)
                    self.$region = $(htmlNodes[0]).parent();
                //
                var oPromise = self.InitializeOperationControl(self.$region.find('.simpleValueFilter-operations'));
                var vcPromise = self.InitializeValuesControl(self.$region.find('.simpleValueFilter-values .treeAndSearch'));
                //
                $.when(oPromise, vcPromise).done(function () {
                    self.$isLoaded.resolve();
                });
            };
            //
            self.controlSelectOperations = null;
            self.controlSelectValues = null;
            self.ValueSelectorVisible = ko.observable(false);
            //
            self.ajaxControl_loadOperations = new ajaxLib.control();
            self.InitializeOperationControl = function ($regionOperations) {
                var retD = $.Deferred();
                //
                $regionOperations.empty();
                var deffered = $.Deferred();
                self.controlSelectOperations = new scLib.control();
                self.controlSelectOperations.init($regionOperations,
                    {
                        Title: getTextResource('FilterChooseOperation'),
                        TitleStyle: 'filterElementOperationsHeader',
                        IsSelectMultiple: false,
                        AllowDeselect: false,
                        OnSelect: function (item) {
                            if (item)
                                self.ValueSelectorVisible(item.ID != module.OperationEmpty.ID && item.ID != module.OperationUseSelf.ID);
                        }
                    }, deffered.promise());
                //
                var param = {
                    filterType: self.Type,
                };
                //
                self.ajaxControl_loadOperations.Ajax($regionOperations,
                    {
                        dataType: "json",
                        method: 'GET',
                        url: 'filterApi/GetFilterOperationList?' + $.param(param)
                    },
                    function (newData) {
                        if (newData != null) {
                            var retval = [];
                            //
                            if (self.IsEmpty != 0)//FilterEmptyState CantEmpty
                            {
                                retval.push({
                                    ID: module.OperationEmpty.ID,
                                    Name: module.OperationEmpty.Name,
                                    Checked: self.IsEmpty == 1 //Checked
                                });
                            }
                            //
                            if (self.UseSelf && self.PropertyName !== "QueueName")
                            {
                                retval.push({
                                    ID: module.OperationUseSelf.ID,
                                    Name: module.OperationUseSelf.Name,
                                    Checked: ko.utils.arrayFirst(self.SelectedValues, function (v) { return v.ID == module.CurrentUserID }) != null //Checked
                                });
                            }
                            //
                            newData.forEach(function (el) {
                                retval.push({
                                    ID: el.ID,
                                    Name: el.Name,
                                    Checked: el.ID == self.Operation
                                });
                            });
                            //
                            if (ko.utils.arrayFirst(retval, function (el) { return el.Checked == true && el.ID != module.OperationEmpty.ID && el.ID != module.OperationUseSelf.ID; }) != null)
                                self.ValueSelectorVisible(true);
                            //
                            deffered.resolve(retval);
                        }
                        else deffered.resolve();
                        //
                        $.when(self.controlSelectOperations.$initializeCompleted).done(function () {
                            retD.resolve();
                        });
                    });
                //
                return retD.promise();
            };
            self.InitializeValuesControl = function ($regionValues) {
                var retD = $.Deferred();
                //
                $regionValues.empty();
                self.controlSelectValues = new treeSearchLib.controlMulti();
                self.controlSelectValues.init($regionValues, {
                    SelectedValues: self.SelectedValues,
                    TargetClassID: self.Options.TargetClassID,
                    UseAccessIsGranted: self.Options.UseAccessIsGranted,
                    TreeType: self.Options.TreeType,
                    AvailableClassID: self.Options.AvailableClassID,
                    FinishClassID: self.Options.FinishClassID,
                    ClassSearcher: self.ClassSearcher,
                    OperationsID: self.Options.OperationsID,
                    //SearcherParams: self.SearcherParams,
                    SearcherParams: self.PropertyName == "QueueName" ? [255] : self.SearcherParams,//для отображения групп для заявок или заданий. dima: very very bad!
                    ShowTree: self.PropertyName !== "QueueName"
                });
                $.when(self.controlSelectValues.$isLoaded).done(function () {
                    retD.resolve();
                });
                //
                return retD.promise();
            };
        }
    }
    return module;
});