define(['knockout', 'jquery', 'ajax', 'usualForms', 'ttControl', 'models/SDForms/SDForm.LinkList', 'models/SDForms/SDForm.WOReferenceList', 'comboBox'], function (ko, $, ajaxLib, fhModule, tclib, linkListLib, workOrderReferenceListLib) {
    var module = {
        ViewModel: function (isReadOnly, $region, id) {
            var self = this;
            //
            self.$region = $region;
            self.CloseForm = null;//set in fh
            self.ajaxControl_load = new ajaxLib.control();
            self.project = ko.observable(null);
            self.objectClassID = 18;            
            self.ReadOnly = ko.observable(isReadOnly);
            self.CanEdit = ko.computed(function () {
                return !self.ReadOnly();
            });
            self.IsClientMode = ko.observable(false);//sd.user form
            //
            self.comboItems = ko.observableArray([]);
            self.getComboItems = function () {
                return {
                    data: self.comboItems(),
                    totalCount: self.comboItems().length
                };
            };
            //
            self.modes = {
                nothing: 'nothing',
                main: 'main',
                workorders: 'workorders'
            };
            //
            self.TabHeight = ko.observable(0);
            self.SizeChanged = function () {
                //
                var tabHeight = self.$region.height();//form height
                tabHeight -= self.$region.find('.b-requestDetail-menu').outerHeight(true);
                tabHeight -= self.$region.find('.b-requestDetail__title-header').outerHeight(true);
                //
                self.TabHeight(Math.max(0, tabHeight - 15) + 'px');
            };
            //
            self.mainTabLoaded = ko.observable(false);
            self.mode = ko.observable(self.modes.main);
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
                else if (newValue == self.modes.workorders) {
                    self.workOrderList.CheckData();
                }
            });
            //
            //
            self.selectedComboItem = ko.observable(null);
            //
            self.Load = function (id) {
                var retD = $.Deferred();
                if (id) {
                    self.ajaxControl_load.Ajax(self.$region,
                        {
                            dataType: "json",
                            method: 'GET',
                            data: { 'id': id },
                            url: 'sdApi/GetProject'
                        },
                        function (newVal) {
                            var loadSuccessD = $.Deferred();
                            var processed = false;
                            //
                            if (newVal) {
                                if (newVal.Result == 0) {//success
                                    var projectInfo = newVal.Project;
                                    if (projectInfo && projectInfo.ID) {
                                        require(['models/TimeManagement/ProjectForm.Project'], function (projectLib) {
                                            self.project(new projectLib.Project(self, projectInfo));
                                            //
                                            self.SizeChanged();
                                            //
                                            self.InitializeUser(self.project().DirectorLoaded, self.project().DirectorID, self.project().Director, 'Director');
                                            self.InitializeUser(self.project().InitiatorLoaded, self.project().InitiatorID, self.project().Initiator, 'ProjectInitiator');
                                            //                                    
                                           //
                                            //self.GetProjectStateList();
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
                                        swal(getTextResource('UnhandledErrorServer'), getTextResource('AjaxError') + '\n[WorkOrderForm.js, Load]', 'error');
                                    });
                                }
                            });
                        });
                }
                else retD.resolve(false);
                //
                $.when(retD).done(function (result) {
                    if (result == false && self.CloseForm != null)
                        self.CloseForm();
                });
                //
                return retD.promise();
            };
            self.AfterRender = function () {
                self.SizeChanged();
            }
            //name
            {
                self.Name = ko.observable('');
                //
                self.EditName = function () {
                    showSpinner();
                        var fh = new fhModule.formHelper(true);
                        var options = {
                            ID: self.project().ID(),
                            objClassID: self.objectClassID,
                            fieldName: 'Project.Name',
                            fieldFriendlyName: getTextResource('Name'),
                            oldValue: self.project().Name(),
                            onSave: function (newText) {
                                self.project().Name(newText);
                            }
                        };
                        fh.ShowSDEditor(fh.SDEditorTemplateModes.textEdit, options);
                };
            }
            //
            //description
            {
                //
      
                //
                self.EditDescription = function () {
                    showSpinner();
                    var fh = new fhModule.formHelper(true);
                        var options = {
                            ID: self.project().ID(),
                            objClassID: self.objectClassID,
                            fieldName: 'Project.Note',
                            fieldFriendlyName: getTextResource('Description'),
                            oldValue: self.project().HtmlNote(),
                            onSave: function (newHTML) {
                                self.project().HtmlNote(newHTML);
                            }
                        };
                        fh.ShowSDEditor(fh.SDEditorTemplateModes.htmlEdit, options);
                };
            }
            //
            //user
            {
                self.InitializeUser = function (userLoaded, userID, user, userTypeStr) {//ko(bool), ko(guid), ko, string
                    require(['models/SDForms/SDForm.User'], function (userLib) {
                        if (userLoaded() == false) {
                            if (userID()) {
                                var options = {
                                    UserID: userID(),
                                    UserType: userTypeStr,
                                    UserName: '',
                                    EditAction: function () { self.EditUser(userLoaded, userID, user, userTypeStr) },
                                    RemoveAction: function () { self.DeleteUser(userLoaded, userID, user, userTypeStr) }
                                };
                                user(new userLib.User(self, options));
                                userLoaded(true);
                            }
                            else
                                user(new userLib.EmptyUser(self, userTypeStr, function () { self.EditUser(userLoaded, userID, user, userTypeStr) }));
                        }
                    });
                };
                self.EditUser = function (userLoaded, userID, user, userTypeStr) {
                    showSpinner();
                    require(['models/SDForms/SDForm.User'], function (userLib) {
                        var fh = new fhModule.formHelper(true);
                        var options = {
                            ID: self.project().ID(),
                            objClassID: self.objectClassID,
                            fieldName: userTypeStr === 'ProjectInitiator' ? 'Initiator' : userTypeStr,
                            fieldFriendlyName: getTextResource(userTypeStr),
                            oldValue: userLoaded() ? { ID: user().ID(), ClassID: 9, FullName: user().FullName() } : null,
                            object: ko.toJS(user()),
                            searcherName: 'WebUserSearcher',
                            searcherPlaceholder: getTextResource('EnterFIO'),
                            onSave: function (objectInfo) {
                                userLoaded(false);
                                user(new userLib.EmptyUser(self, userTypeStr, function () { self.EditUser(userLoaded, userID, user, userTypeStr) }));
                                userID(objectInfo ? objectInfo.ID : null);
                                //
                                self.InitializeUser(userLoaded, userID, user, userTypeStr);
                            }
                        };
                        fh.ShowSDEditor(fh.SDEditorTemplateModes.searcherEdit, options);
                    });
                };
                self.DeleteUser = function (userLoaded, userID, user, userTypeStr) {
                    require(['models/SDForms/SDForm.User'], function (userLib) {
                        userLoaded(false);
                        userID(null);
                        user(new userLib.EmptyUser(self, userTypeStr, function () { self.EditUser(userLoaded, userID, user, userTypeStr) }));
                    });
                };
            }
            //
            self.objectClassID = 371;
            //WO REFERENCE BLOCK
            self.workOrderList = new workOrderReferenceListLib.LinkList(self.project, self.objectClassID, self.$region.find('.woRef__b .tabContent').selector, self.ReadOnly, self.CanEdit);      
           
            self.GetProjectStateList = function () {
                self.ajaxControl_load.Ajax(self.$region.find('.combobox'),
                   {
                       dataType: "json",
                       method: 'GET',
                       url: 'sdApi/GetProjectStateList'
                   },
                   function (result) {
                       if (result && result.List) {
                           var selEl = null;
                           result.List.forEach(function (el) {

                               self.comboItems().push(el);
                               if (self.project().StateID() === el.ID)
                                   selEl = el;
                           });
                           self.comboItems.valueHasMutated();
                           self.selectedComboItem(selEl);
                       }
                   });
            }
            //
            self.EditDatePlanStart = function () {
                if (self.CanEdit() == false)
                    return;
                //
                showSpinner();
                    var fh = new fhModule.formHelper(true);
                    var options = {
                        ID: self.project().ID(),
                        objClassID: self.objectClassID,
                        fieldName: 'Project.DatePlanStart',
                        fieldFriendlyName: 'Дата начала',
                        oldValue: self.project().UtcDatePlanStartDT(),
                        onSave: function (newDate) {
                            self.project().UtcDatePlanStart(parseDate(newDate));
                            self.project().UtcDatePlanStartDT(new Date(parseInt(newDate)));
                        }
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.dateEdit, options);
            };
            //
            self.EditDatePlanEnd = function () {
                if (self.CanEdit() == false)
                    return;
                //
                showSpinner();
                var fh = new fhModule.formHelper(true);
                    var options = {
                        ID: self.project().ID(),
                        objClassID: self.objectClassID,
                        fieldName: 'Project.DatePlanEnd',
                        fieldFriendlyName: 'Дата окончания',
                        oldValue: self.project().UtcDatePlanEndDT(),
                        onSave: function (newDate) {
                            self.project().UtcDatePlanEnd(parseDate(newDate));
                            self.project().UtcDatePlanEndDT(new Date(parseInt(newDate)));
                        }
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.dateEdit, options);
            };
            //
            self.EditDateStart = function () {
                if (self.CanEdit() == false)
                    return;
                //
                showSpinner();
                var fh = new fhModule.formHelper(true);
                    var options = {
                        ID: self.project().ID(),
                        objClassID: self.objectClassID,
                        fieldName: 'Project.DateStart',
                        fieldFriendlyName: 'Дата начала',
                        oldValue: self.project().UtcDateStartDT(),
                        onSave: function (newDate) {
                            self.project().UtcDateStart(parseDate(newDate));
                            self.project().UtcDateStartDT(new Date(parseInt(newDate)));
                        }
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.dateEdit, options);
            };
            //
            self.EditDateEnd = function () {
                if (self.CanEdit() == false)
                    return;
                //
                showSpinner();
                var fh = new fhModule.formHelper(true);
                    var options = {
                        ID: self.project().ID(),
                        objClassID: self.objectClassID,
                        fieldName: 'Project.DateEnd',
                        fieldFriendlyName: 'Дата окончания',
                        oldValue: self.project().UtcDateEndDT(),
                        onSave: function (newDate) {
                            self.project().UtcDateEnd(parseDate(newDate));
                            self.project().UtcDateEndDT(new Date(parseInt(newDate)));
                        }
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.dateEdit, options);
            };
            //
            self.EditManhoursWork = function () {
                if (self.CanEdit() == false)
                    return;
                //
                    var fh = new fhModule.formHelper();
                    fh.ShowManhoursWorkList(self.project, self.objectClassID, self.CanEdit);
            };
            //
            self.EditState = function () {
                if (self.CanEdit() == false)
                    return;
                //
                showSpinner();
                require(['usualForms'], function (module) {
                    var fh = new module.formHelper(true);
                    var options = {
                        ID: self.project().ID(),
                        objClassID: self.objectClassID,
                        fieldName: 'Project.State',
                        fieldFriendlyName: getTextResource('ProjectStatus'),
                        comboBoxGetValueUrl: 'sdApi/GetProjectStateList',
                        oldValue: {
                            ID: self.project().StateID(), Name: self.project().StateName()
                        },
                        onSave: function (selectedValue) {
                            self.project().StateID(selectedValue.ID);
                            self.project().StateName(selectedValue.Name);
                        }
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.comboBoxEdit, options);
                });
            };
        }
    }
    return module;
});