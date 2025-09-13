define(['knockout', 'jquery', 'usualForms', 'ajax', 'parametersControl', 'comboBox'], function (ko, $, fhModule, ajaxLib, pcLib) {
    var module = {
        ViewModel: function (mainRegionID, objectClassID, objectID, dependencyList) {
            var self = this;
            //
            //outer actions
            self.frm = undefined;
            //
            //vars
            self.formClassID = 702;//OBJ_PROBLEM
            self.MainRegionID = mainRegionID;
            self.ID = null;//for registered problem
            self.renderedD = $.Deferred();
            //
            self.ObjectClassID = objectClassID;//объект, с которым связана проблема
            self.ObjectID = objectID;//объект, с которым связана проблема
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
                        $.when(self.priorityControl.Load(null, 702, self.UrgencyID, self.InfluenceID, self.PriorityID)).done(function (result) {
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
            //Summary
            {
                self.Summary = ko.observable('');
                //
                self.EditSummary = function () {
                    showSpinner();
                    var fh = new fhModule.formHelper(true);
                    var options = {
                        fieldName: 'Problem.Summary',
                        fieldFriendlyName: getTextResource('Summary'),
                        oldValue: self.Summary(),
                        onSave: function (newText) {
                            self.Summary(newText);
                        },
                        nosave: true
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.textEdit, options);
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
                        fieldName: 'Problem.Description',
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
                    thisObj.SelectedItem.subscribe(function (newValue) {
                        self.OnParametersChanged();
                    }, thisObj);
                }
            }
            //
            //problemType
            {
                self.ProblemTypeHelper = new self.createComboBoxHelper('#' + self.MainRegionID + ' .callType', 'sdApi/GetProblemTypeList');
                self.EditProblemType = function () {
                    showSpinner();
                    var fh = new fhModule.formHelper(true);
                    var options = {
                        fieldName: 'Problem.ProblemType',
                        fieldFriendlyName: getTextResource('ProblemType'),
                        oldValue: self.ProblemTypeHelper.GetObjectInfo(136),
                        searcherName: 'ProblemTypeSearcher',
                        searcherPlaceholder: getTextResource('PromptType'),
                        onSave: function (objectInfo) {
                            self.ProblemTypeHelper.SetSelectedItem(objectInfo ? objectInfo.ID : null);
                            self.OnParametersChanged();
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
                            fieldName: 'Problem.Owner',
                            fieldFriendlyName: getTextResource('Owner'),
                            oldValue: self.OwnerLoaded() ? { ID: self.Owner().ID(), ClassID: 9, FullName: self.Owner().FullName() } : null,
                            object: ko.toJS(self.Owner()),
                            searcherName: 'OwnerUserSearcher',
                            searcherPlaceholder: getTextResource('EnterFIO'),
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
            //shortCause + cause
            {
                self.IsCauseContainerVisible = ko.observable(false);
                self.ToggleCauseContainer = function () {
                    self.IsCauseContainerVisible(!self.IsCauseContainerVisible());
                };
                //
                self.ProblemCauseHelper = new self.createComboBoxHelper('#' + self.MainRegionID + ' .shortCause', 'sdApi/GetProblemCauseList');
                self.EditShortCause = function () {
                    showSpinner();
                    var fh = new fhModule.formHelper(true);
                    var options = {
                        fieldName: 'Problem.ProblemCause',
                        fieldFriendlyName: getTextResource('ShortCause'),
                        oldValue: self.ProblemCauseHelper.GetObjectInfo(709),
                        searcherName: 'ProblemCauseSearcher',
                        searcherPlaceholder: getTextResource('EnterProblemCause'),
                        onSave: function (objectInfo) {
                            self.ProblemCauseHelper.SetSelectedItem(objectInfo ? objectInfo.ID : null);
                        },
                        nosave: true
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.searcherEdit, options);
                };
                //
                self.htmlCauseControl = null;
                self.InitializeCause = function () {
                    var htmlElement = $('#' + self.MainRegionID).find('.cause');
                    if (self.htmlCauseControl == null)
                        require(['htmlControl'], function (htmlLib) {
                            self.htmlCauseControl = new htmlLib.control(htmlElement);
                            self.htmlCauseControl.OnHTMLChanged = function (htmlValue) {
                                self.Cause(htmlValue);
                            };
                        });
                    else
                        self.htmlCauseControl.Load(htmlElement);
                };
                //
                self.Cause = ko.observable('');
                self.Cause.subscribe(function (newValue) {
                    if (self.htmlCauseControl != null)
                        self.htmlCauseControl.SetHTML(newValue);
                });
                //
                self.EditCause = function () {
                    showSpinner();
                    var fh = new fhModule.formHelper(true);
                    var options = {
                        fieldName: 'Problem.Cause',
                        fieldFriendlyName: getTextResource('Cause'),
                        oldValue: self.Cause(),
                        onSave: function (newHTML) {
                            self.Cause(newHTML);
                        },
                        nosave: true
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.htmlEdit, options);
                };
            }
            //
            //solution + fix
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
                        fieldName: 'Problem.Solution',
                        fieldFriendlyName: getTextResource('Solution'),
                        oldValue: self.Solution(),
                        onSave: function (newHTML) {
                            self.Solution(newHTML);
                        },
                        nosave: true
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.htmlEdit, options);
                };
                //
                self.htmlFixControl = null;
                self.InitializeFix = function () {
                    var htmlElement = $('#' + self.MainRegionID).find('.fix');
                    if (self.htmlFixControl == null)
                        require(['htmlControl'], function (htmlLib) {
                            self.htmlFixControl = new htmlLib.control(htmlElement);
                            self.htmlFixControl.OnHTMLChanged = function (htmlValue) {
                                self.Fix(htmlValue);
                            };
                        });
                    else
                        self.htmlFixControl.Load(htmlElement);
                };
                //
                self.Fix = ko.observable('');
                self.Fix.subscribe(function (newValue) {
                    if (self.htmlFixControl != null)
                        self.htmlFixControl.SetHTML(newValue);
                });
                //
                self.EditFix = function () {
                    showSpinner();
                    var fh = new fhModule.formHelper(true);
                    var options = {
                        fieldName: 'Problem.Fix',
                        fieldFriendlyName: getTextResource('Fix'),
                        oldValue: self.Fix(),
                        onSave: function (newHTML) {
                            self.Fix(newHTML);
                        },
                        nosave: true
                    };
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.htmlEdit, options);
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
                    var tmp = self.ProblemTypeHelper.SelectedItem();
                        var problemTypeID = tmp == null ? '00000000-0000-0000-0000-000000000000' : tmp.ID;
                        self.parametersControl.Create(702, problemTypeID, false,4);                    
                };
                self.OnParametersChanged = function () {//обновления списка параметров по объекту
                    if (self.parametersControl == null) {
                        self.parametersControl = new pcLib.control();
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
                    $('#' + self.MainRegionID).find('.firstFocus').focus();
                    //
                    if (self.AddAs)
                        self.Fill(self.problemData);
                    //
                    self.LoadPriorityControl();
                    //
                    self.InitializeDescription();
                    self.InitializeCause();
                    self.LoadAttachmentsControl();
                    //
                    self.InitializeSolution();
                    self.InitializeFix();
                    //
                    if (!self.AddAs) {
                        self.ProblemTypeHelper.LoadList();
                        self.ProblemTypeHelper.SetSelectedItem('00000000-0000-0000-0000-000000000000');//problem
                    }
                    //
                    self.ProblemCauseHelper.LoadList();
                    //
                    self.InitializeOwner();
                    //
                    self.OnParametersChanged();
                });
            };
            //
            self.AfterRender = function () {
                self.renderedD.resolve();
            };
            //                                         
            self.IsRegisteringProblem = false;
            //
            self.ajaxControl_RegisterProblem = new ajaxLib.control();
            self.ValidateAndRegisterProblem = function (showSuccessMessage) {
                var retval = $.Deferred();
                //
                if (self.IsRegisteringProblem)
                    return;
                //
                var data = {
                    'ProblemTypeID': self.ProblemTypeHelper.SelectedItem() == null ? null : self.ProblemTypeHelper.SelectedItem().ID,
                    'UrgencyID': self.UrgencyID == '00000000-0000-0000-0000-000000000000' ? null : self.UrgencyID,
                    'PriorityID': self.PriorityID == '00000000-0000-0000-0000-000000000000' ? null : self.PriorityID,
                    'InfluenceID': self.InfluenceID == '00000000-0000-0000-0000-000000000000' ? null : self.InfluenceID,
                    'Summary': self.Summary(),
                    'ProblemCauseID': self.ProblemCauseHelper.SelectedItem() == null ? null : self.ProblemCauseHelper.SelectedItem().ID,
                    'ProblemCauseName': self.ProblemCauseHelper.SelectedItem() == null ? null : self.ProblemCauseHelper.SelectedItem().Name,
                    'HTMLDescription': self.Description(),
                    'HTMLCause': self.Cause(),
                    'HTMLSolution': self.Solution(),
                    'HTMLFix': self.Fix(),
                    'OwnerID': self.OwnerID,
                    'Files': self.attachmentsControl == null ? null : self.attachmentsControl.GetData(),
                    'ParameterValueList': self.GetParameterValueList(),
                    'ObjectClassID': self.ObjectClassID,
                    'ObjectID': self.ObjectID,
                    'CallList': self.CallList,
                    'DependencyList': dependencyList
                };
                //    
                if (data.ProblemTypeID == null) {
                    require(['sweetAlert'], function () {
                        swal(getTextResource('PromptType'));
                    });
                    retval.resolve(null);
                    return;
                }
                if (!data.Summary || data.Summary.trim().length == 0) {
                    require(['sweetAlert'], function () {
                        swal(getTextResource('PromptProblemSummary'));
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
                self.IsRegisteringProblem = true;
                showSpinner();
                self.ajaxControl_RegisterProblem.Ajax(null,
                    {
                        url: 'sdApi/registerProblem',
                        method: 'POST',
                        dataType: 'json',
                        data: data
                    },
                    function (response) {//ProblemRegistrationResponse
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
                        self.IsRegisteringProblem = false;
                    },
                    function (response) {
                        hideSpinner();
                        require(['sweetAlert'], function () {
                            swal(getTextResource('ErrorCaption'), getTextResource('AjaxError') + '\n[ProblemRegistration.js, RegisterProblem]', 'error');
                        });
                        retval.resolve(null);
                        self.IsRegisteringProblem = false;
                    });
                //
                return retval.promise();
            };

            self.AddAs = false;//проблема создана по аналогии
            self.problemData = null;//проблема, взятая за основу
            //
            self.CallList = null;//список связанных заявок (при создании проблемы по заявке)
            //
            self.Fill = function (problemData) {
                if (problemData.InfluenceID())
                    self.InfluenceID = problemData.InfluenceID();
                //
                if (problemData.PriorityID())
                    self.PriorityID = problemData.PriorityID();
                if (problemData.PriorityColor())
                    self.PriorityColor(problemData.PriorityColor());
                if (problemData.PriorityName())
                    self.PriorityName(problemData.PriorityName());
                //
                if (problemData.TypeID()) {
                    self.ProblemTypeHelper.LoadList();
                    self.ProblemTypeHelper.SetSelectedItem(problemData.TypeID());
                }
                //
                if (problemData.UrgencyID())
                    self.UrgencyID = problemData.UrgencyID();
                //
                if (problemData.OwnerID())
                    self.OwnerID = problemData.OwnerID();
                //
                if (problemData.Summary())
                    self.Summary(problemData.Summary());
                //
                if (problemData.Description())
                    $.when(self.htmlDescriptionControlD).done(function () { self.Description(problemData.Description()); });
                //
                if (problemData.CallList) {
                    self.CallList = problemData.CallList;
                } else if (problemData.ID()) {
                    self.primaryObjectID = problemData.ID();
                }
                //
                self.problemData = problemData;
            };
        }
    }
    return module;
});
