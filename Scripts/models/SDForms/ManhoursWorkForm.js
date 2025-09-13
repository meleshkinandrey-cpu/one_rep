define(['knockout', 'jquery', 'ajax', 'usualForms', 'models/SDForms/SDForm.User', 'models/SDForms/SDForm.ManhoursWorkList'], function (ko, $, ajaxLib, fhmodel, userLib, listWorkLib) {
    var module = {
        /* options list
        canEditOthersWork - можно редактировать чужую работу
        manhoursWorkShowMode - отображение трудозатрат длинными или нет
        linkObjectNumber - номер связанного объекта
        showLink - показывать блок связи
        canEditExecutor - разрешить редактировать блок "Исполнитель"
        onSave - обработчик после сохранения объекта
        */
        ViewModel: function (workObject, canEdit_object, $region, options) {
            var self = this;
            self.LoadD = $.Deferred();
            //
            self.$region = $region;
            self.Work = workObject;
            self.CanEdit = canEdit_object;
            self.OwnWork = ko.observable(true);//check on initialize
            self.EditOperationIsGranted = ko.observable(false);
            self.CanEditComputed = ko.computed(function () {
                if (self.CanEdit() == false || self.EditOperationIsGranted() == false)
                    return false;
                //
                if (self.OwnWork() || options.canEditOthersWork === true)
                    return true;
                else return false;
            });
            self.ManhoursWorkShowMode = ko.observable(options.manhoursWorkShowMode == null ? 1 : options.manhoursWorkShowMode); //BLL.Manhours.ManhoursShowMode
            self.ForseClose = undefined;//задается в формхелпере
            //
            //поля для редактирования, проинициализированы объектом
            if (self.Work != null && self.Work.ID)
                self.ID = ko.observable(self.Work.ID);
            else self.ID = ko.observable(null);
            //
            if (self.Work != null && self.Work.Number)
                self.Number = ko.observable(self.Work.Number);
            else self.Number = ko.observable(null);
            //
            if (self.Work != null && self.Work.Description)
                self.Description = ko.observable(self.Work.Description);
            else self.Description = ko.observable('');
            //
            if (self.Work != null && self.Work.ObjectID)
                self.ObjectID = ko.observable(self.Work.ObjectID);
            else self.ObjectID = ko.observable(null);
            //
            if (self.Work != null && self.Work.ObjectClassID)
                self.ObjectClassID = ko.observable(self.Work.ObjectClassID);
            else self.ObjectClassID = ko.observable(null);
            //
            if (self.Work != null && self.Work.ExecutorID)
                self.ExecutorID = ko.observable(self.Work.ExecutorID);
            else self.ExecutorID = ko.observable(null);
            if (self.Work != null && self.Work.ExecutorFullName)
                self.ExecutorFullName = ko.observable(self.Work.ExecutorFullName);
            else self.ExecutorFullName = ko.observable('');
            //
            if (self.Work != null && self.Work.InitiatorID)
                self.InitiatorID = ko.observable(self.Work.InitiatorID);
            else self.InitiatorID = ko.observable(null);
            if (self.Work != null && self.Work.InitiatorFullName)
                self.InitiatorFullName = ko.observable(self.Work.InitiatorFullName);
            else self.InitiatorFullName = ko.observable('');
            //
            if (self.Work != null && self.Work.UserActivityTypeID)
                self.UserActivityTypeID = ko.observable(self.Work.UserActivityTypeID);
            else self.UserActivityTypeID = ko.observable(null);
            if (self.Work != null && self.Work.UserActivityTypeName)
                self.UserActivityTypeName = ko.observable(self.Work.UserActivityTypeName);
            else self.UserActivityTypeName = ko.observable('');
            //
            self.ManhoursList = ko.observableArray([]);
            if (self.Work != null && self.Work.ManhoursList && self.Work.ManhoursList.length > 0) {
                ko.utils.arrayForEach(self.Work.ManhoursList, function (m) {
                    self.ManhoursList().push(new listWorkLib.Manhour({
                        ID: m.ID,
                        WorkID: m.WorkID,
                        Value: m.Value,
                        UtcDate: m.StartDate ? m.StartDate : m.UtcDate
                    }));
                });
                //
                self.ManhoursList.valueHasMutated();
            }
            self.SortedManhoursList = ko.computed(function () {
                return self.ManhoursList.slice().sort(function (l, r) {
                    return l.StartDate() == r.StartDate() ? 0 : (l.StartDate() < r.StartDate() ? -1 : 1);
                });
            });
            self.AllowManhoursOperations = ko.computed(function () {
                if (self.ID() && self.Number())
                    return true;
                else return false;
            });
            //
            self.LinkObjectNumber = ko.observable(options.linkObjectNumber ? options.linkObjectNumber : null);
            self.LinkObjectType = ko.computed(function () {
                var objClass = self.ObjectClassID();
                if (objClass == 701)
                    return getTextResource('Call');
                else if (objClass == 702)
                    return getTextResource('Problem');
                else if (objClass == 119)
                    return getTextResource('WorkOrder');
                else if (objClass == 371)
                    return getTextResource('Project');
                else return '';
            });
            self.ShowLinkBlock = ko.computed(function () {
                return options.showLink == true && self.ObjectID() != null && self.ObjectClassID() != null;
            });
            //конец полей
            //
            self.AfterRender = function () {
                $.when(self.Initialize()).done(function () {
                    self.LoadD.resolve();
                });
                $('.manhoursWorkForm-description input').focus();
            };
            //
            self.userActivitySearcher = null;
            self.userActivitySearcherD = $.Deferred();
            //
            self.Executor = ko.observable(new userLib.EmptyUser(self, userLib.UserTypes.executor));
            self.ExecutorLoaded = ko.observable(false);
            self.executorSearcher = null;
            self.executorSearcherD = $.Deferred();
            self.ExecutorInit = function (id, fullName) {
                var executorOptions = {
                    UserID: id,
                    UserType: userLib.UserTypes.workExecutor,
                    UserName: fullName,
                    EditAction: options.canEditExecutor === true ? function () {
                        if (!self.CanEditComputed())
                            return;
                        //
                        self.ExecutorLoaded(false);
                    } : null
                };
                self.ExecutorID(id);
                self.ExecutorFullName(fullName);
                self.Executor(new userLib.User(self, executorOptions));
                self.ExecutorLoaded(true);
            };
            self.ExecutorExpanded = ko.observable(false);
            self.ToggleExecutorContainer = function () {
                self.ExecutorExpanded(!self.ExecutorExpanded());
            };
            //
            self.Initiator = ko.observable(null);
            self.InitiatorLoaded = ko.observable(false);
            self.initiatorSearcher = null;
            self.initiatorSearcherD = $.Deferred();
            self.InitiatorInit = function (id, fullName) {
                var initiatorOptions = {
                    UserID: id,
                    UserType: userLib.UserTypes.workInitiator,
                    UserName: fullName,
                    EditAction: function () {
                        if (!self.CanEditComputed())
                            return;
                        //
                        self.InitiatorLoaded(false);
                    }
                };
                self.InitiatorID(id);
                self.InitiatorFullName(fullName);
                self.Initiator(new userLib.User(self, initiatorOptions));
                self.InitiatorLoaded(true);
            };
            //
            self.Initialize = function () {
                var initD = $.Deferred();
                //
                $(document).unbind('objectDeleted', self.onObjectModified);
                $(document).unbind('local_objectInserted', self.onObjectModified);
                $(document).unbind('local_objectUpdated', self.onObjectModified);
                $(document).unbind('local_objectDeleted', self.onObjectModified);
                //
                var fh = new fhmodel.formHelper();
                //
                //UserActivity
                if (self.userActivitySearcher != null)
                    self.userActivitySearcher.Remove();
                var userActivityD = fh.SetTextSearcherToField(
                    self.$region.find('.manhoursWorkForm-userActivity .text-input'),
                    'UserActivityTypeSearcher',
                    null,
                    null,
                    function (objectInfo) {//select
                        if (!self.CanEditComputed())
                            return;
                        //
                        self.UserActivityTypeName(objectInfo.FullName);
                        self.UserActivityTypeID(objectInfo.ID);
                        //                        
                    },
                    function () {//reset
                        if (!self.CanEditComputed())
                            return;
                        //
                        self.UserActivityTypeName('');
                        self.UserActivityTypeID(null);
                    });
                $.when(userActivityD).done(function (ctrl) {
                    self.userActivitySearcher = ctrl;
                    //
                    ctrl.LoadD.done(function () {
                        self.userActivitySearcherD.resolve(ctrl);
                    });
                });
                //
                //Executor
                if (self.ExecutorID()) {
                    self.ExecutorInit(self.ExecutorID(), self.ExecutorFullName());
                }
                if (self.executorSearcher != null)
                    self.executorSearcher.Remove();
                var executorD = fh.SetTextSearcherToField(
                    self.$region.find('.manhoursWorkForm-executor-block .text-input'),
                    'ExecutorUserSearcher',
                    null,
                    null,
                    function (objectInfo) {//select
                        if (!self.CanEditComputed())
                            return;
                        //
                        self.ExecutorInit(objectInfo.ID, objectInfo.FullName);
                    },
                    function () {//reset
                        if (!self.CanEditComputed())
                            return;
                        //
                        self.Executor(null);
                        self.ExecutorFullName('');
                        self.ExecutorID(null);
                    },
                    function (selectedItem) {//close
                        if (!self.CanEditComputed())
                            return;
                        //
                        if (!selectedItem) {
                            self.Executor(null);
                            self.ExecutorFullName('');
                            self.ExecutorID(null);
                        }
                    });
                $.when(executorD).done(function (ctrl) {
                    self.executorSearcher = ctrl;
                    //
                    ctrl.LoadD.done(function () {
                        self.executorSearcherD.resolve(ctrl);
                    });
                });
                //
                //Initiator
                if (self.InitiatorID()) {
                    self.InitiatorInit(self.InitiatorID(), self.InitiatorFullName());
                }
                if (self.initiatorSearcher != null)
                    self.initiatorSearcher.Remove();
                var initiatorD = fh.SetTextSearcherToField(
                    self.$region.find('.manhoursWorkForm-initiator-block .text-input'),
                    'WebUserSearcher',
                    null,
                    null,
                    function (objectInfo) {//select
                        if (!self.CanEditComputed())
                            return;
                        //
                        self.InitiatorInit(objectInfo.ID, objectInfo.FullName);
                    },
                    function () {//reset
                        if (!self.CanEditComputed())
                            return;
                        //
                        self.Initiator(null);
                        self.InitiatorFullName('');
                        self.InitiatorID(null);
                    },
                    function (selectedItem) {//close
                        if (!self.CanEditComputed())
                            return;
                        //
                        if (!selectedItem) {
                            self.Initiator(null);
                            self.InitiatorFullName('');
                            self.InitiatorID(null);
                        }
                    });
                $.when(initiatorD).done(function (ctrl) {
                    self.initiatorSearcher = ctrl;
                    //
                    ctrl.LoadD.done(function () {
                        self.initiatorSearcherD.resolve(ctrl);
                    });
                });
                //
                $.when(userD, operationIsGrantedD(self.Work == null || self.Work.ID == null ? 314 : 318), self.initiatorSearcherD, self.userActivitySearcherD, self.executorSearcherD).done(function (user, work_update) {
                    self.EditOperationIsGranted(work_update);
                    if (user.UserID != self.ExecutorID())
                        self.OwnWork(false);
                    //
                    $(document).unbind('objectDeleted', self.onObjectModified).bind('objectDeleted', self.onObjectModified);
                    $(document).unbind('local_objectInserted', self.onObjectModified).bind('local_objectInserted', self.onObjectModified);
                    $(document).unbind('local_objectUpdated', self.onObjectModified).bind('local_objectUpdated', self.onObjectModified);
                    $(document).unbind('local_objectDeleted', self.onObjectModified).bind('local_objectDeleted', self.onObjectModified);
                    //
                    initD.resolve(true);
                });
                //
                return initD.promise();
            };
            //
            self.TotalManhours = ko.computed(function () {
                var total = 0;
                ko.utils.arrayForEach(self.ManhoursList(), function (el) {
                    if (el.Value() != null)
                        total += parseInt(el.Value());
                });
                //
                if (total >= listWorkLib.ConstMaxSize)
                    total = listWorkLib.ConstMaxSize;
                else total = Math.round(total * 100) / 100;
                //
                return total;
            });
            self.TotalManhoursString = ko.computed(function () {
                var val = self.TotalManhours();
                if (val >= listWorkLib.ConstMaxSize)
                    return getLocaleHourMinString(val) + ' (' + getTextResource('ManhoursMaxValueLabel') + ')';
                else return getLocaleHourMinString(val);
            });
            //
            self.CheckValues = function (needRowAboutUnsaved) {
                var checkD = $.Deferred();
                var startMessage = needRowAboutUnsaved == true ? getTextResource('ManhoursWorkUnsavedText') + '\n' : '';
                //
                if (!self.ExecutorID()) {
                    require(['sweetAlert'], function () {

                        swal(getTextResource('ManhourWorkDataNotValidCaption'), startMessage + getTextResource('ManhourWorkExecutorEmpty'), 'warning');
                        checkD.resolve(false);
                    });
                    checkD.resolve(false);
                }
                else if (!self.ObjectID() && !self.Description()) {
                    require(['sweetAlert'], function () {
                        swal(getTextResource('ManhourWorkDataNotValidCaption'), startMessage + getTextResource('ManhourWorkLinkAndDescriptionEmpty'), 'warning');
                        checkD.resolve(false);
                    });
                    checkD.resolve(false);
                }
                else checkD.resolve(true);
                //
                return checkD.promise();
            };
            //
            self.ajaxControl_edit = new ajaxLib.control();
            self.Save = function () {
                var retD = $.Deferred();
                if (self.ID() && self.Number()) {
                        self.ajaxControl_edit.Ajax(self.$region,
                            {
                                dataType: 'json',
                                url: 'sdApi/EditManhoursWork',
                                method: 'POST',
                                data: {
                                    Operation: 0, //edit
                                    ID: self.ID(),
                                    ObjectID: self.ObjectID(),
                                    ObjectClassID: self.ObjectClassID(),
                                    ExecutorID: self.ExecutorID(),
                                    InitiatorID: self.InitiatorID(),
                                    UserActivityTypeID: self.UserActivityTypeID(),
                                    Description: self.Description(),
                                    Number: self.Number()
                                }
                            },
                        function (ans) {
                            if (ans) {
                                var response = ans.Response;
                                if (response) {
                                    var result = response.Result;
                                    if (result !== 0) {
                                        if (result == 1)
                                            swal(getTextResource('EditManhoursWorkCaption'), getTextResource('NullParamsError') + '\n[ManhoursWorkForm.js, Save]', 'error');
                                        else if (result == 2)
                                            swal(getTextResource('EditManhoursWorkCaption'), getTextResource('BadParamsError') + '\n[ManhoursWorkForm.js, Save]', 'error');
                                        else if (result == 3)
                                            swal(getTextResource('EditManhoursWorkCaption'), getTextResource('AccessError'), 'error');
                                        else if (result == 4)
                                            swal(getTextResource('EditManhoursWorkCaption'), getTextResource('GlobalError') + '\n[ManhoursWorkForm.js, Save]', 'error');
                                        else if (result == 5)
                                            swal(getTextResource('EditManhoursWorkCaption'), getTextResource('ConcurrencyErrorWithoutQuestion'), 'error');
                                        else if (result == 6) {
                                            swal(getTextResource('EditManhoursWorkCaption'), getTextResource('ObjectDeleted') + '\n' + getTextResource('WeNeedCloseForm'), 'error');
                                            //
                                            if (self.ForseClose != undefined) {
                                                self.ForseClose();
                                                $(document).trigger('local_objectDeleted', [18, self.ID(), self.ObjectID()]);
                                            }
                                        }
                                        else if (result == 7)
                                            swal(getTextResource('EditManhoursWorkCaption'), (response.Message ? response.Message : getTextResource('TM_ObjectInUse')), 'warning');
                                        else if (result == 8)
                                            swal(getTextResource('EditManhoursWorkCaption'), (response.Message ? response.Message : getTextResource('ValidationError')), 'warning');
                                        else
                                            swal(getTextResource('EditManhoursWorkCaption'), (response.Message ? response.Message : getTextResource('AjaxError')), 'error');
                                        //
                                        retD.resolve(null);
                                    }
                                    else {
                                        retD.resolve({
                                            ID: self.ID(),
                                            Number: self.Number(),
                                            Description: self.Description(),
                                            ObjectID: self.ObjectID(),
                                            ObjectClassID: self.ObjectClassID(),
                                            ExecutorID: self.ExecutorID(),
                                            ExecutorFullName: self.ExecutorFullName(),
                                            InitiatorID: self.InitiatorID(),
                                            InitiatorFullName: self.InitiatorFullName(),
                                            UserActivityTypeID: self.UserActivityTypeID(),
                                            UserActivityTypeName: self.UserActivityTypeName(),
                                            ManhoursList: ko.toJS(self.ManhoursList)
                                        });
                                    }
                                }
                            }
                            else {
                                swal(getTextResource('EditManhoursWorkCaption'), getTextResource('AjaxError') + '\n[ManhoursWorkForm.js, Save]', 'error');
                                retD.resolve(null);
                            }
                        });
                }
                else {
                        self.ajaxControl_edit.Ajax(self.$region,
                            {
                                dataType: 'json',
                                url: 'sdApi/EditManhoursWork',
                                method: 'POST',
                                data: {
                                    Operation: 1, //create
                                    ID: null,
                                    ObjectID: self.ObjectID(),
                                    ObjectClassID: self.ObjectClassID(),
                                    ExecutorID: self.ExecutorID(),
                                    InitiatorID: self.InitiatorID(),
                                    UserActivityTypeID: self.UserActivityTypeID(),
                                    Description: self.Description(),
                                    Number: null
                                }
                            },
                        function (ans) {
                            if (ans) {
                                var response = ans.Response;
                                if (response) {
                                    var result = response.Result;
                                    if (result !== 0) {
                                        if (result == 1)
                                            swal(getTextResource('EditManhoursWorkCaption'), getTextResource('NullParamsError') + '\n[ManhoursWorkForm.js, Save]', 'error');
                                        else if (result == 2)
                                            swal(getTextResource('EditManhoursWorkCaption'), getTextResource('BadParamsError') + '\n[ManhoursWorkForm.js, Save]', 'error');
                                        else if (result == 3)
                                            swal(getTextResource('EditManhoursWorkCaption'), getTextResource('AccessError'), 'error');
                                        else if (result == 4)
                                            swal(getTextResource('EditManhoursWorkCaption'), getTextResource('GlobalError') + '\n[ManhoursWorkForm.js, Save]', 'error');
                                        else if (result == 5)
                                            swal(getTextResource('EditManhoursWorkCaption'), getTextResource('ConcurrencyErrorWithoutQuestion'), 'error');
                                        else if (result == 6)
                                            swal(getTextResource('EditManhoursWorkCaption'), getTextResource('ObjectDeleted'), 'error');
                                        else if (result == 7)
                                            swal(getTextResource('EditManhoursWorkCaption'), (response.Message ? response.Message : getTextResource('TM_ObjectInUse')), 'warning');
                                        else if (result == 8)
                                            swal(getTextResource('EditManhoursWorkCaption'), (response.Message ? response.Message : getTextResource('ValidationError')), 'warning');
                                        else
                                            swal(getTextResource('EditManhoursWorkCaption'), (response.Message ? response.Message : getTextResource('AjaxError')), 'error');
                                        //
                                        retD.resolve(null);
                                    }
                                    else {
                                        self.ID(ans.ID);
                                        self.Number(ans.Number);
                                        //
                                        $.when(self.SaveManhoursList()).done(function () {
                                            retD.resolve({
                                                ID: self.ID(),
                                                Number: self.Number(),
                                                Description: self.Description(),
                                                ObjectID: self.ObjectID(),
                                                ObjectClassID: self.ObjectClassID(),
                                                ExecutorID: self.ExecutorID(),
                                                ExecutorFullName: self.ExecutorFullName(),
                                                InitiatorID: self.InitiatorID(),
                                                InitiatorFullName: self.InitiatorFullName(),
                                                UserActivityTypeID: self.UserActivityTypeID(),
                                                UserActivityTypeName: self.UserActivityTypeName(),
                                                ManhoursList: ko.toJS(self.ManhoursList)
                                            });
                                        });
                                    }
                                }
                            }
                            else {
                                swal(getTextResource('EditManhoursWorkCaption'), getTextResource('AjaxError') + '\n[ManhoursWorkForm.js, Save]', 'error');
                                retD.resolve(null);
                            }
                        });
                }
                //
                return retD.promise();
            };
            //
            self.AddManhour = function () {
                if (self.CanEditComputed()) {
                    $.when(self.CheckIfUnsaved()).done(function (result) {
                        if (result) {
                            var fh = new fhmodel.formHelper();
                                fh.ShowManhoursEditor(null, ko.toJS({ ObjectClassID: self.ObjectClassID, ObjectID: self.ObjectID, ID: self.ID }), function (newManhObj) {
                                    if (newManhObj) {
                                        $(document).trigger('local_objectInserted', [0, newManhObj.ID, newManhObj.WorkID]);
                                    }
                                });
                        }
                    });
                }
            };
            //
            self.ajaxControl_delete = new ajaxLib.control();
            self.DeleteManhour = function (manhObj) {
                if (self.CanEditComputed()) {
                    $.when(self.CheckIfUnsaved()).done(function (result) {
                        if (result) {
                            if (manhObj && manhObj.ID)
                                require(['sweetAlert'], function (swal) {
                                    swal({
                                        title: getTextResource('RemoveManhoursCaption') + " '" + manhObj.Value() + "'",
                                        text: getTextResource('RemoveManhoursQuestion'),
                                        showCancelButton: true,
                                        closeOnConfirm: false,
                                        closeOnCancel: true,
                                        confirmButtonText: getTextResource('ButtonOK'),
                                        cancelButtonText: getTextResource('ButtonCancel')
                                    },
                                    function (value) {
                                        if (value == true) {
                                            showSpinner();
                                            //
                                            $.when(userD).done(function (user) {
                                                self.ajaxControl_delete.Ajax(self.$region,
                                                    {
                                                        dataType: 'json',
                                                        url: 'sdApi/EditManhours',
                                                        method: 'POST',
                                                        data: {
                                                            Operation: 2, //remove
                                                            ID: manhObj.ID,
                                                            WorkID: manhObj.WorkID,
                                                            ObjectID: self.ObjectID(),
                                                            ObjectClassID: self.ObjectClassID(),
                                                            Value: manhObj.Value(),
                                                            UtcDateMilliseconds: null,
                                                            UtcDate: null
                                                        }
                                                    },
                                                    function (ans) {
                                                        if (ans) {
                                                            var response = ans.Response;
                                                            if (response) {
                                                                var result = response.Result;
                                                                if (result !== 0) {
                                                                    if (result == 1)
                                                                        swal(getTextResource('RemoveManhoursWorkCaption'), getTextResource('NullParamsError') + '\n[ManhoursWorkForm.js, DeleteManhour]', 'error');
                                                                    else if (result == 2)
                                                                        swal(getTextResource('RemoveManhoursWorkCaption'), getTextResource('BadParamsError') + '\n[ManhoursWorkForm.js, DeleteManhour]', 'error');
                                                                    else if (result == 3)
                                                                        swal(getTextResource('RemoveManhoursWorkCaption'), getTextResource('AccessError'), 'error');
                                                                    else if (result == 4)
                                                                        swal(getTextResource('RemoveManhoursWorkCaption'), getTextResource('GlobalError') + '\n[ManhoursWorkForm.js, DeleteManhour]', 'error');
                                                                    else if (result == 5)
                                                                        swal(getTextResource('RemoveManhoursWorkCaption'), getTextResource('ConcurrencyErrorWithoutQuestion'), 'error');
                                                                    else if (result == 6) {
                                                                        swal(getTextResource('RemoveManhoursWorkCaption'), getTextResource('ObjectDeleted'), 'error');
                                                                        $(document).trigger('local_objectDeleted', [0, manhObj.ID, manhObj.WorkID]);
                                                                    }
                                                                    else if (result == 7)
                                                                        swal(getTextResource('RemoveManhoursWorkCaption'), (response.Message ? response.Message : getTextResource('TM_ObjectInUse')), 'warning');
                                                                    else if (result == 8)
                                                                        swal(getTextResource('RemoveManhoursWorkCaption'), (response.Message ? response.Message : getTextResource('ValidationError')), 'warning');
                                                                    else
                                                                        swal(getTextResource('RemoveManhoursWorkCaption'), (response.Message ? response.Message : getTextResource('AjaxError')), 'error');
                                                                }
                                                                else {
                                                                    swal.close();
                                                                    $(document).trigger('local_objectDeleted', [0, manhObj.ID, manhObj.WorkID]);
                                                                }
                                                            }
                                                        }
                                                        else swal(getTextResource('RemoveManhoursWorkCaption'), getTextResource('AjaxError') + '\n[ManhoursWorkForm.js, DeleteManhour]', 'error');
                                                    },
                                            null,
                                            function () {
                                                hideSpinner();
                                            });
                                            });
                                        }
                                    });
                                });
                        }
                    });
                }
            };
            //
            self.EditManhour = function (manhObj) {
                if (self.CanEditComputed()) {
                    $.when(self.CheckIfUnsaved()).done(function (result) {
                        if (result) {
                            if (manhObj && manhObj.ID)
                                var fh = new fhmodel.formHelper();
                                    fh.ShowManhoursEditor(ko.toJS(manhObj), ko.toJS({ ObjectClassID: self.ObjectClassID, ObjectID: self.ObjectID, ID: self.ID }), function (newManhObj) {
                                        if (newManhObj) {
                                            $(document).trigger('local_objectUpdated', [0, newManhObj.ID, newManhObj.WorkID]);
                                        }
                                    });
                        }
                    });
                }
            };
            //
            self.SaveManhoursList = function () {
                var retvalD = $.Deferred();
                //                
                var saveManhourD = function (manhour) {
                    var retval = $.Deferred();
                    //                
                    var ajaxControl = new ajaxLib.control();
                    ajaxControl.Ajax(self.$region,
                            {
                                dataType: 'json',
                                url: 'sdApi/EditManhours',
                                method: 'POST',
                                data: {
                                    Operation: 1, //create
                                    ID: null,
                                    WorkID: self.ID(),
                                    ObjectID: self.ObjectID(),
                                    ObjectClassID: self.ObjectClassID(),
                                    Value: manhour.Value(),
                                    UtcDateMilliseconds: manhour.StartDate().getTime(),
                                    UtcDate: null
                                }
                            },
                        function (ans) {
                            if (ans) {
                                var response = ans.Response;
                                if (response) {
                                    var result = response.Result;
                                    if (result !== 0) {
                                        if (result == 1)
                                            swal(getTextResource('EditManhoursWorkCaption'), getTextResource('NullParamsError') + '\n[ManhoursWorkForm.js, SaveManhoursList]', 'error');
                                        else if (result == 2)
                                            swal(getTextResource('EditManhoursWorkCaption'), getTextResource('BadParamsError') + '\n[ManhoursWorkForm.js, SaveManhoursList]', 'error');
                                        else if (result == 3)
                                            swal(getTextResource('EditManhoursWorkCaption'), getTextResource('AccessError'), 'error');
                                        else if (result == 4)
                                            swal(getTextResource('EditManhoursWorkCaption'), getTextResource('GlobalError') + '\n[ManhoursWorkForm.js, SaveManhoursList]', 'error');
                                        else if (result == 5)
                                            swal(getTextResource('EditManhoursWorkCaption'), getTextResource('ConcurrencyErrorWithoutQuestion'), 'error');
                                        else if (result == 6)
                                            swal(getTextResource('EditManhoursWorkCaption'), getTextResource('ObjectDeleted'), 'error');
                                        else if (result == 7)
                                            swal(getTextResource('EditManhoursWorkCaption'), (response.Message ? response.Message : getTextResource('TM_ObjectInUse')), 'warning');
                                        else if (result == 8)
                                            swal(getTextResource('EditManhoursWorkCaption'), (response.Message ? response.Message : getTextResource('ValidationError')), 'warning');
                                        else
                                            swal(getTextResource('EditManhoursWorkCaption'), (response.Message ? response.Message : getTextResource('AjaxError')), 'error');
                                        //
                                        retval.resolve(false);
                                        return;
                                    }
                                    //
                                    manhour.ID = ans.ID;
                                    manhour.WorkID = self.ID();
                                    $(document).trigger('local_objectInserted', [0, manhour.ID, manhour.WorkID]);
                                    retval.resolve(true);
                                }
                                else
                                    retval.resolve(false);
                            }
                            else {
                                swal(getTextResource('EditManhoursWorkCaption'), getTextResource('AjaxError') + '\n[ManhoursWorkForm.js, SaveManhoursList]', 'error');
                                retval.resolve(false);
                            }
                        });
                    //
                    return retval.promise();
                };
                //
                var list = [];
                for (var i = 0; i < self.ManhoursList().length; i++) {
                    var manhour = self.ManhoursList()[i];
                    list.push(manhour);
                }
                //
                var process = null;
                process = function () {//recursive save by deferred
                    var item = list.pop();
                    if (item != undefined) {
                        var d = saveManhourD(item);
                        $.when(d).done(function (res) {
                            if (res == false) {
                                retvalD.resolve(false);
                                return;
                            }
                            //
                            process();
                        });
                    }
                    else
                        retvalD.resolve(true);
                };
                process();
                //
                return retvalD.promise();
            };
            //
            self.CheckIfUnsaved = function () {
                var retD = $.Deferred();
                //
                if (!self.AllowManhoursOperations()) {
                    $.when(self.CheckValues(true)).done(function (result) {
                        if (result) {
                            $.when(self.Save()).done(function (newObject) {
                                if (newObject && options.onSave) {
                                    options.onSave(newObject);
                                }
                                //
                                retD.resolve(newObject !== null);
                            });
                        }
                        else {
                            retD.resolve(false);
                        }
                    });
                }
                else retD.resolve(true);
                //
                return retD.promise();
            };
            //
            self.ShowObjectForm = function () {
                require(['sdForms'], function (sfhModule) {
                    var fh = new sfhModule.formHelper();
                    fh.ShowObjectForm(self.ObjectClassID(), self.ObjectID());
                });
            };
            //
            self.Unload = function () {
                $(document).unbind('objectDeleted', self.onObjectModified);
                $(document).unbind('local_objectInserted', self.onObjectModified);
                $(document).unbind('local_objectUpdated', self.onObjectModified);
                $(document).unbind('local_objectDeleted', self.onObjectModified);
            };
            self.ajaxControl_load = new ajaxLib.control();
            self.onSaveManhour = function (objectID) {
                var param = {
                    'ID': objectID
                };
                self.ajaxControl_load.Ajax(self.$region,
                    {
                        url: 'sdApi/GetManhour?' + $.param(param),
                        method: 'GET',
                        dataType: "json"
                    }, function (response) {
                        if (response && response.Result == 0 && response.Manhour) {
                            self.ManhoursList.remove(function (el) {
                                return el.ID == objectID;
                            });
                            self.ManhoursList().push(new listWorkLib.Manhour(response.Manhour));
                            self.ManhoursList.valueHasMutated();
                        }
                    });
            };
            self.onObjectModified = function (e, objectClassID, objectID, parentObjectID) {//ловим всё
                if (objectClassID == 18) {//OBJ_ManhoursWork
                    if (self.ID() && self.ID() == objectID) {
                        if (e.type == 'objectDeleted' && self.CanEditComputed()) {
                            swal(getTextResource('ManhoursWorkWasDeleted'), getTextResource('WeNeedCloseForm'), 'info');
                            //
                            if (self.ForseClose != undefined)
                                self.ForseClose();
                        }
                    }
                }
                //
                if (objectClassID == 0) {
                    if (self.ID() && parentObjectID == self.ID()) {
                        if (e.type == 'local_objectInserted' || e.type == 'local_objectUpdated')
                            self.onSaveManhour(objectID);
                        else if (e.type == 'objectDeleted' || e.type == 'local_objectDeleted') {
                            self.ManhoursList.remove(function (el) {
                                return el.ID == objectID;
                            });
                            //
                            if (e.type == 'objectDeleted') {
                                swal(getTextResource('ManhoursWasDeleted'), '', 'info');
                            }
                            //
                            self.ManhoursList.valueHasMutated();
                        }
                    }
                }
            };
        }
    }
    return module;
});