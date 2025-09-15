define(['knockout', 'jquery', 'ajax', 'selectControl'], function (ko, $, ajaxLib, scLib) {
    var module = {
        OperationEmpty: { ID: -100500, Name: getTextResource('FilterElementIsEmpty') },
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
            self.AvailableValues = [];
            if (obj.AvailableValues) {
                obj.AvailableValues.forEach(function (el) {
                    self.AvailableValues.push(el);
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
                var addedToAvailable = [];
                if (newFilterElement.AvailableValues)
                    ko.utils.arrayForEach(newFilterElement.AvailableValues, function (newAv) {
                        var exist = ko.utils.arrayFirst(self.AvailableValues, function (av) {
                            return av.ID == newAv.ID;
                        });
                        if (!exist)
                        {
                            self.AvailableValues.push(newAv);
                            addedToAvailable.push(newAv);
                        }
                    });
                //
                var addedToSelected = [];
                if (newFilterElement.SelectedValues)
                    ko.utils.arrayForEach(newFilterElement.SelectedValues, function (newSel) {
                        var exist = ko.utils.arrayFirst(self.SelectedValues, function (sel) {
                            return sel.ID == newSel.ID;
                        });
                        if (!exist) {
                            self.SelectedValues.push(newSel);
                            addedToSelected.push(newSel);
                        }
                    });
                //
                if (self.controlSelectOperations) {
                    if (self.IsEmpty !== 1) {
                        self.controlSelectOperations.SetItemSelectedByID(self.Operation);
                        self.ValueSelectorVisible(true);
                    }
                    else {
                        self.controlSelectOperations.SetItemSelectedByID(module.OperationEmpty.ID);
                        self.ValueSelectorVisible(false);
                    }
                }
                //
                if (self.controlSelectValues)
                {
                    var arrayToPush = [];
                    ko.utils.arrayForEach(addedToAvailable, function (item) {
                        var value = {
                            ID: item.ID,
                            Name: item.Info,
                            Checked: false
                        };
                        arrayToPush.push(value);
                    });
                    if (arrayToPush.length > 0)
                        self.controlSelectValues.AddItemsToControl(arrayToPush);
                    //
                    ko.utils.arrayForEach(addedToSelected, function (item) {
                        self.controlSelectValues.SetItemSelectedByID(item.ID);
                    });
                }
            };
            self.GetDataToSave = function () {
                if (!self.controlSelectOperations || !self.controlSelectValues)
                    return null;
                //
                var currentOperation = self.controlSelectOperations.GetSelectedItems();
                var currentValues = self.controlSelectValues.GetSelectedItems();
                if (currentOperation == null || !currentValues)
                    return null;
                //
                var retval = {};
                //
                retval.Type = self.Type;
                retval.PropertyName = self.PropertyName;
                retval.LocaleName = self.LocaleName;
                //
                if (self.IsEmpty == 0)//FilterEmptyState CantEmpty
                {
                    retval.IsEmpty = 0;
                    retval.Operation = currentOperation.ID;
                }
                else if (currentOperation.ID == module.OperationEmpty.ID)
                {
                    retval.IsEmpty = 1;//Checked
                    retval.Operation = null;
                }
                else 
                {
                    retval.IsEmpty = 2;//Unchecked
                    retval.Operation = currentOperation.ID;
                }
                //
                retval.AvailableValues = [];
                self.AvailableValues.forEach(function (el) {
                    retval.AvailableValues.push({
                        ID: el.ID,
                        Info: el.Info,
                        DopInfo: el.DopInfo
                    });
                });
                //
                retval.SelectedValues = [];
                currentValues.forEach(function (el) {
                    retval.SelectedValues.push({
                        ID: el.ID,
                        Info: el.Name,
                        DopInfo: el.Description
                    });
                });
                //
                return retval;
            };
            //
            self.AfterRender = function (htmlNodes) {
                if (htmlNodes && htmlNodes.length > 0)
                    self.$region = $(htmlNodes[0]).parent();
                //
                var oPromise = self.InitializeOperationControl(self.$region.find('.selectorMultipleFilter-operations'));
                var vcPromise = self.InitializeValuesControl(self.$region.find('.selectorMultipleFilter-values'));
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
                                self.ValueSelectorVisible(item.ID != module.OperationEmpty.ID);
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
                            newData.forEach(function (el) {
                                retval.push({
                                    ID: el.ID,
                                    Name: el.Name,
                                    Checked: el.ID == self.Operation
                                });
                            });
                            //
                            if (ko.utils.arrayFirst(retval, function (el) { return el.Checked == true && el.ID != module.OperationEmpty.ID; }) != null)
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
                var deffered = $.Deferred();
                self.controlSelectValues = new scLib.control();
                self.controlSelectValues.init($regionValues,
                    {
                        Title: getTextResource('FilterChooseValue'),
                        IsSelectMultiple: true,
                        OnSelect: function (item) {}
                    }, deffered.promise());
                //
                var retval = [];
                ko.utils.arrayForEach(self.AvailableValues, function (item) {
                    var value = {
                        ID: item.ID,
                        Name: item.Info,
                        Description: item.DopInfo,
                        Checked: ko.utils.arrayFirst(self.SelectedValues, function (sel) { return sel.ID == item.ID; }) != null
                    };
                    retval.push(value);
                });
                retval.sort(function (x, y) {
                    var xName = x.Name.toUpperCase();
                    var yName = y.Name.toUpperCase();
                    if (xName > yName) return 1;
                    if (xName < yName) return -1;
                    return 0;
                });
                deffered.resolve(retval);
                $.when(self.controlSelectValues.$initializeCompleted).done(function () {
                    retD.resolve();
                });
                //
                return retD.promise();
            };
        }
    }
    return module;
});