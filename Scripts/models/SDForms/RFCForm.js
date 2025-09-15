define(['knockout', 'jquery', 'ajax',
    'models/SDForms/SDForm.CallReferenceList',
    'usualForms', 'ttControl',
    'parametersControl', 'models/SDForms/SDForm.Tape', 'models/SDForms/SDForm.WOReferenceList',
    'models/SDForms/SDForm.NegotiationList', 'models/SDForms/SDForm.LinkList',
    'comboBox'],
    function (ko, $, ajaxLib,
        callReferenceListLib,
        fhModule, tclib,
        pcLib, tapeLib, workOrderReferenceListLib,
        negotiationListLib,linkListLib) {
    var module = {
        ViewModel: function (isReadOnly, $region, id) {
            var self = this;
            var $isLoaded = $.Deferred();
            self.$region = $region;
            self.CloseForm = null; // set in fh
            self.ControlForm = null; //set in fh
            self.CurrentUserID = null; //set in fh
            self.id = id;
            self.objectClassID = 703; //RFC object id
            self.modes = {
                nothing: 'nothing',
                main: 'main',
                tape: 'tape',
                calls: 'calls',
                links: 'links',
                linksKE: 'linksKE',
                negotiation: 'negotiation',
                workorders: 'workorders'
            };
            $.when(userD).done(function (user) {
                self.CurrentUserID = user.UserID;
            });
            self.IsClientMode = ko.observable(false);
            self.IsReadOnly = ko.observable(isReadOnly);
            self.RefreshParameters = ko.observable(false);
            self.TabHeight = ko.observable(0);
            self.TabWidth = ko.observable(0);
            self.TabSize = ko.computed(function () {
                return {
                    h: self.TabHeight(),
                    w: self.TabWidth()
                };
            });
            //
            self.negotiationID = null;//negotiation to show 
            //
            //MAIN TAB BLOCK
            self.mainTabLoaded = ko.observable(false);
            self.solutionTabLoaded = ko.observable(false);
            self.mode = ko.observable(self.modes.nothing);
            self.mode.subscribe(function (newValue) {
                if (newValue == self.modes.nothing)
                    return;
                //
                if (newValue == self.modes.main) {
                    if (!self.mainTabLoaded()) {
                        self.mainTabLoaded(true);
                        //
                        self.SizeChanged();
                    }
                }
                else if (newValue == self.modes.tape)
                    self.tapeControl.CheckData();
                else if (newValue == self.modes.workorders)
                    self.workOrderList.CheckData();
                else if (newValue == self.modes.links)
                    self.linkList.CheckData();
                else if (newValue == self.modes.calls)
                    self.callList.CheckData();
                else if (newValue == self.modes.linksKE)
                    self.linkListKE.CheckData();
                else if (newValue == self.modes.negotiation)
                    self.negotiationList.CheckData(self.negotiationID);
                else if (newValue.indexOf(self.parameterModePrefix) != -1) {
                    self.InitializeParametersTabs();
                }
            });
            //
            self.RFC = ko.observable(null);
            self.RFC.subscribe(function (newValue) {
                $.when($isLoaded).done(function () {
                    self.SizeChanged();//block
                    //
                    if (newValue.InRealization)
                        self.InRealization(newValue.InRealization())
                    //
                    self.LoadWorkflowControl();
                    if (self.IsReadOnly() == false) {
                        self.LoadPriorityControl();
                        //
                    self.OnParametersChanged();
                    }
                });
            });
            //
            self.IsReadOnly = ko.observable(isReadOnly);
            self.IsReadOnly.subscribe(function (newValue) {
                var readOnly = self.IsReadOnly();
                //
                if (self.attachmentsControl != null)
                    self.attachmentsControl.ReadOnly(readOnly);
                //
                if (self.attachmentsRealizationControl != null)
                    self.attachmentsRealizationControl.ReadOnly(readOnly);
                //
                if (self.attachmentsRollbackControl != null)
                    self.attachmentsRollbackControl.ReadOnly(readOnly);
                //
                if (self.workflowControl() != null)
                    self.workflowControl().ReadOnly(readOnly);
                //
                if (self.parametersControl != null)
                    self.parametersControl.ReadOnly(readOnly);
                //
                if (self.priorityControl != null)
                    self.priorityControl.ReadOnly(readOnly);
                //
                if (self.linkList != null)
                    self.linkList.ReadOnly(readOnly);
            });
            //
            self.CanEdit = ko.computed(function () {
                return !self.IsReadOnly();
            });
            //
            self.workflowControl = ko.observable(null);
            self.LoadWorkflowControl = function () {
                if (!self.RFC())
                    return;
                //
                require(['workflow'], function (wfLib) {
                    if (self.workflowControl() == null) {
                        self.workflowControl(new wfLib.control(self.$region, self.IsReadOnly, self.RFC));
                    }
                    self.workflowControl().ReadOnly(self.IsReadOnly());
                    self.workflowControl().Initialize();
                });
            };
            //
            self.priorityControl = null;
            self.LoadPriorityControl = function () {
                if (!self.RFC())
                    return;
                //
                require(['models/SDForms/SDForm.Priority'], function (prLib) {
                    if (self.priorityControl == null || self.priorityControl.IsLoaded() == false) {
                        self.priorityControl = new prLib.ViewModel(self.$region.find('.b-requestDetail-menu__priority'), self, self.IsReadOnly());
                        self.priorityControl.Initialize();
                    }
                    $.when(self.priorityControl.Load(self.RFC().ID(), self.objectClassID, self.RFC().UrgencyID(), self.RFC().InfluenceID(), self.RFC().PriorityID())).done(function (result) {
                        //not needed now
                    });
                });
            };
            //
            self.RefreshPriority = function (priorityObj) {
                if (priorityObj == null)
                    return;
                //
                self.RFC().PriorityName(priorityObj.Name);
                self.RFC().PriorityColor(priorityObj.Color);
                self.RFC().PriorityID(priorityObj.ID);
                self.RFC().InfluenceID(self.priorityControl.CurrentInfluenceID());
                self.RFC().UrgencyID(self.priorityControl.CurrentUrgencyID());
            };
            //
            self.ajaxControl_CustomControl = new ajaxLib.control();
            self.ajaxControl_CustomControlUsers = new ajaxLib.control();
            self.CustomControl = ko.observable(false);
            self.LoadCustomControl = function () {
                if (!self.RFC())
                    return;
                //
                var param = {
                    objectID: self.RFC().ID(),
                };
                self.ajaxControl_CustomControl.Ajax(self.$region.find('.b-requestDetail-menu__item-control'),
                    {
                        method: 'GET',
                        url: 'accountApi/GetCustomControl?' + $.param(param)
                    },
                    function (result) {
                        if (result != null)
                            self.CustomControl(result);
                    });
                //
                var param2 = {
                    objectID: self.RFC().ID(),
                    objectClassID: self.objectClassID
                };
                self.ajaxControl_CustomControlUsers.Ajax(self.$region.find('.b-requestDetail-menu__item-control'),
                    {
                        method: 'GET',
                        url: 'userApi/GetUserInfoListOnCustomControl?' + $.param(param2)
                    },
                    function (result) {
                        if (result && result.length > 0)
                            require(['models/SDForms/SDForm.User'], function (userLib) {
                                ko.utils.arrayForEach(result, function (el) {
                                    var already = ko.utils.arrayFirst(self.RFCUsersList(), function (item) {
                                        return item.ID() == el.ID;
                                    });
                                    //                    
                                    if (already != null)
                                        return;
                                    //
                                    var options = {
                                        UserID: el.ID,
                                        UserType: userLib.UserTypes.inspector,
                                        UserName: el.FullName,
                                        EditAction: null,
                                        RemoveAction: null,
                                        UserData: el,
                                        CanNote: true
                                    };
                                    var user = new userLib.User(self, options);
                                    //
                                    self.RFCUsersList.push(user);
                                });
                            });
                    });
            };
            self.SaveCustomControl = function () {
                if (!self.RFC())
                    return;
                //
                var param = {
                    objectID: self.RFC().ID(),
                    objectClassID: self.objectClassID,
                    value: self.CustomControl()
                };
                self.ajaxControl_CustomControl.Ajax(self.$region.find('.b-requestDetail-menu__item-control'),
                    {
                        method: 'POST',
                        url: 'accountApi/SetCustomControl?' + $.param(param)
                    },
                    function (result) {
                        if (result != true) {
                            self.CustomControl(!self.CustomControl());//restore
                            //
                            require(['sweetAlert'], function () {
                                swal(getTextResource('SaveError'), getTextResource('GlobalError'), 'error');
                            });
                        }
                    });
            };
            self.CustomControlClick = function () {//поставить/снять с контроля
                self.CustomControl(!self.CustomControl());
                self.SaveCustomControl();
            };
            //
            self.showContextMenu = function (obj, e) {
                var contextMenuViewModel = self.contextMenu();
                e.preventDefault();
                contextMenuViewModel.show(e);
                return true;
            };
            //
            self.contextMenu = ko.observable(null);

            self.contextMenuInit = function (contextMenu) {
                self.contextMenu(contextMenu);//bind contextMenu

                self.setCustomControl(contextMenu);
                //Поставить на контроль 
                self.removeCustomControl(contextMenu);
                //Снять с контроля 
            };
            //
            self.contextMenuOpening = function (contextMenu) {
                contextMenu.items().forEach(function (item) {
                    if (item.isEnable && item.isVisible) {
                        item.enabled(item.isEnable());
                        item.visible(item.isVisible());
                    }
                });
            };
            self.getItemInfos = function () {
                var retval = [];
                retval.push({
                    ClassID: self.objectClassID,
                    ID: self.id
                });
                return retval;
            };

            self.ajaxControl_SetCustomControl = new ajaxLib.control();
            self.setCustomControl = function (contextMenu) {
                var isEnable = function () {
                    return true;
                };
                var isVisible = function () {
                    return true;
                };
                var action = function () {
                    var callback = function (selectedUserList) {
                        showSpinner();
                        //
                        var data = {
                            'CustomControl': true,
                            'ObjectList': self.getItemInfos(),
                            'UserList': selectedUserList,
                            'IsEngineerView': true
                        };
                        self.ajaxControl_SetCustomControl.Ajax(null,
                            {
                                dataType: "json",
                                method: 'POST',
                                data: data,
                                url: 'sdApi/SetCustomControlToList'
                            },
                            function (newVal) {
                                hideSpinner();
                                for (var i = 0; i < selectedUserList.length; i++) {
                                    if (selectedUserList[i].ID == self.CurrentUserID)
                                        self.CustomControlClick(true);
                                }
                            });
                    };
                    //
                    require(['sdForms'], function (fhModule) {
                        var fh = new fhModule.formHelper();
                        var userInfo = { UserID: self.CurrentUserID, CustomControlObjectID: self.id, SetCustomControl: true, UseTOZ: true };
                        fh.ShowUserSearchForm(userInfo, callback);
                    });
                }
                var cmd = contextMenu.addContextMenuItem();
                cmd.restext('SetCustomControl');
                cmd.isEnable = isEnable;
                cmd.isVisible = isVisible;
                cmd.click(action);
            };
            //
            self.removeCustomControl = function (contextMenu) {
                var isEnable = function () {
                    return true;
                };
                var isVisible = function () {
                    return true;
                };
                var action = function () {
                    var callback = function (selectedUserList) {
                        showSpinner();
                        //
                        var data = {
                            'CustomControl': false,
                            'ObjectList': self.getItemInfos(),
                            'UserList': selectedUserList,
                            'IsEngineerView': true
                        };
                        self.ajaxControl_SetCustomControl.Ajax(null,
                            {
                                dataType: "json",
                                method: 'POST',
                                data: data,
                                url: 'sdApi/SetCustomControlToList'
                            },
                            function (newVal) {
                                hideSpinner();
                                for (var i = 0; i < selectedUserList.length; i++) {
                                    if (selectedUserList[i].ID == self.CurrentUserID)
                                        self.CustomControlClick(false);
                                }
                            });
                    };
                    //
                    require(['sdForms'], function (fhModule) {
                        var fh = new fhModule.formHelper();
                        var userInfo = { UserID: self.CurrentUserID, CustomControlObjectID: self.id, SetCustomControl: false, UseTOZ: true };
                        fh.ShowUserSearchForm(userInfo, callback);
                    });
                }
                var cmd = contextMenu.addContextMenuItem();
                cmd.restext('RemoveCustomControl');
                cmd.isEnable = isEnable;
                cmd.isVisible = isVisible;
                cmd.click(action);
            };
            //
            //
            self.SendMail = function () {
                showSpinner();
                require(['sdForms'], function (module) {
                    var fh = new module.formHelper(true);
                    //
                    var options = {
                        Obj: {
                            ID: self.id,
                            ClassID: self.objectClassID
                        },
                        CanNote: true,
                        Subject: getTextResource('RFC') + (self.RFC() != null ? (' №' + self.RFC().Number() + ' ' + self.RFC().Summary()) : '')
                    }
                    fh.ShowSendEmailForm(options);
                });
            };
            //
            //RFCTarget
            {
                self.RFCTargetText = getTextResource('Target') + ': ';
                self.EditTarget = function () {
                    if (self.CanEdit() == false)
                        return;
                    showSpinner();
                    require(['usualForms'], function (module) {
                        var fh = new module.formHelper(true);
                        var options = {
                            ID: self.RFC().ID(),
                            objClassID: self.objectClassID,
                            fieldName: 'RFC.Target',
                            fieldFriendlyName: getTextResource('Target'),
                            oldValue: self.RFC().Target(),
                            maxLength: 250,
                            onSave: function (newText) {
                                self.RFC().Target(newText);
                            }
                        };
                        fh.ShowSDEditor(fh.SDEditorTemplateModes.textEdit, options);
                    });
                };
            }
            //
            //EditManhoursWork
            self.EditManhoursWork = function () {
                require(['usualForms'], function (fhModule) {
                    var fh = new fhModule.formHelper();
                    fh.ShowManhoursWorkList(self.RFC, self.objectClassID, self.CanEdit);
                });
            };
            self.EditManhoursNorm = function () {
                if (self.CanEdit() == false)
                    return;
                showSpinner();
                require(['usualForms'], function (module) {
                    var fh = new module.formHelper(true);
                    var options = {
                        ID: self.RFC().ID(),
                        objClassID: self.objectClassID,
                        fieldName: 'RFC.ManhoursNorm',
                        fieldFriendlyName: getTextResource('ManhoursNorm'),
                        oldValue: self.RFC().ManhoursNorm(),
                        onSave: function (newVal) {
                            self.RFC().ManhoursNorm(newVal);
                        }
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.timeEdit, options);
                });
            };
            //
            //attachments
            {
                self.attachmentsRealizationControl = null;
                self.LoadRealizationAttachmentsControl = function () {
                    if (!self.RFC())
                        return;
                    //
                    require(['fileControl'], function (fcLib) {
                        if (self.attachmentsRealizationControl != null) {
                            if (self.attachmentsRealizationControl.ObjectID != self.RFC().ID())//previous object  
                                self.attachmentsRealizationControl.RemoveUploadedFiles();
                            else if (!self.attachmentsRealizationControl.IsAllFilesUploaded())//uploading
                            {
                                setTimeout(self.LoadRealizationAttachmentsControl, 1000);//try to reload after second
                                return;
                            }
                        }
                        if (self.attachmentsRealizationControl == null || self.attachmentsRealizationControl.IsLoaded() == false) {
                            var attachmentsElement = self.$region.find('.documentRealizationList');
                            self.attachmentsRealizationControl = new fcLib.control(attachmentsElement, '.realizationFileField', '.addRealizationFileBtn', null, true, true);
                            self.attachmentsRealizationControl.OnChange = function () {
                                if (self.workflowControl() != null)
                                    self.workflowControl().OnSave();

                                var options = {
                                    FieldName: 'RFC.RealizationAttachments',
                                    OldValue: self.RFC().RealizationDocumentID().length == 0 ? null : JSON.stringify({ 'id': self.RFC().RealizationDocumentID() }),
                                    NewValue: self.attachmentsRealizationControl.GetData().length == 0 ? null : JSON.stringify({ 'id': self.attachmentsRealizationControl.GetData()[0].ID }),
                                    onSave: function () {
                                        }
                                    };
                                self.UpdateField(false, options);
                            };
                        }
                        self.attachmentsRealizationControl.ReadOnly(self.IsReadOnly());
                        self.attachmentsRealizationControl.InitializeOneSelectFileControl(self.RFC().ID(), self.RFC().RealizationDocumentID(), true);
                    });
                };
                self.attachmentsRollbackControl = null;
                self.LoadRollbackAttachmentsControl = function () {
                    if (!self.RFC())
                        return;
                    //
                    require(['fileControl'], function (fcLib) {
                        if (self.attachmentsRollbackControl != null) {
                            if (self.attachmentsRollbackControl.ObjectID != self.RFC().ID())//previous object  
                                self.attachmentsRollbackControl.RemoveUploadedFiles();
                            else if (!self.attachmentsRollbackControl.IsAllFilesUploaded())//uploading
                            {
                                setTimeout(self.LoadRollbackAttachmentsControl, 1000);//try to reload after second
                                return;
                            }
                        }
                        if (self.attachmentsRollbackControl == null || self.attachmentsRollbackControl.IsLoaded() == false) {
                            var attachmentsElement = self.$region.find('.documentRollbackList');
                            self.attachmentsRollbackControl = new fcLib.control(attachmentsElement, '.rollbackFileField', '.addRollbackFileBtn', null, true, true);
                            self.attachmentsRollbackControl.OnChange = function () {
                                if (self.workflowControl() != null)
                                    self.workflowControl().OnSave();
                                var options = {
                                    FieldName: 'RFC.RollbackAttachments',
                                    OldValue: self.RFC().RollbackDocumentID().length == 0 ? null : JSON.stringify({ 'id': self.RFC().RollbackDocumentID() }),
                                    NewValue: self.attachmentsRollbackControl.GetData().length == 0 ? null : JSON.stringify({ 'id': self.attachmentsRollbackControl.GetData()[0].ID }),
                                    onSave: function () {
                                    }
                                };
                                self.UpdateField(false, options);
                            };
                        }
                        self.attachmentsRollbackControl.ReadOnly(self.IsReadOnly());
                        self.attachmentsRollbackControl.InitializeOneSelectFileControl(self.RFC().ID(), self.RFC().RollbackDocumentID(), true);
                    });
                };
                self.attachmentsControl = null;
                self.LoadAttachmentsControl = function () {
                    if (!self.RFC())
                        return;
                    //
                    require(['fileControl'], function (fcLib) {
                        if (self.attachmentsControl != null) {
                            if (self.attachmentsControl.ObjectID != self.RFC().ID())//previous object  
                                self.attachmentsControl.RemoveUploadedFiles();
                            else if (!self.attachmentsControl.IsAllFilesUploaded())//uploading
                            {
                                setTimeout(self.LoadAttachmentsControl, 1000);//try to reload after second
                                return;
                            }
                        }
                        if (self.attachmentsControl == null || self.attachmentsControl.IsLoaded() == false) {
                            var attachmentsElement = self.$region.find('.RFCdocumentList');
                            self.attachmentsControl = new fcLib.control(attachmentsElement, '.RFCFileField', '.addFileBtn');
                            self.attachmentsControl.OnChange = function () {
                                if (self.workflowControl() != null)
                                    self.workflowControl().OnSave();
                            };
                        }
                        self.attachmentsControl.ReadOnly(self.IsReadOnly());
                        self.attachmentsControl.Initialize(self.RFC().ID());
                    });
                };
            }
            //
            //FileContainer
            {
                self.IsFileContainerVisible = ko.observable(false);
                self.ToggleFileContainer = function () {
                    self.IsFileContainerVisible(!self.IsFileContainerVisible());
                };
            }
            //
            //EditFundingAmount
            {
                self.EditFundingAmount = function () {
                    if (self.CanEdit() == false)
                        return;
                    showSpinner();
                    require(['usualForms'], function (module) {
                        var fh = new module.formHelper(true);
                        var options = {
                            ID: self.RFC().ID(),
                            objClassID: self.objectClassID,
                            fieldName: 'RFC.FundingAmount',
                            fieldFriendlyName: getTextResource('FundingAmount'),
                            oldValue: self.RFC().FundingAmount(),
                            maxLength: 250,
                            onSave: function (newText) {
                                self.RFC().FundingAmount(newText);
                            }
                        };
                        fh.ShowSDEditor(fh.SDEditorTemplateModes.numberEdit, options);
                    });
                };
                self.IsPlanningContainerVisible = ko.observable(false);
                self.TogglePlanningContainer = function () {
                    self.IsPlanningContainerVisible(!self.IsPlanningContainerVisible());
                };
            }
            //
            self.EditSummary = function () {
                if (self.CanEdit() == false)
                    return;
                showSpinner();
                require(['usualForms'], function (module) {
                    var fh = new module.formHelper(true);
                    var options = {
                        ID: self.RFC().ID(),
                        objClassID: self.objectClassID,
                        fieldName: 'RFC.Summary',
                        fieldFriendlyName: getTextResource('Summary'),
                        oldValue: self.RFC().Summary(),
                        maxLength: 250,
                        onSave: function (newText) {
                            self.RFC().Summary(newText);
                        }
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.textEdit, options);
                });
            };
            //
            self.EditDescription = function () {
                if (self.CanEdit() == false)
                    return;
                showSpinner();
                require(['usualForms'], function (module) {
                    var fh = new module.formHelper(true);
                    var options = {
                        ID: self.RFC().ID(),
                        objClassID: self.objectClassID,
                        fieldName: 'RFC.Description',
                        fieldFriendlyName: getTextResource('Description'),
                        oldValue: self.RFC().Description(),
                        onSave: function (newHTML) {
                            self.RFC().Description(newHTML);
                        },
                        readOnly: !self.CanEdit()
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.htmlEdit, options);
                });
            };
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
            //rfcType
            {
                self.EditRFCType = function () {
                    if (self.CanEdit() == false)
                        return;
                    showSpinner();
                    var fh = new fhModule.formHelper(true);
                    var options = {
                        ID: self.RFC().ID(),
                        objClassID: self.objectClassID,
                        fieldName: 'RFC.RFCType',
                        fieldFriendlyName: getTextResource('RFCType'),
                        oldValue: { ID: self.RFC().TypeID(), ClassID: 710, FullName: self.RFC().TypeName() },
                        searcherName: 'RFCTypeSearcher',
                        searcherPlaceholder: getTextResource('RFCType'),
                        onSave: function (objectInfo) {
                            if (!objectInfo)
                                return;
                            self.RFC().TypeID(objectInfo.ID);
                            self.RFC().TypeName(objectInfo.FullName);
                            self.LoadWorkflowControl();
                            self.RefreshParameters(true);
                            self.OnParametersChanged();
                        }
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.searcherEdit, options);
                };
            }
            //
            //rfcCategory
            {
                self.EditRFCCategory = function () {
                    if (self.CanEdit() == false)
                        return;
                    showSpinner();
                    var fh = new fhModule.formHelper(true);
                    var options = {
                        ID: self.RFC().ID(),
                        objClassID: self.objectClassID,
                        fieldName: 'RFC.RFCCategory',
                        fieldFriendlyName: getTextResource('RFCCategory'),
                        oldValue: { ID: self.RFC().CategoryID()},
                        searcherName: 'RFCCategorySearcher',
                        searcherPlaceholder: getTextResource('RFCCategory'),
                        onSave: function (objectInfo) {
                            self.RFC().CategoryID(objectInfo == null ? null : objectInfo.ID)
                            self.RFC().CategoryName(objectInfo == null ? null : objectInfo.FullName)
                        }
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.searcherEdit, options);
                };
            }
            //
            //EditService
            {
                self.EditService = function () {
                    if (self.CanEdit() == false)
                        return;
                    showSpinner();
                    var fh = new fhModule.formHelper(true);
                    var options = {
                        ID: self.RFC().ID(),
                        objClassID: self.objectClassID,
                        fieldName: 'RFC.Service',
                        fieldFriendlyName: getTextResource('CallService'),
                        oldValue: { ID: self.RFC().ServiceID(), FullName: self.RFC().ServiceName() },
                        searcherName: 'ServiceSearcherForRFC',
                        searcherPlaceholder: getTextResource('CallService'),
                        onSave: function (objectInfo) {
                            self.RFC().ServiceID(objectInfo.ID)
                            self.RFC().ServiceName(objectInfo.FullName)
                        }
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.searcherEdit, options);
                };
            }
            //
            //EditStartDate
            {
                self.EditStartDate = function () {
                    if (self.CanEdit() == false)
                        return;
                    showSpinner();
                    require(['usualForms'], function (module) {
                        var fh = new module.formHelper(true);
                        var options = {
                            ID: self.RFC().ID(),
                            objClassID: self.objectClassID,
                            fieldName: 'RFC.DateStarted',
                            fieldFriendlyName: getTextResource('ToBegin'),
                            oldValue: self.RFC().UtcDateStartedDT(),
                            onSave: function (newDate) {
                                self.RFC().UtcDateStarted(parseDate(newDate));
                                self.RFC().UtcDateStartedDT(new Date(parseInt(newDate)));
                            }
                        };
                        fh.ShowSDEditor(fh.SDEditorTemplateModes.dateEdit, options);
                    });
                }
                self.DateStarCalculated = ko.computed(function () { //или из объекта, или из хода выполнения
                    var retval = '';
                    //
                    if (!retval && self.RFC) {
                        var rfc = self.RFC();
                        if (rfc && rfc.UtcDateStarted)
                            retval = rfc.UtcDateStarted();
                    }
                    //
                    return retval;
                });     
            }
            //           
            //initiator
            {
                self.InitializeInitiator = function () {
                    require(['models/SDForms/SDForm.User'], function (userLib) {
                        var rfc = self.RFC();
                        if (rfc.InitiatorLoaded() == false && rfc.InitiatorID()) {
                            var options = {
                                UserID: rfc.InitiatorID(),
                                UserType: userLib.UserTypes.initiator,
                                UserName: null,
                                EditAction: self.EditInitiator,
                                RemoveAction: self.DeleteInitiator,
                                CanNote: true
                            };
                            var user = new userLib.User(self, options);
                            rfc.Initiator(user);
                            rfc.InitiatorLoaded(true);
                            //
                            var already = ko.utils.arrayFirst(self.RFCUsersList(), function (item) {
                                return item.ID() == rfc.OwnerID();
                            });
                            //
                            if (already == null)
                                self.RFCUsersList.push(user);
                            else if (already.Type == userLib.UserTypes.withoutType) {
                                self.RFCUsersList.remove(already);
                                self.RFCUsersList.push(user);
                            }
                        }
                    });
                };
                self.EditInitiator = function () {
                    if (self.CanEdit() == false)
                        return;
                    showSpinner();
                    require(['usualForms', 'models/SDForms/SDForm.User'], function (module, userLib) {
                        var fh = new module.formHelper(true);
                        var options = {
                            ID: self.RFC().ID(),
                            objClassID: self.objectClassID,
                            fieldName: 'RFC.Initiator',
                            fieldFriendlyName: getTextResource('Initiator'),
                            oldValue: self.RFC().InitiatorLoaded() ? { ID: self.RFC().Initiator().ID(), ClassID: 9, FullName: self.RFC().Initiator().FullName() } : null,
                            object: ko.toJS(self.RFC().Initiator()),
                            searcherName: 'WebUserSearcherNoTOZ',
                            searcherPlaceholder: getTextResource('EnterFIO'),
                            onSave: function (objectInfo) {
                                self.RFC().InitiatorLoaded(false);
                                self.RFC().Initiator(new userLib.EmptyUser(self, userLib.UserTypes.initiator, self.EditInitiator));
                                //
                                self.RFC().InitiatorID(objectInfo ? objectInfo.ID : '');
                                self.InitializeInitiator();
                            }
                        };
                        fh.ShowSDEditor(fh.SDEditorTemplateModes.searcherEdit, options);
                    });
                };

                self.DeleteInitiator = function () {
                    require(['models/SDForms/SDForm.User'], function (userLib) {
                        var options = {
                            FieldName: 'RFC.Initiator',
                            OldValue: self.RFC().InitiatorLoaded() ? { ID: self.RFC().Initiator().ID(), ClassID: 9, FullName: self.RFC().Initiator().FullName() } : null,
                            onSave: function () {
                                self.RFC().InitiatorLoaded(false);
                                self.RFC().Initiator(new userLib.EmptyUser(self, userLib.UserTypes.initiator, self.EditOwner));
                                //
                                self.RFC().InitiatorID('');
                            }
                        };
                        self.DeleteUser(false, options);
                    });
                };
            }
            //
            //owner
            {
                self.InitializeOwner = function () {
                    require(['models/SDForms/SDForm.User'], function (userLib) {
                        var rfc = self.RFC();
                        if (rfc.OwnerLoaded() == false && rfc.OwnerID()) {
                            var options = {
                                UserID: rfc.OwnerID(),
                                UserType: userLib.UserTypes.owner,
                                UserName: null,
                                EditAction: self.EditOwner,
                                RemoveAction: self.DeleteOwner,
                                CanNote: true
                            };
                            var user = new userLib.User(self, options);
                            rfc.Owner(user);
                            rfc.Owner().TypeName = ko.observable(getTextResource('Coordinator_Owner'));
                            rfc.OwnerLoaded(true);
                            //
                            var already = ko.utils.arrayFirst(self.RFCUsersList(), function (item) {
                                return item.ID() == rfc.OwnerID();
                            });
                            //
                            if (already == null)
                                self.RFCUsersList.push(user);
                            else if (already.Type == userLib.UserTypes.withoutType) {
                                self.RFCUsersList.remove(already);
                                self.RFCUsersList.push(user);
                            }
                        }
                    });
                };
                self.EditOwner = function () {
                    if (self.CanEdit() == false)
                        return;
                    showSpinner();
                    require(['usualForms', 'models/SDForms/SDForm.User'], function (module, userLib) {
                        var fh = new module.formHelper(true);
                        var options = {
                            ID: self.RFC().ID(),
                            objClassID: self.objectClassID,
                            fieldName: 'RFC.Owner',
                            fieldFriendlyName: getTextResource('Owner'),
                            oldValue: self.RFC().OwnerLoaded() ? { ID: self.RFC().Owner().ID(), ClassID: 9, FullName: self.RFC().Owner().FullName() } : null,
                            object: ko.toJS(self.RFC().Owner()),
                            searcherName: 'OwnerUserSearcher',
                            searcherPlaceholder: getTextResource('EnterFIO'),
                            searcherParams: [self.RFC().QueueID() == '' ? null : self.RFC().QueueID()],
                            onSave: function (objectInfo) {
                                self.RFC().OwnerLoaded(false);
                                self.RFC().Owner(new userLib.EmptyUser(self, userLib.UserTypes.owner, self.EditOwner, true, true, getTextResource('Coordinator_Owner')));
                                //
                                self.RFC().OwnerID(objectInfo ? objectInfo.ID : '');
                                self.InitializeOwner();
                            }
                        };
                        fh.ShowSDEditor(fh.SDEditorTemplateModes.searcherEdit, options);
                    });
                };
                self.DeleteOwner = function () {
                    require(['models/SDForms/SDForm.User'], function (userLib) {
                        var options = {
                            FieldName: 'RFC.Owner',
                            OldValue: self.RFC().OwnerLoaded() ? { ID: self.RFC().Owner().ID(), ClassID: 9, FullName: self.RFC().Owner().FullName() } : null,
                            onSave: function () {
                                self.RFC().OwnerLoaded(false);
                                self.RFC().Owner(new userLib.EmptyUser(self, userLib.UserTypes.owner, self.EditOwner, true, true, getTextResource('Coordinator_Owner')));
                                //
                                self.RFC().OwnerID('');
                            }
                        };
                        self.DeleteUser(false, options);
                    });
                };
            }
            //
            self.EditQueue = function () {
                if (self.CanEdit() == false)
                    return;
                showSpinner();
                require(['usualForms', 'models/SDForms/SDForm.User'], function (module, userLib) {
                    var fh = new module.formHelper(true);
                    var options = {
                        ID: self.RFC().ID(),
                        objClassID: self.objectClassID,
                        fieldName: 'RFC.Queue',
                        fieldFriendlyName: getTextResource('Queue'),
                        oldValue: self.RFC().QueueLoaded() ? { ID: self.RFC().Queue().ID(), ClassID: self.RFC().Queue().ClassID(), FullName: self.RFC().Queue().FullName() } : null,
                        object: ko.toJS(self.RFC().Queue()),
                        searcherName: "QueueSearcher",
                        searcherPlaceholder: getTextResource('EnterQueue'),
                        searcherParams: ['0'],
                        onSave: function (objectInfo) {
                            self.RFC().QueueLoaded(false);
                            self.RFC().Queue(new userLib.EmptyUser(self, userLib.UserTypes.queueExecutor, self.EditQueue));
                            //
                            if (objectInfo && objectInfo.ClassID == 722) { //IMSystem.Global.OBJ_QUEUE
                                self.RFC().QueueID(objectInfo.ID);
                                self.RFC().QueueName(objectInfo.FullName);
                            }
                            else {
                                self.RFC().QueueID('');
                                self.RFC().QueueName('');
                            }
                            self.InitializeQueue();
                        }
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.searcherEdit, options);
                });
            };
            self.DeleteQueue = function () {
                require(['models/SDForms/SDForm.User'], function (userLib) {
                    var options = {
                        FieldName: 'Call.Queue',
                        OldValue: self.RFC().QueueLoaded() ? { ID: self.RFC().Queue().ID(), ClassID: self.RFC().Queue().ClassID(), FullName: self.RFC().Queue().FullName() } : null,
                        onSave: function () {
                            self.RFC().QueueLoaded(false);
                            self.RFC().Queue(new userLib.EmptyUser(self, userLib.UserTypes.queueExecutor, self.EditQueue));
                            //
                            self.RFC().QueueID('');
                            self.RFC().QueueName('');
                        }
                    };
                    self.DeleteUser(false, options);
                });
            };
            self.InitializeQueue = function () {
                require(['models/SDForms/SDForm.User'], function (userLib) {
                    var rfc = self.RFC();
                    //
                    if (rfc.QueueLoaded() == false) {
                        if (rfc.QueueID()) {
                            var options = {
                                UserID: rfc.QueueID(),
                                UserType: userLib.UserTypes.queueExecutor,
                                UserName: null,
                                EditAction: self.EditQueue,
                                RemoveAction: self.DeleteQueue,
                                CanNote: true
                            };
                            var user = new userLib.User(self, options);
                            rfc.Queue(user);
                            rfc.QueueLoaded(true);
                            //
                            var already = ko.utils.arrayFirst(self.RFCUsersList(), function (item) {
                                return item.ID() == rfc.QueueID();
                            });
                            //
                            if (already == null)
                                self.RFCUsersList.push(user);
                            else if (already.Type == userLib.UserTypes.withoutType) {
                                self.RFCUsersList.remove(already);
                                self.RFCUsersList.push(user);
                            }
                        }
                    }
                });
            };



            self.CalculateUsersList = function () {
                require(['models/SDForms/SDForm.User'], function (userLib) {
                    if (!self.RFC()) {
                        self.RFCUsersList([]);
                        self.RFCUsersList.valueHasMutated();
                        return;
                    }
                    //
                    self.InitializeInitiator();
                    self.InitializeOwner();
                    self.InitializeQueue();
                    //
                    self.RFCUsersList.valueHasMutated();
                    //add currentUser to list
                    $.when(userD).done(function (userObj) {
                        require(['models/SDForms/SDForm.User'], function (userLib) {
                            var already = ko.utils.arrayFirst(self.RFCUsersList(), function (item) {
                                return item.ID() == userObj.UserID;
                            });
                            //                    
                            if (already != null)
                                return;
                            //
                            var options = {
                                UserID: userObj.UserID,
                                UserType: userLib.UserTypes.withoutType,
                                UserName: userObj.UserName,
                                EditAction: null,
                                RemoveAction: null,
                                CanNote: true
                            };
                            var user = new userLib.User(self, options);
                            //
                            self.RFCUsersList.push(user);
                        });
                    });
                    self.LoadCustomControl();
                });
            };
            //
            self.RFCUsersList = ko.observableArray([]);
            //
            //DeleteUser
            {
                self.ajaxControl_deleteUser = new ajaxLib.control();
                self.DeleteUser = function (isReplaceAnyway, options) {
                    var data = {
                        ID: self.RFC().ID(),
                        ObjClassID: self.objectClassID,
                        Field: options.FieldName,
                        OldValue: options.OldValue == null ? null : JSON.stringify({ 'id': options.OldValue.ID, 'fullName': options.OldValue.FullName }),
                        NewValue: null,
                        Params: null,
                        ReplaceAnyway: isReplaceAnyway
                    };
                    //
                    self.ajaxControl_deleteUser.Ajax(
                        self.$region,
                        {
                            dataType: "json",
                            method: 'POST',
                            url: 'sdApi/SetField',
                            data: data
                        },
                        function (retModel) {
                            if (retModel) {
                                var result = retModel.ResultWithMessage.Result;
                                //
                                if (result === 0) {
                                    if (options.onSave != null)
                                        options.onSave(null);
                                }
                                else if (result === 1) {
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('SaveError'), getTextResource('NullParamsError') + '\n[RFCForm.js DeleteUser]', 'error');
                                    });
                                }
                                else if (result === 2) {
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('SaveError'), getTextResource('BadParamsError') + '\n[RFCForm.js DeleteUser]', 'error');
                                    });
                                }
                                else if (result === 3) {
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('SaveError'), getTextResource('AccessError'), 'error');
                                    });
                                }
                                else if (result === 5 && isReplaceAnyway == false) {
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
                                                    self.DeleteUser(true, options);
                                                }
                                            });
                                    });
                                }
                                else if (result === 6) {
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('SaveError'), getTextResource('ObjectDeleted'), 'error');
                                    });
                                }
                                else if (result === 7) {
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('SaveError'), getTextResource('OperationError'), 'error');
                                    });
                                }
                                else if (result === 8) {
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('SaveError'), getTextResource('ValidationError'), 'error');
                                    });
                                }
                                else {
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('SaveError'), getTextResource('GlobalError') + '\n[RFCForm.js DeleteUser]', 'error');
                                    });
                                }
                            }
                            else {
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('SaveError'), getTextResource('GlobalError') + '\n[RFCForm.js, DeleteUser]', 'error');
                                });
                            }
                        });
                };
            }
            //
            //ReasonForChange
            {
                self.CssIconClass = ko.pureComputed(function () {
                    if (self.ReasonObject == null)
                        return null;
                    var classID = self.ReasonObject().ClassID;
                    if (classID == 701)
                        return 'call-icon';
                    else if (classID == 702)
                        return 'problem-icon';
                    else if (classID == 119)
                        return 'workorder-icon';
                    else return 'finished-item-icon';
                });
                self.ReasonObject = ko.observable(null);
                self.ReasonName = ko.observable('');
                self.ReasonUtcDatePromised = ko.observable('');
                self.ReasonStateName = ko.observable('');
                self.ReasonOwner = ko.observable(null);
                self.ReasonModify = ko.observable('');
                self.IsReasonContainerVisible = ko.observable(false);
                self.VisibleReason = ko.observable(false);
                self.ToggleCauseContainer = function () {
                    self.IsReasonContainerVisible(!self.IsReasonContainerVisible());
                };
                //
                self.ShowReasonObjectForm = function (referenceObject) {
                    if (referenceObject.ReasonObjectClassID() === 701) {
                        showSpinner();
                        require(['sdForms'], function (module) {
                            var fh = new module.formHelper(true);
                            fh.ShowCall(referenceObject.ReasonObjectID(), self.IsReadOnly() == true ? fh.Mode.ReadOnly : fh.Mode.Default);
                        });
                    }
                    else if (referenceObject.ReasonObjectClassID() === 702) {
                        showSpinner();
                        require(['sdForms'], function (module) {
                            var fh = new module.formHelper(true);
                            fh.ShowProblem(referenceObject.ReasonObjectID(), self.IsReadOnly() == true ? fh.Mode.ReadOnly : fh.Mode.Default);
                        });
                    }
                    else if (referenceObject.ReasonObjectClassID() === 119) {
                        showSpinner();
                        require(['sdForms'], function (module) {
                            var fh = new module.formHelper(true);
                            fh.ShowWorkOrder(referenceObject.ReasonObjectID(), self.IsReadOnly() == true ? fh.Mode.ReadOnly : fh.Mode.Default);
                        });
                    }
                };
                //
                self.ContextMenuVisible = ko.observable(false);
                //
                self.LinkSdObjectClick = function (data, e) {
                    if (self.CanEdit() == false)
                        return;
                    var isVisible = self.ContextMenuVisible();
                    self.ContextMenuVisible(!isVisible);
                    //
                    e.stopPropagation();
                };
                //
                self.ReasonCallBackObject = function (obj, ClassID, WithoutUpdateField) {
                    if (obj.ID)
                        obj = obj.ID;
                    var oldReasonObjectID = self.ReasonObject()==null? null:self.ReasonObject().ID();
                    $.when(self.LoadReferenceObject(obj, ClassID)).done(function (loadResult) {
                        if (loadResult == true) {
                            var mself = self.ReasonObject();
                            if (mself.ClassID == 701) {
                                self.InitializeReasonObjectOwner();
                                self.ReasonName('№' + mself.Number() + ' ' + mself.CallSummaryName());
                            }
                            else if (mself.ClassID == 702) {
                                self.InitializeReasonObjectOwner();
                                self.ReasonName('№' + mself.Number() + ' ' + mself.Summary());
                            }
                            else {
                                self.ReasonOwner(null);
                                self.ReasonName('№' + mself.Number() + ' ' + mself.Name());
                            }
                            self.ReasonUtcDatePromised(mself.UtcDatePromised());
                            self.ReasonStateName(mself.EntityStateName());
                            self.ReasonModify(mself.UtcDateModified());
                            self.ReasonObject.valueHasMutated();
                            self.VisibleReason(true);
                            self.IsReasonContainerVisible(true);
                        }
                        else {
                            self.ReasonName('');
                            self.ReasonUtcDatePromised('');
                            self.ReasonStateName('');
                            self.ReasonModify('');
                            self.VisibleReason(false);
                        }
                        if (WithoutUpdateField != true) {
                            var options = {
                                FieldName: 'RFC.ReasonObj',
                                OldValue: oldReasonObjectID == null ? null : JSON.stringify({ 'id': oldReasonObjectID }),
                                NewValue: self.ReasonObject().ID == null ? null : JSON.stringify({ 'id': self.ReasonObject().ID(), 'classID': self.ReasonObject().ClassID }),
                                onSave: function () {
                                    self.RFC().ReasonObjectID(self.ReasonObject().ID);
                                    self.RFC().ReasonObjectClassID(self.ReasonObject().ClassID);
                                }
                            };
                            self.UpdateField(false, options);
                        }
                    });
                }
                //
                self.InitializeReasonObjectOwner = function () {
                    require(['models/SDForms/SDForm.User'], function (userLib) {
                        tmp = self.ReasonObject();
                        if (tmp == null)
                            return
                        if (tmp.OwnerLoaded() == false && tmp.OwnerID()) {
                            var options = {
                                UserID: tmp.OwnerID(),
                                UserType: userLib.UserTypes.owner,
                                UserName: null,
                                CanNote: true
                            };

                            var user = new userLib.User(self, options);
                            tmp.Owner(user);
                            self.ReasonOwner(user);
                            tmp.OwnerLoaded(true);
                        }
                    });
                };
                //
                self.ajaxControl_load = new ajaxLib.control();
                self.LoadReferenceObject = function (id, classID) {
                    var retD = $.Deferred();
                    if (classID == 119) {
                        self.ajaxControl_load.Ajax(self.$region,
                            {
                                dataType: "json",
                                method: 'GET',
                                data: { 'id': id },
                                url: 'sdApi/GetWorkOrder'
                            },
                            function (newVal) {
                                //
                                if (newVal) {
                                    if (newVal.Result == 0) {//success
                                        var woInfo = newVal.WorkOrder;
                                        require(['models/SDForms/WorkOrderForm.WorkOrder'], function (woLib) {
                                            self.ReasonObject(new woLib.WorkOrder(self, woInfo));
                                            retD.resolve(true);
                                        });
                                    }
                                    else {//not success
                                        if (newVal.Result == 3) {//AccessError
                                            self.VisibleReason(false);
                                            self.IsReasonContainerVisible(false);
                                            require(['sweetAlert'], function () {
                                                swal(getTextResource('ErrorCaption'), getTextResource('RFCReasonNotAccess'), 'error');
                                            });
                                        }
                                        if (newVal.Result == 6) {//AccessError
                                            require(['sweetAlert'], function () {
                                                swal(getTextResource('ErrorCaption'), getTextResource('ObjectDeleted'), 'error');
                                            });
                                        }
                                        else if (newVal.Result == 7) {//OperationError
                                            self.VisibleReason(false);
                                            self.IsReasonContainerVisible(false);
                                            require(['sweetAlert'], function () {
                                                swal(getTextResource('ErrorCaption'), getTextResource('RFCReasonNotAccess'), 'error');
                                            });
                                        }
                                        retD.resolve(false);
                                    }
                                }
                            });
                    }
                    else if (classID == 702) {
                        self.ajaxControl_load.Ajax(self.$region,
                            {
                                dataType: "json",
                                method: 'GET',
                                data: { 'id': id },
                                url: 'sdApi/GetProblem'
                            },
                            function (newVal) {
                                //
                                if (newVal) {
                                    if (newVal.Result == 0) {//success
                                        var pInfo = newVal.Problem;
                                        require(['models/SDForms/ProblemForm.Problem'], function (pLib) {
                                            self.ReasonObject(new pLib.Problem(self, pInfo));
                                            retD.resolve(true);
                                        });
                                    }
                                    else {//not success
                                        if (newVal.Result == 3) {//AccessError
                                            self.VisibleReason(false);
                                            self.IsReasonContainerVisible(false);
                                            require(['sweetAlert'], function () {
                                                swal(getTextResource('ErrorCaption'), getTextResource('RFCReasonNotAccess'), 'error');
                                            });
                                        }
                                        if (newVal.Result == 6) {//AccessError
                                            require(['sweetAlert'], function () {
                                                swal(getTextResource('ErrorCaption'), getTextResource('ObjectDeleted'), 'error');
                                            });
                                        }
                                        else if (newVal.Result == 7) {//OperationError
                                            self.VisibleReason(false);
                                            self.IsReasonContainerVisible(false);
                                            require(['sweetAlert'], function () {
                                                swal(getTextResource('ErrorCaption'), getTextResource('RFCReasonNotAccess'), 'error');
                                            });
                                        }
                                        retD.resolve(false);
                                    }
                                }
                            });
                    }
                    else if (classID == 701) {
                        self.ajaxControl_load.Ajax(self.$region,
                            {
                                dataType: "json",
                                method: 'GET',
                                data: {
                                    'id': id
                                },
                                url: 'sdApi/GetCall'
                            },
                            function (newVal) {
                                //
                                if (newVal) {
                                    if (newVal.Result == 0) {//success
                                        var callInfo = newVal.Call;
                                        require(['models/SDForms/CallForm.Call'], function (callLib) {
                                            self.ReasonObject(new callLib.Call(self, callInfo));
                                            retD.resolve(true);
                                        });
                                    }
                                    else {//not success
                                        if (newVal.Result == 3) {//AccessError
                                            self.VisibleReason(false);
                                            self.IsReasonContainerVisible(false);
                                            require(['sweetAlert'], function () {
                                                swal(getTextResource('ErrorCaption'), getTextResource('RFCReasonNotAccess'), 'error');
                                            });
                                        }
                                        else
                                    if (newVal.Result == 6) {//ObjectDeleted
                                            require(['sweetAlert'], function () {
                                                swal(getTextResource('ErrorCaption'), getTextResource('ObjectDeleted'), 'error');
                                            });
                                        }
                                    else if (newVal.Result == 7) {//OperationError
                                        self.VisibleReason(false);
                                        self.IsReasonContainerVisible(false);
                                        require(['sweetAlert'], function () {
                                            swal(getTextResource('ErrorCaption'), getTextResource('RFCReasonNotAccess'), 'error');
                                        });
                                        }
                                        retD.resolve(false);
                                    }
                                }
                            });
                    }
                    else retD.resolve(false);
                    //
                    return retD.promise();
                };

                self.ajaxControl_updateField = new ajaxLib.control();
                self.UpdateField = function (isReplaceAnyway, options) {
                    var data = {
                        ID: self.RFC().ID(),
                        ObjClassID: self.objectClassID,
                        Field: options.FieldName,
                        OldValue: options.OldValue == null ? null : options.OldValue,
                        NewValue: options.NewValue == null ? null : options.NewValue,
                        ReplaceAnyway: isReplaceAnyway
                    };
                    //
                    self.ajaxControl_updateField.Ajax(
                        self.$region,
                        {
                            dataType: "json",
                            method: 'POST',
                            url: 'sdApi/SetField',
                            data: data
                        },
                        function (retModel) {
                            if (retModel) {
                                var result = retModel.ResultWithMessage.Result;
                                //
                                if (result === 0) {
                                    if (options.onSave != null)
                                        options.onSave(null);
                                }
                                else if (result === 1) {
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('SaveError'), getTextResource('NullParamsError') + '\n[CallForm.js UpdateField]', 'error');
                                    });
                                }
                                else if (result === 2) {
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('SaveError'), getTextResource('BadParamsError') + '\n[CallForm.js UpdateField]', 'error');
                                    });
                                }
                                else if (result === 3) {
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('SaveError'), getTextResource('AccessError'), 'error');
                                    });
                                }
                                else if (result === 5 && isReplaceAnyway == false) {
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
                                                    self.UpdateField(true, options);
                                                }
                                            });
                                    });
                                }
                                else if (result === 6) {
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('SaveError'), getTextResource('ObjectDeleted'), 'error');
                                    });
                                }
                                else if (result === 7) {
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('SaveError'), getTextResource('OperationError'), 'error');
                                    });
                                }
                                else if (result === 8) {
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('SaveError'), getTextResource('ValidationError'), 'error');
                                    });
                                }
                                else {
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('SaveError'), getTextResource('GlobalError') + '\n[CallForm.js UpdateField]', 'error');
                                    });
                                }
                            }
                            else {
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('SaveError'), getTextResource('GlobalError') + '\n[CallForm.js UpdateField]', 'error');
                                });
                            }
                        });
                };
                //
                self.LinkCall = function () {
                    var isVisible = self.ContextMenuVisible();
                    self.ContextMenuVisible(!isVisible);
                    showSpinner();
                    require(['usualForms'], function (module) {
                        var fh = new module.formHelper(true);
                        fh.ShowSearcherLite([701], null, null, null, null, self.ReasonCallBackObject);
                    });
                };
                //
                self.LinkWorkorder = function () {
                    var isVisible = self.ContextMenuVisible();
                    self.ContextMenuVisible(!isVisible);
                    showSpinner();
                    require(['usualForms'], function (module) {
                        var fh = new module.formHelper(true);
                        fh.ShowSearcherLite([119], null, null, null, null, self.ReasonCallBackObject);
                    });
                };
                //
                self.LinkProblem = function () {
                    var isVisible = self.ContextMenuVisible();
                    self.ContextMenuVisible(!isVisible);
                    showSpinner();
                    require(['usualForms'], function (module) {
                        var fh = new module.formHelper(true);
                        fh.ShowSearcherLite([702], null, null, null, null, self.ReasonCallBackObject);
                    });
                };
            }
            //
            //EditPromisedDate
            {
                self.EditDatePromised = function () {
                    if (self.CanEdit() == false)
                        return;
                    showSpinner();
                    require(['usualForms'], function (module) {
                        var fh = new module.formHelper(true);
                        var options = {
                            ID: self.RFC().ID(),
                            objClassID: self.objectClassID,
                            fieldName: 'RFC.DatePromised',
                            fieldFriendlyName: getTextResource('CallDatePromise'),
                            oldValue: self.RFC().UtcDatePromisedDT(),
                            onSave: function (newDate) {
                                self.RFC().UtcDatePromised(parseDate(newDate));
                                self.RFC().UtcDatePromisedDT(new Date(parseInt(newDate)));
                            }
                        };
                        fh.ShowSDEditor(fh.SDEditorTemplateModes.dateEdit, options);
                    });
                }
            }
            self.DatePromisedCalculated = ko.computed(function () { //или из объекта, или из хода выполнения
                var retval = '';
                //
                if (!retval && self.RFC) {
                    var rfc = self.RFC();
                    if (rfc && rfc.UtcDatePromised)
                        retval = rfc.UtcDatePromised();
                }
                //
                return retval;
            });
            //
            //TAPE BLOCK
            self.TapeClick = function () {
                self.mode(self.modes.tape);
                self.SizeChanged();
                //
                if (self.tapeControl && self.tapeControl.CalculateTopPosition)
                    self.tapeControl.CalculateTopPosition();
            };
            self.CanViewNotes = ko.computed(function () {
                return true;
            });
            self.tapeControl = new tapeLib.Tape(self.RFC, self.objectClassID, self.$region.find('.tape__b').selector, self.$region.find('.tape__forms').selector, self.IsReadOnly, self.CanEdit, self.CanViewNotes, self.TabSize, self.RFCUsersList);
            //
            //WO REFERENCE BLOCK
            self.workOrderList = new workOrderReferenceListLib.LinkList(self.RFC, self.objectClassID, self.$region.find('.woRef__b .tabContent').selector, self.IsReadOnly, self.CanEdit);
            //
            //LINKS BLOCK
            self.linkList = new linkListLib.LinkList(self.RFC, self.objectClassID, self.$region.find('.links__b .tabContent').selector, self.IsReadOnly, self.CanEdit);
            //
            //CALL REFERENCE BLOCK
            self.callList = new callReferenceListLib.LinkList(self.RFC, self.objectClassID, self.$region.find('.cRef__b .tabContent').selector, self.IsReadOnly, self.CanEdit);
            //
            //LINKS KE BLOCK + переопределение list для загрузки только КУ
            {
                self.linkListKE = new linkListLib.LinkList(self.RFC, self.objectClassID, self.$region.find('.linksKE__b .tabContent').selector, self.IsReadOnly, self.CanEdit,null,true);
                self.linkListKE.imList.options.LoadAction = function () {
                    var data = {
                        'ID': self.RFC().ID(),
                        'EntityClassId': self.objectClassID,
                        'Parameters': [true]
                    };
                    var retvalD = $.Deferred();
                    self.linkListKE.ajaxControl.Ajax($(self.$region.find('.linksKE__b .tabContent').selector),
                        {
                            dataType: "json",
                            method: 'GET',
                            data: data,
                            url: 'sdApi/GetLinksList'
                        },
                        function (newVal) {
                            if (newVal && newVal.Result === 0) {
                                var linkList = newVal.List;
                                if (linkList) {
                                    require(['models/SDForms/SDForm.Link'], function (linkLib) {
                                        var retval = [];
                                        ko.utils.arrayForEach(linkList, function (item) {
                                            retval.push(new linkLib.Link(self.linkListKE.imList, item));
                                        });
                                        $.when(self.linkListKE.LoadGrantedOperations()).done(function () { retvalD.resolve(retval); });
                                    });
                                }
                                else {
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('AjaxError') + '\n[SDForm.LinkList.js, LoadAction]', 'error');
                                    });
                                    retvalD.resolve([]);
                                }
                            }
                            else if (newVal && newVal.Result === 1)
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[SDForm.LinkList.js, LoadAction]', 'error');
                                    retvalD.resolve([]);
                                });
                            else if (newVal && newVal.Result === 2)
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('BadParamsError') + '\n[SDForm.LinkList.js, LoadAction]', 'error');
                                    retvalD.resolve([]);
                                });
                            else if (newVal && newVal.Result === 3)
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('AccessError'), 'error');
                                    retvalD.resolve([]);
                                });
                            else
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[SDForm.LinkList.js, LoadAction]', 'error');
                                    retvalD.resolve([]);
                                });
                        });
                    return retvalD.promise();
                };
                //
                self.linkListKE.ItemsCount = ko.computed(function () {//вариант расчета количества элементов (по данным объекта / по реальному количеству из БД)
                    var retval = 0;
                    if (self.linkListKE.isLoaded())
                        retval = self.linkListKE.imList.List().length;
                    else if (self.RFC != null && self.RFC() != null)
                        retval = self.RFC().DependencyKEObjectCount();
                    //
                    if (retval <= 0)
                        return null;
                    if (retval > 99)
                        return '99';
                    else return '' + retval;
                });
            }
            //
            //NEGOTIATION BLOCK
            self.negotiationList = new negotiationListLib.LinkList(self.RFC, self.objectClassID, self.$region.find('.negotiations__b .tabContent').selector, self.IsReadOnly, self.CanEdit);
            //PARAMETERS BLOCK
            {
                self.parametersControl = null;
                self.parameterListByGroup = null;//кеш отсортирортированных параметров, разбитых по группам
                self.parameterModePrefix = 'parameter_';
                self.ParameterList = ko.observable([]);//параметры текущей выбранной группы
                self.ParameterListGroupName = ko.computed(function () {
                    if (self.mode().indexOf(self.parameterModePrefix) != 0)
                        return '';
                    //
                    var groupName = self.mode().substring(self.parameterModePrefix.length);
                    return groupName;
                });
                self.ParameterGroupList = ko.observable([]);
                self.InitializeParametersTabs = function () {
                    if (self.mode().indexOf(self.parameterModePrefix) != 0) {
                        self.ParameterList([]);
                        return;
                    }
                    //
                    var groupName = self.mode().substring(self.parameterModePrefix.length);
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
                    var p = self.RFC();
                    if (!p)
                        self.parametersControl.InitializeOrCreate(null, null, null, self.RefreshParameters());//нет объекта - нет параметров
                    else self.parametersControl.InitializeOrCreate(self.objectClassID, p.ID(), p, self.RefreshParameters());
                };
                self.OnParametersChanged = function () {//обновления списка параметров по объекту
                    if (self.parametersControl == null) {
                        self.parametersControl = new pcLib.control();
                        self.parametersControl.ReadOnly(self.IsReadOnly());
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
                                if (self.mode().indexOf(self.parameterModePrefix + groupName) != -1)
                                    newParameterListContainsOldGroup = true;
                            }
                            self.ParameterGroupList.valueHasMutated();
                            //
                            if (self.mode().indexOf(self.parameterModePrefix) == 0) {//сейчас вкладка параметры
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
            //Load
            self.ajaxControl_load = new ajaxLib.control();
            self.Load = function (id) {
                $(document).unbind('objectInserted', self.onObjectInserted);
                $(document).unbind('objectUpdated', self.onObjectUpdated);
                $(document).unbind('objectDeleted', self.onObjectDeleted);
                $(document).unbind('local_objectInserted', self.onObjectInserted);
                $(document).unbind('local_objectUpdated', self.onObjectUpdated);
                $(document).unbind('local_objectDeleted', self.onObjectDeleted);
                //
                var retD = $.Deferred();
                if (id) {
                    self.ajaxControl_load.Ajax(self.$region,
                        {
                            dataType: "json",
                            method: 'GET',
                            data: { 'id': id },
                            url: 'sdApi/GetRFC'
                        },
                        function (newVal) {
                            var loadSuccessD = $.Deferred();
                            var processed = false;
                            //
                            if (newVal) {
                                if (newVal.Result == 0) {//success
                                    var pInfo = newVal.RFC;
                                    if (pInfo && pInfo.ID) {
                                        require(['models/SDForms/RFCForm.RFC'], function (pLib) {
                                            self.RFC(new pLib.RFC(self, pInfo));
                                            self.RFCUsersList.removeAll();
                                            self.CalculateUsersList();
                                            self.LoadRollbackAttachmentsControl();
                                            self.LoadRealizationAttachmentsControl();
                                            self.LoadAttachmentsControl();
                                            self.ReasonCallBackObject(self.RFC().ReasonObjectID(), self.RFC().ReasonObjectClassID(),true);
                                            //
                                            $(document).unbind('objectInserted', self.onObjectInserted).bind('objectInserted', self.onObjectInserted);
                                            $(document).unbind('objectUpdated', self.onObjectUpdated).bind('objectUpdated', self.onObjectUpdated);
                                            $(document).unbind('objectDeleted', self.onObjectDeleted).bind('objectDeleted', self.onObjectDeleted);
                                            $(document).unbind('local_objectInserted', self.onObjectInserted).bind('local_objectInserted', self.onObjectInserted);
                                            $(document).unbind('local_objectUpdated', self.onObjectUpdated).bind('local_objectUpdated', self.onObjectUpdated);
                                            $(document).unbind('local_objectDeleted', self.onObjectDeleted).bind('local_objectDeleted', self.onObjectDeleted);
                                            //
                                            processed = true;
                                            loadSuccessD.resolve(true);
                                        });
                                    }
                                    else loadSuccessD.resolve(false);
                                }
                                else {//not success
                                    if (newVal.Result == 3) {//AccessError
                                        require(['sweetAlert'], function () {
                                            swal(getTextResource('ErrorCaption'), getTextResource('AccessError'), 'error');
                                        });
                                        processed = true;
                                    }
                                    if (newVal.Result == 6) {//AccessError
                                        require(['sweetAlert'], function () {
                                            swal(getTextResource('ErrorCaption'), getTextResource('ObjectDeleted'), 'error');
                                        });
                                        processed = true;
                                    }
                                    else if (newVal.Result == 7) {//OperationError
                                        require(['sweetAlert'], function () {
                                            swal(getTextResource('ErrorCaption'), getTextResource('OperationError'), 'error');
                                        });
                                        processed = true;
                                    }
                                    loadSuccessD.resolve(false);
                                }
                            }
                            else loadSuccessD.resolve(false);
                            //
                            $.when(loadSuccessD).done(function (loadSuccess) {
                                retD.resolve(loadSuccess);
                                if (loadSuccess == false && processed == false) {
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('UnhandledErrorServer'), getTextResource('AjaxError') + '\n[RFCForm.js, Load]', 'error');
                                    });
                                }
                            });
                        });
                }
                else retD.resolve(false);
                //
                return retD.promise();
            };
            //
            self.Unload = function () {
                $(document).unbind('objectInserted', self.onObjectInserted);
                $(document).unbind('objectUpdated', self.onObjectUpdated);
                $(document).unbind('objectDeleted', self.onObjectDeleted);
                $(document).unbind('local_objectInserted', self.onObjectInserted);
                $(document).unbind('local_objectUpdated', self.onObjectUpdated);
                $(document).unbind('local_objectDeleted', self.onObjectDeleted);
                //
                if (self.parametersControl != null)
                    self.parametersControl.DestroyControls();
                if (self.workflowControl() != null)
                    self.workflowControl().Unload();
            };
            //
            self.CanEdit = ko.computed(function () {
                return !self.IsReadOnly();
            });
            //
            self.AfterRender = function () {
                self.SizeChanged();
            };
            self.renderRFCComplete = function () {
                $isLoaded.resolve();
                self.SizeChanged();
            };
            //
            self.SizeChanged = function () {
                if (!self.RFC())
                    return;//Critical - ko - with:rfc!!!
                //
                var tabHeight = self.$region.height();//form height
                tabHeight -= self.$region.find('.b-requestDetail-menu').outerHeight(true);
                tabHeight -= self.$region.find('.b-requestDetail__title-header').outerHeight(true);
                //
                var tabWidth = self.$region.width();//form width
                tabWidth -= self.$region.find('.b-requestDetail-right').outerWidth(true);
                //
                self.TabHeight(Math.max(0, tabHeight - 10) + 'px');
                self.TabWidth(Math.max(0, tabWidth - 5) + 'px');
            };
            //
            self.Reload = function (id, readOnly) {
                if (id == null && self.id == null)
                    return;
                else if (id == null)
                    id = self.id;
                //
                if (readOnly === true || readOnly === false)
                    self.IsReadOnly(readOnly);
                //
                var currentTab = self.mode();
                self.mode(self.modes.nothing);
                self.mainTabLoaded(false);
                self.tapeControl.ClearData();
                self.negotiationList.ClearData();
                self.linkList.ClearData();
                self.callList.ClearData();
                self.linkListKE.ClearData();
                self.workOrderList.ClearData();
                self.solutionTabLoaded(false);
                if (self.priorityControl != null)
                    self.priorityControl.IsLoaded(false);
                //
                showSpinner(self.$region[0]);
                //
                $.when(self.Load(id)).done(function (loadResult) {
                    if (loadResult == false && self.CloseForm != null) {
                        self.CloseForm();
                    }
                    else self.mode(currentTab);
                    //
                    hideSpinner(self.$region[0]);
                });
            };
            //
            {//InRealization
                self.InRealization = ko.observable(false);
                self.InRealization.subscribe(function (newValue) {
                    if (!self.CanEdit() || self.RFC().InRealization() == newValue)
                        return;
                    var oldValue = !self.InRealization();
                    var options = {
                        FieldName: 'RFC.InRealization',
                        OldValue: oldValue == null ? null : JSON.stringify({ 'val': oldValue }),
                        NewValue: self.InRealization == null ? null : JSON.stringify({ 'val': self.InRealization() }),
                    };
                    self.UpdateField(false, options);
                    self.RFC().InRealization(newValue);
                });
            }
            //
            //Container
            self.IsDescriptionContainerVisible = ko.observable(true);
            self.ToggleDescriptionContainer = function () {
                self.IsDescriptionContainerVisible(!self.IsDescriptionContainerVisible());
            };
            //
            self.onObjectInserted = function (e, objectClassID, objectID, parentObjectID) {
                var currentID = self.RFC().ID();
                //
                if (objectClassID == 110 && currentID == parentObjectID) //OBJ_DOCUMENT
                    self.LoadAttachmentsControl();
                else if (objectClassID == 160 && currentID == parentObjectID) //OBJ_NEGOTIATION
                {
                    if (self.negotiationList.isLoaded())
                        self.negotiationList.imList.TryReloadByID(objectID);
                    else
                        self.Reload(currentID);
                }
                else if (objectClassID == 117 && currentID == parentObjectID) //OBJ_NOTIFICATION ~ SDNote
                {
                    if (self.tapeControl.isNoteListLoaded())
                        self.tapeControl.TryAddNoteByID(objectID);
                    else
                        self.Reload(currentID);
                }
                else if (objectClassID == 119 && currentID && parentObjectID && currentID.toLowerCase() == parentObjectID.toLowerCase()) //OBJ_WORKORDER
                {
                    if (self.workOrderList.isLoaded())
                        self.workOrderList.imList.TryReloadByID(objectID);
                    else 
                        self.Reload(currentID);
                }
                else if (objectClassID == 701 && currentID && parentObjectID && currentID.toLowerCase() == parentObjectID.toLowerCase() ) //OBJ_CALL
                {
                    if (self.callList.isLoaded())
                        self.callList.imList.TryReloadByID(objectID);
                    else 
                        self.Reload(currentID);
                }
            };
            self.onObjectUpdated = function (e, objectClassID, objectID, parentObjectID) {
                var currentID = self.RFC().ID();
                //
                if (objectClassID == 160 && currentID == parentObjectID) //OBJ_NEGOTIATION
                {
                    if (self.negotiationList.isLoaded())
                        self.negotiationList.imList.TryReloadByID(objectID);
                    else
                        self.Reload(currentID);
                }
                else if (objectClassID == 117 && currentID == parentObjectID) //OBJ_NOTIFICATION ~ SDNote
                {
                    if (self.tapeControl.isNoteListLoaded())
                        self.tapeControl.TryAddNoteByID(objectID);
                    else
                        self.Reload(currentID);
                }
                else if (objectClassID == 119 && currentID && parentObjectID && currentID.toLowerCase() == parentObjectID.toLowerCase()) //OBJ_WORKORDER
                {
                    if (self.workOrderList.isLoaded())
                        self.workOrderList.imList.TryReloadByID(objectID);
                    else 
                        self.Reload(currentID);
                }
                else if (objectClassID == 701 && currentID && parentObjectID && currentID.toLowerCase() == parentObjectID.toLowerCase()) //OBJ_CALL
                {
                    if (self.callList.isLoaded())
                        self.callList.imList.TryReloadByID(objectID);
                    else 
                        self.Reload(currentID);
                }
                else if (objectClassID == 703 && currentID == objectID && e.type != 'local_objectUpdated') //OBJ_RFC
                    self.Reload(currentID);
            };
            self.onObjectDeleted = function (e, objectClassID, objectID, parentObjectID) {
                var currentID = self.RFC().ID();
                //
                if (objectClassID == 110 && currentID == parentObjectID) //OBJ_DOCUMENT
                    self.LoadAttachmentsControl();
                else if (objectClassID == 160 && currentID == parentObjectID) //OBJ_NEGOTIATION
                {
                    if (self.negotiationList.isLoaded())
                        self.negotiationList.imList.TryRemoveByID(objectID);
                    else
                        self.Reload(currentID);
                }
                else if (objectClassID == 119) //OBJ_WORKORDER
                {
                    if (self.workOrderList.isLoaded())
                        self.workOrderList.imList.TryRemoveByID(objectID);
                    else if (currentID == parentObjectID)
                        self.Reload(currentID);
                }
                else if (objectClassID == 701) //OBJ_CALL
                {
                    if (self.callList.isLoaded())
                        self.callList.imList.TryRemoveByID(objectID);
                    else if (currentID == parentObjectID)
                        self.Reload(currentID);
                }
                else if (objectClassID == 703 && currentID == objectID) //OBJ_RFC
                {
                    self.IsReadOnly(true);
                    require(['sweetAlert'], function () {
                        swal(getTextResource('ObjectDeleted'), 'info');
                    });
                }
            };
        }
    }
    return module;
});