define(['knockout', 'jquery', 'ajax', 'models/SDForms/SDForm.User', 'models/FinanceForms/ActivesRequestSpecification'], function (ko, $, ajaxLib, userLib, specLib) {
    var module = {
        WorkOrder: function (parentSelf, woData) {
            var mself = this;
            var self = parentSelf;
            //
            mself.ClassID = 119;
            //
            if (woData.ID)
                mself.ID = ko.observable(woData.ID)
            else mself.ID = ko.observable('');
            if (woData.Number)
                mself.Number = ko.observable(woData.Number)
            else mself.Number = ko.observable('');
            if (woData.Name)
                mself.Name = ko.observable(woData.Name)
            else mself.Name = ko.observable('');
            if (woData.Description)
                mself.Description = ko.observable(woData.Description)
            else mself.Description = ko.observable('');
            if (woData.ManHours)
                mself.ManHours = ko.observable(woData.ManHours)
            else mself.ManHours = ko.observable('');
            if (woData.ManhoursNorm)
                mself.ManhoursNorm = ko.observable(woData.ManhoursNorm)
            else mself.ManhoursNorm = ko.observable(0);
            //
            mself.ManhoursNormString = ko.computed(function () {
                return getLocaleHourMinString(mself.ManhoursNorm());
            });
            if (woData.EntityStateID)
                mself.EntityStateID = ko.observable(woData.EntityStateID)
            else mself.EntityStateID = ko.observable('');
            if (woData.EntityStateName)
                mself.EntityStateName = ko.observable(woData.EntityStateName)
            else mself.EntityStateName = ko.observable('');
            //
            if (woData.WorkflowSchemeID)
                mself.WorkflowSchemeID = ko.observable(woData.WorkflowSchemeID);
            else mself.WorkflowSchemeID = ko.observable(null);
            //
            mself.WorkflowImageSource = ko.observable(woData.WorkflowImageSource ? woData.WorkflowImageSource : null);
            if (woData.TypeName)
                mself.TypeName = ko.observable(woData.TypeName)
            else mself.TypeName = ko.observable('');
            if (woData.TypeID)
                mself.TypeID = ko.observable(woData.TypeID)
            else mself.TypeID = ko.observable('');
            if (woData.PriorityName)
                mself.PriorityName = ko.observable(woData.PriorityName)
            else mself.PriorityName = ko.observable('');
            if (woData.PriorityID)
                mself.PriorityID = ko.observable(woData.PriorityID)
            else mself.PriorityID = ko.observable('');
            if (woData.PriorityColor)
                mself.PriorityColor = ko.observable(woData.PriorityColor)
            else mself.PriorityColor = ko.observable('');
            //
            if (woData.ReferenceClassID)
                mself.ReferenceClassID = ko.observable(woData.ReferenceClassID);
            else mself.ReferenceClassID = ko.observable('');
            if (woData.ReferenceObjectID)
                mself.ReferenceObjectID = ko.observable(woData.ReferenceObjectID);
            else mself.ReferenceObjectID = ko.observable('');
            if (woData.ReferenceObjectNumber)
                mself.ReferenceObjectNumber = ko.observable(woData.ReferenceObjectNumber);
            else mself.ReferenceObjectNumber = ko.observable('');
            if (woData.CallClientID)
                mself.CallClientID = ko.observable(woData.CallClientID);
            else mself.CallClientID = ko.observable(null);
            //
            if (woData.InitiatorID)
                mself.InitiatorID = ko.observable(woData.InitiatorID)
            else mself.InitiatorID = ko.observable('');
            mself.InitiatorLoaded = ko.observable(false);
            mself.Initiator = ko.observable(new userLib.EmptyUser(parentSelf, userLib.UserTypes.workOrderInitiator));
            //
            if (woData.AssignorID)
                mself.AssignorID = ko.observable(woData.AssignorID)
            else mself.AssignorID = ko.observable('');
            mself.AssignorLoaded = ko.observable(false);
            mself.Assignor = ko.observable(new userLib.EmptyUser(parentSelf, userLib.UserTypes.assignor, parentSelf.EditAssignor));
            //
            mself.QueueID = ko.observable(woData.QueueID ? woData.QueueID : '');
            mself.QueueName = ko.observable(woData.QueueName ? woData.QueueName : '');
            mself.QueueLoaded = ko.observable(false);
            mself.Queue = ko.observable(new userLib.EmptyUser(parentSelf, userLib.UserTypes.queueExecutor, parentSelf.EditQueue));
            //
            mself.ExecutorID = ko.observable(woData.ExecutorID ? woData.ExecutorID : '');
            mself.ExecutorLoaded = ko.observable(false);
            mself.Executor = ko.observable(new userLib.EmptyUser(parentSelf, userLib.UserTypes.executor, parentSelf.EditExecutor));
            //
            if (woData.UtcDateCreated)
                mself.UtcDateCreated = ko.observable(parseDate(woData.UtcDateCreated))
            else mself.UtcDateCreated = ko.observable('');
            if (woData.UtcDateAssigned)
                mself.UtcDateAssigned = ko.observable(parseDate(woData.UtcDateAssigned))
            else mself.UtcDateAssigned = ko.observable('');
            if (woData.UtcDateAccepted)
                mself.UtcDateAccepted = ko.observable(parseDate(woData.UtcDateAccepted))
            else mself.UtcDateAccepted = ko.observable('');
            if (woData.UtcDatePromised)
                mself.UtcDatePromised = ko.observable(parseDate(woData.UtcDatePromised))
            else mself.UtcDatePromised = ko.observable('');
            if (woData.UtcDatePromised)
                mself.UtcDatePromisedDT = ko.observable(new Date(parseInt(woData.UtcDatePromised)));
            else mself.UtcDatePromisedDT = ko.observable(null);
            if (woData.UtcDateStarted)
                mself.UtcDateStarted = ko.observable(parseDate(woData.UtcDateStarted))
            else mself.UtcDateStarted = ko.observable('');
            if (woData.UtcDateAccomplished)
                mself.UtcDateAccomplished = ko.observable(parseDate(woData.UtcDateAccomplished))
            else mself.UtcDateAccomplished = ko.observable('');
            if (woData.UtcDateModified)
                mself.UtcDateModified = ko.observable(parseDate(woData.UtcDateModified))
            else mself.UtcDateModified = ko.observable('');
            //
            if (woData.NegotiationCount)
                mself.NegotiationCount = ko.observable(woData.NegotiationCount);
            else mself.NegotiationCount = ko.observable(0);
            if (woData.HaveUnvotedNegotiation != null)
                mself.HaveUnvotedNegotiation = ko.observable(woData.HaveUnvotedNegotiation);
            else mself.HaveUnvotedNegotiation = ko.observable(false);
            //
            if (woData.UnreadNoteCount)
                mself.UnreadNoteCount = ko.observable(woData.UnreadNoteCount);
            else mself.UnreadNoteCount = ko.observable(0);
            if (woData.NoteCount)
                mself.NoteCount = ko.observable(woData.NoteCount);
            else mself.NoteCount = ko.observable(0);
            mself.TotalNotesCount = ko.computed(function () {
                return parseInt(mself.NoteCount());
            });
            //
            if (woData.DependencyObjectCount)
                mself.DependencyObjectCount = ko.observable(woData.DependencyObjectCount);
            else mself.DependencyObjectCount = ko.observable(0);
            //
            //
            if (woData.WorkOrderTypeClass !== null)
                mself.WorkOrderTypeClass = ko.observable(woData.WorkOrderTypeClass);
            else mself.WorkOrderTypeClass = ko.observable();
            //
            if (woData.WorkOrderTypeClassString)
                mself.WorkOrderTypeClassString = ko.observable(woData.WorkOrderTypeClassString);
            else mself.WorkOrderTypeClassString = ko.observable();
            //
            mself.NumberName = ko.computed(function () {
                return '№' + mself.Number() + ' ' + mself.Name();
            });
            //
            mself.TotalCostWithNDSS = ko.observable(woData.TotalCostWithNDS ? woData.TotalCostWithNDS : null);
            mself.TotalCostWithNDSString = ko.observable(specLib.ToMoneyString(mself.TotalCostWithNDSS()) + ' ' + getTextResource('CurrentCurrency'));
            //
            mself.UserField1 = ko.observable(woData.UserField1 ? woData.UserField1 : '');
            mself.UserField2 = ko.observable(woData.UserField2 ? woData.UserField2 : '');
            mself.UserField3 = ko.observable(woData.UserField3 ? woData.UserField3 : '');
            mself.UserField4 = ko.observable(woData.UserField4 ? woData.UserField4 : '');
            mself.UserField5 = ko.observable(woData.UserField5 ? woData.UserField5 : '');
            //
            mself.UserField1Name = woData.UserField1Name;
            mself.UserField2Name = woData.UserField2Name;
            mself.UserField3Name = woData.UserField3Name;
            mself.UserField4Name = woData.UserField4Name;
            mself.UserField5Name = woData.UserField5Name;
            //
            mself.ReferenceObject = ko.observable(null);
            mself.ajaxControl_woRefObject = new ajaxLib.control();

            //
            mself.CauseObject = ko.observable(null);
            mself.CauseObjectID = ko.observable(null);
            mself.CauseClassID = ko.observable(null);
            //
            mself.Client = ko.observable(null);
            mself.ClientID = ko.observable('');
            mself.ClientLoaded = ko.observable(false);
            //
            mself.LoadReferenceObject = function (id, classID, out_ko_object, out_ko_classID, initClient, referenceExists, resizeFunc) {
                if (id && classID) {
                    if (classID == 701) { //CALL
                        var data = referenceExists ?
                            {
                                'EntityID': mself.ID(),
                                'EntityClassId': 119, //WO object id
                                'CallID': id
                            } :
                            {
                                'ID': id
                            };

                        mself.ajaxControl_woRefObject.Ajax(self.$region.find('.woRef__b'),
                            {
                                dataType: "json",
                                method: 'GET',
                                data: data,
                                url: referenceExists ? 'sdApi/GetCallReference' : 'sdApi/GetCallInfo'
                            },
                            function (newVal) {
                                if (newVal && newVal.Result === 0) {
                                    var newValue = referenceExists ? newVal.Elem : newVal.Call;
                                    if (newValue) {
                                        require(['models/SDForms/SDForm.CallReference'], function (crLib) {
                                            out_ko_object(new crLib.CallReference(self, newValue));
                                            //
                                            if (out_ko_classID)
                                                out_ko_classID(701);
                                            //
                                            if (initClient) {
                                                mself.ClientLoaded(false);
                                                mself.ClientID(newValue.ClientID);
                                                initClient();
                                            }
                                            //
                                            if (resizeFunc)
                                                resizeFunc();
                                        });
                                    }
                                    else {
                                        require(['sweetAlert'], function () {
                                            swal(getTextResource('ErrorCaption'), getTextResource('AjaxError') + '\n[WorkOrderForm.WorkOrder.js, LoadReferenceObject]', 'error');
                                        });
                                    }
                                }
                                else if (newVal && newVal.Result === 1)
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[WorkOrderForm.WorkOrder.js, LoadReferenceObject]', 'error');
                                    });
                                else if (newVal && newVal.Result === 2)
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('BadParamsError') + '\n[WorkOrderForm.WorkOrder.js, LoadReferenceObject]', 'error');
                                    });
                                else if (newVal && newVal.Result === 3)
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('AccessError'), 'error');
                                    });
                                else
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[WorkOrderForm.WorkOrder.js, LoadReferenceObject]', 'error');
                                    });
                            });
                    }
                    else if (classID == 702) { //PROBLEM
                        var data = {
                            'EntityID': mself.ID(),
                            'EntityClassId': 119, //WO object id
                            'ProblemID': id
                        };
                        mself.ajaxControl_woRefObject.Ajax(self.$region.find('.woRef__b'),
                            {
                                dataType: "json",
                                method: 'GET',
                                data: data,
                                url: 'sdApi/GetPBReference'
                            },
                            function (newVal) {
                                if (newVal && newVal.Result === 0) {
                                    var newValue = newVal.Elem;
                                    if (newValue) {
                                        require(['models/SDForms/SDForm.ProblemReference'], function (prLib) {
                                            out_ko_object(new prLib.ProblemReference(self, newValue));
                                        });
                                    }
                                    else {
                                        require(['sweetAlert'], function () {
                                            swal(getTextResource('ErrorCaption'), getTextResource('AjaxError') + '\n[WorkOrderForm.WorkOrder.js, LoadReferenceObject]', 'error');
                                            mself.ReferenceObject(null);
                                        });
                                    }
                                }
                                else if (newVal && newVal.Result === 1)
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[WorkOrderForm.WorkOrder.js, LoadReferenceObject]', 'error');
                                        mself.ReferenceObject(null);
                                    });
                                else if (newVal && newVal.Result === 2)
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('BadParamsError') + '\n[WorkOrderForm.WorkOrder.js, LoadReferenceObject]', 'error');
                                        mself.ReferenceObject(null);
                                    });
                                else if (newVal && newVal.Result === 3)
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('AccessError'), 'error');
                                        mself.ReferenceObject(null);
                                    });
                                else if (newVal && newVal.Result === 6)
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('ObjectDeleted'), 'error');
                                        mself.ReferenceObject(null);
                                    });
                                else
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[WorkOrderForm.WorkOrder.js, LoadReferenceObject]', 'error');
                                        mself.ReferenceObject(null);
                                    });
                            });
                    }
                    else if (classID == 371) { //Project
                        var data = {
                            'id': id
                        };
                        mself.ajaxControl_woRefObject.Ajax(self.$region.find('.woRef__b'),
                            {
                                dataType: "json",
                                method: 'GET',
                                data: data,
                                url: 'sdApi/GetProjectReference'
                            },
                            function (newVal) {
                                if (newVal && newVal.Result === 0) {
                                    var newValue = newVal.Project;
                                    if (newValue) {
                                        require(['models/SDForms/SDForm.ProjectReference'], function (prLib) {
                                            out_ko_object(new prLib.ProjectReference(self, newValue));
                                            //
                                            if (out_ko_classID)
                                                out_ko_classID(371);
                                            //
                                            if (initClient) {
                                                mself.ClientLoaded(false);
                                                mself.ClientID(newValue.InitiatorID);
                                                initClient();
                                            }
                                            //
                                            if (resizeFunc)
                                                resizeFunc();
                                        });
                                    }
                                    else {
                                        require(['sweetAlert'], function () {
                                            swal(getTextResource('ErrorCaption'), getTextResource('AjaxError') + '\n[WorkOrderForm.WorkOrder.js, LoadReferenceObject]', 'error');
                                            out_ko_object(null);
                                        });
                                    }
                                }
                                else if (newVal && newVal.Result === 1)
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[WorkOrderForm.WorkOrder.js, LoadReferenceObject]', 'error');
                                        out_ko_object(null);
                                    });
                                else if (newVal && newVal.Result === 2)
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('BadParamsError') + '\n[WorkOrderForm.WorkOrder.js, LoadReferenceObject]', 'error');
                                        out_ko_object(null);
                                    });
                                else if (newVal && newVal.Result === 3)
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('AccessError'), 'error');
                                        out_ko_object(null);
                                    });
                                else if (newVal && newVal.Result === 6)
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('ObjectDeleted'), 'error');
                                        out_ko_object(null);
                                    });
                                else if (newVal && newVal.Result === 7)
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('Message'), getTextResource('AccessError') + ' ' + getTextResource('Project'), 'info');
                                        out_ko_object(null);
                                    });
                                else
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[WorkOrderForm.WorkOrder.js, LoadReferenceObject]', 'error');
                                        out_ko_object(null);
                                    });
                            });
                    }
                    else out_ko_object(null);
                }
                else out_ko_object(null);
            };
            //
            if (woData.CounterPartyID)
                mself.CounterPartyID = ko.observable(woData.CounterPartyID);
            else mself.CounterPartyID = ko.observable(null);
            //
            if (woData.CounterPartyName)
                mself.CounterPartyName = ko.observable(woData.CounterPartyName);
            else mself.CounterPartyName = ko.observable(null);
            //
            if (woData.PurchaseConcord)
                mself.PurchaseConcord = ko.observable(woData.PurchaseConcord);
            else mself.PurchaseConcord = ko.observable('');
            //
            if (woData.TotalCostWithNDS)
                mself.TotalCostWithNDS = ko.observable(woData.TotalCostWithNDS);
            else mself.TotalCostWithNDS = ko.observable(null);
            //
            if (woData.UtcDateDelivered)
                mself.UtcDateDelivered = ko.observable(parseDate(woData.UtcDateDelivered))
            else mself.UtcDateDelivered = ko.observable('');
            if (woData.UtcDateDelivered)
                mself.UtcDateDeliveredDT = ko.observable(new Date(parseInt(woData.UtcDateDelivered)));
            else mself.UtcDateDeliveredDT = ko.observable(null);
            //
            if (woData.PurchaseBill)
                mself.PurchaseBill = ko.observable(woData.PurchaseBill);
            else mself.PurchaseBill = ko.observable('');
            //
            if (woData.InventoryDocument)
                mself.InventoryDocument = ko.observable(woData.InventoryDocument);
            else mself.InventoryDocument = ko.observable('');
            //
            if (woData.InventoryFounding)
                mself.InventoryFounding = ko.observable(woData.InventoryFounding);
            else mself.InventoryFounding = ko.observable('');
            //
            if (woData.PurchaseDetailBudget)
                mself.PurchaseDetailBudget = ko.observable(woData.PurchaseDetailBudget);
            else mself.PurchaseDetailBudget = ko.observable(false);
            //
            if (woData.PurchaseDetailBudgetReadOnly)
                mself.PurchaseDetailBudgetReadOnly = ko.observable(woData.PurchaseDetailBudgetReadOnly);
            else mself.PurchaseDetailBudgetReadOnly = ko.observable(false);
            //
            if (woData.PurchaseFinanceBudgetRowList_Sum)
                mself.PurchaseFinanceBudgetRowList_Sum = woData.PurchaseFinanceBudgetRowList_Sum;
            else mself.PurchaseFinanceBudgetRowList_Sum = null;
            //
            if (woData.PurchasedAndPlacedCostWithNDS)
                mself.PurchasedAndPlacedCostWithNDS = ko.observable(woData.PurchasedAndPlacedCostWithNDS);
            else mself.PurchasedAndPlacedCostWithNDS = ko.observable(null);
            //
            if (woData.WaitPurchaseCostWithNDS)
                mself.WaitPurchaseCostWithNDS = ko.observable(woData.WaitPurchaseCostWithNDS);
            else mself.WaitPurchaseCostWithNDS = ko.observable(null);
        }
    };
    return module;
});