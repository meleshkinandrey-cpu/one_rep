define(['knockout', 'jquery', 'ajax', 'imList'], function (ko, $, ajaxLib, imLib) {
    var module = {
        //сущность knockout, идентификатор класса сущности, селектор ajax-крутилки
        LinkList: function (ko_object, objectClassID, ajaxSelector, readOnly_object, canEdit_object) {
            var self = this;
            //
            self.isLoaded = ko.observable(false);//факт загруженности данных для объекта ko_object()
            self.imList = null;//declared below
            self.ajaxControl = new ajaxLib.control();//единственный ajax для этого списка
            self.IsFinanceMode = ko.computed(function () {
                if (objectClassID == 119 && ko_object != null && ko_object() != null //WORKORDER ONLY
                    && ko_object().WorkOrderTypeClass && ko_object().WorkOrderTypeClass() != 0) //Purchase or ActivesRequest only
                    return true;
                else return false;
            });
            self.FinanceModeType = ko.computed(function () {
                if (self.IsFinanceMode())
                    return ko_object().WorkOrderTypeClass();
                else return null;
            });
            //
            self.CheckData = function (negotitionID) {//функция загрузки списка (грузится только раз). ID согласования, форму которого нужно открыть после загрузки списка
                if (!self.isLoaded()) {
                    $.when(self.imList.Load()).done(function () {
                        //show form

                        //if (negotitionID) {
                        //    var elem = ko.utils.arrayFirst(self.imList.List(), function (el) {
                        //        return el[self.imList.aliasID] == negotitionID;
                        //    });
                        //    self.ShowObjectForm(elem);
                        //    elem.ExpandCollapseClick();
                        //}
                        //

                        self.isLoaded(true);
                    });
                }
            };
            //
            self.ClearData = function () {//функция сброса данных
                self.imList.List([]);
                //
                self.isLoaded(false);
            };
            self.ReadOnly = readOnly_object;//флаг только чтение
            self.CanEdit = canEdit_object;//флаг для редактирования/создания
            //
            self.HaveUnvoted = ko.observable(false);//есть ли непроголосованные текущим пользователем
            self.ItemsCount = ko.computed(function () {//вариант расчета количества элементов (по данным объекта / по реальному количеству из БД)                
                var retval = 0;
                var isNeedToVote = false;
                if (self.isLoaded()) {
                    retval = self.imList.List().length;
                    ko.utils.arrayForEach(self.imList.List(), function (el) {
                        if (el.CanVote())
                            isNeedToVote = true;
                    });
                }
                else if (ko_object != null && ko_object() != null) {
                    retval = ko_object().NegotiationCount();
                    isNeedToVote = ko_object().HaveUnvotedNegotiation();
                }
                //
                self.HaveUnvoted(isNeedToVote);
                //
                if (retval <= 0)
                    return null;
                if (retval > 99)
                    return '99';
                else
                    return '' + retval;
            });
            self.ShowObjectForm = function (negotiation) {//отображает форму элемента списка               
                showSpinner();
                require(['usualForms'], function (module) {
                    var options = {
                        ID: negotiation.ID,
                        Theme: negotiation.Theme(),
                        Mode: negotiation.Mode(),
                        Status: negotiation.Status(),
                        UtcDateVoteEnd: negotiation.UtcDateVoteEnd(),
                        UtcDateVoteStart: negotiation.UtcDateVoteStart(),
                        UsersList: negotiation.UserList,
                        IsFinanceMode: self.IsFinanceMode(),
                        FinanceModeType: self.FinanceModeType(),
                        SettingCommentPlacet: negotiation.SettingCommentPlacet(),
                        SettingCommentNonPlacet: negotiation.SettingCommentNonPlacet()
                    };
                    //
                    var fh = new module.formHelper(true);
                    fh.ShowNegotiation(negotiation.ID, ko_object().ID(), objectClassID, self.CanEdit, function (negotiationID) {
                        $(document).trigger('local_objectUpdated', [160, negotiationID, ko_object().ID()]);//OBJ_NEGOTIATION
                    }, options);
                });
            };
            //
            var imListOptions = {};//параметры imList для списка 
            {
                imListOptions.aliasID = 'ID';
                //
                imListOptions.LoadAction = function () {
                    var data = {
                        'ID': ko_object().ID(),
                        'EntityClassId': objectClassID
                    };
                    var retvalD = $.Deferred();
                    self.ajaxControl.Ajax($(ajaxSelector),
                        {
                            dataType: "json",
                            method: 'GET',
                            data: data,
                            url: 'sdApi/GetNegotiationList'
                        },
                        function (newVal) {
                            if (newVal && newVal.Result === 0) {
                                var negotiationList = newVal.List;
                                if (negotiationList) {
                                    require(['models/SDForms/SDForm.Negotiation'], function (negotiationLib) {
                                        var retval = [];
                                        ko.utils.arrayForEach(negotiationList, function (item) {
                                            retval.push(new negotiationLib.Negotiation(self.imList, item, self.IsFinanceMode, self.FinanceModeType, canEdit_object, readOnly_object));
                                        });
                                        retvalD.resolve(retval);
                                    });
                                }
                                else {
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('AjaxError') + '\n[SDForm.NegotiationList.js, LoadAction]', 'error');
                                    });
                                    retvalD.resolve([]);
                                }
                            }
                            else if (newVal && newVal.Result === 1)
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[SDForm.NegotiationList.js, LoadAction]', 'error');
                                    retvalD.resolve([]);
                                });
                            else if (newVal && newVal.Result === 2)
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('BadParamsError') + '\n[SDForm.NegotiationList.js, LoadAction]', 'error');
                                    retvalD.resolve([]);
                                });
                            else if (newVal && newVal.Result === 3)
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('AccessError'), 'error');
                                    retvalD.resolve([]);
                                });
                            else
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[SDForm.NegotiationList.js, LoadAction]', 'error');
                                    retvalD.resolve([]);
                                });
                        });
                    return retvalD.promise();
                };
                //
                imListOptions.ReloadByIDAction = function (negotiation, id) {
                    var retD = $.Deferred();
                    //
                    if (!self.isLoaded()) {
                        retD.resolve(false);
                        return retD.promise();
                    }
                    //
                    var data = {
                        'EntityID': ko_object().ID(),
                        'EntityClassId': objectClassID,
                        'NegotiationID': id
                    };
                    self.ajaxControl.Ajax($(ajaxSelector),
                        {
                            dataType: "json",
                            method: 'GET',
                            data: data,
                            url: 'sdApi/GetNegotiation'
                        },
                        function (newVal) {
                            if (newVal && newVal.Result === 0) {
                                var newValue = newVal.Elem;
                                if (negotiation && newValue)
                                    negotiation.Merge(newValue);
                                else if (negotiation && !newValue)
                                    self.imList.TryRemoveByID(id);
                                else if (!negotiation && newValue)
                                    require(['models/SDForms/SDForm.Negotiation'], function (negotiationLib) {
                                        self.imList.TryRemoveByID(id);
                                        //
                                        self.imList.List.push(new negotiationLib.Negotiation(self.imList, newValue, self.IsFinanceMode, self.FinanceModeType, canEdit_object, readOnly_object));
                                        self.imList.List.valueHasMutated();
                                    });
                                //
                                retD.resolve(true);
                            }
                            else if (newVal && newVal.Result === 1)
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[SDForm.NegotiationList.js, ReloadByIDAction]', 'error');
                                    retD.resolve(false);
                                });
                            else if (newVal && newVal.Result === 2)
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('BadParamsError') + '\n[SDForm.NegotiationList.js, ReloadByIDAction]', 'error');
                                    retD.resolve(false);
                                });
                            else if (newVal && (newVal.Result == 3 || newVal.Result == 6)) {
                                if (negotiation)
                                    self.imList.TryRemoveByID(id);
                                retD.resolve(false);
                            }
                            else
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[SDForm.NegotiationList.js, ReloadByIDAction]', 'error');
                                    retD.resolve(false);
                                });
                        });
                    //
                    return retD.promise();
                };
            }
            self.imList = new imLib.IMList(imListOptions);
            //
            //
            {//действия над списком
                var operationsOptions = {};
                {
                    operationsOptions.Text = getTextResource('NegotiationStart');
                    operationsOptions.Command = function (negArray) {
                        var PostD = $.Deferred();
                        $.when(userD).done(function (user) {
                            require(['sweetAlert'], function () {
                                var nameList = '';
                                ko.utils.arrayForEach(negArray, function (el) {
                                    nameList += el.Theme() + '\n';
                                });
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
                                        ko.utils.arrayForEach(negArray, function (el) {
                                            postArray.push({
                                                ID: el.ID,
                                                ObjectID: ko_object().ID(),
                                                ObjectClassID: objectClassID,
                                                Operation: 3//Start
                                            });
                                        });
                                        //
                                        var data = {
                                            List: postArray
                                        };
                                        self.ajaxControl.Ajax($(ajaxSelector),
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
                                                        $(document).trigger('local_objectUpdated', [160, postArray[i].ID, ko_object().ID()]);//OBJ_NEGOTIATION для обновления в списке
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
                    operationsOptions.Validator = function (negArray) {
                        if (self.imList.SelectedItemsCount() == 0)
                            return false;
                        //
                        var exist = ko.utils.arrayFirst(negArray, function (el) {
                            return el.Status() != 0;
                        });
                        return (exist == null);
                    };
                }
                self.imList.AddOperation(operationsOptions);
                //
                operationsOptions = {};
                {
                    operationsOptions.Text = getTextResource('NegotiationRemove');
                    operationsOptions.Command = function (negArray) {
                        var PostD = $.Deferred();
                        $.when(userD).done(function (user) {
                            require(['sweetAlert'], function () {
                                var nameList = '';
                                ko.utils.arrayForEach(negArray, function (el) {
                                    nameList += el.Theme() + '\n';
                                });
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
                                        ko.utils.arrayForEach(negArray, function (el) {
                                            postArray.push({
                                                ID: el.ID,
                                                ObjectID: ko_object().ID(),
                                                ObjectClassID: objectClassID,
                                                Operation: 2//Remove
                                            });
                                        });
                                        //
                                        var data = {
                                            List: postArray
                                        };
                                        self.ajaxControl.Ajax($(ajaxSelector),
                                            {
                                                dataType: "json",
                                                method: 'POST',
                                                data: data,
                                                url: 'sdApi/NegotiationOperation'
                                            },
                                            function (Result) {
                                                if (Result === 0) {
                                                    for (var i = 0; i < postArray.length; i++) {
                                                        $(document).trigger('local_objectDeleted', [160, postArray[i].ID, ko_object().ID()]);//OBJ_NEGOTIATION для обновления в списке
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
                }
                self.imList.AddOperation(operationsOptions);
                //
                operationsOptions = {};
                {
                    operationsOptions.Text = getTextResource('AddNegotiation');
                    operationsOptions.Validator = function () { return self.imList.SelectedItemsCount() == 0; };
                    operationsOptions.Command = function (negArray) {
                        showSpinner();
                        require(['usualForms'], function (module) {
                            var fh = new module.formHelper(true);
                            fh.ShowNegotiation('', ko_object().ID(), objectClassID, self.CanEdit, function (negotiationID) {
                                $(document).trigger('local_objectInserted', [160, negotiationID, ko_object().ID()]);//OBJ_NEGOTIATION
                            },
                            {
                                IsFinanceMode: self.IsFinanceMode(),
                                FinanceModeType: self.FinanceModeType()
                            });
                        });
                    };
                }
                self.imList.AddOperation(operationsOptions);
            }
        }
    };
    return module;
});