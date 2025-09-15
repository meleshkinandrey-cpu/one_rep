define(['knockout', 'jquery', 'models/SDForms/SDForm.User'], function (ko, $, userLib) {
    var module = {
        Call: function (parentSelf, callData) {
            var mself = this;
            var self = parentSelf;
            //
            mself.ClassID = 701;
            //
            if (callData.ID)
                mself.ID = ko.observable(callData.ID);
            else mself.ID = ko.observable('');
            //
            if (callData.Number)
                mself.Number = ko.observable(callData.Number);
            else mself.Number = ko.observable('');
            //
            if (callData.Grade)
                mself.Grade = ko.observable(callData.Grade);
            else mself.Grade = ko.observable('');
            //
            if (callData.EntityStateID)
                mself.EntityStateID = ko.observable(callData.EntityStateID);
            else mself.EntityStateID = ko.observable('');
            //
            if (callData.WorkflowSchemeID)
                mself.WorkflowSchemeID = ko.observable(callData.WorkflowSchemeID);
            else mself.WorkflowSchemeID = ko.observable(null);
            //
            if (callData.EntityStateName)
                mself.EntityStateName = ko.observable(callData.EntityStateName);
            else mself.EntityStateName = ko.observable('');
            //
            mself.WorkflowImageSource = ko.observable(callData.WorkflowImageSource ? callData.WorkflowImageSource : null);
            //
            if (callData.ReceiptType)
                mself.ReceiptType = ko.observable(callData.ReceiptType);
            else mself.ReceiptType = ko.observable('');
            //
            if (callData.ReceiptTypeName)
                mself.ReceiptTypeName = ko.observable(callData.ReceiptTypeName);
            else mself.ReceiptTypeName = ko.observable('');
            //
            if (callData.Description)//TODO HTML? rename!
                mself.Description = ko.observable(callData.Description);
            else mself.Description = ko.observable('');
            //
            if (callData.Solution)//TODO HTML? rename!
                mself.Solution = ko.observable(callData.Solution);
            else mself.Solution = ko.observable('');
            //
            mself.IncidentResultID = ko.observable(callData.IncidentResultID ? callData.IncidentResultID : null);
            mself.IncidentResultName = ko.observable(callData.IncidentResultName ? callData.IncidentResultName : '');
            //
            mself.RFCResultID = ko.observable(callData.RFCResultID ? callData.RFCResultID : null);
            mself.RFCResultName = ko.observable(callData.RFCResultName ? callData.RFCResultName : '');
            //
            if (callData.UtcDateRegistered)
                mself.UtcDateRegistered = ko.observable(parseDate(callData.UtcDateRegistered));
            else mself.UtcDateRegistered = ko.observable('');
            //
            if (callData.UtcDateOpened)
                mself.UtcDateOpened = ko.observable(parseDate(callData.UtcDateOpened));
            else mself.UtcDateOpened = ko.observable('');
            //
            if (callData.UtcDatePromised)
                mself.UtcDatePromised = ko.observable(parseDate(callData.UtcDatePromised));
            else mself.UtcDatePromised = ko.observable('');
            //
            if (callData.UtcDatePromised)
                mself.UtcDatePromisedDT = ko.observable(new Date(parseInt(callData.UtcDatePromised)));
            else mself.UtcDatePromisedDT = ko.observable(null);
            //
            if (callData.UtcDateAccomplished)
                mself.UtcDateAccomplished = ko.observable(parseDate(callData.UtcDateAccomplished));
            else mself.UtcDateAccomplished = ko.observable('');
            //
            if (callData.UtcDateClosed)
                mself.UtcDateClosed = ko.observable(parseDate(callData.UtcDateClosed));
            else mself.UtcDateClosed = ko.observable('');
            //
            if (callData.UtcDateModified)
                mself.UtcDateModified = ko.observable(parseDate(callData.UtcDateModified));
            else mself.UtcDateModified = ko.observable('');
            //
            if (callData.SLAName)
                mself.SLAName = ko.observable(callData.SLAName);
            else mself.SLAName = ko.observable('');
            //
            mself.ServiceID = ko.observable(callData.ServiceID ? callData.ServiceID : null);
            mself.ServiceName = ko.observable(callData.ServiceName ? callData.ServiceName : '');
            mself.ServiceCategoryName = ko.observable(callData.ServiceCategoryName ? callData.ServiceCategoryName : '');
            mself.ServiceItemID = ko.observable(callData.ServiceItemID ? callData.ServiceItemID : null);
            mself.ServiceItemName = ko.observable(callData.ServiceItemName ? callData.ServiceItemName : '');
            mself.ServiceAttendanceID = ko.observable(callData.ServiceAttendanceID ? callData.ServiceAttendanceID : null);
            mself.ServiceAttendanceName = ko.observable(callData.ServiceAttendanceName ? callData.ServiceAttendanceName : '');
            //
            mself.ServiceItemAttendanceFullName =
                ko.observable(mself.ServiceCategoryName() + ' \\ ' + mself.ServiceName() + ' \\ ' +
                    (mself.ServiceItemID() ? mself.ServiceItemName() : mself.ServiceAttendanceName()));
            //
            if (callData.Price)
                mself.Price = ko.observable(callData.Price);
            else mself.Price = ko.observable('');
            //
            if (callData.CallTypeID)
                mself.CallTypeID = ko.observable(callData.CallTypeID);
            else mself.CallTypeID = ko.observable('');
            //
            if (callData.CallType)//TODO Name? rename to CallTypeFullName!
                mself.CallType = ko.observable(callData.CallType);
            else mself.CallType = ko.observable('');
            //
            mself.IsRFCCallType = ko.observable(callData.IsRFCCallType ? callData.IsRFCCallType : false);
            mself.IsIncidentResultCallType = ko.observable(callData.IsIncidentResultCallType ? callData.IsIncidentResultCallType : false);
            //
            if (callData.CallSummaryName)
                mself.CallSummaryName = ko.observable(callData.CallSummaryName);
            else mself.CallSummaryName = ko.observable('');
            //
            if (callData.InitiatorID)
                mself.InitiatorID = ko.observable(callData.InitiatorID);
            else mself.InitiatorID = ko.observable('');
            //
            mself.InitiatorLoaded = ko.observable(false);
            mself.Initiator = ko.observable(new userLib.EmptyUser(parentSelf, userLib.UserTypes.initiator));
            //
            if (callData.ClientID)
                mself.ClientID = ko.observable(callData.ClientID);
            else mself.ClientID = ko.observable('');
            //
            mself.ClientLoaded = ko.observable(false);
            mself.Client = ko.observable(new userLib.EmptyUser(parentSelf, userLib.UserTypes.client, parentSelf.EditClient));
            //
            if (callData.ServicePlaceID)
                mself.ServicePlaceID = ko.observable(callData.ServicePlaceID);
            else mself.ServicePlaceID = ko.observable(null);
            //
            if (callData.ServicePlaceClassID)
                mself.ServicePlaceClassID = ko.observable(callData.ServicePlaceClassID);
            else mself.ServicePlaceClassID = ko.observable(null);
            //
            if (callData.ServicePlaceName)
                mself.ServicePlaceName = ko.observable(callData.ServicePlaceName);
            else mself.ServicePlaceName = ko.observable('');
            //
            if (callData.ServicePlaceNameShort)
                mself.ServicePlaceNameShort = ko.observable(callData.ServicePlaceNameShort);
            else mself.ServicePlaceNameShort = ko.observable('');           
            //
            if (callData.OwnerID)
                mself.OwnerID = ko.observable(callData.OwnerID);
            else mself.OwnerID = ko.observable('');
            //
            mself.OwnerLoaded = ko.observable(false);
            mself.Owner = ko.observable(new userLib.EmptyUser(parentSelf, userLib.UserTypes.owner, parentSelf.EditOwner));
            //
            mself.QueueID = ko.observable(callData.QueueID ? callData.QueueID : '');
            mself.QueueName = ko.observable(callData.QueueName ? callData.QueueName : '');
            mself.QueueLoaded = ko.observable(false);
            mself.Queue = ko.observable(new userLib.EmptyUser(parentSelf, userLib.UserTypes.queueExecutor, parentSelf.EditQueue));
            //
            mself.ExecutorID = ko.observable(callData.ExecutorID ? callData.ExecutorID : '');
            mself.ExecutorLoaded = ko.observable(false);
            mself.Executor = ko.observable(new userLib.EmptyUser(parentSelf, userLib.UserTypes.executor, parentSelf.EditExecutor));
            //
            if (callData.AccomplisherID)
                mself.AccomplisherID = ko.observable(callData.AccomplisherID);
            else mself.AccomplisherID = ko.observable('');
            //
            mself.AccomplisherLoaded = ko.observable(false);
            mself.Accomplisher = ko.observable(new userLib.EmptyUser(parentSelf, userLib.UserTypes.accomplisher, parentSelf.EditAccomplisher));
            //
            if (callData.UrgencyID)
                mself.UrgencyID = ko.observable(callData.UrgencyID);
            else mself.UrgencyID = ko.observable('');
            //
            if (callData.UrgencyName)
                mself.UrgencyName = ko.observable(callData.UrgencyName);
            else mself.UrgencyName = ko.observable('');
            //
            if (callData.InfluenceID)
                mself.InfluenceID = ko.observable(callData.InfluenceID);
            else mself.InfluenceID = ko.observable('');
            //
            if (callData.InfluenceName)
                mself.InfluenceName = ko.observable(callData.InfluenceName);
            else mself.InfluenceName = ko.observable('');
            //
            if (callData.PriorityID)
                mself.PriorityID = ko.observable(callData.PriorityID);
            else mself.PriorityID = ko.observable('');
            //
            if (callData.PriorityColor)
                mself.PriorityColor = ko.observable(callData.PriorityColor);
            else mself.PriorityColor = ko.observable('');
            //
            if (callData.PriorityName)
                mself.PriorityName = ko.observable(callData.PriorityName);
            else mself.PriorityName = ko.observable('');
            //
            if (callData.ManHours)
                mself.ManHours = ko.observable(callData.ManHours);
            else mself.ManHours = ko.observable('');
            //
            if (callData.ManhoursNorm)
                mself.ManhoursNorm = ko.observable(callData.ManhoursNorm);
            else mself.ManhoursNorm = ko.observable(0);
            //
            if (callData.OnWorkOrderExecutorControl)
                mself.OnWorkOrderExecutorControl = ko.observable(callData.OnWorkOrderExecutorControl);
            else mself.OnWorkOrderExecutorControl = ko.observable(false);
            //
            mself.ManhoursNormString = ko.computed(function () {
                return getLocaleHourMinString(mself.ManhoursNorm());
            });
            //
            //
            mself.UserField1 = ko.observable(callData.UserField1 ? callData.UserField1 : '');
            mself.UserField2 = ko.observable(callData.UserField2 ? callData.UserField2 : '');
            mself.UserField3 = ko.observable(callData.UserField3 ? callData.UserField3 : '');
            mself.UserField4 = ko.observable(callData.UserField4 ? callData.UserField4 : '');
            mself.UserField5 = ko.observable(callData.UserField5 ? callData.UserField5 : '');
            //
            mself.UserField1Name = callData.UserField1Name;
            mself.UserField2Name = callData.UserField2Name;
            mself.UserField3Name = callData.UserField3Name;
            mself.UserField4Name = callData.UserField4Name;
            mself.UserField5Name = callData.UserField5Name;
            //
            if (callData.NegotiationCount)
                mself.NegotiationCount = ko.observable(callData.NegotiationCount);
            else mself.NegotiationCount = ko.observable(0);
            if (callData.HaveUnvotedNegotiation != null)
                mself.HaveUnvotedNegotiation = ko.observable(callData.HaveUnvotedNegotiation);
            else mself.HaveUnvotedNegotiation = ko.observable(false);
            //
            //
            if (callData.UnreadNoteCount)
                mself.UnreadNoteCount = ko.observable(callData.UnreadNoteCount);
            else mself.UnreadNoteCount = ko.observable(0);
            if (callData.NoteCount)
                mself.NoteCount = ko.observable(callData.NoteCount);
            else mself.NoteCount = ko.observable(0);
            if (callData.MessageCount)
                mself.MessageCount = ko.observable(callData.MessageCount);
            else mself.MessageCount = ko.observable(0);
            //
            //
            if (callData.DependencyObjectCount)
                mself.DependencyObjectCount = ko.observable(callData.DependencyObjectCount);
            else mself.DependencyObjectCount = ko.observable(0);
            //
            if (callData.WorkOrdersRefCount)
                mself.WorkOrderCount = ko.observable(callData.WorkOrdersRefCount);
            else mself.WorkOrderCount = ko.observable(0);
            //
            if (callData.ProblemsRefCount)
                mself.ProblemsCount = ko.observable(callData.ProblemsRefCount);
            else mself.ProblemsCount = ko.observable(0);
            //
            if (callData.HaveNegotiationsWithCurrentUser) //исключительно для клиента, который согласующее лицо
                mself.HaveNegotiationsWithCurrentUser = ko.observable(callData.HaveNegotiationsWithCurrentUser);
            else mself.HaveNegotiationsWithCurrentUser = ko.observable(false);
            //
            mself.NumberName = ko.computed(function () {
                return '№' + mself.Number() + ' ' + mself.CallSummaryName();
            });
            mself.ServiceItemOrAttendanceName = ko.computed(function () {
                if (mself.ServiceID()) {
                    if (mself.ServiceAttendanceID() && !mself.ServiceItemID())
                        return mself.ServiceAttendanceName();
                    else if (mself.ServiceItemID() && !mself.ServiceAttendanceID())
                        return mself.ServiceItemName();
                }
                else return '';
            });
            mself.PlainGrade = ko.computed(function () {
                if (self.IsClientMode() && !self.IsReadOnly())
                    return '';
                //
                var text = mself.Grade();
                if (text == null || text == '')
                    text = getTextResource('NoGrade');
                return text;
            });
            mself.TotalNotesCount = ko.computed(function () {
                return parseInt(mself.NoteCount()) + parseInt(mself.MessageCount());
            });
            //
            if (callData.ImageSource)
                mself.ImageSource = callData.ImageSource;
            if (callData.IsServiceAttendance)
                mself.IsServiceAttendance = callData.IsServiceAttendance;
            else
                mself.IsServiceAttendance = mself.IsRFCCallType;
        }
    };
    return module;
});