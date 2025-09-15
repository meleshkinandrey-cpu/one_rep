define(['knockout', 'jquery', 'usualForms', 'ajax', 'parametersControl', 'comboBox'], function (ko, $, fhModule, ajaxLib, pcLib) {
    var module = {
        ViewModel: function (mainRegionID, objectClassID, objectID) {
            var self = this;
            //
            //outer actions
            self.InvalidateHelpPanel = undefined;
            self.frm = undefined;
            //
            //vars
            self.MainRegionID = mainRegionID;
            self.ID = null;//for registered call
            self.renderedD = $.Deferred();
            //
            self.ObjectClassID = objectClassID;//объект, с которым связана заявка
            self.ObjectID = objectID;//объект, с которым связана заявка
            // urgency
            self.SelectedUrgency = ko.observable(null);
            self.ajaxControl_UrgencyList = new ajaxLib.control();
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
                        self.resizePage();
                        self.UrgencyListD.resolve();
                    });
            };

            self.BeforeSave = ko.observable(true);//была ли сделана попытка сохранения?           
            //  
            self.ShowPlaceOfServiceD = $.Deferred();
            self.ShowPlaceOfService = ko.observable(true);

            $.when(self.ShowPlaceOfServiceD).done(function (isShowHidePlaceOfService) {
                self.ShowPlaceOfService(isShowHidePlaceOfService);
            });




            //callSummary
            {
                self.CallSummaryName = ko.observable('');
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
                        self.CallTypeID ? self.CallTypeID : undefined],
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
                                        self.ServiceSet(response.ServiceID, response.ServiceItemID, response.ServiceAttendanceID, response.FullName, response.Parameter, null,response.Summary);
                                    self.resizePage();
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
                            self.CallTypeID ? self.CallTypeID : undefined],
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
                self.isUserChangedDescription = false;
                self.htmlDescriptionControl = null;
                self.InitializeDescription = function () {
                    var htmlElement = $('#' + self.MainRegionID).find('.description');
                    if (self.htmlDescriptionControl == null)
                        require(['htmlControl'], function (htmlLib) {
                            self.htmlDescriptionControl = new htmlLib.control(htmlElement);
                            self.htmlDescriptionControl.SetHTML(self.Description());
                            self.htmlDescriptionControlD.resolve();
                            self.htmlDescriptionControl.OnHTMLChanged = function (htmlValue) {
                                if (self.Description() != htmlValue)
                                    self.isUserChangedDescription = true;
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
                    //
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
                            self.attachmentsControl = new fcLib.control(attachmentsElement, '.call-registration-lite', '.icon.call-lite-icon-plus.active');
                        }
                        self.attachmentsControl.ReadOnly(false);
                    });
                };
            }
            //
            //solution
            {
                self.Solution = ko.observable('');
            }
            //
            //service
            {
                self.ServiceID = null;
                self.ServiceItemID = null;
                self.ServiceAttendanceID = null;
                self.ServiceItemAttendanceFullName = ko.observable('');
                self.SiaName = ko.observable('');
                self.SiaPath = ko.observable('');
                //
                self.ServiceItemAttendanceFullName.subscribe(function (newValue) {
                    var arr = newValue.split(' \\ ');
                    var arrStr = '';
                    var tempSiaPath = '';
                    for (var i = 0; i < arr.length; i++) {
                        if (i == arr.length - 1) {
                            self.SiaName(arr[i]);
                            self.SiaPath(tempSiaPath);
                            break;
                        }
                        else if (i != 0) {
                            tempSiaPath += ' > ';
                        }
                        tempSiaPath += arr[i] + '';
                        //
                        arrStr += arr[i] + '';
                    }
                    //
                    if (arrStr.length === 0) {
                        self.SiaName('[Затрудняюсь выбрать]');
                        self.SiaPath('');
                    }
                });
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
                        self.callSummarySearcher.SetSearchParameters([self.ServiceItemID ? self.ServiceItemID : (self.ServiceAttendanceID ? self.ServiceAttendanceID : undefined), self.CallTypeID ? self.CallTypeID : undefined]);
                    });
                };
                //
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
                    if (self.isUserChangedDescription == false) {
                        var html = '<html><body><p style="white-space:pre-wrap">' + serviceParameter.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</p></body></html>';
                        self.Description(html);
                    }
                    //
                    if (!self.AddAs)//параметры уже созданы
                        self.OnParametersChanged();
                    //
                    $.when(self.callSummarySearcherD).done(function () {
                        self.callSummarySearcher.SetSearchParameters([self.ServiceItemID ? self.ServiceItemID : (self.ServiceAttendanceID ? self.ServiceAttendanceID : undefined), self.CallTypeID ? self.CallTypeID : undefined]);
                    });
                    if (summaryName && summaryName != '' && !self.CallSummaryName().length > 0)
                        self.CallSummaryName(summaryName);
                    self.SummaryDefaultName(summaryName ? summaryName:'');
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
                        [self.CallTypeID ? self.CallTypeID : undefined],
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
                                    self.resizePage();
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
                            if (self.CallTypeID == null)
                                return;
                            var mode = fh.ServiceCatalogueBrowserMode.Default;
                            if (self.CallTypeID != '00000000-0000-0000-0000-000000000000') {//default callType
                                if (self.IsServiceAttendance == true)
                                    mode = fh.ServiceCatalogueBrowserMode.ShowOnlyServiceAttendances;
                                else
                                    mode = fh.ServiceCatalogueBrowserMode.ShowOnlyServiceItems;
                            }
                            var clientID = self.ClientID();
                            var result = fh.ShowServiceCatalogueBrowser(mode, clientID, self.ServiceID);
                            $.when(result).done(function (serviceItemAttendance) {
                                if (serviceItemAttendance)
                                    self.ServiceSet(serviceItemAttendance.Service.ID, serviceItemAttendance.ClassID == 406 ? serviceItemAttendance.ID : null, serviceItemAttendance.ClassID == 407 ? serviceItemAttendance.ID : null, serviceItemAttendance.FullName(), serviceItemAttendance.Parameter, null, response.Summary);
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
                        searcherParams: [self.CallTypeID ? self.CallTypeID : undefined],//параметры искалки - тип заявки, для фильтрации - только элементы / только услуги
                        searcherLoadD: extensionLoadD,//ожидание дополнений для модели искалки
                        searcherCurrentUser: self.ClientID(),
                        searcherPlaceholder: getTextResource('PromptServiceItemAttendance'),
                        searcherLoad: function (vm, setObjectInfoFunc) {//дополнения искалки
                            vm.CurrentUserID = null;//для фильтрации данных по доступности их пользователю (клиенту)
                            vm.SelectFromServiceCatalogueClick = function () {//кнопка выбора из каталога сервисов
                                vm.Close();//close dropDownMenu
                                if (self.CallTypeID == null)
                                    return;
                                var mode = fh.ServiceCatalogueBrowserMode.Default;
                                if (self.CallTypeID != '00000000-0000-0000-0000-000000000000') {//default callType
                                    if (self.IsServiceAttendance == true)
                                        mode = fh.ServiceCatalogueBrowserMode.ShowOnlyServiceAttendances;
                                    else
                                        mode = fh.ServiceCatalogueBrowserMode.ShowOnlyServiceItems;
                                }
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
                            if (!objectInfo)
                                return;
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
                                    self.resizePage();
                                });
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
                    var clientID = newValue;
                    //
                    if (self.parametersControl != null)
                        self.parametersControl.ClientID(clientID);
                    //
                    if (self.callSummarySearcher != null) {
                        self.callSummarySearcher.CurrentUserID = clientID;
                        self.callSummarySearcher.ClearValues();
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
                            //
                            setTimeout(self.resizePage, 1000);
                        }
                    });
                };
                self.EditClient = function () {
                    showSpinner();
                    $.when(userD).done(function (user) {
                        require(['models/SDForms/SDForm.User'], function (userLib) {
                            var fh = new fhModule.formHelper(true);
                            var options = {
                                fieldName: 'Call.Client',
                                fieldFriendlyName: getTextResource('Client'),
                                oldValue: self.ClientLoaded() ? { ID: self.Client().ID(), ClassID: 9, FullName: self.Client().FullName() } : null,
                                object: ko.toJS(self.Client()),
                                searcherName: 'WebUserSearcherNoTOZ',
                                searcherPlaceholder: getTextResource('EnterFIO'),
                                searcherCurrentUser: user.UserID, //чтобы видеть только относительно подразделений этого пользователя
                                onSave: function (objectInfo) {
                                    self.ClientLoaded(false);
                                    self.Client(new userLib.EmptyUser(self, userLib.UserTypes.client, self.EditClient));
                                    self.ClientID(objectInfo ? objectInfo.ID : null);
                                    //
                                    self.InitializeClient();
                                },
                                nosave: true
                            };
                            fh.ShowSDEditor(fh.SDEditorTemplateModes.searcherEdit, options);
                        });
                    });
                };
                self.DeleteClient = function () {
                    require(['models/SDForms/SDForm.User'], function (userLib) {
                        self.ClientLoaded(false);
                        self.ClientID(null);
                        self.Client(new userLib.EmptyUser(self, userLib.UserTypes.client, self.EditClient));
                    });
                };
            }
            //
            //parameters
            {
                self.parametersControl = null;
                self.parameterListByGroup = ko.observable([]);//кеш отсортирортированных параметров, разбитых по группам
                self.GetParameterValueList = function () {//получения списка значений всех параметров
                    var retval = [];
                    //
                    if (self.parametersControl != null)
                        retval = self.parametersControl.GetParameterValueList();
                    //
                    return retval;
                };
                self.ParameterGroupList = ko.observable([]);
                self.InitializeParameters = function () {
                    if (self.AddAs) {
                        self.parametersControl.GetCopy(701, self.primaryObjectID, true, null, null);
                        self.ServiceSet(self.ServiceID, self.ServiceItemID, self.ServiceAttendanceID, self.ServiceItemAttendanceFullName(), null, false, response.Summary);
                    }
                    else
                        self.parametersControl.Create(701, self.ServiceItemID == null ? self.ServiceAttendanceID : self.ServiceItemID, true, null);
                };
                self.OnParametersChanged = function () {//обновления списка параметров по объекту
                    if (self.parametersControl == null) {
                        self.parametersControl = new pcLib.control();
                        self.parametersControl.ClientID(self.ClientID());//от клинета есть зависимые параметры
                        self.parametersControl.ReadOnly(false);
                        self.parametersControl.ParameterListByGroup.subscribe(function (newValue) {//изменилась разбивка параметров по группам
                            self.parametersControl.DisableValidation(true);
                            self.parameterListByGroup(newValue);
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
                            }
                            self.ParameterGroupList.valueHasMutated();
                        });
                    }
                    self.InitializeParameters();
                };
            }
            //
            $.when(self.UrgencyListD).done(function () {
                $.each(self.UrgencyList(), function (index, urgency) {
                    if (urgency.ID == self.UrgencyID) //exists
                        self.SelectedUrgency(urgency);
                });
            });
            //
            self.Load = function () {
                $.when(self.renderedD).done(function () {
                    if (self.AddAs || self.AddFromServiceCatalogue)
                        self.Fill(self.callData);
                    //
                    self.InitializeCallSummarySearcher();
                    //
                    self.InitializeDescription();
                    self.LoadAttachmentsControl();
                    //                    
                    self.InitializeServiceSearcher();
                    self.InitializeClient();
                    self.LoadUrgencyList();
                    //
                    self.OnParametersChanged();
                    //
                    $.when(self.renderedD).done(function () {
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
                });
            };
            //
            self.AfterRender = function () {
                self.renderedD.resolve();               
                //
                self.resizePage();
                $(window).resize(self.resizePage);               
            };
            //
            self.OnCloseAction = undefined;//set in fh in fullScreen
            self.forceClose = false;
            //
            self.BeforeClose = function () {
                if (self.forceClose) {
                    if (self.attachmentControl != null)
                        self.attachmentControl.RemoveUploadedFiles();
                    if (self.parametersControl != null)
                        self.parametersControl.DestroyControls();
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
                            self.forceClose = true;
                            self.Close();
                        }
                    });
                });
                return false;
            };
            //
            self.Close = function () {//if change name - check fh
                if (!self.forceClose) {
                    self.BeforeClose();
                    return;
                }
                //
                var div = $('#' + self.MainRegionID);
                if (div.length == 1) {
                    ko.cleanNode(div[0]);
                    $('.call-registration-lite').remove();
                    //
                    if (self.OnCloseAction)
                        self.OnCloseAction();
                }
            };
            //  
            self.IsCallActive = ko.observable(true);
            //
            self.resizePage = function () {
                var new_height = getPageContentHeight();
                var left = $(".sc-views").width() + 1;
                var width = $("#mainMenu").width();
                $(".call-registration-lite").css("top", "0px");
                $(".call-registration-lite").css("left", left + "px");
                $(".call-registration-lite").css("height", new_height + "px");
                $(".call-registration-lite").css("width", width - left + "px");
                //
                var height = $('.call-registration-lite-header').outerHeight();
                $(".call-registration-lite-main").css("top", height + 1 + "px");
            };
            //                                         
            self.Validate = function () {
                self.ValidateAndRegisterCall(true);
            };
            //

            self.ajaxControl_RegisterCall = new ajaxLib.control();
            self.ValidateAndRegisterCall = function (showSuccessMessage, kbArticleID) {
                var retval = $.Deferred();
                //                
                var data = {
                    'UserID': self.ClientID(),
                    'CallTypeID': self.CallTypeID,
                    'UrgencyID': self.SelectedUrgency().ID,
                    'CallSummaryName': self.CallSummaryName(),
                    'HTMLDescription': self.Description(),
                    'ServiceItemID': self.ServiceItemID,
                    'ServiceAttendanceID': self.ServiceAttendanceID,
                    'Files': self.attachmentsControl == null ? null : self.attachmentsControl.GetData(),
                    'KBArticleID': kbArticleID != null ? kbArticleID : null,
                    'ParameterValueList': self.GetParameterValueList(),
                    //
                    'PriorityID': self.PriorityID,
                    'InfluenceID': self.InfluenceID,
                    'HTMLSolution': self.Solution(),
                    'RFCResultID': null,
                    'IncidentResultID': null,
                    'ReceiptType': null,
                    'InitiatorID': self.InitiatorID,
                    'OwnerID': self.OwnerID,
                    'ExecutorID': self.ExecutorID,
                    'QueueID': self.QueueID,
                    'AccomplisherID': self.AccomplisherID,
                    'ObjectClassID': self.ObjectClassID,
                    'ObjectID': self.ObjectID,
                    //                                     
                    'ServicePlaceID': self.ServicePlaceCallID(),
                    'ServicePlaceClassID': self.ServicePlaceCallClassID()
                    //
                };
                //    

                var validationSummary = !data.CallSummaryName || data.CallSummaryName.trim().length == 0;
                if (validationSummary)
                    data.CallSummaryName = self.SummaryDefaultName();
                //
                var validationError = data.CallTypeID == null || (!data.CallSummaryName || data.CallSummaryName.trim().length == 0) || data.UserID == null;
                var validationParameters = self.parametersControl != null && self.parametersControl.Validate() == false;
                if (validationError || validationParameters) {
                    self.BeforeSave(false);
                    if (self.parametersControl != null)
                        self.parametersControl.DisableValidation(false);
                    //
                    if (validationError)
                        require(['sweetAlert'], function (swal) {
                            swal('Заданы не все обязательные поля');//DIMA - resources!
                        });
                    retval.resolve(null);
                    return;
                }
                //
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
                                    swal({
                                        title: response.Message,
                                        showCancelButton: true,
                                        closeOnConfirm: true,
                                        closeOnCancel: true,
                                        confirmButtonText: getTextResource('NavigateToCallClientList'),
                                        cancelButtonText: getTextResource('Continue')
                                    },
                                    function (value) {
                                        if (value == true)
                                            self.NavigateToClientCallList();
                                        else if (response.Type == 0) {
                                            self.forceClose = true;
                                            if (self.attachmentControl != null)
                                                self.attachmentControl.RemoveUploadedFiles();
                                            if (self.parametersControl != null)
                                                self.parametersControl.DestroyControls();
                                            self.Close();
                                        }
                                    });
                                });
                            //
                            if (response.Type == 0) {//ok 
                                retval.resolve(response);
                                return;
                            }
                        }
                        retval.resolve(null);
                    },
                    function (response) {
                        hideSpinner();
                        require(['sweetAlert'], function () {
                            swal(getTextResource('ErrorCaption'), getTextResource('AjaxError') + '\n[CallRegistrationLite.js, RegisterCall]', 'error');
                        });
                        retval.resolve(null);
                    });
                //
                return retval.promise();
            };
            //
            self.NavigateToClientCallList = function () {
                $.when(userD).done(function (user) {
                    setLocation('SD/Table');
                    self.ajaxControl_RegisterCall.Ajax(null,
                {
                    url: 'accountApi/SetViewName',
                    method: 'POST',
                    data: { ViewName: 'ClientCallForTable', Module: 0 } //InfraManager.Web.BLL.Modules.SD
                },
                function (isSuccess) {
                    if (isSuccess === 0) {
                        user.ViewNameSD = newValue;
                    }
                    else {
                        if (isSuccess === 1)
                            require(['sweetAlert'], function () {
                                swal(getTextResource('SaveError'), getTextResource('NullParamsError') + '\n[CallRegistrationLite.js, NavigateToClientCallList]', 'error');
                            });
                        else if (isSuccess === 2)
                            require(['sweetAlert'], function () {
                                swal(getTextResource('SaveError'), getTextResource('BadParamsError') + '\n[CallRegistrationLite.js, NavigateToClientCallList]', 'error');
                            });
                        else if (isSuccess === 3)
                            require(['sweetAlert'], function () {
                                swal(getTextResource('SaveError'), getTextResource('AccessError'), 'error');
                            });
                        else
                            require(['sweetAlert'], function () {
                                swal(getTextResource('SaveError'), getTextResource('AjaxError') + '\n[CallRegistrationLite.js, NavigateToClientCallList]', 'error');
                            });
                    }
                    self.resizePage();
                });
                });
            };
            //
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
                        self.resizePage();
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
                        self.resizePage();
                        valueListD.resolve();
                    });
                return valueListD.promise();
            };
            self.AddAs = false;//заявка создана по аналогии
            self.CallData = null;//заявка, взятая за основу
            self.primaryCallID = null;//ID заявки, взятой за основу
            //
            self.AddFromServiceCatalogue = false;//заявка создана из каталога сервисов
            self.CallTypeID = null;
            self.CallTypeName = ko.observable('');
            self.ImageSource = ko.observable(null);
            self.IsServiceAttendance = false;
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
                    self.PriorityColor = callData.PriorityColor();
                if (callData.PriorityName())
                    self.PriorityName = callData.PriorityName();
                //
                if (callData.CallSummaryName())
                    self.CallSummaryName(callData.CallSummaryName());
                if (callData.UrgencyID())
                    self.UrgencyID = callData.UrgencyID();
                //
                if (callData.CallTypeID())
                    self.CallTypeID = callData.CallTypeID();
                if (callData.CallType())
                    self.CallTypeName(callData.CallType());
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
                //if (callData.ServiceAttendanceID())
                //    self.ServiceAttendanceID = callData.ServiceAttendanceID();
                //if (callData.ServiceID())
                //    self.ServiceID = callData.ServiceID();
                //if (callData.ServiceItemID())
                //    self.ServiceItemID = callData.ServiceItemID();
                //self.ServiceItemAttendanceFullName(callData.ServiceItemAttendanceFullName());
                //
                var clientID = self.ClientID();
                var id = callData.ServiceItemID() == null ? callData.ServiceAttendanceID() : callData.ServiceItemID();
                if (id)
                    self.ajaxControl_ServiceItemAttendance.Ajax($('#' + self.MainRegionID).find('.serviceItemAttendance'),
                        {
                            url: 'sdApi/GetServiceItemAttendanceInfo',
                            method: 'GET',
                            data: { serviceItemAttendanceID: id, userID: clientID }
                        },
                        function (response) {
                            self.ServiceSet(callData.ServiceID(), callData.ServiceItemID(), callData.ServiceAttendanceID(), callData.ServiceItemAttendanceFullName(), response != null ? response.Parameter : null, false, response.Summary);
                        });

                if (callData.Description())
                    $.when(self.htmlDescriptionControlD).done(function () { self.Description(callData.Description()); });
                //
                if (callData.ImageSource)
                    self.ImageSource(callData.ImageSource);
                if (callData.IsServiceAttendance)
                    self.IsServiceAttendance = callData.IsServiceAttendance;
            };
        }
    }
    return module;
});
