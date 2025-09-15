define(['knockout', 'jquery', 'ajax', 'selectControl', 'jqueryStepper'], function (ko, $, ajaxLib, scLib) {
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
            self.Left = ko.observable(null);
            self.Right = ko.observable(null);
            //
            self.IsFloat = obj.IsFloat ? true : false;
            //
            self.Min = obj.Min;
            self.Max = obj.Max;
            //
            self.Parse = function (value) {//учитывает изФлоат и уже парсит значение
                if (self.IsFloat) {
                    var parsed = parseFloat(value.toString().split(' ').join('').replace(',', '.'));
                    if (isNaN(parsed))
                        return 0;
                    //
                    return parsed;
                }
                else {
                    var parsed = parseInt(value.toString().split(' ').join(''));
                    if (isNaN(parsed))
                        return 0;
                    //
                    return parsed;
                }
            };
            self.SetNewValues = function (newFilterElement) {
                if (self.Type != newFilterElement.Type || self.PropertyName != newFilterElement.PropertyName)
                    return;
                //
                self.IsEmpty = newFilterElement.IsEmpty;
                self.Operation = newFilterElement.Operation;
                //
                if (self.controlSelectOperations) {
                    if (self.IsEmpty !== 1) {
                        self.controlSelectOperations.SetItemSelectedByID(self.Operation);
                        self.CheckVisibilityTextControls(self.Operation);
                    }
                    else {
                        self.controlSelectOperations.SetItemSelectedByID(module.OperationEmpty.ID);
                        self.CheckVisibilityTextControls(module.OperationEmpty.ID);
                    }
                }
                //
                self.Left(self.Parse(newFilterElement.Left).toString().replace('.', getDecimalSeparator()).replace(/\B(?=(\d{3})+(?!\d))/g, ''));
                self.Right(self.Parse(newFilterElement.Right).toString().replace('.', getDecimalSeparator()).replace(/\B(?=(\d{3})+(?!\d))/g, ''));
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
                retval.IsFloat = self.IsFloat;
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
                retval.Left = '' + self.Left();
                retval.Right = '' + self.Right();
                //
                return retval;
            };
            //
            self.AfterRender = function (htmlNodes) {
                if (htmlNodes && htmlNodes.length > 0)
                    self.$region = $(htmlNodes[0]).parent();
                //                
                var oPromise = self.InitializeOperationControl(self.$region.find('.rangeSliderFilter-operations'));
                var fPromise = self.InititalizeFirstControl(self.$region.find('.rangeSliderFilter-firstValue'));
                var sPromise = self.InititalizeSecondControl(self.$region.find('.rangeSliderFilter-secondValue'));
                //
                $.when(oPromise, fPromise, sPromise).done(function () {
                    self.$isLoaded.resolve();
                });
            };
            //
            self.controlSelectOperations = null;
            self.FirstTextFieldVisible = ko.observable(false);
            self.SecondTextFieldVisible = ko.observable(false);
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
                                self.CheckVisibilityTextControls(item.ID);
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
                            var currentOperation = ko.utils.arrayFirst(retval, function (el) { return el.Checked == true });
                            self.CheckVisibilityTextControls(currentOperation ? currentOperation.ID : null);
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
            //
            self.InititalizeFirstControl = function ($regionFirstDate) {
                var retD = $.Deferred();
                //                
                var value = self.Parse(obj.Left);
                //
                self.Left(value);
                //
                var $input = $regionFirstDate.find(':input');
                $input.stepper({
                    type: self.IsFloat ? 'float' : 'int',
                    floatPrecission: self.IsFloat ? 2 : 0,
                    wheelStep: 1,
                    arrowStep: self.IsFloat ? 0.01 : 1,
                    limit: [self.Min, self.Max],
                    onStep: function (val, up) {
                        self.Left(val);
                    }
                });
                //
                retD.resolve();
                return retD.promise();
            };
            self.InititalizeSecondControl = function ($regionSecondDate) {
                var retD = $.Deferred();
                //                
                var value = self.Parse(obj.Right);
                //
                self.Right(value);
                //
                var $input = $regionSecondDate.find(':input');
                $input.stepper({
                    type: self.IsFloat ? 'float' : 'int',
                    floatPrecission: self.IsFloat ? 2 : 0,
                    wheelStep: 1,
                    arrowStep: self.IsFloat ? 0.01 : 1,
                    limit: [self.Min, self.Max],
                    onStep: function (val, up) {
                        self.Right(val);
                    }
                });
                //
                retD.resolve();
                return retD.promise();
            };
            self.CheckVisibilityTextControls = function (currentOperationID) {
                if (currentOperationID === null || currentOperationID == module.OperationEmpty.ID) {
                    self.FirstTextFieldVisible(false);
                    self.SecondTextFieldVisible(false);
                    return;
                }
                //
                if (currentOperationID == 0 || currentOperationID == 1 || currentOperationID == 2 || currentOperationID == 3)//Equal, NotEqual, More or Less
                {
                    self.FirstTextFieldVisible(true);
                    self.SecondTextFieldVisible(false);
                    return;
                }
                //
                if (currentOperationID == 4 || currentOperationID == 5)//Between or Except
                {
                    self.FirstTextFieldVisible(true);
                    self.SecondTextFieldVisible(true);
                    return;
                }
            };
        }
    }
    return module;
});