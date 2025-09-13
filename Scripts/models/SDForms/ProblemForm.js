define(['knockout', 'jquery', 'ajax', 'ttControl',
    'models/SDForms/SDForm.LinkList', 'models/SDForms/SDForm.CallReferenceList',
    'models/SDForms/SDForm.WOReferenceList', 'models/SDForms/SDForm.NegotiationList',
    'models/SDForms/SDForm.Tape', 'models/SDForms/SDForm.KBAReferenceList',
    'parametersControl', 'comboBox'],
    function (ko, $, ajaxLib, tclib,
        linkListLib, callReferenceListLib,
        workOrderReferenceListLib, negotiationListLib,
        tapeLib, kbaRefListLib,
        pcLib) {
    var module = {
        ViewModel: function (isReadOnly, $region, id) {
            //PROPERTIES AND ENUMS BLOCK
            var self = this;
            var $isLoaded = $.Deferred();
            self.$region = $region;
            self.CloseForm = null; // set in fh
            self.ControlForm = null; //set in fh
            self.CurrentUserID = null;
            self.id = id;
            self.objectClassID = 702; //Problem object id
            self.modes = {
                nothing: 'nothing',
                main: 'main',
                tape: 'tape',
                negotiation: 'negotiation',
                links: 'links',
                calls: 'calls',
                workorders: 'workorders'
            };
            $.when(userD).done(function (user) {
                self.CurrentUserID = user.UserID;
            });
            self.TabHeight = ko.observable(0);
            self.TabWidth = ko.observable(0);
            self.RefreshParameters = ko.observable(false);
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
                    self.kbaRefList.CheckData();
                }
                else if (newValue == self.modes.tape)
                    self.tapeControl.CheckData();
                else if (newValue == self.modes.workorders)
                    self.workOrderList.CheckData();
                else if (newValue == self.modes.calls)
                    self.callList.CheckData();
                else if (newValue == self.modes.links)
                    self.linkList.CheckData();
                else if (newValue == self.modes.negotiation)
                    self.negotiationList.CheckData(self.negotiationID);
                else if (newValue.indexOf(self.parameterModePrefix) != -1) {
                    self.InitializeParametersTabs();
                }
            });
            //
            //
            self.attachmentsControl = null;
            self.LoadAttachmentsControl = function () {
                if (!self.problem())
                    return;
                //
                require(['fileControl'], function (fcLib) {
                    if (self.attachmentsControl != null) {
                        if (self.attachmentsControl.ObjectID != self.problem().ID())//previous object  
                            self.attachmentsControl.RemoveUploadedFiles();
                        else if (!self.attachmentsControl.IsAllFilesUploaded())//uploading
                        {
                            setTimeout(self.LoadAttachmentsControl, 1000);//try to reload after second
                            return;
                        }
                    }
                    if (self.attachmentsControl == null || self.attachmentsControl.IsLoaded() == false) {
                        var attachmentsElement = self.$region.find('.documentList');
                        self.attachmentsControl = new fcLib.control(attachmentsElement, '.ui-dialog', '.b-requestDetail__files-addBtn');
                        self.attachmentsControl.OnChange = function () {
                            if (self.workflowControl() != null)
                                self.workflowControl().OnSave();
                        };
                    }
                    self.attachmentsControl.ReadOnly(self.IsReadOnly());
                    self.attachmentsControl.Initialize(self.problem().ID());
                });
            };
            //
            self.workflowControl = ko.observable(null);
            self.LoadWorkflowControl = function () {
                if (!self.problem())
                    return;
                //
                require(['workflow'], function (wfLib) {
                    if (self.workflowControl() == null) {
                        self.workflowControl(new wfLib.control(self.$region, self.IsReadOnly, self.problem));
                    }
                    self.workflowControl().ReadOnly(self.IsReadOnly());
                    self.workflowControl().Initialize();
                });
            };
            //
            self.EditManhoursWork = function () {
                require(['usualForms'], function (fhModule) {
                    var fh = new fhModule.formHelper();
                    fh.ShowManhoursWorkList(self.problem, self.objectClassID, self.CanEdit);
                });
            };
            //
            self.priorityControl = null;
            self.LoadPriorityControl = function () {
                if (!self.problem())
                    return;
                //
                require(['models/SDForms/SDForm.Priority'], function (prLib) {
                    if (self.priorityControl == null || self.priorityControl.IsLoaded() == false) {
                        self.priorityControl = new prLib.ViewModel(self.$region.find('.b-requestDetail-menu__priority'), self, self.IsReadOnly());
                        self.priorityControl.Initialize();
                    }
                    $.when(self.priorityControl.Load(self.problem().ID(), self.objectClassID, self.problem().UrgencyID(), self.problem().InfluenceID(), self.problem().PriorityID())).done(function (result) {
                        //not needed now
                    });
                });
            };
            //
            self.RefreshPriority = function (priorityObj) {
                if (priorityObj == null)
                    return;
                //
                self.problem().PriorityName(priorityObj.Name);
                self.problem().PriorityColor(priorityObj.Color);
                self.problem().PriorityID(priorityObj.ID);
                self.problem().InfluenceID(self.priorityControl.CurrentInfluenceID());
                self.problem().UrgencyID(self.priorityControl.CurrentUrgencyID());
            };
            //
            self.ajaxControl_CustomControl = new ajaxLib.control();
            self.ajaxControl_CustomControlUsers = new ajaxLib.control();
            self.CustomControl = ko.observable(false);
            self.LoadCustomControl = function () {
                if (!self.problem())
                    return;
                //
                var param = {
                    objectID: self.problem().ID(),
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
                    objectID: self.problem().ID(),
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
                                    var already = ko.utils.arrayFirst(self.ProblemUsersList(), function (item) {
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
                                    self.ProblemUsersList.push(user);
                                });
                            });
                    });
            };
            self.SaveCustomControl = function () {
                if (!self.problem())
                    return;
                //
                var param = {
                    objectID: self.problem().ID(),
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
            //
            self.problem = ko.observable(null);
            self.problem.subscribe(function (newValue) {
                $.when($isLoaded).done(function () {
                    self.SizeChanged();//block of problem completed
                    //
                    self.LoadAttachmentsControl();
                    self.LoadWorkflowControl();
                    if (self.IsReadOnly() == false) {
                        self.LoadPriorityControl();
                    }
                    //
                    self.OnParametersChanged();
                });
            });
            self.IsReadOnly = ko.observable(isReadOnly);
            self.IsReadOnly.subscribe(function (newValue) {
                var readOnly = self.IsReadOnly();
                //
                if (self.attachmentsControl != null)
                    self.attachmentsControl.ReadOnly(readOnly);
                if (self.workflowControl() != null)
                    self.workflowControl().ReadOnly(readOnly);
                if (self.parametersControl != null)
                    self.parametersControl.ReadOnly(readOnly);
                if (self.priorityControl != null)
                    self.priorityControl.ReadOnly(readOnly);
                if (self.linkList != null)
                    self.linkList.ReadOnly(readOnly);
                if (self.callList != null)
                    self.callList.ReadOnly(readOnly);
                if (self.negotiationList != null) {
                    //all inside control already
                }
            });
            //
            self.CanEdit = ko.computed(function () {
                return !self.IsReadOnly();
            });
            self.CanShow = ko.observable(self.CanEdit);
            //
            self.additionalClick = function () {
                //TODO
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
                        Subject: getTextResource('Problem') + (self.problem() != null ? (' №' + self.problem().Number() + ' ' + self.problem().Summary()) : '')
                    }
                    fh.ShowSendEmailForm(options);
                });
            };
                //
            self.EditProblemType = function () {
                if (self.CanEdit() == false)
                    return;
                showSpinner();
                require(['usualForms'], function (module) {
                    var fh = new module.formHelper(true);
                    var options = {
                        ID: self.problem().ID(),
                        objClassID: self.objectClassID,
                        fieldName: 'Problem.Type',
                        fieldFriendlyName: getTextResource('ProblemType'),
                        oldValue: { ID: self.problem().TypeID(), ClassID: 708, FullName: self.problem().TypeName() },
                        searcherName: 'ProblemTypeSearcher',
                        onSave: function (objectInfo) {
                            if (!objectInfo)
                                return;
                            self.problem().TypeID(objectInfo.ID);
                            self.problem().TypeName(objectInfo.FullName);
                            self.LoadWorkflowControl();
                            self.RefreshParameters(true);
                            self.OnParametersChanged();
                        }
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.searcherEdit, options);
                });
            };
            //
            self.EditOwner = function () {
                if (self.CanEdit() == false)
                    return;
                showSpinner();
                require(['usualForms', 'models/SDForms/SDForm.User'], function (module, userLib) {
                    var fh = new module.formHelper(true);
                    var options = {
                        ID: self.problem().ID(),
                        objClassID: self.objectClassID,
                        fieldName: 'Problem.Owner',
                        fieldFriendlyName: getTextResource('Owner'),
                        oldValue: self.problem().OwnerLoaded() ? { ID: self.problem().Owner().ID(), ClassID: 9, FullName: self.problem().Owner().FullName() } : null,
                        object: ko.toJS(self.problem().Owner()),
                        searcherName: 'OwnerUserSearcher',
                        searcherPlaceholder: getTextResource('EnterFIO'),
                        onSave: function (objectInfo) {
                            self.problem().OwnerLoaded(false);
                            self.problem().Owner(new userLib.EmptyUser(self, userLib.UserTypes.owner, self.EditOwner));
                            //
                            self.problem().OwnerID(objectInfo ? objectInfo.ID : '');
                            self.InitializeOwner();
                        }
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.searcherEdit, options);
                });
            };
            self.EditDescription = function () {
                showSpinner();
                require(['usualForms'], function (module) {
                    var fh = new module.formHelper(true);
                    var options = {
                        ID: self.problem().ID(),
                        objClassID: self.objectClassID,
                        fieldName: 'Problem.Description',
                        fieldFriendlyName: getTextResource('Description'),
                        oldValue: self.problem().Description(),
                        onSave: function (newHTML) {
                            self.problem().Description(newHTML);
                        },
                        readOnly: !self.CanEdit()
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.htmlEdit, options);
                });
            };
            self.EditSolution = function () {                
                showSpinner();
                require(['usualForms'], function (module) {
                    var fh = new module.formHelper(true);
                    var options = {
                        ID: self.problem().ID(),
                        objClassID: self.objectClassID,
                        fieldName: 'Problem.Solution',
                        fieldFriendlyName: getTextResource('Solution'),
                        oldValue: self.problem().Solution(),
                        onSave: function (newHTML) {
                            self.problem().Solution(newHTML);
                        },
                        readOnly: !self.CanEdit()
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.htmlEdit, options);
                });
            };
            self.EditFix = function () {               
                showSpinner();
                require(['usualForms'], function (module) {
                    var fh = new module.formHelper(true);
                    var options = {
                        ID: self.problem().ID(),
                        objClassID: self.objectClassID,
                        fieldName: 'Problem.Fix',
                        fieldFriendlyName: getTextResource('Fix'),
                        oldValue: self.problem().Fix(),
                        onSave: function (newHTML) {
                            self.problem().Fix(newHTML);
                        },
                        readOnly: !self.CanEdit()
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.htmlEdit, options);
                });
            };
            self.EditCause = function () {                
                showSpinner();
                require(['usualForms'], function (module) {
                    var fh = new module.formHelper(true);
                    var options = {
                        ID: self.problem().ID(),
                        objClassID: self.objectClassID,
                        fieldName: 'Problem.Cause',
                        fieldFriendlyName: getTextResource('Cause'),
                        oldValue: self.problem().Cause(),
                        onSave: function (newHTML) {
                            self.problem().Cause(newHTML);
                        },
                        readOnly: !self.CanEdit()
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.htmlEdit, options);
                });
            };
            self.EditShortCause = function () {
                if (self.CanEdit() == false)
                    return;
                showSpinner();
                require(['usualForms'], function (module) {
                    var fh = new module.formHelper(true);
                    var options = {
                        ID: self.problem().ID(),
                        objClassID: self.objectClassID,
                        fieldName: 'Problem.ProblemCause',
                        fieldFriendlyName: getTextResource('ShortCause'),
                        oldValue: self.problem().ProblemCauseID() ? { ID: self.problem().ProblemCauseID(), ClassID: 709, FullName: self.problem().ProblemCauseName() } : null,
                        searcherName: 'ProblemCauseSearcher',
                        searcherPlaceholder: getTextResource('EnterProblemCause'),
                        onSave: function (objectInfo) {
                            self.problem().ProblemCauseID(objectInfo ? objectInfo.ID : '');
                            self.problem().ProblemCauseName(objectInfo ? objectInfo.FullName : '');
                        }
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.searcherEdit, options);
                });
            };
            self.EditSummary = function () {
                if (self.CanEdit() == false)
                    return;
                showSpinner();
                require(['usualForms'], function (module) {
                    var fh = new module.formHelper(true);
                    var options = {
                        ID: self.problem().ID(),
                        objClassID: self.objectClassID,
                        fieldName: 'Problem.Summary',
                        fieldFriendlyName: getTextResource('Summary'),
                        oldValue: self.problem().Summary(),
                        onSave: function (newText) {
                            self.problem().Summary(newText);
                        }
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.textEdit, options);
                });
            };
            self.EditDatePromised = function () {
                if (self.CanEdit() == false)
                    return;
                showSpinner();
                require(['usualForms'], function (module) {
                    var fh = new module.formHelper(true);
                    var options = {
                        ID: self.problem().ID(),
                        objClassID: self.objectClassID,
                        fieldName: 'Problem.DatePromised',
                        fieldFriendlyName: getTextResource('ProblemDatePromise'),
                        oldValue: self.problem().UtcDatePromisedDT(),
                        onSave: function (newDate) {
                            self.problem().UtcDatePromised(parseDate(newDate));
                            self.problem().UtcDatePromisedDT(new Date(parseInt(newDate)));
                            //
                            if (self.tapeControl && self.tapeControl.TimeLineControl && self.tapeControl.isTimeLineLoaded && self.tapeControl.isTimeLineLoaded()) {
                                var mainTLC = self.tapeControl.TimeLineControl();
                                if (mainTLC != null && mainTLC.TimeLine) {
                                    var currentTL = mainTLC.TimeLine();
                                    if (currentTL != null && currentTL.UtcDatePromised) {
                                        currentTL.UtcDatePromised.LocalDate(self.problem().UtcDatePromised());
                                        currentTL.UtcDatePromised.DateObj(self.problem().UtcDatePromisedDT());
                                    }
                                }
                            }
                        }
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.dateEdit, options);
                });
            };
            self.EditManhoursNorm = function () {
                if (self.CanEdit() == false)
                    return;
                showSpinner();
                require(['usualForms'], function (module) {
                    var fh = new module.formHelper(true);
                    var options = {
                        ID: self.problem().ID(),
                        objClassID: self.objectClassID,
                        fieldName: 'Problem.ManhoursNorm',
                        fieldFriendlyName: getTextResource('ManhoursNorm'),
                        oldValue: self.problem().ManhoursNorm(),
                        onSave: function (newVal) {
                            self.problem().ManhoursNorm(newVal);
                        }
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.timeEdit, options);
                });
            };
            //
            self.ajaxControl_deleteUser = new ajaxLib.control();
            self.DeleteUser = function (isReplaceAnyway, options) {
                var data = {
                    ID: self.problem().ID(),
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
                                            swal(getTextResource('SaveError'), getTextResource('NullParamsError') + '\n[ProblemForm.js DeleteUser]', 'error');
                                        });
                                    }
                                    else if (result === 2) {
                                        require(['sweetAlert'], function () {
                                            swal(getTextResource('SaveError'), getTextResource('BadParamsError') + '\n[ProblemForm.js DeleteUser]', 'error');
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
                                            swal(getTextResource('SaveError'), getTextResource('GlobalError') + '\n[ProblemForm.js DeleteUser]', 'error');
                                        });
                                    }
                                }
                                else {
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('SaveError'), getTextResource('GlobalError') + '\n[ProblemForm.js, DeleteUser]', 'error');
                                    });
                                }
                            });
            };
            self.DeleteOwner = function () {
                require(['models/SDForms/SDForm.User'], function (userLib) {
                    var options = {
                        FieldName: 'Problem.Owner',
                        OldValue: self.problem().OwnerLoaded() ? { ID: self.problem().Owner().ID(), ClassID: 9, FullName: self.problem().Owner().FullName() } : null,
                        onSave: function () {
                            self.problem().OwnerLoaded(false);
                            self.problem().Owner(new userLib.EmptyUser(self, userLib.UserTypes.owner, self.EditOwner));
                            //
                            self.problem().OwnerID('');
                        }
                    };
                    self.DeleteUser(false, options);
                });
            };
            //
            self.InitializeOwner = function () {
                require(['models/SDForms/SDForm.User'], function (userLib) {
                    var p = self.problem();
                    if (p.OwnerLoaded() == false && p.OwnerID()) {
                        var options = {
                            UserID: p.OwnerID(),
                            UserType: userLib.UserTypes.owner,
                            UserName: null,
                            EditAction: self.EditOwner,
                            RemoveAction: self.DeleteOwner,
                            CanNote: true
                        };
                        var user = new userLib.User(self, options);
                        p.Owner(user);
                        p.OwnerLoaded(true);
                        //
                        var already = ko.utils.arrayFirst(self.ProblemUsersList(), function (item) {
                            return item.ID() == p.OwnerID();
                        });
                        //
                        if (already == null)
                            self.ProblemUsersList.push(user);
                        else if (already.Type == userLib.UserTypes.withoutType) {
                            self.ProblemUsersList.remove(already);
                            self.ProblemUsersList.push(user);
                        }
                    }
                });
            };
            self.CalculateUsersList = function () {
                require(['models/SDForms/SDForm.User'], function (userLib) {
                    if (!self.problem()) {
                        self.ProblemUsersList([]);
                        self.ProblemUsersList.valueHasMutated();
                        return;
                    }
                    //
                    self.InitializeOwner();
                    //
                    self.ProblemUsersList.valueHasMutated();
                    //add currentUser to list
                    $.when(userD).done(function (userObj) {
                        require(['models/SDForms/SDForm.User'], function (userLib) {
                            var already = ko.utils.arrayFirst(self.ProblemUsersList(), function (item) {
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
                                CanNote : true
                            };
                            var user = new userLib.User(self, options);
                            //
                            self.ProblemUsersList.push(user);
                        });
                    });
                    //
                    self.LoadCustomControl();
                });
            };
            //
            self.ProblemUsersList = ko.observableArray([]);
            //
            self.DatePromisedCalculated = ko.computed(function () { //или из объекта, или из хода выполнения
                var retval = '';
                //
                if (self.tapeControl && self.tapeControl.TimeLineControl && self.tapeControl.isTimeLineLoaded && self.tapeControl.isTimeLineLoaded()) {
                    var mainTLC = self.tapeControl.TimeLineControl();
                    if (mainTLC != null && mainTLC.TimeLine) {
                        var currentTL = mainTLC.TimeLine();
                        if (currentTL != null && currentTL.UtcDatePromised)
                            retval = currentTL.UtcDatePromised.LocalDate();
                    }
                }
                //
                if (!retval && self.problem) {
                    var p = self.problem();
                    if (p && p.UtcDatePromised)
                        retval = p.UtcDatePromised();
                }
                //
                return retval;
            });
            //
            self.DateModifyCalculated = ko.computed(function () { //или из объекта, или из хода выполнения
                var retval = '';
                //
                if (self.tapeControl && self.tapeControl.TimeLineControl && self.tapeControl.isTimeLineLoaded && self.tapeControl.isTimeLineLoaded()) {
                    var mainTLC = self.tapeControl.TimeLineControl();
                    if (mainTLC != null && mainTLC.TimeLine) {
                        var currentTL = mainTLC.TimeLine();
                        if (currentTL != null && currentTL.UtcDateModified)
                            retval = currentTL.UtcDateModified.LocalDate();
                    }
                }
                //
                if (!retval && self.problem) {
                    var p = self.problem();
                    if (p && p.UtcDateModified)
                        retval = p.UtcDateModified();
                }
                //
                return retval;
            });
            //
            self.LeftPanelModel = null;
            self.HideShowLeftPanel = function () {
                if (!self.CanEdit())
                    return;
                //
                if (self.LeftPanelModel == null) {
                    require(['usualForms'], function (fhModule) {
                        var fh = new fhModule.formHelper();
                        if (self.LeftPanelModel == null) //multiple clicks
                            fh.ShowHelpSolutionPanel(self.ControlForm, self, self.problem);
                    });
                    //
                    return;
                }
                //
                var current = self.LeftPanelModel.IsVisible();
                self.LeftPanelModel.IsVisible(!current);
            };
            self.AddTextToSolution = function (newText) {
                if (!self.problem() || !newText)
                    return;
                //
                var currentValue = self.problem().Solution();
                if (!currentValue)
                    currentValue = '';
                var newValue = currentValue + ' \n ' + newText;
                //
                var options = {
                    FieldName: 'Problem.Solution',
                    OldValue: currentValue,
                    NewValue: newValue,
                    onSave: function () {
                        self.problem().Solution(newValue);
                    }
                };
                self.UpdateTextField(false, options);
            };
            self.ajaxControl_updateTextField = new ajaxLib.control();
            self.UpdateTextField = function (isReplaceAnyway, options) {
                var data = {
                    ID: self.problem().ID(),
                    ObjClassID: self.objectClassID,
                    Field: options.FieldName,
                    OldValue: options.OldValue == null ? null : JSON.stringify({ 'text': options.OldValue }),
                    NewValue: options.NewValue == null ? null : JSON.stringify({ 'text': options.NewValue }),
                    Params: null,
                    ReplaceAnyway: isReplaceAnyway
                };
                //
                self.ajaxControl_updateTextField.Ajax(
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
                                            swal(getTextResource('SaveError'), getTextResource('NullParamsError') + '\n[ProblemForm.js UpdateTextField]', 'error');
                                        });
                                    }
                                    else if (result === 2) {
                                        require(['sweetAlert'], function () {
                                            swal(getTextResource('SaveError'), getTextResource('BadParamsError') + '\n[ProblemForm.js UpdateTextField]', 'error');
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
                                                    self.UpdateTextField(true, options);
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
                                            swal(getTextResource('SaveError'), getTextResource('GlobalError') + '\n[ProblemForm.js UpdateTextField]', 'error');
                                        });
                                    }
                                }
                                else {
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('SaveError'), getTextResource('GlobalError') + '\n[ProblemForm.js UpdateTextField]', 'error');
                                    });
                                }
                            });
            };
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
            self.tapeControl = new tapeLib.Tape(self.problem, self.objectClassID, self.$region.find('.tape__b').selector, self.$region.find('.tape__forms').selector, self.IsReadOnly, self.CanEdit, self.CanViewNotes, self.TabSize, self.ProblemUsersList);
            //
            //LINKS BLOCK
            self.linkList = new linkListLib.LinkList(self.problem, self.objectClassID, self.$region.find('.links__b .tabContent').selector, self.IsReadOnly, self.CanEdit);
            //
            //NEGOTIATION BLOCK
            self.negotiationList = new negotiationListLib.LinkList(self.problem, self.objectClassID, self.$region.find('.negotiations__b .tabContent').selector, self.IsReadOnly, self.CanEdit);
            //
            //WO REFERENCE BLOCK
            self.workOrderList = new workOrderReferenceListLib.LinkList(self.problem, self.objectClassID, self.$region.find('.woRef__b .tabContent').selector, self.IsReadOnly, self.CanEdit);
            //
            //CALL REFERENCE BLOCK
            self.callList = new callReferenceListLib.LinkList(self.problem, self.objectClassID, self.$region.find('.cRef__b .tabContent').selector, self.IsReadOnly, self.CanEdit);
            //
            self.kbaRefList = new kbaRefListLib.KBAReferenceList(self.problem, self.objectClassID, self.$region.find('.solution-kb__b').selector, self.IsReadOnly, self.IsReadOnly);
            //
            //PARAMETERS BLOCK
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
                var p = self.problem();
                if (!p)
                    self.parametersControl.InitializeOrCreate(null, null, null, self.RefreshParameters());//нет объекта - нет параметров
                else self.parametersControl.InitializeOrCreate(self.objectClassID, p.ID(), p, self.RefreshParameters());
                self.RefreshParameters(false);
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
            //
            //
            //KO INIT BLOCK
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
                            url: 'sdApi/GetProblem'
                        },
                        function (newVal) {
                            var loadSuccessD = $.Deferred();
                            var processed = false;
                            //
                            if (newVal) {
                                if (newVal.Result == 0) {//success
                                    var pInfo = newVal.Problem;
                                    if (pInfo && pInfo.ID) {
                                        require(['models/SDForms/ProblemForm.Problem'], function (pLib) {
                                            self.problem(new pLib.Problem(self, pInfo));
                                            self.ProblemUsersList.removeAll();
                                            self.CalculateUsersList();
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
                                        swal(getTextResource('UnhandledErrorServer'), getTextResource('AjaxError') + '\n[ProblemForm.js, Load]', 'error');
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
                self.solutionTabLoaded(false);
                self.workOrderList.ClearData();
                self.callList.ClearData();
                self.kbaRefList.ClearData();
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
            self.renderProblemComplete = function () {
                $isLoaded.resolve();
                self.SizeChanged();
            };
            //
            self.AfterRender = function () {
                self.SizeChanged();
            };
            //            
            self.IsSolutionContainerVisible = ko.observable(true);
            self.ToggleSolutionContainer = function () {
                self.IsSolutionContainerVisible(!self.IsSolutionContainerVisible());
            };
            self.IsCauseContainerVisible = ko.observable(true);
            self.ToggleCauseContainer = function () {
                self.IsCauseContainerVisible(!self.IsCauseContainerVisible());
            };
            self.IsDescriptionContainerVisible = ko.observable(true);
            self.ToggleDescriptionContainer = function () {
                self.IsDescriptionContainerVisible(!self.IsDescriptionContainerVisible());
            };
            //
            self.SizeChanged = function () {
                if (!self.problem())
                    return;//Critical - ko - with:problem!!!
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
            self.Unload = function () {
                $(document).unbind('objectInserted', self.onObjectInserted);
                $(document).unbind('objectUpdated', self.onObjectUpdated);
                $(document).unbind('objectDeleted', self.onObjectDeleted);
                $(document).unbind('local_objectInserted', self.onObjectInserted);
                $(document).unbind('local_objectUpdated', self.onObjectUpdated);
                $(document).unbind('local_objectDeleted', self.onObjectDeleted);
                //
                if (self.attachmentsControl != null)
                    self.attachmentsControl.RemoveUploadedFiles();
                if (self.parametersControl != null)
                    self.parametersControl.DestroyControls();
                if (self.workflowControl() != null)
                    self.workflowControl().Unload();
            };
            //
            self.onObjectInserted = function (e, objectClassID, objectID, parentObjectID) {
                var currentID = self.problem().ID();
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
                else if (objectClassID == 137 && currentID == parentObjectID) //OBJ_KBArticle
                {
                    if (self.kbaRefList.isLoaded())
                        self.kbaRefList.imList.ReloadAll();
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
            };
            self.onObjectUpdated = function (e, objectClassID, objectID, parentObjectID) {
                var currentID = self.problem().ID();
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
                else if (objectClassID == 702 && currentID == objectID && e.type != 'local_objectUpdated') //OBJ_PROBLEM
                    self.Reload(currentID);
            };
            self.onObjectDeleted = function (e, objectClassID, objectID, parentObjectID) {
                var currentID = self.problem().ID();
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
                else if (objectClassID == 137 && currentID == parentObjectID) //OBJ_KBArticle
                {
                    if (self.kbaRefList.isLoaded())
                        self.kbaRefList.imList.TryRemoveByID(objectID);
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
                else if (objectClassID == 702 && currentID == objectID) //OBJ_PROBLEM
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