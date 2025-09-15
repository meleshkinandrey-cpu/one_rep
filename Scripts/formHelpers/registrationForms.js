define(['jquery', 'knockout', 'formControl', 'usualForms', 'sdForms'], function ($, ko, fc, ufh, sfh) {
    var module = {
        formHelper: function (isSpinnerActive) {
            var self = this;
            //
            //Форма регистрации заявки клиентом
            self.ShowCallRegistration = function () {
                if (isSpinnerActive != true)
                    showSpinner();
                require(['models/SDForms/CallRegistration'], function (vm) {
                    var frm = new fc.control('clientCallRegistration', 'clientCallRegistration', getTextResource('CallRegistrationCaption'), true, true, true, 300, 200, null, null, 'data-bind="template: {name: function() { return SelectedView(); }, afterRender: AfterRender}"');
                    if (!frm.Initialized)
                        return;
                    //
                    var firstInitD = $.Deferred();//first template change blinked
                    var binded = false;//for single applyBindings
                    var forceClose = false;//for question before close
                    var mod = new vm.ViewModel();
                    mod.frm = frm;
                    mod.MainRegionID = frm.GetRegionID();
                    //
                    var tabControlID = mod.MainRegionID + '_tabControl';
                    var refreshTabControlSize = function (div) {
                        var tabControl = $('#' + tabControlID);
                        if (tabControl.length > 0)
                            tabControl.find('.b-requestCreate__tabs').css('height', div.outerHeight(true) + 'px');//form padding
                    };
                    //
                    var helpPanelID = mod.MainRegionID + '_helpPanel';
                    var refreshHelpPanelSize = function (div) {
                        var helpPanel = $('#' + helpPanelID);
                        if (helpPanel.length > 0) {
                            var panelDiv = helpPanel.find('.b-requestCreate-left');
                            var height = div.outerHeight(true);//form padding
                            panelDiv.css('height', height + 'px');
                            //
                            var parts = 0;
                            var callsDiv = div.find('.helpPanel_calls');
                            if (callsDiv && mod.TipicalCallsVisible() == true)
                                parts++;
                            var servicesDiv = div.find('.helpPanel_services');
                            if (servicesDiv && mod.TipicalItemAttendanceListVisible() == true)
                                parts++;
                            var kbListDiv = div.find('.helpPanel_kb');
                            if (kbListDiv && mod.KBArticlesVisible() == true)
                                parts++;
                            //                                
                            var partHeight = parts == 0 ? 0 : height / parts;
                            //высота без заголовков панелей
                            callsDiv.find('.scrollBar').css('height', Math.max(0, partHeight - callsDiv.find('.b-requestCreate-left__title').outerHeight()) + 'px');
                            servicesDiv.find('.scrollBar').css('height', Math.max(0, partHeight - servicesDiv.find('.b-requestCreate-left__title').outerHeight()) + 'px');
                            kbListDiv.find('.scrollBar').css('height', Math.max(0, partHeight - kbListDiv.find('.b-requestCreate-left__title').outerHeight()) + 'px');
                        }
                    };
                    //
                    var oldSizeChanged = frm.SizeChanged;
                    frm.SizeChanged = function () {
                        oldSizeChanged();
                        //
                        var div = frm.GetDialogDIV();
                        if (div != null) {
                            refreshTabControlSize(div);
                            refreshHelpPanelSize(div);
                        }
                    };
                    frm.BeforeClose = function () {
                        if (mod.ID != null)
                            return true;
                        //
                        if (forceClose) {
                            if (mod.attachmentControl != null)
                                mod.attachmentControl.RemoveUploadedFiles();
                            if (mod.parametersControl != null)
                                mod.parametersControl.DestroyControls();
                            return true;
                        }
                        //
                        require(['sweetAlert'], function () {
                            swal({
                                title: getTextResource('FormClosing'),
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
                                        frm.Close();
                                    }, 300);//TODO? close event of swal
                                }
                            });
                        });
                        return false;
                    };
                    //
                    mod.InvalidateHelpPanel = function () {
                        var div = frm.GetDialogDIV();
                        if (div != null)
                            refreshHelpPanelSize(div);
                    };
                    mod.ChangeTemplate = function () {
                        if (mod.parametersControl != null)
                            mod.parametersControl.DestroyControls();
                        //
                        showSpinner($('#' + mod.MainRegionID)[0]);
                        $('#' + tabControlID).css({ 'pointer-events': 'none' });
                        //
                        mod.AfterRender = function () {
                            mod.InitializeTabPage();
                            firstInitD.resolve();
                            frm.SizeChanged();
                            //
                            hideSpinner($('#' + mod.MainRegionID)[0]);
                            $('#' + tabControlID).css({ 'pointer-events': '' });
                        };
                        //
                        var tp = mod.SelectedTabPage;
                        var frmSettingsLoadedD = frm.LoadSettings(tp.FormSettingsName, tp.MinWidth, tp.MinHeight, tp.FormButtons);//reload new form settings for template
                        $.when(frmSettingsLoadedD).done(function () {
                            frm.ExtendSize(tp.ExWidth, tp.ExHeight);
                            mod.SelectedView(tp.TemplateName);//new template for ko
                            //
                            if (!binded) {
                                binded = true;
                                var elem = document.getElementById(mod.MainRegionID);
                                try {
                                    ko.applyBindings(mod, elem);
                                }
                                catch (err) {
                                    if (elem)
                                        throw err;
                                }
                            }
                        });
                    };
                    mod.Load();
                    //
                    var formOpenedD = frm.Show();
                    $.when(formOpenedD).done(hideSpinner);
                    //
                    $.when(formOpenedD, firstInitD).done(function () {
                        var dialogDIV = frm.GetDialogDIV();
                        //
                        //load tabControls
                        dialogDIV.append('<div id="' + tabControlID + '" data-bind="template: {name: \'SDForms/CallRegistration.TabControl\', afterRender: AfterRenderTabControl}" ></div>');
                        mod.AfterRenderTabControl = function () {
                            refreshTabControlSize(dialogDIV);
                            dialogDIV.css('overflow', 'visible');//for outside panels, one time
                        };
                        var tabElem = document.getElementById(tabControlID);
                        try {
                            ko.applyBindings(mod, tabElem);
                        }
                        catch (err) {
                            if (tabElem)
                                throw err;
                        }
                        //
                        //load helpPanel
                        dialogDIV.append('<div id="' + helpPanelID + '" data-bind="template: {name: \'SDForms/CallRegistration.HelpPanel\', afterRender: AfterRenderHelpPanel}" ></div>');
                        mod.AfterRenderHelpPanel = function () {
                            refreshHelpPanelSize(dialogDIV);
                        };
                        var helpElem = document.getElementById(helpPanelID);
                        try {
                            ko.applyBindings(mod, helpElem);
                        }
                        catch (err) {
                            if (helpElem)
                                throw err;
                        }
                    });
                });
            };
            //
            //Форма регистрации заявки инженером
            self.ShowCallRegistrationEngineer = function (client, objectClassID, objectID, callData, dependencyList) {
                if (isSpinnerActive != true)
                    showSpinner();
                require(['models/SDForms/CallRegistrationEngineer'], function (vm) {
                    $.when(operationIsGrantedD(518)).done(function (call_properties) {
                        var buttons = {}
                        var forceClose = false;
                        var ctrl = undefined;
                        var mod = undefined;
                        buttons[getTextResource('ButtonCreateCall')] = function () {
                            var d = mod.ValidateAndRegisterCall(true);
                            $.when(d).done(function (result) {
                                if (result == null)
                                    return;
                                //
                                mod.ID = result.CallID;
                                ctrl.Close();
                            });
                        };
                        if (call_properties == true) {
                            buttons[getTextResource('ButtonCreateCallAndOpen')] = function () {
                                var d = mod.ValidateAndRegisterCall(false);
                                $.when(d).done(function (result) {
                                    if (result == null)
                                        return;
                                    //
                                    mod.ID = result.CallID;
                                    ctrl.Close();
                                    //
                                    var sdFormHelper = new sfh.formHelper(isSpinnerActive);
                                    sdFormHelper.ShowCallByContext(mod.ID, { useView: false });
                                });
                            };
                        }
                        buttons[getTextResource('ButtonCreateCallAndCreateNew')] = function () {
                            var d = mod.ValidateAndRegisterCall(true);
                            $.when(d).done(function (result) {
                                if (result == null)
                                    return;
                                //
                                mod.ID = result.CallID;
                                ctrl.Close();
                                //                        
                                self.ShowCallRegistrationEngineer();
                            });
                        };
                        buttons[getTextResource('CancelButtonText')] = function () { ctrl.Close(); }
                        //
                        var ctrl = new fc.control('engineerCallRegistration', 'engineerCallRegistration', getTextResource('CallRegistrationCaption'), true, true, true, 760, 500, buttons, null, 'data-bind="template: {name: \'SDForms/CallRegistrationEngineer\', afterRender: AfterRender}"');
                        if (!ctrl.Initialized)
                            return;
                        //
                        var forceClose = false;//for question before close
                        var mod = new vm.ViewModel(ctrl.GetRegionID(), objectClassID, objectID, dependencyList);
                        mod.frm = ctrl;
                        //
                        if (callData) {
                            mod.callData = callData;
                            if (callData.ID())
                                mod.AddAs = true;
                        }
                        //
                        var helpPanelID = mod.MainRegionID + '_helpPanel';
                        var refreshHelpPanelSize = function (div) {
                            var helpPanel = $('#' + helpPanelID);
                            if (helpPanel.length > 0) {
                                var panelDiv = helpPanel.find('.b-requestCreate-left');
                                var height = div.outerHeight(true);//form padding
                                panelDiv.css('height', height + 'px');
                                //
                                var parts = 0;
                                var callsDiv = div.find('.helpPanel_calls');
                                if (callsDiv && mod.TipicalCallsVisible() == true)
                                    parts++;
                                var servicesDiv = div.find('.helpPanel_services');
                                if (servicesDiv && mod.TipicalItemAttendanceListVisible() == true)
                                    parts++;
                                var kbListDiv = div.find('.helpPanel_kb');
                                if (kbListDiv && mod.KBArticlesVisible() == true)
                                    parts++;
                                //                                
                                var partHeight = parts == 0 ? 0 : height / parts;
                                //высота без заголовков панелей
                                callsDiv.find('.scrollBar').css('height', Math.max(0, partHeight - callsDiv.find('.b-requestCreate-left__title').outerHeight()) + 'px');
                                servicesDiv.find('.scrollBar').css('height', Math.max(0, partHeight - servicesDiv.find('.b-requestCreate-left__title').outerHeight()) + 'px');
                                kbListDiv.find('.scrollBar').css('height', Math.max(0, partHeight - kbListDiv.find('.b-requestCreate-left__title').outerHeight()) + 'px');
                            }
                        };
                        //
                        mod.InvalidateHelpPanel = function () {
                            var div = ctrl.GetDialogDIV();
                            if (div != null)
                                refreshHelpPanelSize(div);
                        };
                        //
                        var oldSizeChanged = ctrl.SizeChanged;
                        ctrl.SizeChanged = function () {
                            oldSizeChanged();
                            mod.InvalidateHelpPanel();
                        };
                        ctrl.BeforeClose = function () {
                            if (mod.ID != null)
                                return true;
                            //
                            if (forceClose) {
                                if (mod.attachmentControl != null)
                                    mod.attachmentControl.RemoveUploadedFiles();
                                if (mod.parametersControl != null)
                                    mod.parametersControl.DestroyControls();
                                return true;
                            }
                            //
                            require(['sweetAlert'], function () {
                                swal({
                                    title: getTextResource('FormClosing'),
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
                            return false;
                        };
                        //                                               
                        var ctrlD = ctrl.Show();
                        ctrl.ExtendSize(1000, 800);
                        $.when(ctrlD).done(function () {
                            mod.Load();
                            //
                            var elem = document.getElementById(mod.MainRegionID);
                            try {
                                ko.applyBindings(mod, elem);
                            }
                            catch (err) {
                                if (elem)
                                    throw err;
                            }
                        });
                        //
                        $.when(ctrlD, mod.renderedD).done(function () {
                            if (!ko.components.isRegistered('callRegistrationEngineerFormCaptionComponent'))
                                ko.components.register('callRegistrationEngineerFormCaptionComponent', {
                                    template: '<span class="color-point" style="margin-right:5px;" data-bind="style: { background: $priorityColor}" /><span data-bind="text: $captionText"/>'
                                });
                            ctrl.BindCaption(mod, "component: {name: 'callRegistrationEngineerFormCaptionComponent', params: { $priorityColor: PriorityColor, $captionText: getTextResource(\'CallRegistrationCaption\')} }");
                            //
                            hideSpinner();
                            //
                            if (client)
                                mod.ClientID(client.ID);
                            //
                            var dialogDIV = ctrl.GetDialogDIV();
                            //                           
                            //load helpPanel
                            dialogDIV.append('<div id="' + helpPanelID + '" data-bind="template: {name: \'SDForms/CallRegistration.HelpPanel\', afterRender: AfterRenderHelpPanel}" ></div>');
                            mod.AfterRenderHelpPanel = function () {
                                refreshHelpPanelSize(dialogDIV);
                                dialogDIV.css('overflow', 'visible');//for outside panels, one time
                            };
                            var helpElem = document.getElementById(helpPanelID);
                            try {
                                ko.applyBindings(mod, helpElem);
                            }
                            catch (err) {
                                if (helpElem)
                                    throw err;
                            }
                        });
                    });
                });
            };
            //
            //Форма регистрации заявки клиентом 2
            self.ShowCallRegistrationLite = function (client, objectClassID, objectID, callData) {
                if (isSpinnerActive != true)
                    showSpinner();
                require(['models/SDForms/CallRegistrationLite'], function (vm) {
                    $.when(operationIsGrantedD(518)).done(function (call_properties) {
                        var buttons = {}
                        var forceClose = false;
                        var ctrl = undefined;
                        var mod = undefined;
                        buttons[getTextResource('ButtonCreateCall')] = function () {
                            var d = mod.ValidateAndRegisterCall(true);
                            $.when(d).done(function (result) {
                                if (result == null)
                                    return;
                                //
                                mod.ID = result.CallID;
                                ctrl.Close();
                            });
                        };
                        buttons[getTextResource('CancelButtonText')] = function () { ctrl.Close(); }
                        //
                        var ctrl = new fc.control('callRegistrationLite', 'callRegistrationLite', getTextResource('CallRegistrationCaption'), true, true, true, 760, 500, buttons, null, 'data-bind="template: {name: \'SDForms/CallRegistrationLite\', afterRender: AfterRender}"');
                        if (!ctrl.Initialized)
                            return;
                        //
                        var forceClose = false;//for question before close
                        var mod = new vm.ViewModel(ctrl.GetRegionID(), objectClassID, objectID);
                        mod.frm = ctrl;
                        //
                        if (callData) {
                            mod.callData = callData;
                            if (callData.ID())
                                mod.AddAs = true;
                            else if (callData.ServiceID() || callData.CallTypeID())
                                mod.AddFromServiceCatalogue = true;
                        }
                        //
                        if (client)
                            mod.ClientID(client.ID);
                        //                        
                        ctrl.BeforeClose = function () {
                            if (mod.ID != null)
                                return true;
                            //
                            if (forceClose) {
                                if (mod.attachmentControl != null)
                                    mod.attachmentControl.RemoveUploadedFiles();
                                if (mod.parametersControl != null)
                                    mod.parametersControl.DestroyControls();
                                return true;
                            }
                            //
                            require(['sweetAlert'], function () {
                                swal({
                                    title: getTextResource('FormClosing'),
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
                            return false;
                        };
                        //                                               
                        var ctrlD = ctrl.Show();
                        ctrl.ExtendSize(1000, 800);
                        $.when(ctrlD).done(function () {
                            mod.Load();
                            //
                            var elem = document.getElementById(mod.MainRegionID);
                            try {
                                ko.applyBindings(mod, elem);
                            }
                            catch (err) {
                                if (elem)
                                    throw err;
                            }
                        });
                        //
                        $.when(ctrlD, mod.renderedD).done(function () {
                            if (!ko.components.isRegistered('callRegistrationEngineerFormCaptionComponent'))
                                ko.components.register('callRegistrationEngineerFormCaptionComponent', {
                                    template: '<span class="color-point" style="margin-right:5px;" data-bind="style: { background: $priorityColor}" /><span data-bind="text: $captionText"/>'
                                });
                            ctrl.BindCaption(mod, "component: {name: 'callRegistrationEngineerFormCaptionComponent', params: { $priorityColor: PriorityColor, $captionText: getTextResource(\'CallRegistrationCaption\')} }");
                            //
                            hideSpinner();                            
                        });
                    });
                });
            };
            //
            //возвращает метод для закрытия себя
            self.ShowCallRegistrationLiteFullScreen = function (client, objectClassID, objectID, callData, onCloseAction) {
                var retD = $.Deferred();
                //
                if (isSpinnerActive != true)
                    showSpinner();
                require(['models/SDForms/CallRegistrationLite'], function (vm) {
                    $.when(operationIsGrantedD(518)).done(function (call_properties) {
                        var buttons = {}
                        var forceClose = false;
                        var ctrl = undefined;
                        var mod = undefined;
                        //
                        var forceClose = false;//for question before close
                        var mod = new vm.ViewModel('sc-call', objectClassID, objectID);
                        //
                        if (callData) {
                            mod.callData = callData;
                            if (callData.ID())
                                mod.AddAs = true;
                            else if (callData.ServiceID() || callData.CallTypeID())
                                mod.AddFromServiceCatalogue = true;
                        }
                        //
                        if (onCloseAction)
                            mod.OnCloseAction = onCloseAction;
                        //                                               
                        mod.Load();
                        //
                        var elem = document.getElementById(mod.MainRegionID);
                        try {
                            ko.applyBindings(mod, elem);
                        }
                        catch (err) {
                            if (elem)
                                throw err;
                        }
                        //
                        $.when(mod.renderedD).done(function () {
                            hideSpinner();
                            //
                            if (client)
                                mod.ClientID(client.ID);
                            //
                            retD.resolve(function (ignoreCloseAction) {
                                if (ignoreCloseAction !== false)
                                    mod.OnCloseAction = undefined;//если мы сами закрываем - не надо восстанавливать состояние
                                //
                                mod.Close();
                            });
                        });
                    });
                });
                //
                return retD;
            };
            //
            //Форма регистрации задания
            self.ShowWorkOrderRegistration = function (objectClassID, objectID, workOrderData, dependencyList) {
                if (isSpinnerActive != true)
                    showSpinner();
                require(['models/SDForms/WorkOrderRegistration'], function (vm) {
                    $.when(operationIsGrantedD(302)).done(function (workOrder_properties) {
                        var buttons = {}
                        var forceClose = false;
                        var ctrl = undefined;
                        var mod = undefined;
                        buttons[getTextResource('ButtonCreateWorkOrder')] = function () {
                            var d = mod.ValidateAndRegisterWorkOrder(true);
                            $.when(d).done(function (result) {
                                if (result == null)
                                    return;
                                //
                                mod.ID = result.WorkOrderID;
                                ctrl.Close();
                            });
                        };
                        if (workOrder_properties == true) {
                            buttons[getTextResource('ButtonCreateWorkOrderAndOpen')] = function () {
                                var d = mod.ValidateAndRegisterWorkOrder(false);
                                $.when(d).done(function (result) {
                                    if (result == null)
                                        return;
                                    //
                                    mod.ID = result.WorkOrderID;
                                    ctrl.Close();
                                    //
                                    var sdFormHelper = new sfh.formHelper(isSpinnerActive);
                                    sdFormHelper.ShowWorkOrder(mod.ID, sdFormHelper.Mode.Default);
                                });
                            };
                        }
                        buttons[getTextResource('CancelButtonText')] = function () { ctrl.Close(); }
                        //
                        var ctrl = new fc.control('workOrderRegistration', 'workOrderRegistration', getTextResource('WorkOrderRegistrationCaption'), true, true, true, 760, 500, buttons, null, 'data-bind="template: {name: \'SDForms/WorkOrderRegistration\', afterRender: AfterRender}"');
                        if (!ctrl.Initialized)
                            return;
                        //
                        var forceClose = false;//for question before close
                        var mod = new vm.ViewModel(ctrl.GetRegionID(), objectClassID, objectID, dependencyList);
                        mod.frm = ctrl;
                        //
                        if (workOrderData) {
                            mod.workOrderData = workOrderData;
                            if (workOrderData.ID())
                                mod.AddAs = true;
                        }
                        //
                        var helpPanelID = mod.MainRegionID + '_helpPanel';
                        var refreshHelpPanelSize = function (div) {
                            var helpPanel = $('#' + helpPanelID);
                            if (helpPanel.length > 0) {
                                var panelDiv = helpPanel.find('.b-requestCreate-left');
                                var height = div.outerHeight(true);//form padding
                                panelDiv.css('height', height + 'px');
                                //
                                var parts = 0;
                                var workOrdersDiv = div.find('.helpPanel_workOrders');
                                if (workOrdersDiv && mod.TipicalWorkOrdersVisible() == true)
                                    parts++;
                                var templatesDiv = div.find('.helpPanel_templates');
                                if (templatesDiv && mod.WorkOrderTemplateListVisible() == true)
                                    parts++;
                                //                                
                                var partHeight = parts == 0 ? 0 : height / parts;
                                //высота без заголовков панелей
                                workOrdersDiv.find('.scrollBar').css('height', Math.max(0, partHeight - workOrdersDiv.find('.b-requestCreate-left__title').outerHeight()) + 'px');
                                templatesDiv.find('.scrollBar').css('height', Math.max(0, partHeight - templatesDiv.find('.b-requestCreate-left__title').outerHeight()) + 'px');
                            }
                        };
                        //
                        mod.InvalidateHelpPanel = function () {
                            var div = ctrl.GetDialogDIV();
                            if (div != null)
                                refreshHelpPanelSize(div);
                        };
                        //
                        var oldSizeChanged = ctrl.SizeChanged;
                        ctrl.SizeChanged = function () {
                            oldSizeChanged();
                            mod.InvalidateHelpPanel();
                        };
                        ctrl.BeforeClose = function () {
                            if (mod.ID != null)
                                return true;
                            //
                            if (forceClose) {
                                if (mod.attachmentControl != null)
                                    mod.attachmentControl.RemoveUploadedFiles();
                                if (mod.parametersControl != null)
                                    mod.parametersControl.DestroyControls();
                                return true;
                            }
                            //
                            require(['sweetAlert'], function () {
                                swal({
                                    title: getTextResource('FormClosing'),
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
                            return false;
                        };
                        //                                                
                        var ctrlD = ctrl.Show();
                        ctrl.ExtendSize(1000, 800);
                        $.when(ctrlD).done(function () {
                            mod.Load();
                            //
                            var elem = document.getElementById(mod.MainRegionID);
                            try {
                                ko.applyBindings(mod, elem);
                            }
                            catch (err) {
                                if (elem)
                                    throw err;
                            }
                        });
                        //
                        $.when(ctrlD, mod.renderedD).done(function () {
                            if (!ko.components.isRegistered('workOrderRegistrationFormCaptionComponent'))
                                ko.components.register('workOrderRegistrationFormCaptionComponent', {
                                    template: '<span class="color-point" style="margin-right:5px;" data-bind="style: { background: $priorityColor}" /><span data-bind="text: $captionText"/>'
                                });
                            ctrl.BindCaption(mod, "component: {name: 'workOrderRegistrationFormCaptionComponent', params: { $priorityColor: PriorityColor, $captionText: getTextResource(\'WorkOrderRegistrationCaption\')} }");
                            //
                            hideSpinner();
                            //
                            var dialogDIV = ctrl.GetDialogDIV();
                            //                           
                            //load helpPanel
                            dialogDIV.append('<div id="' + helpPanelID + '" data-bind="template: {name: \'SDForms/WorkOrderRegistration.HelpPanel\', afterRender: AfterRenderHelpPanel}" ></div>');
                            mod.AfterRenderHelpPanel = function () {
                                refreshHelpPanelSize(dialogDIV);
                                dialogDIV.css('overflow', 'visible');//for outside panels, one time
                            };
                            var helpElem = document.getElementById(helpPanelID);
                            try {
                                ko.applyBindings(mod, helpElem);
                            }
                            catch (err) {
                                if (helpElem)
                                    throw err;
                            }
                        });
                    });
                });
            };
            //
            //Форма регистрации проблемы инженером
            self.ShowProblemRegistration = function (client, objectClassID, objectID, problemData, dependencyList) {
                if (isSpinnerActive != true)
                    showSpinner();
                require(['models/SDForms/ProblemRegistration'], function (vm) {
                    $.when(operationIsGrantedD(222)).done(function (problem_properties) {
                        var buttons = {}
                        var forceClose = false;
                        var ctrl = undefined;
                        var mod = undefined;
                        buttons[getTextResource('ButtonCreateProblem')] = function () {
                            var d = mod.ValidateAndRegisterProblem(true);
                            $.when(d).done(function (result) {
                                if (result == null)
                                    return;
                                //
                                mod.ID = result.ProblemID;
                                ctrl.Close();
                            });
                        };
                        if (problem_properties == true) {
                            buttons[getTextResource('ButtonCreateProblemAndOpen')] = function () {
                                var d = mod.ValidateAndRegisterProblem(false);
                                $.when(d).done(function (result) {
                                    if (result == null)
                                        return;
                                    //
                                    mod.ID = result.ProblemID;
                                    ctrl.Close();
                                    //
                                    var sdFormHelper = new sfh.formHelper(isSpinnerActive);
                                    sdFormHelper.ShowProblem(mod.ID, sdFormHelper.Mode.Default);
                                });
                            };
                        }
                        buttons[getTextResource('CancelButtonText')] = function () { ctrl.Close(); }
                        //
                        var ctrl = new fc.control('problemRegistration', 'problemRegistration', getTextResource('ProblemRegistrationCaption'), true, true, true, 760, 500, buttons, null, 'data-bind="template: {name: \'SDForms/ProblemRegistration\', afterRender: AfterRender}"');
                        if (!ctrl.Initialized)
                            return;
                        //
                        var forceClose = false;//for question before close
                        var mod = new vm.ViewModel(ctrl.GetRegionID(), objectClassID, objectID, dependencyList);
                        mod.frm = ctrl;
                        //
                        if (problemData) {
                            mod.problemData = problemData;
                            if (problemData.ID())
                                mod.AddAs = true;
                            else if (problemData.AddByCallList())
                                mod.CallList = problemData.CallList;
                        }
                        //                          
                        ctrl.BeforeClose = function () {
                            if (mod.ID != null)
                                return true;
                            //
                            if (forceClose) {
                                if (mod.attachmentControl != null)
                                    mod.attachmentControl.RemoveUploadedFiles();
                                if (mod.parametersControl != null)
                                    mod.parametersControl.DestroyControls();
                                return true;
                            }
                            //
                            require(['sweetAlert'], function () {
                                swal({
                                    title: getTextResource('FormClosing'),
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
                            return false;
                        };
                        //                                               
                        var ctrlD = ctrl.Show();
                        ctrl.ExtendSize(1000, 800);
                        $.when(ctrlD).done(function () {
                            mod.Load();
                            //
                            var elem = document.getElementById(mod.MainRegionID);
                            try {
                                ko.applyBindings(mod, elem);
                            }
                            catch (err) {
                                if (elem)
                                    throw err;
                            }
                        });
                        //
                        $.when(ctrlD, mod.renderedD).done(function () {
                            if (!ko.components.isRegistered('problemRegistrationFormCaptionComponent'))
                                ko.components.register('problemRegistrationFormCaptionComponent', {
                                    template: '<span class="color-point" style="margin-right:5px;" data-bind="style: { background: $priorityColor}" /><span data-bind="text: $captionText"/>'
                                });
                            ctrl.BindCaption(mod, "component: {name: 'problemRegistrationFormCaptionComponent', params: { $priorityColor: PriorityColor, $captionText: getTextResource(\'ProblemRegistrationCaption\')} }");
                            //
                            hideSpinner();
                        });
                    });
                });
            };
            //
            //Форма регистрации заявки инженером
            self.ShowRFCRegistration = function (objectClassID, objectID, RFCData) {
                if (isSpinnerActive != true)
                    showSpinner();
                require(['models/SDForms/RFCRegistration'], function (vm) {
                    $.when(operationIsGrantedD(383)).done(function (rfc_properties) {
                        var buttons = {}
                        var forceClose = false;
                        var ctrl = undefined;
                        var mod = undefined;
                        buttons[getTextResource('ButtonCreateRFC')] = function () {
                            var d = mod.ValidateAndRegisterRFC(true);
                            $.when(d).done(function (result) {
                                if (result == null)
                                    return;
                                //
                                mod.ID = result.RFCID;
                                ctrl.Close();
                            });
                        };
                        if (rfc_properties == true) {
                            buttons[getTextResource('ButtonCreateRFCAndOpen')] = function () {
                                var d = mod.ValidateAndRegisterRFC(false);
                                $.when(d).done(function (result) {
                                    if (result == null)
                                        return;
                                    //
                                    mod.ID = result.RFCID;
                                    ctrl.Close();
                                    //
                                    var sdFormHelper = new sfh.formHelper(isSpinnerActive);
                                    sdFormHelper.ShowRFC(mod.ID, sdFormHelper.Mode.Default);
                                });
                            };
                        }
                        buttons[getTextResource('ButtonCreateRFCAndCreateNew')] = function () {
                            var d = mod.ValidateAndRegisterRFC(true);
                            $.when(d).done(function (result) {
                                if (result == null)
                                    return;
                                //
                                mod.ID = result.RFCID;
                                ctrl.Close();
                                //                        
                                self.ShowRFCRegistration();
                            });
                        };
                        buttons[getTextResource('CancelButtonText')] = function () { ctrl.Close(); }
                        //
                        var ctrl = new fc.control('RFCRegistration', 'RFCRegistration', getTextResource('RFCRegistrationCaption'), true, true, true, 760, 500, buttons, null, 'data-bind="template: {name: \'SDForms/RFCRegistration\', afterRender: AfterRender}"');
                        if (!ctrl.Initialized)
                            return;
                        //
                        var forceClose = false;//for question before close
                        var mod = new vm.ViewModel(ctrl.GetRegionID(), objectClassID, objectID);
                        mod.frm = ctrl;
                        //
                        if (RFCData) {
                            mod.RFCData = RFCData;
                            if (RFCData.AddAs())
                                mod.AddAs = true;
                        }
                        //    
                        mod.InvalidateHelpPanel = function () {
                            var div = ctrl.GetDialogDIV();
                            if (div != null)
                                refreshHelpPanelSize(div);
                        };
                        //
                        var oldSizeChanged = ctrl.SizeChanged;
                        ctrl.SizeChanged = function () {
                            oldSizeChanged();
                        };
                        ctrl.BeforeClose = function () {
                            if (mod.ID != null)
                                return true;
                            //
                            if (forceClose) {
                                if (mod.attachmentControl != null)
                                    mod.attachmentControl.RemoveUploadedFiles();
                                if (mod.parametersControl != null)
                                    mod.parametersControl.DestroyControls();
                                return true;
                            }
                            //
                            require(['sweetAlert'], function () {
                                swal({
                                    title: getTextResource('FormClosing'),
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
                            return false;
                        };
                        //                                               
                        var ctrlD = ctrl.Show();
                        ctrl.ExtendSize(1000, 800);
                        $.when(ctrlD, mod.Load()).done(function () {
                            //
                            var elem = document.getElementById(mod.MainRegionID);
                            try {
                                ko.applyBindings(mod, elem);
                            }
                            catch (err) {
                                if (elem)
                                    throw err;
                            }
                        });
                        //
                        $.when(ctrlD, mod.renderedD).done(function () {
                            if (!ko.components.isRegistered('rfcRegistrationFormCaptionComponent'))
                                ko.components.register('rfcRegistrationFormCaptionComponent', {
                                    template: '<span class="color-point" style="margin-right:5px;" data-bind="style: { background: $priorityColor}" /><span data-bind="text: $captionText"/>'
                                });
                            ctrl.BindCaption(mod, "component: {name: 'rfcRegistrationFormCaptionComponent', params: { $priorityColor: PriorityColor, $captionText: getTextResource(\'RFCRegistrationCaption\')} }");
                            //
                            hideSpinner();
                        });
                    });
                });
            };
        }
    }
    return module;
});