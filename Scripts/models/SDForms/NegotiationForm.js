define(['knockout', 'jquery', 'ajax', 'usualForms', 'models/SDForms/SDForm.Negotiation', 'models/SDForms/SDForm.NegotiationVote'], function (ko, $, ajaxLib, fhmodel, negLib, voteLib) {
    var module = {
        ViewModel: function (negID, objID, objClassID, canEdit_object, regionID, comment) {
            var self = this;
            self.LoadD = $.Deferred();
            //
            self.$region = $('#' + regionID);
            self.negotiationID = negID;
            self.objID = objID;
            self.objClassID = objClassID;
            self.ForseClose = undefined;//задается в формхелпере
            self.CanEdit = canEdit_object; //observable from list
            self.IsFinanceMode = ko.observable(false);
            self.FinanceModeType = ko.observable(false);
            self.SettingCommentPlacet = ko.observable(false);
            self.SettingCommentNonPlacet = ko.observable(false);
            //
            self.Message = comment;
            // 
            self.Mode = ko.observable(null);
            self.Status = ko.observable(null);
            self.StatusString = ko.computed(function () {
                if (self.Status() != null)
                    return self.Status().Name;
                else return '';
            });
            self.ModeString = ko.computed(function () {
                if (self.Mode() != null)
                    return self.Mode().Name;
                else return '';
            });
            self.NotStarted = ko.computed(function () {
                if (self.Status() != null && self.Status().ID == 0)
                    return true;
                else return false;
            });
            self.NotFinished = ko.computed(function () {
                if (self.Status() != null && (self.Status().ID == 0 || self.Status().ID == 1))
                    return true;
                else return false;
            });
            self.Finished = ko.computed(function () {
                if (self.Status() == null || self.Status().ID == 2 || self.Status().ID == 3)
                    return true;
                else return false;
            });
            self.CanEditDD = ko.computed(function () {
                if (!self.NotStarted() || !self.CanEdit() || self.IsFinanceMode())
                    return false;
                else return true;
            });
            //
            self.CanVote = ko.observable(false);
            self.NotSaved = ko.observable(false);
            self.WasChanged = ko.observable(false);// for update list from formHelper
            self.HaveUnsaved = ko.observable(false);
            self.HaveUnsaved.subscribe(function (newValue) {
                if (newValue)
                    self.WasChanged(true);
            });
            //
            self.Theme = ko.observable('');
            self.UtcDateVoteEnd = ko.observable(null);
            self.UtcDateVoteStart = ko.observable(null);
            //
            self.ModeList = [];
            self.StatusList = [];
            //
            self.getModeList = function (options) {
                var data = self.ModeList;
                options.callback({ data: data, total: data.length });
            };
            //
            self.UserList = ko.observableArray([]);

            self.CompareUser = function (user) {
                var obj = [];
                self.UserList().forEach(function (el) {
                    if (user.UserID == el.UserID)
                        obj = obj.concat(el);
                    if (el.DeputyUserList)
                    el.DeputyUserList.forEach(function (elUser) {
                        if (user.UserID == elUser)
                            if (obj.indexOf(el) == -1)
                                obj = obj.concat(el);
                    })
                })
                return obj;
            };

            self.ParentUserList = ko.observableArray([]);
                self.UserList.subscribe(function () {
                    $.when(userD).done(function (user) {
                        var el = self.CompareUser(user);
                        ko.utils.arrayForEach(el, function (u) {
                        if (u) {
                            if (u.VotingType != null && u.VotingType() === 0 && self.Status().ID == 1 && !self.NotSaved()) {//не голосовал и голосование начато
                                self.CanVote(true);
                                u.CanVote(true);
                            }
                        }
                        });
                    });
                });
            self.UsersIDList = ko.computed(function () {
                var retval = [];
                if (self.UserList() != null)
                    ko.utils.arrayForEach(self.UserList(), function (item) {
                        retval.push(item.UserID);
                    });
                //
                return retval;
            });
            self.VotedCount = ko.computed(function () {
                var voted = 0;
                ko.utils.arrayForEach(self.UserList(), function (el) {
                    if (el && el.UtcDateVote && el.UtcDateVote())
                        voted++;
                });
                return getTextResource('NegotiationVotedCount') + ' ' + voted + ' ' + getTextResource('NegotiationFrom') + ' ' + self.UserList().length;
            });
            self.StateImgClass = ko.computed(function () {
                if (!self.Status())
                    return '';
                //
                if (self.Status().ID == 0)
                    return 'negotiation-status-icon-created';
                else if (self.Status().ID == 1)
                    return 'negotiation-status-icon-voting';
                else if (self.Status().ID == 2)
                    return 'negotiation-status-icon-endyes';
                else if (self.Status().ID == 3)
                    return 'negotiation-status-icon-endno';
            });
            //
            self.addUserControl = null;
            self.LoadAddUserControl = function () {
                if (self.addUserControl == null || self.addUserControl.IsLoaded() == false) {
                    self.addUserControl = new module.AddUserModel(self, self.$region.find('.negotiation-form__users-add'));
                    self.addUserControl.Initialize();
                }
            };
            //
            self.AfterRender = function () {
                $.when(self.Load()).done(function () {
                    self.LoadD.resolve();
                    self.LoadAddUserControl();
                });
            };
            //
            self.CanUserBeRemoved = function (user) {
                if (self.Finished() || !self.CanEdit())
                    return false;
                //
                if (user.VotingType() == 0)//не голосовал
                    return true;
                else return false;
            };
            //
            self.UserRemove = function (user, event) {
                self.UserList.remove(function (elem) {
                    return elem.UserID == user.UserID;
                });
                self.UserList.valueHasMutated();
                self.HaveUnsaved(true);
            };
            self.AddNewUserToList = function (obj) {
                if (obj == null || ko.utils.arrayFirst(self.UserList(), function (item) { return item.UserID == obj.ID; }) != null)
                    return false;
                //
                var tempObj = {
                    NegotiationID: self.negotiationID,
                    UserID: obj.ID,
                    UserFullName: obj.FullName,
                    Details: obj.Details,
                    Message: '',
                    PositionName: obj.PositionName,
                    SubdivisionName: obj.SubdivisionName,
                    ////
                    //Email:obj.Email,
                    ////
                    VotingType: 0, //не голосовал
                    UtcDateVote: null
                };
                var user = new negLib.NegotiationUser(tempObj, self);
                user.CanVote(false);
                //
                self.UserList().push(user);
                self.CanVote(false);
                self.NotSaved(true);
                //
                self.UserList.valueHasMutated();
                self.HaveUnsaved(true);
                return true;
            };
            //
            self.AddUserClick = function () {
                var element = self.$region.find('.negotiation-form__users-add');
                if (element.css('display') == 'none') {
                    element.show();
                    //
                    if (self.addUserControl != null)
                        self.addUserControl.FocusSearcher();
                }
                else
                    element.hide();
                return true;
            };
            self.ajaxControl_load = new ajaxLib.control();
            self.ajaxControl_save = new ajaxLib.control();
            self.Load = function () {
                var retval = $.Deferred();
                $(document).unbind('objectDeleted', self.onObjectModified);
                $(document).unbind('local_objectDeleted', self.onObjectModified);
                //
                $.when(userD).done(function (user) {
                    self.ajaxControl_load.Ajax(self.$region,
                    {
                        dataType: "json",
                        method: 'GET',
                        url: 'sdApi/GetNegotiationModeAndStatus'
                    },
                    function (newVal) {
                        if (newVal && newVal.Result === 0) {
                            if (newVal.ModeList && newVal.StatusList) {
                                self.ModeList = newVal.ModeList;
                                self.StatusList = newVal.StatusList;
                                //
                                self.Status(ko.utils.arrayFirst(self.StatusList, function (item) { return item.ID == 0; }));
                                self.Mode(ko.utils.arrayFirst(self.ModeList, function (item) { return item.ID == 0; }));
                                //
                                $(document).unbind('objectDeleted', self.onObjectModified).bind('objectDeleted', self.onObjectModified);
                                $(document).unbind('local_objectDeleted', self.onObjectModified).bind('local_objectDeleted', self.onObjectModified);
                            }
                            else {
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('AjaxError') + '\n[NegotiationForm.js, Load]', 'error');
                                });
                            }
                        }
                        else if (newVal && newVal.Result === 1)
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[NegotiationForm.js, Load]', 'error');
                            });
                        else
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[NegotiationForm.js, Load]', 'error');
                            });
                        retval.resolve();
                    },
                    null,
                    function () {
                        retval.resolve();
                    });
                });
                //
                return retval.promise();
            };
            self.Save = function () {
                //
                var data = {
                    'ID': self.negotiationID,
                    'ObjectID': self.objID,
                    'ObjectClassID': self.objClassID,
                    'Theme': self.Theme(),
                    'Mode': self.Mode().ID,
                    'UsersID': self.UsersIDList()
                };
                var PostD = $.Deferred();
                self.ajaxControl_save.Ajax(self.$region,
                    {
                        dataType: "json",
                        method: 'POST',
                        data: data,
                        url: 'sdApi/EditOrCreateNegotiation'
                    },
                    function (newval) {
                        if (newval) {
                            var response = newval.Response;
                            if (response.Result === 0) {
                                //
                                self.HaveUnsaved(false);
                                self.NotSaved(false);
                                self.negotiationID = newval.ID;
                                PostD.resolve(true);
                                //
                                return;
                            }
                            else if (response.Result === 1)
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('SaveError'), getTextResource('NullParamsError'), 'error');
                                });
                            else if (response.Result === 2)
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('SaveError'), getTextResource('BadParamsError'), 'error');
                                });
                            else if (response.Result === 3)
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('SaveError'), getTextResource('AccessError'), 'error');
                                });
                            else if (response.Result === 5)
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('SaveError'), response.Message ? response.Message : getTextResource('ConcurrencyErrorWithoutQuestion'), 'error');
                                });
                            else if (response.Result === 6)
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('SaveError'), getTextResource('ObjectDeleted') + '\n' + getTextResource('WeNeedCloseForm'), 'error');
                                    //
                                    if (self.ForseClose != undefined) {
                                        self.ForseClose();
                                        $(document).trigger('local_objectDeleted', [160, self.negotiationID, self.objID]);
                                    }
                                });
                            else if (response.Result === 8)
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('SaveError'), response.Message ? response.Message : getTextResource('ValidationError'), 'error');
                                });
                            else
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('SaveError'), getTextResource('GlobalError') + '\n[NegotiationForm.js, Save]', 'error');
                                });
                        }
                        PostD.resolve(false);
                    });
                return PostD.promise();
            };
            self.IsValid = function () {
                var retval = true;
                var errorMessage = '';
                //
                if (self.UserList().length == 0) {
                    retval = false;
                    errorMessage += '\n' + getTextResource('NegotiationNoUsersWarning');;
                }
                //
                if (self.Theme() == null || self.Theme() == '') {
                    retval = false;
                    errorMessage += '\n' + getTextResource('NegotiationNoThemeWarning');;
                }
                //
                if (!retval)
                    require(['sweetAlert'], function () {
                        swal(getTextResource('NegotiationCaptionWarning'), errorMessage, 'warning');
                    });
                //
                return retval;
            };
            self.ApplyValues = function (options) {
                if (options.Theme)
                    self.Theme(options.Theme);
                self.Theme.subscribe(function () {
                    self.HaveUnsaved(true);
                });
                //
                if (options.IsFinanceMode === true)
                    self.IsFinanceMode(true);
                if (options.FinanceModeType !== null)
                    self.FinanceModeType(options.FinanceModeType);
                //
                if (options.Mode || self.IsFinanceMode())
                    self.Mode(ko.utils.arrayFirst(self.ModeList, function (item)
                    {
                        if (self.IsFinanceMode())
                            return item.ID == 3;
                        else return item.ID == options.Mode;
                    }));
                self.Mode.subscribe(function () {
                    self.HaveUnsaved(true);
                });
                //
                if (options.Status)
                    self.Status(ko.utils.arrayFirst(self.StatusList, function (item) { return item.ID == options.Status; }));
                //
                if (options.UtcDateVoteEnd)
                    self.UtcDateVoteEnd(options.UtcDateVoteEnd);
                //
                if (options.UtcDateVoteStart)
                    self.UtcDateVoteStart(options.UtcDateVoteStart);
                //
                if (options.UsersList) {
                    self.UserList(options.UsersList());
                    self.ParentUserList = options.UsersList;
                    //
                    self.ParentUserList.subscribe(function () {
                        self.UserList(options.UsersList());
                    });
                    //
                    self.UserList.valueHasMutated();
                }
                if (options.SettingCommentPlacet==true) {
                    self.SettingCommentPlacet(options.SettingCommentPlacet)
                }
                if (options.SettingCommentNonPlacet == true) {
                    self.SettingCommentNonPlacet(options.SettingCommentNonPlacet)
                }
            };
            //
        
            self.VoteFor = function (user, event) {
                if (!self.CanVote() || !user.CanVote())
                    return;
                //
                self.VoteClick(voteLib.VoteMode.For,user);
            };
            self.VoteAgainst = function (user, event) {
                if (!self.CanVote() || !user.CanVote())
                    return;
                //
                self.VoteClick(voteLib.VoteMode.Against,user);
            };
            self.VoteEdit = function (user, event) {
                if (!self.CanVote() || !user.CanVote())
                    return;
                //
                require(['financeForms'], function (module) {
                    var fh = new module.formHelper();
                    fh.ShowFinanceNegotiation(self.negotiationID, self.FinanceModeType(), self.objID, self.objClassID, function (obj) {
                    });
                });
            };
            //
            self.VoteClick = function (mode, user) {
                var retvalD = $.Deferred();
                var swalD = $.Deferred();
                //
                if (self.HaveUnsaved()) {
                    require(['sweetAlert'], function () {
                        swal(
                            {
                                title: getTextResource('NegotiationChangedHeader'),
                                text: getTextResource('NegotiationChangedText'),
                                type: "warning",
                                showCancelButton: true,
                                confirmButtonText: getTextResource('ButtonOK'),
                                cancelButtonText: getTextResource('CancelButtonText'),
                                closeOnConfirm: false,
                                closeOnCancel: false
                            },
                            function (isConfirm) {
                                if (isConfirm) {
                                    if (self.IsValid()) {
                                        showSpinner();
                                        //
                                        $.when(self.Save()).done(function () {
                                            hideSpinner();
                                            swal.close();
                                            swalD.resolve(true);
                                        });
                                    }
                                    else {
                                        swalD.resolve(false);
                                    }
                                }
                                else {
                                    swal.close();
                                    swalD.resolve(false);
                                }
                            });
                    });
                }
                else swalD.resolve(true);
                //
                if ((self.SettingCommentPlacet() == true && mode == voteLib.VoteMode.For) || (self.SettingCommentNonPlacet() == true && mode == voteLib.VoteMode.Against)) {

                    $.when(swalD).done(function (result) {
                        if (result) {
                            var fh = new fhmodel.formHelper();
                            fh.ShowNegotiationVote(self.negotiationID, self.IsFinanceMode(), self.objID, self.objClassID, mode,
                                function (obj) {
                                    $.when(userD).done(function (user) {
                                        if (user.UserID !== null) {
                                            var u = ko.utils.arrayFirst(self.UserList(), function (el) {
                                                return el.UserID === user.UserID;
                                            });
                                            if (u != null) {
                                                self.CanVote(false);
                                                u.CanVote(false);
                                                u.Message(obj.Message);
                                                u.VotingType(obj.Vote);
                                                u.UtcDateVote(obj.UtcDateTimeVote);
                                            }
                                        }
                                    });
                                    retvalD.resolve();
                                },
                                function () {
                                    if (self.ForseClose != undefined)
                                        self.ForseClose();
                                },
                                self.SettingCommentPlacet(),
                                self.SettingCommentNonPlacet(),
                                self.Theme(),
                                user);
                        }
                    });
                }
                else {
                    require(['models/SDForms/SDForm.NegotiationVote'], function (vm) {
                        mod = new vm.ViewModel(self.negotiationID, self.IsFinanceMode(), self.objID, self.objClassID, mode, null,
                            user);
                        $.when(mod.PostVote()).done(function (obj) {
                            $.when(userD).done(function (user) {
                                if (user.UserID !== null) {
                                    var u = ko.utils.arrayFirst(self.UserList(), function (el) {
                                        return el.UserID === user.UserID;
                                    });
                                    if (u != null) {
                                        self.CanVote(false);
                                        u.CanVote(false);
                                        u.VotingType(obj.Vote);
                                        u.UtcDateVote(obj.UtcDateTimeVote);
                                    }
                                }
                            });
                        });
                        retvalD.resolve();
                    });
                }
                    return retvalD;
            };

            self.ajaxControl_start = new ajaxLib.control();
            self.StartNegotiation = function (negArray) {
                if (!self.NotStarted() )
                    return;
                //
                var swalD = $.Deferred();
                //
                if (self.HaveUnsaved()) {
                    require(['sweetAlert'], function () {
                        swal(
                            {
                                title: getTextResource('NegotiationChangedHeader'),
                                text: getTextResource('NegotiationChangedText'),
                                type: "warning",
                                showCancelButton: true,
                                confirmButtonText: getTextResource('ButtonOK'),
                                cancelButtonText: getTextResource('CancelButtonText'),
                                closeOnConfirm: false,
                                closeOnCancel: false
                            },
                            function (isConfirm) {
                                if (isConfirm) {
                                    if (self.IsValid()) {
                                        showSpinner();
                                        $.when(self.Save()).done(function (result) {
                                            if (result)
                                                swal.close();
                                            //
                                            hideSpinner();
                                            swalD.resolve(result);
                                        });
                                    }
                                    else {
                                        swalD.resolve(false);
                                    }
                                }
                                else {
                                    swal.close();
                                    swalD.resolve(false);
                                }
                            });
                    });
                }
                else swalD.resolve(true);
                //
                var PostD = $.Deferred();
                $.when(swalD, userD).done(function (result, user) {
                    if (result) {
                        self.WasChanged(true);
                        //
                        var postArray = [];
                        postArray.push({
                            ID: self.negotiationID,
                            ObjectID: self.objID,
                            ObjectClassID: self.objClassID,
                            Operation: 3//Start
                        });
                        //
                        var data = {
                            List: postArray
                        };
                        self.ajaxControl_start.Ajax(self.$region,
                            {
                                dataType: "json",
                                method: 'POST',
                                data: data,
                                url: 'sdApi/NegotiationOperation'
                            },
                            function (Result) {
                                if (Result === 0) {
                                    self.Status(ko.utils.arrayFirst(self.StatusList, function (item) { return item.ID == 1; })); //НАЧАТО
                                    $(document).trigger('local_objectUpdated', [160, self.negotiationID, self.objID]);
                                    //
                                    PostD.resolve();
                                } else if (Result === 1)
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[SDForm.NegotiationForm.js, StartNegotiation]', 'error');
                                        PostD.resolve();
                                    });
                                else if (Result === 2)
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('BadParamsError') + '\n[SDForm.NegotiationForm.js, StartNegotiation]', 'error');
                                        PostD.resolve();
                                    });
                                else if (Result === 3)
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('AccessError'), 'error');
                                        PostD.resolve();
                                    });
                                else if (Result === 5)
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('ConcurrencyErrorWithoutQuestion'), 'error');
                                        PostD.resolve();
                                    });
                                else if (Result === 6)
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('ObjectDeleted') + '\n' + getTextResource('WeNeedCloseForm'), 'error');
                                        if (self.ForseClose != undefined) {
                                            self.ForseClose();
                                            $(document).trigger('local_objectDeleted', [160, self.negotiationID, self.objID]);
                                        }
                                        //
                                        PostD.resolve();
                                    });
                                else if (Result === 8)
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('ValidationError'), 'error');
                                        PostD.resolve();
                                    });
                                else
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('GlobalError'), 'error');
                                        PostD.resolve();
                                    });
                            });
                    }
                });
                return PostD.promise();
            };
            //
            self.Unload = function () {
                $(document).unbind('objectDeleted', self.onObjectModified);
                $(document).unbind('local_objectDeleted', self.onObjectModified);
            };
            self.onObjectModified = function (e, objectClassID, objectID, parentObjectID) {
                if (objectClassID == 160) {
                    if (self.negotiationID && objectID == self.negotiationID && parentObjectID == self.objID) {
                        if (e.type == 'objectDeleted' || e.type == 'local_objectDeleted') {
                            if (e.type == 'objectDeleted') {
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ObjectDeleted'), getTextResource('WeNeedCloseForm'), 'info');
                                });
                            }
                            //
                            if (self.ForseClose != undefined)
                                self.ForseClose();
                        }
                    }
                }
            };
        },
        AddUserModel: function (parentSelf, $regionAddUser) {
            var vself = this;
            var self = parentSelf;
            vself.options = {
                searcherName: 'NegotiationUserSearcher',
                searcherParams: null, 
                oldValue: null,
                searcherPlaceholder: getTextResource('NegotiationPlaceholder')
            };
            //
            var fh = new fhmodel.formHelper();
            vself.LoadD = $.Deferred();
            vself.divID = 'negotiationAddUserControl_' + ko.getNewID();//main control div.ID
            vself.$regionAU = $regionAddUser;
            vself.IsLoaded = ko.observable(false);
            //
            vself.Initialize = function () {                
                    vself.$regionAU.append('<div id="' + vself.divID + '" data-bind="template: {name: \'Negotiation/NegotiationAddUser\', afterRender: AfterRender}" ></div>');
                    //
                    try {
                        ko.applyBindings(vself, document.getElementById(vself.divID));
                    }
                    catch (err) {
                        if (document.getElementById(vself.divID))
                            throw err;
                    }
            };
            vself.AfterRender = function () {
                vself.LoadD.resolve();
                vself.CreateSearcherEditor();
                //
                self.$region.find('.negotiation-form-textinput').focus();
            };
            //
            vself.FocusSearcher = function () {
                $.when(vself.LoadD, vself.objectSearcherControlD).done(function () {
                    var textbox = vself.$regionAU.find('.searcherInput');
                    if (textbox.length > 0) {
                        textbox.click();
                        textbox.focus();
                    }
                });
            };
            vself.selectedObjectInfo = null;
            vself.selectedObjectFullName = ko.observable(null);
            vself.emptyPlaceholder = ko.observable(vself.options.searcherPlaceholder);
            vself.objectSearcherControl = null;
            vself.objectSearcherControlD = $.Deferred();
            vself.ajaxControl_loadUserInfo = new ajaxLib.control();
            vself.CreateSearcherEditor = function () {
                require(['objectSearcher'], function (rtbLib) {
                        var loadD = fh.SetTextSearcherToField(
                            vself.$regionAU.find('.searcherInput'),
                            vself.options.searcherName,
                            null,
                            vself.options.searcherParams,
                            function (objectInfo) {//select
                                vself.selectedObjectFullName(objectInfo.FullName);
                                vself.selectedObjectInfo = objectInfo;
                                if (self.AddNewUserToList(objectInfo)) {
                                    self.AddUserClick();
                                    vself.selectedObjectFullName('');
                                    vself.selectedObjectInfo = null;
                                }
                            },
                            function () {//reset
                                vself.selectedObjectFullName('');
                                vself.selectedObjectInfo = null;
                            },
                            function (selectedItem) {//close
                                if (!selectedItem) {
                                    vself.selectedObjectFullName('');
                                    vself.selectedObjectInfo = null;
                                }
                            });
                        $.when(loadD).done(function (vm) {
                            vself.objectSearcherControl = vm;
                            //
                            var old = vself.options.oldValue;
                            if (old != null) {
                                vself.selectedObjectFullName(old.FullName);
                                vm.SetSelectedItem(old.ID, old.ClassID, old.FullName, '');
                                vself.selectedObjectInfo = old;
                            }
                            //
                            $.when(vm.LoadD).done(function () {
                                vself.objectSearcherControlD.resolve();
                            });
                        });
                    
                });
                return vself.objectSearcherControlD.promise();
            };
        },
        NegotiationUser: function (parentSelf, obj) {
            var uself = this;
            var self = parentSelf;
            //
            uself.NegotiationID = obj.NegotiationID;
            uself.UserID = obj.UserID;
            uself.UserFullName = obj.UserFullName;
            uself.UserDopInfo = obj.UserDopInfo;
            uself.VotingTypeString = obj.VotingTypeString;
            uself.Message = ko.observable(obj.Message);
            // 
            //
            uself.VotingType = ko.observable(obj.VotingType);
            uself.CanVote = ko.observable(false);
            //
            uself.IconFor = ko.computed(function () {
                var retval = '';
                //
                if (uself.VotingType() == 1)//ЗА
                    retval = 'negotiation-user-icon_for';
                else retval = 'negotiation-user-icon_for-gray';
                //
                if (uself.CanVote())
                    retval += ' cursor-pointer';
                //
                return retval;
            });
            uself.IconAgainst = ko.computed(function () {
                var retval = '';
                //
                if (uself.VotingType() == 2)//ПРОТИВ
                    retval = 'negotiation-user-icon_against';
                else retval = 'negotiation-user-icon_against-gray';
                //
                if (uself.CanVote())
                    retval += ' cursor-pointer';
                //
                return retval;
            });
            uself.IconEdit = ko.computed(function () {
                var retval = '';
                //
                if (uself.VotingType() == 2)//ПРОТИВ
                    retval = 'negotiation-user-icon_edit';
                else retval = 'negotiation-user-icon_edit-gray';
                //
                if (uself.CanVote())
                    retval += ' cursor-pointer';
                //
                return retval;
            });
            //
            uself.IsEditIconVisible = ko.computed(function () {
                if (self.IsFinanceMode() && uself.CanVote())
                    return true;
                //
                return false;
            });
            //
            uself.UtcDateVote = ko.observable(obj.UtcDateVote);
            if (uself.UtcDateVote() == null || uself.UtcDateVote() == '')
                uself.UtcDateVote(getTextResource('NegotiationNotVote'));
            //
            uself.CanBeRemoved = ko.computed(function () {
                if (self.Finished())
                    return false;
                //
                if (uself.VotingType() == 0)//не голосовал
                    return true;
                else return false;
            });
            //
            uself.Remove = function () {
                self.UserList.remove(function (elem) {
                    return elem.UserID == uself.UserID;
                });
                self.UserList.valueHasMutated();
            };
            //
            uself.TextEdit = ko.computed(function () {
                if (self.IsFinanceMode())
                    return getTextResource('FinanceVotingType_Edit');
                else return '';
            });
            uself.TextAgainst = ko.computed(function () {
                if (self.IsFinanceMode())
                    return getTextResource('FinanceVotingType_Against');
                else return getTextResource('VotingType_Against');
            });
            uself.TextFor = ko.computed(function () {
                if (self.IsFinanceMode())
                    return getTextResource('FinanceVotingType_For');
                else return getTextResource('VotingType_For');
            });
        }
    };
    return module;
});