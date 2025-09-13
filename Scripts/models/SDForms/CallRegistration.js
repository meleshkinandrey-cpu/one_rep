define(['knockout', 'jquery', 'usualForms', 'sdForms', 'ajax', 'parametersControl', 'comboBox'], function (ko, $, fhModule, sfhModule, ajaxLib, pcLib) {
    var module = {
        ViewModel: function () {
            var self = this;
            //
            //обратит внимание на selected.sedt = observable
            //outer actions
            self.MainRegionID = undefined;
            self.ChangeTemplate = undefined;
            self.InvalidateHelpPanel = undefined;
            self.frm = undefined;
            //
            //vars
            self.ID = null;//for registered call
            self.CurrentUserD = $.Deferred();
            self.IsHardToChooseButtonVisibleD = $.Deferred();
            self.ShowPlaceOfServiceD = $.Deferred();
            self.ShowPlaceOfService = ko.observable(true);
            //
            self.SelectedClient = ko.observable(null);
            self.SelectedClient.subscribe(function (newValue) {
                self.ServiceClear();//меняем клиента - я инициатор, и доступны будут другие сервисы
                //
                self.LoadTipicalCalls();
                if (self.TipicalCalls().length > 0)
                    self.TipicalCallsVisible(true);
                //
                self.LoadTipicalItemAttendanceList();
                if (self.TipicalItemAttendanceList().length > 0)
                    self.TipicalItemAttendanceListVisible(true);
                //
                var clientID = newValue == null ? null : newValue.ID;
                //
                if (self.parametersControl != null)
                    self.parametersControl.ClientID(clientID);
                //
                if (self.callSummarySearcher != null) {
                    self.callSummarySearcher.CurrentUserID = clientID;
                    self.callSummarySearcher.ClearValues();
                }
                if (self.serviceItemAttendanceSearcher != null) {
                    self.serviceItemAttendanceSearcher.CurrentUserID = clientID;
                    self.serviceItemAttendanceSearcher.ClearValues();
                }
                //
                if (self.SelectedTabPage == self.tpMain && newValue != null)
                    self.SelectedCallType().CallTypeClick();//for show message of sla

                if (clientID != null)
                $.when(self.GetWorkPlaceInfo(clientID)).done(function () {
                });
            });
            self.SelectedCallType = ko.observable(null);
            self.SelectedCallType.subscribe(function (newValue) {
                self.InitializeTabPage();//меняем тип заявки - меняем полностью зависимые данные на карточке
                //
                self.ServiceClear();
            });
            self.SelectedUrgency = ko.observable(null);
            //
            self.CallSummaryName = ko.observable('');
            self.CallSummaryName.subscribe(function (newValue) {
                self.LoadKBArticleList();//при смене краткого описания - поиск похожих статей БЗ
            });
            //
            self.HTMLDescription = ko.observable('');
            //
            self.ServiceID = null;
            self.ServiceItemID = null;
            self.ServiceAttendanceID = null;
            self.ServiceItemAttendanceFullName = ko.observable('');
            self.ServiceHardToChooseMode = false;
            self.SetCallSummarySearcherParameters = function () {
                $.when(self.callSummarySearcherD).done(function () {
                    self.callSummarySearcher.SetSearchParameters([self.ServiceItemID ? self.ServiceItemID : (self.ServiceAttendanceID ? self.ServiceAttendanceID : undefined), self.SelectedCallType() ? self.SelectedCallType().ID : undefined]);
                });
            };
            self.ServiceClear = function () {
                self.ServiceItemAttendanceFullName('');
                //
                self.ServiceID = null;
                self.ServiceItemID = null;
                self.ServiceAttendanceID = null;
                self.ServiceHardToChooseMode = false;
                //
                self.LoadKBArticleList();
                self.OnParametersChanged();
                //
                self.SetCallSummarySearcherParameters();
            };
            self.ServiceHardToChoose = function () {
                self.ServiceItemAttendanceFullName('[' + getTextResource('ButtonHardToChooseFromServiceCatalogue') + ']');
                $.when(self.serviceItemAttendanceSearcherD).done(function (ctrl) {
                    ctrl.SetSelectedItem();
                });
                //
                self.ServiceID = null;
                self.ServiceItemID = null;
                self.ServiceAttendanceID = null;
                self.ServiceHardToChooseMode = true;
                //
                self.LoadKBArticleList();
                self.OnParametersChanged();
                //
                self.SetCallSummarySearcherParameters();
            };
            self.ServiceSet = function (serviceID, serviceItemID, serviceAttendanceID, fullName, serviceParameter, setSearcher, summaryName) {
                self.ServiceItemAttendanceFullName(fullName);
                if (setSearcher != false) {
                    $.when(self.serviceItemAttendanceSearcherD).done(function (ctrl) {
                        ctrl.SetSelectedItem(serviceItemID == null ? serviceAttendanceID : serviceItemID, serviceItemID == null ? 407 : 406, fullName, '');
                    });
                }
                //
                self.ServiceID = serviceID;
                self.ServiceItemID = serviceItemID;
                self.ServiceAttendanceID = serviceAttendanceID;
                self.ServiceHardToChooseMode = false;
                //
                if (serviceParameter && self.HTMLDescription().length == 0) {
                    var html = '<html><body><p style="white-space:pre-wrap">' + serviceParameter.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</p></body></html>';
                    self.HTMLDescription(html);
                }
                //
                self.LoadKBArticleList();
                self.OnParametersChanged();
                //
                self.SetCallSummarySearcherParameters();
                if (summaryName && summaryName != '' && !self.CallSummaryName().length > 0)
                    self.CallSummaryName(summaryName);
                self.SummaryDefaultName(summaryName ? summaryName:'');
            };
            self.SummaryDefaultName = ko.observable('');
            self.OnParametersChanged = function () {//обновления списка параметров по элементу/услуге
                if (self.parametersControl == null) {
                    self.parametersControl = new pcLib.control();
                    if (self.SelectedClient() == null) {
                        self.parametersControl.ReadOnly(true);//пока не будет загружен текущий пользователь                            
                        $.when(self.CurrentUserD).done(function (currentUser) {//значения параметров зависят от клиента заявки
                            if (currentUser) {
                                self.parametersControl.ClientID(currentUser.ID);
                                self.parametersControl.ReadOnly(false);
                            }
                        });
                    } else
                        self.parametersControl.ClientID(self.SelectedClient().ID);
                    //
                    self.parametersControl.ParameterListByGroup.subscribe(function (newValue) {//изменилась разбивка параметров по группам
                        self.parameterListByGroup = newValue;
                        var changed = false;
                        if (self.TabPages().length > 2) {
                            self.TabPages().splice(2, self.TabPages().length - 2);
                            changed = true;
                        }
                        //
                        for (var i = 0; i < newValue.length; i++) {
                            var groupName = newValue[i].GroupName;
                            var parameterList = newValue[i].ParameterList;
                            //
                            var tp = new createTabPage(3 + i, groupName, '', false, '../UI/Controls/Parameters/Lists/CallRegistration.Parameters', self.tpMain.FormSettingsName, self.tpMain.MinWidth, self.tpMain.MinHeight, self.tpMain.ExWidth, self.tpMain.ExHeight, self.tpMain.FormButtons, function () { return true; });
                            tp.FuncIsValid(newValue[i].IsValid);
                            self.TabPages().push(tp);
                            changed = true;
                        }
                        //
                        if (changed == true) {
                            self.TabPages.valueHasMutated();
                            self.tpMain.TabPageClick();
                        }
                    });
                }
                self.parametersControl.Create(701, self.ServiceItemID == null ? self.ServiceAttendanceID : self.ServiceItemID, true, null);
            };
            //
            self.attachmentControl = null;
            self.htmlDescriptionControl = null;
            //
            self.parametersControl = null;
            self.parameterListByGroup = null;//кеш отсортирортированных параметров, разбитых по группам
            self.GroupParameterList = ko.observable([]);//параметры текущей группы     
            self.GetParameterValueList = function () {//получения списка значений всех параметров
                var retval = [];
                //
                if (self.parametersControl != null)
                    retval = self.parametersControl.GetParameterValueList();
                //
                return retval;
            };
            //
            self.callSummarySearcher = null;
            self.callSummarySearcherD = null;
            self.serviceItemAttendanceSearcher = null;
            self.serviceItemAttendanceSearcherD = null;
            self.clientSearcher = null;
            self.clientSearcherD = null;
            //
            self.ajaxControl_ServiceItemAttendance = new ajaxLib.control();
            self.ajaxControl_Client = new ajaxLib.control();
            self.ajaxControl_RegisterCall = new ajaxLib.control();
            self.ajaxControl_CheckCallType = new ajaxLib.control();
            self.ajaxControl_CallTypeList = new ajaxLib.control();
            self.ajaxControl_UrgencyList = new ajaxLib.control();
            self.ajaxControl_KBArticleList = new ajaxLib.control();
            self.ajaxControl_CallInfoList = new ajaxLib.control();
            self.ajaxControl_ServiceItemAttendanceInfoList = new ajaxLib.control();
            self.ajaxControl = new ajaxLib.control();
            //
            self.SelectedTabPage = undefined;
            self.SelectedView = ko.observable('');//function in ko, template    
            self.tpCallType = undefined;
            self.tpMain = undefined;
            //
            //
            self.Load = function () {
                self.LoadCallTypeList();
                self.LoadGeneralInfo();
                //
                //init tabPages
                var buttons = {};
                buttons[getTextResource('CancelButtonText')] = function () { self.frm.Close(); }
                var checkCallType = function () {
                    if (!self.SelectedCallType()) {
                        require(['sweetAlert'], function () {
                            swal(getTextResource('TabPage_StepNotCompleted'), getTextResource('RequireToSelectCallType'), 'info');
                        });
                        return false;
                    } else
                        return true;
                };
                self.tpCallType = new createTabPage(1, getTextResource('TabPage_CallType'), '', true, 'SDForms/CallTypeSelector', 'clientCallRegistration_callTypeSelector', 250, 250, 300, 300, buttons, checkCallType);
                self.TabPages().push(self.tpCallType);
                //
                buttons = {};
                buttons[getTextResource('ButtonCreateCall')] = function () {
                    var d = self.ValidateAndRegisterCall(true);
                    $.when(d).done(function (result) {
                        if (result == null)
                            return;
                        //
                        self.ID = result.CallID;
                        self.frm.Close();
                    });
                };
                buttons[getTextResource('ButtonCreateCallAndOpen')] = function () {
                    var d = self.ValidateAndRegisterCall(false);
                    $.when(d).done(function (result) {
                        if (result == null)
                            return;
                        //
                        self.ID = result.CallID;
                        self.frm.Close();
                        //                        
                        var fh = new sfhModule.formHelper();
                        fh.ShowCallByContext(self.ID, { useView: false });
                    });
                };
                buttons[getTextResource('CancelButtonText')] = function () { self.frm.Close(); }
                self.tpMain = new createTabPage(2, getTextResource('TabPage_Service'), '', false, 'SDForms/CallRegistration', 'clientCallRegistration_main', 490, 250, 600, 700, buttons, function () { return true; });
                self.TabPages().push(self.tpMain);
                //
                self.TabPages.valueHasMutated();
            };
            self.InitializeTabPage = function () {
                if (self.parametersControl != null)
                    self.parametersControl.DestroyControls();
                //
                if (self.SelectedTabPage == self.tpCallType) {
                    self.TipicalCallsVisible(false);
                    self.TipicalItemAttendanceListVisible(false);
                    self.KBArticlesVisible(false);
                    //
                    self.callSummarySearcherD = $.Deferred();
                    self.serviceItemAttendanceSearcherD = $.Deferred();
                    self.clientSearcherD = $.Deferred();
                }
                else if (self.SelectedTabPage == self.tpMain) {
                    var fh = new fhModule.formHelper();
                    //
                    if (self.callSummarySearcher != null)
                        self.callSummarySearcher.Remove();
                    var callSummaryD = fh.SetTextSearcherToField(
                        $('#' + self.MainRegionID).find('.callSummaryName .text-input'),
                        'CallSummarySearcher',
                        null,
                        [undefined, self.SelectedCallType().ID],
                        function (objectInfo) {//select
                            self.CallSummaryName(objectInfo.FullName);
                            //         
                            var clientID = self.SelectedClient() == null ? null : self.SelectedClient().ID;
                            self.ajaxControl_ServiceItemAttendance.Ajax($('#' + self.MainRegionID).find('.serviceItemAttendance'),
                                {
                                    url: 'sdApi/GetServiceItemAttendanceInfoByCallSummaryID',
                                    method: 'GET',
                                    data: { callSummaryID: objectInfo.ID, userID: clientID }
                                },
                                function (response) {
                                    if (response) {
                                        self.ServiceSet(response.ServiceID, response.ServiceItemID, response.ServiceAttendanceID, response.FullName, response.Parameter, null, response.Summary);
                                    }
                                });
                        },
                        function () {//reset
                            self.CallSummaryName('');
                        });
                    $.when(callSummaryD).done(function (ctrl) {
                        self.callSummarySearcher = ctrl;
                        self.callSummarySearcherD.resolve(ctrl);
                        ctrl.CurrentUserID = self.SelectedClient() == null ? null : self.SelectedClient().ID;
                        //
                        ctrl.LoadD.done(function () {
                            $('#' + self.MainRegionID).find('.callSummaryName .text-input').focus();
                            ctrl.Close();
                            setTimeout(ctrl.Close, 500);
                        });
                    });
                    //
                    if (self.serviceItemAttendanceSearcher != null)
                        self.serviceItemAttendanceSearcher.Remove();
                    var serviceSearcherExtensionLoadedD = $.Deferred();
                    var serviceD = fh.SetTextSearcherToField(
                        $('#' + self.MainRegionID).find('.serviceItemAttendance .text-input'),
                        'ServiceItemAndAttendanceSearcher',
                        'SearchControl/SearchServiceItemAttendanceControl',
                        [self.SelectedCallType().ID],
                        function (objectInfo) {//select        
                            var clientID = self.SelectedClient() == null ? null : self.SelectedClient().ID;
                            //
                            self.ajaxControl_ServiceItemAttendance.Ajax($('#' + self.MainRegionID).find('.serviceItemAttendance'),
                                {
                                    url: 'sdApi/GetServiceItemAttendanceInfo',
                                    method: 'GET',
                                    data: { serviceItemAttendanceID: objectInfo.ID, userID: clientID }
                                },
                                function (response) {
                                    if (response) {
                                        self.ServiceSet(response.ServiceID, response.ServiceItemID, response.ServiceAttendanceID, response.FullName, response.Parameter, false, response.Summary);
                                    }
                                });
                        },
                        function () {//reset
                            self.ServiceClear();
                        },
                        function (selectedItem) {//close
                            if (!selectedItem && !self.ServiceHardToChooseMode)
                                self.ServiceClear();
                            else if (!selectedItem && self.ServiceHardToChooseMode)
                                self.serviceItemAttendanceSearcher.HardToChooseClick();
                        },
                        serviceSearcherExtensionLoadedD);
                    $.when(serviceD).done(function (vm) {//after load searcher
                        self.serviceItemAttendanceSearcher = vm;
                        self.serviceItemAttendanceSearcherD.resolve(vm);
                        vm.CurrentUserID = self.SelectedClient() == null ? null : self.SelectedClient().ID;
                        //
                        vm.SelectFromServiceCatalogueClick = function () {
                            vm.Close();//close dropDownMenu
                            var callType = self.SelectedCallType();
                            if (callType == null)
                                return;
                            var mode = fh.ServiceCatalogueBrowserMode.Default;
                            if (callType.ID != '00000000-0000-0000-0000-000000000000') {//default callType
                                if (callType.IsRFC == true)
                                    mode = fh.ServiceCatalogueBrowserMode.ShowOnlyServiceAttendances;
                                else
                                    mode = fh.ServiceCatalogueBrowserMode.ShowOnlyServiceItems;
                            }
                            mode |= fh.ServiceCatalogueBrowserMode.FilterBySLA | fh.ServiceCatalogueBrowserMode.ShowHardToChoose;
                            var clientID = self.SelectedClient() == null ? null : self.SelectedClient().ID;
                            var result = fh.ShowServiceCatalogueBrowser(mode, clientID, self.ServiceID);
                            $.when(result).done(function (serviceItemAttendance) {
                                if (serviceItemAttendance != undefined && serviceItemAttendance != null)
                                    self.ServiceSet(serviceItemAttendance.Service.ID, serviceItemAttendance.ClassID == 406 ? serviceItemAttendance.ID : null, serviceItemAttendance.ClassID == 407 ? serviceItemAttendance.ID : null, serviceItemAttendance.FullName(), serviceItemAttendance.Parameter, null, serviceItemAttendance.Summary);
                                else if (serviceItemAttendance === null)
                                    self.ServiceHardToChoose();
                            });
                        };
                        //
                        vm.HardToChooseClick = function () {
                            vm.Close();//close dropDownMenu
                            self.ServiceHardToChoose();
                        };
                        vm.HardToChooseClickVisible = ko.observable(false);
                        //      
                        serviceSearcherExtensionLoadedD.resolve();
                        //
                        $.when(self.IsHardToChooseButtonVisibleD).done(function (isHardToChooseButtonVisible) {
                            if (isHardToChooseButtonVisible)
                                vm.HardToChooseClickVisible(isHardToChooseButtonVisible);
                        });
                        //
                        $.when(self.ShowPlaceOfServiceD).done(function (isShowHidePlaceOfService) {
                            self.ShowPlaceOfService(isShowHidePlaceOfService);
                        });
                        //
                        $.when(vm.LoadD).done(function () {
                            $('#' + vm.searcherDivID).find('.ui-dialog-buttonset').css({ opacity: 1 });
                        });
                    });
                    //
                    if (self.clientSearcher != null)
                        self.clientSearcher.Remove();
                    var clientD = fh.SetTextSearcherToField(
                        $('#' + self.MainRegionID).find('.clientField .text-input'),
                        'WebUserSearcherNoTOZ',
                        null,
                        null,
                        function (objectInfo) {//select
                            var param = { userID: objectInfo.ID };
                            self.ajaxControl_Client.Ajax($('#' + self.MainRegionID).find('.clientField'),
                               {
                                   dataType: "json",
                                   method: 'GET',
                                   url: 'userApi/GetUserInfo?' + $.param(param)
                               },
                               function (response) {
                                   if (response)
                                       self.SelectedClient(response);
                                   else
                                       self.SelectedClient(null);
                               });
                        },
                        function () {//reset
                            self.SelectedClient(null);
                        },
                        function (selectedItem) {//close
                            if (!selectedItem)
                                self.SelectedClient(null);
                        });
                    $.when(clientD, userD).done(function (ctrl, user) {
                        ctrl.CurrentUserID = user.UserID;//чтобы видеть только относительно подразделений этого пользователя
                        //
                        self.clientSearcher = ctrl;
                        self.clientSearcherD.resolve(ctrl);
                    });
                    //
                    self.LoadUrgencyList();
                    self.LoadCurrentUser();
                    self.LoadServiceItemAttendance();
                    //
                    //if element of elements loaded - just open, overwise - load -> open
                    self.LoadTipicalCalls();
                    if (self.TipicalCalls().length > 0)
                        self.TipicalCallsVisible(true);
                    //
                    self.LoadTipicalItemAttendanceList();
                    if (self.TipicalItemAttendanceList().length > 0)
                        self.TipicalItemAttendanceListVisible(true);
                    //
                    self.LoadKBArticleList();
                    if (self.KBArticles().length > 0)
                        self.KBArticlesVisible(true);
                    //     
                    var htmlElement = $('#' + self.MainRegionID).find('.description');
                    if (self.htmlDescriptionControl == null)
                        require(['htmlControl'], function (htmlLib) {
                            self.htmlDescriptionControl = new htmlLib.control(htmlElement);
                            self.htmlDescriptionControl.OnHTMLChanged = function (htmlValue) {
                                self.HTMLDescription(htmlValue);
                            };
                            self.HTMLDescription.subscribe(function (newValue) {
                                if (self.htmlDescriptionControl != null)
                                    self.htmlDescriptionControl.SetHTML(newValue);
                            });
                        });
                    else
                        self.htmlDescriptionControl.Load(htmlElement);//ko template changed                        
                    //
                    var attachmentsElement = $('#' + self.MainRegionID).find('.documentList');
                    if (self.attachmentControl == null)
                        require(['fileControl'], function (fcLib) {
                            self.attachmentControl = new fcLib.control(attachmentsElement, '.ui-dialog', '.b-requestDetail__files-addBtn');
                            self.attachmentControl.ReadOnly(false);
                        });
                    else
                        self.attachmentControl.Load(attachmentsElement);//ko template changed
                }
                else {//другие вкладки это параметры
                    if (self.SelectedTabPage == undefined) {
                        self.GroupParameterList([]);
                        return;
                    }
                    //
                    var groupName = self.SelectedTabPage.Name;
                    var list = self.parameterListByGroup;
                    for (var i = 0; i < list.length; i++)
                        if (list[i].GroupName == groupName) {
                            self.GroupParameterList(list[i].ParameterList);
                            return;
                        }
                    //
                    self.GroupParameterList([]);
                }
            };
            //
            self.IsRegisteringCall = false;
            //
            self.ValidateAndRegisterCall = function (showSuccessMessage, kbArticleID) {
                var retval = $.Deferred();
                //     
                if (self.IsRegisteringCall)
                    return;
                //
                var data = {
                    'UserID': self.SelectedClient() == null ? null : self.SelectedClient().ID,
                    'CallTypeID': self.SelectedCallType() == null ? null : self.SelectedCallType().ID,
                    'UrgencyID': self.SelectedUrgency() == null ? null : self.SelectedUrgency().ID,
                    'CallSummaryName': self.CallSummaryName(),
                    'HTMLDescription': self.HTMLDescription(),
                    'ServiceItemID': self.ServiceHardToChooseMode == true ? null : self.ServiceItemID,
                    'ServiceAttendanceID': self.ServiceHardToChooseMode == true ? null : self.ServiceAttendanceID,
                    'Files': self.attachmentControl == null ? null : self.attachmentControl.GetData(),
                    'KBArticleID': kbArticleID != null ? kbArticleID : null,
                    'ParameterValueList': self.GetParameterValueList(),
                    //                  
                    'ServicePlaceID': self.ServicePlaceCallID(),
                    'ServicePlaceClassID': self.ServicePlaceCallClassID()
                    //
                };
                if (!data.CallSummaryName || data.CallSummaryName.trim().length == 0) {
                    data.CallSummaryName = self.SummaryDefaultName();
                }
                if (!data.CallSummaryName || data.CallSummaryName.trim().length == 0) {
                    require(['sweetAlert'], function () {
                        swal(getTextResource('PromptCallSummary'));
                    });
                    retval.resolve(null);
                    return;
                }
                if (data.ServiceItemID == null && data.ServiceAttendanceID == null && !self.ServiceHardToChooseMode) {
                    require(['sweetAlert'], function () {
                        swal(getTextResource('PromptServiceItemAttendance'));
                    });
                    retval.resolve(null);
                    return;
                }
                if (data.UserID == null) {
                    require(['sweetAlert'], function () {
                        swal(getTextResource('PromptClient'));
                    });
                    retval.resolve(null);
                    return;
                }
                if (self.parametersControl == null) {
                    require(['sweetAlert'], function () {
                        swal(getTextResource('ParametersNotLoaded'));
                    });
                    retval.resolve(null);
                    return;
                }
                else if (!self.parametersControl.Validate()) {
                    retval.resolve(null);
                    return;
                }
                //
                self.IsRegisteringCall = true;
                showSpinner();
                self.ajaxControl_RegisterCall.Ajax(null,
                    {
                        url: 'sdApi/registerCall',
                        method: 'POST',
                        dataType: 'json',
                        data: data
                    },
                    function (response) {//CallRegistrationResponse
                        hideSpinner();
                        if (response) {
                            if (response.Message && response.Message.length > 0 && (showSuccessMessage == true || response.Type != 0))
                                require(['sweetAlert'], function () {
                                    swal(response.Message);//some problem
                                });
                            //
                            if (response.Type == 0) {//ok 
                                retval.resolve(response);
                                return;
                            }
                        }
                        retval.resolve(null);
                        self.IsRegisteringCall = false;
                    },
                    function (response) {
                        hideSpinner();
                        require(['sweetAlert'], function () {
                            swal(getTextResource('ErrorCaption'), getTextResource('AjaxError') + '\n[CallRegistration.js, RegisterCall]', 'error');
                        });
                        retval.resolve(null);
                        self.IsRegisteringCall = false;
                    });
                //
                return retval.promise();
            };
            //
            //
            self.LoadGeneralInfo = function () {
                var d = self.ajaxControl.Ajax(null,
                    {
                        url: 'accountApi/GetCurrentUser',
                        method: 'GET'
                    },
                    function (response) {
                        self.CurrentUserD.resolve(response);
                    });
                $.when(d).done(function () {
                    self.ajaxControl.Ajax(null,
                        {
                            url: 'configApi/IsHardToChooseButtonVisibile',
                            method: 'GET'
                        },
                        function (response) {
                            self.IsHardToChooseButtonVisibleD.resolve(response);
                        });
                });
                $.when(d).done(function () {
                    var ajaxControl = new ajaxLib.control();
                    ajaxControl.Ajax(null,
                        {
                            url: 'configApi/IsHidePlaceOfServiceVisible',
                            method: 'GET'
                        },
                        function (response) {
                            self.ShowPlaceOfServiceD.resolve(!response);
                        });
                });
            };
            //
            //
            self.LoadCurrentUser = function () {
                var selectedClient = self.SelectedClient();
                if (selectedClient != null) {
                    $.when(self.clientSearcherD).done(function (ctrl) {
                        ctrl.SetSelectedItem(selectedClient.ID, 9, selectedClient.FullName, '');
                    });
                    return;
                }
                //
                $.when(self.CurrentUserD).done(function (currentUser) {
                    self.SelectedClient(currentUser);
                    if (currentUser)
                        $.when(self.clientSearcherD).done(function (ctrl) {
                            ctrl.SetSelectedItem(currentUser.ID, 9, currentUser.FullName, '');
                        });
                });
            };
            self.LoadServiceItemAttendance = function () {
                var id = self.ServiceItemID == null ? self.ServiceAttendanceID : self.ServiceItemID;
                var classID = self.ServiceItemID == null ? 407 : 406;
                var fullName = self.ServiceItemAttendanceFullName();
                if (id)
                    $.when(self.serviceItemAttendanceSearcherD).done(function (ctrl) {
                        ctrl.SetSelectedItem(id, classID, fullName, '');
                    });
            };
            //
            //
            self.CallTypeList = ko.observableArray([]);
            var createCallType = function (callType) {
                var thisObj = this;
                //
                thisObj.ID = callType.ID;
                thisObj.Name = callType.Name;
                thisObj.IsRFC = callType.IsRFC;
                thisObj.IsIncident = callType.IsIncident;
                //
                thisObj.CallTypeClick = function () {
                    var clientID = self.SelectedClient() == null ? null : self.SelectedClient().ID;
                    self.ajaxControl_CheckCallType.Ajax($('#' + self.MainRegionID),
                        {
                            url: 'sdApi/getCallRegistrationAvailable',
                            data: { callTypeID: thisObj.ID, userID: clientID },
                        },
                        function (response) {
                            if (response) {//CallRegistrationResponse
                                if (response.Message && response.Message.length > 0)
                                    require(['sweetAlert'], function () {
                                        swal(response.Message);//some problem
                                    });
                                //
                                if (response.Type != 0)
                                    return;
                                //
                                if (self.SelectedTabPage == self.tpCallType) {
                                    self.SelectedCallType(thisObj);
                                    self.tpCallType.Value(self.SelectedCallType().Name);//caption in tabControl
                                    self.tpMain.TabPageClick();//next step of registration
                                }
                            }
                        });
                };
            };
            self.LoadCallTypeList = function () {
                if (self.CallTypeList().length > 0)
                    return;
                //
                self.ajaxControl_CallTypeList.Ajax($('#' + self.MainRegionID),
                    {
                        url: 'sdApi/GetCallTypeListForClient',
                        method: 'GET'
                    },
                    function (response) {
                        if (response) {
                            self.CallTypeList.removeAll();
                            //
                            $.each(response, function (index, callType) {
                                var c = new createCallType(callType);
                                self.CallTypeList().push(c);
                            });
                            self.CallTypeList.valueHasMutated();
                        }
                    });
            };
            //
            //
            self.UrgencyList = ko.observableArray([]);
            self.getUrgencyList = function (options) {
                var data = self.UrgencyList();
                options.callback({ data: data, total: data.length });
            };
            var createUrgency = function (simpleDictionary) {
                var thisObj = this;
                //
                thisObj.ID = simpleDictionary.ID;
                thisObj.Name = simpleDictionary.Name;
                //
                thisObj.UrgencyClick = function () {
                    self.SelectedUrgency(thisObj);
                };
            };
            self.UrgencyListD = $.Deferred();//для выбора значения из загруженного справочника
            self.LoadUrgencyList = function () {
                if (self.UrgencyList().length > 0)
                    return;
                //
                self.ajaxControl_UrgencyList.Ajax($('#' + self.MainRegionID).find('.urgency'),
                    {
                        url: 'sdApi/GetUrgencyList',
                        method: 'GET'
                    },
                    function (response) {
                        if (response) {
                            self.UrgencyList.removeAll();
                            //
                            $.each(response, function (index, simpleDictionary) {
                                var u = new createUrgency(simpleDictionary);
                                self.UrgencyList().push(u);
                            });
                            self.UrgencyList.valueHasMutated();
                            if (self.UrgencyList().length > 0)
                                self.SelectedUrgency(self.UrgencyList()[0]);
                        }
                        self.UrgencyListD.resolve();
                    });
            };
            //
            //
            self.TabPages = ko.observableArray([]);
            var createTabPage = function (index, name, value, isSelected, templateName, formSettingsName, minWidth, minHeight, width, height, formButtons, checkStepCompleted) {
                var thisObj = this;
                //
                thisObj.Index = index;
                thisObj.Name = name;
                thisObj.Value = ko.observable(value);
                thisObj.IsSelected = ko.observable(isSelected);
                //
                thisObj.TemplateName = templateName;
                thisObj.FormSettingsName = formSettingsName;
                thisObj.FormButtons = formButtons;
                thisObj.MinWidth = minWidth;
                thisObj.MinHeight = minHeight;
                thisObj.ExWidth = width;
                thisObj.ExHeight = height;
                thisObj.CheckStepCompleted = checkStepCompleted;
                //
                thisObj.Caption = ko.computed(function () {
                    return thisObj.Value() ? thisObj.Name : '';
                });
                thisObj.Text = ko.computed(function () {
                    return thisObj.Value() ? thisObj.Value() : thisObj.Name;
                });
                //
                thisObj.FuncIsValid = ko.observable(function () { return true; });
                thisObj.IsValid = ko.computed(function () {
                    return thisObj.FuncIsValid()();
                });
                //
                thisObj.TabPageClick = function () {
                    if (thisObj === self.SelectedTabPage)
                        return;
                    for (var i = 1; i < thisObj.Index; i++)
                        if (!self.TabPages()[i - 1].CheckStepCompleted())
                            return;
                    //
                    self.SelectedTabPage = thisObj;
                    if (self.SelectedView() != thisObj.TemplateName)
                        self.ChangeTemplate();
                    else
                        self.InitializeTabPage();
                    //
                    $.each(self.TabPages(), function (index, tabPage) {
                        tabPage.IsSelected(tabPage === self.SelectedTabPage);
                    });
                };
                //
                if (isSelected) {
                    self.SelectedTabPage = thisObj;
                    self.ChangeTemplate();
                }
            };
            //
            //
            self.TipicalCalls = ko.observableArray([]);
            self.TipicalCallsVisible = ko.observable(false);
            self.TipicalCalls_paramCallTypeID = null;
            self.TipicalCalls_paramUserID = null;
            self.TipicalCalls_timeout = null;
            self.TipicalCallsVisible.subscribe(function (newValue) {
                self.InvalidateHelpPanel();
            });
            var createTipicalCall = function (callInfo) {
                var thisObj = this;
                //
                thisObj.ID = callInfo.ID;
                thisObj.Number = callInfo.Number;
                thisObj.CallSummaryName = callInfo.CallSummaryName;
                thisObj.ServiceItemAttendanceFullName = callInfo.ServiceItemAttendanceFullName;
                thisObj.ServiceItemID = callInfo.ServiceItemID;
                thisObj.ServiceAttendanceID = callInfo.ServiceAttendanceID;
                thisObj.ServiceID = callInfo.ServiceID;
                thisObj.UrgencyName = callInfo.UrgencyName;
                thisObj.UrgencyID = callInfo.UrgencyID;
                thisObj.Description = callInfo.Description;
                thisObj.HTMLDescription = callInfo.HTMLDescription;
                //
                thisObj.UseCallClick = function () {
                    self.CallSummaryName(thisObj.CallSummaryName);
                    //
                    self.ServiceSet(thisObj.ServiceID, thisObj.ServiceItemID, thisObj.ServiceAttendanceID, thisObj.ServiceItemAttendanceFullName)
                    //
                    $.when(self.UrgencyListD).done(function () {
                        $.each(self.UrgencyList(), function (index, urgency) {
                            if (urgency.ID == thisObj.UrgencyID) //exists
                                self.SelectedUrgency(urgency);
                        });
                    });
                    //
                    self.HTMLDescription(thisObj.HTMLDescription);
                };
                thisObj.ShowCallClick = function () {
                    var fh = new sfhModule.formHelper();
                    fh.ShowCall(thisObj.ID, fh.Mode.ReadOnly | fh.Mode.ClientMode);
                };
            };
            self.LoadTipicalCalls = function () {
                var selectedCallTypeID = self.SelectedCallType() == null ? null : self.SelectedCallType().ID;
                var selectedUserID = self.SelectedClient() == null ? null : self.SelectedClient().ID;
                //
                if (self.TipicalCalls_paramCallTypeID == selectedCallTypeID && self.TipicalCalls_paramUserID == selectedUserID)
                    return;
                //
                self.TipicalCallsVisible(false);
                self.TipicalCalls.removeAll();
                //
                if (selectedCallTypeID == null || selectedUserID == null)
                    return;
                //
                self.TipicalCalls_paramCallTypeID = selectedCallTypeID;
                self.TipicalCalls_paramUserID = selectedUserID;
                //
                if (self.TipicalCalls_timeout != null)
                    clearTimeout(self.TipicalCalls_timeout);
                self.TipicalCalls_timeout = setTimeout(function () {
                    self.ajaxControl_CallInfoList.Ajax(null,
                    {
                        url: 'sdApi/GetCallInfoList',
                        method: 'GET',
                        data: { callTypeID: self.TipicalCalls_paramCallTypeID, userID: self.TipicalCalls_paramUserID }
                    },
                    function (response) {
                        if (response) {
                            self.TipicalCalls.removeAll();
                            //
                            $.each(response, function (index, callInfo) {
                                var u = new createTipicalCall(callInfo);
                                self.TipicalCalls().push(u);
                            });
                            self.TipicalCalls.valueHasMutated();
                            if (self.TipicalCalls().length > 0 && self.SelectedTabPage == self.tpMain)
                                self.TipicalCallsVisible(true);
                            else
                                self.TipicalCallsVisible(false);
                            self.InvalidateHelpPanel();
                        }
                    });
                }, 1000);
            };
            //
            //
            self.TipicalItemAttendanceList = ko.observableArray([]);
            self.TipicalItemAttendanceListVisible = ko.observable(false);
            self.TipicalItemAttendanceListVisible.subscribe(function (newValue) {
                self.InvalidateHelpPanel();
            });
            self.TipicalItemAttendanceList_paramCallTypeID = null;
            self.TipicalItemAttendanceList_paramUserID = null;
            self.TipicalItemAttendanceList_timeout = null;
            var createTipicalItemAttendance = function (info) {
                var thisObj = this;
                //
                thisObj.ServiceID = info.ServiceID;
                thisObj.ServiceName = info.ServiceName;
                thisObj.Name = info.Name;
                thisObj.FullName = info.FullName;
                thisObj.ServiceItemID = info.ServiceItemID;
                thisObj.ServiceAttendanceID = info.ServiceAttendanceID;
                thisObj.Parameter = info.Parameter;
                thisObj.Summary = info.Summary;
                //
                thisObj.UseItemAttendanceClick = function () {
                    self.ServiceSet(thisObj.ServiceID, thisObj.ServiceItemID, thisObj.ServiceAttendanceID, thisObj.FullName, thisObj.Parameter, null, thisObj.Summary)
                };
            };
            self.LoadTipicalItemAttendanceList = function () {
                var selectedCallTypeID = self.SelectedCallType() == null ? null : self.SelectedCallType().ID;
                var selectedUserID = self.SelectedClient() == null ? null : self.SelectedClient().ID;
                //
                if (self.TipicalItemAttendanceList_paramCallTypeID == selectedCallTypeID && self.TipicalItemAttendanceList_paramUserID == selectedUserID)
                    return;
                //
                self.TipicalItemAttendanceListVisible(false);
                self.TipicalItemAttendanceList.removeAll();
                //
                if (selectedCallTypeID == null || selectedUserID == null)
                    return;
                //
                self.TipicalItemAttendanceList_paramCallTypeID = selectedCallTypeID;
                self.TipicalItemAttendanceList_paramUserID = selectedUserID;
                //
                if (self.TipicalItemAttendanceList_timeout != null)
                    clearTimeout(self.TipicalItemAttendanceList_timeout);
                self.TipicalItemAttendanceList_timeout = setTimeout(function () {
                    self.ajaxControl_ServiceItemAttendanceInfoList.Ajax(null,
                        {
                            url: 'sdApi/GetServiceItemAttendanceInfoList',
                            method: 'GET',
                            data: { callTypeID: self.TipicalItemAttendanceList_paramCallTypeID, userID: self.TipicalItemAttendanceList_paramUserID }
                        },
                        function (response) {
                            if (response) {
                                self.TipicalItemAttendanceList.removeAll();
                                //
                                $.each(response, function (index, info) {
                                    var s = new createTipicalItemAttendance(info);
                                    self.TipicalItemAttendanceList().push(s);
                                });
                                self.TipicalItemAttendanceList.valueHasMutated();
                                if (self.TipicalItemAttendanceList().length > 0 && self.SelectedTabPage == self.tpMain)
                                    self.TipicalItemAttendanceListVisible(true);
                                else
                                    self.TipicalItemAttendanceListVisible(false);
                                self.InvalidateHelpPanel();
                            }
                        });
                }, 100);
            };
            //
            self.ServicePlaceCallID = ko.observable(null);
            self.ServicePlaceCallClassID = ko.observable(null);
            self.ServicePlaceCallName = ko.observable('');
            self.ajaxControl_ClientInfo = new ajaxLib.control();
            self.onLocationChanged = function (objectInfo) {//когда новое местоположение будет выбрано
                if (!objectInfo)
                    return;
                self.ajaxControl_ClientInfo.Ajax(null,
                    {
                        dataType: "json",
                        url: 'searchApi/GetCallClientLocationInfo',
                        method: 'GET',
                        data: {
                            LocationID: objectInfo.ID,
                            LocationClassID: objectInfo.ClassID
                        }
                    },
                    function (response) {
                        if (response && response.Result === 0) {
                            var info = response.ClientLocationInfo;
                            self.ServicePlaceCallID(info.PlaceID);
                            self.ServicePlaceCallClassID(info.PlaceClassID);
                            self.ServicePlaceCallName(info.PlaceFullName);
                            self.ServicePlaceCallName.valueHasMutated();
                        }
                    });

            };
            //
            self.EditLocation = function () {
                showSpinner();
                //
                require(['../Templates/ClientSearch/frmCallClientEditLocation', 'sweetAlert'], function (module) {
                    //
                    var options = {
                        PlaceID: self.ServicePlaceCallID,
                        PlaceClassID: self.ServicePlaceCallClassID,
                        PlaceName: self.ServicePlaceCallName

                    };

                    var saveLocation = function (objectInfo) {
                        if (!objectInfo)
                            return;
                        self.onLocationChanged(objectInfo);
                    };
                    //
                    module.ShowDialog(options, saveLocation, true);
                });
            };
            //
            self.ajaxControl = new ajaxLib.control();
            self.GetWorkPlaceInfo = function (id) {
                var valueListD = $.Deferred();
                self.ajaxControl.Ajax(null,
                    {
                        url: 'searchApi/getClientInfo',
                        method: 'POST',
                        data: {
                            ClientID: id
                        }
                    },
                    function (response) {
                        if (response && response.Result === 0) {
                            var info = response.ClientLocationInfo;
                            var locInfo = {
                                ID: info.WorkPlaceID,
                                ClassID: 22
                            }
                            self.onLocationChanged(locInfo);
                        }
                        valueListD.resolve();
                    });
                return valueListD.promise();
            };
            //
            self.KBArticles = ko.observableArray([]);
            self.KBArticlesVisible = ko.observable(false);
            self.KBArticlesVisible.subscribe(function (newValue) {
                self.InvalidateHelpPanel();
            });
            self.KBArticles_paramCallSummaryName = null;
            self.KBArticles_paramServiceItemAttendanceID = null;
            self.KBArticles_timeout = null;
            var createKBArticle = function (kbInfo) {
                var thisObj = this;
                //
                thisObj.ID = kbInfo.ID;
                thisObj.Name = kbInfo.Name;
                thisObj.TagString = kbInfo.TagString;
                thisObj.Description = kbInfo.Description;
                thisObj.HTMLDescription = kbInfo.HTMLDescription;
                //
                thisObj.UseKBArticleClick = function () {
                    self.CallSummaryName(thisObj.Name);
                    self.HTMLDescription(thisObj.HTMLDescription);
                };
                thisObj.ShowKBArticleClick = function () {
                    var fh = new fhModule.formHelper();
                    fh.ShowKBAView(thisObj.ID);
                };
                thisObj.RegisterCallByKBArticleClick = function () {
                    require(['sweetAlert'], function () {
                        swal({
                            title: getTextResource('UseKBArticleQuestion'),
                            text: thisObj.Name,
                            showCancelButton: true,
                            closeOnConfirm: true,
                            closeOnCancel: true,
                            confirmButtonText: getTextResource('ButtonOK'),
                            cancelButtonText: getTextResource('ButtonCancel')
                        },
                        function (value) {
                            if (value == true)
                                setTimeout(function () {
                                    if (self.CallSummaryName().trim() == '')
                                        self.CallSummaryName(thisObj.Name);
                                    if (self.HTMLDescription().trim() == '')
                                        self.HTMLDescription(thisObj.HTMLDescription);
                                    //
                                    var d = self.ValidateAndRegisterCall(false, thisObj.ID);
                                    $.when(d).done(function (result) {
                                        if (result == null)
                                            return;
                                        //
                                        self.ID = result.CallID;
                                        self.frm.Close();
                                        //
                                        var fh = new sfhModule.formHelper();
                                        fh.ShowCallByContext(self.ID);
                                    });
                                }, 1000);//swal close timeout
                        });
                    });
                };
            };
            self.LoadKBArticleList = function () {
                var selectedCallSummaryName = self.CallSummaryName();
                var selectedUserID = self.SelectedClient() == null ? null : self.SelectedClient().ID;
                var selectedServiceItemAttendanceID = self.ServiceAttendanceID == null ? self.ServiceItemID : self.ServiceAttendanceID;
                //
                if (selectedServiceItemAttendanceID == self.KBArticles_paramServiceItemAttendanceID && selectedCallSummaryName == self.KBArticles_paramCallSummaryName)
                    return;
                //
                self.KBArticlesVisible(false);
                self.KBArticles.removeAll();
                //
                self.KBArticles_paramCallSummaryName = selectedCallSummaryName;
                self.KBArticles_paramServiceItemAttendanceID = selectedServiceItemAttendanceID;
                //
                if (selectedCallSummaryName.length == 0 || selectedUserID == null || selectedServiceItemAttendanceID == null)
                    return;
                //
                if (self.KBArticles_timeout != null)
                    clearTimeout(self.KBArticles_timeout);
                self.KBArticles_timeout = setTimeout(function () {
                    self.ajaxControl_KBArticleList.Ajax(null,
                        {
                            url: 'sdApi/SearchKBArticleInfoList',
                            method: 'GET',
                            data: {
                                text: self.KBArticles_paramCallSummaryName,
                                clientRegistration: true,
                                serviceItemAttendanceID: self.KBArticles_paramServiceItemAttendanceID
                            }
                        },
                        function (response) {
                            self.KBArticles.removeAll();
                            //
                            if (response) {
                                $.each(response, function (index, kbInfo) {
                                    var kba = new createKBArticle(kbInfo);
                                    self.KBArticles().push(kba);
                                });
                            }
                            self.KBArticles.valueHasMutated();
                            if (self.KBArticles().length > 0 && self.SelectedTabPage == self.tpMain)
                                self.KBArticlesVisible(true);
                            else
                                self.KBArticlesVisible(false);
                            self.InvalidateHelpPanel();
                        });
                }, 1000);
            };
        }
    }
    return module;
});
