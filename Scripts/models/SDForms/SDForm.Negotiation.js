define(['knockout', 'jquery', 'ttControl', 'models/SDForms/SDForm.NegotiationVote', 'ajax'], function (ko, $, tclib, voteLib, ajaxLib, imLib) {
    var module = {
        Negotiation: function (imList, obj, isFinanceModeObservable, financeModeTypeObservable, canEdit_object, readOnly_object) {
            var self = this;
            self.IsFinanceMode = isFinanceModeObservable;
            self.FinanceModeType = financeModeTypeObservable;
            self.CanEdit = canEdit_object;
            self.ReadOnly = readOnly_object;
            //
            self.ID = obj.ID;
            self.ObjectID = obj.ObjectID;
            self.ObjectClassID = obj.ObjectClassID;
            self.Theme = ko.observable(obj.Theme);//subject
            self.CanVote = ko.observable(false);
            self.ajaxControl = new ajaxLib.control();
            //
            self.ModeString = ko.observable(obj.ModeString);
            self.StatusString = ko.observable(obj.StatusString);
            self.Mode = ko.observable(obj.Mode);
            self.Status = ko.observable(obj.Status);
            //
            self.UtcDateVoteEnd = ko.observable(parseDate(obj.UtcDateVoteEnd));
            self.UtcDateVoteStart = ko.observable(parseDate(obj.UtcDateVoteStart));
            //
            self.SettingCommentPlacet = ko.observable(obj.SettingCommentPlacet == true ? true : false);
            self.SettingCommentNonPlacet = ko.observable(obj.SettingCommentNonPlacet == true ? true : false);
            //
            //
            self.showContextMenu = function (obj, e) {
                var contextMenuViewModel = self.contextMenu();
                e.preventDefault();
                contextMenuViewModel.show(e);
                return true;
            };

            {//ko.contextMenu
                {//granted operationsgranted operations
                    self.grantedOperations = [];
                    //
                    self.operationIsGranted = function (operationID) {
                        for (var i = 0; i < self.grantedOperations.length; i++)
                            if (self.grantedOperations[i] === operationID)
                                return true;
                        return false;
                    };
                    //
                    self.ClientMode = ko.observable(false); 
                    $.when(userD).done(function (user) {
                        self.grantedOperations = user.GrantedOperations;
                        if (user.HasRoles == false)
                            self.ClientMode(true);
                    });
                }
            }
          
            //

            self.contextMenu = ko.observable(null);

            self.contextMenuInit = function (contextMenu) {
                self.contextMenu(contextMenu);//bind contextMenu

                self.startMenuItem(contextMenu, "NegotiationToBegin");
                //Начать
                self.editMenuItem(contextMenu, "NegotiationEdit");
                //Изменить
                self.deleteMenuItem(contextMenu, "NegotiationRemove");
                //Удалить 
                contextMenu.addSeparator();
                //
                self.showHistoryMenuItem(contextMenu, "NegotiationShowHistory");
                //Показать историю

            };
            //
            self.StyleStatusString = ko.computed(function () {
                var retval = '';

                if (self.Status() == 0) {
                    retval = 'negotiation-status-text-nonstart';
                }

                else 
                    retval = 'negotiation-status-text-status';
                //
                //
                return retval;
            });
            ////
            self.contextMenuOpening = function (contextMenu) {
                contextMenu.items().forEach(function (item) {
                    if (item.isEnable && item.isVisible) {
                        item.enabled(item.isEnable());
                        item.visible(item.isVisible());
                    }
                });
            };
            //
            self.startMenuItem = function (contextMenu, restext) {
                var isEnable = function () {
                    if (self.Status() == 0)
                        return true;
                    return false;
                };
                var isVisible = function () {
                    return true;
                };
                var action = function () {
                    //
                    self.ClickStartButton();
                    //
                };
                var cmd = contextMenu.addContextMenuItem();
                cmd.restext(restext);
                cmd.isEnable = isEnable;
                cmd.isVisible = isVisible;
                cmd.click(action);
            };
            //
            self.editMenuItem = function (contextMenu, restext) {
                var isEnable = function () {
                    if (!self.CanEdit() || self.ReadOnly())
                        return false;
                    if (self.Status() == 0)
                        return true;
                    return false;
                };
                var isVisible = function () {
                    if (self.ClientMode())
                        return false;                    
                    return true;
                };
                var action = function () {                  
                    self.ShowObjectForm();
                 
                };
                var cmd = contextMenu.addContextMenuItem();
                cmd.restext(restext);
                cmd.isEnable = isEnable;
                cmd.isVisible = isVisible;
                cmd.click(action);
            };
            //
            self.deleteMenuItem = function (contextMenu, restext) {
                var isEnable = function () {
                    if (!self.CanEdit() || self.ReadOnly())
                        return false;
                        return true;
                };
                var isVisible = function () {
                    if (self.ClientMode())
                        return false;  
                    return true;
                };
                var action = function () {
                    //
                    self.ClickRemoveButton();
                    //
                };
                var cmd = contextMenu.addContextMenuItem();
                cmd.restext(restext);
                cmd.isEnable = isEnable;
                cmd.isVisible = isVisible;
                cmd.click(action);
            };
            self.showHistoryMenuItem = function (contextMenu, restext) {
                var isEnable = function () {
                    return true;
                };
                var isVisible = function () {
                    if (self.ClientMode())
                        return false;  
                    return true;
                };
                var action = function () {
                    //
                    self.ShowObjectFormHistory();
                    //
                };
                var cmd = contextMenu.addContextMenuItem();
                cmd.restext(restext);
                cmd.isEnable = isEnable;
                cmd.isVisible = isVisible;
                cmd.click(action);
            };
            //
            self.UserList = ko.observableArray([]);
            self.VotedCount = ko.computed(function () {
                var voted = 0;
                ko.utils.arrayForEach(self.UserList(), function (el) {
                    if (el && el.UtcDateVote && el.UtcDateVote())
                        voted++;
                });
                return  voted + ' ' + getTextResource('NegotiationFrom') + ' ' + self.UserList().length;
            });
            //
            self.CompareUser = function (user) {
                var obj = [];
                self.UserList().forEach(function (el) {
                    if (user.UserID == el.UserID)
                        obj = obj.concat(el);
                    el.DeputyUserList.forEach(function (elUser) {
                        if (user.UserID == elUser)
                            if (obj.indexOf(el) == -1)
                            obj = obj.concat(el);
                    })
                })
                return obj;
            };
            //
            if (obj.UserList != null) {
                ko.utils.arrayForEach(obj.UserList, function (el) {
                    self.UserList().push(new module.NegotiationUser(el, self));
                });
                //
                self.UserList.valueHasMutated();
                $.when(userD).done(function (user) {
                    var el = self.CompareUser(user);
                    ko.utils.arrayForEach(el, function (u) {
                    if (u) {
                        u.CanMessage(true);
                        if (u.VotingType != null && u.VotingType() === 0 && self.Status() === 1) { //не голосовал и голосование начато
                            self.CanVote(true);
                            u.CanVote(true);
                        }
                        }
                    });
                });
            }
            //
            if (self.IsFinanceMode()) {
                self.ModeString(getTextResource('NegotiationMode_FirstVoteAny'));
                self.Mode(3);
            }
            //
            self.Selected = ko.observable(false);
            self.Selected.subscribe(function (newValue) {
                if (newValue)
                    imList.ItemChecked(self);
                else
                    imList.ItemUnchecked(self);
            });
            //
            self.ExpandCollapseClick = function () {
                self.IsExpanded(!self.IsExpanded());
            };
            self.IsExpanded = ko.observable(false);
            self.VisibleStartButton = ko.computed(function () {
                if (self.Status() == 0)
                    return true;
                return false;
            });
            self.ClickStartButton = function (negArray) {
                var PostD = $.Deferred();
                $.when(userD).done(function (user) {
                    require(['sweetAlert'], function () {
                        var nameList = self.Theme();
                        //
                        swal({
                            title: getTextResource('NegotiationOperationCaption'),
                            text: getTextResource('NegotiationStartQuestion') + ' ' + nameList,
                            showCancelButton: true,
                            closeOnConfirm: false,
                            closeOnCancel: true,
                            confirmButtonText: getTextResource('ButtonOK'),
                            cancelButtonText: getTextResource('ButtonCancel')
                        },
                            function (value) {
                                swal.close();
                                //
                                if (value == true) {
                                    showSpinner();
                                    //
                                    var postArray = [];
                                    postArray.push({
                                        ID: self.ID,
                                        ObjectID: self.ObjectID,
                                        ObjectClassID: self.ObjectClassID,
                                        Operation: 3//Start
                                    });
                                    //
                                    var data = {
                                        List: postArray
                                    };
                                    self.ajaxControl.Ajax(null,
                                        {
                                            dataType: "json",
                                            method: 'POST',
                                            data: data,
                                            url: 'sdApi/NegotiationOperation'
                                        },
                                        function (Result) {
                                            if (Result === 0) {
                                                PostD.resolve();
                                                //
                                                for (var i = 0; i < postArray.length; i++)
                                                    $(document).trigger('local_objectUpdated', [160, postArray[i].ID, self.ObjectID]);//OBJ_NEGOTIATION для обновления в списке
                                                //
                                            } else if (Result === 1)
                                                require(['sweetAlert'], function () {
                                                    swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[SDForm.NegotiationList.js, NegotiationStart]', 'error');
                                                    PostD.resolve();
                                                });
                                            else if (Result === 2)
                                                require(['sweetAlert'], function () {
                                                    swal(getTextResource('ErrorCaption'), getTextResource('BadParamsError') + '\n[SDForm.NegotiationList.js, NegotiationStart]', 'error');
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
                                                    swal(getTextResource('ErrorCaption'), getTextResource('ObjectDeleted'), 'error');
                                                    $.when(self.imList.ReloadAll()).done(function () {
                                                        PostD.resolve();
                                                    });
                                                });
                                            else if (Result === 8)
                                                require(['sweetAlert'], function () {
                                                    swal(getTextResource('ErrorCaption'), getTextResource('ValidationError'), 'error');
                                                    PostD.resolve();
                                                });
                                            else
                                                require(['sweetAlert'], function () {
                                                    swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[SDForm.NegotiationList.js, NegotiationStart]', 'error');
                                                    PostD.resolve();
                                                });
                                        },
                                        null,
                                        function () {
                                            hideSpinner();
                                        });
                                }
                                else PostD.resolve();
                            });
                    });
                });
                return PostD.promise();
            };
            //
            self.ClickRemoveButton = function (negArray) {
                var PostD = $.Deferred();
                $.when(userD).done(function (user) {
                    require(['sweetAlert'], function () {
                        var nameList = self.Theme();
                        
                        //
                        swal({
                            title: getTextResource('NegotiationOperationCaption'),
                            text: getTextResource('NegotiationDeleteQuestion') + ' ' + nameList,
                            showCancelButton: true,
                            closeOnConfirm: false,
                            closeOnCancel: true,
                            confirmButtonText: getTextResource('ButtonOK'),
                            cancelButtonText: getTextResource('ButtonCancel')
                        },
                            function (value) {
                                swal.close();
                                //
                                if (value == true) {
                                    showSpinner();
                                    //
                                      var postArray = [];
                                    postArray.push({
                                        ID: self.ID,
                                        ObjectID: self.ObjectID,
                                        ObjectClassID: self.ObjectClassID,
                                        Operation: 2//Remove
                                    });
                                    //
                                    var data = {
                                        List: postArray
                                    };
                                    self.ajaxControl.Ajax(null,
                                        {
                                            dataType: "json",
                                            method: 'POST',
                                            data: data,
                                            url: 'sdApi/NegotiationOperation'
                                        },
                                        function (Result) {
                                            if (Result === 0) {
                                                for (var i = 0; i < postArray.length; i++) {
                                                    $(document).trigger('local_objectDeleted', [160, postArray[i].ID, self.ObjectID]);//OBJ_NEGOTIATION для обновления в списке
                                                }
                                                PostD.resolve();
                                            } else if (Result === 1)
                                                require(['sweetAlert'], function () {
                                                    swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[SDForm.NegotiationList.js, NegotiationRemove]', 'error');
                                                    PostD.resolve();
                                                });
                                            else if (Result === 2)
                                                require(['sweetAlert'], function () {
                                                    swal(getTextResource('ErrorCaption'), getTextResource('BadParamsError') + '\n[SDForm.NegotiationList.js, NegotiationRemove]', 'error');
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
                                                    swal(getTextResource('ErrorCaption'), getTextResource('ObjectDeleted'), 'error');
                                                    $.when(self.imList.ReloadAll()).done(function () {
                                                        PostD.resolve();
                                                    });
                                                });
                                            else if (Result === 8)
                                                require(['sweetAlert'], function () {
                                                    swal(getTextResource('ErrorCaption'), getTextResource('ValidationError'), 'error');
                                                    PostD.resolve();
                                                });
                                            else
                                                require(['sweetAlert'], function () {
                                                    swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[SDForm.NegotiationList.js, NegotiationRemove]', 'error');
                                                    PostD.resolve();
                                                });
                                        },
                                        null,
                                        function () {
                                            hideSpinner();
                                        });
                                }
                                else PostD.resolve();
                            });
                    });
                });
                return PostD.promise();
            };
            //
            self.ShowObjectForm = function (obj) {//отображает форму элемента списка               
                showSpinner();
                require(['usualForms'], function (module) {
                    var options = {
                        ID: self.ID,
                        Theme: self.Theme(),
                        Mode: self.Mode(),
                        Status: self.Status(),
                        UtcDateVoteEnd: self.UtcDateVoteEnd(),
                        UtcDateVoteStart: self.UtcDateVoteStart(),
                        UsersList: self.UserList,
                        IsFinanceMode: self.IsFinanceMode(),
                        FinanceModeType: self.FinanceModeType(),
                        SettingCommentPlacet: self.SettingCommentPlacet(),
                        SettingCommentNonPlacet: self.SettingCommentNonPlacet()
                    };
                    //
                    var fh = new module.formHelper(true);
                    fh.ShowNegotiation(self.ID, self.ObjectID, self.ObjectClassID, self.CanEdit, function (negotiationID) {
                        $(document).trigger('local_objectUpdated', [160, self.ID, self.ObjectID]);//OBJ_NEGOTIATION
                    }, options);
                });
            };
            //
            //История 
            self.ShowObjectFormHistory = function () {           
                showSpinner();
                require(['usualForms'], function (module) {             
                    var fh = new module.formHelper(true);
                    fh.ShowNegotiationHistory(self.ID, 160, self.Theme()); 
                       
                });
            };
          
            //
            {//Expand details if negotiation is not ended and contains current user
                $.when(userD).done(function (user) {
                    if (user.UserID && self.Status() === 0 || self.Status() === 1) {
                        var exist = ko.utils.arrayFirst(self.UserList(), function (el) {
                            return el.UserID.toUpperCase() == user.UserID.toUpperCase();
                        });
                        if (exist)
                            self.IsExpanded(true);
                    }
                });
            }

            self.ExpandButtonText = ko.computed(function () {
                if (self.IsExpanded())
                    return getTextResource('HideDetails');
                else return getTextResource('ShowDetails');
            });
            //
            self.ExpandButtomArrow = ko.computed(function () {
                if (self.IsExpanded())
                    return 'negotiation-arrow-nonactive-icon';
                else return 'negotiation-arrow-active-icon';
            });
            //
            self.StateImgClass = ko.computed(function () {
                if (self.Status() == 0)
                    return 'negotiation-status-icon-created cursor-pointer';
                else if (self.Status() == 1)
                    return 'negotiation-status-icon-voting';
                else if (self.Status() == 2)
                    return 'negotiation-status-icon-endyes';
                else if (self.Status() == 3)
                    return 'negotiation-status-icon-endno';
            });
            //
            self.VoteFor = function (user, event) {
                if (!self.CanVote() || !user.CanVote())
                    return;
                //
                self.VoteClick(voteLib.VoteMode.For, user);
            };
            self.VoteAgainst = function (user, event) {
                if (!self.CanVote() || !user.CanVote())
                    return;
                //
                self.VoteClick(voteLib.VoteMode.Against, user);
            };
            //
            self.VoteEdit = function (user, event) {
                if (!self.CanVote() || !user.CanVote())
                    return;
                //
                require(['financeForms'], function (module) {
                    var fh = new module.formHelper();
                    fh.ShowFinanceNegotiation(self.ID, self.FinanceModeType(), self.ObjectID, self.ObjectClassID, function (obj) {

                    },
                    self.SettingCommentPlacet(),
                    self.SettingCommentNonPlacet(),
                    user.Message
                    );
                });
            };
            //
            self.VoteClick = function (mode, user) {
                var retvalD = $.Deferred();
                //
                if ((self.SettingCommentPlacet() == true && mode == voteLib.VoteMode.For) || (self.SettingCommentNonPlacet() == true && mode == voteLib.VoteMode.Against)) {
                    require(['usualForms'], function (module) {
                        var fh = new module.formHelper();
                        fh.ShowNegotiationVote(
                            self.ID, self.IsFinanceMode(),
                            self.ObjectID, self.ObjectClassID, mode,
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
                            false,
                            self.SettingCommentPlacet(),
                            self.SettingCommentNonPlacet(),
                            self.Theme(),
                            user
                        );
                    });
                }
                else {
                    require(['models/SDForms/SDForm.NegotiationVote'], function (vm) {
                        mod = new vm.ViewModel(self.ID, self.IsFinanceMode(), self.ObjectID, self.ObjectClassID, mode, null,
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
                //
                return retvalD;
            };
            //
            self.Merge = function (obj) {
                self.Theme(obj.Theme);
                self.CanVote = ko.observable(false);
                //
                self.ModeString(obj.ModeString);
                self.StatusString(obj.StatusString);
                self.Mode(obj.Mode);
                self.Status(obj.Status);            
                //
                self.UtcDateVoteEnd(parseDate(obj.UtcDateVoteEnd));
                self.UtcDateVoteStart(parseDate(obj.UtcDateVoteStart));
                //
                self.UserList([]);
                if (obj.UserList != null) {
                    ko.utils.arrayForEach(obj.UserList, function (el) {
                        self.UserList().push(new module.NegotiationUser(el, self));
                    });
                    //
                    self.UserList.valueHasMutated();
                    $.when(userD).done(function (user) {
                        var el = self.CompareUser(user);
                        ko.utils.arrayForEach(el, function (u) {
                        if (u) {
                            u.CanMessage(true);
                            if (u.VotingType != null && u.VotingType() === 0 && self.Status() === 1) { //не голосовал и голосование начато
                                self.CanVote(true);
                                u.CanVote(true);
                            }
                            }
                        });
                    });
                }                
                //
                if (self.IsFinanceMode()) {
                    self.ModeString(getTextResource('NegotiationMode_FirstVoteAny'));
                    self.Mode(3);
                }
            };
        },
        NegotiationUser: function (obj, parent) {
            var uself = this;
            var self = parent;
            //
            uself.NegotiationID = obj.NegotiationID;
            uself.UserID = obj.UserID;
            uself.FullName = obj.UserFullName;
            uself.VotingTypeString = obj.VotingTypeString;
            uself.Details = obj.Details;
            uself.DeputyUserList = obj.DeputyUserList;
            if (!obj.Message)
                obj.Message = '';
            uself.Message = ko.observable(obj.Message);
            if (parent.Status() == 0)
                uself.VotingTypeString = ko.observable(parent.StatusString());
            else if ((parent.Status() == 2 || parent.Status() == 3) && !parent.Mode() == 0 && obj.VotingType == 0)
                uself.VotingTypeString = ko.observable(getTextResource('NegotiationStatus_DidNotVote'));
            else 
                uself.VotingTypeString = ko.observable(obj.VotingTypeString);
            uself.PositionName = obj.PositionName;
            uself.SubdivisionName = obj.SubdivisionName;
            uself.Email = obj.Email;
            //
            uself.VotingType = ko.observable(obj.VotingType);
            //
            uself.UtcDateVote = ko.observable(parseDate(obj.UtcDateVote));
            //
            uself.OldUserName = obj.OldUserName;
            //
            uself.CanVote = ko.observable(false);
            //
            uself.CanMessage = ko.observable(false);
            //
            uself.IconForVisible = ko.observable(true);

            uself.IconFor = ko.computed(function () {
                var retval = '';
                //
                if (uself.VotingType() == 2 || self.Status() == 0) {
                    uself.IconForVisible(false);
                    return retval;
                }
                //
                if (uself.VotingType() == 1)//ЗА
                {
                    retval = 'negotiation-user-icon_for';
                }
                else {
                    retval = 'negotiation-user-icon_for-gray';
                }
                //
                if (uself.CanVote())
                    retval += ' cursor-pointer';
                //
                return retval;
            });
            //

            uself.EmailInfo = ko.computed(function () {
;
                //
                if (uself.Email && uself.Email != '') {
                    return true;
                }
                else
                    return false;
                //
            });

            uself.IconAgainstVisible = ko.observable(true);

            uself.IconAgainst = ko.computed(function () {
                var retval = '';
                //
                if (uself.VotingType() == 1 || self.Status() == 0) {
                    uself.IconAgainstVisible(false);
                    return retval;
                }

                if (uself.VotingType() == 2)//ПРОТИВ
                {
                    retval = 'negotiation-user-icon_against';
                }
                else {
                    retval = 'negotiation-user-icon_against-gray';
                }
                //
                if (uself.CanVote())
                    retval += ' cursor-pointer';
                //
                //
                return retval;
            });
            //
            uself.IconEdit = ko.computed(function () {
                var retval = '';
                //
                if (uself.VotingType() == 2)
                    retval = 'negotiation-user-icon_edit';
                else retval = 'negotiation-user-icon_edit-gray';
                //
                if (uself.CanVote())
                    retval += ' cursor-pointer';
                //
                return retval;
            });
            //
            uself.IconCommentsVisible = ko.observable(true);       
            //
            uself.CommentsIcon = ko.computed(function () {
                var retval = '';

                if (uself.VotingType() || self.Status() != 0)
                {
                    retval = 'negotiation-user-icon_comments';
                } 
                else if (self.Status() == 0)
                    uself.IconCommentsVisible(false);
                //
                //
                if (uself.CanMessage())
                    retval += ' cursor-pointer';
                //
                //
                return retval;
            });
            //
            uself.CommentUserVisible = ko.observable(false); 

            uself.CommentUser = ko.computed(function () {
                if (obj.Message)
                    uself.CommentUserVisible(true);
                else if (obj == null)
                   uself.CommentUserVisible(false);
                //     
            });
            // 
            uself.EditMessage = function () {
                if (!uself.UserID)
                    return;
                if (!uself.CanMessage())
                    return;
                var retvalD = $.Deferred();
                //
                require(['usualForms'], function (module) {
                    var fh = new module.formHelper();
                    fh.ShowNegotiationMessage(self.ID, parent.ObjectID, self.Theme(), uself.Message, uself.UserID);
                });
                self.UserList.valueHasMutated();
                //
                return retvalD;
                
            };
            //
            uself.TextDelegationUserVisible = ko.observable(false); 

            uself.TextDelegationUser = ko.computed(function () {
                if (uself.OldUserName && uself.OldUserName !== null)
                {
                    uself.TextDelegationUserVisible(true);
                }
                else
                    uself.TextDelegationUserVisible(false);
            });

            uself.IconDelegationVisible = ko.observable(true);
            
            uself.IconDelegation = ko.computed(function () {
                var retval = '';

                if ((!uself.VotingType() == 1 && self.Status() == 1) || (!uself.VotingType() == 2 && self.Status() == 1))
                {
                    retval = 'negotiation-user-icon_delegation';
                }

                else if (self.Status() == 0)
                    uself.IconDelegationVisible(false);
                //
                if (uself.CanVote())
                    retval += ' cursor-pointer';
                //
                //
                return retval;
            });
            //
            uself.EditDelegationUser = function () {
                if (!uself.CanVote())
                    return;
                //          
                showSpinner();
                require(['usualForms', 'models/SDForms/SDForm.User'], function (module, userLib) {
                    var fh = new module.formHelper(true);
                    var options = {
                        ID: parent.ID,
                        ClassID: parent.ClassID,
                        objClassID: 160,
                        fieldName: 'Negotiation.User',
                        fieldFriendlyName: getTextResource('NegotiationApprovingPerson'),
                        oldValue: { ID: uself.UserID, ClassID: uself.NegotiationID },
                        searcherName: 'NegotiationUserSearcher',
                        allowNull: false,
                        searcherPlaceholder: getTextResource('NegotiationDelegateVoice'),
                        onSave: function (objectInfo) {
                            $(document).trigger('local_objectUpdated', [160, uself.NegotiationID, self.ObjectID]);                          
                        }
                    };                     
                    fh.ShowSDEditor(fh.SDEditorTemplateModes.searcherEdit, options);
                });
            };
            //
            uself.IsEditIconVisible = ko.computed(function () {
                if (self.IsFinanceMode() && uself.CanVote())
                    return true;
                //
                return false;
            });
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