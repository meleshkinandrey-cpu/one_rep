define(['knockout', 'jquery', 'models/SDForms/SDForm.User'], function (ko, $, userLib) {
    var module = {
        RFC: function (parentSelf, rfcData) {
            var rfcself = this;
            var self = parentSelf;
            //
            rfcself.ClassID = 703;           
            //
            if (rfcData.ID)
                rfcself.ID = ko.observable(rfcData.ID)
            else rfcself.ID = ko.observable('');
            //
            if (rfcData.TypeName)
                rfcself.TypeName = ko.observable(rfcData.TypeName)
            else rfcself.TypeName = ko.observable('');
            if (rfcData.TypeID)
                rfcself.TypeID = ko.observable(rfcData.TypeID)
            else rfcself.TypeID = ko.observable('');
            //
            if (rfcData.CategoryName)
                rfcself.CategoryName = ko.observable(rfcData.CategoryName)
            else rfcself.CategoryName = ko.observable('');
            if (rfcData.CategoryID)
                rfcself.CategoryID = ko.observable(rfcData.CategoryID)
            else rfcself.CategoryID = ko.observable('');
            //
            if (rfcData.Number)
                rfcself.Number = ko.observable(rfcData.Number)
            else rfcself.Number = ko.observable('');
            if (rfcData.Summary)
                rfcself.Summary = ko.observable(rfcData.Summary)
            else rfcself.Summary = ko.observable('');
            //
            if (rfcData.Target)
                rfcself.Target = ko.observable(rfcData.Target)
            else rfcself.Target = ko.observable('');
            if (rfcData.Description)
                rfcself.Description = ko.observable(rfcData.Description)
            else rfcself.Description = ko.observable('');
            //
            if (rfcData.UrgencyID)
                rfcself.UrgencyID = ko.observable(rfcData.UrgencyID)
            else rfcself.UrgencyID = ko.observable('');
            if (rfcData.UrgencyName)
                rfcself.UrgencyName = ko.observable(rfcData.UrgencyName)
            else rfcself.UrgencyName = ko.observable('');
            if (rfcData.InfluenceID)
                rfcself.InfluenceID = ko.observable(rfcData.InfluenceID)
            else rfcself.InfluenceID = ko.observable('');
            if (rfcData.InfluenceName)
                rfcself.InfluenceName = ko.observable(rfcData.InfluenceName)
            else rfcself.InfluenceName = ko.observable('');
            if (rfcData.PriorityName)
                rfcself.PriorityName = ko.observable(rfcData.PriorityName)
            else rfcself.PriorityName = ko.observable('');
            if (rfcData.PriorityColor)
                rfcself.PriorityColor = ko.observable(rfcData.PriorityColor)
            else rfcself.PriorityColor = ko.observable('');
            if (rfcData.PriorityID)
                rfcself.PriorityID = ko.observable(rfcData.PriorityID)
            else rfcself.PriorityID = ko.observable('');
            //
            if (rfcData.DependencyObjectCount)
                rfcself.DependencyObjectCount = ko.observable(rfcData.DependencyObjectCount);
            else rfcself.DependencyObjectCount = ko.observable(0);
            //
            if (rfcData.DependencyKEObjectCount)
                rfcself.DependencyKEObjectCount = ko.observable(rfcData.DependencyKEObjectCount);
            else rfcself.DependencyKEObjectCount = ko.observable(0);
            //
            if (rfcData.OwnerID)
                rfcself.OwnerID = ko.observable(rfcData.OwnerID)
            else rfcself.OwnerID = ko.observable('');
            rfcself.OwnerLoaded = ko.observable(false);
            rfcself.Owner = ko.observable(new userLib.EmptyUser(parentSelf, userLib.UserTypes.owner, parentSelf.EditOwner, true, true, getTextResource('Coordinator_Owner')));
            //
            rfcself.QueueID = ko.observable(rfcData.QueueID ? rfcData.QueueID : '');
            rfcself.QueueName = ko.observable(rfcData.QueueName ? rfcData.QueueName : '');
            rfcself.QueueLoaded = ko.observable(false);
            rfcself.Queue = ko.observable(new userLib.EmptyUser(parentSelf, userLib.UserTypes.queueExecutor, parentSelf.EditQueue));
            //
            if (rfcData.InitiatorID)
                rfcself.InitiatorID = ko.observable(rfcData.InitiatorID)
            else rfcself.InitiatorID = ko.observable('');
            rfcself.InitiatorLoaded = ko.observable(false);
            rfcself.Initiator = ko.observable(new userLib.EmptyUser(parentSelf, userLib.UserTypes.rnitiator, parentSelf.EditInitiator));
            //
            if (rfcData.ServiceID)
                rfcself.ServiceID = ko.observable(rfcData.ServiceID)
            else rfcself.ServiceID = ko.observable(null);
            //
            if (rfcData.ServiceName)
                rfcself.ServiceName = ko.observable(rfcData.ServiceName)
            else rfcself.ServiceName = ko.observable(null);
            //
            if (rfcData.ReasonObjectID)
                rfcself.ReasonObjectID = ko.observable(rfcData.ReasonObjectID)
            else rfcself.ReasonObjectID = ko.observable('');
            if (rfcData.ReasonObjectClassID)
                rfcself.ReasonObjectClassID = ko.observable(rfcData.ReasonObjectClassID)
            else rfcself.ReasonObjectClassID = ko.observable('');
            //
            if (rfcData.FundingAmount)
                rfcself.FundingAmount = ko.observable(rfcData.FundingAmount)
            else rfcself.FundingAmount = ko.observable(0);
            //
            if (rfcData.UtcDateDetected)
                rfcself.UtcDateDetected = ko.observable(parseDate(rfcData.UtcDateDetected))
            else rfcself.UtcDateDetected = ko.observable('');
            if (rfcData.UtcDateClosed)
                rfcself.UtcDateClosed = ko.observable(parseDate(rfcData.UtcDateClosed))
            else rfcself.UtcDateClosed = ko.observable('');
            if (rfcData.UtcDateSolved)
                rfcself.UtcDateSolved = ko.observable(parseDate(rfcData.UtcDateSolved))
            else rfcself.UtcDateSolved = ko.observable('');
            if (rfcData.UtcDateModified)
                rfcself.UtcDateModified = ko.observable(parseDate(rfcData.UtcDateModified))
            else rfcself.UtcDateModified = ko.observable('');
            //
            if (rfcData.UtcDatePromised)
                rfcself.UtcDatePromised = ko.observable(parseDate(rfcData.UtcDatePromised))
            else rfcself.UtcDatePromised = ko.observable('');
            if (rfcData.UtcDatePromised)
                rfcself.UtcDatePromisedDT = ko.observable(new Date(parseInt(rfcData.UtcDatePromised)));
            else rfcself.UtcDatePromisedDT = ko.observable(null);
            if (rfcData.UtcDateStarted)
                rfcself.UtcDateStarted = ko.observable(parseDate(rfcData.UtcDateStarted))
            else rfcself.UtcDateStarted = ko.observable('');
            if (rfcData.UtcDateStarted)
                rfcself.UtcDateStartedDT = ko.observable(new Date(parseInt(rfcData.UtcDateStarted)));
            else rfcself.UtcDateStartedDT = ko.observable(null);
            //
            if (rfcData.RealizationDocumentID)
                rfcself.RealizationDocumentID = ko.observable(rfcData.RealizationDocumentID)
            else rfcself.RealizationDocumentID = ko.observable('');
            if (rfcData.RollbackDocumentID)
                rfcself.RollbackDocumentID = ko.observable(rfcData.RollbackDocumentID)
            else rfcself.RollbackDocumentID = ko.observable('');
            //
            if (rfcData.ManHours)
                rfcself.ManHours = ko.observable(rfcData.ManHours)
            else rfcself.ManHours = ko.observable('');
            if (rfcData.ManhoursNorm)
                rfcself.ManhoursNorm = ko.observable(rfcData.ManhoursNorm)
            else rfcself.ManhoursNorm = ko.observable(0);
            //
            rfcself.ManhoursNormString = ko.computed(function () {
                return getLocaleHourMinString(rfcself.ManhoursNorm());
            });
            //
            if (rfcData.CallCount)
                rfcself.CallCount = ko.observable(rfcData.CallCount);
            else rfcself.CallCount = ko.observable(0);
            if (rfcData.NegotiationCount)
                rfcself.NegotiationCount = ko.observable(rfcData.NegotiationCount);
            else rfcself.NegotiationCount = ko.observable(0);
            if (rfcData.HaveUnvotedNegotiation != null)
                rfcself.HaveUnvotedNegotiation = ko.observable(rfcData.HaveUnvotedNegotiation);
            else rfcself.HaveUnvotedNegotiation = ko.observable(false);
            //
            //
            if (rfcData.WorkOrderCount)
                rfcself.WorkOrderCount = ko.observable(rfcData.WorkOrderCount);
            else rfcself.WorkOrderCount = ko.observable(0);
            //
            if (rfcData.UnreadNoteCount)
                rfcself.UnreadNoteCount = ko.observable(rfcData.UnreadNoteCount);
            else rfcself.UnreadNoteCount = ko.observable(0);
            if (rfcData.NoteCount)
                rfcself.NoteCount = ko.observable(rfcData.NoteCount);
            else rfcself.NoteCount = ko.observable(0);
            rfcself.TotalNotesCount = ko.computed(function () {
                return parseInt(rfcself.NoteCount());
            });
            //
            if (rfcData.OnWorkOrderExecutorControl)
                rfcself.OnWorkOrderExecutorControl = ko.observable(rfcData.OnWorkOrderExecutorControl);
            else rfcself.OnWorkOrderExecutorControl = ko.observable(false);
            //
            if (rfcData.EntityStateID)
                rfcself.EntityStateID = ko.observable(rfcData.EntityStateID)
            else rfcself.EntityStateID = ko.observable('');
            if (rfcData.EntityStateName)
                rfcself.EntityStateName = ko.observable(rfcData.EntityStateName)
            else rfcself.EntityStateName = ko.observable('');
            if (rfcData.WorkflowSchemeID)
                rfcself.WorkflowSchemeID = ko.observable(rfcData.WorkflowSchemeID);
            else rfcself.WorkflowSchemeID = ko.observable(null);
            rfcself.WorkflowImageSource = ko.observable(rfcData.WorkflowImageSource ? rfcData.WorkflowImageSource : null);
            //
            if (rfcData.InRealization)
                rfcself.InRealization = ko.observable(rfcData.InRealization)
            else rfcself.InRealization = ko.observable(false);
            //
            rfcself.AddAs = function () {
                return rfcself.ID() && rfcself.ID() !== '00000000-0000-0000-0000-000000000000';
            };                        
        }
    };
    return module;
});