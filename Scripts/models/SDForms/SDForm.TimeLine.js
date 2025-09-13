define(['knockout', 'jquery', 'ajax'], function (ko, $, ajaxLib) {
    var module = {
        //объект Хода обработки, селектор региона, обсервабл редактирования, обсервабл размеров вкладки
        ViewModel: function (obj, region_selector, canEdit_object, tabDim_object) {
            var self = this;
            //
            self.ObjectClassID = obj.ObjectClassID;
            self.ObjectID = obj.ObjectID;
            //
            self.TimeLine = ko.observable(null);
            self.Template = ko.observable('');
            if (self.ObjectClassID === 701) //CALL
            {
                self.TimeLine(new module.CallTimeLine(obj, region_selector, canEdit_object, tabDim_object));
                self.Template('TimeLine/CallTimeLine');
            }
            else if (self.ObjectClassID === 702) //PROBLEM
            {
                self.TimeLine(new module.ProblemTimeLine(obj, canEdit_object));
                self.Template('TimeLine/ProblemTimeLine');
            }
            else if (self.ObjectClassID === 703) //RFC
            {
                self.TimeLine(new module.RFCTimeLine(obj, canEdit_object));
                self.Template('TimeLine/RFCTimeLine');
            }
            else if (self.ObjectClassID === 119) //WORKORDER
            {
                self.TimeLine(new module.WorkOrderTimeLine(obj, canEdit_object));
                self.Template('TimeLine/WorkOrderTimeLine');
            }
            //
            self.Visible = ko.observable(false);
            //
            self.AfterRender = function () {
                self.Visible(true);
                if (self.TimeLine() && self.TimeLine().CalculateTopPosition)
                    self.TimeLine().CalculateTopPosition();
            };
        },
        DateInfo: function (obj) {
            var self = this;
            //
            self.LocalDate = obj.DateForJs ? ko.observable(parseDate(obj.DateForJs)) : ko.observable('');
            self.DateObj = obj.Date ? ko.observable(new Date(getUtcDate(obj.Date))) : ko.observable(null);
            self.FieldName = obj.FieldName;
            self.LocalName = ko.observable('');
            //
            if (obj.Aliases) {
                var val = ko.utils.arrayFirst(obj.Aliases, function (el) {
                    return el.Locale == locale;
                });
                //
                if (val)
                    self.LocalName(val.Alias);
            }
            //
            self.IsEmpty = ko.computed(function () {
                if (self.LocalDate() == '' || self.DateObj() == null)
                    return true;
                //
                return false;
            });
            //
            self.GetSimpleObj = ko.computed(function () { //использую для обновления при формировании массива дат объекта
                return { DateObj: self.DateObj(), FieldName: self.FieldName };
            });
        },
        GetDateInfo: function (datesArray, dateName) {
            if (!datesArray || !dateName)
                return null;
            //
            var info = ko.utils.arrayFirst(datesArray, function (el) {
                return el.FieldName == dateName;
            });
            //
            if (info)
                return new module.DateInfo(info);
            else return null;
        },
        GetDateForModifyLocation: function (datesArray, dateModifyValue) {//null - самый левый или тот, после которого
            if (!datesArray || !dateModifyValue)
                return null;
            //
            var retval = null;
            for (var i = 0; i < datesArray.length; i++) {
                if (datesArray[i].DateObj != null) {
                    retval = datesArray[i];
                }
            }
            //
            return retval;
        },
        CallTimeLine: function (obj, region_selector, canEdit_object, tabDim_object) {
            var self = this;
            self.OperationGranted = ko.observable(false);
            $.when(operationIsGrantedD(522)).done(function (result) {
                if (result == true)
                    self.OperationGranted(true);//OPERATION_Call_PowerfullAccess
            });
            //
            self.CanEdit = ko.computed(function () {
                if (canEdit_object() == true && self.OperationGranted() == true)
                    return true;
                //
                return false;
            });
            //
            self.ObjectID = obj.ObjectID;
            self.UtcDateRegistered = module.GetDateInfo(obj.DatesList, 'UtcDateRegistered');
            self.UtcDateOpened = module.GetDateInfo(obj.DatesList, 'UtcDateOpened');
            self.UtcDatePromised = module.GetDateInfo(obj.DatesList, 'UtcDatePromised');
            self.UtcDateAccomplished = module.GetDateInfo(obj.DatesList, 'UtcDateAccomplished');
            self.UtcDateClosed = module.GetDateInfo(obj.DatesList, 'UtcDateClosed');
            self.UtcDateModified = module.GetDateInfo(obj.DatesList, 'UtcDateModified');
            //
            self.HistoryList = ko.observableArray([]);//история
            self.HistoryList.removeAll();
            //
            if (obj.HistoryList)
                require(['models/SDForms/SDForm.TapeRecord'], function (tapeLib) {
                    var options = {
                        entityID: self.ObjectID,
                        entityClassID: 701,
                        type: 'history' // from Tape.js
                    };
                    ko.utils.arrayForEach(obj.HistoryList, function (item) {
                        self.HistoryList.push(new tapeLib.TapeRecord(item, options));
                    });
                    self.HistoryList.valueHasMutated();
                });
            //
            self.FieldNameForModify = ko.computed(function () {
                var dateArr = [self.UtcDateRegistered.GetSimpleObj(), self.UtcDateOpened.GetSimpleObj(), self.UtcDateAccomplished.GetSimpleObj(), self.UtcDateClosed.GetSimpleObj()];
                var retval = module.GetDateForModifyLocation(dateArr, self.UtcDateModified.DateObj());
                //
                if (retval == null)
                    return null;
                else return retval.FieldName;
            });
            //
            self.EditDateRegistered = function () {
                if (self.CanEdit() == false || self.OperationGranted() == false)
                    return;
                showSpinner();
                require(['usualForms'], function (module) {
                    var fh = new module.formHelper(true);
                    var options = {
                        ID: self.ObjectID,
                        objClassID: 701,
                        fieldName: 'Call.DateRegistered',
                        fieldFriendlyName: getTextResource('CallDateRegistered'),
                        allowNull: false,
                        oldValue: self.UtcDateRegistered.DateObj(),
                        onSave: function (newDate) {
                            self.UtcDateRegistered.LocalDate(newDate ? parseDate(newDate) : '');
                            self.UtcDateRegistered.DateObj(newDate ? new Date(parseInt(newDate)) : null);
                        }
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.dateEdit, options);
                });
            };
            //
            self.EditDateOpened = function () {
                if (self.CanEdit() == false || self.OperationGranted() == false)
                    return;
                showSpinner();
                require(['usualForms'], function (module) {
                    var fh = new module.formHelper(true);
                    var options = {
                        ID: self.ObjectID,
                        objClassID: 701,
                        fieldName: 'Call.DateOpened',
                        fieldFriendlyName: getTextResource('CallDateOpened'),
                        allowNull: false,
                        oldValue: self.UtcDateOpened.DateObj(),
                        onSave: function (newDate) {
                            self.UtcDateOpened.LocalDate(newDate ? parseDate(newDate) : '');
                            self.UtcDateOpened.DateObj(newDate ? new Date(parseInt(newDate)) : null);
                        }
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.dateEdit, options);
                });
            };
            //
            self.EditDateAccomplished = function () {
                if (self.CanEdit() == false || self.OperationGranted() == false)
                    return;
                showSpinner();
                require(['usualForms'], function (module) {
                    var fh = new module.formHelper(true);
                    var options = {
                        ID: self.ObjectID,
                        objClassID: 701,
                        fieldName: 'Call.DateAccomplished',
                        fieldFriendlyName: getTextResource('CallDateAccomplished'),
                        allowNull: false,
                        oldValue: self.UtcDateAccomplished.DateObj(),
                        onSave: function (newDate) {
                            self.UtcDateAccomplished.LocalDate(newDate ? parseDate(newDate) : '');
                            self.UtcDateAccomplished.DateObj(newDate ? new Date(parseInt(newDate)) : null);
                        }
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.dateEdit, options);
                });
            };
            //
            self.EditDateClosed = function () {
                if (self.CanEdit() == false || self.OperationGranted() == false)
                    return;
                showSpinner();
                require(['usualForms'], function (module) {
                    var fh = new module.formHelper(true);
                    var options = {
                        ID: self.ObjectID,
                        objClassID: 701,
                        fieldName: 'Call.DateClosed',
                        fieldFriendlyName: getTextResource('CallDateClosed'),
                        allowNull: false,
                        oldValue: self.UtcDateClosed.DateObj(),
                        onSave: function (newDate) {
                            self.UtcDateClosed.LocalDate(newDate ? parseDate(newDate) : '');
                            self.UtcDateClosed.DateObj(newDate ? new Date(parseInt(newDate)) : null);
                        }
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.dateEdit, options);
                });
            };
            //
            self.TopTabContent = ko.observable('167px');//отступ списка сверху
            self.CalculateTopPosition = function () {
                var top = $(region_selector).find('.tl-arrow-wrapper').outerHeight(true);
                top += $(region_selector).find('.tl-appointments-header').outerHeight(true);
                if (top == 0) {
                    setTimeout(self.CalculateTopPosition, 100);
                    return;
                }
                //
                self.TopTabContent(top + 'px');
            };
            //
            if (tabDim_object)
                tabDim_object.subscribe(function (newValue) {
                    self.CalculateTopPosition();
                });
        },
        ProblemTimeLine: function (obj, canEdit_object) {
            var self = this;
            self.OperationGranted = ko.observable(false);
            $.when(operationIsGrantedD(428)).done(function (result) {
                if (result == true)
                    self.OperationGranted(true);//OPERATION_Problem_PowerfullAccess
            });
            //
            self.CanEdit = ko.computed(function () {
                if (canEdit_object() == true && self.OperationGranted() == true)
                    return true;
                //
                return false;
            });
            //
            self.ObjectID = obj.ObjectID;
            self.UtcDateDetected = module.GetDateInfo(obj.DatesList, 'UtcDateDetected');
            self.UtcDateSolved = module.GetDateInfo(obj.DatesList, 'UtcDateSolved');
            self.UtcDatePromised = module.GetDateInfo(obj.DatesList, 'UtcDatePromised');
            self.UtcDateClosed = module.GetDateInfo(obj.DatesList, 'UtcDateClosed');
            self.UtcDateModified = module.GetDateInfo(obj.DatesList, 'UtcDateModified');
            //
            self.FieldNameForModify = ko.computed(function () {
                var dateArr = [self.UtcDateDetected.GetSimpleObj(), self.UtcDateSolved.GetSimpleObj(), self.UtcDateClosed.GetSimpleObj()];
                var retval = module.GetDateForModifyLocation(dateArr, self.UtcDateModified.DateObj());
                //
                if (retval == null)
                    return null;
                else return retval.FieldName;
            });
            //
            self.EditDateDetected = function () {
                if (self.CanEdit() == false || self.OperationGranted() == false)
                    return;
                showSpinner();
                require(['usualForms'], function (module) {
                    var fh = new module.formHelper(true);
                    var options = {
                        ID: self.ObjectID,
                        objClassID: 702,
                        fieldName: 'Problem.DateDetected',
                        fieldFriendlyName: getTextResource('ProblemDateDetected'),
                        allowNull: false,
                        oldValue: self.UtcDateDetected.DateObj(),
                        onSave: function (newDate) {
                            self.UtcDateDetected.LocalDate(newDate ? parseDate(newDate) : '');
                            self.UtcDateDetected.DateObj(newDate ? new Date(parseInt(newDate)) : null);
                        }
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.dateEdit, options);
                });
            };
            //
            self.EditDateSolved = function () {
                if (self.CanEdit() == false || self.OperationGranted() == false)
                    return;
                showSpinner();
                require(['usualForms'], function (module) {
                    var fh = new module.formHelper(true);
                    var options = {
                        ID: self.ObjectID,
                        objClassID: 702,
                        fieldName: 'Problem.DateSolved',
                        fieldFriendlyName: getTextResource('ProblemDateSolved'),
                        allowNull: false,
                        oldValue: self.UtcDateSolved.DateObj(),
                        onSave: function (newDate) {
                            self.UtcDateSolved.LocalDate(newDate ? parseDate(newDate) : '');
                            self.UtcDateSolved.DateObj(newDate ? new Date(parseInt(newDate)) : null);
                        }
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.dateEdit, options);
                });
            };
            //
            self.EditDateClosed = function () {
                if (self.CanEdit() == false || self.OperationGranted() == false)
                    return;
                showSpinner();
                require(['usualForms'], function (module) {
                    var fh = new module.formHelper(true);
                    var options = {
                        ID: self.ObjectID,
                        objClassID: 702,
                        fieldName: 'Problem.DateClosed',
                        fieldFriendlyName: getTextResource('ProblemDateClosed'),
                        allowNull: false,
                        oldValue: self.UtcDateClosed.DateObj(),
                        onSave: function (newDate) {
                            self.UtcDateClosed.LocalDate(newDate ? parseDate(newDate) : '');
                            self.UtcDateClosed.DateObj(newDate ? new Date(parseInt(newDate)) : null);
                        }
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.dateEdit, options);
                });
            };
        },
        RFCTimeLine: function (obj, canEdit_object) {
            var self = this;
            self.OperationGranted = ko.observable(false);
            $.when(operationIsGrantedD(703028)).done(function (result) {
                if (result == true)
                    self.OperationGranted(true);//OPERATION_RFC_PowerfullAccess
            });
            //
            self.CanEdit = ko.computed(function () {
                if (canEdit_object() == true && self.OperationGranted() == true)
                    return true;
                //
                return false;
            });
            //
            self.ObjectID = obj.ObjectID;
            self.UtcDateDetected = module.GetDateInfo(obj.DatesList, 'UtcDateDetected');
            self.UtcDateSolved = module.GetDateInfo(obj.DatesList, 'UtcDateSolved');
            self.UtcDatePromised = module.GetDateInfo(obj.DatesList, 'UtcDatePromised');
            self.UtcDateClosed = module.GetDateInfo(obj.DatesList, 'UtcDateClosed');
            self.UtcDateModified = module.GetDateInfo(obj.DatesList, 'UtcDateModified');
            self.UtcDateStarted = module.GetDateInfo(obj.DatesList, 'UtcDateStarted');
            //
            self.FieldNameForModify = ko.computed(function () {
                var dateArr = [self.UtcDateDetected.GetSimpleObj(), self.UtcDatePromised.GetSimpleObj(), self.UtcDateClosed.GetSimpleObj(),self.UtcDateStarted.GetSimpleObj()];
                var retval = module.GetDateForModifyLocation(dateArr, self.UtcDateModified.DateObj());
                //
                if (retval == null)
                    return null;
                else return retval.FieldName;
            });
            //
            self.EditDateDetected = function () {
                if (self.CanEdit() == false || self.OperationGranted() == false)
                    return;
                showSpinner();
                require(['usualForms'], function (module) {
                    var fh = new module.formHelper(true);
                    var options = {
                        ID: self.ObjectID,
                        objClassID: 703,
                        fieldName: 'RFC.DateDetected',
                        fieldFriendlyName: getTextResource('RFCDateDetected'),
                        allowNull: false,
                        oldValue: self.UtcDateDetected.DateObj(),
                        onSave: function (newDate) {
                            self.UtcDateDetected.LocalDate(newDate ? parseDate(newDate) : '');
                            self.UtcDateDetected.DateObj(newDate ? new Date(parseInt(newDate)) : null);
                        }
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.dateEdit, options);
                });
            };
            //
            self.EditDatePromised = function () {
                if (self.CanEdit() == false || self.OperationGranted() == false)
                    return;
                showSpinner();
                require(['usualForms'], function (module) {
                    var fh = new module.formHelper(true);
                    var options = {
                        ID: self.ObjectID,
                        objClassID: 703,
                        fieldName: 'RFC.DatePromised',
                        fieldFriendlyName: getTextResource('ProblemDatePromise'),
                        allowNull: false,
                        oldValue: self.UtcDatePromised.DateObj(),
                        onSave: function (newDate) {
                            self.UtcDatePromised.LocalDate(newDate ? parseDate(newDate) : '');
                            self.UtcDatePromised.DateObj(newDate ? new Date(parseInt(newDate)) : null);
                        }
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.dateEdit, options);
                });
            };
            //
            self.EditDateStarted = function () {
                if (self.CanEdit() == false || self.OperationGranted() == false)
                    return;
                showSpinner();
                require(['usualForms'], function (module) {
                    var fh = new module.formHelper(true);
                    var options = {
                        ID: self.ObjectID,
                        objClassID: 703,
                        fieldName: 'RFC.DateStarted',
                        fieldFriendlyName: getTextResource('WorkOrderDateStarted'),
                        allowNull: false,
                        oldValue: self.UtcDateStarted.DateObj(),
                        onSave: function (newDate) {
                            self.UtcDateStarted.LocalDate(newDate ? parseDate(newDate) : '');
                            self.UtcDateStarted.DateObj(newDate ? new Date(parseInt(newDate)) : null);
                        }
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.dateEdit, options);
                });
            };
            //
            self.EditDateClosed = function () {
                if (self.CanEdit() == false || self.OperationGranted() == false)
                    return;
                showSpinner();
                require(['usualForms'], function (module) {
                    var fh = new module.formHelper(true);
                    var options = {
                        ID: self.ObjectID,
                        objClassID: 703,
                        fieldName: 'RFC.DateClosed',
                        fieldFriendlyName: getTextResource('RFCDateClosed'),
                        allowNull: false,
                        oldValue: self.UtcDateClosed.DateObj(),
                        onSave: function (newDate) {
                            self.UtcDateClosed.LocalDate(newDate ? parseDate(newDate) : '');
                            self.UtcDateClosed.DateObj(newDate ? new Date(parseInt(newDate)) : null);
                        }
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.dateEdit, options);
                });
            };
        },
        WorkOrderTimeLine: function (obj, canEdit_object) {
            var self = this;
            self.OperationGranted = ko.observable(false);
            $.when(operationIsGrantedD(524)).done(function (result) {
                if (result == true)
                    self.OperationGranted(true);//OPERATION_WorkOrder_PowerfullAccess
            });
            //
            self.CanEdit = ko.computed(function () {
                if (canEdit_object() == true && self.OperationGranted() == true)
                    return true;
                //
                return false;
            });
            //
            self.ObjectID = obj.ObjectID;
            self.UtcDatePromised = module.GetDateInfo(obj.DatesList, 'UtcDatePromised');
            self.UtcDateAccomplished = module.GetDateInfo(obj.DatesList, 'UtcDateAccomplished');
            self.UtcDateModified = module.GetDateInfo(obj.DatesList, 'UtcDateModified');
            self.UtcDateCreated = module.GetDateInfo(obj.DatesList, 'UtcDateCreated');
            self.UtcDateAssigned = module.GetDateInfo(obj.DatesList, 'UtcDateAssigned');
            self.UtcDateAccepted = module.GetDateInfo(obj.DatesList, 'UtcDateAccepted');
            self.UtcDateStarted = module.GetDateInfo(obj.DatesList, 'UtcDateStarted');
            //
            self.FieldNameForModify = ko.computed(function () {
                var dateArr = [self.UtcDateCreated.GetSimpleObj(), self.UtcDateAssigned.GetSimpleObj(), self.UtcDateAccepted.GetSimpleObj(), self.UtcDateStarted.GetSimpleObj(), self.UtcDateAccomplished.GetSimpleObj()];
                var retval = module.GetDateForModifyLocation(dateArr, self.UtcDateModified.DateObj());
                //
                if (retval == null)
                    return null;
                else return retval.FieldName;
            });
            //
            self.EditDateAccomplished = function () {
                if (self.CanEdit() == false || self.OperationGranted() == false)
                    return;
                showSpinner();
                require(['usualForms'], function (module) {
                    var fh = new module.formHelper(true);
                    var options = {
                        ID: self.ObjectID,
                        objClassID: 119,
                        fieldName: 'WorkOrder.DateAccomplished',
                        fieldFriendlyName: getTextResource('WorkOrderDateAccomplished'),
                        allowNull: false,
                        oldValue: self.UtcDateAccomplished.DateObj(),
                        onSave: function (newDate) {
                            self.UtcDateAccomplished.LocalDate(newDate ? parseDate(newDate) : '');
                            self.UtcDateAccomplished.DateObj(newDate ? new Date(parseInt(newDate)) : null);
                        }
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.dateEdit, options);
                });
            };
            //
            self.EditDateCreated = function () {
                if (self.CanEdit() == false || self.OperationGranted() == false)
                    return;
                showSpinner();
                require(['usualForms'], function (module) {
                    var fh = new module.formHelper(true);
                    var options = {
                        ID: self.ObjectID,
                        objClassID: 119,
                        fieldName: 'WorkOrder.DateCreated',
                        fieldFriendlyName: getTextResource('WorkOrderDateCreated'),
                        allowNull: false,
                        oldValue: self.UtcDateCreated.DateObj(),
                        onSave: function (newDate) {
                            self.UtcDateCreated.LocalDate(newDate ? parseDate(newDate) : '');
                            self.UtcDateCreated.DateObj(newDate ? new Date(parseInt(newDate)) : null);
                        }
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.dateEdit, options);
                });
            };
            //
            self.EditDateAssigned = function () {
                if (self.CanEdit() == false || self.OperationGranted() == false)
                    return;
                showSpinner();
                require(['usualForms'], function (module) {
                    var fh = new module.formHelper(true);
                    var options = {
                        ID: self.ObjectID,
                        objClassID: 119,
                        fieldName: 'WorkOrder.DateAssigned',
                        fieldFriendlyName: getTextResource('WorkOrderDateAssigned'),
                        allowNull: false,
                        oldValue: self.UtcDateAssigned.DateObj(),
                        onSave: function (newDate) {
                            self.UtcDateAssigned.LocalDate(newDate ? parseDate(newDate) : '');
                            self.UtcDateAssigned.DateObj(newDate ? new Date(parseInt(newDate)) : null);
                        }
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.dateEdit, options);
                });
            };
            //
            self.EditDateAccepted = function () {
                if (self.CanEdit() == false || self.OperationGranted() == false)
                    return;
                showSpinner();
                require(['usualForms'], function (module) {
                    var fh = new module.formHelper(true);
                    var options = {
                        ID: self.ObjectID,
                        objClassID: 119,
                        fieldName: 'WorkOrder.DateAccepted',
                        fieldFriendlyName: getTextResource('WorkOrderDateAccepted'),
                        allowNull: false,
                        oldValue: self.UtcDateAccepted.DateObj(),
                        onSave: function (newDate) {
                            self.UtcDateAccepted.LocalDate(newDate ? parseDate(newDate) : '');
                            self.UtcDateAccepted.DateObj(newDate ? new Date(parseInt(newDate)) : null);
                        }
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.dateEdit, options);
                });
            };
            //
            self.EditDateStarted = function () {
                if (self.CanEdit() == false || self.OperationGranted() == false)
                    return;
                showSpinner();
                require(['usualForms'], function (module) {
                    var fh = new module.formHelper(true);
                    var options = {
                        ID: self.ObjectID,
                        objClassID: 119,
                        fieldName: 'WorkOrder.DateStarted',
                        fieldFriendlyName: getTextResource('WorkOrderDateStarted'),
                        allowNull: false,
                        oldValue: self.UtcDateStarted.DateObj(),
                        onSave: function (newDate) {
                            self.UtcDateStarted.LocalDate(newDate ? parseDate(newDate) : '');
                            self.UtcDateStarted.DateObj(newDate ? new Date(parseInt(newDate)) : null);
                        }
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.dateEdit, options);
                });
            };
        }
    };
    return module;
});