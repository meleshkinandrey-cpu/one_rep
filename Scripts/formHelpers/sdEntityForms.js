define(['jquery', 'knockout', 'formControl', 'usualForms'], function ($, ko, fc, ufh) {
    var module = {
        formHelper: function (isSpinnerActive) {
            var self = this;
            //
            //Режимы открытия форм
            self.Mode = {
                Default: 0,//режим по умолчанию, форма откоется на главной вкладке
                ReadOnly: 1,//только чтение
                ClientMode: 2,//режим клиента вместо инженера
                SetGrade: 4,//режим установки оценки заяки
                TabNegotiation: 8,//вкладка согласования
                ForceEngineer: 16//открыть инженерную приоритетно
            };
            //Форма просмотра заявки (универсальный вызов, режим определяется автоматом)
            //ИД заявки, дополнительные параметры
            self.ShowCallByContext = function (id, params) {
                $.when(userD).done(function (user) {
                    var mode = self.Mode.Default;
                    if (params && params.mode && isNaN(parseInt(params.mode)) == false)
                        mode |= params.mode;
                    //
                    if (params && params.NegotiationID)
                        mode |= self.Mode.TabNegotiation;
                    //
                    var useView = params ? (params.useView != false) : true;
                    if (user.ViewNameSD == 'ClientCallForTable' && useView) {//список заявок клиента
                        mode |= self.Mode.ClientMode;
                        self.ShowCall(id, mode, params);
                    }
                    else if (user.ViewNameSD == 'NegotiationForTable' && useView) {//список объектов, где я среди согласующих
                        mode |= self.Mode.TabNegotiation;
                        if (user.HasRoles == false)
                            mode |= self.Mode.ReadOnly;
                        self.ShowCall(id, mode, params);
                    }
                    else if (user.HasRoles == false) {//нет ролей
                        mode |= self.Mode.ClientMode;
                        self.ShowCall(id, mode);
                    }
                    else//есть роли
                        $.when(operationIsGrantedD(518)).done(function (result) {//OPERATION_CALL_Properties - есть отрыть свойства
                            if (result == false)
                                mode |= self.Mode.ClientMode;
                            self.ShowCall(id, mode, params);
                        });
                });
            };
            //Форма просмотра заявки клиентом / инженером
            //ИД заявки, режим формы, дополнительные параметры для определенных представлений (простановка оценки - newGrade)
            self.ShowCall = function (id, mode, params) {
                var isReadOnly = (mode & self.Mode.ReadOnly) == self.Mode.ReadOnly;
                var isClientMode = (mode & self.Mode.ClientMode) == self.Mode.ClientMode;
                var isSetGradeMode = (mode & self.Mode.SetGrade) == self.Mode.SetGrade;
                var tabNegotiation = (mode & self.Mode.TabNegotiation) == self.Mode.TabNegotiation;
                if (isSpinnerActive != true)
                    showSpinner();
                //
                $.when(userD, operationIsGrantedD(313)).done(function (user, call_update) { //OPERATION_Call_Update
                    var buttons = {}
                    var forceClose = false;
                    var ctrl = undefined;
                    //buttons[getTextResource('Close')] = function () { ctrl.Close(); }
                    //
                    ctrl = new fc.control('callForm', 'callForm', getTextResource('Call'), true, true, true, 710, 520, buttons, null, 'data-bind="template: {name: \'SDForms/CallForm\', afterRender: AfterRender}"');
                    if (!ctrl.Initialized) {
                        hideSpinner();
                        //
                        var wnd = window.open(window.location.protocol + '//' + window.location.host + location.pathname + '?callID=' + id);
                        if (wnd) //browser cancel it?  
                            return;
                        //
                        require(['sweetAlert'], function () {
                            swal(getTextResource('OpenError'), getTextResource('CantDuplicateForm'), 'warning');
                        });
                        return;
                    }
                    //
                    var ctrlD = ctrl.Show();
                    ctrl.ExtendSize(1000, 800);
                    //
                    require(['models/SDForms/CallForm'], function (vm) {
                        var region = $('#' + ctrl.GetRegionID());
                        var mod = new vm.ViewModel(isReadOnly || (call_update != true && user.HasRoles == true && isClientMode == false), isClientMode, region, id);
                        mod.CurrentUserID = user.UserID;
                        var oldSizeChanged = ctrl.SizeChanged;
                        ctrl.SizeChanged = function () {
                            oldSizeChanged();
                            mod.SizeChanged();
                        };
                        ctrl.BeforeClose = function () {
                            var retval = forceClose;
                            //
                            if (retval == false) {
                                if (mod.attachmentsControl == null || mod.attachmentsControl != null && mod.attachmentsControl.IsAllFilesUploaded())
                                    retval = true;//все файлы загружены на сервер
                                else
                                    require(['sweetAlert'], function () {
                                        swal({
                                            title: getTextResource('UploadedFileNotFoundAtServerSide'),
                                            text: getTextResource('FormClosingQuestion'),
                                            showCancelButton: true,
                                            closeOnConfirm: true,
                                            closeOnCancel: true,
                                            confirmButtonText : getTextResource('ButtonOK'),
                                            cancelButtonText: getTextResource('ButtonCancel')
                                        },
                                        function (value) {
                                            if (value == true) {
                                                forceClose = true;
                                                setTimeout(function () {
                                                    ctrl.Close();
                                                }, 300);//TODO? close event of swal
                                            }
                                        });
                                    });
                            }
                            //
                            if (retval)
                                mod.Unload();
                            return retval;
                        };
                        //
                        mod.CloseForm = function () {
                            ctrl.BeforeClose = null;
                            ctrl.Close();
                        };
                        mod.ControlForm = ctrl;
                        var loadD = mod.Load(id);
                        //
                        ko.applyBindings(mod, document.getElementById(ctrl.GetRegionID()));
                        $.when(ctrlD, loadD).done(function (frm, loadResult) {
                            if (loadResult == false) {//force close
                                ctrl.BeforeClose = null;
                                ctrl.Close();
                            }
                            else {
                                if (!ko.components.isRegistered('callFormCaptionComponent'))
                                    ko.components.register('callFormCaptionComponent', {
                                        template: '<span class="color-point" style="margin-right:5px;" data-bind="style: { background: $priorityColor}" /><span data-bind="text: $captionText"/>'
                                    });
                                ctrl.BindCaption(mod, "component: {name: 'callFormCaptionComponent', params: { $priorityColor: $data.call().PriorityColor, $captionText: getTextResource(\'Call\') + ($data.call() != null ? (\' №\' + $data.call().Number() + \' \' + $data.call().CallSummaryName()) : \'\')} }");
                                //
                                if (mod.mode && mod.modes) {
                                    mod.negotiationID = params ? params.NegotiationID : null;
                                    mod.mode(tabNegotiation == true ? mod.modes.negotiation : mod.modes.main);
                                }
                                //
                                if (isSetGradeMode == true && params) {
                                    $.when(mod.$isLoaded, mod.CreateGrade()).done(function () {
                                        var newGrade = params.newGrade;
                                        var gradeObj = ko.utils.arrayFirst(mod.GradeArray(), function (el) {
                                            return el.Name == newGrade;
                                        });
                                        if (gradeObj != null) {
                                            $.when(mod.SetGrade(gradeObj, null, true)).done(function (result) {
                                                require(['sweetAlert'], function () {
                                                    swal(getTextResource('ThanksForSetGrade'), '', 'success');
                                                });
                                            });
                                        }
                                        else require(['sweetAlert'], function () {
                                            swal(getTextResource('SaveError'), getTextResource('CantSetGrade'), 'error');
                                        });
                                    });
                                }
                                //
                                if (mod.mainTabLoaded)
                                    mod.mainTabLoaded(true);
                            }
                            hideSpinner();
                        });
                    });
                });
            };
            //
            //Форма просмотра задания
            //ИД задания, режим формы
            self.ShowWorkOrder = function (id, mode, params) {
                var isReadOnly = (mode & self.Mode.ReadOnly) == self.Mode.ReadOnly;
                var tabNegotiation = (mode & self.Mode.TabNegotiation) == self.Mode.TabNegotiation;
                if (isSpinnerActive != true)
                    showSpinner();
                //
                $.when(userD, operationIsGrantedD(333)).done(function (user, workOrder_update) {
                    if (user.HasRoles == false || workOrder_update == false)
                        isReadOnly = true;
                    //
                    var buttons = {}
                    var forceClose = false;
                    var ctrl = undefined;
                    //buttons[getTextResource('Close')] = function () { ctrl.Close(); }
                    //
                    ctrl = new fc.control('workOrderForm', 'workOrderForm', getTextResource('WorkOrder'), true, true, true, 710, 500, buttons, null, 'data-bind="template: {name: \'SDForms/WorkOrderForm\', afterRender: AfterRender}"');
                    if (!ctrl.Initialized) {
                        hideSpinner();
                        //
                        var wnd = window.open(window.location.protocol + '//' + window.location.host + location.pathname + '?workOrderID=' + id);
                        if (wnd) //browser cancel it?  
                            return;
                        //
                        require(['sweetAlert'], function () {
                            swal(getTextResource('OpenError'), getTextResource('CantDuplicateForm'), 'warning');
                        });
                        return;
                    }
                    //
                    var ctrlD = ctrl.Show();
                    ctrl.ExtendSize(1000, 800);
                    //
                    require(['models/SDForms/WorkOrderForm'], function (vm) {
                        var region = $('#' + ctrl.GetRegionID());
                        var mod = new vm.ViewModel(isReadOnly, region, id);
                        var oldSizeChanged = ctrl.SizeChanged;
                        ctrl.SizeChanged = function () {
                            oldSizeChanged();
                            mod.SizeChanged();
                        };
                        ctrl.BeforeClose = function () {
                            var retval = forceClose;
                            //
                            if (retval == false) {
                                if (mod.attachmentsControl == null || mod.attachmentsControl != null && mod.attachmentsControl.IsAllFilesUploaded())
                                    retval = true;//все файлы загружены на сервер
                                else
                                    require(['sweetAlert'], function () {
                                        swal({
                                            title: getTextResource('UploadedFileNotFoundAtServerSide'),
                                            text: getTextResource('FormClosingQuestion'),
                                            showCancelButton: true,
                                            closeOnConfirm: true,
                                            closeOnCancel: true,
                                            confirmButtonText: getTextResource('ButtonOK'),
                                            cancelButtonText: getTextResource('ButtonCancel')
                                        },
                                        function (value) {
                                            if (value == true) {
                                                forceClose = true;
                                                setTimeout(function () {
                                                    ctrl.Close();
                                                }, 300);//TODO? close event of swal
                                            }
                                        });
                                    });
                            }
                            //
                            if (retval)
                                mod.Unload();
                            return retval;
                        };
                        //
                        mod.CloseForm = function () {
                            ctrl.BeforeClose = null;
                            ctrl.Close();
                        };
                        mod.ControlForm = ctrl;
                        var loadD = mod.Load(id);
                        //
                        ko.applyBindings(mod, document.getElementById(ctrl.GetRegionID()));
                        $.when(ctrlD, loadD).done(function (frm, loadResult) {
                            if (loadResult == false) {//force close
                                ctrl.BeforeClose = null;
                                ctrl.Close();
                            }
                            else {
                                if (!ko.components.isRegistered('workOrderFormCaptionComponent'))
                                    ko.components.register('workOrderFormCaptionComponent', {
                                        template: '<span class="color-point" style="margin-right:5px;" data-bind="style: { background: $priorityColor}" /><span data-bind="text: $captionText"/>'
                                    });
                                ctrl.BindCaption(mod, "component: {name: 'workOrderFormCaptionComponent', params: { $priorityColor: $data.workOrder().PriorityColor, $captionText: getTextResource(\'WorkOrder\') + ($data.workOrder() != null ? (\' №\' + $data.workOrder().Number() + \' \' + $data.workOrder().Name()) : \'\')} }");
                                //
                                if (mod.mode && mod.modes) {
                                    mod.negotiationID = params ? params.NegotiationID : null;
                                    mod.mode(tabNegotiation == true ? mod.modes.negotiation : mod.modes.main);
                                }
                                //
                                if (mod.mainTabLoaded)
                                    mod.mainTabLoaded(true);
                            }
                            hideSpinner();
                        });
                    });
                });
            };
            //
            //Форма просмотра проблемы
            //ИД проблемы, режим формы
            self.ShowProblem = function (id, mode, params) {
                var isReadOnly = (mode & self.Mode.ReadOnly) == self.Mode.ReadOnly;
                var tabNegotiation = (mode & self.Mode.TabNegotiation) == self.Mode.TabNegotiation;
                if (isSpinnerActive != true)
                    showSpinner();
                //
                $.when(userD, operationIsGrantedD(323)).done(function (user, problem_update) {
                    if (user.HasRoles == false || problem_update == false)
                        isReadOnly = true;
                    //
                    var buttons = {}
                    var forceClose = false;
                    var ctrl = undefined;
                    //buttons[getTextResource('Close')] = function () { ctrl.Close(); }
                    //
                    ctrl = new fc.control('problemForm', 'problemForm', getTextResource('Problem'), true, true, true, 710, 500, buttons, null, 'data-bind="template: {name: \'SDForms/ProblemForm\', afterRender: AfterRender}"');
                    if (!ctrl.Initialized) {
                        hideSpinner();
                        //
                        var wnd = window.open(window.location.protocol + '//' + window.location.host + location.pathname + '?problemID=' + id);
                        if (wnd) //browser cancel it?  
                            return;
                        //
                        require(['sweetAlert'], function () {
                            swal(getTextResource('OpenError'), getTextResource('CantDuplicateForm'), 'warning');
                        });
                        return;
                    }
                    //
                    var ctrlD = ctrl.Show();
                    ctrl.ExtendSize(1000, 800);
                    //
                    require(['models/SDForms/ProblemForm'], function (vm) {
                        var region = $('#' + ctrl.GetRegionID());
                        var mod = new vm.ViewModel(isReadOnly, region, id);
                        var oldSizeChanged = ctrl.SizeChanged;
                        ctrl.SizeChanged = function () {
                            oldSizeChanged();
                            mod.SizeChanged();
                        };
                        ctrl.BeforeClose = function () {
                            var retval = forceClose;
                            //
                            if (retval == false) {
                                if (mod.attachmentsControl == null || mod.attachmentsControl != null && mod.attachmentsControl.IsAllFilesUploaded())
                                    retval = true;//все файлы загружены на сервер
                                else
                                    require(['sweetAlert'], function () {
                                        swal({
                                            title: getTextResource('UploadedFileNotFoundAtServerSide'),
                                            text: getTextResource('FormClosingQuestion'),
                                            showCancelButton: true,
                                            closeOnConfirm: true,
                                            closeOnCancel: true,
                                            confirmButtonText: getTextResource('ButtonOK'),
                                            cancelButtonText: getTextResource('ButtonCancel')
                                        },
                                        function (value) {
                                            if (value == true) {
                                                forceClose = true;
                                                setTimeout(function () {
                                                    ctrl.Close();
                                                }, 300);//TODO? close event of swal
                                            }
                                        });
                                    });
                            }
                            //
                            if (retval)
                                mod.Unload();
                            return retval;
                        };
                        //
                        mod.CloseForm = function () {
                            ctrl.BeforeClose = null;
                            ctrl.Close();
                        };
                        mod.ControlForm = ctrl;
                        var loadD = mod.Load(id);
                        //
                        ko.applyBindings(mod, document.getElementById(ctrl.GetRegionID()));
                        $.when(ctrlD, loadD).done(function (frm, loadResult) {
                            if (loadResult == false) {//force close
                                ctrl.BeforeClose = null;
                                ctrl.Close();
                            }
                            else {
                                if (!ko.components.isRegistered('problemFormCaptionComponent'))
                                    ko.components.register('problemFormCaptionComponent', {
                                        template: '<span class="color-point" style="margin-right:5px;" data-bind="style: { background: $priorityColor}" /><span data-bind="text: $captionText"/>'
                                    });
                                ctrl.BindCaption(mod, "component: {name: 'problemFormCaptionComponent', params: { $priorityColor: $data.problem().PriorityColor, $captionText: getTextResource(\'Problem\') + ($data.problem() != null ? (\' №\' + $data.problem().Number() + \' \' + $data.problem().Summary()) : \'\')} }");
                                //
                                if (mod.mode && mod.modes) {
                                    mod.negotiationID = params ? params.NegotiationID : null;
                                    mod.mode(tabNegotiation == true ? mod.modes.negotiation : mod.modes.main);
                                }
                                //
                                if (mod.mainTabLoaded)
                                    mod.mainTabLoaded(true);
                            }
                            hideSpinner();
                        });
                    });
                });
            };
            //
            //Форма проекта
            self.ShowProject = function (id) {
                if (isSpinnerActive != true)
                    showSpinner();
                $.when(operationIsGrantedD(789)).done(function (project_update) {
                    var ctrl = undefined;
                    var mod = null;
                    ctrl = new fc.control('projectForm', 'projectForm', getTextResource('Project'), true, true, true, 800, 600, null, null, 'data-bind="template: {name: \'TimeManagement/ProjectForm\', afterRender: AfterRender}"');
                    if (!ctrl.Initialized)
                        return;
                    var ctrlD = ctrl.Show();
                    //
                    require(['models/TimeManagement/ProjectForm'], function (vm) {
                        var region = $('#' + ctrl.GetRegionID());
                        mod = new vm.ViewModel(!project_update, region, id);
                        mod.CloseForm = function () {
                            ctrl.BeforeClose = null;
                            ctrl.Close();
                        };

                        $.when(ctrlD, mod.Load(id)).done(function () {
                            ko.applyBindings(mod, document.getElementById(ctrl.GetRegionID()));
                            if (!ko.components.isRegistered('projectFormCaptionComponent'))
                                ko.components.register('projectFormCaptionComponent', {
                                    template: '<span data-bind="text: $captionText"/>'
                                });
                            ctrl.BindCaption(mod, "component: {name: 'projectFormCaptionComponent', params: {  $captionText: getTextResource(\'Project\') + (\' №\' + $data.project().Number() )} }");
                            hideSpinner();
                        });
                    });
                });
            };
            //
            //Форма просмотра RFC
            //ИД RFC, режим формы
            self.ShowRFC = function (id, mode, params) {
                var isReadOnly = (mode & self.Mode.ReadOnly) == self.Mode.ReadOnly;
                if (isSpinnerActive != true)
                    showSpinner();
                //
                $.when(userD, operationIsGrantedD(386)).done(function (user, rfc_update) {
                    if (user.HasRoles == false || rfc_update == false)
                        isReadOnly = true;
                    //
                    var buttons = {}
                    var forceClose = false;
                    var ctrl = undefined;
                    //buttons[getTextResource('Close')] = function () { ctrl.Close(); }
                    //
                    ctrl = new fc.control('rfcForm', 'rfcForm', getTextResource('RFC'), true, true, true, 710, 500, buttons, null, 'data-bind="template: {name: \'SDForms/RFCForm\', afterRender: AfterRender}"');
                    if (!ctrl.Initialized) {
                        hideSpinner();
                        //
                        var wnd = window.open(window.location.protocol + '//' + window.location.host + location.pathname + '?rfcID=' + id);
                        if (wnd) //browser cancel it?  
                            return;
                        //
                        require(['sweetAlert'], function () {
                            swal(getTextResource('OpenError'), getTextResource('CantDuplicateForm'), 'warning');
                        });
                        return;
                    }
                    //
                    var ctrlD = ctrl.Show();
                    ctrl.ExtendSize(1000, 800);
                    //
                    require(['models/SDForms/RFCForm'], function (vm) {
                        var region = $('#' + ctrl.GetRegionID());
                        var mod = new vm.ViewModel(isReadOnly, region, id);
                        var oldSizeChanged = ctrl.SizeChanged;
                        ctrl.SizeChanged = function () {
                            oldSizeChanged();
                            mod.SizeChanged();
                        };
                        ctrl.BeforeClose = function () {
                            var retval = forceClose;
                            //
                            if (retval == false) {
                                if (mod.attachmentsControl == null || mod.attachmentsControl != null && mod.attachmentsControl.IsAllFilesUploaded())
                                    retval = true;//все файлы загружены на сервер
                                else
                                    require(['sweetAlert'], function () {
                                        swal({
                                            title: getTextResource('UploadedFileNotFoundAtServerSide'),
                                            text: getTextResource('FormClosingQuestion'),
                                            showCancelButton: true,
                                            closeOnConfirm: true,
                                            closeOnCancel: true,
                                            confirmButtonText: getTextResource('ButtonOK'),
                                            cancelButtonText: getTextResource('ButtonCancel')
                                        },
                                            function (value) {
                                                if (value == true) {
                                                    forceClose = true;
                                                    setTimeout(function () {
                                                        ctrl.Close();
                                                    }, 300);//TODO? close event of swal
                                                }
                                            });
                                    });
                            }
                            //
                            if (retval)
                                mod.Unload();
                            return retval;
                        };
                        //
                        mod.CloseForm = function () {
                            ctrl.BeforeClose = null;
                            ctrl.Close();
                        };
                        mod.ControlForm = ctrl;
                        var loadD = mod.Load(id);
                        //
                        ko.applyBindings(mod, document.getElementById(ctrl.GetRegionID()));
                        $.when(ctrlD, loadD).done(function (frm, loadResult) {
                            if (loadResult == false) {//force close
                                ctrl.BeforeClose = null;
                                ctrl.Close();
                            }
                            else {
                                if (!ko.components.isRegistered('rfcFormCaptionComponent'))
                                    ko.components.register('rfcFormCaptionComponent', {
                                        template: '<span class="color-point" style="margin-right:5px;" data-bind="style: { background: $priorityColor}" /><span data-bind="text: $captionText"/>'
                                    });
                                ctrl.BindCaption(mod, "component: {name: 'rfcFormCaptionComponent', params: { $priorityColor: $data.RFC().PriorityColor, $captionText: getTextResource(\'RFC\') + ($data.RFC() != null ? (\' №\' + $data.RFC().Number() + \' \' + $data.RFC().Summary()) : \'\')} }");
                                //
                                if (mod.mode && mod.modes) {
                                    mod.mode(mod.modes.main);
                                }
                                //
                                if (mod.mainTabLoaded)
                                    mod.mainTabLoaded(true);
                            }
                            hideSpinner();
                        });
                    });
                });
            };
            //
            //
            //общий метод открытия карточки объекта
            self.ShowObjectForm = function (objectClassID, objectID, formMode, params) {
                if (formMode == undefined || formMode == null)
                    formMode = self.Mode.Default;
                //
                if (formMode == self.Mode.ForceEngineer && objectClassID == 701)//IMSystem.Global.OBJ_CALL
                    self.ShowCallByContext(objectID, { useView: false });
                    //
                else if (objectClassID == 701) //IMSystem.Global.OBJ_CALL
                    self.ShowCallByContext(objectID, params);
                else if (objectClassID == 119) //IMSystem.Global.OBJ_WORKORDER
                    self.ShowWorkOrder(objectID, formMode, params);
                else if (objectClassID == 702) //IMSystem.Global.OBJ_PROBLEM
                    self.ShowProblem(objectID, formMode, params);
                else if (objectClassID == 703) //IMSystem.Global.OBJ_PROBLEM
                    self.ShowRFC(objectID, formMode, params);
                else if (objectClassID == 137) //IMSystem.Global.OBJ_KBArticle
                {
                    var fh = new ufh.formHelper(isSpinnerActive);
                    fh.ShowKBAView(objectID);
                }
                else if (objectClassID == 371) //IMSystem.Global.OBJ_Project
                    self.ShowProject(objectID);
            };
            //
            //вызов формы выбора пользователя
            self.ShowUserSearchForm = function (userInfo, onSelected) {
                require(['ui_forms/User/frmUserSearch'], function (jsModule) {
                    jsModule.ShowDialog(userInfo, onSelected, isSpinnerActive);
                });
            };
            //
            //вызов формы 
            self.ShowKbaSendEmail = function (kbArticle) {
                require(['ui_forms/KB/frmKBASendEmail'], function (jsModule) {
                    jsModule.ShowDialog(kbArticle, isSpinnerActive);
                });

            };
            //вызов формы для отправки email
            self.ShowSendEmailForm = function (options) {
                require(['ui_forms/Email/frmUserSendEmail'], function (jsModule) {
                    jsModule.ShowDialog(options, isSpinnerActive);
                });

            };
        }
    }
    return module;
});