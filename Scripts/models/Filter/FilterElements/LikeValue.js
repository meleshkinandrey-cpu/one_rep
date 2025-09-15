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
            self.SearchValue = ko.observable(obj.SearchValue);
            self.MaxTextLength = 100;
            //
            self.SetNewValues = function (newFilterElement) {
                if (self.Type != newFilterElement.Type || self.PropertyName != newFilterElement.PropertyName)
                    return;
                //
                self.IsEmpty = newFilterElement.IsEmpty;
                self.Operation = newFilterElement.Operation;
                //
                self.SearchValue(newFilterElement.SearchValue);
                //
                if (self.controlSelectOperations) {
                    if (self.IsEmpty !== 1) {
                        self.controlSelectOperations.SetItemSelectedByID(self.Operation);
                        self.ValueTextFieldVisible(true);
                    }
                    else {
                        self.controlSelectOperations.SetItemSelectedByID(module.OperationEmpty.ID);
                        self.ValueTextFieldVisible(false);
                    }
                }
            };
            self.GetDataToSave = function () {
                if (!self.controlSelectOperations)
                    return null;
                //
                var currentOperation = self.controlSelectOperations.GetSelectedItems();
                if (currentOperation == null)
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
                else if (currentOperation.ID == module.OperationEmpty.ID) {
                    retval.IsEmpty = 1;//Checked
                    retval.Operation = null;
                }
                else {
                    retval.IsEmpty = 2;//Unchecked
                    retval.Operation = currentOperation.ID;
                }
                //
                retval.SearchValue = self.SearchValue();
                //
                return retval;
            };
            //
            self.AfterRender = function (htmlNodes) {
                if (htmlNodes && htmlNodes.length > 0)
                    self.$region = $(htmlNodes[0]).parent();
                //
                var oPromise = self.InitializeOperationControl(self.$region.find('.likeValueFilter-operations'));
                //
                $.when(oPromise).done(function () {
                    self.$isLoaded.resolve();
                });
            };
            //
            self.controlSelectOperations = null;
            self.ValueTextFieldVisible = ko.observable(false);
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
                                self.ValueTextFieldVisible(item.ID != module.OperationEmpty.ID);
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
                                self.ValueTextFieldVisible(true);
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
        }
    }
    return module;
});