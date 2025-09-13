define(['knockout', 'jquery', 'usualForms', 'sdForms', 'ajax', 'parametersControl', 'comboBox'], function (ko, $, fhModule, sfhModule, ajaxLib, pcLib) {
    var module = {
        ViewModel: function (mainRegionID, objectClassID, objectID, dependencyList) {
            var self = this;
            //
            //outer actions
            self.InvalidateHelpPanel = undefined;
            self.frm = undefined;
            //
            //vars
            self.formClassID = 701;//OBJ_CALL
            self.MainRegionID = mainRegionID;
            self.ID = null;//for registered call
            self.renderedD = $.Deferred();
            //
            self.ObjectClassID = objectClassID;//объект, с которым связана заявка
            self.ObjectID = objectID;//объект, с которым связана заявка            
            //
            //tab pages
            {
                self.modes = {
                    nothing: 'nothing',
                    main: 'main',
                    parameterPrefix: 'parameter_'
                };
                //
                self.mode = ko.observable(self.modes.nothing);
                self.mode.subscribe(function (newValue) {
                    if (newValue == self.modes.nothing)
                        return;
                    //
                    if (newValue == self.modes.main) {
                    }
                    else if (newValue.indexOf(self.modes.parameterPrefix) != -1)
                        self.InitializeParametersTabs();
                });
            }
            //
            //priority / influence / urgency
            {
                self.PriorityID = null;
                self.PriorityName = ko.observable(getTextResource('PromptPriority'));
                self.PriorityColor = ko.observable('');
                //
                self.InfluenceID = null;
                self.UrgencyID = null;
                //
                self.priorityControl = null;
                self.LoadPriorityControl = function () {
                    require(['models/SDForms/SDForm.Priority'], function (prLib) {
                        if (self.priorityControl == null || self.priorityControl.IsLoaded() == false) {
                            self.priorityControl = new prLib.ViewModel($('#' + self.MainRegionID).find('.b-requestDetail-menu__priority'), self, false);
                            self.priorityControl.Initialize();
                        }
                        $.when(self.priorityControl.Load(null, 701, self.UrgencyID, self.InfluenceID, self.PriorityID)).done(function (result) {
                        });
                    });
                };
                self.RefreshPriority = function (priorityObj) {//invokes from priorityControl
                    if (priorityObj == null)
                        return;
                    //
                    self.PriorityName(priorityObj.Name);
                    self.PriorityColor(priorityObj.Color);
                    self.PriorityID = priorityObj.ID;
                    //
                    self.InfluenceID = self.priorityControl.CurrentInfluenceID();
                    self.UrgencyID = self.priorityControl.CurrentUrgencyID();
                };
            }
            //
            //callSummary
            {
                self.CallSummaryName = ko.observable('');
                self.CallSummaryName.subscribe(function (newValue) {
                    self.LoadKBArticleList();//при смене краткого описания - поиск похожих статей БЗ
                });
                //
                self.callSummarySearcher = null;
                self.callSummarySearcherD = $.Deferred();
                self.ajaxControl_ServiceItemAttendance = new ajaxLib.control();
                self.InitializeCallSummarySearcher = function () {
                    var fh = new fhModule.formHelper();
                    var callSummaryD = fh.SetTextSearcherToField(
                        $('#' + self.MainRegionID).find('.callSummarySearcher'),
                        'CallSummarySearcher',
                        null,
                        [self.ServiceItemID ? self.ServiceItemID : (self.ServiceAttendanceID ? self.ServiceAttendanceID : undefined),
                        self.CallTypeHelper.SelectedItem() ? self.CallTypeHelper.SelectedItem().ID : undefined],
                        function (objectInfo) {//select
                            self.CallSummaryName(objectInfo.FullName);
                            //         
                            var clientID = self.ClientID();
                            self.ajaxControl_ServiceItemAttendance.Ajax($('#' + self.MainRegionID).find('.serviceItemAttendance'),
                                {
                                    url: 'sdApi/GetServiceItemAttendanceInfoByCallSummaryID',
                                    method: 'GET',
                                    data: { callSummaryID: objectInfo.ID, userID: clientID }
                                },
                                function (response) {
                                    if (response)
                                        self.ServiceSet(response.ServiceID, response.ServiceItemID, response.ServiceAttendanceID, response.FullName, response.Parameter, null, response.Summary);
                                });
                        },
                        function () {//reset
                            self.CallSummaryName('');
                        });
                    $.when(callSummaryD).done(function (ctrl) {
                        self.callSummarySearcher = ctrl;
                        self.callSummarySearcherD.resolve(ctrl);
                        ctrl.CurrentUserID = self.ClientID();
                        //
                        ctrl.LoadD.done(function () {
                            $('#' + self.MainRegionID).find('.callSummarySearcher').focus();
                        });
                    });
                };
                //
                self.EditCallSummaryName = function () {
                    showSpinner();
                    var fh = new fhModule.formHelper(true);
                    var options = {
                        fieldName: 'Call.CallSummary',
                        fieldFriendlyName: getTextResource('CallSummary'),
                        oldValue: self.CallSummaryName().length > 0 ? { ID: null, ClassID: 132, FullName: self.CallSummaryName() } : null, //OBJ_CallSummary = 132
                        searcherName: 'CallSummarySearcher',
                        searcherPlaceholder: getTextResource('PromptCallSummary'),
                        searcherParams: [
                            self.ServiceItemID ? self.ServiceItemID : (self.ServiceAttendanceID ? self.ServiceAttendanceID : undefined),
                            self.CallTypeHelper.SelectedItem() ? self.CallTypeHelper.SelectedItem().ID : undefined],
                        allowAnyText: true,
                        onSave: function (objectInfo) {
                            self.CallSummaryName(objectInfo ? objectInfo.FullName : '');
                        },
                        nosave: true
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.searcherEdit, options);
                };
            }
            //
            //description
            {
                self.htmlDescriptionControlD = $.Deferred();
                self.IsDescriptionContainerVisible = ko.observable(true);
                self.ToggleDescriptionContainer = function () {
                    self.IsDescriptionContainerVisible(!self.IsDescriptionContainerVisible());
                };
                //
                self.htmlDescriptionControl = null;
                self.InitializeDescription = function () {
                    var htmlElement = $('#' + self.MainRegionID).find('.description');
                    if (self.htmlDescriptionControl == null)
                        require(['htmlControl'], function (htmlLib) {
                            self.htmlDescriptionControl = new htmlLib.control(htmlElement);
                            self.htmlDescriptionControlD.resolve();
                            self.htmlDescriptionControl.OnHTMLChanged = function (htmlValue) {
                                self.Description(htmlValue);
                            };
                        });
                    else
                        self.htmlDescriptionControl.Load(htmlElement);
                };
                //
                self.Description = ko.observable('');
                self.Description.subscribe(function (newValue) {
                    if (self.htmlDescriptionControl != null)
                        self.htmlDescriptionControl.SetHTML(newValue);
                });
                //
                self.EditDescription = function () {
                    showSpinner();
                    var fh = new fhModule.formHelper(true);
                    var options = {
                        fieldName: 'Call.Description',
                        fieldFriendlyName: getTextResource('Description'),
                        oldValue: self.Description(),
                        onSave: function (newHTML) {
                            self.Description(newHTML);
                        },
                        nosave: true
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.htmlEdit, options);
                };
            }
            //
            //attachments
            {
                self.attachmentsControl = null;
                self.LoadAttachmentsControl = function () {
                    require(['fileControl'], function (fcLib) {
                        if (self.attachmentsControl != null)
                            self.attachmentsControl.RemoveUploadedFiles();//previous object                   
                        //
                        if (self.attachmentsControl == null || self.attachmentsControl.IsLoaded() == false) {
                            var attachmentsElement = $('#' + self.MainRegionID).find('.documentList');
                            self.attachmentsControl = new fcLib.control(attachmentsElement, '.ui-dialog', '.b-requestDetail__files-addBtn');
                        }
                        self.attachmentsControl.ReadOnly(false);
                    });
                };
            }
            //
            //solution
            {
                self.IsSolutionContainerVisible = ko.observable(false);
                self.ToggleSolutionContainer = function () {
                    self.IsSolutionContainerVisible(!self.IsSolutionContainerVisible());
                };
                //
                self.htmlSolutionControl = null;
                self.InitializeSolution = function () {
                    var htmlElement = $('#' + self.MainRegionID).find('.solution');
                    if (self.htmlSolutionControl == null)
                        require(['htmlControl'], function (htmlLib) {
                            self.htmlSolutionControl = new htmlLib.control(htmlElement);
                            self.htmlSolutionControl.OnHTMLChanged = function (htmlValue) {
                                self.Solution(htmlValue);
                            };
                        });
                    else
                        self.htmlSolutionControl.Load(htmlElement);
                };
                //
                self.Solution = ko.observable('');
                self.Solution.subscribe(function (newValue) {
                    if (self.htmlSolutionControl != null)
                        self.htmlSolutionControl.SetHTML(newValue);
                });
                //
                self.EditSolution = function () {
                    showSpinner();
                    var fh = new fhModule.formHelper(true);
                    var options = {
                        fieldName: 'Call.Solution',
                        fieldFriendlyName: getTextResource('Solution'),
                        oldValue: self.Solution(),
                        onSave: function (newHTML) {
                            self.Solution(newHTML);
                        },
                        nosave: true
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.htmlEdit, options);
                };
            }
            //
            //for comboBox
            {
                self.createComboBoxItem = function (simpleDictionary) {
                    var thisObj = this;
                    //
                    thisObj.ID = simpleDictionary.ID;
                    thisObj.Name = simpleDictionary.Name;
                };
                //
                self.createComboBoxHelper = function (container_selector, getUrl, comboBoxFunc) {
                    var thisObj = this;
                    if (!comboBoxFunc)
                        comboBoxFunc = self.createComboBoxItem;
                    //
                    thisObj.SelectedItem = ko.observable(null);
                    //
                    thisObj.ItemList = ko.observableArray([]);
                    thisObj.ItemListD = $.Deferred();
                    thisObj.getItemList = function (options) {
                        var data = thisObj.ItemList();
                        options.callback({ data: data, total: data.length });
                    };
                    //
                    thisObj.ajaxControl = new ajaxLib.control();
                    thisObj.LoadList = function () {
                        thisObj.ajaxControl.Ajax($(container_selector),
                            {
                                url: getUrl,
                                method: 'GET'
                            },
                            function (response) {
                                if (response) {
                                    thisObj.ItemList.removeAll();
                                    //
                                    $.each(response, function (index, simpleDictionary) {
                                        var u = new comboBoxFunc(simpleDictionary);
                                        thisObj.ItemList().push(u);
                                    });
                                    thisObj.ItemList.valueHasMutated();
                                }
                                thisObj.ItemListD.resolve();
                            });
                    };
                    //
                    thisObj.GetObjectInfo = function (classID) {
                        return thisObj.SelectedItem() ? { ID: thisObj.SelectedItem().ID, ClassID: classID, FullName: thisObj.SelectedItem().Name } : null;
                    };
                    thisObj.SetSelectedItem = function (id) {
                        $.when(thisObj.ItemListD).done(function () {
                            var item = null;
                            if (id != undefined && id != null)
                                for (var i = 0; i < thisObj.ItemList().length; i++) {
                                    var tmp = thisObj.ItemList()[i];
                                    if (tmp.ID == id) {
                                        item = tmp;
                                        break;
                                    }
                                }
                            thisObj.SelectedItem(item);
                        });
                    };
                }
            }
            //
            //RFC result
            {
                self.RFCResultHelper = new self.createComboBoxHelper('#' + self.MainRegionID + ' .rfcResult', 'sdApi/GetRFCResultList');
                self.EditRFCResult = function () {
                    showSpinner();
                    var fh = new fhModule.formHelper(true);
                    var options = {
                        fieldName: 'Call.RFCResult',
                        fieldFriendlyName: getTextResource('RFCResult'),
                        oldValue: self.RFCResultHelper.GetObjectInfo(706),
                        searcherName: 'RFCResultSearcher',
                        searcherCurrentUser: self.ClientID(),
                        onSave: function (objectInfo) {
                            self.RFCResultHelper.SetSelectedItem(objectInfo ? objectInfo.ID : null);
                        },
                        nosave: true
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.searcherEdit, options);
                };
            }
            //
            //incident result
            {
                self.IncidentResultHelper = new self.createComboBoxHelper('#' + self.MainRegionID + ' .incidentResult', 'sdApi/GetIncidentResultList');
                self.EditIncidentResult = function () {
                    showSpinner();
                    var fh = new fhModule.formHelper(true);
                    var options = {
                        fieldName: 'Call.IncidentResult',
                        fieldFriendlyName: getTextResource('IncidentResult'),
                        oldValue: self.IncidentResultHelper.GetObjectInfo(707),
                        searcherName: 'IncidentResultSearcher',
                        searcherCurrentUser: self.ClientID(),
                        onSave: function (objectInfo) {
                            self.IncidentResultHelper.SetSelectedItem(objectInfo ? objectInfo.ID : null);
                        },
                        nosave: true
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.searcherEdit, options);
                };
            }
            //
            //callType
            {
                self.createCallType = function (callType) {
                    var thisObj = this;
                    //
                    thisObj.ID = callType.ID;
                    thisObj.Name = callType.Name;
                    thisObj.IsRFC = callType.IsRFC;
                    thisObj.IsIncident = callType.IsIncident;
                };
                //
                self.CallTypeHelper = new self.createComboBoxHelper('#' + self.MainRegionID + ' .callType', 'sdApi/GetCallTypeList', self.createCallType);
                self.EditCallType = function () {
                    showSpinner();
                    var fh = new fhModule.formHelper(true);
                    var options = {
                        fieldName: 'Call.CallType',
                        fieldFriendlyName: getTextResource('CallType'),
                        oldValue: self.CallTypeHelper.GetObjectInfo(136),
                        searcherName: 'CallTypeSearcher',
                        searcherCurrentUser: self.ClientID(),
                        searcherPlaceholder: getTextResource('PromptType'),
                        onSave: function (objectInfo) {
                            self.CallTypeHelper.SetSelectedItem(objectInfo ? objectInfo.ID : null);
                        },
                        nosave: true
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.searcherEdit, options);
                };
                //
                self.CallTypeHelper.SelectedItem.subscribe(function (newValue) {
                    $.when(self.callSummarySearcherD).done(function () {
                        self.callSummarySearcher.SetSearchParameters([self.ServiceItemID ? self.ServiceItemID : (self.ServiceAttendanceID ? self.ServiceAttendanceID : undefined), self.CallTypeHelper.SelectedItem() ? self.CallTypeHelper.SelectedItem().ID : undefined]);
                    });
                    $.when(self.serviceItemAttendanceSearcherD).done(function () {
                        self.serviceItemAttendanceSearcher.SetSearchParameters([self.CallTypeHelper.SelectedItem() ? self.CallTypeHelper.SelectedItem().ID : undefined]);
                    });
                    //
                    self.LoadTipicalCalls();
                    self.LoadTipicalItemAttendanceList();
                    //
                    if (newValue) {
                        if (self.ServiceItemID && newValue.IsRFC ||
                            self.ServiceAttendanceID && !newValue.IsRFC)
                            self.ServiceSet(null, null, null, '');
                    }
                });
                //
                self.IsRFCCallType = ko.computed(function () {
                    var callType = self.CallTypeHelper.SelectedItem();
                    if (!callType)
                        return false;
                    else
                        return callType.IsRFC;
                });
                self.IsIncidentResultCallType = ko.computed(function () {
                    var callType = self.CallTypeHelper.SelectedItem();
                    if (!callType)
                        return false;
                    else
                        return callType.IsIncident;
                });
            }
            //
            //receit Type
            {
                self.ReceiptTypetHelper = new self.createComboBoxHelper('#' + self.MainRegionID + ' .receiptType', 'sdApi/GetReceiptTypeList');
                self.EditReceiptType = function () {
                    showSpinner();
                    var fh = new fhModule.formHelper(true);
                    var options = {
                        fieldName: 'Call.ReceiptType',
                        fieldFriendlyName: getTextResource('CallReceiptType'),
                        comboBoxGetValueUrl: 'sdApi/GetReceiptTypeList',
                        oldValue: self.ReceiptTypetHelper.SelectedItem() ? { ID: self.ReceiptTypetHelper.SelectedItem().ID, Name: self.ReceiptTypetHelper.SelectedItem().Name } : null,
                        onSave: function (selectedValue) {
                            self.ReceiptTypetHelper.SetSelectedItem(selectedValue ? selectedValue.ID : null);
                        },
                        nosave: true
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.comboBoxEdit, options);
                };
            }
            //
            //service
            {
                self.ServiceID = null;
                self.ServiceItemID = null;
                self.ServiceAttendanceID = null;
                self.ServiceItemAttendanceFullName = ko.observable('');
                self.ServiceSummary = ko.observable('');
                //
                self.ServiceClear = function () {
                    self.ServiceItemAttendanceFullName('');
                    //
                    self.ServiceID = null;
                    self.ServiceItemID = null;
                    self.ServiceAttendanceID = null;
                    //
                    self.OnParametersChanged();
                    //
                    $.when(self.callSummarySearcherD).done(function () {
                        self.callSummarySearcher.SetSearchParameters([self.ServiceItemID ? self.ServiceItemID : (self.ServiceAttendanceID ? self.ServiceAttendanceID : undefined), self.CallTypeHelper.SelectedItem() ? self.CallTypeHelper.SelectedItem().ID : undefined]);
                    });
                    self.LoadKBArticleList();
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
                    //
                    if (serviceParameter && self.Description().length == 0) {
                        var html = '<html><body><p style="white-space:pre-wrap">' + serviceParameter.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</p></body></html>';
                        self.Description(html);
                    }
                    //
                    if (!self.AddAs)//параметры уже созданы
                        self.OnParametersChanged();
                    //
                    $.when(self.callSummarySearcherD).done(function () {
                        self.callSummarySearcher.SetSearchParameters([self.ServiceItemID ? self.ServiceItemID : (self.ServiceAttendanceID ? self.ServiceAttendanceID : undefined), self.CallTypeHelper.SelectedItem() ? self.CallTypeHelper.SelectedItem().ID : undefined]);
                    });
                    self.LoadKBArticleList();
                    //
                    if (summaryName && summaryName != '' && !self.CallSummaryName().length > 0)
                        self.CallSummaryName(summaryName);
                    self.SummaryDefaultName(summaryName ? summaryName : '');
                };
                self.SummaryDefaultName = ko.observable('');
                //
                self.serviceItemAttendanceSearcher = null;
                self.serviceItemAttendanceSearcherD = $.Deferred();
                self.InitializeServiceSearcher = function () {
                    var fh = new fhModule.formHelper();
                    //
                    var serviceSearcherExtensionLoadedD = $.Deferred();
                    var serviceD = fh.SetTextSearcherToField(
                        $('#' + self.MainRegionID).find('.serviceItemAttendance'),
                        'ServiceItemAndAttendanceSearcher',
                        'SearchControl/SearchServiceItemAttendanceControl',
                        [self.CallTypeHelper.SelectedItem() ? self.CallTypeHelper.SelectedItem().ID : undefined],
                        function (objectInfo) {//select        
                            var clientID = self.ClientID();
                            //
                            self.ajaxControl_ServiceItemAttendance.Ajax($('#' + self.MainRegionID).find('.serviceItemAttendance'),
                                {
                                    url: 'sdApi/GetServiceItemAttendanceInfo',
                                    method: 'GET',
                                    data: { serviceItemAttendanceID: objectInfo.ID, userID: clientID }
                                },
                                function (response) {
                                    if (response)
                                        self.ServiceSet(response.ServiceID, response.ServiceItemID, response.ServiceAttendanceID, response.FullName, response.Parameter, false, response.Summary);
                                });
                        },
                        function () {//reset
                            self.ServiceClear();
                        },
                        function (selectedItem) {//close
                            if (!selectedItem)
                                self.ServiceClear();
                        },
                        serviceSearcherExtensionLoadedD);
                    $.when(serviceD).done(function (vm) {//after load searcher
                        self.serviceItemAttendanceSearcher = vm;
                        self.serviceItemAttendanceSearcherD.resolve(vm);
                        vm.CurrentUserID = self.ClientID();
                        //
                        vm.SelectFromServiceCatalogueClick = function () {
                            vm.Close();//close dropDownMenu
                            var callType = self.CallTypeHelper.SelectedItem();
                            if (callType == null)
                                return;
                            var mode = fh.ServiceCatalogueBrowserMode.Default;
                            if (callType.ID != '00000000-0000-0000-0000-000000000000') {//default callType
                                if (callType.IsRFC == true)
                                    mode = fh.ServiceCatalogueBrowserMode.ShowOnlyServiceAttendances;
                                else
                                    mode = fh.ServiceCatalogueBrowserMode.ShowOnlyServiceItems;
                            }
                            //
                            if (!self.ShowNotAvailableBySlaServices)
                                mode |= fh.ServiceCatalogueBrowserMode.FilterBySLA;
                            //
                            var clientID = self.ClientID();
                            var result = fh.ShowServiceCatalogueBrowser(mode, clientID, self.ServiceID);
                            $.when(result).done(function (serviceItemAttendance) {
                                if (serviceItemAttendance)
                                    self.ServiceSet(serviceItemAttendance.Service.ID, serviceItemAttendance.ClassID == 406 ? serviceItemAttendance.ID : null, serviceItemAttendance.ClassID == 407 ? serviceItemAttendance.ID : null, serviceItemAttendance.FullName(), serviceItemAttendance.Parameter, null, serviceItemAttendance.Summary);
                            });
                        };
                        //
                        vm.HardToChooseClick = function () { };
                        vm.HardToChooseClickVisible = ko.observable(false);
                        //      
                        serviceSearcherExtensionLoadedD.resolve();
                        $.when(vm.LoadD).done(function () {
                            $('#' + vm.searcherDivID).find('.ui-dialog-buttonset').css({ opacity: 1 });
                        });
                    });
                };
                //
                self.EditServiceItemAttendance = function () {
                    var getObjectInfo = function () {
                        if (self.ServiceItemID)
                            return { ID: self.ServiceItemID, ClassID: 406, FullName: self.ServiceItemAttendanceFullName() };
                        else if (self.ServiceAttendanceID)
                            return { ID: self.ServiceAttendanceID, ClassID: 407, FullName: self.ServiceItemAttendanceFullName() };
                        else
                            return null;
                    };
                    var extensionLoadD = $.Deferred();
                    //
                    showSpinner();
                    var fh = new fhModule.formHelper(true);
                    var options = {
                        fieldName: 'Call.ServiceItemAttendance',//одновременно оба поля
                        fieldFriendlyName: getTextResource('CallServiceItemOrAttendance'),
                        oldValue: getObjectInfo(),
                        searcherName: 'ServiceItemAndAttendanceSearcher',
                        searcherTemplateName: 'SearchControl/SearchServiceItemAttendanceControl',//иной шаблон, дополненительные кнопки
                        searcherParams: [self.CallTypeHelper.SelectedItem() ? self.CallTypeHelper.SelectedItem().ID : undefined],//параметры искалки - тип заявки, для фильтрации - только элементы / только услуги
                        searcherLoadD: extensionLoadD,//ожидание дополнений для модели искалки
                        searcherCurrentUser: self.ClientID(),
                        searcherPlaceholder: getTextResource('PromptServiceItemAttendance'),
                        searcherLoad: function (vm, setObjectInfoFunc) {//дополнения искалки
                            vm.CurrentUserID = null;//для фильтрации данных по доступности их пользователю (клиенту)
                            vm.SelectFromServiceCatalogueClick = function () {//кнопка выбора из каталога сервисов
                                vm.Close();//close dropDownMenu
                                var callType = self.CallTypeHelper.SelectedItem();
                                if (callType == null)
                                    return;
                                var mode = fh.ServiceCatalogueBrowserMode.Default;
                                if (callType.ID != '00000000-0000-0000-0000-000000000000') {//default callType
                                    if (callType.IsRFC == true)
                                        mode = fh.ServiceCatalogueBrowserMode.ShowOnlyServiceAttendances;
                                    else
                                        mode = fh.ServiceCatalogueBrowserMode.ShowOnlyServiceItems;
                                }
                                if (!self.ShowNotAvailableBySlaServices)
                                    mode |= fh.ServiceCatalogueBrowserMode.FilterBySLA;
                                //
                                var clientID = self.ClientID();//показываем, что есть недоступное этому клиенту, но позволяем выбрать
                                showSpinner();
                                var result = fh.ShowServiceCatalogueBrowser(mode, clientID, self.ServiceID);
                                $.when(result).done(function (serviceItemAttendance) {
                                    if (serviceItemAttendance && setObjectInfoFunc)
                                        setObjectInfoFunc({
                                            ID: serviceItemAttendance.ID,
                                            ClassID: serviceItemAttendance.ClassID,
                                            FullName: serviceItemAttendance.FullName(),
                                            Details: null
                                        });
                                });
                            };
                            vm.HardToChooseClick = function () { };//кнопка затрудняюсь выбрать
                            vm.HardToChooseClickVisible = ko.observable(false);
                            //
                            extensionLoadD.resolve();//можно рендерить искалку, формирование модели окончено
                            $.when(vm.LoadD).done(function () {
                                $('#' + vm.searcherDivID).find('.ui-dialog-buttonset').css({ opacity: 1 });//show buttons
                            });
                        },
                        onSave: function (objectInfo) {
                            if (objectInfo) {
                                var clientID = self.ClientID();
                                self.ajaxControl_ServiceItemAttendance.Ajax($('#' + self.MainRegionID).find('.serviceItemAttendance'),
                                    {
                                        url: 'sdApi/GetServiceItemAttendanceInfo',
                                        method: 'GET',
                                        data: { serviceItemAttendanceID: objectInfo.ID, userID: clientID }
                                    },
                                    function (response) {
                                        if (response)
                                            self.ServiceSet(response.ServiceID, response.ServiceItemID, response.ServiceAttendanceID, response.FullName, response.Parameter, false, response.Summary);
                                    });
                            }
                            else
                                self.ServiceSet(null, null, null, '', null, false,'');
                        },
                        nosave: true
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.searcherEdit, options);
                };
            }
            //
            //for all user controls
            {
                self.CanEdit = ko.computed(function () {
                    return true;
                });
            }
            //
            //client
            {
                self.ClientLoaded = ko.observable(false);
                self.ClientID = ko.observable(null);
                self.ClientID.subscribe(function (newValue) {
                    self.LoadTipicalCalls();
                    if (self.TipicalCalls().length > 0)
                        self.TipicalCallsVisible(true);
                    //
                    self.LoadTipicalItemAttendanceList();
                    if (self.TipicalItemAttendanceList().length > 0)
                        self.TipicalItemAttendanceListVisible(true);
                    //
                    var clientID = newValue;
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
                });
                self.Client = ko.observable(null);
                //
                self.InitializeClient = function () {
                    require(['models/SDForms/SDForm.User'], function (userLib) {
                        if (self.ClientLoaded() == false) {
                            if (self.ClientID()) {
                                var options = {
                                    UserID: self.ClientID(),
                                    UserType: userLib.UserTypes.client,
                                    UserName: null,
                                    EditAction: self.EditClient,
                                    RemoveAction: self.DeleteClient
                                };
                                var user = new userLib.User(self, options);
                                self.Client(user);
                                $.when(self.GetWorkPlaceInfo(user.ID)).done(function () {
                                    self.ClientLoaded(true);
                                });
                            }
                            else
                                self.Client(new userLib.EmptyUser(self, userLib.UserTypes.client, self.EditClient));
                        }
                    });
                };
                self.EditClient = function () {
                    showSpinner();
                    require(['models/SDForms/SDForm.User'], function (userLib) {
                        var fh = new fhModule.formHelper(true);
                        var options = {
                            fieldName: 'Call.Client',
                            fieldFriendlyName: getTextResource('Client'),
                            oldValue: self.ClientLoaded() ? { ID: self.Client().ID(), ClassID: 9, FullName: self.Client().FullName() } : null,
                            object: ko.toJS(self.Client()),
                            searcherName: 'WebUserSearcher',
                            searcherPlaceholder: getTextResource('EnterFIO'),
                            //searcherCurrentUser: self.ClientID(), //не нужно учитывать клиента
                            onSave: function (objectInfo) {
                                self.ClientLoaded(false);
                                self.Client(new userLib.EmptyUser(self, userLib.UserTypes.client, self.EditClient));
                                self.ClientID(objectInfo ? objectInfo.ID : null);
                                //
                                self.InitializeClient();
                                self.CallServicePlaceVisible(true);
                            },
                            nosave: true
                        };
                        fh.ShowSDEditor(fh.SDEditorTemplateModes.searcherEdit, options);
                    });
                };
                self.DeleteClient = function () {
                    require(['models/SDForms/SDForm.User'], function (userLib) {
                        self.ClientLoaded(false);
                        self.ClientID(null);
                        self.Client(new userLib.EmptyUser(self, userLib.UserTypes.client, self.EditClient));
                        self.CallServicePlaceVisible(false);
                    });
                };
            }
            //
            self.CallServicePlaceVisible = ko.observable(false);
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
                            self.ServicePlaceCallClassID (info.PlaceClassID);
                            self.ServicePlaceCallName(info.PlaceName);
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
            self.ajaxControl = new ajaxLib.control();
            self.GetWorkPlaceInfo = function (id) {
                var valueListD = $.Deferred();
                self.ajaxControl.Ajax(null,
                    {
                        url: 'searchApi/getClientInfo',
                        method: 'POST',
                        data: {
                            ClientID: id,
                        }
                    },
                    function (response) {
                        if (response && response.Result === 0) {
                            var info = response.ClientLocationInfo;
                            self.ServicePlaceCallID(info.WorkPlaceID);
                            self.ServicePlaceCallClassID(22);
                            self.ServicePlaceCallName(info.WorkPlaceName);
                            self.ServicePlaceCallName.valueHasMutated();
                        }
                        valueListD.resolve();
                    });
                return valueListD.promise();
            };
            //
            //initiator
            {
                self.InitiatorLoaded = ko.observable(false);
                self.InitiatorID = null;
                self.Initiator = ko.observable(null);
                //
                self.InitializeInitiator = function () {
                    require(['models/SDForms/SDForm.User'], function (userLib) {
                        if (self.InitiatorLoaded() == false) {
                            if (self.InitiatorID) {
                                var options = {
                                    UserID: self.InitiatorID,
                                    UserType: userLib.UserTypes.initiator,
                                    UserName: null,
                                    EditAction: self.EditInitiator,
                                    RemoveAction: self.DeleteInitiator
                                };
                                var user = new userLib.User(self, options);
                                self.Initiator(user);
                                self.InitiatorLoaded(true);
                            }
                            else
                                self.Initiator(new userLib.EmptyUser(self, userLib.UserTypes.initiator, self.EditInitiator));
                        }
                    });
                };
                self.EditInitiator = function () {
                    showSpinner();
                    require(['models/SDForms/SDForm.User'], function (userLib) {
                        var fh = new fhModule.formHelper(true);
                        var options = {
                            fieldName: 'Call.Initiator',
                            fieldFriendlyName: getTextResource('Initiator'),
                            oldValue: self.InitiatorLoaded() ? { ID: self.Initiator().ID(), ClassID: 9, FullName: self.Initiator().FullName() } : null,
                            object: ko.toJS(self.Initiator()),
                            searcherName: 'WebUserSearcher',
                            searcherPlaceholder: getTextResource('EnterFIO'),
                            searcherCurrentUser: self.ClientID(), //чтобы видеть только относительно подразделений выбранного клиентом пользователя
                            onSave: function (objectInfo) {
                                self.InitiatorLoaded(false);
                                self.Initiator(new userLib.EmptyUser(self, userLib.UserTypes.initiator, self.EditInitiator));
                                self.InitiatorID = objectInfo ? objectInfo.ID : null;
                                //
                                self.InitializeInitiator();
                            },
                            nosave: true
                        };
                        fh.ShowSDEditor(fh.SDEditorTemplateModes.searcherEdit, options);
                    });
                };
                self.DeleteInitiator = function () {
                    require(['models/SDForms/SDForm.User'], function (userLib) {
                        self.InitiatorLoaded(false);
                        self.InitiatorID = null;
                        self.Initiator(new userLib.EmptyUser(self, userLib.UserTypes.initiator, self.EditInitiator));
                    });
                };
            }
            //
            //owner
            {
                self.OwnerLoaded = ko.observable(false);
                self.OwnerID = null;
                self.Owner = ko.observable(null);
                //
                self.InitializeOwner = function () {
                    require(['models/SDForms/SDForm.User'], function (userLib) {
                        if (self.OwnerLoaded() == false) {
                            if (self.OwnerID) {
                                var options = {
                                    UserID: self.OwnerID,
                                    UserType: userLib.UserTypes.owner,
                                    UserName: null,
                                    EditAction: self.EditOwner,
                                    RemoveAction: self.DeleteOwner
                                };
                                var user = new userLib.User(self, options);
                                self.Owner(user);
                                self.OwnerLoaded(true);
                            }
                            else
                                self.Owner(new userLib.EmptyUser(self, userLib.UserTypes.owner, self.EditOwner));
                        }
                    });
                };
                self.EditOwner = function () {
                    showSpinner();
                    require(['models/SDForms/SDForm.User'], function (userLib) {
                        var fh = new fhModule.formHelper(true);
                        var options = {
                            fieldName: 'Call.Owner',
                            fieldFriendlyName: getTextResource('Owner'),
                            oldValue: self.OwnerLoaded() ? { ID: self.Owner().ID(), ClassID: 9, FullName: self.Owner().FullName() } : null,
                            object: ko.toJS(self.Owner()),
                            searcherName: 'OwnerUserSearcher',
                            searcherPlaceholder: getTextResource('EnterFIO'),
                            searcherCurrentUser: self.ClientID(),
                            onSave: function (objectInfo) {
                                self.OwnerLoaded(false);
                                self.Owner(new userLib.EmptyUser(self, userLib.UserTypes.owner, self.EditOwner));
                                self.OwnerID = objectInfo ? objectInfo.ID : null;
                                //
                                self.InitializeOwner();
                            },
                            nosave: true
                        };
                        fh.ShowSDEditor(fh.SDEditorTemplateModes.searcherEdit, options);
                    });
                };
                self.DeleteOwner = function () {
                    require(['models/SDForms/SDForm.User'], function (userLib) {
                        self.OwnerLoaded(false);
                        self.OwnerID = null;
                        self.Owner(new userLib.EmptyUser(self, userLib.UserTypes.owner, self.EditOwner));
                    });
                };
            }
            //
            //queue
            {
                self.QueueLoaded = ko.observable(false);
                self.QueueID = null;
                self.QueueName = null;
                self.Queue = ko.observable(null);
                //
                self.InitializeQueue = function () {
                    require(['models/SDForms/SDForm.User'], function (userLib) {
                        if (self.QueueLoaded() == false) {
                            if (self.QueueID) {
                                var options = {
                                    UserID: self.QueueID,
                                    UserType: userLib.UserTypes.queueExecutor,
                                    UserName: self.QueueName,
                                    EditAction: self.EditQueue,
                                    RemoveAction: self.DeleteQueue
                                };
                                self.Queue(new userLib.User(self, options));
                                self.QueueLoaded(true);
                            }
                            else
                                self.Queue(new userLib.EmptyUser(self, userLib.UserTypes.queueExecutor, self.EditQueue));
                        }
                    });
                };
                //
                self.ClearExecutor = ko.observable(true); 
                self.CheckExecutor = function () {
                    var UserIDs = self.Queue().QueueUserIDList();
                    self.ClearExecutor(true);
                    UserIDs.forEach(function (item) {
                        if (item == self.ExecutorID)
                            self.ClearExecutor(false);
                    })
                    if (self.ClearExecutor()) {
                        self.DeleteExecutor();
                    }
                };
                //
                self.EditQueue = function () {
                    showSpinner();
                    require(['models/SDForms/SDForm.User'], function (userLib) {
                        var fh = new fhModule.formHelper(true);
                        var options = {
                            fieldName: 'Call.Queue',
                            fieldFriendlyName: getTextResource('Queue'),
                            oldValue: self.QueueLoaded() ? { ID: self.Queue().ID(), ClassID: self.Queue().ClassID(), FullName: self.Queue().FullName() } : null,
                            object: ko.toJS(self.Queue()),
                            searcherName: "QueueSearcher",
                            searcherPlaceholder: getTextResource('EnterQueue'),
                            searcherCurrentUser: self.ClientID(),
                            searcherParams: ['1'],//for call
                            onSave: function (objectInfo) {
                                self.QueueLoaded(false);
                                self.Queue(new userLib.EmptyUser(self, userLib.UserTypes.queueExecutor, self.EditQueue));
                                //
                                if (objectInfo && objectInfo.ClassID == 722) { //IMSystem.Global.OBJ_QUEUE
                                    self.QueueID = objectInfo.ID;
                                    self.QueueName = objectInfo.FullName;
                                }
                                else {
                                    self.QueueID = null;
                                    self.QueueName = null;
                                }
                                self.InitializeQueue();
                            },
                            nosave: true
                        };
                        fh.ShowSDEditor(fh.SDEditorTemplateModes.searcherEdit, options);
                    });
                };
                self.DeleteQueue = function () {
                    require(['models/SDForms/SDForm.User'], function (userLib) {
                        self.QueueLoaded(false);
                        self.QueueID = null;
                        self.QueueName = null;
                        self.Queue(new userLib.EmptyUser(self, userLib.UserTypes.queueExecutor, self.EditQueue));
                    });
                };
            }
            //
            //executor
            {
                self.ExecutorLoaded = ko.observable(false);
                self.ExecutorID = null;
                self.Executor = ko.observable(null);
                //
                self.InitializeExecutor = function () {
                    require(['models/SDForms/SDForm.User'], function (userLib) {
                        if (self.ExecutorLoaded() == false) {
                            if (self.ExecutorID) {
                                var options = {
                                    UserID: self.ExecutorID,
                                    UserType: userLib.UserTypes.executor,
                                    UserName: null,
                                    EditAction: self.EditExecutor,
                                    RemoveAction: self.DeleteExecutor
                                };
                                var user = new userLib.User(self, options);
                                self.Executor(user);
                                self.ExecutorLoaded(true);
                            }
                            else
                                self.Executor(new userLib.EmptyUser(self, userLib.UserTypes.executor, self.EditExecutor));
                        }
                    });
                };
                self.EditExecutor = function () {
                    showSpinner();
                    require(['models/SDForms/SDForm.User'], function (userLib) {
                        var fh = new fhModule.formHelper(true);
                        var options = {
                            fieldName: 'Call.Executor',
                            fieldFriendlyName: getTextResource('Executor'),
                            oldValue: self.ExecutorLoaded() ? { ID: self.Executor().ID(), ClassID: self.Executor().ClassID(), FullName: self.Executor().FullName() } : null,
                            object: ko.toJS(self.Executor()),
                            searcherName: "ExecutorUserSearcher",
                            searcherPlaceholder: getTextResource('EnterFIO'),
                            searcherParams: [self.QueueID],
                            searcherCurrentUser: self.ClientID(),
                            onSave: function (objectInfo) {
                                self.ExecutorLoaded(false);
                                self.Executor(new userLib.EmptyUser(self, userLib.UserTypes.executor, self.EditExecutor));
                                //
                                if (objectInfo && objectInfo.ClassID == 9) { //IMSystem.Global.OBJ_USER
                                    self.ExecutorID = objectInfo.ID;
                                }
                                else {
                                    self.ExecutorID = null;
                                }
                                self.InitializeExecutor();
                            },
                            nosave: true
                        };
                        fh.ShowSDEditor(fh.SDEditorTemplateModes.searcherEdit, options);
                    });
                };
                self.DeleteExecutor = function () {
                    require(['models/SDForms/SDForm.User'], function (userLib) {
                        self.ExecutorLoaded(false);
                        self.ExecutorID = null;
                        self.Executor(new userLib.EmptyUser(self, userLib.UserTypes.executor, self.EditExecutor));
                    });
                };
            }
            //
            //accomplisher
            {
                self.AccomplisherLoaded = ko.observable(false);
                self.AccomplisherID = null;
                self.Accomplisher = ko.observable(null);
                //
                self.InitializeAccomplisher = function () {
                    require(['models/SDForms/SDForm.User'], function (userLib) {
                        if (self.AccomplisherLoaded() == false) {
                            if (self.AccomplisherID) {
                                var options = {
                                    UserID: self.AccomplisherID,
                                    UserType: userLib.UserTypes.accomplisher,
                                    UserName: null,
                                    EditAction: self.EditAccomplisher,
                                    RemoveAction: self.DeleteAccomplisher
                                };
                                var user = new userLib.User(self, options);
                                self.Accomplisher(user);
                                self.AccomplisherLoaded(true);
                            }
                            else
                                self.Accomplisher(new userLib.EmptyUser(self, userLib.UserTypes.accomplisher, self.EditAccomplisher));
                        }
                    });
                };
                self.EditAccomplisher = function () {
                    showSpinner();
                    require(['models/SDForms/SDForm.User'], function (userLib) {
                        var fh = new fhModule.formHelper(true);
                        var options = {
                            fieldName: 'Call.Accomplisher',
                            fieldFriendlyName: getTextResource('Accomplisher'),
                            oldValue: self.AccomplisherLoaded() ? { ID: self.Accomplisher().ID(), ClassID: 9, FullName: self.Accomplisher().FullName() } : null,
                            object: ko.toJS(self.Accomplisher()),
                            searcherName: 'AccomplisherUserSearcher',
                            searcherPlaceholder: getTextResource('EnterFIO'),
                            searcherCurrentUser: self.ClientID(),
                            onSave: function (objectInfo) {
                                self.AccomplisherLoaded(false);
                                self.AccomplisherID = objectInfo ? objectInfo.ID : null;
                                self.Accomplisher(new userLib.EmptyUser(self, userLib.UserTypes.accomplisher, self.EditAccomplisher));
                                //
                                self.InitializeAccomplisher();
                            },
                            nosave: true
                        };
                        fh.ShowSDEditor(fh.SDEditorTemplateModes.searcherEdit, options);
                    });
                };
                self.DeleteAccomplisher = function () {
                    require(['models/SDForms/SDForm.User'], function (userLib) {
                        self.AccomplisherLoaded(false);
                        self.AccomplisherID = null;
                        self.Accomplisher(new userLib.EmptyUser(self, userLib.UserTypes.accomplisher, self.EditAccomplisher));
                    });
                };
            }
            //
            //parameters
            {
                self.parametersControl = null;
                self.parameterListByGroup = null;//кеш отсортирортированных параметров, разбитых по группам
                self.ParameterList = ko.observable([]);//параметры текущей выбранной группы
                self.ParameterListGroupName = ko.computed(function () {
                    if (self.mode().indexOf(self.modes.parameterPrefix) != 0)
                        return '';
                    //
                    var groupName = self.mode().substring(self.modes.parameterPrefix.length);
                    return groupName;
                });
                self.GetParameterValueList = function () {//получения списка значений всех параметров
                    var retval = [];
                    //
                    if (self.parametersControl != null)
                        retval = self.parametersControl.GetParameterValueList();
                    //
                    return retval;
                };
                self.ParameterGroupList = ko.observable([]);
                self.InitializeParametersTabs = function () {
                    if (self.mode().indexOf(self.modes.parameterPrefix) != 0) {
                        self.ParameterList([]);
                        return;
                    }
                    //
                    var groupName = self.mode().substring(self.modes.parameterPrefix.length);
                    var list = self.parameterListByGroup;
                    for (var i = 0; i < list.length; i++)
                        if (list[i].GroupName == groupName) {
                            self.ParameterList(list[i].ParameterList);
                            return;
                        }
                    //
                    self.ParameterList([]);//groupName not found
                };
                self.InitializeParameters = function () {
                    if (self.AddAs) {
                        self.parametersControl.GetCopy(701, self.primaryObjectID, false, self.CallData, 2);
                        self.ServiceSet(self.ServiceID, self.ServiceItemID, self.ServiceAttendanceID, self.ServiceItemAttendanceFullName(), null, false,self.SummaryDefaultName());
                    }
                    else
                        self.parametersControl.Create(701, self.ServiceItemID == null ? self.ServiceAttendanceID : self.ServiceItemID, false, 2);
                };
                self.OnParametersChanged = function () {//обновления списка параметров по объекту
                    if (self.parametersControl == null) {
                        self.parametersControl = new pcLib.control();
                        self.parametersControl.ClientID(self.ClientID());//от клинета есть зависимые параметры
                        self.parametersControl.ReadOnly(false);
                        self.parametersControl.ParameterListByGroup.subscribe(function (newValue) {//изменилась разбивка параметров по группам
                            self.parameterListByGroup = newValue;
                            //
                            self.ParameterGroupList().splice(0, self.ParameterGroupList().length);//remove without ko update
                            var newParameterListContainsOldGroup = false;
                            //
                            for (var i = 0; i < newValue.length; i++) {
                                var groupName = newValue[i].GroupName;
                                //
                                self.ParameterGroupList().push({
                                    Index: i + 1,
                                    Name: groupName,
                                    IsValid: newValue[i].IsValid
                                });
                                //
                                if (self.mode().indexOf(self.modes.parameterPrefix + groupName) != -1)
                                    newParameterListContainsOldGroup = true;
                            }
                            self.ParameterGroupList.valueHasMutated();
                            //
                            if (self.mode().indexOf(self.modes.parameterPrefix) == 0) {//сейчас вкладка параметры
                                if (!newParameterListContainsOldGroup)
                                    self.mode(self.modes.main);//такой больше нет, идем на главную
                                else {//hack ko
                                    var tmp = self.mode();
                                    self.mode(self.modes.nothing);
                                    self.mode(tmp);
                                }
                            }
                        });
                    }
                    self.InitializeParameters();
                };
            }
            //
            //
            self.Load = function () {
                self.mode(self.modes.main);
                //
                $.when(self.renderedD).done(function () {
                    if (self.AddAs)
                        self.Fill(self.callData);
                    //
                    self.LoadPriorityControl();
                    //
                    self.InitializeCallSummarySearcher();
                    //
                    self.InitializeDescription();
                    self.LoadAttachmentsControl();
                    //
                    self.InitializeSolution();
                    self.IncidentResultHelper.LoadList();
                    self.RFCResultHelper.LoadList();
                    //
                    if (!self.AddAs) {
                        self.CallTypeHelper.LoadList();
                        self.CallTypeHelper.SetSelectedItem('00000000-0000-0000-0000-000000000000');//call
                    }
                    self.ReceiptTypetHelper.LoadList();
                    self.ReceiptTypetHelper.SetSelectedItem(0);//phone
                    self.InitializeServiceSearcher();
                    //
                    self.InitializeClient();
                    self.InitializeInitiator();
                    self.InitializeOwner();
                    self.InitializeQueue();
                    self.InitializeExecutor();
                    self.InitializeAccomplisher();
                    //
                    self.OnParametersChanged();
                    //
                    self.LoadTipicalCalls();
                    self.LoadTipicalItemAttendanceList();
                    self.LoadKBArticleList();
                    //
                    self.CheckNotAvailableServiceBySlaVisible();
                    self.CheckIsHidePlaceOfServiceVisible();
                });
            };
            //
            self.AfterRender = function () {
                self.renderedD.resolve();
            };
            //     
            self.IsRegisteringCall = false;
            //
            self.ajaxControl_RegisterCall = new ajaxLib.control();
            self.ValidateAndRegisterCall = function (showSuccessMessage, kbArticleID) {
                var retval = $.Deferred();
                //
                if (self.IsRegisteringCall)
                    return;
                //
                var data = {
                    'UserID': self.ClientID(),
                    'CallTypeID': self.CallTypeHelper.SelectedItem() == null ? null : self.CallTypeHelper.SelectedItem().ID,
                    'UrgencyID': self.UrgencyID,
                    'CallSummaryName': self.CallSummaryName(),
                    'HTMLDescription': self.Description(),
                    'ServiceItemID': self.ServiceItemID,
                    'ServiceAttendanceID': self.ServiceAttendanceID,
                    'Files': self.attachmentsControl == null ? null : self.attachmentsControl.GetData(),
                    'KBArticleID': kbArticleID != null ? kbArticleID : null,
                    'ParameterValueList': self.GetParameterValueList(),
                    //                  
                    'ServicePlaceID': self.ServicePlaceCallID(),
                    'ServicePlaceClassID': self.ServicePlaceCallClassID(),
                    //
                    'PriorityID': self.PriorityID,
                    'InfluenceID': self.InfluenceID,
                    'HTMLSolution': self.Solution(),
                    'RFCResultID': self.RFCResultHelper.SelectedItem() == null ? null : self.RFCResultHelper.SelectedItem().ID,
                    'IncidentResultID': self.IncidentResultHelper.SelectedItem() == null ? null : self.IncidentResultHelper.SelectedItem().ID,
                    'ReceiptType': self.ReceiptTypetHelper.SelectedItem() == null ? 0 : self.ReceiptTypetHelper.SelectedItem().ID,
                    'InitiatorID': self.InitiatorID,
                    'OwnerID': self.OwnerID,
                    'ExecutorID': self.ExecutorID,
                    'QueueID': self.QueueID,
                    'AccomplisherID': self.AccomplisherID,
                    'ObjectClassID': self.ObjectClassID,
                    'ObjectID': self.ObjectID,
                    'DependencyList': dependencyList
                };
                //    
                if (data.CallTypeID == null) {
                    require(['sweetAlert'], function () {
                        swal(getTextResource('PromptType'));
                    });
                    retval.resolve(null);
                    return;
                }
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
                if (data.ServiceItemID == null && data.ServiceAttendanceID == null) {
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
                        url: 'sdApi/registerCallEngineer',
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
                            swal(getTextResource('ErrorCaption'), getTextResource('AjaxError') + '\n[CallRegistrationEngineer.js, RegisterCall]', 'error');
                        });
                        retval.resolve(null);
                        self.IsRegisteringCall = false;
                    });
                //
                return retval.promise();
            };
            //
            //
            //tipical calls - help panel
            {
                self.ajaxControl_CallInfoList = new ajaxLib.control();
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
                    //disabled
                    //thisObj.UrgencyName = callInfo.UrgencyName;
                    //thisObj.UrgencyID = callInfo.UrgencyID;
                    thisObj.Description = callInfo.Description;
                    thisObj.HTMLDescription = callInfo.HTMLDescription;
                    //
                    thisObj.UseCallClick = function () {
                        self.CallSummaryName(thisObj.CallSummaryName);
                        self.ServiceSet(thisObj.ServiceID, thisObj.ServiceItemID, thisObj.ServiceAttendanceID, thisObj.ServiceItemAttendanceFullName)
                        self.Description(thisObj.HTMLDescription);
                    };
                    thisObj.ShowCallClick = function () {
                        var fh = new sfhModule.formHelper();
                        fh.ShowCall(thisObj.ID, fh.Mode.Default);
                    };
                };
                self.LoadTipicalCalls = function () {
                    var selectedCallTypeID = self.CallTypeHelper.SelectedItem() ? self.CallTypeHelper.SelectedItem().ID : null;
                    var selectedUserID = self.ClientID();
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
                                    self.TipicalCallsVisible(self.TipicalCalls().length > 0);
                                    self.InvalidateHelpPanel();
                                }
                            });
                    }, 1000);
                };
            }
            //
            //tipical serviceItems/Attendances - help panel
            {
                self.ajaxControl_ServiceItemAttendanceInfoList = new ajaxLib.control();
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
                    //
                    thisObj.UseItemAttendanceClick = function () {
                        self.ServiceSet(thisObj.ServiceID, thisObj.ServiceItemID, thisObj.ServiceAttendanceID, thisObj.FullName, thisObj.Parameter)
                    };
                };
                self.LoadTipicalItemAttendanceList = function () {
                    var selectedCallTypeID = self.CallTypeHelper.SelectedItem() ? self.CallTypeHelper.SelectedItem().ID : null;
                    var selectedUserID = self.ClientID();
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
                                    self.TipicalItemAttendanceListVisible(self.TipicalItemAttendanceList().length > 0);
                                    self.InvalidateHelpPanel();
                                }
                            });
                    }, 1000);
                };
            }
            //
            //kbArticle - help panel
            {
                self.ajaxControl_KBArticleList = new ajaxLib.control();
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
                    thisObj.HTMLSolution = kbInfo.HTMLSolution;
                    //
                    thisObj.UseKBArticleClick = function () {
                        self.CallSummaryName(thisObj.Name);
                        self.Description(thisObj.HTMLDescription);
                        self.Solution(thisObj.HTMLSolution);
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
                                            if (self.Description().trim() == '')
                                                self.Description(thisObj.HTMLDescription);
                                            if (self.Solution().trim() == '')
                                                self.Solution(thisObj.HTMLSolution);
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
                    var selectedServiceItemAttendanceID = self.ServiceAttendanceID == null ? self.ServiceItemID : self.ServiceAttendanceID;
                    //
                    if (self.KBArticles_paramCallSummaryName == selectedCallSummaryName && self.KBArticles_paramServiceItemAttendanceID == selectedServiceItemAttendanceID)
                        return;
                    //
                    self.KBArticlesVisible(false);
                    self.KBArticles.removeAll();
                    //
                    self.KBArticles_paramCallSummaryName = selectedCallSummaryName;
                    self.KBArticles_paramServiceItemAttendanceID = selectedServiceItemAttendanceID;
                    //
                    if (selectedCallSummaryName.length == 0 || selectedServiceItemAttendanceID == null)
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
                                    clientRegistration: false,
                                    serviceItemAttendanceID: self.KBArticles_paramServiceItemAttendanceID
                                }
                            },
                            function (response) {
                                if (response) {
                                    self.KBArticles.removeAll();
                                    //
                                    $.each(response, function (index, kbInfo) {
                                        var kba = new createKBArticle(kbInfo);
                                        self.KBArticles().push(kba);
                                    });
                                    self.KBArticles.valueHasMutated();
                                    self.KBArticlesVisible(self.KBArticles().length > 0);
                                    self.InvalidateHelpPanel();
                                }
                            });
                    }, 1000);
                };

                self.AddAs = false;//заявка создана по аналогии
                self.CallData = null;//заявка, взятая за основу
                self.primaryCallID = null;//ID заявки, взятой за основу
                //
                self.Fill = function (callData) {
                    if (callData.ID()) {
                        self.primaryObjectID = callData.ID();
                    }
                    //
                    self.CallData = callData;
                    if (callData.InfluenceID())
                        self.InfluenceID = callData.InfluenceID();
                    //
                    if (callData.PriorityID())
                        self.PriorityID = callData.PriorityID();
                    if (callData.PriorityColor())
                        self.PriorityColor(callData.PriorityColor());
                    if (callData.PriorityName())
                        self.PriorityName(callData.PriorityName());
                    //
                    if (callData.CallSummaryName())
                        self.CallSummaryName(callData.CallSummaryName());
                    if (callData.UrgencyID())
                        self.UrgencyID = callData.UrgencyID();
                    //
                    if (callData.CallTypeID()) {
                        self.CallTypeHelper.LoadList();
                        self.CallTypeHelper.SetSelectedItem(callData.CallTypeID());
                    }
                    //
                    if (callData.ClientID())
                        self.ClientID(callData.ClientID());
                    if (callData.ExecutorID())
                        self.ExecutorID = callData.ExecutorID();
                    if (callData.InitiatorID())
                        self.InitiatorID = callData.InitiatorID();
                    if (callData.OwnerID())
                        self.OwnerID = callData.OwnerID();
                    if (callData.QueueID())
                        self.QueueID = callData.QueueID();
                    if (callData.QueueName())
                        self.QueueName = callData.QueueName();
                    if (callData.ServiceAttendanceID())
                        self.ServiceAttendanceID = callData.ServiceAttendanceID();
                    if (callData.ServiceID())
                        self.ServiceID = callData.ServiceID();
                    if (callData.ServiceItemID())
                        self.ServiceItemID = callData.ServiceItemID();
                    //
                    self.ServiceItemAttendanceFullName(callData.ServiceItemAttendanceFullName());
                    //
                    if (callData.Description())
                        $.when(self.htmlDescriptionControlD).done(function () { self.Description(callData.Description()); });
                };
                //
                
                self.ShowNotAvailableBySlaServices = false;
                self.CheckNotAvailableServiceBySlaVisible = function () {
                    var ajaxControl = new ajaxLib.control();
                    ajaxControl.Ajax($('#' + self.MainRegionID).find('.horizontalContainer-rightPart'),
                        {
                            url: 'configApi/IsNotAvailableServiceBySlaVisible',
                            method: 'GET'
                        },
                        function (showNotAvailableServices) {
                            self.ShowNotAvailableBySlaServices = showNotAvailableServices;
                        });
                };
                //
                self.ShowPlaceOfService = ko.observable(true);
                self.CheckIsHidePlaceOfServiceVisible = function () {
                    var ajaxControl = new ajaxLib.control();
                    ajaxControl.Ajax(null,
                        {
                            url: 'configApi/IsHidePlaceOfServiceVisible',
                            method: 'GET'
                        },
                        function (result) {
                            console.log(result);
                            console.log(self.CallServicePlaceVisible());
                            self.ShowPlaceOfService(!result);
                        });
                };
            }
        }
    }
    return module;
});
