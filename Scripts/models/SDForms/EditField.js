define(['knockout', 'jquery', 'ajax', 'usualForms', 'dateTimeControl', 'models/SDForms/SDForm.User', 'jqueryStepper', 'ipInput'], function (ko, $, ajaxLib, fhmodel, dtLib, userLib) {
    var module = {
        MaxCount: Math.pow(2, 31) - 1,
        MinCount: 0,
        //режим, опции (см родитель) 
        ViewModel: function (mode, options) {
            var self = this;
            self.$region = null;
            self.applyTemplate = null;//ko
            self.cancelEdit = null;//close click, esc
            self.closeAction = null;//action before close editor
            self.CanEdit = ko.observable(false);
            //
            self.options = options;
            var fh = new fhmodel.formHelper();
            //
            if (options.fieldFriendlyName)
                self.fieldFriendlyName = ko.observable(options.fieldFriendlyName);
            else
                self.fieldFriendlyName = ko.observable('');
            //
            self.TemplateName = mode.template != null ? mode.template : options.template;
            self.TemplateLoadedD = $.Deferred();
            //
            self.richControl = null;
            self.richControlD = $.Deferred();
            self.CreateRichTextEditor = function () {
                self.applyTemplate(self);
                //
                require(['richText'], function (rtbLib) {
                    $.when(self.TemplateLoadedD).done(function () {
                        self.$region.css({ overflow: 'hidden' });
                        self.richControl = new rtbLib.control();
                        var promise = self.richControl.init(self.$region.find('.edit-field-template'));
                        $.when(promise).done(function () {
                            self.richControl.setValue(self.options.oldValue);
                            self.richControlD.resolve();
                        });
                    });
                });
                return self.richControlD.promise();
            };
            //
            self.htmlControl = null;
            self.htmlControlD = $.Deferred();
            self.CreateHtmlEditor = function () {
                self.applyTemplate(self);
                //
                self.closeAction = function () {
                    if (self.htmlControl != null)
                        self.htmlControl.Dispose();
                };
                //                
                require(['htmlControl'], function (htmlLib) {
                    $.when(self.TemplateLoadedD).done(function () {
                        self.$region.css({ overflow: 'hidden' });
                        self.htmlControl = new htmlLib.control(self.$region.find('.edit-field-template'), true);
                        self.htmlControl.SetHTML(self.options.oldValue);
                        if (options.readOnly === true)
                            self.htmlControl.SetReadOnly(true);
                        self.htmlControl.OnKeyDown = function (e) {
                            if (e.keyCode == 27) {
                                self.cancelEdit();
                                return false;
                            }
                            return true;
                        };
                        self.htmlControlD.resolve();
                    });
                });
                return self.htmlControlD.promise();
            };
            //
            self.comboBoxSelectedValue = ko.observable(null);
            self.comboBoxValueList = ko.observableArray([]);
            self.getComboBoxValueList = function (options) {
                var data = self.comboBoxValueList();
                options.callback({ data: data, total: data.length });
            };
            self.createComboBoxValue = function (enumValue) {
                var thisObj = this;
                //
                thisObj.ID = enumValue.ID;
                thisObj.Name = enumValue.Name;
            };
            self.ajaxControl_comboBoxValue = new ajaxLib.control();
            self.comboBoxControlD = $.Deferred();
            self.CreateComboBoxEditor = function () {
                var valueListD = $.Deferred();
                if (options.comboBoxGetValueUrl) {
                    self.ajaxControl_comboBoxValue.Ajax(self.$region.find('.combobox'),
                        {
                            url: options.comboBoxGetValueUrl,
                            method: 'GET'
                        },
                        function (response) {
                            if (response) {
                                self.comboBoxValueList.removeAll();
                                //
                                $.each(response, function (index, simpleEnum) {
                                    var item = new self.createComboBoxValue(simpleEnum);
                                    if (options.oldValue) {
                                        if (options.readOnly === false) {
                                            if (options.oldValue.Name == item.Name)
                                                self.comboBoxSelectedValue(item);

                                        }
                                        else {
                                            if (options.oldValue.ID == item.ID)
                                                self.comboBoxSelectedValue(item);
                                        }
                                    }
                                    //
                                    self.comboBoxValueList().push(item);
                                });
                                //
                                $.when(self.TemplateLoadedD).done(function () {
                                    if (options.readOnly === false) {
                                        var textBox = self.$region.find('.combobox .textField');
                                        textBox[0].readOnly = false;
                                        if (options.maxLength)
                                            textBox[0].maxLength = options.maxLength;
                                        //
                                        if (options.oldValue)
                                            textBox.val(options.oldValue.Name);
                                    }
                                });
                                //
                                self.comboBoxValueList.valueHasMutated();
                            }
                            valueListD.resolve();
                        });
                }
                else if (options.comboBoxValueList) {
                    self.comboBoxValueList(options.comboBoxValueList);
                    if (options.oldValue != undefined && options.oldValue != null) {
                        if (options.readOnly === false) {
                            for (var i = 0; i < options.comboBoxValueList.length; i++)
                                if (options.oldValue.Name == options.comboBoxValueList[i].Name) {
                                    self.comboBoxSelectedValue(options.comboBoxValueList[i]);
                                    break;
                                }

                        }
                        else {
                            for (var i = 0; i < options.comboBoxValueList.length; i++)
                                if (options.oldValue.ID == options.comboBoxValueList[i].ID) {
                                    self.comboBoxSelectedValue(options.comboBoxValueList[i]);
                                    break;
                                }
                        }
                    }
                    valueListD.resolve();
                }
                else
                    valueListD.resolve();
                //
                self.applyTemplate(self);
                //                
                $.when(self.TemplateLoadedD, valueListD).done(function () {
                    self.comboBoxControlD.resolve();
                });
                return self.comboBoxControlD.promise();
            };
            //
            self.selectedObjectFullName = ko.observable(null);
            self.selectedObjectFullNameQueue = ko.observable(null);
            self.emptyPlaceholder = ko.observable(self.options.searcherPlaceholder);
            self.emptyPlaceholderQueue = ko.observable(self.options.searcherPlaceholderQueue);
            self.selectedObjectInfo = null;
            self.selectedObjectInfoQueue = null;
            self.selectedUser = ko.observable(null);
            self.selectedUserQueue = ko.observable(null);//для отображения информации о пользователе или очереди/группе
            self.objectSearcherControl = null;
            self.objectSearcherControlD = $.Deferred();
            self.objectSearcherControlQueue = null;
            self.objectSearcherControlQueueD = $.Deferred();
            self.ajaxControl_loadUserInfo = new ajaxLib.control();
            self.ajaxControl_loadQueueInfo = new ajaxLib.control();
            self.CreateSearcherEditor = function () {
                self.applyTemplate(self);
                //
                require(['objectSearcher'], function (rtbLib) {
                    $.when(self.TemplateLoadedD).done(function () {
                        var loadD = fh.SetTextSearcherToField(
                            self.$region.find('.searcherInput'),
                            options.searcherName,
                            options.searcherTemplateName ? options.searcherTemplateName : null,
                            options.searcherParams,
                            function (objectInfo) {//select
                                self.selectedObjectFullName(objectInfo.FullName);
                                self.selectedObjectInfo = objectInfo;
                                self.RefreshSelectedUser();
                                //
                                if (['NetworkDevice.Location', 'TerminalDevice.Location', 'Adapter.Location', 'Peripheral.Location'].indexOf(options.fieldName) != -1)
                                    self.SetFilledButtonsList();
                            },
                            function () {//reset
                                self.selectedObjectFullName('');
                                self.selectedObjectInfo = null;
                                self.RefreshSelectedUser();
                                //
                                if (['NetworkDevice.Location', 'TerminalDevice.Location', 'Adapter.Location', 'Peripheral.Location'].indexOf(options.fieldName) != -1)
                                    self.SetClearButtonsList();
                            },
                            function (selectedItem) {//close
                                if (!selectedItem) {
                                    if (options.allowAnyText != true)
                                        self.selectedObjectFullName('');
                                    self.selectedObjectInfo = null;
                                    self.RefreshSelectedUser();
                                }
                            },
                            options.searcherLoadD ? options.searcherLoadD : null);
                        $.when(loadD).done(function (vm) {
                            self.objectSearcherControl = vm;
                            if (self.options.searcherLoad)
                                self.options.searcherLoad(vm, function (objectInfo) {
                                    self.selectedObjectFullName(objectInfo ? objectInfo.FullName : null);
                                    vm.SetSelectedItem(objectInfo ? objectInfo.ID : null, objectInfo ? objectInfo.ClassID : null, objectInfo ? objectInfo.FullName : null, null);
                                    self.selectedObjectInfo = objectInfo;
                                    self.RefreshSelectedUser();
                                });
                            if (self.options.searcherCurrentUser)
                                vm.CurrentUserID = self.options.searcherCurrentUser;
                            //
                            var old = self.options.oldValue;
                            if (old != null) {
                                self.selectedObjectFullName(old.FullName);
                                vm.SetSelectedItem(old.ID, old.ClassID, old.FullName, '');
                                self.selectedObjectInfo = old;
                                if (self.options.object && self.options.object.ResponsibleID) {
                                    var options = {
                                        UserID: self.options.object.ResponsibleID,
                                        UserType: userLib.UserTypes.withoutType,
                                        UserName: self.options.object.ResponsibleFullName,
                                        EditAction: null,
                                        RemoveAction: null,
                                        ShowTypeName: false,
                                        CanNote: true
                                    };
                                    self.options.object.ResponsibleUser = ko.observable(null);
                                    self.options.object.ResponsibleUser(new userLib.User(self, options));
                                    self.RefreshQueueParticipants(self.options.object);
                                }
                                self.selectedUser(self.options.object);//get loaded object from params without request
                            }
                            //
                            $.when(vm.LoadD).done(function () {
                                self.$region.find('.edit-field-template').css('height', 'auto');
                                //
                                self.objectSearcherControlD.resolve();
                            });
                        });
                    });
                });
                return self.objectSearcherControlD.promise();
            };
            self.CreateSearcherEditorWithQueue = function () {
                self.applyTemplate(self);
                //

                require(['objectSearcher'], function (rtbLib) {
                    $.when(self.TemplateLoadedD).done(function () {
                        var loadD = fh.SetTextSearcherToField(
                            self.$region.find('.searcherInputExecutor'),
                            options.searcherName,
                            options.searcherTemplateName ? options.searcherTemplateName : null,
                            options.searcherParams,
                            function (objectInfo) {//select
                                self.selectedObjectFullName(objectInfo.FullName);
                                self.selectedObjectInfo = objectInfo;
                                self.RefreshSelectedUser();
                                //
                                if (['NetworkDevice.Location', 'TerminalDevice.Location', 'Adapter.Location', 'Peripheral.Location'].indexOf(options.fieldName) != -1)
                                    self.SetFilledButtonsList();
                            },
                            function () {//reset
                                self.selectedObjectFullName('');
                                self.selectedObjectInfo = null;
                                self.RefreshSelectedUser();
                                //
                                if (['NetworkDevice.Location', 'TerminalDevice.Location', 'Adapter.Location', 'Peripheral.Location'].indexOf(options.fieldName) != -1)
                                    self.SetClearButtonsList();
                            },
                            function (selectedItem) {//close
                                if (!selectedItem) {
                                    if (options.allowAnyText != true)
                                        self.selectedObjectFullName('');
                                    self.selectedObjectInfo = null;
                                    self.RefreshSelectedUser();
                                }
                            },
                            options.searcherLoadD ? options.searcherLoadD : null);
                        $.when(loadD).done(function (vm) {
                            self.objectSearcherControl = vm;
                            if (self.options.searcherLoad)
                                self.options.searcherLoad(vm, function (objectInfo) {
                                    self.selectedObjectFullName(objectInfo ? objectInfo.FullName : null);
                                    vm.SetSelectedItem(objectInfo ? objectInfo.ID : null, objectInfo ? objectInfo.ClassID : null, objectInfo ? objectInfo.FullName : null, null);
                                    self.selectedObjectInfo = objectInfo;
                                    self.RefreshSelectedUser();
                                });
                            if (self.options.searcherCurrentUser)
                                vm.CurrentUserID = self.options.searcherCurrentUser;
                            //
                            var old = self.options.oldValue;
                            if (old != null) {
                                self.selectedObjectFullName(old.FullName);
                                vm.SetSelectedItem(old.ID, old.ClassID, old.FullName, '');
                                self.selectedObjectInfo = old;
                                self.selectedUser(self.options.object);//get loaded object from params without request
                            }
                            //
                            $.when(vm.LoadD).done(function () {
                                self.$region.find('.edit-field-template').css('height', 'auto');
                                //
                                self.objectSearcherControlD.resolve();
                            });
                        });
                    });
                });
                require(['objectSearcher'], function (rtbLib) {
                    $.when(self.TemplateLoadedD).done(function () {
                        var loadDQueue = fh.SetTextSearcherToField(
                            self.$region.find('.searcherInputQueue'),
                            options.searcherNameQueue,
                            options.searcherTemplateNameQueue ? options.searcherTemplateNameQueue : null,
                            options.searcherParamsQueue,
                            function (objectInfo) {//select
                                self.selectedObjectFullNameQueue(objectInfo.FullName);
                                self.selectedObjectInfoQueue = objectInfo;
                                self.RefreshSelectedUserQueue();
                                //
                                if (['NetworkDevice.Location', 'TerminalDevice.Location', 'Adapter.Location', 'Peripheral.Location'].indexOf(options.fieldNameQueue) != -1)
                                    self.SetFilledButtonsList();
                            },
                            function () {//reset
                                self.selectedObjectFullNameQueue('');
                                self.selectedObjectInfoQueue = null;
                                self.RefreshSelectedUserQueue();
                                //
                                if (['NetworkDevice.Location', 'TerminalDevice.Location', 'Adapter.Location', 'Peripheral.Location'].indexOf(options.fieldNameQueue) != -1)
                                    self.SetClearButtonsList();
                            },
                            function (selectedItem) {//close
                                if (!selectedItem) {
                                    if (options.allowAnyText != true)
                                        self.selectedObjectFullNameQueue('');
                                    self.selectedObjectInfoQueue = null;
                                    self.RefreshSelectedUserQueue();
                                }
                            },
                            options.searcherLoadD ? options.searcherLoadD : null);
                        $.when(loadDQueue).done(function (vm) {
                            self.objectSearcherControlQueue = vm;
                            if (self.options.searcherLoad)
                                self.options.searcherLoad(vm, function (objectInfo) {
                                    self.selectedObjectFullNameQueue(objectInfo ? objectInfo.FullNameQueue : null);
                                    vm.SetSelectedItem(objectInfo ? objectInfo.ID : null, objectInfo ? objectInfo.ClassID : null, objectInfo ? objectInfo.FullName : null, null);
                                    self.selectedObjectInfoQueue = objectInfo;
                                    self.RefreshSelectedUserQueue();
                                });
                            if (self.options.searcherCurrentUser)
                                vm.CurrentUserID = self.options.searcherCurrentUser;
                            //
                            var old = self.options.oldValueQueue;
                            if (old != null) {
                                self.selectedObjectFullNameQueue(old.FullName);
                                vm.SetSelectedItem(old.ID, old.ClassID, old.FullName, '');
                                self.selectedObjectInfoQueue = old;
                                self.selectedUserQueue(self.options.object);//get loaded object from params without request
                            }
                            //
                            $.when(vm.LoadDQueue).done(function () {
                                self.$region.find('.edit-field-template').css('height', 'auto');
                                //
                                self.objectSearcherControlQueueD.resolve();
                                self.RefreshSelectedUser();
                                self.RefreshSelectedUserQueue();
                            });
                        });

                    });
                });
                return self.objectSearcherControlD.promise();
            };
            self.RefreshSelectedUserQueue = function () {
                self.selectedUserQueue(null);//clear previous value
                var textbox = self.$region.find('.searcherInputExecutor');

                //
                if (self.selectedObjectInfoQueue != null) //IMSystem.Global.OBJ_Queue
                {
                    var param = { queueID: self.selectedObjectInfoQueue.ID };
                    self.ajaxControl_loadQueueInfo.Ajax(self.$region.find('.edit-field-user-input-details'),
                        {
                            dataType: "json",
                            method: 'GET',
                            url: 'userApi/GetQueueInfo?' + $.param(param)
                        },
                        function (response) {
                            if (response) {
                                self.objectSearcherControl.SetSearchParameters([response.ID]);
                                self.selectedUserQueue(response);
                                $.when(self.objectSearcherControl.search(self.selectedObjectInfo == null ? '' : self.selectedObjectInfo.FullName, true)).done(function () {
                                    textbox.click();
                                    textbox.focus();
                                });
                            }
                            else
                                self.selectedUserQueue(null);

                        });
                }
                else if (self.selectedObjectInfoQueue == null) {
                    self.objectSearcherControl.SetSearchParameters([null]);
                }
            };
            self.RefreshSelectedUser = function () {
                self.selectedUser(null);//clear previous value
                //
                if (self.selectedObjectInfo != null && self.selectedObjectInfo.ClassID == 9) {//IMSystem.Global.OBJ_User
                    var param = { userID: self.selectedObjectInfo.ID };
                    self.ajaxControl_loadUserInfo.Ajax(self.$region.find('.edit-field-user-input-details'),
                        {
                            dataType: "json",
                            method: 'GET',
                            url: 'userApi/GetUserInfo?' + $.param(param)
                        },
                        function (response) {
                            if (response)
                                self.selectedUser(response);
                            else
                                self.selectedUser(null);
                        });
                }
                else if (self.selectedObjectInfo != null && self.selectedObjectInfo.ClassID == 722) //IMSystem.Global.OBJ_Queue
                {
                    var param = { queueID: self.selectedObjectInfo.ID };
                    self.ajaxControl_loadQueueInfo.Ajax(self.$region.find('.edit-field-user-input-details'),
                        {
                            dataType: "json",
                            method: 'GET',
                            url: 'userApi/GetQueueInfo?' + $.param(param)
                        },
                        function (response) {
                            if (response) {
                                var options = {
                                    UserID: response.ResponsibleID,
                                    UserType: userLib.UserTypes.withoutType,
                                    UserName: response.ResponsibleFullName,
                                    EditAction: null,
                                    RemoveAction: null,
                                    ShowTypeName: false,
                                    CanNote: true
                                };
                                response.ResponsibleUser = ko.observable(null);
                                response.ResponsibleUser(new userLib.User(self, options));
                                self.RefreshQueueParticipants(response);
                                self.selectedUser(response);
                            }
                            else
                                self.selectedUser(null);
                        });
                }

            };
            //

            //self.SortFullName = function (arr) {
            //    if (arr)
            //        arr.sort((a, b) => a.FullName > b.FullName ? 1 : -1);
            //}

            self.SortFullName = function (arr) {
                if (arr)
                    arr.sort(function (a, b) {
                        return a.FullName > b.FullName ? 1 : -1;
                    });                      
            }

            self.RefreshQueueParticipants = function (response) {
                self.SortFullName(response.QueueUserList)
                response.QueueParticipantsList = ko.observableArray([]);
                if (response.QueueUserList && response.QueueUserList.length > 0) {
                    ko.utils.arrayForEach(response.QueueUserList, function (item) {
                        var options = {
                            UserID: item.ID,
                            UserType: userLib.UserTypes.withoutType,
                            UserName: null,
                            EditAction: null,
                            RemoveAction: null,
                            ShowTypeName: false,
                            CanNote: true
                        };
                        response.QueueParticipantsList.push({ User: new userLib.User(self, options) });
                    });
                }
                if (response.QueueUserFullNameList && response.QueueUserFullNameList.length > 0) {
                    self.SortFullName(response.QueueUserFullNameList)
                    ko.utils.arrayForEach(response.QueueUserFullNameList, function (item) {
                        var options = {
                            UserID: item.ID,
                            UserType: userLib.UserTypes.withoutType,
                            UserName: null,
                            EditAction: null,
                            RemoveAction: null,
                            ShowTypeName: false,
                            CanNote: true
                        };
                        response.QueueParticipantsList.push({ User: new userLib.User(self, options) });
                    });
                }
            };
            //
            self.textareaControlD = $.Deferred();
            self.CreateTextEditor = function () {
                self.applyTemplate(self);
                //
                $.when(self.TemplateLoadedD).done(function () {
                    var textarea = self.$region.find('.sdTextEditor');
                    //textarea.text(self.options.oldValue); ie problem + placeHolder ie10
                    textarea[0].maxLength = self.options.maxLength ? self.options.maxLength : 250;
                    textarea.val(self.options.oldValue);
                    //
                    self.textareaControlD.resolve();
                });
                return self.textareaControlD.promise();
            };
            //
            self.parameterModel = null;
            self.CreateParameterEditor = function () {
                var container = self.$region.find('.edit-field-template');
                container.css({ 'padding': '20px' });
                container.css({ 'overflow-y': 'auto' });
                //    
                self.parameterModel = options.model;
                self.applyTemplate(self);
                //
                self.closeAction = function () {
                    if (options.restoreValueAction)
                        options.restoreValueAction();
                    if (options.model && options.model.DestroyAllEditors)
                        options.model.DestroyAllEditors(false);
                };
                //
                var retval = $.Deferred();
                retval.resolve();
                return retval;
            };
            //
            self.datetimePickerControlD = $.Deferred();
            self.dateTime = ko.observable(null);
            self.dateTimeControl = null;
            self.dateTimeStr = ko.observable(null);
            self.dateTimeStr.subscribe(function (newValue) {
                if (self.dateTimeControl.$isLoaded.state() != 'resolved')
                    return;
                //
                var dt = self.dateTimeControl.dtpControl.length > 0 ? self.dateTimeControl.dtpControl.datetimepicker('getValue') : null;
                //
                if (!newValue || newValue.length == 0)
                    self.dateTime(null);//clear field => reset value
                else if (dtLib.Date2String(dt, options.OnlyDate) != newValue) {
                    self.dateTime(null);//value incorrect => reset value
                    self.dateTimeStr('');
                }
                else
                    self.dateTime(dt);
            });
            self.CreateDateEditor = function () {
                self.applyTemplate(self);
                //
                $.when(self.TemplateLoadedD).done(function () {
                    var dtpContainer = self.$region.find('.date-time-input');
                    self.dateTime(self.options.oldValue ? new Date(self.options.oldValue) : null);
                    //
                    self.dateTimeControl = new dtLib.control();
                    self.dateTimeControl.init(dtpContainer, {
                        StringObservable: self.dateTimeStr,
                        ValueDate: self.dateTime(),
                        OnSelectDateFunc: function (current_time, $input) {
                            self.dateTime(current_time);
                            self.dateTimeStr(dtLib.Date2String(current_time, options.OnlyDate));
                        },
                        OnSelectTimeFunc: function (current_time, $input) {
                            self.dateTime(current_time);
                            self.dateTimeStr(dtLib.Date2String(current_time, options.OnlyDate));
                        },
                        HeaderText: getTextResource('FilterEnterValue'),
                        OnlyDate: options.OnlyDate
                    });
                    $.when(self.dateTimeControl.$isLoaded).done(function () {
                        self.datetimePickerControlD.resolve();
                    });
                });
                //
                return self.datetimePickerControlD.promise();
            };
            //
            self.timePickerControlD = $.Deferred();
            self.ParseTimePickerValue = function () {
                var valid = true;
                var errorMessage = '';
                var tempValue = -1;
                var resetFunc = function () {
                    if (self.options.oldValue) {
                        var obj = getLocaleHourMinObject(self.options.oldValue);
                        self.timePickerValue(obj.h + ':' + obj.m);
                    }
                    else self.timePickerValue('0:0');
                };
                //
                if (self.timePickerValueNotCorrect()) {
                    valid = false;
                    errorMessage += '\n' + getTextResource('ManhourErrorBadSymbols');
                    resetFunc();
                }
                else {
                    var manhValue = self.timePickerValue();
                    if (manhValue != null && manhValue != '') {
                        var separatorIndex = manhValue.indexOf(':');
                        if (separatorIndex == -1) {//число = минуты
                            var val = parseInt(manhValue);
                            if (!isNaN(val) && isFinite(val)) {
                                if (val > 0 && val <= 60000000059)
                                    tempValue = val;
                                else {
                                    valid = false;
                                    errorMessage += '\n' + getTextResource('ManhourErrorSize');
                                    resetFunc();
                                }
                            }
                            else {
                                valid = false;
                                errorMessage += '\n' + getTextResource('ManhourErrorBadSymbols');
                                resetFunc();
                            }
                        }
                        else if (separatorIndex < manhValue.length - 1) {//ожидаем формат ч:м
                            var hoursStr = manhValue.substring(0, separatorIndex);
                            var minutesStr = manhValue.substring(separatorIndex + 1);
                            //
                            var hours = parseInt(hoursStr);
                            var minutes = parseInt(minutesStr);
                            if (!isNaN(hours) && isFinite(hours) && !isNaN(minutes) && isFinite(minutes)) {
                                if (hours >= 0 && hours < 1000000001 && minutes >= 0 && minutes < 60)
                                    tempValue = hours * 60 + minutes;
                                else {
                                    valid = false;
                                    errorMessage += '\n' + getTextResource('ManhourErrorSize');
                                    resetFunc();
                                }
                            }
                            else {
                                valid = false;
                                errorMessage += '\n' + getTextResource('ManhourErrorBadSymbols');
                                resetFunc();
                            }
                        }
                    }
                    else {
                        valid = false;
                        errorMessage += '\n' + getTextResource('ManhourErrorEmptyValue');
                    }
                }
                //
                if (!valid) {
                    require(['sweetAlert'], function () {
                        swal(getTextResource('ManhourDataNotValidCaption'), getTextResource('ManhourDataNotValid') + errorMessage, 'warning');
                    });
                }
                //
                return tempValue;
            };
            self.timePickerValue = ko.observable('');
            self.timePickerValue.subscribe(function (newValue) {
                if (newValue == '' || newValue == null) {
                    self.timePickerValueNotCorrect(false);
                    return;
                }
                //
                for (var i = 0, len = newValue.length; i < len; i++) {
                    if ((newValue[i] == ':' && i != (len - 1)) || !isNaN(newValue[i]))
                        continue;
                    //
                    self.timePickerValueNotCorrect(true);
                    return;
                }
                //
                self.timePickerValueNotCorrect(false);
            });
            self.timePickerValueNotCorrect = ko.observable(false);
            self.CreateTimeEditor = function () {
                self.applyTemplate(self);
                //
                $.when(self.TemplateLoadedD).done(function () {
                    if (self.options.oldValue) {
                        var obj = getLocaleHourMinObject(self.options.oldValue);
                        self.timePickerValue(obj.h + ':' + obj.m);
                    }
                    else self.timePickerValue('0:0');
                    //
                    self.timePickerControlD.resolve();
                });
                return self.timePickerControlD.promise();
            };
            //
            self.numericUpDownControlD = $.Deferred();
            self.NumberValueStr = ko.observable(0);//строка, используется для отображения
            self.NumberValue = ko.observable(0);
            self.ResetNumberValue = function (newValue) {
                var trimmed = newValue.split(' ').join('').split(' ').join('').replace(',', '.');//hack
                var maxValue = self.options.maxValue ? self.options.maxValue : module.MaxCount;
                var minValue = self.options.minValue ? self.options.minValue : module.MinCount;
                var type = self.options.stepperType;
                var val = type && type == 'float' ? parseFloat(trimmed) : parseInt(trimmed);
                var inputStr = '';
                if (val <= minValue || isNaN(val)) {
                    self.NumberValue(minValue);
                    inputStr = minValue.toString();
                }
                else if (val > maxValue) {
                    self.NumberValue(maxValue);
                    inputStr = maxValue.toString();
                }
                else {
                    self.NumberValue(val);
                    inputStr = trimmed;
                }
                //
                if (type == 'float') {
                    var str = getFormattedMoneyString(inputStr);
                    self.NumberValueStr(str);
                    self.NumberValueStr.valueHasMutated();
                }
                else {
                    self.NumberValueStr(inputStr);
                }
            };
            self.CreateNumberEditor = function () {
                self.applyTemplate(self);
                //
                $.when(self.TemplateLoadedD).done(function () {
                    var $input = self.$region.find('.sdNumberEditor');
                    var maxValue = self.options.maxValue ? self.options.maxValue : module.MaxCount;
                    var minValue = self.options.minValue ? self.options.minValue : module.MinCount;
                    $input.stepper({
                        type: self.options.stepperType ? self.options.stepperType : 'int',
                        floatPrecission: self.options.floatPrecission ? self.options.floatPrecission : 0,
                        wheelStep: 1,
                        arrowStep: 1,
                        limit: [minValue, maxValue],
                        onStep: function (val, up) {
                            self.ResetNumberValue(val.toString());
                        }
                    });
                    //
                    self.ResetNumberValue(self.options.oldValue.toString());
                    //
                    self.numericUpDownControlD.resolve();
                });
                return self.numericUpDownControlD.promise();
            };
            //
            self.ipAddressControlD = $.Deferred();
            self.ipInput = null;
            self.CreateIPAddressEditor = function () {
                self.applyTemplate(self);
                //
                $.when(self.TemplateLoadedD).done(function () {
                    var $input = self.$region.find('.ipAddressEditor');
                    self.ipInput = $input.ipInput();
                    self.ipInput.setIp(self.options.oldValue);
                    //
                    self.ipAddressControlD.resolve();
                });
                return self.ipAddressControlD.promise();
            };
            //
            self.Load = function () {
                if (mode.template == '')
                    self.TemplateLoadedD.resolve();
                //
                var retval = $.Deferred();
                var tmp = function () {
                    retval.resolve();
                };
                //
                if (mode.name == fh.SDEditorTemplateModes.richEdit.name)
                    $.when(self.CreateRichTextEditor()).done(tmp);
                else if (mode.name == fh.SDEditorTemplateModes.searcherEdit.name)
                    $.when(self.CreateSearcherEditor()).done(tmp);
                else if (mode.name == fh.SDEditorTemplateModes.searcherEditWithQueue.name)
                    $.when(self.CreateSearcherEditorWithQueue()).done(tmp);
                else if (mode.name == fh.SDEditorTemplateModes.htmlEdit.name)
                    $.when(self.CreateHtmlEditor()).done(tmp);
                else if (mode.name == fh.SDEditorTemplateModes.textEdit.name)
                    $.when(self.CreateTextEditor()).done(tmp);
                else if (mode.name == fh.SDEditorTemplateModes.parameterEdit.name)
                    $.when(self.CreateParameterEditor()).done(tmp);
                else if (mode.name == fh.SDEditorTemplateModes.comboBoxEdit.name)
                    $.when(self.CreateComboBoxEditor()).done(tmp);
                else if (mode.name == fh.SDEditorTemplateModes.dateEdit.name)
                    $.when(self.CreateDateEditor()).done(tmp);
                else if (mode.name == fh.SDEditorTemplateModes.timeEdit.name)
                    $.when(self.CreateTimeEditor()).done(tmp);
                else if (mode.name == fh.SDEditorTemplateModes.numberEdit.name)
                    $.when(self.CreateNumberEditor()).done(tmp);
                else if (mode.name == fh.SDEditorTemplateModes.ipAddressEdit.name)
                    $.when(self.CreateIPAddressEditor()).done(tmp);
                //
                return retval.promise();
            };
            //
            self.Focus = function () {
                if (mode.name == fh.SDEditorTemplateModes.richEdit.name)
                    $.when(self.richControlD).done(function () { });
                else if (mode.name == fh.SDEditorTemplateModes.searcherEdit.name)
                    $.when(self.objectSearcherControlD).done(function () {
                        var textbox = self.$region.find('.searcherInput');
                        textbox.click();
                        textbox.focus();
                    });
                else if (mode.name == fh.SDEditorTemplateModes.searcherEditWithQueue.name)
                    $.when(self.objectSearcherControlD).done(function () {
                        var textbox = self.$region.find('.searcherInputExecutor');
                        textbox.click();
                        textbox.focus();
                    });
                else if (mode.name == fh.SDEditorTemplateModes.htmlEdit.name)
                    $.when(self.htmlControlD).done(function () {
                        self.htmlControl.Focus();
                    });
                else if (mode.name == fh.SDEditorTemplateModes.textEdit.name)
                    $.when(self.textareaControlD).done(function () {
                        var textarea = self.$region.find('.sdTextEditor');
                        textarea.click();
                        textarea.focus();
                    });
                else if (mode.name == fh.SDEditorTemplateModes.parameterEdit.name)
                    $.when(self.TemplateLoadedD).done(function () {
                        var container = self.$region.find('.edit-field-template');
                        container.focus();
                    });
                else if (mode.name == fh.SDEditorTemplateModes.comboBoxEdit.name)
                    $.when(self.comboBoxControlD).done(function () {
                        self.$region.find('.combobox').focus();
                    });
                else if (mode.name == fh.SDEditorTemplateModes.dateEdit.name)
                    $.when(self.datetimePickerControlD).done(function () {
                        var dtp = self.$region.find('.date-time-input input');
                        dtp.click();
                        dtp.focus();
                    });
                else if (mode.name == fh.SDEditorTemplateModes.timeEdit.name)
                    $.when(self.timePickerControlD).done(function () {
                        var input = self.$region.find('.time-input');
                        input.click();
                        input.focus();
                    });
                else if (mode.name == fh.SDEditorTemplateModes.numberEdit.name)
                    $.when(self.numericUpDownControlD).done(function () {
                        var input = self.$region.find('.sdNumberEditor');
                        input.click();
                        input.focus();
                    });
                //
            };
            //
            self.AfterRender = function (elements) {
                //when template for mode loaded
                self.TemplateLoadedD.resolve();
            };
            //
            self.UpdateEditorValue = function (currentObjectID, currentObjectClassID, currentObjectValue) {
                if (mode.name == fh.SDEditorTemplateModes.richEdit.name) {
                    $.when(self.richControlD).done(function () {
                        options.oldValue = currentObjectValue;
                        objectToReturn = self.richControl.setValue(currentObjectValue);
                    });
                }
                else if (mode.name == fh.SDEditorTemplateModes.searcherEdit.name) {
                    $.when(self.objectSearcherControlD).done(function () {
                        if (currentObjectID || (options.allowAnyText == true && currentObjectValue && currentObjectValue.length > 0)) {//hasValue
                            if (self.options.oldValue == null)
                                self.options.oldValue = {};
                            //
                            self.options.oldValue.ID = currentObjectID;
                            self.options.oldValue.ClassID = currentObjectClassID;
                            self.options.oldValue.FullName = currentObjectValue;
                            //
                            var old = self.options.oldValue;
                            //
                            self.selectedObjectFullName(old.FullName);
                            self.objectSearcherControl.SetSelectedItem(old.ID, old.ClassID, old.FullName, '');
                            self.selectedObjectInfo = old;
                        } else {
                            self.options.oldValue = null;
                            self.selectedObjectFullName('');
                            self.objectSearcherControl.SetSelectedItem();
                            self.selectedObjectInfo = null;
                        }
                        //
                        self.RefreshSelectedUser();
                    });
                }
                else if (mode.name == fh.SDEditorTemplateModes.searcherEditWithQueue.name) {
                    $.when(self.objectSearcherControlD).done(function () {
                        if (currentObjectID || (options.allowAnyText == true && currentObjectValue && currentObjectValue.length > 0)) {//hasValue
                            if (self.options.oldValue == null)
                                self.options.oldValue = {};
                            //
                            self.options.oldValue.ID = currentObjectID;
                            self.options.oldValue.ClassID = currentObjectClassID;
                            self.options.oldValue.FullName = currentObjectValue;
                            //
                            var old = self.options.oldValue;
                            //
                            self.selectedObjectFullName(old.FullName);
                            self.objectSearcherControl.SetSelectedItem(old.ID, old.ClassID, old.FullName, '');
                            self.selectedObjectInfo = old;
                        } else {
                            self.options.oldValue = null;
                            self.selectedObjectFullName('');
                            self.objectSearcherControl.SetSelectedItem();
                            self.selectedObjectInfo = null;
                        }
                        //
                        self.RefreshSelectedUser();
                    });
                }
                else if (mode.name == fh.SDEditorTemplateModes.htmlEdit.name) {
                    $.when(self.htmlControlD).done(function () {
                        options.oldValue = currentObjectValue;
                        objectToReturn = self.htmlControl.SetHTML(currentObjectValue);
                    });
                }
                else if (mode.name == fh.SDEditorTemplateModes.textEdit.name) {
                    $.when(self.textareaControlD).done(function () {
                        options.oldValue = currentObjectValue;
                        var textarea = self.$region.find('.sdTextEditor');
                        textarea.val(currentObjectValue);
                    });
                }
                else if (mode.name == fh.SDEditorTemplateModes.parameterEdit.name) {
                    //TODO
                }
                else if (mode.name == fh.SDEditorTemplateModes.comboBoxEdit.name) {
                    $.when(self.comboBoxControllD).done(function () {
                        var selectedItem = null;
                        for (var i = 0; i < self.comboBoxValueList().length; i++)
                            if (self.comboBoxValueList()[i].ID == currentObjectValue) {
                                selectedItem = self.comboBoxValueList()[i];
                                break;
                            }
                        //
                        options.oldValue = selectedItem;
                        self.comboBoxSelectedValue(selectedItem);
                    });
                }
                else if (mode.name == fh.SDEditorTemplateModes.dateEdit.name) {
                    //TODO
                }
                else if (mode.name == fh.SDEditorTemplateModes.timeEdit.name) {
                    $.when(self.timePickerControlD).done(function () {
                        options.oldValue = currentObjectValue;
                        self.timePickerValue(currentObjectValue);
                    });
                }
                else if (mode.name == fh.SDEditorTemplateModes.numberEdit.name) {
                    $.when(self.numericUpDownControlD).done(function () {
                        options.oldValue = currentObjectValue;
                        self.ResetNumberValue(options.oldValue.toString());
                    });
                }
                else if (mode.name == fh.SDEditorTemplateModes.ipAddressEdit.name) {
                    $.when(self.ipAddressControlD).done(function () {
                        options.oldValue = currentObjectValue;
                        self.ipInput.setIp(currentObjectValue);
                    });
                }
            };
            //
            self.ajaxControl_save = new ajaxLib.control();
            self.Save = function (isReplaceAnyway) {
                var retD = $.Deferred();
                //
                $.when(self.TemplateLoadedD).done(function () {
                    var data = {
                        ID: options.ID,
                        ObjClassID: options.objClassID,
                        ClassID: options.ClassID,
                        ObjectList: options.ObjectList,
                        Field: options.fieldName,
                        OldValue: {},
                        NewValue: {},
                        ReplaceAnyway: isReplaceAnyway
                    };
                    //                        
                    var objectToReturn = {};
                    var d = $.Deferred();
                    //
                    if (mode.name == fh.SDEditorTemplateModes.richEdit.name) {
                        $.when(self.richControlD).done(function () {
                            objectToReturn = self.richControl.getValue();
                            //
                            data.NewValue = JSON.stringify({ 'text': objectToReturn });
                            data.OldValue = JSON.stringify({ 'text': options.oldValue });
                            //
                            d.resolve(true);
                        });
                    }
                    else if (mode.name == fh.SDEditorTemplateModes.comboBoxEdit.name) {
                        $.when(self.comboBoxControlD).done(function () {
                            if (options.readOnly === false) {
                                var selectedItem = self.comboBoxSelectedValue();
                                var name = self.$region.find('.combobox .textField').val();
                                var id = selectedItem && selectedItem.Name === name ? selectedItem.ID : null;
                                //
                                data.NewValue = JSON.stringify({ 'id': id, 'name': name });
                                //
                                objectToReturn = { ID: id, Name: name };
                            }
                            else {
                                objectToReturn = self.comboBoxSelectedValue();
                                data.NewValue = objectToReturn == null ? null : JSON.stringify({ 'id': objectToReturn.ID, 'name': objectToReturn.Name });
                            }
                            //
                            data.OldValue = self.options.oldValue == null ? null : JSON.stringify({ 'id': self.options.oldValue.ID, 'name': self.options.oldValue.Name });
                            //
                            d.resolve(true);
                        });
                    }
                    else if (mode.name == fh.SDEditorTemplateModes.searcherEdit.name) {
                        $.when(self.objectSearcherControlD).done(function () {
                            objectToReturn = self.selectedObjectInfo;
                            if (self.selectedUser() != null)
                                objectToReturn['UserInfo'] = self.selectedUser();
                            if (self.selectedObjectFullName() && self.selectedObjectFullName().length > 0 && options.allowAnyText == true &&
                                (!objectToReturn || objectToReturn && objectToReturn.FullName != self.selectedObjectFullName()))
                                objectToReturn = { ID: null, ClassID: null, FullName: self.selectedObjectFullName(), Details: '' };//objectInfo                            
                            //
                            data.NewValue = objectToReturn == null ? null : JSON.stringify({ 'id': objectToReturn.ID, 'fullName': self.selectedObjectFullName() });
                            data.OldValue = self.options.oldValue == null ? null : JSON.stringify({ 'id': self.options.oldValue.ID, 'fullName': self.options.oldValue.FullName, 'classID': self.options.oldValue.ClassID });
                            data.Params = objectToReturn == null ? [] : ['' + objectToReturn.ClassID, objectToReturn.FullName];
                            //
                            d.resolve(true);
                        });
                    } else if (mode.name == fh.SDEditorTemplateModes.searcherEditWithQueue.name) {
                        $.when(self.objectSearcherControlD).done(function () {
                            data.Field = 'QueueWithExecutor';
                            objectToReturn = self.selectedObjectInfo;
                            if (self.selectedObjectFullName() && self.selectedObjectFullName().length > 0 && options.allowAnyText == true &&
                                (!objectToReturn || objectToReturn && objectToReturn.FullName != self.selectedObjectFullName()))
                                objectToReturn = { ID: null, ClassID: null, FullName: self.selectedObjectFullName(), Details: '' };//objectInfo                            
                            //
                            if (self.selectedObjectInfoQueue == null)
                                self.selectedObjectInfoQueue = { ID: null };
                            if (self.selectedObjectInfo == null)
                                objectToReturn = self.selectedObjectInfoQueue;


                            data.NewValue = objectToReturn == null ? null : JSON.stringify({ 'id': objectToReturn.ID, 'fullName': self.selectedObjectFullName(), 'queueID': self.selectedObjectInfoQueue.ID });
                            data.OldValue = self.options.oldValue == null ? null : JSON.stringify({ 'id': self.options.oldValue.ID, 'fullName': self.options.oldValue.FullName, 'classID': self.options.oldValue.ClassID });
                            data.Params = objectToReturn == null ? [] : ['' + objectToReturn.ClassID, objectToReturn.FullName];
                            //
                            d.resolve(true);
                        });
                    }
                    else if (mode.name == fh.SDEditorTemplateModes.htmlEdit.name) {
                        $.when(self.htmlControlD).done(function () {
                            objectToReturn = self.htmlControl.GetHTML();
                            //
                            data.NewValue = JSON.stringify({ 'text': objectToReturn });
                            data.OldValue = JSON.stringify({ 'text': options.oldValue });
                            //
                            d.resolve(true);
                        });
                    }
                    else if (mode.name == fh.SDEditorTemplateModes.textEdit.name) {
                        $.when(self.textareaControlD).done(function () {
                            var textarea = self.$region.find('.sdTextEditor');
                            objectToReturn = textarea.val();
                            //
                            var maxLength = options.maxLength ? options.maxLength : 250;
                            var error = '';
                            if (objectToReturn.length == 0 && !options.allowNull)
                                error = getTextResource('ParameterString_StringLenMustBeMoreThan').replace('\"{0}\"', 0);
                            else if (objectToReturn.length > maxLength)
                                error = getTextResource('ParameterString_StringLenMustBeLessThan').replace('\"{0}\"', maxLength);
                            //
                            if (error != '') {
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('SaveError'), error, 'info');
                                });
                                d.resolve(false);
                                return;
                            }
                            //
                            if (options.isAssetUserField) {//используется для пользовательских полей у имущества (AssetFields.js)
                                data.NewValue = ko.toJSON([objectToReturn]);
                                data.OldValue = ko.toJSON([options.oldValue]);
                                data.Params = [options.userFieldID, options.identifier, options.type];
                            } else {
                                data.NewValue = JSON.stringify({ 'text': objectToReturn });
                                data.OldValue = JSON.stringify({ 'text': options.oldValue });
                                //
                                if (options.subdeviceParameterType) {//используется для задания параметров устройств у адаптеров и периферии (frmAsset.js)
                                    data.Params = options.subdeviceParameterType ? ['' + options.subdeviceParameterType] : [];
                                }
                            }
                            //
                            d.resolve(true);
                        });
                    }
                    else if (mode.name == fh.SDEditorTemplateModes.parameterEdit.name) {
                        var p = options.model;
                        var notSetParameterList = '';
                        var errorParameterList = '';
                        var success = true;
                        //
                        if (options.silent == true)
                            success = true;
                        else {
                            if (p.Type == 11 && p.IsBusyAnyEditor() == true) {//file uploading
                                errorParameterList += p.Name + ' (' + (p.GroupName ? p.GroupName : getTextResource('ParametersDefaultGroupName')) + ') - ' + getTextResource('UploadedFileNotFoundAtServerSide');
                                success = false;
                            }
                            else if (p.IsValueRequired && p.IsEmptyAllValues()) {//должно быть задано и пустое
                                if (p.IsValueExistsInAnyEditor()) {//возможные значения выбора есть
                                    notSetParameterList += p.Name + ' (' + (p.GroupName ? p.GroupName : getTextResource('ParametersDefaultGroupName')) + ')';
                                    success = false;
                                }
                            }
                            else if (p.InitialPackedValueList != p.GetPackedValueList()) {//значение параметра менялось пользователем
                                var error = p.GetValidationErrors();//invoke ko func
                                if (error != '') {
                                    errorParameterList += p.Name + ' (' + (p.GroupName ? p.GroupName : getTextResource('ParametersDefaultGroupName')) + ')';
                                    success = false;
                                }
                            }
                        }
                        //
                        if (!success) {
                            var msg = '';
                            if (notSetParameterList.length > 0)
                                msg += getTextResource('ParametersMustBeSet') + ':\r\n' + notSetParameterList;
                            if (errorParameterList.length > 0) {
                                if (msg.length > 0)
                                    msg += '\r\n';
                                msg += getTextResource('ParametersValueIncorrect') + ':\r\n' + errorParameterList;
                            }
                            if (msg.length > 0)
                                require(['sweetAlert'], function () {
                                    swal(msg);
                                });
                            d.resolve(false);
                        }
                        else {
                            var realModel = options.tableModel ? options.tableModel : options.model;
                            //
                            data.NewValue = realModel.GetPackedValueList();
                            data.OldValue = options.oldValue;
                            data.Params = [realModel.ID, realModel.Identifier, realModel.Type];
                            //
                            d.resolve(true);
                        }
                    }
                    else if (mode.name == fh.SDEditorTemplateModes.dateEdit.name) {
                        $.when(self.datetimePickerControlD).done(function () {
                            var dv = self.dateTime();
                            //
                            if (options.allowNull) {
                                var dtInput = self.$region.find('.date-time-input .dateTimeControlInput');
                                var dtText = dtInput.val();
                                //
                                objectToReturn = dtLib.Date2String(dv, true) == dtText ? dtLib.GetMillisecondsSince1970(dv) : '';
                            }
                            else {
                                objectToReturn = dtLib.GetMillisecondsSince1970(dv);
                            }
                            //
                            data.NewValue = JSON.stringify({ 'text': objectToReturn });
                            data.OldValue = JSON.stringify({ 'text': dtLib.GetMillisecondsSince1970(options.oldValue) });
                            //
                            d.resolve(true);
                        });
                    }
                    else if (mode.name == fh.SDEditorTemplateModes.timeEdit.name) {
                        $.when(self.timePickerControlD).done(function () {
                            var time = self.ParseTimePickerValue();
                            if (time < 0)
                                d.resolve(false);
                            //
                            objectToReturn = time;
                            //
                            data.NewValue = JSON.stringify({ 'val': objectToReturn });
                            data.OldValue = JSON.stringify({ 'val': options.oldValue == null ? null : options.oldValue });
                            //
                            d.resolve(true);
                        });
                    }
                    else if (mode.name == fh.SDEditorTemplateModes.numberEdit.name) {
                        $.when(self.numericUpDownControlD).done(function () {
                            self.ResetNumberValue(self.NumberValueStr());
                            objectToReturn = self.NumberValue();
                            //
                            data.NewValue = JSON.stringify({ 'val': objectToReturn });
                            data.OldValue = JSON.stringify({ 'val': options.oldValue });
                            //
                            d.resolve(true);
                        });
                    }
                    else if (mode.name == fh.SDEditorTemplateModes.ipAddressEdit.name) {
                        $.when(self.ipAddressControlD).done(function () {
                            objectToReturn = self.ipInput.getIp();
                            //
                            data.NewValue = JSON.stringify({ 'val': objectToReturn });
                            data.OldValue = JSON.stringify({ 'val': options.oldValue });
                            //
                            d.resolve(true);
                        });
                    }
                    //
                    $.when(d).done(function (result) {
                        if (result == false) {
                            retD.resolve(false);
                            return;
                        }
                        if (options.allowNull == false && objectToReturn == null) {
                            require(['sweetAlert'], function () {
                                swal(getTextResource('SaveError'), getTextResource('ValueNotSet'), 'info');
                                retD.resolve(false);
                            });
                            return;
                        }
                        //
                        if (data.Field == 'Call.Client' && data.ObjClassID == 701 && data.NewValue == null) {
                            require(['sweetAlert'], function () {
                                swal(getTextResource('SaveError'), getTextResource('ClientNotSpecified'), 'error');
                                retD.resolve(false);
                            });
                            return;
                        }
                        //
                        if (options.nosave == true) {
                            if (options.onSave != null)
                                options.onSave(objectToReturn);
                            retD.resolve(true);
                        }
                        else
                            self.ajaxControl_save.Ajax(
                                null,//self.$region, two spinner problem
                                {
                                    dataType: "json",
                                    method: 'POST',
                                    url: 'sdApi/SetField',
                                    data: data
                                },
                                function (retModel) {
                                    if (retModel) {
                                        var result = retModel.ResultWithMessage.Result;
                                        var message = retModel.ResultWithMessage.Message;
                                        //
                                        if (result === 0) {
                                            if (options.onSave != null)
                                                options.onSave(objectToReturn);
                                            //
                                            $(document).trigger('local_objectUpdated', [options.objClassID, options.ID, null]);
                                            //
                                            retD.resolve(true);
                                        }
                                        else if (result === 1) {
                                            require(['sweetAlert'], function () {
                                                swal(getTextResource('SaveError'), getTextResource('NullParamsError'), 'error');
                                                retD.resolve(false);
                                            });
                                        }
                                        else if (result === 2) {
                                            require(['sweetAlert'], function () {
                                                swal(getTextResource('SaveError'), getTextResource('BadParamsError'), 'error');
                                                retD.resolve(false);
                                            });
                                        }
                                        else if (result === 3) {
                                            require(['sweetAlert'], function () {
                                                swal(getTextResource('SaveError'), getTextResource('AccessError'), 'error');
                                                retD.resolve(false);
                                            });
                                        }
                                        // 4 - is global error
                                        else if (result === 5 && isReplaceAnyway == false) {
                                            hideSpinner();//we start him in formHelper when clicked
                                            require(['sweetAlert'], function () {
                                                swal({
                                                    title: getTextResource('SaveError'),
                                                    text: getTextResource('ConcurrencyError'),
                                                    showCancelButton: true,
                                                    closeOnConfirm: true,
                                                    closeOnCancel: true,
                                                    confirmButtonText: getTextResource('ButtonOK'),
                                                    cancelButtonText: getTextResource('ButtonCancel')
                                                },
                                                    function (value) {
                                                        if (value == true) {
                                                            var secondPromise = self.Save(true);
                                                            $.when(secondPromise).done(function () { retD.resolve(true); });
                                                        }
                                                        else {
                                                            self.UpdateEditorValue(retModel.CurrentObjectID, retModel.CurrentObjectClassID, retModel.CurrentObjectValue);
                                                            retD.resolve(false);
                                                        }
                                                    });
                                            });
                                        }
                                        else if (result === 6) {
                                            require(['sweetAlert'], function () {
                                                swal(getTextResource('SaveError'), getTextResource('ObjectDeleted'), 'error');
                                                retD.resolve(true);
                                            });
                                        }
                                        else if (result === 7) {
                                            require(['sweetAlert'], function () {
                                                swal(getTextResource('SaveError'), getTextResource('OperationError'), 'error');
                                                retD.resolve(false);
                                            });
                                        }
                                        else if (result === 8) {
                                            require(['sweetAlert'], function () {
                                                swal(getTextResource('SaveError'), message, 'info');
                                                retD.resolve(false);
                                            });
                                        }
                                        else if (result === 12) {
                                            hideSpinner();//we start him in formHelper when clicked
                                            require(['sweetAlert'], function () {
                                                swal({
                                                    title: getTextResource('SaveError'),
                                                    text: message,
                                                    showCancelButton: true,
                                                    closeOnConfirm: true,
                                                    closeOnCancel: true,
                                                    confirmButtonText: getTextResource('SaveAnyWay'),
                                                    cancelButtonText: getTextResource('ButtonCancel')
                                                },
                                                    function (value) {
                                                        if (value == true) {
                                                            showSpinner();
                                                            var secondPromise = self.Save(true);
                                                            $.when(secondPromise).done(function () { retD.resolve(true); });
                                                        }
                                                        else {
                                                            //self.UpdateEditorValue(retModel.CurrentObjectID, retModel.CurrentObjectClassID, retModel.CurrentObjectValue);
                                                            retD.resolve(false);
                                                        }
                                                    });
                                            });
                                        }
                                        else {
                                            require(['sweetAlert'], function () {
                                                swal(getTextResource('SaveError'), getTextResource('GlobalError'), 'error');
                                                retD.resolve(false);
                                            });
                                        }
                                    }
                                    else {
                                        require(['sweetAlert'], function () {
                                            swal(getTextResource('SaveError'), getTextResource('GlobalError'), 'error');
                                            retD.resolve(false);
                                        });
                                    }
                                });
                    });
                });
                //
                return retD.promise();
            };
        }
    }
    return module;
});
