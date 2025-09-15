define(['knockout', 'jquery', 'ajax', 'ttControl', 'models/FinanceForms/ActivesRequestSpecification', 'models/FinanceForms/PurchaseSpecification', 'models/FinanceForms/ActivesRequestSpecificationForm', 'jqueryStepper'], function (ko, $, ajaxLib, tclib, arsLib, pursLib, formLib) {
    var module = {
        CurrentCurrency: getTextResource('CurrentCurrency'),
        CalculatePriceWithNDS: formLib.CalculatePriceWithNDS,
        GetNdsPercent: formLib.GetNdsPercent,
        ViewModel: function (negotiationID, specificationType, objectID, objectClassID, $region, comment) {
            var self = this;
            self.LoadD = $.Deferred();
            //
            self.$region = $region;
            self.NegotiationID = negotiationID;
            self.ObjectID = objectID;
            self.ObjectClassID = objectClassID;
            self.SpecificationType = specificationType;
            //
            self.SettingCommentPlacet = ko.observable(false);
            self.SettingCommentNonPlacet = ko.observable(false);
            //
            self.SetCLearButtonsList = null; //set in form helper
            self.SetFilledButtonsList = null;
            //
            //SPECLIST_BLOCK
            {
                self.SpecList = ko.observableArray([]);
                self.SpecList_TotalSumNDS = ko.computed(function () {
                    if (!self.SpecList || !self.SpecList() || self.SpecList().length == 0)
                        return 0;
                    //
                    var retval = 0.0;
                    ko.utils.arrayForEach(self.SpecList(), function (el) {
                        retval += el.SumNDS();
                    });
                    retval = arsLib.Normalize(retval);
                    //
                    return retval;
                });
                self.SpecList_TotalSumNDSString = ko.computed(function () {
                    return arsLib.ToMoneyString(self.SpecList_TotalSumNDS());
                });
                self.SpecList_TotalCostWithNDS = ko.computed(function () {
                    if (!self.SpecList || !self.SpecList() || self.SpecList().length == 0)
                        return 0;
                    //
                    var retval = 0.0;
                    ko.utils.arrayForEach(self.SpecList(), function (el) {
                        retval += el.CostWithNDS();
                    });
                    retval = arsLib.Normalize(retval);
                    //
                    return retval;
                });
                self.SpecList_TotalCostWithNDSString = ko.computed(function () {
                    return arsLib.ToMoneyString(self.SpecList_TotalCostWithNDS());
                });
                self.SpecList_TotalCostWithoutNDS = ko.computed(function () {
                    if (!self.SpecList || !self.SpecList() || self.SpecList().length == 0)
                        return 0;
                    //
                    var retval = 0.0;
                    ko.utils.arrayForEach(self.SpecList(), function (el) {
                        retval += el.CostWithoutNDS();
                    });
                    retval = arsLib.Normalize(retval);
                    //
                    return retval;
                });
                self.SpecList_TotalCostWithoutNDSString = ko.computed(function () {
                    return arsLib.ToMoneyString(self.SpecList_TotalCostWithoutNDS());
                });
                //
                self.SpecList_TotalCount = ko.computed(function () {
                    if (!self.SpecList || !self.SpecList() || self.SpecList().length == 0)
                        return 0;
                    //
                    var retval = 0;
                    ko.utils.arrayForEach(self.SpecList(), function (el) {
                        retval += el.Count();
                    });
                    //
                    return retval;
                });
                //
                self.SpecList_SortTable = function () {
                    if (!self.SpecList)
                        return;

                    self.SpecList.sort(
                            function (left, right) {
                                if (left.OrderNumber() == null)
                                    return -1;
                                //
                                if (right.OrderNumber() == null)
                                    return 1;
                                //
                                return left.OrderNumber() == right.OrderNumber() ? 0 : (left.OrderNumber() < right.OrderNumber() ? -1 : 1);
                            }
                        );
                };
                //
                self.SpecList_SelectAll = ko.observable(false);
                self.SpecList_SelectAll_IsEditActive = false;
                self.SpecList_SelectAll.subscribe(function (newValue) {
                    if (!self.SpecList_SelectAll_IsEditActive) {
                        self.SpecList_SelectAll_IsEditActive = true;
                        //
                        ko.utils.arrayForEach(self.SpecList(), function (el) {
                            if (el.Selected() !== newValue)
                                el.Selected(newValue);
                        });
                        //
                        self.SpecList_SelectAll_IsEditActive = false;
                    }
                });
                //
                self.UnSelectAll = function () {
                    ko.utils.arrayForEach(self.SpecList(), function (el) {
                            el.Selected(false);
                    });
                };
                //
                self.SpecList_IsReadyToVote = ko.computed(function () {
                    if (!self.SpecList || !self.SpecList() || self.SpecList().length == 0)
                        return false;
                    //
                    var ready = true;
                    ko.utils.arrayForEach(self.SpecList(), function (el) {
                        if (el.State() !== 1 && el.State() !== 3) //Purchasing OR DECLINED
                            ready = false;
                    });
                    //
                    return ready;
                });
                //
                self.ajaxControl_edit = new ajaxLib.control();
                self.SpecList_Edit = function (specification) {
                    showSpinner();
                    require(['financeForms'], function (module) {
                        var fh = new module.formHelper(true);
                        //call func
                        var ps = ko.toJS(specification);
                        //
                        var isARS = self.SpecificationType == 1;
                        var isPURS = self.SpecificationType == 2;
                        //
                        var url = isARS ? 'finApi/EditActivesRequestSpecification' : isPURS ? 'finApi/EditPurchaseSpecification' : null;
                        var canEdit = function () { return true; };
                        var onEditComplete = function (newData) {
                            if (!newData)
                                return;
                            //
                            var data = newData;
                            data.Operation = 0; // EDIT
                            //
                            self.ajaxControl_edit.Ajax($region,
                                {
                                    dataType: "json",
                                    method: 'POST',
                                    data: data,
                                    url: url
                                },
                                function (answer) {
                                    if (answer && answer.Response) {
                                        var result = answer.Response.Result;
                                        if (result === 0) {
                                            var newModel = answer.NewModel;
                                            //
                                            specification.Merge(newModel);
                                            self.SpecList_SortTable();
                                            self.SpecList.valueHasMutated();
                                            //
                                            var classID = isARS ? 380 : isPURS ? 381 : 0;
                                            $(document).trigger('local_objectUpdated', [classID, specification.ID, self.ObjectID]);//Specification
                                        }
                                        else if (result === 1)
                                            require(['sweetAlert'], function () {
                                                swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[CustomNegotiation.js, SpecList_Edit]', 'error');
                                            });
                                        else if (result === 2)
                                            require(['sweetAlert'], function () {
                                                swal(getTextResource('ErrorCaption'), getTextResource('BadParamsError') + '\n[CustomNegotiation.js, SpecList_Edit]', 'error');
                                            });
                                        else if (result === 3)
                                            require(['sweetAlert'], function () {
                                                swal(getTextResource('ErrorCaption'), getTextResource('AccessError'), 'error');
                                            });
                                        else if (result === 5)
                                            require(['sweetAlert'], function () {
                                                swal(getTextResource('ErrorCaption'), getTextResource('ConcurrencyErrorWithoutQuestion'), 'error');
                                            });
                                        else if (result === 6)
                                            require(['sweetAlert'], function () {
                                                swal(getTextResource('ErrorCaption'), getTextResource('ObjectDeleted'), 'error');
                                                $.when(self.imList.ReloadAll()).done(function () {
                                                    //
                                                });
                                            });
                                        else if (result === 8)
                                            require(['sweetAlert'], function () {
                                                swal(getTextResource('ErrorCaption'), getTextResource('ValidationError'), 'error');
                                            });
                                        else
                                            require(['sweetAlert'], function () {
                                                swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[CustomNegotiation.js, SpecList_Edit]', 'error');
                                            });
                                    }
                                    else
                                        require(['sweetAlert'], function () {
                                            swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[CustomNegotiation.js, SpecList_Edit]', 'error');
                                        });
                                },
                                null,
                                function () {
                                    hideSpinner();
                                });
                        };
                        //
                        if (isARS)
                            fh.ShowActivesRequestSpecification(ps, canEdit, onEditComplete);
                        else if (isPURS)
                            fh.ShowPurchaseSpecification(ps, canEdit, onEditComplete);
                    });
                };
            }
            //
            //SELECTED ITEMS BLOCK
            {
                self.SelectedItems = ko.observableArray([]);
                self.ItemChecked = function (item) {
                    if (item) {
                        var already = ko.utils.arrayFirst(self.SelectedItems(), function (el) {
                            return el.ID == item.ID;
                        });
                        //
                        if (already == null) {
                            self.SelectedItems.push({ ID: item.ID, State: item.State() });
                            //
                            if (self.SpecList_SelectAll_IsEditActive !== true && self.SelectedItems().length == self.SpecList().length)
                                self.SpecList_SelectAll(true);
                        }
                    }
                };
                self.ItemUnchecked = function (item) {
                    var already = ko.utils.arrayFirst(self.SelectedItems(), function (el) {
                        return el.ID == item.ID;
                    });
                    //
                    if (already != null) {
                        self.SelectedItems.remove(function (el) { return el.ID == item.ID; });
                        //
                        if (self.SpecList_SelectAll_IsEditActive !== true && self.SelectedItems().length == 0)
                            self.SpecList_SelectAll(false);
                    }
                };
                self.CanPressButtons = ko.computed(function () {
                    if (!self.SelectedItems || !self.SelectedItems() || self.SelectedItems().length == 0)
                        return false;
                    //
                    return true;
                });
                self.CanAgree = ko.computed(function () {
                    if (!self.SelectedItems || !self.SelectedItems() || self.SelectedItems().length == 0)
                        return false;
                    //
                    var exist = ko.utils.arrayFirst(self.SelectedItems(), function (el) {
                        return el.State !== 1; //Purchasing
                    });
                    //
                    if (exist)
                        return true;
                    //
                    return false;
                });
                self.CanDecline = ko.computed(function () {
                    if (!self.SelectedItems || !self.SelectedItems() || self.SelectedItems().length == 0)
                        return false;
                    //
                    var exist = ko.utils.arrayFirst(self.SelectedItems(), function (el) {
                        return el.State !== 3; //DECLINE
                    });
                    //
                    if (exist)
                        return true;
                    //
                    return false;
                });
                //
                self.ResourceName_Purchasing = getTextResource('ActivesRequestSpecificationState_Purchasing');
                self.ResourceName_Decline = getTextResource('ActivesRequestSpecificationState_Declined');
                self.ResourceName_Default = getTextResource('ActivesRequestSpecificationState_IsFormed');
                //
                self.SetAgreed = function () {
                    if (!self.SelectedItems || !self.SelectedItems() || self.SelectedItems().length == 0
                        || !self.SpecList || !self.SpecList() || self.SpecList().length == 0)
                        return;
                    //
                    ko.utils.arrayForEach(self.SelectedItems(), function (el) {
                        el.State = 1; //Purchasing
                        //
                        var exist = ko.utils.arrayFirst(self.SpecList(), function (item) {
                            return el.ID == item.ID;
                        });
                        //
                        if (exist) {
                            exist.State(1);
                            exist.StateString(self.ResourceName_Purchasing);
                        }
                    });
                    //
                    self.UnSelectAll();
                    self.SpecList.valueHasMutated();
                    self.SelectedItems.removeAll();
                };
                //
                self.SetDecline = function () {
                    if (!self.SelectedItems || !self.SelectedItems() || self.SelectedItems().length == 0
                        || !self.SpecList || !self.SpecList() || self.SpecList().length == 0)
                        return;
                    //
                    ko.utils.arrayForEach(self.SelectedItems(), function (el) {
                        el.State = 3; //DECLINE
                        //
                        var exist = ko.utils.arrayFirst(self.SpecList(), function (item) {
                            return el.ID == item.ID;
                        });
                        //
                        if (exist) {
                            exist.State(3);
                            exist.StateString(self.ResourceName_Decline);
                        }
                    });
                    //
                    self.UnSelectAll();
                    self.SpecList.valueHasMutated();
                    self.SelectedItems.removeAll();
                };
            }
            //
            //VOTE BLOCK
            {
                self.Vote = ko.observable(0); //НЕ ГОЛОСОВАЛ
                self.Comment = ko.observable(comment ? comment() : '');
                //
                self.SettingCommentPlacet = ko.observable(false);
                self.SettingCommentNonPlacet = ko.observable(false);
                //
                self.SetVoteFor = function () {
                    self.Vote(1);//ЗА
                };
                self.SetVoteAgainst = function () {
                    self.Vote(2);//ПРОТИВ
                };
                //
                self.IconFor = ko.computed(function () {
                    if (self.Vote() == 1)//ЗА
                        return 'negotiation-user-icon_for';
                    else return 'negotiation-user-icon_for-gray';
                });
                self.IconAgainst = ko.computed(function () {
                    if (self.Vote() == 2)//ПРОТИВ
                        return 'negotiation-user-icon_against';
                    else return 'negotiation-user-icon_against-gray';
                });
                //
                self.IconMustComment = ko.computed(function () {
                    if (self.SettingCommentPlacet() && self.Vote() == 1)
                        return 'required';
                    else if (self.SettingCommentNonPlacet() && self.Vote() == 2)
                        return 'required';
                    else return '';
                });
            }
            //
            //FINISH BLOCK
            {
                self.IsReadyToSave = ko.computed(function () {
                    var vote = self.Vote();
                    var specsListReady = self.SpecList_IsReadyToVote();
                    //
                    if (vote !== 0 && specsListReady) {
                        if (self.SetFilledButtonsList)
                            self.SetFilledButtonsList();
                        //
                        return true;
                    }
                    //
                    if (self.SetCLearButtonsList)
                        self.SetCLearButtonsList();
                    return false;
                });
                //
                self.ajaxControl_vote = new ajaxLib.control();
                self.Save = function () {
                    var listData = [];
                    var isARS = self.SpecificationType == 1;
                    var isPURS = self.SpecificationType == 2;
                    //
                    ko.utils.arrayForEach(self.SpecList(), function (el) {
                        listData.push({
                            ID: el.ID,
                            State: el.State()
                        });
                    });
                    //
                    var data = {
                        'NegotiationID': self.NegotiationID,
                        'Type': self.Vote(),
                        'Comment': self.Comment(),
                        'ObjectID': self.ObjectID,
                        'SpecificationsList': listData
                    };
                    var PostD = $.Deferred();
                    self.ajaxControl_vote.Ajax(self.$region,
                        {
                            dataType: "json",
                            method: 'POST',
                            data: data,
                            url: 'finApi/FinanceNegotiationVote'
                        },
                        function (newVal) {
                            if (newVal && newVal.Result === 0) {
                                var retval = {};
                                retval.UtcDateTimeVote = parseDate(newVal.UtcDateTimeVote);
                                retval.Vote = self.Vote();
                                retval.Message = self.Comment();
                                //
                                PostD.resolve(retval);
                                //
                                $(document).trigger('local_objectUpdated', [160, self.negotiationID, self.objID]);//OBJ_NEGOTIATION
                                ko.utils.arrayForEach(self.SpecList(), function (el) {
                                    var classID = isARS ? 380 : isPURS ? 381 : 0;
                                    $(document).trigger('local_objectUpdated', [classID, el.ID, self.ObjectID]);//Specification
                                });
                                return;
                            }
                            else if (newVal.Result === 1)
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('SaveError'), getTextResource('NullParamsError'), 'error');
                                });
                            else if (newVal.Result === 2)
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('SaveError'), getTextResource('BadParamsError'), 'error');
                                });
                            else if (newVal.Result === 3)
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('SaveError'), getTextResource('AccessError'), 'error');
                                });
                            else if (newVal.Result === 5)
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('SaveError'), getTextResource('ConcurrencyErrorWithoutQuestion'), 'error');
                                });
                            else if (newVal.Result === 6)
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('SaveError'), getTextResource('ObjectDeleted'), 'error');
                                });
                            else if (newVal.Result === 8)
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('SaveError'), getTextResource('ValidationError'), 'error');
                                });
                            else if (newVal.Result === 10)
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('NegotiationAlreadyEnded'), '', 'info');
                                });
                            else
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('SaveError'), getTextResource('GlobalError') + '\n[CustomNegotiation.js, Save]', 'error');
                                });
                            PostD.resolve(null);
                        });
                    return PostD.promise();
                };
            }
            self.AfterRender = function () {
                $.when(self.Initialize()).done(function () {
                    self.LoadD.resolve();
                });
            };
            //
            self.Initialize = function () {
                var initD = $.Deferred();
                //
                $.when(self.LoadSpecificationList()).done(function () {

                    //
                    initD.resolve();
                });
                return initD.promise();
            };
            //
            self.ajaxControl_loadSpecificationList = new ajaxLib.control();
            self.LoadSpecificationList = function () {
                var retD = $.Deferred();
                //
                $.when(userD).done(function (user) {
                    var param = {
                        WorkOrderID: self.ObjectID
                    };
                    var url = self.SpecificationType == 1 ? 'finApi/GetActivesRequestSpecificationListForNegotiation?' : self.SpecificationType == 2 ? 'finApi/GetPurchaseSpecificationListForNegotiation?' : null;
                    //
                    self.ajaxControl_loadSpecificationList.Ajax(self.$region,
                    {
                        dataType: "json",
                        method: 'GET',
                        url: url + $.param(param)
                    },
                    function (newVal) {
                        if (newVal && newVal.Result === 0) {
                            if (newVal.List) {
                                var list = newVal.List;
                                //
                                if (self.SpecificationType == 1) {
                                    ko.utils.arrayForEach(list, function (item) {
                                        self.SpecList.push(new arsLib.Specification(self, item));
                                    });
                                    //
                                    self.SpecList_SortTable();
                                    self.SpecList.valueHasMutated();
                                }
                                else if (self.SpecificationType == 2) {
                                    ko.utils.arrayForEach(list, function (item) {
                                        self.SpecList.push(new pursLib.Specification(self, item));
                                    });
                                    //
                                    self.SpecList_SortTable();
                                    self.SpecList.valueHasMutated();
                                }
                            }
                            else {
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('AjaxError') + '\n[CustomNegotiation.js, LoadSpecificationList]', 'error');
                                });
                            }
                        }
                        else if (newVal && newVal.Result === 1)
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[CustomNegotiation.js, LoadSpecificationList]', 'error');
                            });
                        else
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[CustomNegotiation.js, LoadSpecificationList]', 'error');
                            });
                        retD.resolve();
                    },
                    null,
                    function () {
                        retD.resolve();
                    });
                });
                //
                return retD;
            };
        }
    };
    return module;
});